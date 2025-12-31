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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSWdub3JlZFJlY29tbWVuZGF0aW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zL2NvbW1vbi9leHRlbnNpb25JZ25vcmVkUmVjb21tZW5kYXRpb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTix1Q0FBdUMsR0FFdkMsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVsRixNQUFNLGdDQUFnQyxHQUFHLDZDQUE2QyxDQUFBO0FBRS9FLElBQU0sc0NBQXNDLEdBQTVDLE1BQU0sc0NBQ1osU0FBUSxVQUFVO0lBVWxCLElBQUksNEJBQTRCO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFVRCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBRUQsWUFFQyxnQ0FBb0YsRUFDbkUsY0FBZ0Q7UUFFakUs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