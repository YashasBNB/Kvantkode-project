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
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { AbstractExtensionsInitializer, } from '../../../../platform/userDataSync/common/extensionsSync.js';
import { GlobalStateInitializer, UserDataSyncStoreTypeSynchronizer, } from '../../../../platform/userDataSync/common/globalStateSync.js';
import { KeybindingsInitializer } from '../../../../platform/userDataSync/common/keybindingsSync.js';
import { SettingsInitializer } from '../../../../platform/userDataSync/common/settingsSync.js';
import { SnippetsInitializer } from '../../../../platform/userDataSync/common/snippetsSync.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IUserDataSyncLogService, IUserDataSyncStoreManagementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { getCurrentAuthenticationSessionInfo, } from '../../authentication/browser/authenticationService.js';
import { getSyncAreaLabel } from '../common/userDataSync.js';
import { isWeb } from '../../../../base/common/platform.js';
import { Barrier, Promises } from '../../../../base/common/async.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionService, toExtensionDescription } from '../../extensions/common/extensions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { TasksInitializer } from '../../../../platform/userDataSync/common/tasksSync.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
let UserDataSyncInitializer = class UserDataSyncInitializer {
    constructor(environmentService, secretStorageService, userDataSyncStoreManagementService, fileService, userDataProfilesService, storageService, productService, requestService, logService, uriIdentityService) {
        this.environmentService = environmentService;
        this.secretStorageService = secretStorageService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.fileService = fileService;
        this.userDataProfilesService = userDataProfilesService;
        this.storageService = storageService;
        this.productService = productService;
        this.requestService = requestService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.initialized = [];
        this.initializationFinished = new Barrier();
        this.globalStateUserData = null;
        this.createUserDataSyncStoreClient().then((userDataSyncStoreClient) => {
            if (!userDataSyncStoreClient) {
                this.initializationFinished.open();
            }
        });
    }
    createUserDataSyncStoreClient() {
        if (!this._userDataSyncStoreClientPromise) {
            this._userDataSyncStoreClientPromise = (async () => {
                try {
                    if (!isWeb) {
                        this.logService.trace(`Skipping initializing user data in desktop`);
                        return;
                    }
                    if (!this.storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
                        this.logService.trace(`Skipping initializing user data as application was opened before`);
                        return;
                    }
                    if (!this.storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
                        this.logService.trace(`Skipping initializing user data as workspace was opened before`);
                        return;
                    }
                    if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider &&
                        !this.environmentService.options.settingsSyncOptions.enabled) {
                        this.logService.trace(`Skipping initializing user data as settings sync is disabled`);
                        return;
                    }
                    let authenticationSession;
                    try {
                        authenticationSession = await getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService);
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                    if (!authenticationSession) {
                        this.logService.trace(`Skipping initializing user data as authentication session is not set`);
                        return;
                    }
                    await this.initializeUserDataSyncStore(authenticationSession);
                    const userDataSyncStore = this.userDataSyncStoreManagementService.userDataSyncStore;
                    if (!userDataSyncStore) {
                        this.logService.trace(`Skipping initializing user data as sync service is not provided`);
                        return;
                    }
                    const userDataSyncStoreClient = new UserDataSyncStoreClient(userDataSyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
                    userDataSyncStoreClient.setAuthToken(authenticationSession.accessToken, authenticationSession.providerId);
                    const manifest = await userDataSyncStoreClient.manifest(null);
                    if (manifest === null) {
                        userDataSyncStoreClient.dispose();
                        this.logService.trace(`Skipping initializing user data as there is no data`);
                        return;
                    }
                    this.logService.info(`Using settings sync service ${userDataSyncStore.url.toString()} for initialization`);
                    return userDataSyncStoreClient;
                }
                catch (error) {
                    this.logService.error(error);
                    return;
                }
            })();
        }
        return this._userDataSyncStoreClientPromise;
    }
    async initializeUserDataSyncStore(authenticationSession) {
        const userDataSyncStore = this.userDataSyncStoreManagementService.userDataSyncStore;
        if (!userDataSyncStore?.canSwitch) {
            return;
        }
        const disposables = new DisposableStore();
        try {
            const userDataSyncStoreClient = disposables.add(new UserDataSyncStoreClient(userDataSyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService));
            userDataSyncStoreClient.setAuthToken(authenticationSession.accessToken, authenticationSession.providerId);
            // Cache global state data for global state initialization
            this.globalStateUserData = await userDataSyncStoreClient.readResource("globalState" /* SyncResource.GlobalState */, null);
            if (this.globalStateUserData) {
                const userDataSyncStoreType = new UserDataSyncStoreTypeSynchronizer(userDataSyncStoreClient, this.storageService, this.environmentService, this.fileService, this.logService).getSyncStoreType(this.globalStateUserData);
                if (userDataSyncStoreType) {
                    await this.userDataSyncStoreManagementService.switch(userDataSyncStoreType);
                    // Unset cached global state data if urls are changed
                    if (!isEqual(userDataSyncStore.url, this.userDataSyncStoreManagementService.userDataSyncStore?.url)) {
                        this.logService.info('Switched settings sync store');
                        this.globalStateUserData = null;
                    }
                }
            }
        }
        finally {
            disposables.dispose();
        }
    }
    async whenInitializationFinished() {
        await this.initializationFinished.wait();
    }
    async requiresInitialization() {
        this.logService.trace(`UserDataInitializationService#requiresInitialization`);
        const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
        return !!userDataSyncStoreClient;
    }
    async initializeRequiredResources() {
        this.logService.trace(`UserDataInitializationService#initializeRequiredResources`);
        return this.initialize(["settings" /* SyncResource.Settings */, "globalState" /* SyncResource.GlobalState */]);
    }
    async initializeOtherResources(instantiationService) {
        try {
            this.logService.trace(`UserDataInitializationService#initializeOtherResources`);
            await Promise.allSettled([
                this.initialize(["keybindings" /* SyncResource.Keybindings */, "snippets" /* SyncResource.Snippets */, "tasks" /* SyncResource.Tasks */]),
                this.initializeExtensions(instantiationService),
            ]);
        }
        finally {
            this.initializationFinished.open();
        }
    }
    async initializeExtensions(instantiationService) {
        try {
            await Promise.all([
                this.initializeInstalledExtensions(instantiationService),
                this.initializeNewExtensions(instantiationService),
            ]);
        }
        finally {
            this.initialized.push("extensions" /* SyncResource.Extensions */);
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (!this.initializeInstalledExtensionsPromise) {
            this.initializeInstalledExtensionsPromise = (async () => {
                this.logService.trace(`UserDataInitializationService#initializeInstalledExtensions`);
                const extensionsPreviewInitializer = await this.getExtensionsPreviewInitializer(instantiationService);
                if (extensionsPreviewInitializer) {
                    await instantiationService
                        .createInstance(InstalledExtensionsInitializer, extensionsPreviewInitializer)
                        .initialize();
                }
            })();
        }
        return this.initializeInstalledExtensionsPromise;
    }
    async initializeNewExtensions(instantiationService) {
        if (!this.initializeNewExtensionsPromise) {
            this.initializeNewExtensionsPromise = (async () => {
                this.logService.trace(`UserDataInitializationService#initializeNewExtensions`);
                const extensionsPreviewInitializer = await this.getExtensionsPreviewInitializer(instantiationService);
                if (extensionsPreviewInitializer) {
                    await instantiationService
                        .createInstance(NewExtensionsInitializer, extensionsPreviewInitializer)
                        .initialize();
                }
            })();
        }
        return this.initializeNewExtensionsPromise;
    }
    getExtensionsPreviewInitializer(instantiationService) {
        if (!this.extensionsPreviewInitializerPromise) {
            this.extensionsPreviewInitializerPromise = (async () => {
                const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
                if (!userDataSyncStoreClient) {
                    return null;
                }
                const userData = await userDataSyncStoreClient.readResource("extensions" /* SyncResource.Extensions */, null);
                return instantiationService.createInstance(ExtensionsPreviewInitializer, userData);
            })();
        }
        return this.extensionsPreviewInitializerPromise;
    }
    async initialize(syncResources) {
        const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
        if (!userDataSyncStoreClient) {
            return;
        }
        await Promises.settled(syncResources.map(async (syncResource) => {
            try {
                if (this.initialized.includes(syncResource)) {
                    this.logService.info(`${getSyncAreaLabel(syncResource)} initialized already.`);
                    return;
                }
                this.initialized.push(syncResource);
                this.logService.trace(`Initializing ${getSyncAreaLabel(syncResource)}`);
                const initializer = this.createSyncResourceInitializer(syncResource);
                const userData = await userDataSyncStoreClient.readResource(syncResource, syncResource === "globalState" /* SyncResource.GlobalState */ ? this.globalStateUserData : null);
                await initializer.initialize(userData);
                this.logService.info(`Initialized ${getSyncAreaLabel(syncResource)}`);
            }
            catch (error) {
                this.logService.info(`Error while initializing ${getSyncAreaLabel(syncResource)}`);
                this.logService.error(error);
            }
        }));
    }
    createSyncResourceInitializer(syncResource) {
        switch (syncResource) {
            case "settings" /* SyncResource.Settings */:
                return new SettingsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "keybindings" /* SyncResource.Keybindings */:
                return new KeybindingsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "tasks" /* SyncResource.Tasks */:
                return new TasksInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "snippets" /* SyncResource.Snippets */:
                return new SnippetsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "globalState" /* SyncResource.GlobalState */:
                return new GlobalStateInitializer(this.storageService, this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.uriIdentityService);
        }
        throw new Error(`Cannot create initializer for ${syncResource}`);
    }
};
UserDataSyncInitializer = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, ISecretStorageService),
    __param(2, IUserDataSyncStoreManagementService),
    __param(3, IFileService),
    __param(4, IUserDataProfilesService),
    __param(5, IStorageService),
    __param(6, IProductService),
    __param(7, IRequestService),
    __param(8, ILogService),
    __param(9, IUriIdentityService)
], UserDataSyncInitializer);
export { UserDataSyncInitializer };
let ExtensionsPreviewInitializer = class ExtensionsPreviewInitializer extends AbstractExtensionsInitializer {
    constructor(extensionsData, extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService);
        this.extensionsData = extensionsData;
        this.preview = null;
    }
    getPreview() {
        if (!this.previewPromise) {
            this.previewPromise = super.initialize(this.extensionsData).then(() => this.preview);
        }
        return this.previewPromise;
    }
    initialize() {
        throw new Error('should not be called directly');
    }
    async doInitialize(remoteUserData) {
        const remoteExtensions = await this.parseExtensions(remoteUserData);
        if (!remoteExtensions) {
            this.logService.info('Skipping initializing extensions because remote extensions does not exist.');
            return;
        }
        const installedExtensions = await this.extensionManagementService.getInstalled();
        this.preview = this.generatePreview(remoteExtensions, installedExtensions);
    }
};
ExtensionsPreviewInitializer = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IIgnoredExtensionsManagementService),
    __param(3, IFileService),
    __param(4, IUserDataProfilesService),
    __param(5, IEnvironmentService),
    __param(6, IUserDataSyncLogService),
    __param(7, IStorageService),
    __param(8, IUriIdentityService)
], ExtensionsPreviewInitializer);
let InstalledExtensionsInitializer = class InstalledExtensionsInitializer {
    constructor(extensionsPreviewInitializer, extensionEnablementService, extensionStorageService, logService) {
        this.extensionsPreviewInitializer = extensionsPreviewInitializer;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionStorageService = extensionStorageService;
        this.logService = logService;
    }
    async initialize() {
        const preview = await this.extensionsPreviewInitializer.getPreview();
        if (!preview) {
            return;
        }
        // 1. Initialise already installed extensions state
        for (const installedExtension of preview.installedExtensions) {
            const syncExtension = preview.remoteExtensions.find(({ identifier }) => areSameExtensions(identifier, installedExtension.identifier));
            if (syncExtension?.state) {
                const extensionState = this.extensionStorageService.getExtensionState(installedExtension, true) || {};
                Object.keys(syncExtension.state).forEach((key) => (extensionState[key] = syncExtension.state[key]));
                this.extensionStorageService.setExtensionState(installedExtension, extensionState, true);
            }
        }
        // 2. Initialise extensions enablement
        if (preview.disabledExtensions.length) {
            for (const identifier of preview.disabledExtensions) {
                this.logService.trace(`Disabling extension...`, identifier.id);
                await this.extensionEnablementService.disableExtension(identifier);
                this.logService.info(`Disabling extension`, identifier.id);
            }
        }
    }
};
InstalledExtensionsInitializer = __decorate([
    __param(1, IGlobalExtensionEnablementService),
    __param(2, IExtensionStorageService),
    __param(3, IUserDataSyncLogService)
], InstalledExtensionsInitializer);
let NewExtensionsInitializer = class NewExtensionsInitializer {
    constructor(extensionsPreviewInitializer, extensionService, extensionStorageService, galleryService, extensionManagementService, logService) {
        this.extensionsPreviewInitializer = extensionsPreviewInitializer;
        this.extensionService = extensionService;
        this.extensionStorageService = extensionStorageService;
        this.galleryService = galleryService;
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
    }
    async initialize() {
        const preview = await this.extensionsPreviewInitializer.getPreview();
        if (!preview) {
            return;
        }
        const newlyEnabledExtensions = [];
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const galleryExtensions = await this.galleryService.getExtensions(preview.newExtensions, { targetPlatform, compatible: true }, CancellationToken.None);
        for (const galleryExtension of galleryExtensions) {
            try {
                const extensionToSync = preview.remoteExtensions.find(({ identifier }) => areSameExtensions(identifier, galleryExtension.identifier));
                if (!extensionToSync) {
                    continue;
                }
                if (extensionToSync.state) {
                    this.extensionStorageService.setExtensionState(galleryExtension, extensionToSync.state, true);
                }
                this.logService.trace(`Installing extension...`, galleryExtension.identifier.id);
                const local = await this.extensionManagementService.installFromGallery(galleryExtension, {
                    isMachineScoped: false /* set isMachineScoped to prevent install and sync dialog in web */,
                    donotIncludePackAndDependencies: true,
                    installGivenVersion: !!extensionToSync.version,
                    installPreReleaseVersion: extensionToSync.preRelease,
                    context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true },
                });
                if (!preview.disabledExtensions.some((identifier) => areSameExtensions(identifier, galleryExtension.identifier))) {
                    newlyEnabledExtensions.push(local);
                }
                this.logService.info(`Installed extension.`, galleryExtension.identifier.id);
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        const canEnabledExtensions = newlyEnabledExtensions.filter((e) => this.extensionService.canAddExtension(toExtensionDescription(e)));
        if (!(await this.areExtensionsRunning(canEnabledExtensions))) {
            await new Promise((c, e) => {
                const disposable = this.extensionService.onDidChangeExtensions(async () => {
                    try {
                        if (await this.areExtensionsRunning(canEnabledExtensions)) {
                            disposable.dispose();
                            c();
                        }
                    }
                    catch (error) {
                        e(error);
                    }
                });
            });
        }
    }
    async areExtensionsRunning(extensions) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const runningExtensions = this.extensionService.extensions;
        return extensions.every((e) => runningExtensions.some((r) => areSameExtensions({ id: r.identifier.value }, e.identifier)));
    }
};
NewExtensionsInitializer = __decorate([
    __param(1, IExtensionService),
    __param(2, IExtensionStorageService),
    __param(3, IExtensionGalleryService),
    __param(4, IExtensionManagementService),
    __param(5, IUserDataSyncLogService)
], NewExtensionsInitializer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jSW5pdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNJbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUNOLDZCQUE2QixHQUU3QixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsaUNBQWlDLEdBQ2pDLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDcEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFJTix1QkFBdUIsRUFDdkIsbUNBQW1DLEdBRW5DLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLG1DQUFtQyxHQUNuQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVB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