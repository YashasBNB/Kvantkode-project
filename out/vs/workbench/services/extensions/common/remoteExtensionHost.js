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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9yZW1vdGVFeHRlbnNpb25Ib3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBSS9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBR04sK0JBQStCLEdBQy9CLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUNOLCtCQUErQixHQUUvQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkYsT0FB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