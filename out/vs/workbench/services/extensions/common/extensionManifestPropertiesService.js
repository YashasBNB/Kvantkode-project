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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25NYW5pZmVzdFByb3BlcnRpZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFLTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBQ3RCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDMUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FDL0MsZUFBZSxDQUFzQyxvQ0FBb0MsQ0FBQyxDQUFBO0FBeUJwRixJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUNaLFNBQVEsVUFBVTtJQTBCbEIsWUFDa0IsY0FBZ0QsRUFDMUMsb0JBQTRELEVBRW5GLCtCQUFrRixFQUNyRSxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQU4yQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDekIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUVsRSxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQ3BELGVBQVUsR0FBVixVQUFVLENBQWE7UUExQjlDLHFDQUFnQyxHQUF3QyxJQUFJLENBQUE7UUFDNUUsOEJBQXlCLEdBQW1ELElBQUksQ0FBQTtRQUNoRixpQ0FBNEIsR0FFekIsSUFBSSxDQUFBO1FBRVAsdUNBQWtDLEdBRzlCLElBQUksQ0FBQTtRQUNSLDBDQUFxQyxHQUEyQyxJQUFJLENBQUE7UUFvQjNGLCtDQUErQztRQUMvQyxJQUFJLENBQUMsNENBQTRDLEdBQUcsSUFBSSxzQkFBc0IsRUFHMUUsQ0FBQTtRQUNKLE1BQU0seUNBQXlDLEdBQzlDLG9CQUFvQixDQUFDLE9BQU8sQ0FFekIsaUNBQWlDLENBQUMsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFBO1FBQ3RELEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLENBQUM7WUFDekUsSUFBSSxDQUFDLDRDQUE0QyxDQUFDLEdBQUcsQ0FDcEQsRUFBRSxFQUNGLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQyxDQUM3QyxDQUFBO1FBQ0YsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxJQUFJLENBQUMseUNBQXlDLEdBQUcsSUFBSSxHQUFHLEVBR3JELENBQUE7UUFDSCxJQUFJLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxDQUFDO1lBQ3ZELEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsRUFBRSxDQUFDO2dCQUNqRixJQUFJLENBQUMseUNBQXlDLENBQUMsR0FBRyxDQUNqRCxFQUFFLEVBQ0YsY0FBYyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQyxDQUNyRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBNEI7UUFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQTtJQUM3RCxDQUFDO0lBRUQseUJBQXlCLENBQUMsUUFBNEI7UUFDckQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsbUJBQW1CLENBQUMsUUFBNEI7UUFDL0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQTtJQUM5RCxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQTRCO1FBQzFDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBNEI7UUFDakQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxlQUFlLENBQUMsUUFBNEI7UUFDM0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxRQUE0QjtRQUM1QyxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV6RSxJQUFJLHVCQUF1QixJQUFJLHVCQUF1QixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuRSxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFBO1lBQ2xDLEtBQUssTUFBTSxhQUFhLElBQUksdUJBQXVCLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxhQUFhLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBRUQsK0ZBQStGO1lBQy9GLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3pCLENBQUM7WUFFRCw0REFBNEQ7WUFDNUQsSUFDQyxLQUFLO2dCQUNMLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDekMsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO2dCQUN4QyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQ25DLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuQixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBRUQsT0FBTyxvQkFBb0IsQ0FBQTtJQUM1QixDQUFDO0lBRUQsOEJBQThCLENBQzdCLG1CQUF5QztRQUV6QyxJQUFJLElBQUksQ0FBQyw0QkFBNEIsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNoRCxNQUFNLDJCQUEyQixHQUFHLElBQUksc0JBQXNCLEVBRTNELENBQUE7WUFDSCxNQUFNLHdCQUF3QixHQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUNqQyxzQkFBc0IsQ0FDdEIsSUFBSSxFQUFFLENBQUE7WUFDUixLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO2dCQUN4RCwyQkFBMkIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUNELElBQUksQ0FBQyw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQTtRQUNoRSxDQUFDO1FBRUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUN4RSxtQkFBbUIsQ0FBQyxFQUFFLENBQ3RCLENBQUE7UUFDRCxPQUFPLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUMzRixDQUFDO0lBRUQseUNBQXlDLENBQ3hDLFFBQTRCO1FBRTVCLHVFQUF1RTtRQUN2RSxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkYsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsZ0VBQWdFO1FBQ2hFLE1BQU0sK0JBQStCLEdBQ3BDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUUzRCwrREFBK0Q7UUFDL0QsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsd0NBQXdDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFNUYsZ0RBQWdEO1FBQ2hELElBQUksK0JBQStCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkQsT0FBTywrQkFBK0IsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksNEJBQTRCLEVBQUUsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFBO1FBQzdDLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsSUFBSSxRQUFRLENBQUMsWUFBWSxFQUFFLG1CQUFtQixFQUFFLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6RSxPQUFPLFFBQVEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFBO1FBQzNELENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsSUFBSSw0QkFBNEIsRUFBRSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekQsT0FBTyw0QkFBNEIsQ0FBQyxPQUFPLENBQUE7UUFDNUMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELHVDQUF1QyxDQUN0QyxRQUE0QjtRQUU1Qix3QkFBd0I7UUFDeEIsTUFBTSxxQ0FBcUMsR0FDMUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BELElBQUkscUNBQXFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekQsT0FBTyxxQ0FBcUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFMUYsOEJBQThCO1FBQzlCLElBQUksaUNBQWlDLEVBQUUsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9ELE9BQU8saUNBQWlDLENBQUMsUUFBUSxDQUFBO1FBQ2xELENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFBO1FBQ2xFLElBQUksU0FBUyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLGlCQUFpQixDQUFBO1FBQ3pCLENBQUM7YUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDOUIsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFBO1lBQzdDLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDckQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxpQ0FBaUMsRUFBRSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDOUQsT0FBTyxpQ0FBaUMsQ0FBQyxPQUFPLENBQUE7UUFDakQsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxRQUE0QjtRQUN2RCxxQ0FBcUM7UUFDckMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkIsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1lBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3JCLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDZixDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLENBQUE7UUFFckMsSUFDQyxlQUFlLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztZQUN2QyxlQUFlLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEVBQzlDLENBQUM7WUFDRixxRkFBcUY7WUFDckYsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUVELElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzFCLEtBQUssTUFBTSxZQUFZLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsTUFBTSx1QkFBdUIsR0FDNUIsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUMvRCxJQUFJLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNwQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7Z0JBQzNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLDJDQUEyQyxFQUMzQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDeEQsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTywyQ0FBMkMsQ0FBQyxjQUFzQjtRQUN6RSxJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxNQUFNLCtCQUErQixHQUFHLElBQUksR0FBRyxFQUEyQixDQUFBO1lBQzFFLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDckQsK0JBQStCLENBQUMsR0FBRyxDQUNsQyxDQUFDLENBQUMsSUFBSSxFQUNOLENBQUMsQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQy9DLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxnQ0FBZ0MsR0FBRywrQkFBK0IsQ0FBQTtRQUN4RSxDQUFDO1FBRUQsSUFBSSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzNGLElBQUksMkJBQTJCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLDJCQUEyQixDQUFBO1FBQ25DLENBQUM7UUFFRCwyQkFBMkIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDJCQUEyQjtZQUM1RSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUM7WUFDakUsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNaLElBQUksMkJBQTJCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLDJCQUEyQixDQUFBO1FBQ25DLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTywwQkFBMEIsQ0FDakMsUUFBNEI7UUFFNUIsTUFBTSxtQkFBbUIsR0FBRyxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO1FBRTVGLGtCQUFrQjtRQUNsQixJQUFJLE1BQU0sR0FDVCxJQUFJLENBQUMsOEJBQThCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN6RCxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLE1BQU0sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUE7UUFDL0IsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM3QixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxRQUE0QjtRQUMzRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QyxNQUFNLHdCQUF3QixHQUFHLElBQUksc0JBQXNCLEVBQW1CLENBQUE7WUFDOUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN2QyxLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO29CQUNqRSx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hFLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLHlCQUF5QixHQUFHLHdCQUF3QixDQUFBO1FBQzFELENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1RSxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVPLGlDQUFpQyxDQUN4QyxRQUE0QjtRQUU1QixJQUFJLElBQUksQ0FBQyxrQ0FBa0MsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN0RCxNQUFNLDBCQUEwQixHQUFHLElBQUksc0JBQXNCLEVBR3pELENBQUE7WUFDSixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztnQkFDM0QsS0FBSyxNQUFNLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsRUFBRSxDQUFDO29CQUNyRiwwQkFBMEIsQ0FBQyxHQUFHLENBQzdCLEVBQUUsRUFDRixJQUFJLENBQUMsY0FBYyxDQUFDLGlDQUFpQyxDQUFDLEVBQUUsQ0FBQyxDQUN6RCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLDBCQUEwQixDQUFBO1FBQ3JFLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1RSxPQUFPLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVPLG9DQUFvQyxDQUFDLFFBQTRCO1FBQ3hFLElBQUksSUFBSSxDQUFDLHFDQUFxQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pELE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxzQkFBc0IsRUFBVyxDQUFBO1lBQzNFLE1BQU0sMEJBQTBCLEdBQy9CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2pDLHFDQUFxQyxDQUNyQyxJQUFJLEVBQUUsQ0FBQTtZQUNSLEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELElBQUksMEJBQTBCLENBQUMsRUFBRSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ2xELDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDdEUsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMscUNBQXFDLEdBQUcsNkJBQTZCLENBQUE7UUFDM0UsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVFLE9BQU8sSUFBSSxDQUFDLHFDQUFxQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRU8sMkNBQTJDLENBQ2xELFFBQTRCO1FBRTVCLE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVFLE1BQU0sOEJBQThCLEdBQ25DLElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFbkUsSUFDQyw4QkFBOEI7WUFDOUIsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLEtBQUssU0FBUztnQkFDcEQsOEJBQThCLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFDNUQsQ0FBQztZQUNGLE9BQU8sOEJBQThCLENBQUMsU0FBUyxDQUFBO1FBQ2hELENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sd0NBQXdDLENBQy9DLFFBQTRCO1FBRTVCLE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVFLE9BQU8sSUFBSSxDQUFDLHlDQUF5QyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRU8sT0FBTyxDQUFDLGFBQThDO1FBQzdELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sYUFBYSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxPQUFPLGFBQWEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7Q0FDRCxDQUFBO0FBaGFZLGtDQUFrQztJQTRCNUMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsV0FBQSxXQUFXLENBQUE7R0FoQ0Qsa0NBQWtDLENBZ2E5Qzs7QUFFRCxpQkFBaUIsQ0FDaEIsbUNBQW1DLEVBQ25DLGtDQUFrQyxvQ0FFbEMsQ0FBQSJ9