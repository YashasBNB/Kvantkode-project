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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc0luaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvcmVtb3RlRXh0ZW5zaW9uc0luaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLDhDQUE4QyxFQUM5Qyx3QkFBd0IsRUFDeEIsMkJBQTJCLEdBRTNCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQ04sZUFBZSxFQUNmLFVBQVUsR0FHVixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFB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