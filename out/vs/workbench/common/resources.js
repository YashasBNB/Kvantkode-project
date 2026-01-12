/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ResourceGlobMatcher_1;
import { URI } from '../../base/common/uri.js';
import { equals } from '../../base/common/objects.js';
import { isAbsolute } from '../../base/common/path.js';
import { Emitter } from '../../base/common/event.js';
import { relativePath } from '../../base/common/resources.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { parse } from '../../base/common/glob.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService, } from '../../platform/configuration/common/configuration.js';
import { Schemas } from '../../base/common/network.js';
import { ResourceSet } from '../../base/common/map.js';
import { getDriveLetter } from '../../base/common/extpath.js';
let ResourceGlobMatcher = class ResourceGlobMatcher extends Disposable {
    static { ResourceGlobMatcher_1 = this; }
    static { this.NO_FOLDER = null; }
    constructor(getExpression, shouldUpdate, contextService, configurationService) {
        super();
        this.getExpression = getExpression;
        this.shouldUpdate = shouldUpdate;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this._onExpressionChange = this._register(new Emitter());
        this.onExpressionChange = this._onExpressionChange.event;
        this.mapFolderToParsedExpression = new Map();
        this.mapFolderToConfiguredExpression = new Map();
        this.updateExpressions(false);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (this.shouldUpdate(e)) {
                this.updateExpressions(true);
            }
        }));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.updateExpressions(true)));
    }
    updateExpressions(fromEvent) {
        let changed = false;
        // Add expressions per workspaces that got added
        for (const folder of this.contextService.getWorkspace().folders) {
            const folderUriStr = folder.uri.toString();
            const newExpression = this.doGetExpression(folder.uri);
            const currentExpression = this.mapFolderToConfiguredExpression.get(folderUriStr);
            if (newExpression) {
                if (!currentExpression || !equals(currentExpression.expression, newExpression.expression)) {
                    changed = true;
                    this.mapFolderToParsedExpression.set(folderUriStr, parse(newExpression.expression));
                    this.mapFolderToConfiguredExpression.set(folderUriStr, newExpression);
                }
            }
            else {
                if (currentExpression) {
                    changed = true;
                    this.mapFolderToParsedExpression.delete(folderUriStr);
                    this.mapFolderToConfiguredExpression.delete(folderUriStr);
                }
            }
        }
        // Remove expressions per workspace no longer present
        const foldersMap = new ResourceSet(this.contextService.getWorkspace().folders.map((folder) => folder.uri));
        for (const [folder] of this.mapFolderToConfiguredExpression) {
            if (folder === ResourceGlobMatcher_1.NO_FOLDER) {
                continue; // always keep this one
            }
            if (!foldersMap.has(URI.parse(folder))) {
                this.mapFolderToParsedExpression.delete(folder);
                this.mapFolderToConfiguredExpression.delete(folder);
                changed = true;
            }
        }
        // Always set for resources outside workspace as well
        const globalNewExpression = this.doGetExpression(undefined);
        const globalCurrentExpression = this.mapFolderToConfiguredExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
        if (globalNewExpression) {
            if (!globalCurrentExpression ||
                !equals(globalCurrentExpression.expression, globalNewExpression.expression)) {
                changed = true;
                this.mapFolderToParsedExpression.set(ResourceGlobMatcher_1.NO_FOLDER, parse(globalNewExpression.expression));
                this.mapFolderToConfiguredExpression.set(ResourceGlobMatcher_1.NO_FOLDER, globalNewExpression);
            }
        }
        else {
            if (globalCurrentExpression) {
                changed = true;
                this.mapFolderToParsedExpression.delete(ResourceGlobMatcher_1.NO_FOLDER);
                this.mapFolderToConfiguredExpression.delete(ResourceGlobMatcher_1.NO_FOLDER);
            }
        }
        if (fromEvent && changed) {
            this._onExpressionChange.fire();
        }
    }
    doGetExpression(resource) {
        const expression = this.getExpression(resource);
        if (!expression) {
            return undefined;
        }
        const keys = Object.keys(expression);
        if (keys.length === 0) {
            return undefined;
        }
        let hasAbsolutePath = false;
        // Check the expression for absolute paths/globs
        // and specifically for Windows, make sure the
        // drive letter is lowercased, because we later
        // check with `URI.fsPath` which is always putting
        // the drive letter lowercased.
        const massagedExpression = Object.create(null);
        for (const key of keys) {
            if (!hasAbsolutePath) {
                hasAbsolutePath = isAbsolute(key);
            }
            let massagedKey = key;
            const driveLetter = getDriveLetter(massagedKey, true /* probe for windows */);
            if (driveLetter) {
                const driveLetterLower = driveLetter.toLowerCase();
                if (driveLetter !== driveLetter.toLowerCase()) {
                    massagedKey = `${driveLetterLower}${massagedKey.substring(1)}`;
                }
            }
            massagedExpression[massagedKey] = expression[key];
        }
        return {
            expression: massagedExpression,
            hasAbsolutePath,
        };
    }
    matches(resource, hasSibling) {
        if (this.mapFolderToParsedExpression.size === 0) {
            return false; // return early: no expression for this matcher
        }
        const folder = this.contextService.getWorkspaceFolder(resource);
        let expressionForFolder;
        let expressionConfigForFolder;
        if (folder && this.mapFolderToParsedExpression.has(folder.uri.toString())) {
            expressionForFolder = this.mapFolderToParsedExpression.get(folder.uri.toString());
            expressionConfigForFolder = this.mapFolderToConfiguredExpression.get(folder.uri.toString());
        }
        else {
            expressionForFolder = this.mapFolderToParsedExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
            expressionConfigForFolder = this.mapFolderToConfiguredExpression.get(ResourceGlobMatcher_1.NO_FOLDER);
        }
        if (!expressionForFolder) {
            return false; // return early: no expression for this resource
        }
        // If the resource if from a workspace, convert its absolute path to a relative
        // path so that glob patterns have a higher probability to match. For example
        // a glob pattern of "src/**" will not match on an absolute path "/folder/src/file.txt"
        // but can match on "src/file.txt"
        let resourcePathToMatch;
        if (folder) {
            resourcePathToMatch = relativePath(folder.uri, resource);
        }
        else {
            resourcePathToMatch = this.uriToPath(resource);
        }
        if (typeof resourcePathToMatch === 'string' &&
            !!expressionForFolder(resourcePathToMatch, undefined, hasSibling)) {
            return true;
        }
        // If the configured expression has an absolute path, we also check for absolute paths
        // to match, otherwise we potentially miss out on matches. We only do that if we previously
        // matched on the relative path.
        if (resourcePathToMatch !== this.uriToPath(resource) &&
            expressionConfigForFolder?.hasAbsolutePath) {
            return !!expressionForFolder(this.uriToPath(resource), undefined, hasSibling);
        }
        return false;
    }
    uriToPath(uri) {
        if (uri.scheme === Schemas.file) {
            return uri.fsPath;
        }
        return uri.path;
    }
};
ResourceGlobMatcher = ResourceGlobMatcher_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService)
], ResourceGlobMatcher);
export { ResourceGlobMatcher };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL3Jlc291cmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFpQyxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFPdEQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVOzthQUMxQixjQUFTLEdBQUcsSUFBSSxBQUFQLENBQU87SUFReEMsWUFDUyxhQUF3RCxFQUN4RCxZQUEyRCxFQUN6QyxjQUF5RCxFQUM1RCxvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFMQyxrQkFBYSxHQUFiLGFBQWEsQ0FBMkM7UUFD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