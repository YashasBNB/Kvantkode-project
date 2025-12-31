/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb } from '../../../base/common/platform.js';
import { format2 } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { getTelemetryLevel, supportsTelemetry } from '../../telemetry/common/telemetryUtils.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import { getExtensionGalleryManifestResourceUri, } from '../../extensionManagement/common/extensionGalleryManifest.js';
import { Disposable } from '../../../base/common/lifecycle.js';
const WEB_EXTENSION_RESOURCE_END_POINT_SEGMENT = '/web-extension-resource/';
export const IExtensionResourceLoaderService = createDecorator('extensionResourceLoaderService');
export function migratePlatformSpecificExtensionGalleryResourceURL(resource, targetPlatform) {
    if (resource.query !== `target=${targetPlatform}`) {
        return undefined;
    }
    const paths = resource.path.split('/');
    if (!paths[3]) {
        return undefined;
    }
    paths[3] = `${paths[3]}+${targetPlatform}`;
    return resource.with({ query: null, path: paths.join('/') });
}
export class AbstractExtensionResourceLoaderService extends Disposable {
    constructor(_fileService, _storageService, _productService, _environmentService, _configurationService, _extensionGalleryManifestService, _logService) {
        super();
        this._fileService = _fileService;
        this._storageService = _storageService;
        this._productService = _productService;
        this._environmentService = _environmentService;
        this._configurationService = _configurationService;
        this._extensionGalleryManifestService = _extensionGalleryManifestService;
        this._logService = _logService;
        this._initPromise = this._init();
    }
    async _init() {
        try {
            const manifest = await this._extensionGalleryManifestService.getExtensionGalleryManifest();
            this.resolve(manifest);
            this._register(this._extensionGalleryManifestService.onDidChangeExtensionGalleryManifest(() => this.resolve(manifest)));
        }
        catch (error) {
            this._logService.error(error);
        }
    }
    resolve(manifest) {
        this._extensionGalleryResourceUrlTemplate = manifest
            ? getExtensionGalleryManifestResourceUri(manifest, "ExtensionResourceUriTemplate" /* ExtensionGalleryResourceType.ExtensionResourceUri */)
            : undefined;
        this._extensionGalleryAuthority = this._extensionGalleryResourceUrlTemplate
            ? this._getExtensionGalleryAuthority(URI.parse(this._extensionGalleryResourceUrlTemplate))
            : undefined;
    }
    async supportsExtensionGalleryResources() {
        await this._initPromise;
        return this._extensionGalleryResourceUrlTemplate !== undefined;
    }
    async getExtensionGalleryResourceURL({ publisher, name, version, targetPlatform, }, path) {
        await this._initPromise;
        if (this._extensionGalleryResourceUrlTemplate) {
            const uri = URI.parse(format2(this._extensionGalleryResourceUrlTemplate, {
                publisher,
                name,
                version: targetPlatform !== undefined &&
                    targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ &&
                    targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */ &&
                    targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */
                    ? `${version}+${targetPlatform}`
                    : version,
                path: 'extension',
            }));
            return this._isWebExtensionResourceEndPoint(uri)
                ? uri.with({ scheme: RemoteAuthorities.getPreferredWebSchema() })
                : uri;
        }
        return undefined;
    }
    async isExtensionGalleryResource(uri) {
        await this._initPromise;
        return (!!this._extensionGalleryAuthority &&
            this._extensionGalleryAuthority === this._getExtensionGalleryAuthority(uri));
    }
    async getExtensionGalleryRequestHeaders() {
        const headers = {
            'X-Client-Name': `${this._productService.applicationName}${isWeb ? '-web' : ''}`,
            'X-Client-Version': this._productService.version,
        };
        if (supportsTelemetry(this._productService, this._environmentService) &&
            getTelemetryLevel(this._configurationService) === 3 /* TelemetryLevel.USAGE */) {
            headers['X-Machine-Id'] = await this._getServiceMachineId();
        }
        if (this._productService.commit) {
            headers['X-Client-Commit'] = this._productService.commit;
        }
        return headers;
    }
    _getServiceMachineId() {
        if (!this._serviceMachineIdPromise) {
            this._serviceMachineIdPromise = getServiceMachineId(this._environmentService, this._fileService, this._storageService);
        }
        return this._serviceMachineIdPromise;
    }
    _getExtensionGalleryAuthority(uri) {
        if (this._isWebExtensionResourceEndPoint(uri)) {
            return uri.authority;
        }
        const index = uri.authority.indexOf('.');
        return index !== -1 ? uri.authority.substring(index + 1) : undefined;
    }
    _isWebExtensionResourceEndPoint(uri) {
        const uriPath = uri.path, serverRootPath = RemoteAuthorities.getServerRootPath();
        // test if the path starts with the server root path followed by the web extension resource end point segment
        return (uriPath.startsWith(serverRootPath) &&
            uriPath.startsWith(WEB_EXTENSION_RESOURCE_END_POINT_SEGMENT, serverRootPath.length));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25SZXNvdXJjZUxvYWRlci9jb21tb24vZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFJakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRW5FLE9BQU8sRUFFTixzQ0FBc0MsR0FHdEMsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsTUFBTSx3Q0FBd0MsR0FBRywwQkFBMEIsQ0FBQTtBQUUzRSxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxlQUFlLENBQzdELGdDQUFnQyxDQUNoQyxDQUFBO0FBcUNELE1BQU0sVUFBVSxrREFBa0QsQ0FDakUsUUFBYSxFQUNiLGNBQThCO0lBRTlCLElBQUksUUFBUSxDQUFDLEtBQUssS0FBSyxVQUFVLGNBQWMsRUFBRSxFQUFFLENBQUM7UUFDbkQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJ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