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
import { distinct } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionIgnoredRecommendationsService, } from './extensionRecommendations.js';
import { IWorkspaceExtensionsConfigService } from './workspaceExtensionsConfig.js';
const ignoredRecommendationsStorageKey = 'extensionsAssistant/ignored_recommendations';
let ExtensionIgnoredRecommendationsService = class ExtensionIgnoredRecommendationsService extends Disposable {
    get globalIgnoredRecommendations() {
        return [...this._globalIgnoredRecommendations];
    }
    get ignoredRecommendations() {
        return distinct([...this.globalIgnoredRecommendations, ...this.ignoredWorkspaceRecommendations]);
    }
    constructor(workspaceExtensionsConfigService, storageService) {
        super();
        this.workspaceExtensionsConfigService = workspaceExtensionsConfigService;
        this.storageService = storageService;
        this._onDidChangeIgnoredRecommendations = this._register(new Emitter());
        this.onDidChangeIgnoredRecommendations = this._onDidChangeIgnoredRecommendations.event;
        // Global Ignored Recommendations
        this._globalIgnoredRecommendations = [];
        this._onDidChangeGlobalIgnoredRecommendation = this._register(new Emitter());
        this.onDidChangeGlobalIgnoredRecommendation = this._onDidChangeGlobalIgnoredRecommendation.event;
        // Ignored Workspace Recommendations
        this.ignoredWorkspaceRecommendations = [];
        this._globalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, ignoredRecommendationsStorageKey, this._store)(() => this.onDidStorageChange()));
        this.initIgnoredWorkspaceRecommendations();
    }
    async initIgnoredWorkspaceRecommendations() {
        this.ignoredWorkspaceRecommendations =
            await this.workspaceExtensionsConfigService.getUnwantedRecommendations();
        this._onDidChangeIgnoredRecommendations.fire();
        this._register(this.workspaceExtensionsConfigService.onDidChangeExtensionsConfigs(async () => {
            this.ignoredWorkspaceRecommendations =
                await this.workspaceExtensionsConfigService.getUnwantedRecommendations();
            this._onDidChangeIgnoredRecommendations.fire();
        }));
    }
    toggleGlobalIgnoredRecommendation(extensionId, shouldIgnore) {
        extensionId = extensionId.toLowerCase();
        const ignored = this._globalIgnoredRecommendations.indexOf(extensionId) !== -1;
        if (ignored === shouldIgnore) {
            return;
        }
        this._globalIgnoredRecommendations = shouldIgnore
            ? [...this._globalIgnoredRecommendations, extensionId]
            : this._globalIgnoredRecommendations.filter((id) => id !== extensionId);
        this.storeCachedIgnoredRecommendations(this._globalIgnoredRecommendations);
        this._onDidChangeGlobalIgnoredRecommendation.fire({ extensionId, isRecommended: !shouldIgnore });
        this._onDidChangeIgnoredRecommendations.fire();
    }
    getCachedIgnoredRecommendations() {
        const ignoredRecommendations = JSON.parse(this.ignoredRecommendationsValue);
        return ignoredRecommendations.map((e) => e.toLowerCase());
    }
    onDidStorageChange() {
        if (this.ignoredRecommendationsValue !==
            this.getStoredIgnoredRecommendationsValue() /* This checks if current window changed the value or not */) {
            this._ignoredRecommendationsValue = undefined;
            this._globalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
            this._onDidChangeIgnoredRecommendations.fire();
        }
    }
    storeCachedIgnoredRecommendations(ignoredRecommendations) {
        this.ignoredRecommendationsValue = JSON.stringify(ignoredRecommendations);
    }
    get ignoredRecommendationsValue() {
        if (!this._ignoredRecommendationsValue) {
            this._ignoredRecommendationsValue = this.getStoredIgnoredRecommendationsValue();
        }
        return this._ignoredRecommendationsValue;
    }
    set ignoredRecommendationsValue(ignoredRecommendationsValue) {
        if (this.ignoredRecommendationsValue !== ignoredRecommendationsValue) {
            this._ignoredRecommendationsValue = ignoredRecommendationsValue;
            this.setStoredIgnoredRecommendationsValue(ignoredRecommendationsValue);
        }
    }
    getStoredIgnoredRecommendationsValue() {
        return this.storageService.get(ignoredRecommendationsStorageKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredIgnoredRecommendationsValue(value) {
        this.storageService.store(ignoredRecommendationsStorageKey, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ExtensionIgnoredRecommendationsService = __decorate([
    __param(0, IWorkspaceExtensionsConfigService),
    __param(1, IStorageService)
], ExtensionIgnoredRecommendationsService);
export { ExtensionIgnoredRecommendationsService };
registerSingleton(IExtensionIgnoredRecommendationsService, ExtensionIgnoredRecommendationsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSWdub3JlZFJlY29tbWVuZGF0aW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnMvY29tbW9uL2V4dGVuc2lvbklnbm9yZWRSZWNvbW1lbmRhdGlvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLHVDQUF1QyxHQUV2QyxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWxGLE1BQU0sZ0NBQWdDLEdBQUcsNkNBQTZDLENBQUE7QUFFL0UsSUFBTSxzQ0FBc0MsR0FBNUMsTUFBTSxzQ0FDWixTQUFRLFVBQVU7SUFVbEIsSUFBSSw0QkFBNEI7UUFDL0IsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUE7SUFDL0MsQ0FBQztJQVVELElBQUksc0JBQXNCO1FBQ3pCLE9BQU8sUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFFRCxZQUVDLGdD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