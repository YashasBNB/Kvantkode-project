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
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { distinct, equals } from '../../../../base/common/arrays.js';
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { IWorkspaceExtensionsConfigService, } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
const WORKSPACE_EXTENSIONS_FOLDER = '.vscode/extensions';
let WorkspaceRecommendations = class WorkspaceRecommendations extends ExtensionRecommendations {
    get recommendations() {
        return this._recommendations;
    }
    get ignoredRecommendations() {
        return this._ignoredRecommendations;
    }
    constructor(workspaceExtensionsConfigService, contextService, uriIdentityService, fileService, workbenchExtensionManagementService, notificationService) {
        super();
        this.workspaceExtensionsConfigService = workspaceExtensionsConfigService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.workbenchExtensionManagementService = workbenchExtensionManagementService;
        this.notificationService = notificationService;
        this._recommendations = [];
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this._ignoredRecommendations = [];
        this.workspaceExtensions = [];
        this.onDidChangeWorkspaceExtensionsScheduler = this._register(new RunOnceScheduler(() => this.onDidChangeWorkspaceExtensionsFolders(), 1000));
    }
    async doActivate() {
        this.workspaceExtensions = await this.fetchWorkspaceExtensions();
        await this.fetch();
        this._register(this.workspaceExtensionsConfigService.onDidChangeExtensionsConfigs(() => this.onDidChangeExtensionsConfigs()));
        for (const folder of this.contextService.getWorkspace().folders) {
            this._register(this.fileService.watch(this.uriIdentityService.extUri.joinPath(folder.uri, WORKSPACE_EXTENSIONS_FOLDER)));
        }
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.onDidChangeWorkspaceExtensionsScheduler.schedule()));
        this._register(this.fileService.onDidFilesChange((e) => {
            if (this.contextService
                .getWorkspace()
                .folders.some((folder) => e.affects(this.uriIdentityService.extUri.joinPath(folder.uri, WORKSPACE_EXTENSIONS_FOLDER), 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */))) {
                this.onDidChangeWorkspaceExtensionsScheduler.schedule();
            }
        }));
    }
    async onDidChangeWorkspaceExtensionsFolders() {
        const existing = this.workspaceExtensions;
        this.workspaceExtensions = await this.fetchWorkspaceExtensions();
        if (!equals(existing, this.workspaceExtensions, (a, b) => this.uriIdentityService.extUri.isEqual(a, b))) {
            this.onDidChangeExtensionsConfigs();
        }
    }
    async fetchWorkspaceExtensions() {
        const workspaceExtensions = [];
        for (const workspaceFolder of this.contextService.getWorkspace().folders) {
            const extensionsLocaiton = this.uriIdentityService.extUri.joinPath(workspaceFolder.uri, WORKSPACE_EXTENSIONS_FOLDER);
            try {
                const stat = await this.fileService.resolve(extensionsLocaiton);
                for (const extension of stat.children ?? []) {
                    if (!extension.isDirectory) {
                        continue;
                    }
                    workspaceExtensions.push(extension.resource);
                }
            }
            catch (error) {
                // ignore
            }
        }
        if (workspaceExtensions.length) {
            const resourceExtensions = await this.workbenchExtensionManagementService.getExtensions(workspaceExtensions);
            return resourceExtensions.map((extension) => extension.location);
        }
        return [];
    }
    /**
     * Parse all extensions.json files, fetch workspace recommendations, filter out invalid and unwanted ones
     */
    async fetch() {
        const extensionsConfigs = await this.workspaceExtensionsConfigService.getExtensionsConfigs();
        const { invalidRecommendations, message } = await this.validateExtensions(extensionsConfigs);
        if (invalidRecommendations.length) {
            this.notificationService.warn(`The ${invalidRecommendations.length} extension(s) below, in workspace recommendations have issues:\n${message}`);
        }
        this._recommendations = [];
        this._ignoredRecommendations = [];
        for (const extensionsConfig of extensionsConfigs) {
            if (extensionsConfig.unwantedRecommendations) {
                for (const unwantedRecommendation of extensionsConfig.unwantedRecommendations) {
                    if (invalidRecommendations.indexOf(unwantedRecommendation) === -1) {
                        this._ignoredRecommendations.push(unwantedRecommendation);
                    }
                }
            }
            if (extensionsConfig.recommendations) {
                for (const extensionId of extensionsConfig.recommendations) {
                    if (invalidRecommendations.indexOf(extensionId) === -1) {
                        this._recommendations.push({
                            extension: extensionId,
                            reason: {
                                reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
                                reasonText: localize('workspaceRecommendation', 'This extension is recommended by users of the current workspace.'),
                            },
                        });
                    }
                }
            }
        }
        for (const extension of this.workspaceExtensions) {
            this._recommendations.push({
                extension,
                reason: {
                    reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
                    reasonText: localize('workspaceRecommendation', 'This extension is recommended by users of the current workspace.'),
                },
            });
        }
    }
    async validateExtensions(contents) {
        const validExtensions = [];
        const invalidExtensions = [];
        let message = '';
        const allRecommendations = distinct(contents.flatMap(({ recommendations }) => recommendations || []));
        const regEx = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
        for (const extensionId of allRecommendations) {
            if (regEx.test(extensionId)) {
                validExtensions.push(extensionId);
            }
            else {
                invalidExtensions.push(extensionId);
                message += `${extensionId} (bad format) Expected: <provider>.<name>\n`;
            }
        }
        return {
            validRecommendations: validExtensions,
            invalidRecommendations: invalidExtensions,
            message,
        };
    }
    async onDidChangeExtensionsConfigs() {
        await this.fetch();
        this._onDidChangeRecommendations.fire();
    }
};
WorkspaceRecommendations = __decorate([
    __param(0, IWorkspaceExtensionsConfigService),
    __param(1, IWorkspaceContextService),
    __param(2, IUriIdentityService),
    __param(3, IFileService),
    __param(4, IWorkbenchExtensionManagementService),
    __param(5, INotificationService)
], WorkspaceRecommendations);
export { WorkspaceRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvd29ya3NwYWNlUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUEyQixNQUFNLCtCQUErQixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUVOLGlDQUFpQyxHQUNqQyxNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBa0IsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFFMUgsTUFBTSwyQkFBMkIsR0FBRyxvQkFBb0IsQ0FBQTtBQUVqRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLHdCQUF3QjtJQUVyRSxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJ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