/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mark } from '../../base/common/performance.js';
import { domContentLoaded, detectFullscreen, getCookieValue, getWindow, } from '../../base/browser/dom.js';
import { assertIsDefined } from '../../base/common/types.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILogService, ConsoleLogger, getLogLevel, ILoggerService, } from '../../platform/log/common/log.js';
import { ConsoleLogInAutomationLogger } from '../../platform/log/browser/log.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { BrowserWorkbenchEnvironmentService, IBrowserWorkbenchEnvironmentService, } from '../services/environment/browser/environmentService.js';
import { Workbench } from './workbench.js';
import { RemoteFileSystemProviderClient } from '../services/remote/common/remoteFileSystemProviderClient.js';
import { IProductService } from '../../platform/product/common/productService.js';
import product from '../../platform/product/common/product.js';
import { RemoteAgentService } from '../services/remote/browser/remoteAgentService.js';
import { RemoteAuthorityResolverService } from '../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService, } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { Schemas, connectionTokenCookieName } from '../../base/common/network.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE, isTemporaryWorkspace, isWorkspaceIdentifier, } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchConfigurationService } from '../services/configuration/common/configuration.js';
import { onUnexpectedError } from '../../base/common/errors.js';
import { setFullscreen } from '../../base/browser/browser.js';
import { URI } from '../../base/common/uri.js';
import { WorkspaceService } from '../services/configuration/browser/configurationService.js';
import { ConfigurationCache } from '../services/configuration/common/configurationCache.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/browser/signService.js';
import { BrowserStorageService } from '../services/storage/browser/storageService.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { toLocalISOString } from '../../base/common/date.js';
import { isWorkspaceToOpen, isFolderToOpen } from '../../platform/window/common/window.js';
import { getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier, } from '../services/workspaces/browser/workspaces.js';
import { InMemoryFileSystemProvider } from '../../platform/files/common/inMemoryFilesystemProvider.js';
import { ICommandService } from '../../platform/commands/common/commands.js';
import { IndexedDBFileSystemProvider } from '../../platform/files/browser/indexedDBFileSystemProvider.js';
import { BrowserRequestService } from '../services/request/browser/requestService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { IUserDataInitializationService, UserDataInitializationService, } from '../services/userData/browser/userDataInit.js';
import { UserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { localize, localize2 } from '../../nls.js';
import { Categories } from '../../platform/action/common/actionCommonCategories.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../services/host/browser/host.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { BrowserWindow } from './window.js';
import { ITimerService } from '../services/timer/browser/timerService.js';
import { WorkspaceTrustEnablementService, WorkspaceTrustManagementService, } from '../services/workspaces/common/workspaceTrust.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, } from '../../platform/workspace/common/workspaceTrust.js';
import { HTMLFileSystemProvider } from '../../platform/files/browser/htmlFileSystemProvider.js';
import { IOpenerService } from '../../platform/opener/common/opener.js';
import { mixin, safeStringify } from '../../base/common/objects.js';
import { IndexedDB } from '../../base/browser/indexedDB.js';
import { WebFileSystemAccess } from '../../platform/files/browser/webFileSystemAccess.js';
import { IProgressService } from '../../platform/progress/common/progress.js';
import { DelayedLogChannel } from '../services/output/common/delayedLogChannel.js';
import { dirname, joinPath } from '../../base/common/resources.js';
import { IUserDataProfilesService, } from '../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { IRemoteExplorerService } from '../services/remote/common/remoteExplorerService.js';
import { DisposableTunnel, TunnelProtocol } from '../../platform/tunnel/common/tunnel.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { UserDataProfileService } from '../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../services/userDataProfile/common/userDataProfile.js';
import { BrowserUserDataProfilesService } from '../../platform/userDataProfile/browser/userDataProfile.js';
import { DeferredPromise, timeout } from '../../base/common/async.js';
import { windowLogGroup, windowLogId } from '../services/log/common/logConstants.js';
import { LogService } from '../../platform/log/common/logService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService, } from '../../platform/remote/common/remoteSocketFactoryService.js';
import { BrowserSocketFactory } from '../../platform/remote/browser/browserSocketFactory.js';
import { VSBuffer } from '../../base/common/buffer.js';
import { UserDataProfileInitializer } from '../services/userDataProfile/browser/userDataProfileInit.js';
import { UserDataSyncInitializer } from '../services/userDataSync/browser/userDataSyncInit.js';
import { BrowserRemoteResourceLoader } from '../services/remote/browser/browserRemoteResourceHandler.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { FileLoggerService } from '../../platform/log/common/fileLog.js';
import { IEmbedderTerminalService } from '../services/terminal/common/embedderTerminalService.js';
import { BrowserSecretStorageService } from '../services/secrets/browser/secretStorageService.js';
import { EncryptionService } from '../services/encryption/browser/encryptionService.js';
import { IEncryptionService } from '../../platform/encryption/common/encryptionService.js';
import { ISecretStorageService } from '../../platform/secrets/common/secrets.js';
import { TunnelSource } from '../services/remote/common/tunnelModel.js';
import { mainWindow } from '../../base/browser/window.js';
import { INotificationService, Severity } from '../../platform/notification/common/notification.js';
export class BrowserMain extends Disposable {
    constructor(domElement, configuration) {
        super();
        this.domElement = domElement;
        this.configuration = configuration;
        this.onWillShutdownDisposables = this._register(new DisposableStore());
        this.indexedDBFileSystemProviders = [];
        this.init();
    }
    init() {
        // Browser config
        setFullscreen(!!detectFullscreen(mainWindow), mainWindow);
    }
    async open() {
        // Init services and wait for DOM to be ready in parallel
        const [services] = await Promise.all([
            this.initServices(),
            domContentLoaded(getWindow(this.domElement)),
        ]);
        // Create Workbench
        const workbench = new Workbench(this.domElement, undefined, services.serviceCollection, services.logService);
        // Listeners
        this.registerListeners(workbench);
        // Startup
        const instantiationService = workbench.startup();
        // Window
        this._register(instantiationService.createInstance(BrowserWindow));
        // Logging
        services.logService.trace('workbench#open with configuration', safeStringify(this.configuration));
        // Return API Facade
        return instantiationService.invokeFunction((accessor) => {
            const commandService = accessor.get(ICommandService);
            const lifecycleService = accessor.get(ILifecycleService);
            const timerService = accessor.get(ITimerService);
            const openerService = accessor.get(IOpenerService);
            const productService = accessor.get(IProductService);
            const progressService = accessor.get(IProgressService);
            const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
            const instantiationService = accessor.get(IInstantiationService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const labelService = accessor.get(ILabelService);
            const embedderTerminalService = accessor.get(IEmbedderTerminalService);
            const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
            const notificationService = accessor.get(INotificationService);
            async function showMessage(severity, message, ...items) {
                const choice = new DeferredPromise();
                const handle = notificationService.prompt(severity, message, items.map((item) => ({
                    label: item,
                    run: () => choice.complete(item),
                })));
                const disposable = handle.onDidClose(() => {
                    choice.complete(undefined);
                    disposable.dispose();
                });
                const result = await choice.p;
                handle.close();
                return result;
            }
            let logger = undefined;
            return {
                commands: {
                    executeCommand: (command, ...args) => commandService.executeCommand(command, ...args),
                },
                env: {
                    async getUriScheme() {
                        return productService.urlProtocol;
                    },
                    async retrievePerformanceMarks() {
                        await timerService.whenReady();
                        return timerService.getPerformanceMarks();
                    },
                    async openUri(uri) {
                        return openerService.open(uri, {});
                    },
                },
                logger: {
                    log: (level, message) => {
                        if (!logger) {
                            logger = instantiationService.createInstance(DelayedLogChannel, 'webEmbedder', productService.embedderIdentifier || productService.nameShort, joinPath(dirname(environmentService.logFile), 'webEmbedder.log'));
                        }
                        logger.log(level, message);
                    },
                },
                window: {
                    withProgress: (options, task) => progressService.withProgress(options, task),
                    createTerminal: async (options) => embedderTerminalService.createTerminal(options),
                    showInformationMessage: (message, ...items) => showMessage(Severity.Info, message, ...items),
                },
                workspace: {
                    didResolveRemoteAuthority: async () => {
                        if (!this.configuration.remoteAuthority) {
                            return;
                        }
                        await remoteAuthorityResolverService.resolveAuthority(this.configuration.remoteAuthority);
                    },
                    openTunnel: async (tunnelOptions) => {
                        const tunnel = assertIsDefined(await remoteExplorerService.forward({
                            remote: tunnelOptions.remoteAddress,
                            local: tunnelOptions.localAddressPort,
                            name: tunnelOptions.label,
                            source: {
                                source: TunnelSource.Extension,
                                description: labelService.getHostLabel(Schemas.vscodeRemote, this.configuration.remoteAuthority),
                            },
                            elevateIfNeeded: false,
                            privacy: tunnelOptions.privacy,
                        }, {
                            label: tunnelOptions.label,
                            elevateIfNeeded: undefined,
                            onAutoForward: undefined,
                            requireLocalPort: undefined,
                            protocol: tunnelOptions.protocol === TunnelProtocol.Https
                                ? tunnelOptions.protocol
                                : TunnelProtocol.Http,
                        }));
                        if (typeof tunnel === 'string') {
                            throw new Error(tunnel);
                        }
                        return new (class extends DisposableTunnel {
                        })({
                            port: tunnel.tunnelRemotePort,
                            host: tunnel.tunnelRemoteHost,
                        }, tunnel.localAddress, () => tunnel.dispose());
                    },
                },
                shutdown: () => lifecycleService.shutdown(),
            };
        });
    }
    registerListeners(workbench) {
        // Workbench Lifecycle
        this._register(workbench.onWillShutdown(() => this.onWillShutdownDisposables.clear()));
        this._register(workbench.onDidShutdown(() => this.dispose()));
    }
    async initServices() {
        const serviceCollection = new ServiceCollection();
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const workspace = this.resolveWorkspace();
        // Product
        const productService = mixin({ _serviceBrand: undefined, ...product }, this.configuration.productConfiguration);
        serviceCollection.set(IProductService, productService);
        // Environment
        const logsPath = URI.file(toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')).with({
            scheme: 'vscode-log',
        });
        const environmentService = new BrowserWorkbenchEnvironmentService(workspace.id, logsPath, this.configuration, productService);
        serviceCollection.set(IBrowserWorkbenchEnvironmentService, environmentService);
        // Files
        const fileLogger = new BufferLogger();
        const fileService = this._register(new FileService(fileLogger));
        serviceCollection.set(IFileService, fileService);
        // Logger
        const loggerService = new FileLoggerService(getLogLevel(environmentService), logsPath, fileService);
        serviceCollection.set(ILoggerService, loggerService);
        // Log Service
        const otherLoggers = [new ConsoleLogger(loggerService.getLogLevel())];
        if (environmentService.isExtensionDevelopment &&
            !!environmentService.extensionTestsLocationURI) {
            otherLoggers.push(new ConsoleLogInAutomationLogger(loggerService.getLogLevel()));
        }
        const logger = loggerService.createLogger(environmentService.logFile, {
            id: windowLogId,
            name: windowLogGroup.name,
            group: windowLogGroup,
        });
        const logService = new LogService(logger, otherLoggers);
        serviceCollection.set(ILogService, logService);
        // Set the logger of the fileLogger after the log service is ready.
        // This is to avoid cyclic dependency
        fileLogger.logger = logService;
        // Register File System Providers depending on IndexedDB support
        // Register them early because they are needed for the profiles initialization
        await this.registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath);
        const connectionToken = environmentService.options.connectionToken || getCookieValue(connectionTokenCookieName);
        const remoteResourceLoader = this.configuration.remoteResourceProvider
            ? new BrowserRemoteResourceLoader(fileService, this.configuration.remoteResourceProvider)
            : undefined;
        const resourceUriProvider = this.configuration.resourceUriProvider ?? remoteResourceLoader?.getResourceUriProvider();
        const remoteAuthorityResolverService = new RemoteAuthorityResolverService(!environmentService.expectsResolverExtension, connectionToken, resourceUriProvider, this.configuration.serverBasePath, productService, logService);
        serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);
        // Signing
        const signService = new SignService(productService);
        serviceCollection.set(ISignService, signService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        serviceCollection.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = new BrowserUserDataProfilesService(environmentService, fileService, uriIdentityService, logService);
        serviceCollection.set(IUserDataProfilesService, userDataProfilesService);
        const currentProfile = await this.getCurrentProfile(workspace, userDataProfilesService, environmentService);
        await userDataProfilesService.setProfileForWorkspace(workspace, currentProfile);
        const userDataProfileService = new UserDataProfileService(currentProfile);
        serviceCollection.set(IUserDataProfileService, userDataProfileService);
        // Remote Agent
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, new BrowserSocketFactory(this.configuration.webSocketFactory));
        serviceCollection.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        const remoteAgentService = this._register(new RemoteAgentService(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService));
        serviceCollection.set(IRemoteAgentService, remoteAgentService);
        this._register(RemoteFileSystemProviderClient.register(remoteAgentService, fileService, logService));
        // Long running services (workspace, config, storage)
        const [configurationService, storageService] = await Promise.all([
            this.createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService).then((service) => {
                // Workspace
                serviceCollection.set(IWorkspaceContextService, service);
                // Configuration
                serviceCollection.set(IWorkbenchConfigurationService, service);
                return service;
            }),
            this.createStorageService(workspace, logService, userDataProfileService).then((service) => {
                // Storage
                serviceCollection.set(IStorageService, service);
                return service;
            }),
        ]);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Workspace Trust Service
        const workspaceTrustEnablementService = new WorkspaceTrustEnablementService(configurationService, environmentService);
        serviceCollection.set(IWorkspaceTrustEnablementService, workspaceTrustEnablementService);
        const workspaceTrustManagementService = new WorkspaceTrustManagementService(configurationService, remoteAuthorityResolverService, storageService, uriIdentityService, environmentService, configurationService, workspaceTrustEnablementService, fileService);
        serviceCollection.set(IWorkspaceTrustManagementService, workspaceTrustManagementService);
        // Update workspace trust so that configuration is updated accordingly
        configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted())));
        // Request Service
        const requestService = new BrowserRequestService(remoteAgentService, configurationService, loggerService);
        serviceCollection.set(IRequestService, requestService);
        // Userdata Sync Store Management Service
        const userDataSyncStoreManagementService = new UserDataSyncStoreManagementService(productService, configurationService, storageService);
        serviceCollection.set(IUserDataSyncStoreManagementService, userDataSyncStoreManagementService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const encryptionService = new EncryptionService();
        serviceCollection.set(IEncryptionService, encryptionService);
        const secretStorageService = new BrowserSecretStorageService(storageService, encryptionService, environmentService, logService);
        serviceCollection.set(ISecretStorageService, secretStorageService);
        // Userdata Initialize Service
        const userDataInitializers = [];
        userDataInitializers.push(new UserDataSyncInitializer(environmentService, secretStorageService, userDataSyncStoreManagementService, fileService, userDataProfilesService, storageService, productService, requestService, logService, uriIdentityService));
        if (environmentService.options.profile) {
            userDataInitializers.push(new UserDataProfileInitializer(environmentService, fileService, userDataProfileService, storageService, logService, uriIdentityService, requestService));
        }
        const userDataInitializationService = new UserDataInitializationService(userDataInitializers);
        serviceCollection.set(IUserDataInitializationService, userDataInitializationService);
        try {
            await Promise.race([
                // Do not block more than 5s
                timeout(5000),
                this.initializeUserData(userDataInitializationService, configurationService),
            ]);
        }
        catch (error) {
            logService.error(error);
        }
        return { serviceCollection, configurationService, logService };
    }
    async initializeUserData(userDataInitializationService, configurationService) {
        if (await userDataInitializationService.requiresInitialization()) {
            mark('code/willInitRequiredUserData');
            // Initialize required resources - settings & global state
            await userDataInitializationService.initializeRequiredResources();
            // Important: Reload only local user configuration after initializing
            // Reloading complete configuration blocks workbench until remote configuration is loaded.
            await configurationService.reloadLocalUserConfiguration();
            mark('code/didInitRequiredUserData');
        }
    }
    async registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath) {
        // IndexedDB is used for logging and user data
        let indexedDB;
        const userDataStore = 'vscode-userdata-store';
        const logsStore = 'vscode-logs-store';
        const handlesStore = 'vscode-filehandles-store';
        try {
            indexedDB = await IndexedDB.create('vscode-web-db', 3, [
                userDataStore,
                logsStore,
                handlesStore,
            ]);
            // Close onWillShutdown
            this.onWillShutdownDisposables.add(toDisposable(() => indexedDB?.close()));
        }
        catch (error) {
            logService.error('Error while creating IndexedDB', error);
        }
        // Logger
        if (indexedDB) {
            const logFileSystemProvider = new IndexedDBFileSystemProvider(logsPath.scheme, indexedDB, logsStore, false);
            this.indexedDBFileSystemProviders.push(logFileSystemProvider);
            fileService.registerProvider(logsPath.scheme, logFileSystemProvider);
        }
        else {
            fileService.registerProvider(logsPath.scheme, new InMemoryFileSystemProvider());
        }
        // User data
        let userDataProvider;
        if (indexedDB) {
            userDataProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, userDataStore, true);
            this.indexedDBFileSystemProviders.push(userDataProvider);
            this.registerDeveloperActions(userDataProvider);
        }
        else {
            logService.info('Using in-memory user data provider');
            userDataProvider = new InMemoryFileSystemProvider();
        }
        fileService.registerProvider(Schemas.vscodeUserData, userDataProvider);
        // Local file access (if supported by browser)
        if (WebFileSystemAccess.supported(mainWindow)) {
            fileService.registerProvider(Schemas.file, new HTMLFileSystemProvider(indexedDB, handlesStore, logService));
        }
        // In-memory
        fileService.registerProvider(Schemas.tmp, new InMemoryFileSystemProvider());
    }
    registerDeveloperActions(provider) {
        this._register(registerAction2(class ResetUserDataAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.resetUserData',
                    title: localize2('reset', 'Reset User Data'),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette,
                    },
                });
            }
            async run(accessor) {
                const dialogService = accessor.get(IDialogService);
                const hostService = accessor.get(IHostService);
                const storageService = accessor.get(IStorageService);
                const logService = accessor.get(ILogService);
                const result = await dialogService.confirm({
                    message: localize('reset user data message', 'Would you like to reset your data (settings, keybindings, extensions, snippets and UI State) and reload?'),
                });
                if (result.confirmed) {
                    try {
                        await provider?.reset();
                        if (storageService instanceof BrowserStorageService) {
                            await storageService.clear();
                        }
                    }
                    catch (error) {
                        logService.error(error);
                        throw error;
                    }
                }
                hostService.reload();
            }
        }));
    }
    async createStorageService(workspace, logService, userDataProfileService) {
        const storageService = new BrowserStorageService(workspace, userDataProfileService, logService);
        try {
            await storageService.initialize();
            // Register to close on shutdown
            this.onWillShutdownDisposables.add(toDisposable(() => storageService.close()));
            return storageService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return storageService;
        }
    }
    async createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService) {
        // Temporary workspaces do not exist on startup because they are
        // just in memory. As such, detect this case and eagerly create
        // the workspace file empty so that it is a valid workspace.
        if (isWorkspaceIdentifier(workspace) && isTemporaryWorkspace(workspace.configPath)) {
            try {
                const emptyWorkspace = { folders: [] };
                await fileService.createFile(workspace.configPath, VSBuffer.fromString(JSON.stringify(emptyWorkspace, null, '\t')), { overwrite: false });
            }
            catch (error) {
                // ignore if workspace file already exists
            }
        }
        const configurationCache = new ConfigurationCache([Schemas.file, Schemas.vscodeUserData, Schemas.tmp] /* Cache all non native resources */, environmentService, fileService);
        const workspaceService = new WorkspaceService({ remoteAuthority: this.configuration.remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, new NullPolicyService());
        try {
            await workspaceService.initialize(workspace);
            return workspaceService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return workspaceService;
        }
    }
    async getCurrentProfile(workspace, userDataProfilesService, environmentService) {
        const profileName = environmentService.options?.profile?.name ?? environmentService.profile;
        if (profileName) {
            const profile = userDataProfilesService.profiles.find((p) => p.name === profileName);
            if (profile) {
                return profile;
            }
            return userDataProfilesService.createNamedProfile(profileName, undefined, workspace);
        }
        return (userDataProfilesService.getProfileForWorkspace(workspace) ??
            userDataProfilesService.defaultProfile);
    }
    resolveWorkspace() {
        let workspace = undefined;
        if (this.configuration.workspaceProvider) {
            workspace = this.configuration.workspaceProvider.workspace;
        }
        // Multi-root workspace
        if (workspace && isWorkspaceToOpen(workspace)) {
            return getWorkspaceIdentifier(workspace.workspaceUri);
        }
        // Single-folder workspace
        if (workspace && isFolderToOpen(workspace)) {
            return getSingleFolderWorkspaceIdentifier(workspace.folderUri);
        }
        // Empty window workspace
        return UNKNOWN_EMPTY_WINDOW_WORKSPACE;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLm1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93ZWIubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFNBQVMsR0FDVCxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sV0FBVyxFQUNYLGFBQWEsRUFDYixXQUFXLEVBQ1gsY0FBYyxHQUVkLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUYsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxtQ0FBbUMsR0FDbkMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDMUMsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFNUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pGLE9BQU8sT0FBTyxNQUFNLDBDQUEwQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ2hILE9BQU8sRUFDTiwr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