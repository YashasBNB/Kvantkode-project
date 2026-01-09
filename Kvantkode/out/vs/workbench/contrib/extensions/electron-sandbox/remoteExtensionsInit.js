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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, IExtensionGalleryService, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS } from '../../../../platform/remote/common/remote.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { IStorageService, IS_NEW_KEY, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { AbstractExtensionsInitializer } from '../../../../platform/userDataSync/common/extensionsSync.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncEnablementService, IUserDataSyncStoreManagementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
let InstallRemoteExtensionsContribution = class InstallRemoteExtensionsContribution {
    constructor(remoteAgentService, remoteExtensionsScannerService, extensionGalleryService, extensionManagementServerService, extensionsWorkbenchService, logService, configurationService) {
        this.remoteAgentService = remoteAgentService;
        this.remoteExtensionsScannerService = remoteExtensionsScannerService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.installExtensionsIfInstalledLocallyInRemote();
        this.installFailedRemoteExtensions();
    }
    async installExtensionsIfInstalledLocallyInRemote() {
        if (!this.remoteAgentService.getConnection()) {
            return;
        }
        if (!this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.logService.error('No remote extension management server available');
            return;
        }
        if (!this.extensionManagementServerService.localExtensionManagementServer) {
            this.logService.error('No local extension management server available');
            return;
        }
        const settingValue = this.configurationService.getValue(REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS);
        if (!settingValue?.length) {
            return;
        }
        const alreadyInstalledLocally = await this.extensionsWorkbenchService.queryLocal(this.extensionManagementServerService.localExtensionManagementServer);
        const alreadyInstalledRemotely = await this.extensionsWorkbenchService.queryLocal(this.extensionManagementServerService.remoteExtensionManagementServer);
        const extensionsToInstall = alreadyInstalledLocally
            .filter((ext) => settingValue.some((id) => areSameExtensions(ext.identifier, { id })))
            .filter((ext) => !alreadyInstalledRemotely.some((e) => areSameExtensions(e.identifier, ext.identifier)));
        if (!extensionsToInstall.length) {
            return;
        }
        await Promise.allSettled(extensionsToInstall.map((ext) => {
            this.extensionsWorkbenchService.installInServer(ext, this.extensionManagementServerService.remoteExtensionManagementServer, { donotIncludePackAndDependencies: true });
        }));
    }
    async installFailedRemoteExtensions() {
        if (!this.remoteAgentService.getConnection()) {
            return;
        }
        const { failed } = await this.remoteExtensionsScannerService.whenExtensionsReady();
        if (failed.length === 0) {
            this.logService.trace('No extensions relayed from server');
            return;
        }
        if (!this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.logService.error('No remote extension management server available');
            return;
        }
        this.logService.info(`Installing '${failed.length}' extensions relayed from server`);
        const galleryExtensions = await this.extensionGalleryService.getExtensions(failed.map(({ id }) => ({ id })), CancellationToken.None);
        const installExtensionInfo = [];
        for (const { id, installOptions } of failed) {
            const extension = galleryExtensions.find((e) => areSameExtensions(e.identifier, { id }));
            if (extension) {
                installExtensionInfo.push({
                    extension,
                    options: {
                        ...installOptions,
                        downloadExtensionsLocally: true,
                    },
                });
            }
            else {
                this.logService.warn(`Relayed failed extension '${id}' from server is not found in the gallery`);
            }
        }
        if (installExtensionInfo.length) {
            await Promise.allSettled(installExtensionInfo.map((e) => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromGallery(e.extension, e.options)));
        }
    }
};
InstallRemoteExtensionsContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IRemoteExtensionsScannerService),
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionManagementServerService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], InstallRemoteExtensionsContribution);
export { InstallRemoteExtensionsContribution };
let RemoteExtensionsInitializerContribution = class RemoteExtensionsInitializerContribution {
    constructor(extensionManagementServerService, storageService, remoteAgentService, userDataSyncStoreManagementService, instantiationService, logService, authenticationService, remoteAuthorityResolverService, userDataSyncEnablementService) {
        this.extensionManagementServerService = extensionManagementServerService;
        this.storageService = storageService;
        this.remoteAgentService = remoteAgentService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.authenticationService = authenticationService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.initializeRemoteExtensions();
    }
    async initializeRemoteExtensions() {
        const connection = this.remoteAgentService.getConnection();
        const localExtensionManagementServer = this.extensionManagementServerService.localExtensionManagementServer;
        const remoteExtensionManagementServer = this.extensionManagementServerService.remoteExtensionManagementServer;
        // Skip: Not a remote window
        if (!connection || !remoteExtensionManagementServer) {
            return;
        }
        // Skip: Not a native window
        if (!localExtensionManagementServer) {
            return;
        }
        // Skip: No UserdataSyncStore is configured
        if (!this.userDataSyncStoreManagementService.userDataSyncStore) {
            return;
        }
        const newRemoteConnectionKey = `${IS_NEW_KEY}.${connection.remoteAuthority}`;
        // Skip: Not a new remote connection
        if (!this.storageService.getBoolean(newRemoteConnectionKey, -1 /* StorageScope.APPLICATION */, true)) {
            this.logService.trace(`Skipping initializing remote extensions because the window with this remote authority was opened before.`);
            return;
        }
        this.storageService.store(newRemoteConnectionKey, false, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Skip: Not a new workspace
        if (!this.storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
            this.logService.trace(`Skipping initializing remote extensions because this workspace was opened before.`);
            return;
        }
        // Skip: Settings Sync is disabled
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        // Skip: No account is provided to initialize
        const resolvedAuthority = await this.remoteAuthorityResolverService.resolveAuthority(connection.remoteAuthority);
        if (!resolvedAuthority.options?.authenticationSession) {
            return;
        }
        const sessions = await this.authenticationService.getSessions(resolvedAuthority.options?.authenticationSession.providerId);
        const session = sessions.find((s) => s.id === resolvedAuthority.options?.authenticationSession?.id);
        // Skip: Session is not found
        if (!session) {
            this.logService.info('Skipping initializing remote extensions because the account with given session id is not found', resolvedAuthority.options.authenticationSession.id);
            return;
        }
        const userDataSyncStoreClient = this.instantiationService.createInstance(UserDataSyncStoreClient, this.userDataSyncStoreManagementService.userDataSyncStore.url);
        userDataSyncStoreClient.setAuthToken(session.accessToken, resolvedAuthority.options.authenticationSession.providerId);
        const userData = await userDataSyncStoreClient.readResource("extensions" /* SyncResource.Extensions */, null);
        const serviceCollection = new ServiceCollection();
        serviceCollection.set(IExtensionManagementService, remoteExtensionManagementServer.extensionManagementService);
        const instantiationService = this.instantiationService.createChild(serviceCollection);
        const extensionsToInstallInitializer = instantiationService.createInstance(RemoteExtensionsInitializer);
        await extensionsToInstallInitializer.initialize(userData);
    }
};
RemoteExtensionsInitializerContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IStorageService),
    __param(2, IRemoteAgentService),
    __param(3, IUserDataSyncStoreManagementService),
    __param(4, IInstantiationService),
    __param(5, ILogService),
    __param(6, IAuthenticationService),
    __param(7, IRemoteAuthorityResolverService),
    __param(8, IUserDataSyncEnablementService)
], RemoteExtensionsInitializerContribution);
export { RemoteExtensionsInitializerContribution };
let RemoteExtensionsInitializer = class RemoteExtensionsInitializer extends AbstractExtensionsInitializer {
    constructor(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, uriIdentityService, extensionGalleryService, storageService, extensionManifestPropertiesService) {
        super(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService);
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async doInitialize(remoteUserData) {
        const remoteExtensions = await this.parseExtensions(remoteUserData);
        if (!remoteExtensions) {
            this.logService.info('No synced extensions exist while initializing remote extensions.');
            return;
        }
        const installedExtensions = await this.extensionManagementService.getInstalled();
        const { newExtensions } = this.generatePreview(remoteExtensions, installedExtensions);
        if (!newExtensions.length) {
            this.logService.trace('No new remote extensions to install.');
            return;
        }
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const extensionsToInstall = await this.extensionGalleryService.getExtensions(newExtensions, { targetPlatform, compatible: true }, CancellationToken.None);
        if (extensionsToInstall.length) {
            await Promise.allSettled(extensionsToInstall.map(async (e) => {
                const manifest = await this.extensionGalleryService.getManifest(e, CancellationToken.None);
                if (manifest && this.extensionManifestPropertiesService.canExecuteOnWorkspace(manifest)) {
                    const syncedExtension = remoteExtensions.find((e) => areSameExtensions(e.identifier, e.identifier));
                    await this.extensionManagementService.installFromGallery(e, {
                        installPreReleaseVersion: syncedExtension?.preRelease,
                        donotIncludePackAndDependencies: true,
                        context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true },
                    });
                }
            }));
        }
    }
};
RemoteExtensionsInitializer = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IIgnoredExtensionsManagementService),
    __param(2, IFileService),
    __param(3, IUserDataProfilesService),
    __param(4, IEnvironmentService),
    __param(5, ILogService),
    __param(6, IUriIdentityService),
    __param(7, IExtensionGalleryService),
    __param(8, IStorageService),
    __param(9, IExtensionManifestPropertiesService)
], RemoteExtensionsInitializer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc0luaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9yZW1vdGVFeHRlbnNpb25zSW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04sOENBQThDLEVBQzlDLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FFM0IsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQy9HLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQy9HLE9BQU8sRUFDTixlQUFlLEVBQ2YsVUFBVSxHQUdWLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFt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