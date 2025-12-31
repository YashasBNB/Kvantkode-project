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
var InstallExtensionQuickAccessProvider_1, ManageExtensionsQuickAccessProvider_1;
import { PickerQuickAccessProvider, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { localize } from '../../../../nls.js';
import { IExtensionGalleryService, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
let InstallExtensionQuickAccessProvider = class InstallExtensionQuickAccessProvider extends PickerQuickAccessProvider {
    static { InstallExtensionQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'ext install '; }
    constructor(extensionsWorkbenchService, galleryService, extensionsService, notificationService, logService) {
        super(InstallExtensionQuickAccessProvider_1.PREFIX);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.galleryService = galleryService;
        this.extensionsService = extensionsService;
        this.notificationService = notificationService;
        this.logService = logService;
    }
    _getPicks(filter, disposables, token) {
        // Nothing typed
        if (!filter) {
            return [
                {
                    label: localize('type', 'Type an extension name to install or search.'),
                },
            ];
        }
        const genericSearchPickItem = {
            label: localize('searchFor', "Press Enter to search for extension '{0}'.", filter),
            accept: () => this.extensionsWorkbenchService.openSearch(filter),
        };
        // Extension ID typed: try to find it
        if (/\./.test(filter)) {
            return this.getPicksForExtensionId(filter, genericSearchPickItem, token);
        }
        // Extension name typed: offer to search it
        return [genericSearchPickItem];
    }
    async getPicksForExtensionId(filter, fallback, token) {
        try {
            const [galleryExtension] = await this.galleryService.getExtensions([{ id: filter }], token);
            if (token.isCancellationRequested) {
                return []; // return early if canceled
            }
            if (!galleryExtension) {
                return [fallback];
            }
            return [
                {
                    label: localize('install', "Press Enter to install extension '{0}'.", filter),
                    accept: () => this.installExtension(galleryExtension, filter),
                },
            ];
        }
        catch (error) {
            if (token.isCancellationRequested) {
                return []; // expected error
            }
            this.logService.error(error);
            return [fallback];
        }
    }
    async installExtension(extension, name) {
        try {
            await this.extensionsWorkbenchService.openSearch(`@id:${name}`);
            await this.extensionsService.installFromGallery(extension);
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
InstallExtensionQuickAccessProvider = InstallExtensionQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionManagementService),
    __param(3, INotificationService),
    __param(4, ILogService)
], InstallExtensionQuickAccessProvider);
export { InstallExtensionQuickAccessProvider };
let ManageExtensionsQuickAccessProvider = class ManageExtensionsQuickAccessProvider extends PickerQuickAccessProvider {
    static { ManageExtensionsQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'ext '; }
    constructor(extensionsWorkbenchService) {
        super(ManageExtensionsQuickAccessProvider_1.PREFIX);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    _getPicks() {
        return [
            {
                label: localize('manage', 'Press Enter to manage your extensions.'),
                accept: () => this.extensionsWorkbenchService.openSearch(''),
            },
        ];
    }
};
ManageExtensionsQuickAccessProvider = ManageExtensionsQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], ManageExtensionsQuickAccessProvider);
export { ManageExtensionsQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUUzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUU5RCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFvQyxTQUFRLHlCQUFpRDs7YUFDbEcsV0FBTSxHQUFHLGNBQWMsQUFBakIsQ0FBaUI7SUFFOUIsWUFFa0IsMEJBQXVELEVBQzdCLGNBQXdDLEVBQ3JDLGlCQUE4QyxFQUNyRCxtQkFBeUMsRUFDbEQsVUFBdUI7UUFFckQsS0FBSyxDQUFDLHFDQUFtQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBTmhDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFDN0IsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBNkI7UUFDckQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUNsRCxlQUFVLEdBQVYsVUFBVSxDQUFhO0lBR3RELENBQUM7SUFFUyxTQUFTLENBQ2xCLE1BQWMsRUFDZCxXQUE0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