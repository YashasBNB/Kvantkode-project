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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ALL_EXTENSION_KINDS, ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { ExtensionsRegistry } from './extensionsRegistry.js';
import { getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { WORKSPACE_TRUST_EXTENSION_SUPPORT } from '../../workspaces/common/workspaceTrust.js';
import { isBoolean } from '../../../../base/common/types.js';
import { IWorkspaceTrustEnablementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isWeb } from '../../../../base/common/platform.js';
export const IExtensionManifestPropertiesService = createDecorator('extensionManifestPropertiesService');
let ExtensionManifestPropertiesService = class ExtensionManifestPropertiesService extends Disposable {
    constructor(productService, configurationService, workspaceTrustEnablementService, logService) {
        super();
        this.productService = productService;
        this.configurationService = configurationService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.logService = logService;
        this._extensionPointExtensionKindsMap = null;
        this._productExtensionKindsMap = null;
        this._configuredExtensionKindsMap = null;
        this._productVirtualWorkspaceSupportMap = null;
        this._configuredVirtualWorkspaceSupportMap = null;
        // Workspace trust request type (settings.json)
        this._configuredExtensionWorkspaceTrustRequestMap = new ExtensionIdentifierMap();
        const configuredExtensionWorkspaceTrustRequests = configurationService.inspect(WORKSPACE_TRUST_EXTENSION_SUPPORT).userValue || {};
        for (const id of Object.keys(configuredExtensionWorkspaceTrustRequests)) {
            this._configuredExtensionWorkspaceTrustRequestMap.set(id, configuredExtensionWorkspaceTrustRequests[id]);
        }
        // Workspace trust request type (product.json)
        this._productExtensionWorkspaceTrustRequestMap = new Map();
        if (productService.extensionUntrustedWorkspaceSupport) {
            for (const id of Object.keys(productService.extensionUntrustedWorkspaceSupport)) {
                this._productExtensionWorkspaceTrustRequestMap.set(id, productService.extensionUntrustedWorkspaceSupport[id]);
            }
        }
    }
    prefersExecuteOnUI(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.length > 0 && extensionKind[0] === 'ui';
    }
    prefersExecuteOnWorkspace(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.length > 0 && extensionKind[0] === 'workspace';
    }
    prefersExecuteOnWeb(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.length > 0 && extensionKind[0] === 'web';
    }
    canExecuteOnUI(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some((kind) => kind === 'ui');
    }
    canExecuteOnWorkspace(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some((kind) => kind === 'workspace');
    }
    canExecuteOnWeb(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some((kind) => kind === 'web');
    }
    getExtensionKind(manifest) {
        const deducedExtensionKind = this.deduceExtensionKind(manifest);
        const configuredExtensionKind = this.getConfiguredExtensionKind(manifest);
        if (configuredExtensionKind && configuredExtensionKind.length > 0) {
            const result = [];
            for (const extensionKind of configuredExtensionKind) {
                if (extensionKind !== '-web') {
                    result.push(extensionKind);
                }
            }
            // If opted out from web without specifying other extension kinds then default to ui, workspace
            if (configuredExtensionKind.includes('-web') && !result.length) {
                result.push('ui');
                result.push('workspace');
            }
            // Add web kind if not opted out from web and can run in web
            if (isWeb &&
                !configuredExtensionKind.includes('-web') &&
                !configuredExtensionKind.includes('web') &&
                deducedExtensionKind.includes('web')) {
                result.push('web');
            }
            return result;
        }
        return deducedExtensionKind;
    }
    getUserConfiguredExtensionKind(extensionIdentifier) {
        if (this._configuredExtensionKindsMap === null) {
            const configuredExtensionKindsMap = new ExtensionIdentifierMap();
            const configuredExtensionKinds = this.configurationService.getValue('remote.extensionKind') || {};
            for (const id of Object.keys(configuredExtensionKinds)) {
                configuredExtensionKindsMap.set(id, configuredExtensionKinds[id]);
            }
            this._configuredExtensionKindsMap = configuredExtensionKindsMap;
        }
        const userConfiguredExtensionKind = this._configuredExtensionKindsMap.get(extensionIdentifier.id);
        return userConfiguredExtensionKind ? this.toArray(userConfiguredExtensionKind) : undefined;
    }
    getExtensionUntrustedWorkspaceSupportType(manifest) {
        // Workspace trust feature is disabled, or extension has no entry point
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled() || !manifest.main) {
            return true;
        }
        // Get extension workspace trust requirements from settings.json
        const configuredWorkspaceTrustRequest = this.getConfiguredExtensionWorkspaceTrustRequest(manifest);
        // Get extension workspace trust requirements from product.json
        const productWorkspaceTrustRequest = this.getProductExtensionWorkspaceTrustRequest(manifest);
        // Use settings.json override value if it exists
        if (configuredWorkspaceTrustRequest !== undefined) {
            return configuredWorkspaceTrustRequest;
        }
        // Use product.json override value if it exists
        if (productWorkspaceTrustRequest?.override !== undefined) {
            return productWorkspaceTrustRequest.override;
        }
        // Use extension manifest value if it exists
        if (manifest.capabilities?.untrustedWorkspaces?.supported !== undefined) {
            return manifest.capabilities.untrustedWorkspaces.supported;
        }
        // Use product.json default value if it exists
        if (productWorkspaceTrustRequest?.default !== undefined) {
            return productWorkspaceTrustRequest.default;
        }
        return false;
    }
    getExtensionVirtualWorkspaceSupportType(manifest) {
        // check user configured
        const userConfiguredVirtualWorkspaceSupport = this.getConfiguredVirtualWorkspaceSupport(manifest);
        if (userConfiguredVirtualWorkspaceSupport !== undefined) {
            return userConfiguredVirtualWorkspaceSupport;
        }
        const productConfiguredWorkspaceSchemes = this.getProductVirtualWorkspaceSupport(manifest);
        // check override from product
        if (productConfiguredWorkspaceSchemes?.override !== undefined) {
            return productConfiguredWorkspaceSchemes.override;
        }
        // check the manifest
        const virtualWorkspaces = manifest.capabilities?.virtualWorkspaces;
        if (isBoolean(virtualWorkspaces)) {
            return virtualWorkspaces;
        }
        else if (virtualWorkspaces) {
            const supported = virtualWorkspaces.supported;
            if (isBoolean(supported) || supported === 'limited') {
                return supported;
            }
        }
        // check default from product
        if (productConfiguredWorkspaceSchemes?.default !== undefined) {
            return productConfiguredWorkspaceSchemes.default;
        }
        // Default - supports virtual workspace
        return true;
    }
    deduceExtensionKind(manifest) {
        // Not an UI extension if it has main
        if (manifest.main) {
            if (manifest.browser) {
                return isWeb ? ['workspace', 'web'] : ['workspace'];
            }
            return ['workspace'];
        }
        if (manifest.browser) {
            return ['web'];
        }
        let result = [...ALL_EXTENSION_KINDS];
        if (isNonEmptyArray(manifest.extensionPack) ||
            isNonEmptyArray(manifest.extensionDependencies)) {
            // Extension pack defaults to [workspace, web] in web and only [workspace] in desktop
            result = isWeb ? ['workspace', 'web'] : ['workspace'];
        }
        if (manifest.contributes) {
            for (const contribution of Object.keys(manifest.contributes)) {
                const supportedExtensionKinds = this.getSupportedExtensionKindsForExtensionPoint(contribution);
                if (supportedExtensionKinds.length) {
                    result = result.filter((extensionKind) => supportedExtensionKinds.includes(extensionKind));
                }
            }
        }
        if (!result.length) {
            this.logService.warn('Cannot deduce extensionKind for extension', getGalleryExtensionId(manifest.publisher, manifest.name));
        }
        return result;
    }
    getSupportedExtensionKindsForExtensionPoint(extensionPoint) {
        if (this._extensionPointExtensionKindsMap === null) {
            const extensionPointExtensionKindsMap = new Map();
            ExtensionsRegistry.getExtensionPoints().forEach((e) => extensionPointExtensionKindsMap.set(e.name, e.defaultExtensionKind || [] /* supports all */));
            this._extensionPointExtensionKindsMap = extensionPointExtensionKindsMap;
        }
        let extensionPointExtensionKind = this._extensionPointExtensionKindsMap.get(extensionPoint);
        if (extensionPointExtensionKind) {
            return extensionPointExtensionKind;
        }
        extensionPointExtensionKind = this.productService.extensionPointExtensionKind
            ? this.productService.extensionPointExtensionKind[extensionPoint]
            : undefined;
        if (extensionPointExtensionKind) {
            return extensionPointExtensionKind;
        }
        /* Unknown extension point */
        return isWeb ? ['workspace', 'web'] : ['workspace'];
    }
    getConfiguredExtensionKind(manifest) {
        const extensionIdentifier = { id: getGalleryExtensionId(manifest.publisher, manifest.name) };
        // check in config
        let result = this.getUserConfiguredExtensionKind(extensionIdentifier);
        if (typeof result !== 'undefined') {
            return this.toArray(result);
        }
        // check product.json
        result = this.getProductExtensionKind(manifest);
        if (typeof result !== 'undefined') {
            return result;
        }
        // check the manifest itself
        result = manifest.extensionKind;
        if (typeof result !== 'undefined') {
            result = this.toArray(result);
            return result.filter((r) => ['ui', 'workspace'].includes(r));
        }
        return null;
    }
    getProductExtensionKind(manifest) {
        if (this._productExtensionKindsMap === null) {
            const productExtensionKindsMap = new ExtensionIdentifierMap();
            if (this.productService.extensionKind) {
                for (const id of Object.keys(this.productService.extensionKind)) {
                    productExtensionKindsMap.set(id, this.productService.extensionKind[id]);
                }
            }
            this._productExtensionKindsMap = productExtensionKindsMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productExtensionKindsMap.get(extensionId);
    }
    getProductVirtualWorkspaceSupport(manifest) {
        if (this._productVirtualWorkspaceSupportMap === null) {
            const productWorkspaceSchemesMap = new ExtensionIdentifierMap();
            if (this.productService.extensionVirtualWorkspacesSupport) {
                for (const id of Object.keys(this.productService.extensionVirtualWorkspacesSupport)) {
                    productWorkspaceSchemesMap.set(id, this.productService.extensionVirtualWorkspacesSupport[id]);
                }
            }
            this._productVirtualWorkspaceSupportMap = productWorkspaceSchemesMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productVirtualWorkspaceSupportMap.get(extensionId);
    }
    getConfiguredVirtualWorkspaceSupport(manifest) {
        if (this._configuredVirtualWorkspaceSupportMap === null) {
            const configuredWorkspaceSchemesMap = new ExtensionIdentifierMap();
            const configuredWorkspaceSchemes = this.configurationService.getValue('extensions.supportVirtualWorkspaces') || {};
            for (const id of Object.keys(configuredWorkspaceSchemes)) {
                if (configuredWorkspaceSchemes[id] !== undefined) {
                    configuredWorkspaceSchemesMap.set(id, configuredWorkspaceSchemes[id]);
                }
            }
            this._configuredVirtualWorkspaceSupportMap = configuredWorkspaceSchemesMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._configuredVirtualWorkspaceSupportMap.get(extensionId);
    }
    getConfiguredExtensionWorkspaceTrustRequest(manifest) {
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        const extensionWorkspaceTrustRequest = this._configuredExtensionWorkspaceTrustRequestMap.get(extensionId);
        if (extensionWorkspaceTrustRequest &&
            (extensionWorkspaceTrustRequest.version === undefined ||
                extensionWorkspaceTrustRequest.version === manifest.version)) {
            return extensionWorkspaceTrustRequest.supported;
        }
        return undefined;
    }
    getProductExtensionWorkspaceTrustRequest(manifest) {
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productExtensionWorkspaceTrustRequestMap.get(extensionId);
    }
    toArray(extensionKind) {
        if (Array.isArray(extensionKind)) {
            return extensionKind;
        }
        return extensionKind === 'ui' ? ['ui', 'workspace'] : [extensionKind];
    }
};
ExtensionManifestPropertiesService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceTrustEnablementService),
    __param(3, ILogService)
], ExtensionManifestPropertiesService);
export { ExtensionManifestPropertiesService };
registerSingleton(IExtensionManifestPropertiesService, ExtensionManifestPropertiesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbk1hbmlmZXN0UHJvcGVydGllc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUtOLG1CQUFtQixFQUNuQixzQkFBc0IsR0FDdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNE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