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
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { AllowedExtensionsConfigKey, } from './extensionManagement.js';
import { IProductService } from '../../product/common/productService.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { isBoolean, isObject, isUndefined } from '../../../base/common/types.js';
import { Emitter } from '../../../base/common/event.js';
function isGalleryExtension(extension) {
    return extension.type === 'gallery';
}
function isIExtension(extension) {
    return extension.type === 1 /* ExtensionType.User */ || extension.type === 0 /* ExtensionType.System */;
}
const VersionRegex = /^(?<version>\d+\.\d+\.\d+(-.*)?)(@(?<platform>.+))?$/;
let AllowedExtensionsService = class AllowedExtensionsService extends Disposable {
    get allowedExtensionsConfigValue() {
        return this._allowedExtensionsConfigValue;
    }
    constructor(productService, configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeAllowedExtensions = this._register(new Emitter());
        this.onDidChangeAllowedExtensionsConfigValue = this._onDidChangeAllowedExtensions.event;
        this.publisherOrgs = productService.extensionPublisherOrgs?.map((p) => p.toLowerCase()) ?? [];
        this._allowedExtensionsConfigValue = this.getAllowedExtensionsValue();
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(AllowedExtensionsConfigKey)) {
                this._allowedExtensionsConfigValue = this.getAllowedExtensionsValue();
                this._onDidChangeAllowedExtensions.fire();
            }
        }));
    }
    getAllowedExtensionsValue() {
        const value = this.configurationService.getValue(AllowedExtensionsConfigKey);
        if (!isObject(value) || Array.isArray(value)) {
            return undefined;
        }
        const entries = Object.entries(value).map(([key, value]) => [key.toLowerCase(), value]);
        if (entries.length === 1 && entries[0][0] === '*' && entries[0][1] === true) {
            return undefined;
        }
        return Object.fromEntries(entries);
    }
    isAllowed(extension) {
        if (!this._allowedExtensionsConfigValue) {
            return true;
        }
        let id, version, targetPlatform, prerelease, publisher, publisherDisplayName;
        if (isGalleryExtension(extension)) {
            id = extension.identifier.id.toLowerCase();
            version = extension.version;
            prerelease = extension.properties.isPreReleaseVersion;
            publisher = extension.publisher.toLowerCase();
            publisherDisplayName = extension.publisherDisplayName.toLowerCase();
            targetPlatform = extension.properties.targetPlatform;
        }
        else if (isIExtension(extension)) {
            id = extension.identifier.id.toLowerCase();
            version = extension.manifest.version;
            prerelease = extension.preRelease;
            publisher = extension.manifest.publisher.toLowerCase();
            publisherDisplayName = extension.publisherDisplayName?.toLowerCase();
            targetPlatform = extension.targetPlatform;
        }
        else {
            id = extension.id.toLowerCase();
            version = extension.version ?? '*';
            targetPlatform = extension.targetPlatform ?? "universal" /* TargetPlatform.UNIVERSAL */;
            prerelease = extension.prerelease ?? false;
            publisher = extension.id.substring(0, extension.id.indexOf('.')).toLowerCase();
            publisherDisplayName = extension.publisherDisplayName?.toLowerCase();
        }
        const settingsCommandLink = URI.parse(`command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify({ query: `@id:${AllowedExtensionsConfigKey}` }))}`).toString();
        const extensionValue = this._allowedExtensionsConfigValue[id];
        const extensionReason = new MarkdownString(nls.localize('specific extension not allowed', 'it is not in the [allowed list]({0})', settingsCommandLink));
        if (!isUndefined(extensionValue)) {
            if (isBoolean(extensionValue)) {
                return extensionValue ? true : extensionReason;
            }
            if (extensionValue === 'stable' && prerelease) {
                return new MarkdownString(nls.localize('extension prerelease not allowed', 'the pre-release versions of this extension are not in the [allowed list]({0})', settingsCommandLink));
            }
            if (version !== '*' &&
                Array.isArray(extensionValue) &&
                !extensionValue.some((v) => {
                    const match = VersionRegex.exec(v);
                    if (match && match.groups) {
                        const { platform: p, version: v } = match.groups;
                        if (v !== version) {
                            return false;
                        }
                        if (targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ && p && targetPlatform !== p) {
                            return false;
                        }
                        return true;
                    }
                    return false;
                })) {
                return new MarkdownString(nls.localize('specific version of extension not allowed', 'the version {0} of this extension is not in the [allowed list]({1})', version, settingsCommandLink));
            }
            return true;
        }
        const publisherKey = publisherDisplayName && this.publisherOrgs.includes(publisherDisplayName)
            ? publisherDisplayName
            : publisher;
        const publisherValue = this._allowedExtensionsConfigValue[publisherKey];
        if (!isUndefined(publisherValue)) {
            if (isBoolean(publisherValue)) {
                return publisherValue
                    ? true
                    : new MarkdownString(nls.localize('publisher not allowed', 'the extensions from this publisher are not in the [allowed list]({1})', publisherKey, settingsCommandLink));
            }
            if (publisherValue === 'stable' && prerelease) {
                return new MarkdownString(nls.localize('prerelease versions from this publisher not allowed', 'the pre-release versions from this publisher are not in the [allowed list]({1})', publisherKey, settingsCommandLink));
            }
            return true;
        }
        if (this._allowedExtensionsConfigValue['*'] === true) {
            return true;
        }
        return extensionReason;
    }
};
AllowedExtensionsService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], AllowedExtensionsService);
export { AllowedExtensionsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBRU4sMEJBQTBCLEdBRzFCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXZELFNBQVMsa0JBQWtCLENBQUMsU0FBYztJQUN6QyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFBO0FBQ3BDLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFjO0lBQ25DLE9BQU8sU0FBUyxDQUFDLElBQUksK0JBQXVCLElBQUksU0FBUyxDQUFDLElBQUksaUNBQXlCLENBQUE7QUFDeEYsQ0FBQztBQUVELE1BQU0sWUFBWSxHQUFHLHNEQUFzRCxDQUFBO0FBRXBFLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEs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