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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvblJlc291cmNlTG9hZGVyL2NvbW1vbi9leHRlbnNpb25SZXNvdXJjZUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUlqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbkUsT0FBTyxFQUVOLHNDQUFzQyxHQUd0QyxNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxNQUFNLHdDQUF3QyxHQUFHLDBCQUEwQixDQUFBO0FBRTNFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FDN0QsZ0NBQWdDLENBQ2hDLENBQUE7QUFxQ0QsTUFBTSxVQUFVLGtEQUFrRCxDQUNqRSxRQUFhLEVBQ2IsY0FBOEI7SUFFOUIsSUFBSSxRQUFRLENBQUMsS0FBSyxLQUFLLFVBQVUsY0FBYyxFQUFFLEVBQUUsQ0FBQztRQUNuRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsTUFB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