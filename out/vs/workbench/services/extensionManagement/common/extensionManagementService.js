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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkYsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBS04sd0JBQXdCLEVBSXhCLHdCQUF3QixFQUl4QixnQ0FBZ0MsRUFNaEMseUJBQXlCLEVBQ3pCLDhDQUE4QyxHQUM5QyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFJTixpQ0FBaUMsR0FNakMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBRU4sdUJBQXVCLEVBRXZCLDhCQUE4QixHQUU5QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIscUJBQXFCLEdBQ3JCLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFF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