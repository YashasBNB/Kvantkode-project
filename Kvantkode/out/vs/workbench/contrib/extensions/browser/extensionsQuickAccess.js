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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsMkJBQTJCLEdBRTNCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTlELElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW9DLFNBQVEseUJBQWlEOzthQUNsRyxXQUFNLEdBQUcsY0FBYyxBQUFqQixDQUFpQjtJQUU5QixZQUVrQiwwQkFBdUQsRUFDN0IsY0FBd0MsRUFDckMsaUJBQThDLEVBQ3JELG1CQUF5QyxFQUNsRCxVQUF1QjtRQUVyRCxLQUFLLENBQUMscUNBQW1DLENBQUMsTUFBTSxDQUFDLENBQUE7UUFOaEMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUM3QixtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE2QjtRQUNyRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ2xELGVBQVUsR0FBVixVQUFVLENBQWE7SUFHdEQsQ0FBQztJQUVTLFNBQVMsQ0FDbEIsTUFBYyxFQUNk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