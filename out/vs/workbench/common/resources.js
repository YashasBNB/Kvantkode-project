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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9yZXNvdXJjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBaUMsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBT3RELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFDMUIsY0FBUyxHQUFHLElBQUksQUFBUCxDQUFPO0lBUXhDLFlBQ1MsYUFBd0QsRUFDeEQsWUFBMkQsRUFDekMsY0FBeUQsRUFDNUQsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBTEMsa0JBQWEsR0FBYixhQUFhLENBQTJDO1FBQ3hELGlC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