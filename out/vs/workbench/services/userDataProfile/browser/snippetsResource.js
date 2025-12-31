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
import { ResourceSet } from '../../../../base/common/map.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
let SnippetsResourceInitializer = class SnippetsResourceInitializer {
    constructor(userDataProfileService, fileService, uriIdentityService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async initialize(content) {
        const snippetsContent = JSON.parse(content);
        for (const key in snippetsContent.snippets) {
            const resource = this.uriIdentityService.extUri.joinPath(this.userDataProfileService.currentProfile.snippetsHome, key);
            await this.fileService.writeFile(resource, VSBuffer.fromString(snippetsContent.snippets[key]));
        }
    }
};
SnippetsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, IUriIdentityService)
], SnippetsResourceInitializer);
export { SnippetsResourceInitializer };
let SnippetsResource = class SnippetsResource {
    constructor(fileService, uriIdentityService) {
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async getContent(profile, excluded) {
        const snippets = await this.getSnippets(profile, excluded);
        return JSON.stringify({ snippets });
    }
    async apply(content, profile) {
        const snippetsContent = JSON.parse(content);
        for (const key in snippetsContent.snippets) {
            const resource = this.uriIdentityService.extUri.joinPath(profile.snippetsHome, key);
            await this.fileService.writeFile(resource, VSBuffer.fromString(snippetsContent.snippets[key]));
        }
    }
    async getSnippets(profile, excluded) {
        const snippets = {};
        const snippetsResources = await this.getSnippetsResources(profile, excluded);
        for (const resource of snippetsResources) {
            const key = this.uriIdentityService.extUri.relativePath(profile.snippetsHome, resource);
            const content = await this.fileService.readFile(resource);
            snippets[key] = content.value.toString();
        }
        return snippets;
    }
    async getSnippetsResources(profile, excluded) {
        const snippets = [];
        let stat;
        try {
            stat = await this.fileService.resolve(profile.snippetsHome);
        }
        catch (e) {
            // No snippets
            if (e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return snippets;
            }
            else {
                throw e;
            }
        }
        for (const { resource } of stat.children || []) {
            if (excluded?.has(resource)) {
                continue;
            }
            const extension = this.uriIdentityService.extUri.extname(resource);
            if (extension === '.json' || extension === '.code-snippets') {
                snippets.push(resource);
            }
        }
        return snippets;
    }
};
SnippetsResource = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], SnippetsResource);
export { SnippetsResource };
let SnippetsResourceTreeItem = class SnippetsResourceTreeItem {
    constructor(profile, instantiationService, uriIdentityService) {
        this.profile = profile;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.type = "snippets" /* ProfileResourceType.Snippets */;
        this.handle = this.profile.snippetsHome.toString();
        this.label = { label: localize('snippets', 'Snippets') };
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
        this.excludedSnippets = new ResourceSet();
    }
    async getChildren() {
        const snippetsResources = await this.instantiationService
            .createInstance(SnippetsResource)
            .getSnippetsResources(this.profile);
        const that = this;
        return snippetsResources.map((resource) => ({
            handle: resource.toString(),
            parent: that,
            resourceUri: resource,
            collapsibleState: TreeItemCollapsibleState.None,
            accessibilityInformation: {
                label: this.uriIdentityService.extUri.basename(resource),
            },
            checkbox: that.checkbox
                ? {
                    get isChecked() {
                        return !that.excludedSnippets.has(resource);
                    },
                    set isChecked(value) {
                        if (value) {
                            that.excludedSnippets.delete(resource);
                        }
                        else {
                            that.excludedSnippets.add(resource);
                        }
                    },
                    accessibilityInformation: {
                        label: localize('exclude', 'Select Snippet {0}', this.uriIdentityService.extUri.basename(resource)),
                    },
                }
                : undefined,
            command: {
                id: API_OPEN_EDITOR_COMMAND_ID,
                title: '',
                arguments: [resource, undefined, undefined],
            },
        }));
    }
    async hasContent() {
        const snippetsResources = await this.instantiationService
            .createInstance(SnippetsResource)
            .getSnippetsResources(this.profile);
        return snippetsResources.length > 0;
    }
    async getContent() {
        return this.instantiationService
            .createInstance(SnippetsResource)
            .getContent(this.profile, this.excludedSnippets);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.snippets;
    }
};
SnippetsResourceTreeItem = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService)
], SnippetsResourceTreeItem);
export { SnippetsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9zbmlwcGV0c1Jlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsWUFBWSxHQUVaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFLNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNGLE9BQU8sRUFLTix1QkFBdUIsR0FDdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQU05QixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQUN2QyxZQUMyQyxzQkFBK0MsRUFDMUQsV0FBeUIsRUFDbEIsa0JBQXVDO1FBRm5DLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDMUQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtJQUMzRSxDQUFDO0lBRUosS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFlO1FBQy9CLE1BQU0sZUFBZSxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8s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