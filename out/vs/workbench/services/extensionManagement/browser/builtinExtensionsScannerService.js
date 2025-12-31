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
import { IBuiltinExtensionsScannerService, } from '../../../../platform/extensions/common/extensions.js';
import { isWeb, Language } from '../../../../base/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { builtinExtensionsPath, FileAccess } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { localizeManifest, } from '../../../../platform/extensionManagement/common/extensionNls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mainWindow } from '../../../../base/browser/window.js';
let BuiltinExtensionsScannerService = class BuiltinExtensionsScannerService {
    constructor(environmentService, uriIdentityService, extensionResourceLoaderService, productService, logService) {
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
        this.builtinExtensionsPromises = [];
        if (isWeb) {
            const nlsBaseUrl = productService.extensionsGallery?.nlsBaseUrl;
            // Only use the nlsBaseUrl if we are using a language other than the default, English.
            if (nlsBaseUrl && productService.commit && !Language.isDefaultVariant()) {
                this.nlsUrl = URI.joinPath(URI.parse(nlsBaseUrl), productService.commit, productService.version, Language.value());
            }
            const builtinExtensionsServiceUrl = FileAccess.asBrowserUri(builtinExtensionsPath);
            if (builtinExtensionsServiceUrl) {
                let bundledExtensions = [];
                if (environmentService.isBuilt) {
                    // Built time configuration (do NOT modify)
                    bundledExtensions = [
                    /*BUILD->INSERT_BUILTIN_EXTENSIONS*/
                    ];
                }
                else {
                    // Find builtin extensions by checking for DOM
                    const builtinExtensionsElement = mainWindow.document.getElementById('vscode-workbench-builtin-extensions');
                    const builtinExtensionsElementAttribute = builtinExtensionsElement
                        ? builtinExtensionsElement.getAttribute('data-settings')
                        : undefined;
                    if (builtinExtensionsElementAttribute) {
                        try {
                            bundledExtensions = JSON.parse(builtinExtensionsElementAttribute);
                        }
                        catch (error) {
                            /* ignore error*/
                        }
                    }
                }
                this.builtinExtensionsPromises = bundledExtensions.map(async (e) => {
                    const id = getGalleryExtensionId(e.packageJSON.publisher, e.packageJSON.name);
                    return {
                        identifier: { id },
                        location: uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.extensionPath),
                        type: 0 /* ExtensionType.System */,
                        isBuiltin: true,
                        manifest: e.packageNLS
                            ? await this.localizeManifest(id, e.packageJSON, e.packageNLS)
                            : e.packageJSON,
                        readmeUrl: e.readmePath
                            ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.readmePath)
                            : undefined,
                        changelogUrl: e.changelogPath
                            ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.changelogPath)
                            : undefined,
                        targetPlatform: "web" /* TargetPlatform.WEB */,
                        validations: [],
                        isValid: true,
                        preRelease: false,
                    };
                });
            }
        }
    }
    async scanBuiltinExtensions() {
        return [...(await Promise.all(this.builtinExtensionsPromises))];
    }
    async localizeManifest(extensionId, manifest, fallbackTranslations) {
        if (!this.nlsUrl) {
            return localizeManifest(this.logService, manifest, fallbackTranslations);
        }
        // the `package` endpoint returns the translations in a key-value format similar to the package.nls.json file.
        const uri = URI.joinPath(this.nlsUrl, extensionId, 'package');
        try {
            const res = await this.extensionResourceLoaderService.readExtensionResource(uri);
            const json = JSON.parse(res.toString());
            return localizeManifest(this.logService, manifest, json, fallbackTranslations);
        }
        catch (e) {
            this.logService.error(e);
            return localizeManifest(this.logService, manifest, fallbackTranslations);
        }
    }
};
BuiltinExtensionsScannerService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IUriIdentityService),
    __param(2, IExtensionResourceLoaderService),
    __param(3, IProductService),
    __param(4, ILogService)
], BuiltinExtensionsScannerService);
export { BuiltinExtensionsScannerService };
registerSingleton(IBuiltinExtensionsScannerService, BuiltinExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sZ0NBQWdDLEdBS2hDLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDbEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUNoSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFVeEQsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7SUFP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