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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvYnJvd3Nlci9idWlsdGluRXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixnQ0FBZ0MsR0FLaEMsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQ2hJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBRU4sZ0JBQWdCLEdBQ2hCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVV4RCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjtJQU8zQyxZQUMrQixrQkFBZ0QsRUFDekQsa0JBQXVDLEVBRTVELDhCQUFnRixFQUMvRCxjQUErQixFQUNuQyxVQUF3QztRQUZwQyxtQ0FBOEIsR0FBOUIsOEJBQThCLENBQWlDO1FBRWxELGVBQVUsR0FBVixVQUFVLENBQWE7UUFWckMsOEJBQXlCLEdBQTBCLEVBQUUsQ0FBQTtRQVlyRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQTtZQUMvRCxzRkFBc0Y7WUFDdEYsSUFBSSxVQUFVLElBQUksY0FBYyxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFDckIsY0FBYyxDQUFDLE1BQU0sRUFDckIsY0FBYyxDQUFDLE9BQU8sRUFDdEIsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUNoQixDQUFBO1lBQ0YsQ0FBQztZQUVELE1BQU0sMkJBQTJCLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ2xGLElBQUksMkJBQTJCLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxpQkFBaUIsR0FBd0IsRUFBRSxDQUFBO2dCQUUvQyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNoQywyQ0FBMkM7b0JBQzNDLGlCQUFpQixHQUFHO29CQUNuQixvQ0FBb0M7cUJBQ3BDLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLDhDQUE4QztvQkFDOUMsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FDbEUscUNBQXFDLENBQ3JDLENBQUE7b0JBQ0QsTUFBTSxpQ0FBaUMsR0FBRyx3QkFBd0I7d0JBQ2pFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDO3dCQUN4RCxDQUFDLENBQUMsU0FBUyxDQUFBO29CQUNaLElBQUksaUNBQWlDLEVBQUUsQ0FBQzt3QkFDdkMsSUFBSSxDQUFDOzRCQUNKLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTt3QkFDbEUsQ0FBQzt3QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDOzRCQUNoQixpQkFBaUI7d0JBQ2xCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNsRSxNQUFNLEVBQUUsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUM3RSxPQUFPO3dCQUNOLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRTt3QkFDbEIsUUFBUSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQzNDLDJCQUEyQixFQUMzQixDQUFDLENBQUMsYUFBYSxDQUNmO3dCQUNELElBQUksOEJBQXNCO3dCQUMxQixTQUFTLEVBQUUsSUFBSTt3QkFDZixRQUFRLEVBQUUsQ0FBQyxDQUFDLFVBQVU7NEJBQ3JCLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDOzRCQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVc7d0JBQ2hCLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVTs0QkFDdEIsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQzs0QkFDL0UsQ0FBQyxDQUFDLFNBQVM7d0JBQ1osWUFBWSxFQUFFLENBQUMsQ0FBQyxhQUFhOzRCQUM1QixDQUFDLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDOzRCQUNsRixDQUFDLENBQUMsU0FBUzt3QkFDWixjQUFjLGdDQUFvQjt3QkFDbEMsV0FBVyxFQUFFLEVBQUU7d0JBQ2YsT0FBTyxFQUFFLElBQUk7d0JBQ2IsVUFBVSxFQUFFLEtBQUs7cUJBQ2pCLENBQUE7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUM3QixXQUFtQixFQUNuQixRQUE0QixFQUM1QixvQkFBbUM7UUFFbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDekUsQ0FBQztRQUNELDhHQUE4RztRQUM5RyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDhCQUE4QixDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDdkMsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUN6RSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6R1ksK0JBQStCO0lBUXpDLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FiRCwrQkFBK0IsQ0F5RzNDOztBQUVELGlCQUFpQixDQUNoQixnQ0FBZ0MsRUFDaEMsK0JBQStCLG9DQUUvQixDQUFBIn0=