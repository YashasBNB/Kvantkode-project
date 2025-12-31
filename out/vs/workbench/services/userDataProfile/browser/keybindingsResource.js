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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
import { platform } from '../../../../base/common/platform.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let KeybindingsResourceInitializer = class KeybindingsResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const keybindingsContent = JSON.parse(content);
        if (keybindingsContent.keybindings === null) {
            this.logService.info(`Initializing Profile: No keybindings to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(keybindingsContent.keybindings));
    }
};
KeybindingsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], KeybindingsResourceInitializer);
export { KeybindingsResourceInitializer };
let KeybindingsResource = class KeybindingsResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const keybindingsContent = await this.getKeybindingsResourceContent(profile);
        return JSON.stringify(keybindingsContent);
    }
    async getKeybindingsResourceContent(profile) {
        const keybindings = await this.getKeybindingsContent(profile);
        return { keybindings, platform };
    }
    async apply(content, profile) {
        const keybindingsContent = JSON.parse(content);
        if (keybindingsContent.keybindings === null) {
            this.logService.info(`Importing Profile (${profile.name}): No keybindings to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.keybindingsResource, VSBuffer.fromString(keybindingsContent.keybindings));
    }
    async getKeybindingsContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.keybindingsResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError &&
                error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
KeybindingsResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], KeybindingsResource);
export { KeybindingsResource };
let KeybindingsResourceTreeItem = class KeybindingsResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "keybindings" /* ProfileResourceType.Keybindings */;
        this.handle = "keybindings" /* ProfileResourceType.Keybindings */;
        this.label = { label: localize('keybindings', 'Keyboard Shortcuts') };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.keybindings;
    }
    async getChildren() {
        return [
            {
                handle: this.profile.keybindingsResource.toString(),
                resourceUri: this.profile.keybindingsResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource),
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.keybindingsResource, undefined, undefined],
                },
            },
        ];
    }
    async hasContent() {
        const keybindingsContent = await this.instantiationService
            .createInstance(KeybindingsResource)
            .getKeybindingsResourceContent(this.profile);
        return keybindingsContent.keybindings !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(KeybindingsResource).getContent(this.profile);
    }
};
KeybindingsResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], KeybindingsResourceTreeItem);
export { KeybindingsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9rZXliaW5kaW5nc1Jlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBS04sdUJBQXVCLEdBQ3ZCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBWSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUszRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFPckYsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7SUFDMUMsWUFDMkMsc0JBQStDLEVBQzFELFdBQXlCLEVBQzFCLFVBQXVCO1FBRlgsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMxRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUMxQixlQUFVLEdBQVYsVUFBVSxDQUFhO0lBQ25ELENBQUM7SUFFSixLQUFLLENBQUMsVUFBVSxDQUFDLE9BQWU7UUFDL0Is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