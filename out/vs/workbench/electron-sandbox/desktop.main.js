/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import product from '../../platform/product/common/product.js';
import { Workbench } from '../browser/workbench.js';
import { NativeWindow } from './window.js';
import { setFullscreen } from '../../base/browser/browser.js';
import { domContentLoaded } from '../../base/browser/dom.js';
import { onUnexpectedError } from '../../base/common/errors.js';
import { URI } from '../../base/common/uri.js';
import { WorkspaceService } from '../services/configuration/browser/configurationService.js';
import { INativeWorkbenchEnvironmentService, NativeWorkbenchEnvironmentService, } from '../services/environment/electron-sandbox/environmentService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILoggerService, ILogService, LogLevel } from '../../platform/log/common/log.js';
import { NativeWorkbenchStorageService } from '../services/storage/electron-sandbox/storageService.js';
import { IWorkspaceContextService, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, reviveIdentifier, toWorkspaceIdentifier, } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchConfigurationService } from '../services/configuration/common/configuration.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { ISharedProcessService } from '../../platform/ipc/electron-sandbox/services.js';
import { IMainProcessService } from '../../platform/ipc/common/mainProcessService.js';
import { SharedProcessService } from '../services/sharedProcess/electron-sandbox/sharedProcessService.js';
import { RemoteAuthorityResolverService } from '../../platform/remote/electron-sandbox/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService, } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { RemoteAgentService } from '../services/remote/electron-sandbox/remoteAgentService.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { RemoteFileSystemProviderClient } from '../services/remote/common/remoteFileSystemProviderClient.js';
import { ConfigurationCache } from '../services/configuration/common/configurationCache.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { INativeKeyboardLayoutService, NativeKeyboardLayoutService, } from '../services/keybinding/electron-sandbox/nativeKeyboardLayoutService.js';
import { ElectronIPCMainProcessService } from '../../platform/ipc/electron-sandbox/mainProcessService.js';
import { LoggerChannelClient } from '../../platform/log/common/logIpc.js';
import { ProxyChannel } from '../../base/parts/ipc/common/ipc.js';
import { NativeLogService } from '../services/log/electron-sandbox/logService.js';
import { WorkspaceTrustEnablementService, WorkspaceTrustManagementService, } from '../services/workspaces/common/workspaceTrust.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, } from '../../platform/workspace/common/workspaceTrust.js';
import { safeStringify } from '../../base/common/objects.js';
import { IUtilityProcessWorkerWorkbenchService, UtilityProcessWorkerWorkbenchService, } from '../services/utilityProcess/electron-sandbox/utilityProcessWorkerWorkbenchService.js';
import { isBigSurOrNewer, isCI, isMacintosh } from '../../base/common/platform.js';
import { Schemas } from '../../base/common/network.js';
import { DiskFileSystemProvider } from '../services/files/electron-sandbox/diskFileSystemProvider.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { IUserDataProfilesService, reviveProfile, } from '../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfileIpc.js';
import { PolicyChannelClient } from '../../platform/policy/common/policyIpc.js';
import { IPolicyService } from '../../platform/policy/common/policy.js';
import { UserDataProfileService } from '../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../services/userDataProfile/common/userDataProfile.js';
import { BrowserSocketFactory } from '../../platform/remote/browser/browserSocketFactory.js';
import { RemoteSocketFactoryService, IRemoteSocketFactoryService, } from '../../platform/remote/common/remoteSocketFactoryService.js';
import { ElectronRemoteResourceLoader } from '../../platform/remote/electron-sandbox/electronRemoteResourceLoader.js';
import { applyZoom } from '../../platform/window/electron-sandbox/window.js';
import { mainWindow } from '../../base/browser/window.js';
import { DefaultAccountService, IDefaultAccountService, } from '../services/accounts/common/defaultAccount.js';
import { AccountPolicyService } from '../services/policies/common/accountPolicyService.js';
import { MultiplexPolicyService } from '../services/policies/common/multiplexPolicyService.js';
export class DesktopMain extends Disposable {
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.init();
    }
    init() {
        // Massage configuration file URIs
        this.reviveUris();
        // Apply fullscreen early if configured
        setFullscreen(!!this.configuration.fullscreen, mainWindow);
    }
    reviveUris() {
        // Workspace
        const workspace = reviveIdentifier(this.configuration.workspace);
        if (isWorkspaceIdentifier(workspace) || isSingleFolderWorkspaceIdentifier(workspace)) {
            this.configuration.workspace = workspace;
        }
        // Files
        const filesToWait = this.configuration.filesToWait;
        const filesToWaitPaths = filesToWait?.paths;
        for (const paths of [
            filesToWaitPaths,
            this.configuration.filesToOpenOrCreate,
            this.configuration.filesToDiff,
            this.configuration.filesToMerge,
        ]) {
            if (Array.isArray(paths)) {
                for (const path of paths) {
                    if (path.fileUri) {
                        path.fileUri = URI.revive(path.fileUri);
                    }
                }
            }
        }
        if (filesToWait) {
            filesToWait.waitMarkerFileUri = URI.revive(filesToWait.waitMarkerFileUri);
        }
    }
    async open() {
        // Init services and wait for DOM to be ready in parallel
        const [services] = await Promise.all([this.initServices(), domContentLoaded(mainWindow)]);
        // Apply zoom level early once we have a configuration service
        // and before the workbench is created to prevent flickering.
        // We also need to respect that zoom level can be configured per
        // workspace, so we need the resolved configuration service.
        // Finally, it is possible for the window to have a custom
        // zoom level that is not derived from settings.
        // (fixes https://github.com/microsoft/vscode/issues/187982)
        this.applyWindowZoomLevel(services.configurationService);
        // Create Workbench
        const workbench = new Workbench(mainWindow.document.body, { extraClasses: this.getExtraClasses() }, services.serviceCollection, services.logService);
        // Listeners
        this.registerListeners(workbench, services.storageService);
        // Startup
        const instantiationService = workbench.startup();
        // Window
        this._register(instantiationService.createInstance(NativeWindow));
    }
    applyWindowZoomLevel(configurationService) {
        let zoomLevel = undefined;
        if (this.configuration.isCustomZoomLevel && typeof this.configuration.zoomLevel === 'number') {
            zoomLevel = this.configuration.zoomLevel;
        }
        else {
            const windowConfig = configurationService.getValue();
            zoomLevel =
                typeof windowConfig.window?.zoomLevel === 'number' ? windowConfig.window.zoomLevel : 0;
        }
        applyZoom(zoomLevel, mainWindow);
    }
    getExtraClasses() {
        if (isMacintosh && isBigSurOrNewer(this.configuration.os.release)) {
            return ['macos-bigsur-or-newer'];
        }
        return [];
    }
    registerListeners(workbench, storageService) {
        // Workbench Lifecycle
        this._register(workbench.onWillShutdown((event) => event.join(storageService.close(), {
            id: 'join.closeStorage',
            label: localize('join.closeStorage', 'Saving UI state'),
        })));
        this._register(workbench.onDidShutdown(() => this.dispose()));
    }
    async initServices() {
        const serviceCollection = new ServiceCollection();
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Main Process
        const mainProcessService = this._register(new ElectronIPCMainProcessService(this.configuration.windowId));
        serviceCollection.set(IMainProcessService, mainProcessService);
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        serviceCollection.set(IProductService, productService);
        // Environment
        const environmentService = new NativeWorkbenchEnvironmentService(this.configuration, productService);
        serviceCollection.set(INativeWorkbenchEnvironmentService, environmentService);
        // Logger
        const loggers = this.configuration.loggers.map((loggerResource) => ({
            ...loggerResource,
            resource: URI.revive(loggerResource.resource),
        }));
        const loggerService = new LoggerChannelClient(this.configuration.windowId, this.configuration.logLevel, environmentService.windowLogsPath, loggers, mainProcessService.getChannel('logger'));
        serviceCollection.set(ILoggerService, loggerService);
        // Log
        const logService = this._register(new NativeLogService(loggerService, environmentService));
        serviceCollection.set(ILogService, logService);
        if (isCI) {
            logService.info('workbench#open()'); // marking workbench open helps to diagnose flaky integration/smoke tests
        }
        if (logService.getLevel() === LogLevel.Trace) {
            logService.trace('workbench#open(): with configuration', safeStringify({ ...this.configuration, nls: undefined /* exclude large property */ }));
        }
        // Default Account
        const defaultAccountService = this._register(new DefaultAccountService());
        serviceCollection.set(IDefaultAccountService, defaultAccountService);
        // Policies
        let policyService;
        const accountPolicy = new AccountPolicyService(logService, defaultAccountService);
        if (this.configuration.policiesData) {
            const policyChannel = new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy'));
            policyService = new MultiplexPolicyService([policyChannel, accountPolicy], logService);
        }
        else {
            policyService = accountPolicy;
        }
        serviceCollection.set(IPolicyService, policyService);
        // Shared Process
        const sharedProcessService = new SharedProcessService(this.configuration.windowId, logService);
        serviceCollection.set(ISharedProcessService, sharedProcessService);
        // Utility Process Worker
        const utilityProcessWorkerWorkbenchService = new UtilityProcessWorkerWorkbenchService(this.configuration.windowId, logService, mainProcessService);
        serviceCollection.set(IUtilityProcessWorkerWorkbenchService, utilityProcessWorkerWorkbenchService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Sign
        const signService = ProxyChannel.toService(mainProcessService.getChannel('sign'));
        serviceCollection.set(ISignService, signService);
        // Files
        const fileService = this._register(new FileService(logService));
        serviceCollection.set(IFileService, fileService);
        // Remote
        const remoteAuthorityResolverService = new RemoteAuthorityResolverService(productService, new ElectronRemoteResourceLoader(environmentService.window.id, mainProcessService, fileService));
        serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);
        // Local Files
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(mainProcessService, utilityProcessWorkerWorkbenchService, logService, loggerService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        serviceCollection.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({
            scheme: environmentService.userRoamingDataHome.scheme,
        }), mainProcessService.getChannel('userDataProfiles'));
        serviceCollection.set(IUserDataProfilesService, userDataProfilesService);
        const userDataProfileService = new UserDataProfileService(reviveProfile(this.configuration.profiles.profile, userDataProfilesService.profilesHome.scheme));
        serviceCollection.set(IUserDataProfileService, userDataProfileService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService)));
        // Remote Agent
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, new BrowserSocketFactory(null));
        serviceCollection.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        const remoteAgentService = this._register(new RemoteAgentService(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService));
        serviceCollection.set(IRemoteAgentService, remoteAgentService);
        // Remote Files
        this._register(RemoteFileSystemProviderClient.register(remoteAgentService, fileService, logService));
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Create services that require resolving in parallel
        const workspace = this.resolveWorkspaceIdentifier(environmentService);
        const [configurationService, storageService] = await Promise.all([
            this.createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService).then((service) => {
                // Workspace
                serviceCollection.set(IWorkspaceContextService, service);
                // Configuration
                serviceCollection.set(IWorkbenchConfigurationService, service);
                return service;
            }),
            this.createStorageService(workspace, environmentService, userDataProfileService, userDataProfilesService, mainProcessService).then((service) => {
                // Storage
                serviceCollection.set(IStorageService, service);
                return service;
            }),
            this.createKeyboardLayoutService(mainProcessService).then((service) => {
                // KeyboardLayout
                serviceCollection.set(INativeKeyboardLayoutService, service);
                return service;
            }),
        ]);
        // Workspace Trust Service
        const workspaceTrustEnablementService = new WorkspaceTrustEnablementService(configurationService, environmentService);
        serviceCollection.set(IWorkspaceTrustEnablementService, workspaceTrustEnablementService);
        const workspaceTrustManagementService = new WorkspaceTrustManagementService(configurationService, remoteAuthorityResolverService, storageService, uriIdentityService, environmentService, configurationService, workspaceTrustEnablementService, fileService);
        serviceCollection.set(IWorkspaceTrustManagementService, workspaceTrustManagementService);
        // Update workspace trust so that configuration is updated accordingly
        configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted())));
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        return { serviceCollection, logService, storageService, configurationService };
    }
    resolveWorkspaceIdentifier(environmentService) {
        // Return early for when a folder or multi-root is opened
        if (this.configuration.workspace) {
            return this.configuration.workspace;
        }
        // Otherwise, workspace is empty, so we derive an identifier
        return toWorkspaceIdentifier(this.configuration.backupPath, environmentService.isExtensionDevelopment);
    }
    async createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService) {
        const configurationCache = new ConfigurationCache([Schemas.file, Schemas.vscodeUserData] /* Cache all non native resources */, environmentService, fileService);
        const workspaceService = new WorkspaceService({ remoteAuthority: environmentService.remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService);
        try {
            await workspaceService.initialize(workspace);
            return workspaceService;
        }
        catch (error) {
            onUnexpectedError(error);
            return workspaceService;
        }
    }
    async createStorageService(workspace, environmentService, userDataProfileService, userDataProfilesService, mainProcessService) {
        const storageService = new NativeWorkbenchStorageService(workspace, userDataProfileService, userDataProfilesService, mainProcessService, environmentService);
        try {
            await storageService.initialize();
            return storageService;
        }
        catch (error) {
            onUnexpectedError(error);
            return storageService;
        }
    }
    async createKeyboardLayoutService(mainProcessService) {
        const keyboardLayoutService = new NativeKeyboardLayoutService(mainProcessService);
        try {
            await keyboardLayoutService.initialize();
            return keyboardLayoutService;
        }
        catch (error) {
            onUnexpectedError(error);
            return keyboardLayoutService;
        }
    }
}
export function main(configuration) {
    const workbench = new DesktopMain(configuration);
    return workbench.open();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvZGVza3RvcC5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxPQUFPLE1BQU0sMENBQTBDLENBQUE7QUFLOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDMUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGlDQUFpQyxHQUNqQyxNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3RHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUVyQixnQkFBZ0IsRUFDaEIscUJBQXFCLEdBQ3JCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFF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