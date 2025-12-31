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
import { IExtensionTipsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { localize } from '../../../../nls.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { Emitter } from '../../../../base/common/event.js';
let ConfigBasedRecommendations = class ConfigBasedRecommendations extends ExtensionRecommendations {
    get otherRecommendations() {
        return this._otherRecommendations;
    }
    get importantRecommendations() {
        return this._importantRecommendations;
    }
    get recommendations() {
        return [...this.importantRecommendations, ...this.otherRecommendations];
    }
    constructor(extensionTipsService, workspaceContextService) {
        super();
        this.extensionTipsService = extensionTipsService;
        this.workspaceContextService = workspaceContextService;
        this.importantTips = [];
        this.otherTips = [];
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this._otherRecommendations = [];
        this._importantRecommendations = [];
    }
    async doActivate() {
        await this.fetch();
        this._register(this.workspaceContextService.onDidChangeWorkspaceFolders((e) => this.onWorkspaceFoldersChanged(e)));
    }
    async fetch() {
        const workspace = this.workspaceContextService.getWorkspace();
        const importantTips = new Map();
        const otherTips = new Map();
        for (const folder of workspace.folders) {
            const configBasedTips = await this.extensionTipsService.getConfigBasedTips(folder.uri);
            for (const tip of configBasedTips) {
                if (tip.important) {
                    importantTips.set(tip.extensionId, tip);
                }
                else {
                    otherTips.set(tip.extensionId, tip);
                }
            }
        }
        this.importantTips = [...importantTips.values()];
        this.otherTips = [...otherTips.values()].filter((tip) => !importantTips.has(tip.extensionId));
        this._otherRecommendations = this.otherTips.map((tip) => this.toExtensionRecommendation(tip));
        this._importantRecommendations = this.importantTips.map((tip) => this.toExtensionRecommendation(tip));
    }
    async onWorkspaceFoldersChanged(event) {
        if (event.added.length) {
            const oldImportantRecommended = this.importantTips;
            await this.fetch();
            // Suggest only if at least one of the newly added recommendations was not suggested before
            if (this.importantTips.some((current) => oldImportantRecommended.every((old) => current.extensionId !== old.extensionId))) {
                this._onDidChangeRecommendations.fire();
            }
        }
    }
    toExtensionRecommendation(tip) {
        return {
            extension: tip.extensionId,
            reason: {
                reasonId: 3 /* ExtensionRecommendationReason.WorkspaceConfig */,
                reasonText: localize('exeBasedRecommendation', 'This extension is recommended because of the current workspace configuration'),
            },
            whenNotInstalled: tip.whenNotInstalled,
        };
    }
};
ConfigBasedRecommendations = __decorate([
    __param(0, IExtensionTipsService),
    __param(1, IWorkspaceContextService)
], ConfigBasedRecommendations);
export { ConfigBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnQmFzZWRSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvY29uZmlnQmFzZWRSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU1uRCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLHdCQUF3QjtJQVF2RSxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQTtJQUNsQyxDQUFDO0lBR0QsSUFBSSx3QkFBd0I7UUFDM0IsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUE7SUFDdEMsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsWUFDd0Isb0JBQTRELEVBQ3pELHVCQUFrRTtRQUU1RixLQUFLLEVBQUUsQ0FBQTtRQUhpQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3hDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUF0QnJGLGtCQUFhLEdBQStCLEVBQUUsQ0FBQTtRQUM5QyxjQUFTLEdBQStC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