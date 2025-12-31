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
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileStorageService } from '../../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
let GlobalStateResourceInitializer = class GlobalStateResourceInitializer {
    constructor(storageService) {
        this.storageService = storageService;
    }
    async initialize(content) {
        const globalState = JSON.parse(content);
        const storageKeys = Object.keys(globalState.storage);
        if (storageKeys.length) {
            const storageEntries = [];
            for (const key of storageKeys) {
                storageEntries.push({
                    key,
                    value: globalState.storage[key],
                    scope: 0 /* StorageScope.PROFILE */,
                    target: 0 /* StorageTarget.USER */,
                });
            }
            this.storageService.storeAll(storageEntries, true);
        }
    }
};
GlobalStateResourceInitializer = __decorate([
    __param(0, IStorageService)
], GlobalStateResourceInitializer);
export { GlobalStateResourceInitializer };
let GlobalStateResource = class GlobalStateResource {
    constructor(storageService, userDataProfileStorageService, logService) {
        this.storageService = storageService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.logService = logService;
    }
    async getContent(profile) {
        const globalState = await this.getGlobalState(profile);
        return JSON.stringify(globalState);
    }
    async apply(content, profile) {
        const globalState = JSON.parse(content);
        await this.writeGlobalState(globalState, profile);
    }
    async getGlobalState(profile) {
        const storage = {};
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        for (const [key, value] of storageData) {
            if (value.value !== undefined && value.target === 0 /* StorageTarget.USER */) {
                storage[key] = value.value;
            }
        }
        return { storage };
    }
    async writeGlobalState(globalState, profile) {
        const storageKeys = Object.keys(globalState.storage);
        if (storageKeys.length) {
            const updatedStorage = new Map();
            const nonProfileKeys = [
                // Do not include application scope user target keys because they also include default profile user target keys
                ...this.storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */),
                ...this.storageService.keys(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */),
                ...this.storageService.keys(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */),
            ];
            for (const key of storageKeys) {
                if (nonProfileKeys.includes(key)) {
                    this.logService.info(`Importing Profile (${profile.name}): Ignoring global state key '${key}' because it is not a profile key.`);
                }
                else {
                    updatedStorage.set(key, globalState.storage[key]);
                }
            }
            await this.userDataProfileStorageService.updateStorageData(profile, updatedStorage, 0 /* StorageTarget.USER */);
        }
    }
};
GlobalStateResource = __decorate([
    __param(0, IStorageService),
    __param(1, IUserDataProfileStorageService),
    __param(2, ILogService)
], GlobalStateResource);
export { GlobalStateResource };
export class GlobalStateResourceTreeItem {
    constructor(resource, uriIdentityService) {
        this.resource = resource;
        this.uriIdentityService = uriIdentityService;
        this.type = "globalState" /* ProfileResourceType.GlobalState */;
        this.handle = "globalState" /* ProfileResourceType.GlobalState */;
        this.label = { label: localize('globalState', 'UI State') };
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }
    async getChildren() {
        return [
            {
                handle: this.resource.toString(),
                resourceUri: this.resource,
                collapsibleState: TreeItemCollapsibleState.None,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.resource),
                },
                parent: this,
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.resource, undefined, undefined],
                },
            },
        ];
    }
}
let GlobalStateResourceExportTreeItem = class GlobalStateResourceExportTreeItem extends GlobalStateResourceTreeItem {
    constructor(profile, resource, uriIdentityService, instantiationService) {
        super(resource, uriIdentityService);
        this.profile = profile;
        this.instantiationService = instantiationService;
    }
    async hasContent() {
        const globalState = await this.instantiationService
            .createInstance(GlobalStateResource)
            .getGlobalState(this.profile);
        return Object.keys(globalState.storage).length > 0;
    }
    async getContent() {
        return this.instantiationService.createInstance(GlobalStateResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.globalState;
    }
};
GlobalStateResourceExportTreeItem = __decorate([
    __param(2, IUriIdentityService),
    __param(3, IInstantiationService)
], GlobalStateResourceExportTreeItem);
export { GlobalStateResourceExportTreeItem };
let GlobalStateResourceImportTreeItem = class GlobalStateResourceImportTreeItem extends GlobalStateResourceTreeItem {
    constructor(content, resource, uriIdentityService) {
        super(resource, uriIdentityService);
        this.content = content;
    }
    async getContent() {
        return this.content;
    }
    isFromDefaultProfile() {
        return false;
    }
};
GlobalStateResourceImportTreeItem = __decorate([
    __param(2, IUriIdentityService)
], GlobalStateResourceImportTreeItem);
export { GlobalStateResourceImportTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9nbG9iYWxTdGF0ZVJlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUVOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBSzVGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQzdILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQVlwRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUMxQyxZQUE4QyxjQUErQjtRQUEvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFBRyxDQUFDO0lBRWpGLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBZTtRQUMvQixNQUFNLFdBQVcsR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixNQUFNLGNBQWMsR0FBeUIsRUFBRSxD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