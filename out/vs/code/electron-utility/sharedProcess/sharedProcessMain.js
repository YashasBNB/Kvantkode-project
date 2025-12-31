/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { ProxyChannel, StaticRouter } from '../../../base/parts/ipc/common/ipc.js';
import { Server as UtilityProcessMessagePortServer, once, } from '../../../base/parts/ipc/node/ipc.mp.js';
import { CodeCacheCleaner } from './contrib/codeCacheCleaner.js';
import { LanguagePackCachedDataCleaner } from './contrib/languagePackCachedDataCleaner.js';
import { LocalizationsUpdater } from './contrib/localizationsUpdater.js';
import { LogsDataCleaner } from './contrib/logsDataCleaner.js';
import { UnusedWorkspaceStorageDataCleaner } from './contrib/storageDataCleaner.js';
import { IChecksumService } from '../../../platform/checksum/common/checksumService.js';
import { ChecksumService } from '../../../platform/checksum/node/checksumService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../platform/configuration/common/configurationService.js';
import { IDiagnosticsService } from '../../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsService } from '../../../platform/diagnostics/node/diagnosticsService.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { DownloadService } from '../../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionEnablementService.js';
import { ExtensionGalleryService } from '../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, IGlobalExtensionEnablementService, } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService, } from '../../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementChannel, ExtensionTipsChannel, } from '../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService, } from '../../../platform/extensionManagement/node/extensionManagementService.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, ILoggerService, ILogService, } from '../../../platform/log/common/log.js';
import { LoggerChannelClient } from '../../../platform/log/common/logIpc.js';
import product from '../../../platform/product/common/product.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { resolveCommonProperties } from '../../../platform/telemetry/common/commonProperties.js';
import { ICustomEndpointTelemetryService, ITelemetryService, } from '../../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderChannel } from '../../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryLogAppender } from '../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService } from '../../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullAppender, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly, } from '../../../platform/telemetry/common/telemetryUtils.js';
import { CustomEndpointTelemetryService } from '../../../platform/telemetry/node/customEndpointTelemetryService.js';
import { ExtensionStorageService, IExtensionStorageService, } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService, } from '../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration as registerUserDataSyncConfiguration, IUserDataSyncResourceProviderService, } from '../../../platform/userDataSync/common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService, } from '../../../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncAccountServiceChannel, UserDataSyncStoreManagementServiceChannel, } from '../../../platform/userDataSync/common/userDataSyncIpc.js';
import { UserDataSyncLogService } from '../../../platform/userDataSync/common/userDataSyncLog.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService, } from '../../../platform/userDataSync/common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../../platform/userDataSync/common/userDataSyncService.js';
import { UserDataSyncServiceChannel } from '../../../platform/userDataSync/common/userDataSyncServiceIpc.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService, } from '../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataProfileStorageService } from '../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { SharedProcessUserDataProfileStorageService } from '../../../platform/userDataProfile/node/userDataProfileStorageService.js';
import { ActiveWindowManager } from '../../../platform/windows/node/windowTracker.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ISharedTunnelsService } from '../../../platform/tunnel/common/tunnel.js';
import { SharedTunnelsService } from '../../../platform/tunnel/node/tunnelService.js';
import { ipcSharedProcessTunnelChannelName, ISharedProcessTunnelService, } from '../../../platform/remote/common/sharedProcessTunnelService.js';
import { SharedProcessTunnelService } from '../../../platform/tunnel/node/sharedProcessTunnelService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { isLinux } from '../../../base/common/platform.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME, } from '../../../platform/files/common/diskFileSystemProviderClient.js';
import { InspectProfilingService as V8InspectProfilingService } from '../../../platform/profiling/node/profilingService.js';
import { IV8InspectProfilingService } from '../../../platform/profiling/common/profiling.js';
import { IExtensionsScannerService } from '../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../../platform/extensionManagement/node/extensionsScannerService.js';
import { IUserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { PolicyChannelClient } from '../../../platform/policy/common/policyIpc.js';
import { IPolicyService, NullPolicyService } from '../../../platform/policy/common/policy.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { OneDataSystemAppender } from '../../../platform/telemetry/node/1dsAppender.js';
import { UserDataProfilesCleaner } from './contrib/userDataProfilesCleaner.js';
import { IRemoteTunnelService } from '../../../platform/remoteTunnel/common/remoteTunnel.js';
import { UserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { ExtensionsContributions } from './contrib/extensions.js';
import { localize } from '../../../nls.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { ISharedProcessLifecycleService, SharedProcessLifecycleService, } from '../../../platform/lifecycle/node/sharedProcessLifecycleService.js';
import { RemoteTunnelService } from '../../../platform/remoteTunnel/node/remoteTunnelService.js';
import { ExtensionsProfileScannerService } from '../../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { ExtensionRecommendationNotificationServiceChannelClient } from '../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { UserDataAutoSyncService } from '../../../platform/userDataSync/node/userDataAutoSyncService.js';
import { ExtensionTipsService } from '../../../platform/extensionManagement/node/extensionTipsService.js';
import { IMainProcessService, MainProcessService, } from '../../../platform/ipc/common/mainProcessService.js';
import { RemoteStorageService } from '../../../platform/storage/common/storageService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService, } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { nodeSocketFactory } from '../../../platform/remote/node/nodeSocketFactory.js';
import { NativeEnvironmentService } from '../../../platform/environment/node/environmentService.js';
import { SharedProcessRawConnection, SharedProcessLifecycle, } from '../../../platform/sharedProcess/common/sharedProcess.js';
import { getOSReleaseInfo } from '../../../base/node/osReleaseInfo.js';
import { getDesktopEnvironment } from '../../../base/common/desktopEnvironmentInfo.js';
import { getCodeDisplayProtocol, getDisplayProtocol, } from '../../../base/node/osDisplayProtocolInfo.js';
import { RequestService } from '../../../platform/request/electron-utility/requestService.js';
import { DefaultExtensionsInitializer } from './contrib/defaultExtensionsInitializer.js';
import { AllowedExtensionsService } from '../../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
import { ISharedWebContentExtractorService } from '../../../platform/webContentExtractor/common/webContentExtractor.js';
import { SharedWebContentExtractorService } from '../../../platform/webContentExtractor/node/sharedWebContentExtractorService.js';
class SharedProcessMain extends Disposable {
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.server = this._register(new UtilityProcessMessagePortServer(this));
        this.lifecycleService = undefined;
        this.onDidWindowConnectRaw = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        // Shared process lifecycle
        let didExit = false;
        const onExit = () => {
            if (!didExit) {
                didExit = true;
                this.lifecycleService?.fireOnWillShutdown();
                this.dispose();
            }
        };
        process.once('exit', onExit);
        once(process.parentPort, SharedProcessLifecycle.exit, onExit);
    }
    async init() {
        // Services
        const instantiationService = await this.initServices();
        // Config
        registerUserDataSyncConfiguration();
        instantiationService.invokeFunction((accessor) => {
            const logService = accessor.get(ILogService);
            const telemetryService = accessor.get(ITelemetryService);
            // Log info
            logService.trace('sharedProcess configuration', JSON.stringify(this.configuration));
            // Channels
            this.initChannels(accessor);
            // Error handler
            this.registerErrorHandler(logService);
            // Report Client OS/DE Info
            this.reportClientOSInfo(telemetryService, logService);
        });
        // Instantiate Contributions
        this._register(combinedDisposable(instantiationService.createInstance(CodeCacheCleaner, this.configuration.codeCachePath), instantiationService.createInstance(LanguagePackCachedDataCleaner), instantiationService.createInstance(UnusedWorkspaceStorageDataCleaner), instantiationService.createInstance(LogsDataCleaner), instantiationService.createInstance(LocalizationsUpdater), instantiationService.createInstance(ExtensionsContributions), instantiationService.createInstance(UserDataProfilesCleaner), instantiationService.createInstance(DefaultExtensionsInitializer)));
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Main Process
        const mainRouter = new StaticRouter((ctx) => ctx === 'main');
        const mainProcessService = new MainProcessService(this.server, mainRouter);
        services.set(IMainProcessService, mainProcessService);
        // Policies
        const policyService = this.configuration.policiesData
            ? new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy'))
            : new NullPolicyService();
        services.set(IPolicyService, policyService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.configuration.args, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Logger
        const loggerService = new LoggerChannelClient(undefined, this.configuration.logLevel, environmentService.logsHome, this.configuration.loggers.map((loggerResource) => ({
            ...loggerResource,
            resource: URI.revive(loggerResource.resource),
        })), mainProcessService.getChannel('logger'));
        services.set(ILoggerService, loggerService);
        // Log
        const sharedLogGroup = { id: 'shared', name: localize('sharedLog', 'Shared') };
        const logger = this._register(loggerService.createLogger('sharedprocess', {
            name: localize('sharedLog', 'Shared'),
            group: sharedLogGroup,
        }));
        const consoleLogger = this._register(new ConsoleLogger(logger.getLevel()));
        const logService = this._register(new LogService(logger, [consoleLogger]));
        services.set(ILogService, logService);
        // Lifecycle
        this.lifecycleService = this._register(new SharedProcessLifecycleService(logService));
        services.set(ISharedProcessLifecycleService, this.lifecycleService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({
            scheme: environmentService.userRoamingDataHome.scheme,
        }), mainProcessService.getChannel('userDataProfiles')));
        services.set(IUserDataProfilesService, userDataProfilesService);
        const userDataFileSystemProvider = this._register(new FileUserDataProvider(Schemas.file, 
        // Specifically for user data, use the disk file system provider
        // from the main process to enable atomic read/write operations.
        // Since user data can change very frequently across multiple
        // processes, we want a single process handling these operations.
        this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux })), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        fileService.registerProvider(Schemas.vscodeUserData, userDataFileSystemProvider);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Storage (global access only)
        const storageService = new RemoteStorageService(undefined, {
            defaultProfile: userDataProfilesService.defaultProfile,
            currentProfile: userDataProfilesService.defaultProfile,
        }, mainProcessService, environmentService);
        services.set(IStorageService, storageService);
        this._register(toDisposable(() => storageService.flush()));
        // Initialize config & storage in parallel
        await Promise.all([configurationService.initialize(), storageService.initialize()]);
        // Request
        const networkLogger = this._register(loggerService.createLogger(`network-shared`, {
            name: localize('networkk', 'Network'),
            group: sharedLogGroup,
        }));
        const requestService = new RequestService(configurationService, environmentService, this._register(new LogService(networkLogger)));
        services.set(IRequestService, requestService);
        // Checksum
        services.set(IChecksumService, new SyncDescriptor(ChecksumService, undefined, false /* proxied to other processes */));
        // V8 Inspect profiler
        services.set(IV8InspectProfilingService, new SyncDescriptor(V8InspectProfilingService, undefined, false /* proxied to other processes */));
        // Native Host
        const nativeHostService = new NativeHostService(-1 /* we are not running in a browser window context */, mainProcessService);
        services.set(INativeHostService, nativeHostService);
        // Download
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extension recommendations
        const activeWindowManager = this._register(new ActiveWindowManager(nativeHostService));
        const activeWindowRouter = new StaticRouter((ctx) => activeWindowManager.getActiveClientId().then((id) => ctx === id));
        services.set(IExtensionRecommendationNotificationService, new ExtensionRecommendationNotificationServiceChannelClient(this.server.getChannel('extensionRecommendationNotification', activeWindowRouter)));
        // Telemetry
        let telemetryService;
        const appenders = [];
        const internalTelemetry = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            const logAppender = new TelemetryLogAppender('', false, loggerService, environmentService, productService);
            appenders.push(logAppender);
            if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
                const collectorAppender = new OneDataSystemAppender(requestService, internalTelemetry, 'monacoworkbench', null, productService.aiConfig.ariaKey);
                this._register(toDisposable(() => collectorAppender.flush())); // Ensure the 1DS appender is disposed so that it flushes remaining data
                appenders.push(collectorAppender);
            }
            telemetryService = new TelemetryService({
                appenders,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, this.configuration.machineId, this.configuration.sqmId, this.configuration.devDeviceId, internalTelemetry),
                sendErrorTelemetry: true,
                piiPaths: getPiiPathsFromEnvironment(environmentService),
            }, configurationService, productService);
        }
        else {
            telemetryService = NullTelemetryService;
            const nullAppender = NullAppender;
            appenders.push(nullAppender);
        }
        this.server.registerChannel('telemetryAppender', new TelemetryAppenderChannel(appenders));
        services.set(ITelemetryService, telemetryService);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryService = new CustomEndpointTelemetryService(configurationService, telemetryService, loggerService, environmentService, productService);
        services.set(ICustomEndpointTelemetryService, customEndpointTelemetryService);
        // Extension Management
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        // Extension Gallery
        services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(this.server, productService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, undefined, true));
        // Extension Tips
        services.set(IExtensionTipsService, new SyncDescriptor(ExtensionTipsService, undefined, false /* Eagerly scans and computes exe based recommendations */));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsService, new SyncDescriptor(DiagnosticsService, undefined, false /* proxied to other processes */));
        // Settings Sync
        services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, undefined, true));
        services.set(IUserDataSyncLogService, new SyncDescriptor(UserDataSyncLogService, undefined, true));
        services.set(IUserDataSyncUtilService, ProxyChannel.toService(this.server.getChannel('userDataSyncUtil', (client) => client.ctx !== 'main')));
        services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, undefined, false /* Eagerly resets installed extensions */));
        services.set(IIgnoredExtensionsManagementService, new SyncDescriptor(IgnoredExtensionsManagementService, undefined, true));
        services.set(IExtensionStorageService, new SyncDescriptor(ExtensionStorageService));
        services.set(IUserDataSyncStoreManagementService, new SyncDescriptor(UserDataSyncStoreManagementService, undefined, true));
        services.set(IUserDataSyncStoreService, new SyncDescriptor(UserDataSyncStoreService, undefined, true));
        services.set(IUserDataSyncMachinesService, new SyncDescriptor(UserDataSyncMachinesService, undefined, true));
        services.set(IUserDataSyncLocalStoreService, new SyncDescriptor(UserDataSyncLocalStoreService, undefined, false /* Eagerly cleans up old backups */));
        services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, undefined, true));
        services.set(IUserDataSyncService, new SyncDescriptor(UserDataSyncService, undefined, false /* Initializes the Sync State */));
        services.set(IUserDataProfileStorageService, new SyncDescriptor(SharedProcessUserDataProfileStorageService, undefined, true));
        services.set(IUserDataSyncResourceProviderService, new SyncDescriptor(UserDataSyncResourceProviderService, undefined, true));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        services.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, nodeSocketFactory);
        services.set(ISharedTunnelsService, new SyncDescriptor(SharedTunnelsService));
        services.set(ISharedProcessTunnelService, new SyncDescriptor(SharedProcessTunnelService));
        // Remote Tunnel
        services.set(IRemoteTunnelService, new SyncDescriptor(RemoteTunnelService));
        // Web Content Extractor
        services.set(ISharedWebContentExtractorService, new SyncDescriptor(SharedWebContentExtractorService));
        return new InstantiationService(services);
    }
    initChannels(accessor) {
        // Extensions Management
        const channel = new ExtensionManagementChannel(accessor.get(IExtensionManagementService), () => null);
        this.server.registerChannel('extensions', channel);
        // Language Packs
        const languagePacksChannel = ProxyChannel.fromService(accessor.get(ILanguagePackService), this._store);
        this.server.registerChannel('languagePacks', languagePacksChannel);
        // Diagnostics
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsService), this._store);
        this.server.registerChannel('diagnostics', diagnosticsChannel);
        // Extension Tips
        const extensionTipsChannel = new ExtensionTipsChannel(accessor.get(IExtensionTipsService));
        this.server.registerChannel('extensionTipsService', extensionTipsChannel);
        // Checksum
        const checksumChannel = ProxyChannel.fromService(accessor.get(IChecksumService), this._store);
        this.server.registerChannel('checksum', checksumChannel);
        // Profiling
        const profilingChannel = ProxyChannel.fromService(accessor.get(IV8InspectProfilingService), this._store);
        this.server.registerChannel('v8InspectProfiling', profilingChannel);
        // Settings Sync
        const userDataSyncMachineChannel = ProxyChannel.fromService(accessor.get(IUserDataSyncMachinesService), this._store);
        this.server.registerChannel('userDataSyncMachines', userDataSyncMachineChannel);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryChannel = ProxyChannel.fromService(accessor.get(ICustomEndpointTelemetryService), this._store);
        this.server.registerChannel('customEndpointTelemetry', customEndpointTelemetryChannel);
        const userDataSyncAccountChannel = new UserDataSyncAccountServiceChannel(accessor.get(IUserDataSyncAccountService));
        this.server.registerChannel('userDataSyncAccount', userDataSyncAccountChannel);
        const userDataSyncStoreManagementChannel = new UserDataSyncStoreManagementServiceChannel(accessor.get(IUserDataSyncStoreManagementService));
        this.server.registerChannel('userDataSyncStoreManagement', userDataSyncStoreManagementChannel);
        const userDataSyncChannel = new UserDataSyncServiceChannel(accessor.get(IUserDataSyncService), accessor.get(IUserDataProfilesService), accessor.get(ILogService));
        this.server.registerChannel('userDataSync', userDataSyncChannel);
        const userDataAutoSync = this._register(accessor.get(IInstantiationService).createInstance(UserDataAutoSyncService));
        this.server.registerChannel('userDataAutoSync', ProxyChannel.fromService(userDataAutoSync, this._store));
        this.server.registerChannel('IUserDataSyncResourceProviderService', ProxyChannel.fromService(accessor.get(IUserDataSyncResourceProviderService), this._store));
        // Tunnel
        const sharedProcessTunnelChannel = ProxyChannel.fromService(accessor.get(ISharedProcessTunnelService), this._store);
        this.server.registerChannel(ipcSharedProcessTunnelChannelName, sharedProcessTunnelChannel);
        // Remote Tunnel
        const remoteTunnelChannel = ProxyChannel.fromService(accessor.get(IRemoteTunnelService), this._store);
        this.server.registerChannel('remoteTunnel', remoteTunnelChannel);
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(ISharedWebContentExtractorService), this._store);
        this.server.registerChannel('sharedWebContentExtractor', webContentExtractorChannel);
    }
    registerErrorHandler(logService) {
        // Listen on global error events
        process.on('uncaughtException', (error) => onUnexpectedError(error));
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
        // Install handler for unexpected errors
        setUnexpectedErrorHandler((error) => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in sharedProcess]: ${message}`);
        });
    }
    async reportClientOSInfo(telemetryService, logService) {
        if (isLinux) {
            const [releaseInfo, displayProtocol] = await Promise.all([
                getOSReleaseInfo(logService.error.bind(logService)),
                getDisplayProtocol(logService.error.bind(logService)),
            ]);
            const desktopEnvironment = getDesktopEnvironment();
            const codeSessionType = getCodeDisplayProtocol(displayProtocol, this.configuration.args['ozone-platform']);
            if (releaseInfo) {
                telemetryService.publicLog2('clientPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like,
                    desktopEnvironment: desktopEnvironment,
                    displayProtocol: displayProtocol,
                    codeDisplayProtocol: codeSessionType,
                });
            }
        }
    }
    handledClientConnection(e) {
        // This filter on message port messages will look for
        // attempts of a window to connect raw to the shared
        // process to handle these connections separate from
        // our IPC based protocol.
        if (e.data !== SharedProcessRawConnection.response) {
            return false;
        }
        const port = e.ports.at(0);
        if (port) {
            this.onDidWindowConnectRaw.fire(port);
            return true;
        }
        return false;
    }
}
export async function main(configuration) {
    // create shared process and signal back to main that we are
    // ready to accept message ports as client connections
    try {
        const sharedProcess = new SharedProcessMain(configuration);
        process.parentPort.postMessage(SharedProcessLifecycle.ipcReady);
        // await initialization and signal this back to electron-main
        await sharedProcess.init();
        process.parentPort.postMessage(SharedProcessLifecycle.initDone);
    }
    catch (error) {
        process.parentPort.postMessage({ error: error.toString() });
    }
}
const handle = setTimeout(() => {
    process.parentPort.postMessage({
        warning: '[SharedProcess] did not receive configuration within 30s...',
    });
}, 30000);
process.parentPort.once('message', (e) => {
    clearTimeout(handle);
    main(e.data);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9zaGFyZWRQcm9jZXNzTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUV0QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixNQUFNLElBQUksK0JBQStCLEVBQ3pDLElBQUksR0FDSixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzdILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2pILE9BQU8sRUFDTix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLDJCQUEyQixFQUMzQixxQkFBcUIsRUFDckIsaUNBQWlDLEdBQ2pDLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUNOLHFDQUFxQyxFQUNyQyxzQ0FBc0MsR0FDdEMsTUFBTSxxRkFBcUYsQ0FBQTtBQUM1RixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLG9CQUFvQixHQUNwQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsdUNBQXVDLEdBQ3ZDLE1BQU0sMEVBQTBFLENBQUE7QUFDakYsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDM0ksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixhQUFhLEVBQ2IsY0FBYyxFQUNkLFdBQVcsR0FFWCxNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2hHLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsaUJBQWlCLEdBQ2pCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDekYsT0FBTyxFQUNOLGlCQUFpQixFQUVqQixZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDbkgsT0FBTyxFQUNOLHVCQUF1QixFQUN2Qix3QkFBd0IsR0FDeEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLG1DQUFtQyxHQUNuQyxNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsdUJBQXVCLEVBQ3ZCLDhCQUE4QixFQUM5QixvQkFBb0IsRUFDcEIsbUNBQW1DLEVBQ25DLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIscUJBQXFCLElBQUksaUNBQWlDLEVBQzFELG9DQUFvQyxHQUNwQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsMEJBQTBCLEdBQzFCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFDdEgsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyx5Q0FBeUMsR0FDekMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDJCQUEyQixHQUMzQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3RILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzVHLE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMsd0JBQXdCLEdBQ3hCLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDMUgsT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDcEksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLDJCQUEyQixHQUMzQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDhCQUE4QixHQUM5QixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsSUFBSSx5QkFBeUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ2pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBQ2xJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsNkJBQTZCLEdBQzdCLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDL0gsT0FBTyxFQUFFLHVEQUF1RCxFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDMUosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDeEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDekcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixrQkFBa0IsR0FDbEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLDBCQUEwQixHQUMxQixNQUFNLCtEQUErRCxDQUFBO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25HLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsc0JBQXNCLEdBQ3RCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixrQkFBa0IsR0FDbEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDbkgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDM0gsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFDdkksT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDdkgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFFakksTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBT3pDLFlBQW9CLGFBQTBDO1FBQzdELEtBQUssRUFBRSxDQUFBO1FBRFksa0JBQWEsR0FBYixhQUFhLENBQTZCO1FBTjdDLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUUzRSxxQkFBZ0IsR0FBOEMsU0FBUyxDQUFBO1FBRTlELDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW1CLENBQUMsQ0FBQTtRQUt0RixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDJCQUEyQjtRQUMzQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDbkIsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEdBQUcsSUFBSSxDQUFBO2dCQUVkLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFBO2dCQUMzQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNULFdBQVc7UUFDWCxNQUFNLG9CQUFvQixHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRXRELFNBQVM7UUFDVCxpQ0FBaUMsRUFBRSxDQUFBO1FBRW5DLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ2hELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDNUMsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFeEQsV0FBVztZQUNYLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtZQUVuRixXQUFXO1lBQ1gsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUzQixnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBRXJDLDJCQUEyQjtZQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQUE7UUFFRiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FDYixrQkFBa0IsQ0FDakIsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQ3ZGLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxFQUNsRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsRUFDdEUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxFQUNwRCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsRUFDekQsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FDakUsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUV4QyxVQUFVO1FBQ1YsTUFBTSxjQUFjLEdBQUcsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUE7UUFDL0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFN0MsZUFBZTtRQUNmLE1BQU0sVUFBVSxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUE7UUFDNUQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDMUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXJELFdBQVc7UUFDWCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVk7WUFDcEQsQ0FBQyxDQUFDLElBQUksbUJBQW1CLENBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUMvQixrQkFBa0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQ3ZDO1lBQ0YsQ0FBQyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUMxQixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUUzQyxjQUFjO1FBQ2QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ2hHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUUzRCxTQUFTO1FBQ1QsTUFBTSxhQUFhLEdBQUcsSUFBSSxtQkFBbUIsQ0FDNUMsU0FBUyxFQUNULElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUMzQixrQkFBa0IsQ0FBQyxRQUFRLEVBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuRCxHQUFHLGNBQWM7WUFDakIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztTQUM3QyxDQUFDLENBQUMsRUFDSCxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQ3ZDLENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUUzQyxNQUFNO1FBQ04sTUFBTSxjQUFjLEdBQWdCLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFBO1FBQzNGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFO1lBQzNDLElBQUksRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQztZQUNyQyxLQUFLLEVBQUUsY0FBYztTQUNyQixDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVyQyxZQUFZO1FBQ1osSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFbkUsUUFBUTtRQUNSLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUV2QyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFFbEUsZUFBZTtRQUNmLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5RCxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFckQscUJBQXFCO1FBQ3JCLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0MsSUFBSSx1QkFBdUIsQ0FDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUMvQixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNqRCxNQUFNLEVBQUUsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsTUFBTTtTQUNyRCxDQUFDLEVBQ0Ysa0JBQWtCLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQ2pELENBQ0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUUvRCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hELElBQUksb0JBQW9CLENBQ3ZCLE9BQU8sQ0FBQyxJQUFJO1FBQ1osZ0VBQWdFO1FBQ2hFLGdFQUFnRTtRQUNoRSw2REFBNkQ7UUFDN0QsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSw0QkFBNEIsQ0FDL0Isa0JBQWtCLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLEVBQzdELEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQzlCLENBQ0QsRUFDRCxPQUFPLENBQUMsY0FBYyxFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBQ2xCLFVBQVUsQ0FDVixDQUNELENBQUE7UUFDRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBRWhGLGdCQUFnQjtRQUNoQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFDLElBQUksb0JBQW9CLENBQ3ZCLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdkQsV0FBVyxFQUNYLGFBQWEsRUFDYixVQUFVLENBQ1YsQ0FDRCxDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBRXpELCtCQUErQjtRQUMvQixNQUFNLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUM5QyxTQUFTLEVBQ1Q7WUFDQyxjQUFjLEVBQUUsdUJBQXVCLENBQUMsY0FBYztZQUN0RCxjQUFjLEVBQUUsdUJBQXVCLENBQUMsY0FBYztTQUN0RCxFQUNELGtCQUFrQixFQUNsQixrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUQsMENBQTBDO1FBQzFDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkYsVUFBVTtRQUNWLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLGFBQWEsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDO1lBQ3JDLEtBQUssRUFBRSxjQUFjO1NBQ3JCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQ3hDLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUM3QyxDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFN0MsV0FBVztRQUNYLFFBQVEsQ0FBQyxHQUFHLENBQ1gsZ0JBQWdCLEVBQ2hCLElBQUksY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQ3RGLENBQUE7UUFFRCxzQkFBc0I7UUFDdEIsUUFBUSxDQUFDLEdBQUcsQ0FDWCwwQkFBMEIsRUFDMUIsSUFBSSxjQUFjLENBQ2pCLHlCQUF5QixFQUN6QixTQUFTLEVBQ1QsS0FBSyxDQUFDLGdDQUFnQyxDQUN0QyxDQUNELENBQUE7UUFFRCxjQUFjO1FBQ2QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUM5QyxDQUFDLENBQUMsQ0FBQyxvREFBb0QsRUFDdkQsa0JBQWtCLENBQ0ksQ0FBQTtRQUN2QixRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFFbkQsV0FBVztRQUNYLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxjQUFjLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXBGLDRCQUE0QjtRQUM1QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ25ELG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQ2hFLENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUNYLDJDQUEyQyxFQUMzQyxJQUFJLHVEQUF1RCxDQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxxQ0FBcUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUNqRixDQUNELENBQUE7UUFFRCxZQUFZO1FBQ1osSUFBSSxnQkFBbUMsQ0FBQTtRQUN2QyxNQUFNLFNBQVMsR0FBeUIsRUFBRSxDQUFBO1FBQzFDLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsY0FBYyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDbkYsSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQzNELE1BQU0sV0FBVyxHQUFHLElBQUksb0JBQW9CLENBQzNDLEVBQUUsRUFDRixLQUFLLEVBQ0wsYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLENBQ2QsQ0FBQTtZQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUM1RixNQUFNLGlCQUFpQixHQUFHLElBQUkscUJBQXFCLENBQ2xELGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLElBQUksRUFDSixjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDL0IsQ0FBQTtnQkFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyx3RUFBd0U7Z0JBQ3RJLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDdEM7Z0JBQ0MsU0FBUztnQkFDVCxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FDeEMsT0FBTyxFQUFFLEVBQ1QsUUFBUSxFQUFFLEVBQ1YsT0FBTyxDQUFDLElBQUksRUFDWixjQUFjLENBQUMsTUFBTSxFQUNyQixjQUFjLENBQUMsT0FBTyxFQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQ3hCLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUM5QixpQkFBaUIsQ0FDakI7Z0JBQ0Qsa0JBQWtCLEVBQUUsSUFBSTtnQkFDeEIsUUFBUSxFQUFFLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDO2FBQ3hELEVBQ0Qsb0JBQW9CLEVBQ3BCLGNBQWMsQ0FDZCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQTtZQUN2QyxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUE7WUFDakMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUVqRCw0QkFBNEI7UUFDNUIsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLDhCQUE4QixDQUN4RSxvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIsY0FBYyxDQUNkLENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFLDhCQUE4QixDQUFDLENBQUE7UUFFN0UsdUJBQXVCO1FBQ3ZCLFFBQVEsQ0FBQyxHQUFHLENBQ1gsZ0NBQWdDLEVBQ2hDLElBQUksY0FBYyxDQUFDLCtCQUErQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDcEUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gseUJBQXlCLEVBQ3pCLElBQUksY0FBYyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDN0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsc0NBQXNDLEVBQ3RDLElBQUksY0FBYyxDQUFDLHFDQUFxQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDMUUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gseUJBQXlCLEVBQ3pCLElBQUksY0FBYyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDN0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsdUNBQXVDLEVBQ3ZDLElBQUksY0FBYyxDQUFDLDBCQUEwQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDL0QsQ0FBQTtRQUVELG9CQUFvQjtRQUNwQixRQUFRLENBQUMsR0FBRyxDQUNYLGdDQUFnQyxFQUNoQyxJQUFJLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQ25FLENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUNYLHdCQUF3QixFQUN4QixJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQzVELENBQUE7UUFFRCxpQkFBaUI7UUFDakIsUUFBUSxDQUFDLEdBQUcsQ0FDWCxxQkFBcUIsRUFDckIsSUFBSSxjQUFjLENBQ2pCLG9CQUFvQixFQUNwQixTQUFTLEVBQ1QsS0FBSyxDQUFDLDBEQUEwRCxDQUNoRSxDQUNELENBQUE7UUFFRCxnQkFBZ0I7UUFDaEIsUUFBUSxDQUFDLEdBQUcsQ0FDWCxvQkFBb0IsRUFDcEIsSUFBSSxjQUFjLENBQ2pCLHlCQUF5QixFQUN6QixTQUFTLEVBQ1QsS0FBSyxDQUFDLGdDQUFnQyxDQUN0QyxDQUNELENBQUE7UUFFRCxjQUFjO1FBQ2QsUUFBUSxDQUFDLEdBQUcsQ0FDWCxtQkFBbUIsRUFDbkIsSUFBSSxjQUFjLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUN6RixDQUFBO1FBRUQsZ0JBQWdCO1FBQ2hCLFFBQVEsQ0FBQyxHQUFHLENBQ1gsMkJBQTJCLEVBQzNCLElBQUksY0FBYyxDQUFDLDBCQUEwQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDL0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsdUJBQXVCLEVBQ3ZCLElBQUksY0FBYyxDQUFDLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDM0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsd0JBQXdCLEVBQ3hCLFlBQVksQ0FBQyxTQUFTLENBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxDQUM3RSxDQUNELENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUNYLGlDQUFpQyxFQUNqQyxJQUFJLGNBQWMsQ0FDakIsZ0NBQWdDLEVBQ2hDLFNBQVMsRUFDVCxLQUFLLENBQUMseUNBQXlDLENBQy9DLENBQ0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsbUNBQW1DLEVBQ25DLElBQUksY0FBYyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDdkUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFBO1FBQ25GLFFBQVEsQ0FBQyxHQUFHLENBQ1gsbUNBQW1DLEVBQ25DLElBQUksY0FBYyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDdkUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gseUJBQXlCLEVBQ3pCLElBQUksY0FBYyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDN0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsNEJBQTRCLEVBQzVCLElBQUksY0FBYyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDaEUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsOEJBQThCLEVBQzlCLElBQUksY0FBYyxDQUNqQiw2QkFBNkIsRUFDN0IsU0FBUyxFQUNULEtBQUssQ0FBQyxtQ0FBbUMsQ0FDekMsQ0FDRCxDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCw4QkFBOEIsRUFDOUIsSUFBSSxjQUFjLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUNsRSxDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCxvQkFBb0IsRUFDcEIsSUFBSSxjQUFjLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUMxRixDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCw4QkFBOEIsRUFDOUIsSUFBSSxjQUFjLENBQUMsMENBQTBDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUMvRSxDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCxvQ0FBb0MsRUFDcEMsSUFBSSxjQUFjLENBQUMsbUNBQW1DLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUN4RSxDQUFBO1FBRUQsVUFBVTtRQUNWLFFBQVEsQ0FBQyxHQUFHLENBQ1gsWUFBWSxFQUNaLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQ2xGLENBQUE7UUFFRCxTQUFTO1FBQ1QsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLDBCQUEwQixFQUFFLENBQUE7UUFDbkUsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLDBCQUEwQixDQUFDLFFBQVEseUNBQWlDLGlCQUFpQixDQUFDLENBQUE7UUFDdEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7UUFDN0UsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7UUFFekYsZ0JBQWdCO1FBQ2hCLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBRTNFLHdCQUF3QjtRQUN4QixRQUFRLENBQUMsR0FBRyxDQUNYLGlDQUFpQyxFQUNqQyxJQUFJLGNBQWMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUNwRCxDQUFBO1FBRUQsT0FBTyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTyxZQUFZLENBQUMsUUFBMEI7UUFDOUMsd0JBQXdCO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLElBQUksMEJBQTBCLENBQzdDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsRUFDekMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUNWLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbEQsaUJBQWlCO1FBQ2pCLE1BQU0sb0JBQW9CLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDcEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUVsRSxjQUFjO1FBQ2QsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNsRCxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQ2pDLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRTlELGlCQUFpQjtRQUNqQixNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUV6RSxXQUFXO1FBQ1gsTUFBTSxlQUFlLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUV4RCxZQUFZO1FBQ1osTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNoRCxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEVBQ3hDLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFFbkUsZ0JBQWdCO1FBQ2hCLE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDMUQsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxFQUMxQyxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBRS9FLDRCQUE0QjtRQUM1QixNQUFNLDhCQUE4QixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQzlELFFBQVEsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsRUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtRQUV0RixNQUFNLDBCQUEwQixHQUFHLElBQUksaUNBQWlDLENBQ3ZFLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FDekMsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFFOUUsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLHlDQUF5QyxDQUN2RixRQUFRLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQ2pELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyw2QkFBNkIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO1FBRTlGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwwQkFBMEIsQ0FDekQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQ3RDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQ3pCLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUVoRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RDLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FDM0UsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUMxQixrQkFBa0IsRUFDbEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQ3ZELENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDMUIsc0NBQXNDLEVBQ3RDLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FDekYsQ0FBQTtRQUVELFNBQVM7UUFDVCxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQzFELFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsRUFDekMsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsaUNBQWlDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUUxRixnQkFBZ0I7UUFDaEIsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNuRCxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLElBQUksQ0FBQyxNQUFNLENBQ1gsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRWhFLHdCQUF3QjtRQUN4QixNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQzFELFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsRUFDL0MsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsMkJBQTJCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBdUI7UUFDbkQsZ0NBQWdDO1FBQ2hDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQWUsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVoRix3Q0FBd0M7UUFDeEMseUJBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNuQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzNDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUVELFVBQVUsQ0FBQyxLQUFLLENBQUMsMENBQTBDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDdEUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUMvQixnQkFBbUMsRUFDbkMsVUFBdUI7UUFFdkIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUN4RCxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbkQsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDckQsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsRUFBRSxDQUFBO1lBQ2xELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxlQUFlLEVBQ2YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FDekMsQ0FBQTtZQUNELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBMkNqQixnQkFBZ0IsQ0FBQyxVQUFVLENBQzFCLG9CQUFvQixFQUNwQjtvQkFDQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQUU7b0JBQzFCLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxVQUFVO29CQUN6QyxjQUFjLEVBQUUsV0FBVyxDQUFDLE9BQU87b0JBQ25DLGtCQUFrQixFQUFFLGtCQUFrQjtvQkFDdEMsZUFBZSxFQUFFLGVBQWU7b0JBQ2hDLG1CQUFtQixFQUFFLGVBQWU7aUJBQ3BDLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHVCQUF1QixDQUFDLENBQWU7UUFDdEMscURBQXFEO1FBQ3JELG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsMEJBQTBCO1FBRTFCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVyQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsSUFBSSxDQUFDLGFBQTBDO0lBQ3BFLDREQUE0RDtJQUM1RCxzREFBc0Q7SUFFdEQsSUFBSSxDQUFDO1FBQ0osTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMxRCxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUUvRCw2REFBNkQ7UUFDN0QsTUFBTSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFMUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDOUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFDOUIsT0FBTyxFQUFFLDZEQUE2RDtLQUN0RSxDQUFDLENBQUE7QUFDSCxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFFVCxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUF3QixFQUFFLEVBQUU7SUFDL0QsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BCLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBbUMsQ0FBQyxDQUFBO0FBQzVDLENBQUMsQ0FBQyxDQUFBIn0=