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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getDelayedChannel, IPCLogger, } from '../../../../base/parts/ipc/common/ipc.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { connectRemoteAgentManagement, } from '../../../../platform/remote/common/remoteAgentConnection.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { RemoteExtensionEnvironmentChannelClient } from './remoteAgentEnvironmentChannel.js';
import { Emitter } from '../../../../base/common/event.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteSocketFactoryService } from '../../../../platform/remote/common/remoteSocketFactoryService.js';
let AbstractRemoteAgentService = class AbstractRemoteAgentService extends Disposable {
    constructor(remoteSocketFactoryService, userDataProfileService, _environmentService, productService, _remoteAuthorityResolverService, signService, logService) {
        super();
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this.userDataProfileService = userDataProfileService;
        this._environmentService = _environmentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        if (this._environmentService.remoteAuthority) {
            this._connection = this._register(new RemoteAgentConnection(this._environmentService.remoteAuthority, productService.commit, productService.quality, this.remoteSocketFactoryService, this._remoteAuthorityResolverService, signService, logService));
        }
        else {
            this._connection = null;
        }
        this._environment = null;
    }
    getConnection() {
        return this._connection;
    }
    getEnvironment() {
        return this.getRawEnvironment().then(undefined, () => null);
    }
    getRawEnvironment() {
        if (!this._environment) {
            this._environment = this._withChannel(async (channel, connection) => {
                const env = await RemoteExtensionEnvironmentChannelClient.getEnvironmentData(channel, connection.remoteAuthority, this.userDataProfileService.currentProfile.isDefault
                    ? undefined
                    : this.userDataProfileService.currentProfile.id);
                this._remoteAuthorityResolverService._setAuthorityConnectionToken(connection.remoteAuthority, env.connectionToken);
                return env;
            }, null);
        }
        return this._environment;
    }
    getExtensionHostExitInfo(reconnectionToken) {
        return this._withChannel((channel, connection) => RemoteExtensionEnvironmentChannelClient.getExtensionHostExitInfo(channel, connection.remoteAuthority, reconnectionToken), null);
    }
    getDiagnosticInfo(options) {
        return this._withChannel((channel) => RemoteExtensionEnvironmentChannelClient.getDiagnosticInfo(channel, options), undefined);
    }
    updateTelemetryLevel(telemetryLevel) {
        return this._withTelemetryChannel((channel) => RemoteExtensionEnvironmentChannelClient.updateTelemetryLevel(channel, telemetryLevel), undefined);
    }
    logTelemetry(eventName, data) {
        return this._withTelemetryChannel((channel) => RemoteExtensionEnvironmentChannelClient.logTelemetry(channel, eventName, data), undefined);
    }
    flushTelemetry() {
        return this._withTelemetryChannel((channel) => RemoteExtensionEnvironmentChannelClient.flushTelemetry(channel), undefined);
    }
    getRoundTripTime() {
        return this._withTelemetryChannel(async (channel) => {
            const start = Date.now();
            await RemoteExtensionEnvironmentChannelClient.ping(channel);
            return Date.now() - start;
        }, undefined);
    }
    async endConnection() {
        if (this._connection) {
            await this._connection.end();
            this._connection.dispose();
        }
    }
    _withChannel(callback, fallback) {
        const connection = this.getConnection();
        if (!connection) {
            return Promise.resolve(fallback);
        }
        return connection.withChannel('remoteextensionsenvironment', (channel) => callback(channel, connection));
    }
    _withTelemetryChannel(callback, fallback) {
        const connection = this.getConnection();
        if (!connection) {
            return Promise.resolve(fallback);
        }
        return connection.withChannel('telemetry', (channel) => callback(channel, connection));
    }
};
AbstractRemoteAgentService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, IUserDataProfileService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IProductService),
    __param(4, IRemoteAuthorityResolverService),
    __param(5, ISignService),
    __param(6, ILogService)
], AbstractRemoteAgentService);
export { AbstractRemoteAgentService };
class RemoteAgentConnection extends Disposable {
    constructor(remoteAuthority, _commit, _quality, _remoteSocketFactoryService, _remoteAuthorityResolverService, _signService, _logService) {
        super();
        this._commit = _commit;
        this._quality = _quality;
        this._remoteSocketFactoryService = _remoteSocketFactoryService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._signService = _signService;
        this._logService = _logService;
        this._onReconnecting = this._register(new Emitter());
        this.onReconnecting = this._onReconnecting.event;
        this._onDidStateChange = this._register(new Emitter());
        this.onDidStateChange = this._onDidStateChange.event;
        this.end = () => Promise.resolve();
        this.remoteAuthority = remoteAuthority;
        this._connection = null;
    }
    getChannel(channelName) {
        return (getDelayedChannel(this._getOrCreateConnection().then((c) => c.getChannel(channelName))));
    }
    withChannel(channelName, callback) {
        const channel = this.getChannel(channelName);
        const result = callback(channel);
        return result;
    }
    registerChannel(channelName, channel) {
        this._getOrCreateConnection().then((client) => client.registerChannel(channelName, channel));
    }
    async getInitialConnectionTimeMs() {
        try {
            await this._getOrCreateConnection();
        }
        catch {
            // ignored -- time is measured even if connection fails
        }
        return this._initialConnectionMs;
    }
    _getOrCreateConnection() {
        if (!this._connection) {
            this._connection = this._createConnection();
        }
        return this._connection;
    }
    async _createConnection() {
        let firstCall = true;
        const options = {
            commit: this._commit,
            quality: this._quality,
            addressProvider: {
                getAddress: async () => {
                    if (firstCall) {
                        firstCall = false;
                    }
                    else {
                        this._onReconnecting.fire(undefined);
                    }
                    const { authority } = await this._remoteAuthorityResolverService.resolveAuthority(this.remoteAuthority);
                    return { connectTo: authority.connectTo, connectionToken: authority.connectionToken };
                },
            },
            remoteSocketFactoryService: this._remoteSocketFactoryService,
            signService: this._signService,
            logService: this._logService,
            ipcLogger: false ? new IPCLogger(`Local \u2192 Remote`, `Remote \u2192 Local`) : null,
        };
        let connection;
        const start = Date.now();
        try {
            connection = this._register(await connectRemoteAgentManagement(options, this.remoteAuthority, `renderer`));
        }
        finally {
            this._initialConnectionMs = Date.now() - start;
        }
        connection.protocol.onDidDispose(() => {
            connection.dispose();
        });
        this.end = () => {
            connection.protocol.sendDisconnect();
            return connection.protocol.drain();
        };
        this._register(connection.onDidStateChange((e) => this._onDidStateChange.fire(e)));
        return connection.client;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RSZW1vdGVBZ2VudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9hYnN0cmFjdFJlbW90ZUFnZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUdOLGlCQUFpQixFQUNqQixTQUFTLEdBQ1QsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sNEJBQTRCLEdBSTVCLE1BQU0sNkRBQTZELENBQUE7QUFNcEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFLL0csT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFLNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXZHLElBQWUsMEJBQTBCLEdBQXpDLE1BQWUsMEJBQTJCLFNBQVEsVUFBVTtJQU1sRSxZQUVrQiwwQkFBdUQsRUFDOUIsc0JBQStDLEVBRXRFLG1CQUFpRCxFQUNuRCxjQUErQixFQUUvQiwrQkFBZ0UsRUFD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