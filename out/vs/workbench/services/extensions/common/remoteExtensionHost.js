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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { connectRemoteAgentExtensionHost, } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IRemoteAuthorityResolverService, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteSocketFactoryService } from '../../../../platform/remote/common/remoteSocketFactoryService.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { parseExtensionDevOptions } from './extensionDevOptions.js';
import { UIKind, createMessageOfType, isMessageOfType, } from './extensionHostProtocol.js';
let RemoteExtensionHost = class RemoteExtensionHost extends Disposable {
    constructor(runningLocation, _initDataProvider, remoteSocketFactoryService, _contextService, _environmentService, _telemetryService, _logService, _loggerService, _labelService, remoteAuthorityResolverService, _extensionHostDebugService, _productService, _signService) {
        super();
        this.runningLocation = runningLocation;
        this._initDataProvider = _initDataProvider;
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this._contextService = _contextService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._labelService = _labelService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this._extensionHostDebugService = _extensionHostDebugService;
        this._productService = _productService;
        this._signService = _signService;
        this.pid = null;
        this.startup = 1 /* ExtensionHostStartup.EagerAutoStart */;
        this.extensions = null;
        this._onExit = this._register(new Emitter());
        this.onExit = this._onExit.event;
        this._hasDisconnected = false;
        this.remoteAuthority = this._initDataProvider.remoteAuthority;
        this._protocol = null;
        this._hasLostConnection = false;
        this._terminating = false;
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevHost = devOpts.isExtensionDevHost;
    }
    start() {
        const options = {
            commit: this._productService.commit,
            quality: this._productService.quality,
            addressProvider: {
                getAddress: async () => {
                    const { authority } = await this.remoteAuthorityResolverService.resolveAuthority(this._initDataProvider.remoteAuthority);
                    return { connectTo: authority.connectTo, connectionToken: authority.connectionToken };
                },
            },
            remoteSocketFactoryService: this.remoteSocketFactoryService,
            signService: this._signService,
            logService: this._logService,
            ipcLogger: null,
        };
        return this.remoteAuthorityResolverService
            .resolveAuthority(this._initDataProvider.remoteAuthority)
            .then((resolverResult) => {
            const startParams = {
                language: platform.language,
                debugId: this._environmentService.debugExtensionHost.debugId,
                break: this._environmentService.debugExtensionHost.break,
                port: this._environmentService.debugExtensionHost.port,
                env: {
                    ...this._environmentService.debugExtensionHost.env,
                    ...resolverResult.options?.extensionHostEnv,
                },
            };
            const extDevLocs = this._environmentService.extensionDevelopmentLocationURI;
            let debugOk = true;
            if (extDevLocs && extDevLocs.length > 0) {
                // TODO@AW: handles only first path in array
                if (extDevLocs[0].scheme === Schemas.file) {
                    debugOk = false;
                }
            }
            if (!debugOk) {
                startParams.break = false;
            }
            return connectRemoteAgentExtensionHost(options, startParams).then((result) => {
                this._register(result);
                const { protocol, debugPort, reconnectionToken } = result;
                const isExtensionDevelopmentDebug = typeof debugPort === 'number';
                if (debugOk &&
                    this._environmentService.isExtensionDevelopment &&
                    this._environmentService.debugExtensionHost.debugId &&
                    debugPort) {
                    this._extensionHostDebugService.attachSession(this._environmentService.debugExtensionHost.debugId, debugPort, this._initDataProvider.remoteAuthority);
                }
                protocol.onDidDispose(() => {
                    this._onExtHostConnectionLost(reconnectionToken);
                });
                protocol.onSocketClose(() => {
                    if (this._isExtensionDevHost) {
                        this._onExtHostConnectionLost(reconnectionToken);
                    }
                });
                // 1) wait for the incoming `ready` event and send the initialization data.
                // 2) wait for the incoming `initialized` event.
                return new Promise((resolve, reject) => {
                    const handle = setTimeout(() => {
                        reject('The remote extension host took longer than 60s to send its ready message.');
                    }, 60 * 1000);
                    const disposable = protocol.onMessage((msg) => {
                        if (isMessageOfType(msg, 1 /* MessageType.Ready */)) {
                            // 1) Extension Host is ready to receive messages, initialize it
                            this._createExtHostInitData(isExtensionDevelopmentDebug).then((data) => {
                                protocol.send(VSBuffer.fromString(JSON.stringify(data)));
                            });
                            return;
                        }
                        if (isMessageOfType(msg, 0 /* MessageType.Initialized */)) {
                            // 2) Extension Host is initialized
                            clearTimeout(handle);
                            // stop listening for messages here
                            disposable.dispose();
                            // release this promise
                            this._protocol = protocol;
                            resolve(protocol);
                            return;
                        }
                        console.error(`received unexpected message during handshake phase from the extension host: `, msg);
                    });
                });
            });
        });
    }
    _onExtHostConnectionLost(reconnectionToken) {
        if (this._hasLostConnection) {
            // avoid re-entering this method
            return;
        }
        this._hasLostConnection = true;
        if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId) {
            this._extensionHostDebugService.close(this._environmentService.debugExtensionHost.debugId);
        }
        if (this._terminating) {
            // Expected termination path (we asked the process to terminate)
            return;
        }
        this._onExit.fire([0, reconnectionToken]);
    }
    async _createExtHostInitData(isExtensionDevelopmentDebug) {
        const remoteInitData = await this._initDataProvider.getInitData();
        this.extensions = remoteInitData.extensions;
        const workspace = this._contextService.getWorkspace();
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: remoteInitData.pid,
            environment: {
                isExtensionDevelopmentDebug,
                appRoot: remoteInitData.appRoot,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier || 'desktop',
                appUriScheme: this._productService.urlProtocol,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                appLanguage: platform.language,
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: remoteInitData.globalStorageHome,
                workspaceStorageHome: remoteInitData.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel,
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
                ? null
                : {
                    configuration: workspace.configuration,
                    id: workspace.id,
                    name: this._labelService.getWorkspaceLabel(workspace),
                    transient: workspace.transient,
                },
            remote: {
                isRemote: true,
                authority: this._initDataProvider.remoteAuthority,
                connectionData: remoteInitData.connectionData,
            },
            consoleForward: {
                includeStack: false,
                logNative: Boolean(this._environmentService.debugExtensionHost.debugId),
            },
            extensions: this.extensions.toSnapshot(),
            telemetryInfo: {
                sessionId: this._telemetryService.sessionId,
                machineId: this._telemetryService.machineId,
                sqmId: this._telemetryService.sqmId,
                devDeviceId: this._telemetryService.devDeviceId,
                firstSessionDate: this._telemetryService.firstSessionDate,
                msftInternal: this._telemetryService.msftInternal,
            },
            logLevel: this._logService.getLevel(),
            loggers: [...this._loggerService.getRegisteredLoggers()],
            logsLocation: remoteInitData.extensionHostLogsPath,
            autoStart: this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */,
            uiKind: platform.isWeb ? UIKind.Web : UIKind.Desktop,
        };
    }
    getInspectPort() {
        return undefined;
    }
    enableInspectPort() {
        return Promise.resolve(false);
    }
    async disconnect() {
        if (this._protocol && !this._hasDisconnected) {
            this._protocol.send(createMessageOfType(2 /* MessageType.Terminate */));
            this._protocol.sendDisconnect();
            this._hasDisconnected = true;
            await this._protocol.drain();
        }
    }
    dispose() {
        super.dispose();
        this._terminating = true;
        this.disconnect();
        if (this._protocol) {
            // Send the extension host a request to terminate itself
            // (graceful termination)
            // setTimeout(() => {
            // console.log(`SENDING TERMINATE TO REMOTE EXT HOST!`);
            this._protocol.getSocket().end();
            // this._protocol.drain();
            this._protocol = null;
            // }, 1000);
        }
    }
};
RemoteExtensionHost = __decorate([
    __param(2, IRemoteSocketFactoryService),
    __param(3, IWorkspaceContextService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, ILoggerService),
    __param(8, ILabelService),
    __param(9, IRemoteAuthorityResolverService),
    __param(10, IExtensionHostDebugService),
    __param(11, IProductService),
    __param(12, ISignService)
], RemoteExtensionHost);
export { RemoteExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL3JlbW90ZUV4dGVuc2lvbkhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFJL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFHTiwrQkFBK0IsR0FDL0IsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2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