/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { DefaultURITransformer, transformAndReviveIncomingURIs, } from '../../../base/common/uriIpc.js';
import { CommontExtensionManagementService } from './abstractExtensionManagementService.js';
function transformIncomingURI(uri, transformer) {
    return uri ? URI.revive(transformer ? transformer.transformIncoming(uri) : uri) : undefined;
}
function transformOutgoingURI(uri, transformer) {
    return transformer ? transformer.transformOutgoingURI(uri) : uri;
}
function transformIncomingExtension(extension, transformer) {
    transformer = transformer ? transformer : DefaultURITransformer;
    const manifest = extension.manifest;
    const transformed = transformAndReviveIncomingURIs({ ...extension, ...{ manifest: undefined } }, transformer);
    return { ...transformed, ...{ manifest } };
}
function transformIncomingOptions(options, transformer) {
    return options?.profileLocation
        ? transformAndReviveIncomingURIs(options, transformer ?? DefaultURITransformer)
        : options;
}
function transformOutgoingExtension(extension, transformer) {
    return transformer
        ? cloneAndChange(extension, (value) => value instanceof URI ? transformer.transformOutgoingURI(value) : undefined)
        : extension;
}
export class ExtensionManagementChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
        this.onInstallExtension = Event.buffer(service.onInstallExtension, true);
        this.onDidInstallExtensions = Event.buffer(service.onDidInstallExtensions, true);
        this.onUninstallExtension = Event.buffer(service.onUninstallExtension, true);
        this.onDidUninstallExtension = Event.buffer(service.onDidUninstallExtension, true);
        this.onDidUpdateExtensionMetadata = Event.buffer(service.onDidUpdateExtensionMetadata, true);
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onInstallExtension': {
                return Event.map(this.onInstallExtension, (e) => {
                    return {
                        ...e,
                        profileLocation: e.profileLocation
                            ? transformOutgoingURI(e.profileLocation, uriTransformer)
                            : e.profileLocation,
                    };
                });
            }
            case 'onDidInstallExtensions': {
                return Event.map(this.onDidInstallExtensions, (results) => results.map((i) => ({
                    ...i,
                    local: i.local ? transformOutgoingExtension(i.local, uriTransformer) : i.local,
                    profileLocation: i.profileLocation
                        ? transformOutgoingURI(i.profileLocation, uriTransformer)
                        : i.profileLocation,
                })));
            }
            case 'onUninstallExtension': {
                return Event.map(this.onUninstallExtension, (e) => {
                    return {
                        ...e,
                        profileLocation: e.profileLocation
                            ? transformOutgoingURI(e.profileLocation, uriTransformer)
                            : e.profileLocation,
                    };
                });
            }
            case 'onDidUninstallExtension': {
                return Event.map(this.onDidUninstallExtension, (e) => {
                    return {
                        ...e,
                        profileLocation: e.profileLocation
                            ? transformOutgoingURI(e.profileLocation, uriTransformer)
                            : e.profileLocation,
                    };
                });
            }
            case 'onDidUpdateExtensionMetadata': {
                return Event.map(this.onDidUpdateExtensionMetadata, (e) => {
                    return {
                        local: transformOutgoingExtension(e.local, uriTransformer),
                        profileLocation: transformOutgoingURI(e.profileLocation, uriTransformer),
                    };
                });
            }
        }
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'zip': {
                const extension = transformIncomingExtension(args[0], uriTransformer);
                const uri = await this.service.zip(extension);
                return transformOutgoingURI(uri, uriTransformer);
            }
            case 'install': {
                return this.service.install(transformIncomingURI(args[0], uriTransformer), transformIncomingOptions(args[1], uriTransformer));
            }
            case 'installFromLocation': {
                return this.service.installFromLocation(transformIncomingURI(args[0], uriTransformer), transformIncomingURI(args[1], uriTransformer));
            }
            case 'installExtensionsFromProfile': {
                return this.service.installExtensionsFromProfile(args[0], transformIncomingURI(args[1], uriTransformer), transformIncomingURI(args[2], uriTransformer));
            }
            case 'getManifest': {
                return this.service.getManifest(transformIncomingURI(args[0], uriTransformer));
            }
            case 'getTargetPlatform': {
                return this.service.getTargetPlatform();
            }
            case 'installFromGallery': {
                return this.service.installFromGallery(args[0], transformIncomingOptions(args[1], uriTransformer));
            }
            case 'installGalleryExtensions': {
                const arg = args[0];
                return this.service.installGalleryExtensions(arg.map(({ extension, options }) => ({
                    extension,
                    options: transformIncomingOptions(options, uriTransformer) ?? {},
                })));
            }
            case 'uninstall': {
                return this.service.uninstall(transformIncomingExtension(args[0], uriTransformer), transformIncomingOptions(args[1], uriTransformer));
            }
            case 'uninstallExtensions': {
                const arg = args[0];
                return this.service.uninstallExtensions(arg.map(({ extension, options }) => ({
                    extension: transformIncomingExtension(extension, uriTransformer),
                    options: transformIncomingOptions(options, uriTransformer),
                })));
            }
            case 'getInstalled': {
                const extensions = await this.service.getInstalled(args[0], transformIncomingURI(args[1], uriTransformer), args[2]);
                return extensions.map((e) => transformOutgoingExtension(e, uriTransformer));
            }
            case 'toggleAppliationScope': {
                const extension = await this.service.toggleAppliationScope(transformIncomingExtension(args[0], uriTransformer), transformIncomingURI(args[1], uriTransformer));
                return transformOutgoingExtension(extension, uriTransformer);
            }
            case 'copyExtensions': {
                return this.service.copyExtensions(transformIncomingURI(args[0], uriTransformer), transformIncomingURI(args[1], uriTransformer));
            }
            case 'updateMetadata': {
                const e = await this.service.updateMetadata(transformIncomingExtension(args[0], uriTransformer), args[1], transformIncomingURI(args[2], uriTransformer));
                return transformOutgoingExtension(e, uriTransformer);
            }
            case 'resetPinnedStateForAllUserExtensions': {
                return this.service.resetPinnedStateForAllUserExtensions(args[0]);
            }
            case 'getExtensionsControlManifest': {
                return this.service.getExtensionsControlManifest();
            }
            case 'download': {
                return this.service.download(args[0], args[1], args[2]);
            }
            case 'cleanUp': {
                return this.service.cleanUp();
            }
        }
        throw new Error('Invalid call');
    }
}
export class ExtensionManagementChannelClient extends CommontExtensionManagementService {
    get onInstallExtension() {
        return this._onInstallExtension.event;
    }
    get onDidInstallExtensions() {
        return this._onDidInstallExtensions.event;
    }
    get onUninstallExtension() {
        return this._onUninstallExtension.event;
    }
    get onDidUninstallExtension() {
        return this._onDidUninstallExtension.event;
    }
    get onDidUpdateExtensionMetadata() {
        return this._onDidUpdateExtensionMetadata.event;
    }
    constructor(channel, productService, allowedExtensionsService) {
        super(productService, allowedExtensionsService);
        this.channel = channel;
        this._onInstallExtension = this._register(new Emitter());
        this._onDidInstallExtensions = this._register(new Emitter());
        this._onUninstallExtension = this._register(new Emitter());
        this._onDidUninstallExtension = this._register(new Emitter());
        this._onDidUpdateExtensionMetadata = this._register(new Emitter());
        this._register(this.channel.listen('onInstallExtension')((e) => this.onInstallExtensionEvent({
            ...e,
            source: this.isUriComponents(e.source) ? URI.revive(e.source) : e.source,
            profileLocation: URI.revive(e.profileLocation),
        })));
        this._register(this.channel.listen('onDidInstallExtensions')((results) => this.onDidInstallExtensionsEvent(results.map((e) => ({
            ...e,
            local: e.local ? transformIncomingExtension(e.local, null) : e.local,
            source: this.isUriComponents(e.source) ? URI.revive(e.source) : e.source,
            profileLocation: URI.revive(e.profileLocation),
        })))));
        this._register(this.channel.listen('onUninstallExtension')((e) => this.onUninstallExtensionEvent({ ...e, profileLocation: URI.revive(e.profileLocation) })));
        this._register(this.channel.listen('onDidUninstallExtension')((e) => this.onDidUninstallExtensionEvent({ ...e, profileLocation: URI.revive(e.profileLocation) })));
        this._register(this.channel.listen('onDidUpdateExtensionMetadata')((e) => this.onDidUpdateExtensionMetadataEvent({
            profileLocation: URI.revive(e.profileLocation),
            local: transformIncomingExtension(e.local, null),
        })));
    }
    onInstallExtensionEvent(event) {
        this._onInstallExtension.fire(event);
    }
    onDidInstallExtensionsEvent(results) {
        this._onDidInstallExtensions.fire(results);
    }
    onUninstallExtensionEvent(event) {
        this._onUninstallExtension.fire(event);
    }
    onDidUninstallExtensionEvent(event) {
        this._onDidUninstallExtension.fire(event);
    }
    onDidUpdateExtensionMetadataEvent(event) {
        this._onDidUpdateExtensionMetadata.fire(event);
    }
    isUriComponents(thing) {
        if (!thing) {
            return false;
        }
        return typeof thing.path === 'string' && typeof thing.scheme === 'string';
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = this.channel.call('getTargetPlatform');
        }
        return this._targetPlatformPromise;
    }
    zip(extension) {
        return Promise.resolve(this.channel.call('zip', [extension]).then((result) => URI.revive(result)));
    }
    install(vsix, options) {
        return Promise.resolve(this.channel.call('install', [vsix, options])).then((local) => transformIncomingExtension(local, null));
    }
    installFromLocation(location, profileLocation) {
        return Promise.resolve(this.channel.call('installFromLocation', [location, profileLocation])).then((local) => transformIncomingExtension(local, null));
    }
    async installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        const result = await this.channel.call('installExtensionsFromProfile', [
            extensions,
            fromProfileLocation,
            toProfileLocation,
        ]);
        return result.map((local) => transformIncomingExtension(local, null));
    }
    getManifest(vsix) {
        return Promise.resolve(this.channel.call('getManifest', [vsix]));
    }
    installFromGallery(extension, installOptions) {
        return Promise.resolve(this.channel.call('installFromGallery', [extension, installOptions])).then((local) => transformIncomingExtension(local, null));
    }
    async installGalleryExtensions(extensions) {
        const results = await this.channel.call('installGalleryExtensions', [
            extensions,
        ]);
        return results.map((e) => ({
            ...e,
            local: e.local ? transformIncomingExtension(e.local, null) : e.local,
            source: this.isUriComponents(e.source) ? URI.revive(e.source) : e.source,
            profileLocation: URI.revive(e.profileLocation),
        }));
    }
    uninstall(extension, options) {
        if (extension.isWorkspaceScoped) {
            throw new Error('Cannot uninstall a workspace extension');
        }
        return Promise.resolve(this.channel.call('uninstall', [extension, options]));
    }
    uninstallExtensions(extensions) {
        if (extensions.some((e) => e.extension.isWorkspaceScoped)) {
            throw new Error('Cannot uninstall a workspace extension');
        }
        return Promise.resolve(this.channel.call('uninstallExtensions', [extensions]));
    }
    getInstalled(type = null, extensionsProfileResource, productVersion) {
        return Promise.resolve(this.channel.call('getInstalled', [
            type,
            extensionsProfileResource,
            productVersion,
        ])).then((extensions) => extensions.map((extension) => transformIncomingExtension(extension, null)));
    }
    updateMetadata(local, metadata, extensionsProfileResource) {
        return Promise.resolve(this.channel.call('updateMetadata', [
            local,
            metadata,
            extensionsProfileResource,
        ])).then((extension) => transformIncomingExtension(extension, null));
    }
    resetPinnedStateForAllUserExtensions(pinned) {
        return this.channel.call('resetPinnedStateForAllUserExtensions', [pinned]);
    }
    toggleAppliationScope(local, fromProfileLocation) {
        return this.channel
            .call('toggleAppliationScope', [local, fromProfileLocation])
            .then((extension) => transformIncomingExtension(extension, null));
    }
    copyExtensions(fromProfileLocation, toProfileLocation) {
        return this.channel.call('copyExtensions', [fromProfileLocation, toProfileLocation]);
    }
    getExtensionsControlManifest() {
        return Promise.resolve(this.channel.call('getExtensionsControlManifest'));
    }
    async download(extension, operation, donotVerifySignature) {
        const result = await this.channel.call('download', [
            extension,
            operation,
            donotVerifySignature,
        ]);
        return URI.revive(result);
    }
    async cleanUp() {
        return this.channel.call('cleanUp');
    }
    registerParticipant() {
        throw new Error('Not Supported');
    }
}
export class ExtensionTipsChannel {
    constructor(service) {
        this.service = service;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    call(context, command, args) {
        switch (command) {
            case 'getConfigBasedTips':
                return this.service.getConfigBasedTips(URI.revive(args[0]));
            case 'getImportantExecutableBasedTips':
                return this.service.getImportantExecutableBasedTips();
            case 'getOtherExecutableBasedTips':
                return this.service.getOtherExecutableBasedTips();
        }
        throw new Error('Invalid call');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudElwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQ04scUJBQXFCLEVBRXJCLDhCQUE4QixHQUM5QixNQUFNLGdDQUFnQyxDQUFBO0FBNkJ2QyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU8zRixTQUFTLG9CQUFvQixDQUM1QixHQUE4QixFQUM5QixXQUFtQztJQUVuQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUM1RixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxHQUFRLEVBQUUsV0FBbUM7SUFDMUUsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBQ2pFLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUNsQyxTQUEwQixFQUMxQixXQUFtQztJQUVuQyxXQUFXLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMs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