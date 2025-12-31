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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL3dvcmtzcGFjZVJlY29tbWVuZGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFFTixpQ0FBaUMsR0FDakMsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQWtCLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRTFILE1BQU0sMkJBQTJCLEdBQUcsb0JBQW9CLENBQUE7QUFFakQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSx3QkFBd0I7SUFFckUsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxD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