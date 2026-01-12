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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL2dsb2JhbFN0YXRlUmVzb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFLNUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sOEVBQThFLENBQUE7QUFDN0gsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBWXBGLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO0lBQzFDLFlBQThDLGNBQStCO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUFHLENBQUM7SUFFakYsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFlO1FBQy9CLE1BQU0sV0FBVyxHQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLE1BQU0sY0FBYyxHQUF5QixF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