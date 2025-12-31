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
import { LANGUAGE_DEFAULT } from '../../../base/common/platform.js';
import { format2 } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
let ExtHostLocalizationService = class ExtHostLocalizationService {
    constructor(initData, rpc, logService) {
        this.logService = logService;
        this.bundleCache = new Map();
        this._proxy = rpc.getProxy(MainContext.MainThreadLocalization);
        this.currentLanguage = initData.environment.appLanguage;
        this.isDefaultLanguage = this.currentLanguage === LANGUAGE_DEFAULT;
    }
    getMessage(extensionId, details) {
        const { message, args, comment } = details;
        if (this.isDefaultLanguage) {
            return format2(message, args ?? {});
        }
        let key = message;
        if (comment && comment.length > 0) {
            key += `/${Array.isArray(comment) ? comment.join('') : comment}`;
        }
        const str = this.bundleCache.get(extensionId)?.contents[key];
        if (!str) {
            this.logService.warn(`Using default string since no string found in i18n bundle that has the key: ${key}`);
        }
        return format2(str ?? message, args ?? {});
    }
    getBundle(extensionId) {
        return this.bundleCache.get(extensionId)?.contents;
    }
    getBundleUri(extensionId) {
        return this.bundleCache.get(extensionId)?.uri;
    }
    async initializeLocalizedMessages(extension) {
        if (this.isDefaultLanguage || (!extension.l10n && !extension.isBuiltin)) {
            return;
        }
        if (this.bundleCache.has(extension.identifier.value)) {
            return;
        }
        let contents;
        const bundleUri = await this.getBundleLocation(extension);
        if (!bundleUri) {
            this.logService.error(`No bundle location found for extension ${extension.identifier.value}`);
            return;
        }
        try {
            const response = await this._proxy.$fetchBundleContents(bundleUri);
            const result = JSON.parse(response);
            // 'contents.bundle' is a well-known key in the language pack json file that contains the _code_ translations for the extension
            contents = extension.isBuiltin ? result.contents?.bundle : result;
        }
        catch (e) {
            this.logService.error(`Failed to load translations for ${extension.identifier.value} from ${bundleUri}: ${e.message}`);
            return;
        }
        if (contents) {
            this.bundleCache.set(extension.identifier.value, {
                contents,
                uri: bundleUri,
            });
        }
    }
    async getBundleLocation(extension) {
        if (extension.isBuiltin) {
            const uri = await this._proxy.$fetchBuiltInBundleUri(extension.identifier.value, this.currentLanguage);
            return URI.revive(uri);
        }
        return extension.l10n
            ? URI.joinPath(extension.extensionLocation, extension.l10n, `bundle.l10n.${this.currentLanguage}.json`)
            : undefined;
    }
};
ExtHostLocalizationService = __decorate([
    __param(0, IExtHostInitDataService),
    __param(1, IExtHostRpcService),
    __param(2, ILogService)
], ExtHostLocalizationService);
export { ExtHostLocalizationService };
export const IExtHostLocalizationService = createDecorator('IExtHostLocalizationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvY2FsaXphdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TG9jYWxpemF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTBCO0lBVXRDLFlBQzBCLFFBQWlDLEVBQ3RDLEdBQXVCLEVBQzlCLFVBQXdDO1FBQXZCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFOckMsZ0JBQVcsR0FDM0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQU9ULElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxLQUFLLGdCQUFn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