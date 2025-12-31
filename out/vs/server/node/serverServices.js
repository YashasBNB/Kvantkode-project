/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { Emitter } from '../../base/common/event.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import * as path from '../../base/common/path.js';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../base/node/id.js';
import { Promises } from '../../base/node/pfs.js';
import { IPCServer, StaticRouter, } from '../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { ExtensionHostDebugBroadcastChannel } from '../../platform/debug/common/extensionHostDebugIpc.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadServiceChannelClient } from '../../platform/download/common/downloadIpc.js';
import { IEnvironmentService, INativeEnvironmentService, } from '../../platform/environment/common/environment.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService, } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ExtensionManagementChannel } from '../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService, } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, getLogLevel, ILoggerService, ILogService, log, LogLevel, LogLevelToString, } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestChannel } from '../../platform/request/common/requestIpc.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly, NullAppender, supportsTelemetry, } from '../../platform/telemetry/common/telemetryUtils.js';
import ErrorTelemetry from '../../platform/telemetry/node/errorTelemetry.js';
import { IPtyService } from '../../platform/terminal/common/terminal.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { RemoteAgentEnvironmentChannel } from './remoteAgentEnvironmentImpl.js';
import { RemoteAgentFileSystemProviderChannel } from './remoteFileSystemProviderServer.js';
import { ServerTelemetryChannel } from '../../platform/telemetry/common/remoteTelemetryChannel.js';
import { IServerTelemetryService, ServerNullTelemetryService, ServerTelemetryService, } from '../../platform/telemetry/common/serverTelemetryService.js';
import { RemoteTerminalChannel } from './remoteTerminalChannel.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { ServerEnvironmentService } from './serverEnvironmentService.js';
import { REMOTE_TERMINAL_CHANNEL_NAME } from '../../workbench/contrib/terminal/common/remote/remoteTerminalChannel.js';
import { REMOTE_FILE_SYSTEM_CHANNEL_NAME } from '../../workbench/services/remote/common/remoteFileSystemProviderClient.js';
import { ExtensionHostStatusService, IExtensionHostStatusService, } from './extensionHostStatusService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerChannel } from '../../platform/log/common/logIpc.js';
import { localize } from '../../nls.js';
import { RemoteExtensionsScannerChannel, RemoteExtensionsScannerService, } from './remoteExtensionsScanner.js';
import { RemoteExtensionsScannerChannelName } from '../../platform/remote/common/remoteExtensionsScanner.js';
import { RemoteUserDataProfilesServiceChannel } from '../../platform/userDataProfile/common/userDataProfileIpc.js';
import { NodePtyHostStarter } from '../../platform/terminal/node/nodePtyHostStarter.js';
import { CSSDevelopmentService, ICSSDevelopmentService, } from '../../platform/cssDev/node/cssDevService.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { TelemetryLogAppender } from '../../platform/telemetry/common/telemetryLogAppender.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName, } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperChannel } from '../../platform/mcp/node/nativeMcpDiscoveryHelperChannel.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
const eventPrefix = 'monacoworkbench';
export async function setupServerServices(connectionToken, args, REMOTE_DATA_FOLDER, disposables) {
    const services = new ServiceCollection();
    const socketServer = new SocketServer();
    const productService = { _serviceBrand: undefined, ...product };
    services.set(IProductService, productService);
    const environmentService = new ServerEnvironmentService(args, productService);
    services.set(IEnvironmentService, environmentService);
    services.set(INativeEnvironmentService, environmentService);
    const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
    services.set(ILoggerService, loggerService);
    socketServer.registerChannel('logger', new LoggerChannel(loggerService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    const logger = loggerService.createLogger('remoteagent', {
        name: localize('remoteExtensionLog', 'Server'),
    });
    const logService = new LogService(logger, [new ServerLogger(getLogLevel(environmentService))]);
    services.set(ILogService, logService);
    setTimeout(() => cleanupOlderLogs(environmentService.logsHome.with({ scheme: Schemas.file }).fsPath).then(null, (err) => logService.error(err)), 10000);
    logService.onDidChangeLogLevel((logLevel) => log(logService, logLevel, `Log level changed to ${LogLevelToString(logService.getLevel())}`));
    logService.trace(`Remote configuration data at ${REMOTE_DATA_FOLDER}`);
    logService.trace('process arguments:', environmentService.args);
    if (Array.isArray(productService.serverGreeting)) {
        logService.info(`\n\n${productService.serverGreeting.join('\n')}\n\n`);
    }
    // ExtensionHost Debug broadcast service
    socketServer.registerChannel(ExtensionHostDebugBroadcastChannel.ChannelName, new ExtensionHostDebugBroadcastChannel());
    // TODO: @Sandy @Joao need dynamic context based router
    const router = new StaticRouter((ctx) => ctx.clientId === 'renderer');
    // Files
    const fileService = disposables.add(new FileService(logService));
    services.set(IFileService, fileService);
    fileService.registerProvider(Schemas.file, disposables.add(new DiskFileSystemProvider(logService)));
    // URI Identity
    const uriIdentityService = new UriIdentityService(fileService);
    services.set(IUriIdentityService, uriIdentityService);
    // Configuration
    const configurationService = new ConfigurationService(environmentService.machineSettingsResource, fileService, new NullPolicyService(), logService);
    services.set(IConfigurationService, configurationService);
    // User Data Profiles
    const userDataProfilesService = new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService);
    services.set(IUserDataProfilesService, userDataProfilesService);
    socketServer.registerChannel('userDataProfiles', new RemoteUserDataProfilesServiceChannel(userDataProfilesService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    // Dev Only: CSS service (for ESM)
    services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
    // Initialize
    const [, , machineId, sqmId, devDeviceId] = await Promise.all([
        configurationService.initialize(),
        userDataProfilesService.init(),
        getMachineId(logService.error.bind(logService)),
        getSqmMachineId(logService.error.bind(logService)),
        getdevDeviceId(logService.error.bind(logService)),
    ]);
    const extensionHostStatusService = new ExtensionHostStatusService();
    services.set(IExtensionHostStatusService, extensionHostStatusService);
    // Request
    const requestService = new RequestService('remote', configurationService, environmentService, logService);
    services.set(IRequestService, requestService);
    let oneDsAppender = NullAppender;
    const isInternal = isInternalTelemetry(productService, configurationService);
    if (supportsTelemetry(productService, environmentService)) {
        if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
            oneDsAppender = new OneDataSystemAppender(requestService, isInternal, eventPrefix, null, productService.aiConfig.ariaKey);
            disposables.add(toDisposable(() => oneDsAppender?.flush())); // Ensure the AI appender is disposed so that it flushes remaining data
        }
        const config = {
            appenders: [
                oneDsAppender,
                new TelemetryLogAppender('', true, loggerService, environmentService, productService),
            ],
            commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version + '-remote', machineId, sqmId, devDeviceId, isInternal, 'remoteAgent'),
            piiPaths: getPiiPathsFromEnvironment(environmentService),
        };
        const initialTelemetryLevelArg = environmentService.args['telemetry-level'];
        let injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        // Convert the passed in CLI argument into a telemetry level for the telemetry service
        if (initialTelemetryLevelArg === 'all') {
            injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        }
        else if (initialTelemetryLevelArg === 'error') {
            injectedTelemetryLevel = 2 /* TelemetryLevel.ERROR */;
        }
        else if (initialTelemetryLevelArg === 'crash') {
            injectedTelemetryLevel = 1 /* TelemetryLevel.CRASH */;
        }
        else if (initialTelemetryLevelArg !== undefined) {
            injectedTelemetryLevel = 0 /* TelemetryLevel.NONE */;
        }
        services.set(IServerTelemetryService, new SyncDescriptor(ServerTelemetryService, [config, injectedTelemetryLevel]));
    }
    else {
        services.set(IServerTelemetryService, ServerNullTelemetryService);
    }
    services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(socketServer, productService));
    services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
    const downloadChannel = socketServer.getChannel('download', router);
    services.set(IDownloadService, new DownloadServiceChannelClient(downloadChannel, () => getUriTransformer('renderer') /* TODO: @Sandy @Joao need dynamic context based router */));
    services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
    services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
    services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
    services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
    services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
    services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
    const instantiationService = new InstantiationService(services);
    services.set(ILanguagePackService, instantiationService.createInstance(NativeLanguagePackService));
    const ptyHostStarter = instantiationService.createInstance(NodePtyHostStarter, {
        graceTime: 10800000 /* ProtocolConstants.ReconnectionGraceTime */,
        shortGraceTime: 300000 /* ProtocolConstants.ReconnectionShortGraceTime */,
        scrollback: configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100,
    });
    const ptyHostService = instantiationService.createInstance(PtyHostService, ptyHostStarter);
    services.set(IPtyService, ptyHostService);
    instantiationService.invokeFunction((accessor) => {
        const extensionManagementService = accessor.get(INativeServerExtensionManagementService);
        const extensionsScannerService = accessor.get(IExtensionsScannerService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const languagePackService = accessor.get(ILanguagePackService);
        const remoteExtensionEnvironmentChannel = new RemoteAgentEnvironmentChannel(connectionToken, environmentService, userDataProfilesService, extensionHostStatusService);
        socketServer.registerChannel('remoteextensionsenvironment', remoteExtensionEnvironmentChannel);
        const telemetryChannel = new ServerTelemetryChannel(accessor.get(IServerTelemetryService), oneDsAppender);
        socketServer.registerChannel('telemetry', telemetryChannel);
        socketServer.registerChannel(REMOTE_TERMINAL_CHANNEL_NAME, new RemoteTerminalChannel(environmentService, logService, ptyHostService, productService, extensionManagementService, configurationService));
        const remoteExtensionsScanner = new RemoteExtensionsScannerService(instantiationService.createInstance(ExtensionManagementCLI, logService), environmentService, userDataProfilesService, extensionsScannerService, logService, extensionGalleryService, languagePackService, extensionManagementService);
        socketServer.registerChannel(RemoteExtensionsScannerChannelName, new RemoteExtensionsScannerChannel(remoteExtensionsScanner, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        socketServer.registerChannel(NativeMcpDiscoveryHelperChannelName, instantiationService.createInstance(NativeMcpDiscoveryHelperChannel, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        const remoteFileSystemChannel = disposables.add(new RemoteAgentFileSystemProviderChannel(logService, environmentService, configurationService));
        socketServer.registerChannel(REMOTE_FILE_SYSTEM_CHANNEL_NAME, remoteFileSystemChannel);
        socketServer.registerChannel('request', new RequestChannel(accessor.get(IRequestService)));
        const channel = new ExtensionManagementChannel(extensionManagementService, (ctx) => getUriTransformer(ctx.remoteAuthority));
        socketServer.registerChannel('extensions', channel);
        // clean up extensions folder
        remoteExtensionsScanner.whenExtensionsReady().then(() => extensionManagementService.cleanUp());
        disposables.add(new ErrorTelemetry(accessor.get(ITelemetryService)));
        return {
            telemetryService: accessor.get(ITelemetryService),
        };
    });
    return { socketServer, instantiationService };
}
const _uriTransformerCache = Object.create(null);
function getUriTransformer(remoteAuthority) {
    if (!_uriTransformerCache[remoteAuthority]) {
        _uriTransformerCache[remoteAuthority] = createURITransformer(remoteAuthority);
    }
    return _uriTransformerCache[remoteAuthority];
}
export class SocketServer extends IPCServer {
    constructor() {
        const emitter = new Emitter();
        super(emitter.event);
        this._onDidConnectEmitter = emitter;
    }
    acceptConnection(protocol, onDidClientDisconnect) {
        this._onDidConnectEmitter.fire({ protocol, onDidClientDisconnect });
    }
}
class ServerLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.setLevel(logLevel);
        this.useColors = Boolean(process.stdout.isTTY);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn(`\x1b[93m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.warn(`[${now()}]`, message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error(`\x1b[91m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.error(`[${now()}]`, message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
function now() {
    const date = new Date();
    return `${twodigits(date.getHours())}:${twodigits(date.getMinutes())}:${twodigits(date.getSeconds())}`;
}
function twodigits(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return String(n);
}
/**
 * Cleans up older logs, while keeping the 10 most recent ones.
 */
async function cleanupOlderLogs(logsPath) {
    const currentLog = path.basename(logsPath);
    const logsRoot = path.dirname(logsPath);
    const children = await Promises.readdir(logsRoot);
    const allSessions = children.filter((name) => /^\d{8}T\d{6}$/.test(name));
    const oldSessions = allSessions.sort().filter((d) => d !== currentLog);
    const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 9));
    await Promise.all(toDelete.map((name) => Promises.rm(path.join(logsRoot, name))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyU2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXJTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN0QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEQsT0FBTyxLQUFLLElBQUksTUFBTSwyQkFBMkIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxFQUdOLFNBQVMsRUFDVCxZQUFZLEdBQ1osTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHlCQUF5QixHQUN6QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ2xJLE9B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