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
var WorkspaceExtensionsManagementService_1;
import { Emitter, Event, EventMultiplexer } from '../../../../base/common/event.js';
import './media/extensionManagement.css';
import { IExtensionGalleryService, ExtensionManagementError, EXTENSION_INSTALL_SOURCE_CONTEXT, IAllowedExtensionsService, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, } from './extensionManagement.js';
import { isLanguagePackExtension, getWorkspaceSupportTypeMessage, } from '../../../../platform/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { areSameExtensions, computeTargetPlatform, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { localize } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { coalesce, distinct, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { Promises } from '../../../../base/common/async.js';
import { IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationError, getErrorMessage } from '../../../../base/common/errors.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionsScannerService, } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { verifiedPublisherIcon } from './extensionsIcons.js';
import { Codicon } from '../../../../base/common/codicons.js';
const TrustedPublishersStorageKey = 'extensions.trustedPublishers';
function isGalleryExtension(extension) {
    return extension.type === 'gallery';
}
let ExtensionManagementService = class ExtensionManagementService extends Disposable {
    constructor(extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.configurationService = configurationService;
        this.productService = productService;
        this.downloadService = downloadService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.dialogService = dialogService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.fileService = fileService;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.extensionsScannerService = extensionsScannerService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this._onInstallExtension = this._register(new Emitter());
        this._onDidInstallExtensions = this._register(new Emitter());
        this._onUninstallExtension = this._register(new Emitter());
        this._onDidUninstallExtension = this._register(new Emitter());
        this._onDidProfileAwareInstallExtensions = this._register(new Emitter());
        this._onDidProfileAwareUninstallExtension = this._register(new Emitter());
        this.servers = [];
        this.defaultTrustedPublishers = productService.trustedExtensionPublishers ?? [];
        this.workspaceExtensionManagementService = this._register(this.instantiationService.createInstance(WorkspaceExtensionsManagementService));
        this.onDidEnableExtensions =
            this.workspaceExtensionManagementService.onDidChangeInvalidExtensions;
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.webExtensionManagementServer);
        }
        const onInstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onInstallExtensionEventMultiplexer.add(this._onInstallExtension.event));
        this.onInstallExtension = onInstallExtensionEventMultiplexer.event;
        const onDidInstallExtensionsEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidInstallExtensionsEventMultiplexer.add(this._onDidInstallExtensions.event));
        this.onDidInstallExtensions = onDidInstallExtensionsEventMultiplexer.event;
        const onDidProfileAwareInstallExtensionsEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidProfileAwareInstallExtensionsEventMultiplexer.add(this._onDidProfileAwareInstallExtensions.event));
        this.onProfileAwareDidInstallExtensions =
            onDidProfileAwareInstallExtensionsEventMultiplexer.event;
        const onUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onUninstallExtensionEventMultiplexer.add(this._onUninstallExtension.event));
        this.onUninstallExtension = onUninstallExtensionEventMultiplexer.event;
        const onDidUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidUninstallExtensionEventMultiplexer.add(this._onDidUninstallExtension.event));
        this.onDidUninstallExtension = onDidUninstallExtensionEventMultiplexer.event;
        const onDidProfileAwareUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidProfileAwareUninstallExtensionEventMultiplexer.add(this._onDidProfileAwareUninstallExtension.event));
        this.onProfileAwareDidUninstallExtension =
            onDidProfileAwareUninstallExtensionEventMultiplexer.event;
        const onDidUpdateExtensionMetadaEventMultiplexer = this._register(new EventMultiplexer());
        this.onDidUpdateExtensionMetadata = onDidUpdateExtensionMetadaEventMultiplexer.event;
        const onDidProfileAwareUpdateExtensionMetadaEventMultiplexer = this._register(new EventMultiplexer());
        this.onProfileAwareDidUpdateExtensionMetadata =
            onDidProfileAwareUpdateExtensionMetadaEventMultiplexer.event;
        const onDidChangeProfileEventMultiplexer = this._register(new EventMultiplexer());
        this.onDidChangeProfile = onDidChangeProfileEventMultiplexer.event;
        for (const server of this.servers) {
            this._register(onInstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onInstallExtension, (e) => ({
                ...e,
                server,
            }))));
            this._register(onDidInstallExtensionsEventMultiplexer.add(server.extensionManagementService.onDidInstallExtensions));
            this._register(onDidProfileAwareInstallExtensionsEventMultiplexer.add(server.extensionManagementService.onProfileAwareDidInstallExtensions));
            this._register(onUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onUninstallExtension, (e) => ({
                ...e,
                server,
            }))));
            this._register(onDidUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onDidUninstallExtension, (e) => ({
                ...e,
                server,
            }))));
            this._register(onDidProfileAwareUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onProfileAwareDidUninstallExtension, (e) => ({
                ...e,
                server,
            }))));
            this._register(onDidUpdateExtensionMetadaEventMultiplexer.add(server.extensionManagementService.onDidUpdateExtensionMetadata));
            this._register(onDidProfileAwareUpdateExtensionMetadaEventMultiplexer.add(server.extensionManagementService.onProfileAwareDidUpdateExtensionMetadata));
            this._register(onDidChangeProfileEventMultiplexer.add(Event.map(server.extensionManagementService.onDidChangeProfile, (e) => ({
                ...e,
                server,
            }))));
        }
        this._register(this.onProfileAwareDidInstallExtensions((results) => {
            const untrustedPublishers = new Map();
            for (const result of results) {
                if (result.local &&
                    result.source &&
                    !URI.isUri(result.source) &&
                    !this.isPublisherTrusted(result.source)) {
                    untrustedPublishers.set(result.source.publisher, {
                        publisher: result.source.publisher,
                        publisherDisplayName: result.source.publisherDisplayName,
                    });
                }
            }
            if (untrustedPublishers.size) {
                this.trustPublishers(...untrustedPublishers.values());
            }
        }));
    }
    async getInstalled(type, profileLocation, productVersion) {
        const result = [];
        await Promise.all(this.servers.map(async (server) => {
            const installed = await server.extensionManagementService.getInstalled(type, profileLocation, productVersion);
            if (server === this.getWorkspaceExtensionsServer()) {
                const workspaceExtensions = await this.getInstalledWorkspaceExtensions(true);
                installed.push(...workspaceExtensions);
            }
            result.push(...installed);
        }));
        return result;
    }
    uninstall(extension, options) {
        return this.uninstallExtensions([{ extension, options }]);
    }
    async uninstallExtensions(extensions) {
        const workspaceExtensions = [];
        const groupedExtensions = new Map();
        const addExtensionToServer = (server, extension, options) => {
            let extensions = groupedExtensions.get(server);
            if (!extensions) {
                groupedExtensions.set(server, (extensions = []));
            }
            extensions.push({ extension, options });
        };
        for (const { extension, options } of extensions) {
            if (extension.isWorkspaceScoped) {
                workspaceExtensions.push(extension);
                continue;
            }
            const server = this.getServer(extension);
            if (!server) {
                throw new Error(`Invalid location ${extension.location.toString()}`);
            }
            addExtensionToServer(server, extension, options);
            if (this.servers.length > 1 && isLanguagePackExtension(extension.manifest)) {
                const otherServers = this.servers.filter((s) => s !== server);
                for (const otherServer of otherServers) {
                    const installed = await otherServer.extensionManagementService.getInstalled();
                    const extensionInOtherServer = installed.find((i) => !i.isBuiltin && areSameExtensions(i.identifier, extension.identifier));
                    if (extensionInOtherServer) {
                        addExtensionToServer(otherServer, extensionInOtherServer, options);
                    }
                }
            }
        }
        const promises = [];
        for (const workspaceExtension of workspaceExtensions) {
            promises.push(this.uninstallExtensionFromWorkspace(workspaceExtension));
        }
        for (const [server, extensions] of groupedExtensions.entries()) {
            promises.push(this.uninstallInServer(server, extensions));
        }
        const result = await Promise.allSettled(promises);
        const errors = result.filter((r) => r.status === 'rejected').map((r) => r.reason);
        if (errors.length) {
            throw new Error(errors.map((e) => e.message).join('\n'));
        }
    }
    async uninstallInServer(server, extensions) {
        if (server === this.extensionManagementServerService.localExtensionManagementServer &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            for (const { extension } of extensions) {
                const installedExtensions = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getInstalled(1 /* ExtensionType.User */);
                const dependentNonUIExtensions = installedExtensions.filter((i) => !this.extensionManifestPropertiesService.prefersExecuteOnUI(i.manifest) &&
                    i.manifest.extensionDependencies &&
                    i.manifest.extensionDependencies.some((id) => areSameExtensions({ id }, extension.identifier)));
                if (dependentNonUIExtensions.length) {
                    throw new Error(this.getDependentsErrorMessage(extension, dependentNonUIExtensions));
                }
            }
        }
        return server.extensionManagementService.uninstallExtensions(extensions);
    }
    getDependentsErrorMessage(extension, dependents) {
        if (dependents.length === 1) {
            return localize('singleDependentError', "Cannot uninstall extension '{0}'. Extension '{1}' depends on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
        }
        if (dependents.length === 2) {
            return localize('twoDependentsError', "Cannot uninstall extension '{0}'. Extensions '{1}' and '{2}' depend on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        return localize('multipleDependentsError', "Cannot uninstall extension '{0}'. Extensions '{1}', '{2}' and others depend on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
    }
    updateMetadata(extension, metadata) {
        const server = this.getServer(extension);
        if (server) {
            const profile = extension.isApplicationScoped
                ? this.userDataProfilesService.defaultProfile
                : this.userDataProfileService.currentProfile;
            return server.extensionManagementService.updateMetadata(extension, metadata, profile.extensionsResource);
        }
        return Promise.reject(`Invalid location ${extension.location.toString()}`);
    }
    async resetPinnedStateForAllUserExtensions(pinned) {
        await Promise.allSettled(this.servers.map((server) => server.extensionManagementService.resetPinnedStateForAllUserExtensions(pinned)));
    }
    zip(extension) {
        const server = this.getServer(extension);
        if (server) {
            return server.extensionManagementService.zip(extension);
        }
        return Promise.reject(`Invalid location ${extension.location.toString()}`);
    }
    download(extension, operation, donotVerifySignature) {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.download(extension, operation, donotVerifySignature);
        }
        throw new Error('Cannot download extension');
    }
    async install(vsix, options) {
        const manifest = await this.getManifest(vsix);
        return this.installVSIX(vsix, manifest, options);
    }
    async installVSIX(vsix, manifest, options) {
        const serversToInstall = this.getServersToInstall(manifest);
        if (serversToInstall?.length) {
            await this.checkForWorkspaceTrust(manifest, false);
            const [local] = await Promises.settled(serversToInstall.map((server) => this.installVSIXInServer(vsix, server, options)));
            return local;
        }
        return Promise.reject('No Servers to Install');
    }
    getServersToInstall(manifest) {
        if (this.extensionManagementServerService.localExtensionManagementServer &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            if (isLanguagePackExtension(manifest)) {
                // Install on both servers
                return [
                    this.extensionManagementServerService.localExtensionManagementServer,
                    this.extensionManagementServerService.remoteExtensionManagementServer,
                ];
            }
            if (this.extensionManifestPropertiesService.prefersExecuteOnUI(manifest)) {
                // Install only on local server
                return [this.extensionManagementServerService.localExtensionManagementServer];
            }
            // Install only on remote server
            return [this.extensionManagementServerService.remoteExtensionManagementServer];
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return [this.extensionManagementServerService.localExtensionManagementServer];
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return [this.extensionManagementServerService.remoteExtensionManagementServer];
        }
        return undefined;
    }
    async installFromLocation(location) {
        if (location.scheme === Schemas.file) {
            if (this.extensionManagementServerService.localExtensionManagementServer) {
                return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
            }
            throw new Error('Local extension management server is not found');
        }
        if (location.scheme === Schemas.vscodeRemote) {
            if (this.extensionManagementServerService.remoteExtensionManagementServer) {
                return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
            }
            throw new Error('Remote extension management server is not found');
        }
        if (!this.extensionManagementServerService.webExtensionManagementServer) {
            throw new Error('Web extension management server is not found');
        }
        return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
    }
    installVSIXInServer(vsix, server, options) {
        return server.extensionManagementService.install(vsix, options);
    }
    getManifest(vsix) {
        if (vsix.scheme === Schemas.file &&
            this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        if (vsix.scheme === Schemas.file &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        if (vsix.scheme === Schemas.vscodeRemote &&
            this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        return Promise.reject('No Servers');
    }
    async canInstall(extension) {
        if (isGalleryExtension(extension)) {
            return this.canInstallGalleryExtension(extension);
        }
        return this.canInstallResourceExtension(extension);
    }
    async canInstallGalleryExtension(gallery) {
        if (this.extensionManagementServerService.localExtensionManagementServer &&
            (await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(gallery)) === true) {
            return true;
        }
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            return new MarkdownString().appendText(localize('manifest is not found', 'Manifest is not found'));
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer &&
            (await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.canInstall(gallery)) === true &&
            this.extensionManifestPropertiesService.canExecuteOnWorkspace(manifest)) {
            return true;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer &&
            (await this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.canInstall(gallery)) === true &&
            this.extensionManifestPropertiesService.canExecuteOnWeb(manifest)) {
            return true;
        }
        return new MarkdownString().appendText(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", gallery.displayName || gallery.name));
    }
    async canInstallResourceExtension(extension) {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return true;
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer &&
            this.extensionManifestPropertiesService.canExecuteOnWorkspace(extension.manifest)) {
            return true;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer &&
            this.extensionManifestPropertiesService.canExecuteOnWeb(extension.manifest)) {
            return true;
        }
        return new MarkdownString().appendText(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.manifest.displayName ?? extension.identifier.id));
    }
    async updateFromGallery(gallery, extension, installOptions) {
        const server = this.getServer(extension);
        if (!server) {
            return Promise.reject(`Invalid location ${extension.location.toString()}`);
        }
        const servers = [];
        // Update Language pack on local and remote servers
        if (isLanguagePackExtension(extension.manifest)) {
            servers.push(...this.servers.filter((server) => server !== this.extensionManagementServerService.webExtensionManagementServer));
        }
        else {
            servers.push(server);
        }
        installOptions = {
            ...(installOptions || {}),
            isApplicationScoped: extension.isApplicationScoped,
        };
        return Promises.settled(servers.map((server) => server.extensionManagementService.installFromGallery(gallery, installOptions))).then(([local]) => local);
    }
    async installGalleryExtensions(extensions) {
        const results = new Map();
        const extensionsByServer = new Map();
        const manifests = await Promise.all(extensions.map(async ({ extension }) => {
            const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error(localize('Manifest is not found', 'Installing Extension {0} failed: Manifest is not found.', extension.displayName || extension.name));
            }
            return manifest;
        }));
        if (extensions.some((e) => e.options?.context?.[EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT] !== true)) {
            await this.checkForTrustedPublishers(extensions.map((e, index) => ({
                extension: e.extension,
                manifest: manifests[index],
                checkForPackAndDependencies: !e.options?.donotIncludePackAndDependencies,
            })));
        }
        await Promise.all(extensions.map(async ({ extension, options }) => {
            try {
                const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
                if (!manifest) {
                    throw new Error(localize('Manifest is not found', 'Installing Extension {0} failed: Manifest is not found.', extension.displayName || extension.name));
                }
                if (options?.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT] !==
                    "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */) {
                    await this.checkForWorkspaceTrust(manifest, false);
                    if (!options?.donotIncludePackAndDependencies) {
                        await this.checkInstallingExtensionOnWeb(extension, manifest);
                    }
                }
                const servers = await this.getExtensionManagementServersToInstall(extension, manifest);
                if (!options.isMachineScoped && this.isExtensionsSyncEnabled()) {
                    if (this.extensionManagementServerService.localExtensionManagementServer &&
                        !servers.includes(this.extensionManagementServerService.localExtensionManagementServer) &&
                        (await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(extension)) === true) {
                        servers.push(this.extensionManagementServerService.localExtensionManagementServer);
                    }
                }
                for (const server of servers) {
                    let exensions = extensionsByServer.get(server);
                    if (!exensions) {
                        extensionsByServer.set(server, (exensions = []));
                    }
                    exensions.push({ extension, options });
                }
            }
            catch (error) {
                results.set(extension.identifier.id.toLowerCase(), {
                    identifier: extension.identifier,
                    source: extension,
                    error,
                    operation: 2 /* InstallOperation.Install */,
                    profileLocation: options.profileLocation ??
                        this.userDataProfileService.currentProfile.extensionsResource,
                });
            }
        }));
        await Promise.all([...extensionsByServer.entries()].map(async ([server, extensions]) => {
            const serverResults = await server.extensionManagementService.installGalleryExtensions(extensions);
            for (const result of serverResults) {
                results.set(result.identifier.id.toLowerCase(), result);
            }
        }));
        return [...results.values()];
    }
    async installFromGallery(gallery, installOptions, servers) {
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            throw new Error(localize('Manifest is not found', 'Installing Extension {0} failed: Manifest is not found.', gallery.displayName || gallery.name));
        }
        if (installOptions?.context?.[EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT] !== true) {
            await this.checkForTrustedPublishers([
                {
                    extension: gallery,
                    manifest,
                    checkForPackAndDependencies: !installOptions?.donotIncludePackAndDependencies,
                },
            ]);
        }
        if (installOptions?.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT] !==
            "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */) {
            await this.checkForWorkspaceTrust(manifest, false);
            if (!installOptions?.donotIncludePackAndDependencies) {
                await this.checkInstallingExtensionOnWeb(gallery, manifest);
            }
        }
        servers = servers?.length
            ? this.validServers(gallery, manifest, servers)
            : await this.getExtensionManagementServersToInstall(gallery, manifest);
        if (!installOptions || isUndefined(installOptions.isMachineScoped)) {
            const isMachineScoped = await this.hasToFlagExtensionsMachineScoped([gallery]);
            installOptions = { ...(installOptions || {}), isMachineScoped };
        }
        if (!installOptions.isMachineScoped && this.isExtensionsSyncEnabled()) {
            if (this.extensionManagementServerService.localExtensionManagementServer &&
                !servers.includes(this.extensionManagementServerService.localExtensionManagementServer) &&
                (await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(gallery)) === true) {
                servers.push(this.extensionManagementServerService.localExtensionManagementServer);
            }
        }
        return Promises.settled(servers.map((server) => server.extensionManagementService.installFromGallery(gallery, installOptions))).then(([local]) => local);
    }
    async getExtensions(locations) {
        const scannedExtensions = await this.extensionsScannerService.scanMultipleExtensions(locations, 1 /* ExtensionType.User */, { includeInvalid: true });
        const result = [];
        await Promise.all(scannedExtensions.map(async (scannedExtension) => {
            const workspaceExtension = await this.workspaceExtensionManagementService.toLocalWorkspaceExtension(scannedExtension);
            if (workspaceExtension) {
                result.push({
                    type: 'resource',
                    identifier: workspaceExtension.identifier,
                    location: workspaceExtension.location,
                    manifest: workspaceExtension.manifest,
                    changelogUri: workspaceExtension.changelogUrl,
                    readmeUri: workspaceExtension.readmeUrl,
                });
            }
        }));
        return result;
    }
    getInstalledWorkspaceExtensionLocations() {
        return this.workspaceExtensionManagementService.getInstalledWorkspaceExtensionsLocations();
    }
    async getInstalledWorkspaceExtensions(includeInvalid) {
        return this.workspaceExtensionManagementService.getInstalled(includeInvalid);
    }
    async installResourceExtension(extension, installOptions) {
        if (!this.canInstallResourceExtension(extension)) {
            throw new Error('This extension cannot be installed in the current workspace.');
        }
        if (!installOptions.isWorkspaceScoped) {
            return this.installFromLocation(extension.location);
        }
        this.logService.info(`Installing the extension ${extension.identifier.id} from ${extension.location.toString()} in workspace`);
        const server = this.getWorkspaceExtensionsServer();
        this._onInstallExtension.fire({
            identifier: extension.identifier,
            source: extension.location,
            server,
            applicationScoped: false,
            profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
            workspaceScoped: true,
        });
        try {
            await this.checkForWorkspaceTrust(extension.manifest, true);
            const workspaceExtension = await this.workspaceExtensionManagementService.install(extension);
            this.logService.info(`Successfully installed the extension ${workspaceExtension.identifier.id} from ${extension.location.toString()} in the workspace`);
            this._onDidInstallExtensions.fire([
                {
                    identifier: workspaceExtension.identifier,
                    source: extension.location,
                    operation: 2 /* InstallOperation.Install */,
                    applicationScoped: false,
                    profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                    local: workspaceExtension,
                    workspaceScoped: true,
                },
            ]);
            return workspaceExtension;
        }
        catch (error) {
            this.logService.error(`Failed to install the extension ${extension.identifier.id} from ${extension.location.toString()} in the workspace`, getErrorMessage(error));
            this._onDidInstallExtensions.fire([
                {
                    identifier: extension.identifier,
                    source: extension.location,
                    operation: 2 /* InstallOperation.Install */,
                    applicationScoped: false,
                    profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                    error,
                    workspaceScoped: true,
                },
            ]);
            throw error;
        }
    }
    async getInstallableServers(gallery) {
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            return Promise.reject(localize('Manifest is not found', 'Installing Extension {0} failed: Manifest is not found.', gallery.displayName || gallery.name));
        }
        return this.getInstallableExtensionManagementServers(manifest);
    }
    async uninstallExtensionFromWorkspace(extension) {
        if (!extension.isWorkspaceScoped) {
            throw new Error('The extension is not a workspace extension');
        }
        this.logService.info(`Uninstalling the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`);
        const server = this.getWorkspaceExtensionsServer();
        this._onUninstallExtension.fire({
            identifier: extension.identifier,
            server,
            applicationScoped: false,
            workspaceScoped: true,
            profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
        });
        try {
            await this.workspaceExtensionManagementService.uninstall(extension);
            this.logService.info(`Successfully uninstalled the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`);
            this.telemetryService.publicLog2('workspaceextension:uninstall');
            this._onDidUninstallExtension.fire({
                identifier: extension.identifier,
                server,
                applicationScoped: false,
                workspaceScoped: true,
                profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
            });
        }
        catch (error) {
            this.logService.error(`Failed to uninstall the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`, getErrorMessage(error));
            this._onDidUninstallExtension.fire({
                identifier: extension.identifier,
                server,
                error,
                applicationScoped: false,
                workspaceScoped: true,
                profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
            });
            throw error;
        }
    }
    validServers(gallery, manifest, servers) {
        const installableServers = this.getInstallableExtensionManagementServers(manifest);
        for (const server of servers) {
            if (!installableServers.includes(server)) {
                const error = new Error(localize('cannot be installed in server', "Cannot install the '{0}' extension because it is not available in the '{1}' setup.", gallery.displayName || gallery.name, server.label));
                error.name = "Unsupported" /* ExtensionManagementErrorCode.Unsupported */;
                throw error;
            }
        }
        return servers;
    }
    async getExtensionManagementServersToInstall(gallery, manifest) {
        const servers = [];
        // Language packs should be installed on both local and remote servers
        if (isLanguagePackExtension(manifest)) {
            servers.push(...this.servers.filter((server) => server !== this.extensionManagementServerService.webExtensionManagementServer));
        }
        else {
            const [server] = this.getInstallableExtensionManagementServers(manifest);
            if (server) {
                servers.push(server);
            }
        }
        if (!servers.length) {
            const error = new Error(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", gallery.displayName || gallery.name));
            error.name = "Unsupported" /* ExtensionManagementErrorCode.Unsupported */;
            throw error;
        }
        return servers;
    }
    getInstallableExtensionManagementServers(manifest) {
        // Only local server
        if (this.servers.length === 1 &&
            this.extensionManagementServerService.localExtensionManagementServer) {
            return [this.extensionManagementServerService.localExtensionManagementServer];
        }
        const servers = [];
        const extensionKind = this.extensionManifestPropertiesService.getExtensionKind(manifest);
        for (const kind of extensionKind) {
            if (kind === 'ui' && this.extensionManagementServerService.localExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.localExtensionManagementServer);
            }
            if (kind === 'workspace' &&
                this.extensionManagementServerService.remoteExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
            }
            if (kind === 'web' && this.extensionManagementServerService.webExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.webExtensionManagementServer);
            }
        }
        // Local server can accept any extension.
        if (this.extensionManagementServerService.localExtensionManagementServer &&
            !servers.includes(this.extensionManagementServerService.localExtensionManagementServer)) {
            servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        return servers;
    }
    isExtensionsSyncEnabled() {
        return (this.userDataSyncEnablementService.isEnabled() &&
            this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */));
    }
    async hasToFlagExtensionsMachineScoped(extensions) {
        if (this.isExtensionsSyncEnabled()) {
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message: extensions.length === 1
                    ? localize('install extension', 'Install Extension')
                    : localize('install extensions', 'Install Extensions'),
                detail: extensions.length === 1
                    ? localize('install single extension', "Would you like to install and synchronize '{0}' extension across your devices?", extensions[0].displayName)
                    : localize('install multiple extensions', 'Would you like to install and synchronize extensions across your devices?'),
                buttons: [
                    {
                        label: localize({ key: 'install', comment: ['&& denotes a mnemonic'] }, '&&Install'),
                        run: () => false,
                    },
                    {
                        label: localize({ key: 'install and do no sync', comment: ['&& denotes a mnemonic'] }, 'Install (Do &&not sync)'),
                        run: () => true,
                    },
                ],
                cancelButton: {
                    run: () => {
                        throw new CancellationError();
                    },
                },
            });
            return result;
        }
        return false;
    }
    getExtensionsControlManifest() {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        return this.extensionGalleryService.getExtensionsControlManifest();
    }
    getServer(extension) {
        if (extension.isWorkspaceScoped) {
            return this.getWorkspaceExtensionsServer();
        }
        return this.extensionManagementServerService.getExtensionManagementServer(extension);
    }
    getWorkspaceExtensionsServer() {
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer;
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer;
        }
        throw new Error('No extension server found');
    }
    async requestPublisherTrust(extensions) {
        const manifests = await Promise.all(extensions.map(async ({ extension }) => {
            const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error(localize('Manifest is not found', 'Installing Extension {0} failed: Manifest is not found.', extension.displayName || extension.name));
            }
            return manifest;
        }));
        await this.checkForTrustedPublishers(extensions.map((e, index) => ({
            extension: e.extension,
            manifest: manifests[index],
            checkForPackAndDependencies: !e.options?.donotIncludePackAndDependencies,
        })));
    }
    async checkForTrustedPublishers(extensions) {
        const untrustedExtensions = [];
        const untrustedExtensionManifests = [];
        const manifestsToGetOtherUntrustedPublishers = [];
        for (const { extension, manifest, checkForPackAndDependencies } of extensions) {
            if (!extension.private && !this.isPublisherTrusted(extension)) {
                untrustedExtensions.push(extension);
                untrustedExtensionManifests.push(manifest);
                if (checkForPackAndDependencies) {
                    manifestsToGetOtherUntrustedPublishers.push(manifest);
                }
            }
        }
        if (!untrustedExtensions.length) {
            return;
        }
        const otherUntrustedPublishers = manifestsToGetOtherUntrustedPublishers.length
            ? await this.getOtherUntrustedPublishers(manifestsToGetOtherUntrustedPublishers)
            : [];
        const allPublishers = [
            ...distinct(untrustedExtensions, (e) => e.publisher),
            ...otherUntrustedPublishers,
        ];
        const unverfiiedPublishers = allPublishers.filter((p) => !p.publisherDomain?.verified);
        const verifiedPublishers = allPublishers.filter((p) => p.publisherDomain?.verified);
        const installButton = {
            label: allPublishers.length > 1
                ? localize({ key: 'trust publishers and install', comment: ['&& denotes a mnemonic'] }, 'Trust Publishers & &&Install')
                : localize({ key: 'trust and install', comment: ['&& denotes a mnemonic'] }, 'Trust Publisher & &&Install'),
            run: () => {
                this.telemetryService.publicLog2('extensions:trustPublisher', {
                    action: 'trust',
                    extensionId: untrustedExtensions.map((e) => e.identifier.id).join(','),
                });
                this.trustPublishers(...allPublishers.map((p) => ({
                    publisher: p.publisher,
                    publisherDisplayName: p.publisherDisplayName,
                })));
            },
        };
        const learnMoreButton = {
            label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, '&&Learn More'),
            run: () => {
                this.telemetryService.publicLog2('extensions:trustPublisher', {
                    action: 'learn',
                    extensionId: untrustedExtensions.map((e) => e.identifier.id).join(','),
                });
                this.instantiationService.invokeFunction((accessor) => accessor
                    .get(ICommandService)
                    .executeCommand('vscode.open', URI.parse('https://aka.ms/vscode-extension-security')));
                throw new CancellationError();
            },
        };
        const getPublisherLink = ({ publisherDisplayName, publisherLink, }) => {
            return publisherLink ? `[${publisherDisplayName}](${publisherLink})` : publisherDisplayName;
        };
        const unverifiedLink = 'https://aka.ms/vscode-verify-publisher';
        const title = allPublishers.length === 1
            ? localize('checkTrustedPublisherTitle', 'Do you trust the publisher "{0}"?', allPublishers[0].publisherDisplayName)
            : allPublishers.length === 2
                ? localize('checkTwoTrustedPublishersTitle', 'Do you trust publishers "{0}" and "{1}"?', allPublishers[0].publisherDisplayName, allPublishers[1].publisherDisplayName)
                : localize('checkAllTrustedPublishersTitle', 'Do you trust the publisher "{0}" and {1} others?', allPublishers[0].publisherDisplayName, allPublishers.length - 1);
        const customMessage = new MarkdownString('', { supportThemeIcons: true, isTrusted: true });
        if (untrustedExtensions.length === 1) {
            const extension = untrustedExtensions[0];
            const manifest = untrustedExtensionManifests[0];
            if (otherUntrustedPublishers.length) {
                customMessage.appendMarkdown(localize('extension published by message', 'The extension {0} is published by {1}.', `[${extension.displayName}](${extension.detailsLink})`, getPublisherLink(extension)));
                customMessage.appendMarkdown('&nbsp;');
                const commandUri = URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([extension.identifier.id, manifest.extensionPack?.length ? 'extensionPack' : 'dependencies']))}`).toString();
                if (otherUntrustedPublishers.length === 1) {
                    customMessage.appendMarkdown(localize('singleUntrustedPublisher', 'Installing this extension will also install [extensions]({0}) published by {1}.', commandUri, getPublisherLink(otherUntrustedPublishers[0])));
                }
                else {
                    customMessage.appendMarkdown(localize('message3', 'Installing this extension will also install [extensions]({0}) published by {1} and {2}.', commandUri, otherUntrustedPublishers
                        .slice(0, otherUntrustedPublishers.length - 1)
                        .map((p) => getPublisherLink(p))
                        .join(', '), getPublisherLink(otherUntrustedPublishers[otherUntrustedPublishers.length - 1])));
                }
                customMessage.appendMarkdown('&nbsp;');
                customMessage.appendMarkdown(localize('firstTimeInstallingMessage', "This is the first time you're installing extensions from these publishers."));
            }
            else {
                customMessage.appendMarkdown(localize('message1', "The extension {0} is published by {1}. This is the first extension you're installing from this publisher.", `[${extension.displayName}](${extension.detailsLink})`, getPublisherLink(extension)));
            }
        }
        else {
            customMessage.appendMarkdown(localize('multiInstallMessage', "This is the first time you're installing extensions from publishers {0} and {1}.", getPublisherLink(allPublishers[0]), getPublisherLink(allPublishers[allPublishers.length - 1])));
        }
        if (verifiedPublishers.length || unverfiiedPublishers.length === 1) {
            for (const publisher of verifiedPublishers) {
                customMessage.appendText('\n');
                const publisherVerifiedMessage = localize('verifiedPublisherWithName', '{0} has verified ownership of {1}.', getPublisherLink(publisher), `[$(link-external) ${URI.parse(publisher.publisherDomain.link).authority}](${publisher.publisherDomain.link})`);
                customMessage.appendMarkdown(`$(${verifiedPublisherIcon.id})&nbsp;${publisherVerifiedMessage}`);
            }
            if (unverfiiedPublishers.length) {
                customMessage.appendText('\n');
                if (unverfiiedPublishers.length === 1) {
                    customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('unverifiedPublisherWithName', '{0} is [**not** verified]({1}).', getPublisherLink(unverfiiedPublishers[0]), unverifiedLink)}`);
                }
                else {
                    customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('unverifiedPublishers', '{0} and {1} are [**not** verified]({2}).', unverfiiedPublishers
                        .slice(0, unverfiiedPublishers.length - 1)
                        .map((p) => getPublisherLink(p))
                        .join(', '), getPublisherLink(unverfiiedPublishers[unverfiiedPublishers.length - 1]), unverifiedLink)}`);
                }
            }
        }
        else {
            customMessage.appendText('\n');
            customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('allUnverifed', 'All publishers are [**not** verified]({0}).', unverifiedLink)}`);
        }
        customMessage.appendText('\n');
        if (allPublishers.length > 1) {
            customMessage.appendMarkdown(localize('message4', '{0} has no control over the behavior of third-party extensions, including how they manage your personal data. Proceed only if you trust the publishers.', this.productService.nameLong));
        }
        else {
            customMessage.appendMarkdown(localize('message2', '{0} has no control over the behavior of third-party extensions, including how they manage your personal data. Proceed only if you trust the publisher.', this.productService.nameLong));
        }
        await this.dialogService.prompt({
            message: title,
            type: Severity.Warning,
            buttons: [installButton, learnMoreButton],
            cancelButton: {
                run: () => {
                    this.telemetryService.publicLog2('extensions:trustPublisher', {
                        action: 'cancel',
                        extensionId: untrustedExtensions.map((e) => e.identifier.id).join(','),
                    });
                    throw new CancellationError();
                },
            },
            custom: {
                markdownDetails: [
                    { markdown: customMessage, classes: ['extensions-management-publisher-trust-dialog'] },
                ],
            },
        });
    }
    async getOtherUntrustedPublishers(manifests) {
        const extensionIds = new Set();
        for (const manifest of manifests) {
            for (const id of [
                ...(manifest.extensionPack ?? []),
                ...(manifest.extensionDependencies ?? []),
            ]) {
                const [publisherId] = id.split('.');
                if (publisherId.toLowerCase() === manifest.publisher.toLowerCase()) {
                    continue;
                }
                if (this.isPublisherUserTrusted(publisherId.toLowerCase())) {
                    continue;
                }
                extensionIds.add(id.toLowerCase());
            }
        }
        if (!extensionIds.size) {
            return [];
        }
        const extensions = new Map();
        await this.getDependenciesAndPackedExtensionsRecursively([...extensionIds], extensions, CancellationToken.None);
        const publishers = new Map();
        for (const [, extension] of extensions) {
            if (extension.private || this.isPublisherTrusted(extension)) {
                continue;
            }
            publishers.set(extension.publisherDisplayName, extension);
        }
        return [...publishers.values()];
    }
    async getDependenciesAndPackedExtensionsRecursively(toGet, result, token) {
        if (toGet.length === 0) {
            return;
        }
        const extensions = await this.extensionGalleryService.getExtensions(toGet.map((id) => ({ id })), token);
        for (let idx = 0; idx < extensions.length; idx++) {
            const extension = extensions[idx];
            result.set(extension.identifier.id.toLowerCase(), extension);
        }
        toGet = [];
        for (const extension of extensions) {
            if (isNonEmptyArray(extension.properties.dependencies)) {
                for (const id of extension.properties.dependencies) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
            if (isNonEmptyArray(extension.properties.extensionPack)) {
                for (const id of extension.properties.extensionPack) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
        }
        return this.getDependenciesAndPackedExtensionsRecursively(toGet, result, token);
    }
    async checkForWorkspaceTrust(manifest, requireTrust) {
        if (requireTrust ||
            this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(manifest) === false) {
            const buttons = [];
            buttons.push({
                label: localize('extensionInstallWorkspaceTrustButton', 'Trust Workspace & Install'),
                type: 'ContinueWithTrust',
            });
            if (!requireTrust) {
                buttons.push({
                    label: localize('extensionInstallWorkspaceTrustContinueButton', 'Install'),
                    type: 'ContinueWithoutTrust',
                });
            }
            buttons.push({
                label: localize('extensionInstallWorkspaceTrustManageButton', 'Learn More'),
                type: 'Manage',
            });
            const trustState = await this.workspaceTrustRequestService.requestWorkspaceTrust({
                message: localize('extensionInstallWorkspaceTrustMessage', 'Enabling this extension requires a trusted workspace.'),
                buttons,
            });
            if (trustState === undefined) {
                throw new CancellationError();
            }
        }
    }
    async checkInstallingExtensionOnWeb(extension, manifest) {
        if (this.servers.length !== 1 ||
            this.servers[0] !== this.extensionManagementServerService.webExtensionManagementServer) {
            return;
        }
        const nonWebExtensions = [];
        if (manifest.extensionPack?.length) {
            const extensions = await this.extensionGalleryService.getExtensions(manifest.extensionPack.map((id) => ({ id })), CancellationToken.None);
            for (const extension of extensions) {
                if ((await this.servers[0].extensionManagementService.canInstall(extension)) !== true) {
                    nonWebExtensions.push(extension);
                }
            }
            if (nonWebExtensions.length && nonWebExtensions.length === extensions.length) {
                throw new ExtensionManagementError('Not supported in Web', "Unsupported" /* ExtensionManagementErrorCode.Unsupported */);
            }
        }
        const productName = localize('VS Code for Web', '{0} for the Web', this.productService.nameLong);
        const virtualWorkspaceSupport = this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(manifest);
        const virtualWorkspaceSupportReason = getWorkspaceSupportTypeMessage(manifest.capabilities?.virtualWorkspaces);
        const hasLimitedSupport = virtualWorkspaceSupport === 'limited' || !!virtualWorkspaceSupportReason;
        if (!nonWebExtensions.length && !hasLimitedSupport) {
            return;
        }
        const limitedSupportMessage = localize('limited support', "'{0}' has limited functionality in {1}.", extension.displayName || extension.identifier.id, productName);
        let message;
        let buttons = [];
        let detail;
        const installAnywayButton = {
            label: localize({ key: 'install anyways', comment: ['&& denotes a mnemonic'] }, '&&Install Anyway'),
            run: () => { },
        };
        const showExtensionsButton = {
            label: localize({ key: 'showExtensions', comment: ['&& denotes a mnemonic'] }, '&&Show Extensions'),
            run: () => this.instantiationService.invokeFunction((accessor) => accessor
                .get(ICommandService)
                .executeCommand('extension.open', extension.identifier.id, 'extensionPack')),
        };
        if (nonWebExtensions.length && hasLimitedSupport) {
            message = limitedSupportMessage;
            detail = `${virtualWorkspaceSupportReason ? `${virtualWorkspaceSupportReason}\n` : ''}${localize('non web extensions detail', 'Contains extensions which are not supported.')}`;
            buttons = [installAnywayButton, showExtensionsButton];
        }
        else if (hasLimitedSupport) {
            message = limitedSupportMessage;
            detail = virtualWorkspaceSupportReason || undefined;
            buttons = [installAnywayButton];
        }
        else {
            message = localize('non web extensions', "'{0}' contains extensions which are not supported in {1}.", extension.displayName || extension.identifier.id, productName);
            buttons = [installAnywayButton, showExtensionsButton];
        }
        await this.dialogService.prompt({
            type: Severity.Info,
            message,
            detail,
            buttons,
            cancelButton: {
                run: () => {
                    throw new CancellationError();
                },
            },
        });
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async cleanUp() {
        await Promise.allSettled(this.servers.map((server) => server.extensionManagementService.cleanUp()));
    }
    toggleAppliationScope(extension, fromProfileLocation) {
        const server = this.getServer(extension);
        if (server) {
            return server.extensionManagementService.toggleAppliationScope(extension, fromProfileLocation);
        }
        throw new Error('Not Supported');
    }
    copyExtensions(from, to) {
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            throw new Error('Not Supported');
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.copyExtensions(from, to);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.copyExtensions(from, to);
        }
        return Promise.resolve();
    }
    registerParticipant() {
        throw new Error('Not Supported');
    }
    installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        throw new Error('Not Supported');
    }
    isPublisherTrusted(extension) {
        const publisher = extension.publisher.toLowerCase();
        if (this.defaultTrustedPublishers.includes(publisher) ||
            this.defaultTrustedPublishers.includes(extension.publisherDisplayName.toLowerCase())) {
            return true;
        }
        // Check if the extension is allowed by publisher or extension id
        if (this.allowedExtensionsService.allowedExtensionsConfigValue &&
            this.allowedExtensionsService.isAllowed(extension)) {
            return true;
        }
        return this.isPublisherUserTrusted(publisher);
    }
    isPublisherUserTrusted(publisher) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        return !!trustedPublishers[publisher];
    }
    getTrustedPublishers() {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        return Object.keys(trustedPublishers).map((publisher) => trustedPublishers[publisher]);
    }
    trustPublishers(...publishers) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        for (const publisher of publishers) {
            trustedPublishers[publisher.publisher.toLowerCase()] = publisher;
        }
        this.storageService.store(TrustedPublishersStorageKey, JSON.stringify(trustedPublishers), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    untrustPublishers(...publishers) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        for (const publisher of publishers) {
            delete trustedPublishers[publisher.toLowerCase()];
        }
        this.storageService.store(TrustedPublishersStorageKey, JSON.stringify(trustedPublishers), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getTrustedPublishersFromStorage() {
        const trustedPublishers = this.storageService.getObject(TrustedPublishersStorageKey, -1 /* StorageScope.APPLICATION */, {});
        if (Array.isArray(trustedPublishers)) {
            this.storageService.remove(TrustedPublishersStorageKey, -1 /* StorageScope.APPLICATION */);
            return {};
        }
        return Object.keys(trustedPublishers).reduce((result, publisher) => {
            result[publisher.toLowerCase()] = trustedPublishers[publisher];
            return result;
        }, {});
    }
};
ExtensionManagementService = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IUserDataProfileService),
    __param(3, IUserDataProfilesService),
    __param(4, IConfigurationService),
    __param(5, IProductService),
    __param(6, IDownloadService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, IDialogService),
    __param(9, IWorkspaceTrustRequestService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, IFileService),
    __param(12, ILogService),
    __param(13, IInstantiationService),
    __param(14, IExtensionsScannerService),
    __param(15, IAllowedExtensionsService),
    __param(16, IStorageService),
    __param(17, ITelemetryService)
], ExtensionManagementService);
export { ExtensionManagementService };
let WorkspaceExtensionsManagementService = class WorkspaceExtensionsManagementService extends Disposable {
    static { WorkspaceExtensionsManagementService_1 = this; }
    static { this.WORKSPACE_EXTENSIONS_KEY = 'workspaceExtensions.locations'; }
    constructor(fileService, logService, workspaceService, extensionsScannerService, storageService, uriIdentityService, telemetryService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.workspaceService = workspaceService;
        this.extensionsScannerService = extensionsScannerService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this.telemetryService = telemetryService;
        this._onDidChangeInvalidExtensions = this._register(new Emitter());
        this.onDidChangeInvalidExtensions = this._onDidChangeInvalidExtensions.event;
        this.extensions = [];
        this.invalidExtensionWatchers = this._register(new DisposableStore());
        this._register(Event.debounce(this.fileService.onDidFilesChange, (last, e) => {
            ;
            (last = last ?? []).push(e);
            return last;
        }, 1000)((events) => {
            const changedInvalidExtensions = this.extensions.filter((extension) => !extension.isValid && events.some((e) => e.affects(extension.location)));
            if (changedInvalidExtensions.length) {
                this.checkExtensionsValidity(changedInvalidExtensions);
            }
        }));
        this.initializePromise = this.initialize();
    }
    async initialize() {
        const existingLocations = this.getInstalledWorkspaceExtensionsLocations();
        if (!existingLocations.length) {
            return;
        }
        await Promise.allSettled(existingLocations.map(async (location) => {
            if (!this.workspaceService.isInsideWorkspace(location)) {
                this.logService.info(`Removing the workspace extension ${location.toString()} as it is not inside the workspace`);
                return;
            }
            if (!(await this.fileService.exists(location))) {
                this.logService.info(`Removing the workspace extension ${location.toString()} as it does not exist`);
                return;
            }
            try {
                const extension = await this.scanWorkspaceExtension(location);
                if (extension) {
                    this.extensions.push(extension);
                }
                else {
                    this.logService.info(`Skipping workspace extension ${location.toString()} as it does not exist`);
                }
            }
            catch (error) {
                this.logService.error('Skipping the workspace extension', location.toString(), error);
            }
        }));
        this.saveWorkspaceExtensions();
    }
    watchInvalidExtensions() {
        this.invalidExtensionWatchers.clear();
        for (const extension of this.extensions) {
            if (!extension.isValid) {
                this.invalidExtensionWatchers.add(this.fileService.watch(extension.location));
            }
        }
    }
    async checkExtensionsValidity(extensions) {
        const validExtensions = [];
        await Promise.all(extensions.map(async (extension) => {
            const newExtension = await this.scanWorkspaceExtension(extension.location);
            if (newExtension?.isValid) {
                validExtensions.push(newExtension);
            }
        }));
        let changed = false;
        for (const extension of validExtensions) {
            const index = this.extensions.findIndex((e) => this.uriIdentityService.extUri.isEqual(e.location, extension.location));
            if (index !== -1) {
                changed = true;
                this.extensions.splice(index, 1, extension);
            }
        }
        if (changed) {
            this.saveWorkspaceExtensions();
            this._onDidChangeInvalidExtensions.fire(validExtensions);
        }
    }
    async getInstalled(includeInvalid) {
        await this.initializePromise;
        return this.extensions.filter((e) => includeInvalid || e.isValid);
    }
    async install(extension) {
        await this.initializePromise;
        const workspaceExtension = await this.scanWorkspaceExtension(extension.location);
        if (!workspaceExtension) {
            throw new Error('Cannot install the extension as it does not exist.');
        }
        const existingExtensionIndex = this.extensions.findIndex((e) => areSameExtensions(e.identifier, extension.identifier));
        if (existingExtensionIndex === -1) {
            this.extensions.push(workspaceExtension);
        }
        else {
            this.extensions.splice(existingExtensionIndex, 1, workspaceExtension);
        }
        this.saveWorkspaceExtensions();
        this.telemetryService.publicLog2('workspaceextension:install');
        return workspaceExtension;
    }
    async uninstall(extension) {
        await this.initializePromise;
        const existingExtensionIndex = this.extensions.findIndex((e) => areSameExtensions(e.identifier, extension.identifier));
        if (existingExtensionIndex !== -1) {
            this.extensions.splice(existingExtensionIndex, 1);
            this.saveWorkspaceExtensions();
        }
        this.telemetryService.publicLog2('workspaceextension:uninstall');
    }
    getInstalledWorkspaceExtensionsLocations() {
        const locations = [];
        try {
            const parsed = JSON.parse(this.storageService.get(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, 1 /* StorageScope.WORKSPACE */, '[]'));
            if (Array.isArray(locations)) {
                for (const location of parsed) {
                    if (isString(location)) {
                        if (this.workspaceService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                            locations.push(this.workspaceService.getWorkspace().folders[0].toResource(location));
                        }
                        else {
                            this.logService.warn(`Invalid value for 'extensions' in workspace storage: ${location}`);
                        }
                    }
                    else {
                        locations.push(URI.revive(location));
                    }
                }
            }
            else {
                this.logService.warn(`Invalid value for 'extensions' in workspace storage: ${locations}`);
            }
        }
        catch (error) {
            this.logService.warn(`Error parsing workspace extensions locations: ${getErrorMessage(error)}`);
        }
        return locations;
    }
    saveWorkspaceExtensions() {
        const locations = this.extensions.map((extension) => extension.location);
        if (this.workspaceService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            this.storageService.store(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, JSON.stringify(coalesce(locations.map((location) => this.uriIdentityService.extUri.relativePath(this.workspaceService.getWorkspace().folders[0].uri, location)))), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.store(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, JSON.stringify(locations), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        this.watchInvalidExtensions();
    }
    async scanWorkspaceExtension(location) {
        const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, { includeInvalid: true });
        return scannedExtension ? this.toLocalWorkspaceExtension(scannedExtension) : null;
    }
    async toLocalWorkspaceExtension(extension) {
        const stat = await this.fileService.resolve(extension.location);
        let readmeUrl;
        let changelogUrl;
        if (stat.children) {
            readmeUrl = stat.children.find(({ name }) => /^readme(\.txt|\.md|)$/i.test(name))?.resource;
            changelogUrl = stat.children.find(({ name }) => /^changelog(\.txt|\.md|)$/i.test(name))?.resource;
        }
        const validations = [...extension.validations];
        let isValid = extension.isValid;
        if (extension.manifest.main) {
            if (!(await this.fileService.exists(this.uriIdentityService.extUri.joinPath(extension.location, extension.manifest.main)))) {
                isValid = false;
                validations.push([
                    Severity.Error,
                    localize('main.notFound', 'Cannot activate because {0} not found', extension.manifest.main),
                ]);
            }
        }
        return {
            identifier: extension.identifier,
            type: extension.type,
            isBuiltin: extension.isBuiltin || !!extension.metadata?.isBuiltin,
            location: extension.location,
            manifest: extension.manifest,
            targetPlatform: extension.targetPlatform,
            validations,
            isValid,
            readmeUrl,
            changelogUrl,
            publisherDisplayName: extension.metadata?.publisherDisplayName,
            publisherId: extension.metadata?.publisherId || null,
            isApplicationScoped: !!extension.metadata?.isApplicationScoped,
            isMachineScoped: !!extension.metadata?.isMachineScoped,
            isPreReleaseVersion: !!extension.metadata?.isPreReleaseVersion,
            hasPreReleaseVersion: !!extension.metadata?.hasPreReleaseVersion,
            preRelease: !!extension.metadata?.preRelease,
            installedTimestamp: extension.metadata?.installedTimestamp,
            updated: !!extension.metadata?.updated,
            pinned: !!extension.metadata?.pinned,
            isWorkspaceScoped: true,
            private: false,
            source: 'resource',
            size: extension.metadata?.size ?? 0,
        };
    }
};
WorkspaceExtensionsManagementService = WorkspaceExtensionsManagementService_1 = __decorate([
    __param(0, IFileService),
    __param(1, ILogService),
    __param(2, IWorkspaceContextService),
    __param(3, IExtensionsScannerService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService),
    __param(6, ITelemetryService)
], WorkspaceExtensionsManagementService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFLTix3QkFBd0IsRUFJeEIsd0JBQXdCLEVBSXhCLGdDQUFnQyxFQU1oQyx5QkFBeUIsRUFDekIsOENBQThDLEdBQzlDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUlOLGlDQUFpQyxHQU1qQyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFFTix1QkFBdUIsRUFFdkIsOEJBQThCLEdBRTlCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFP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