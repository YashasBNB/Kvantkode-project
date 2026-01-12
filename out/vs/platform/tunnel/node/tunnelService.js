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
import * as net from 'net';
import * as os from 'os';
import { BROWSER_RESTRICTED_PORTS, findFreePortFaster } from '../../../base/node/ports.js';
import { NodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { Barrier } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { OS } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { connectRemoteAgentTunnel, } from '../../remote/common/remoteAgentConnection.js';
import { IRemoteSocketFactoryService } from '../../remote/common/remoteSocketFactoryService.js';
import { ISignService } from '../../sign/common/sign.js';
import { AbstractTunnelService, TunnelPrivacyId, isAllInterfaces, isLocalhost, isPortPrivileged, isTunnelProvider, } from '../common/tunnel.js';
import { VSBuffer } from '../../../base/common/buffer.js';
async function createRemoteTunnel(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort) {
    let readyTunnel;
    for (let attempts = 3; attempts; attempts--) {
        readyTunnel?.dispose();
        const tunnel = new NodeRemoteTunnel(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort);
        readyTunnel = await tunnel.waitForReady();
        if ((tunnelLocalPort && BROWSER_RESTRICTED_PORTS[tunnelLocalPort]) ||
            !BROWSER_RESTRICTED_PORTS[readyTunnel.tunnelLocalPort]) {
            break;
        }
    }
    return readyTunnel;
}
export class NodeRemoteTunnel extends Disposable {
    constructor(options, defaultTunnelHost, tunnelRemoteHost, tunnelRemotePort, suggestedLocalPort) {
        super();
        this.defaultTunnelHost = defaultTunnelHost;
        this.suggestedLocalPort = suggestedLocalPort;
        this.privacy = TunnelPrivacyId.Private;
        this._socketsDispose = new Map();
        this._options = options;
        this._server = net.createServer();
        this._barrier = new Barrier();
        this._listeningListener = () => this._barrier.open();
        this._server.on('listening', this._listeningListener);
        this._connectionListener = (socket) => this._onConnection(socket);
        this._server.on('connection', this._connectionListener);
        // If there is no error listener and there is an error it will crash the whole window
        this._errorListener = () => { };
        this._server.on('error', this._errorListener);
        this.tunnelRemotePort = tunnelRemotePort;
        this.tunnelRemoteHost = tunnelRemoteHost;
    }
    async dispose() {
        super.dispose();
        this._server.removeListener('listening', this._listeningListener);
        this._server.removeListener('connection', this._connectionListener);
        this._server.removeListener('error', this._errorListener);
        this._server.close();
        const disposers = Array.from(this._socketsDispose.values());
        disposers.forEach((disposer) => {
            disposer();
        });
    }
    async waitForReady() {
        const startPort = this.suggestedLocalPort ?? this.tunnelRemotePort;
        const hostname = isAllInterfaces(this.defaultTunnelHost) ? '0.0.0.0' : '127.0.0.1';
        // try to get the same port number as the remote port number...
        let localPort = await findFreePortFaster(startPort, 2, 1000, hostname);
        // if that fails, the method above returns 0, which works out fine below...
        let address = null;
        this._server.listen(localPort, this.defaultTunnelHost);
        await this._barrier.wait();
        address = this._server.address();
        // It is possible for findFreePortFaster to return a port that there is already a server listening on. This causes the previous listen call to error out.
        if (!address) {
            localPort = 0;
            this._server.listen(localPort, this.defaultTunnelHost);
            await this._barrier.wait();
            address = this._server.address();
        }
        this.tunnelLocalPort = address.port;
        this.localAddress = `${this.tunnelRemoteHost === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:${address.port}`;
        return this;
    }
    async _onConnection(localSocket) {
        // pause reading on the socket until we have a chance to forward its data
        localSocket.pause();
        const tunnelRemoteHost = isLocalhost(this.tunnelRemoteHost) || isAllInterfaces(this.tunnelRemoteHost)
            ? 'localhost'
            : this.tunnelRemoteHost;
        const protocol = await connectRemoteAgentTunnel(this._options, tunnelRemoteHost, this.tunnelRemotePort);
        const remoteSocket = protocol.getSocket();
        const dataChunk = protocol.readEntireBuffer();
        protocol.dispose();
        if (dataChunk.byteLength > 0) {
            localSocket.write(dataChunk.buffer);
        }
        localSocket.on('end', () => {
            if (localSocket.localAddress) {
                this._socketsDispose.delete(localSocket.localAddress);
            }
            remoteSocket.end();
        });
        localSocket.on('close', () => remoteSocket.end());
        localSocket.on('error', () => {
            if (localSocket.localAddress) {
                this._socketsDispose.delete(localSocket.localAddress);
            }
            if (remoteSocket instanceof NodeSocket) {
                remoteSocket.socket.destroy();
            }
            else {
                remoteSocket.end();
            }
        });
        if (remoteSocket instanceof NodeSocket) {
            this._mirrorNodeSocket(localSocket, remoteSocket);
        }
        else {
            this._mirrorGenericSocket(localSocket, remoteSocket);
        }
        if (localSocket.localAddress) {
            this._socketsDispose.set(localSocket.localAddress, () => {
                // Need to end instead of unpipe, otherwise whatever is connected locally could end up "stuck" with whatever state it had until manually exited.
                localSocket.end();
                remoteSocket.end();
            });
        }
    }
    _mirrorGenericSocket(localSocket, remoteSocket) {
        remoteSocket.onClose(() => localSocket.destroy());
        remoteSocket.onEnd(() => localSocket.end());
        remoteSocket.onData((d) => localSocket.write(d.buffer));
        localSocket.on('data', (d) => remoteSocket.write(VSBuffer.wrap(d)));
        localSocket.resume();
    }
    _mirrorNodeSocket(localSocket, remoteNodeSocket) {
        const remoteSocket = remoteNodeSocket.socket;
        remoteSocket.on('end', () => localSocket.end());
        remoteSocket.on('close', () => localSocket.end());
        remoteSocket.on('error', () => {
            localSocket.destroy();
        });
        remoteSocket.pipe(localSocket);
        localSocket.pipe(remoteSocket);
    }
}
let BaseTunnelService = class BaseTunnelService extends AbstractTunnelService {
    constructor(remoteSocketFactoryService, logService, signService, productService, configurationService) {
        super(logService, configurationService);
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this.signService = signService;
        this.productService = productService;
    }
    isPortPrivileged(port) {
        return isPortPrivileged(port, this.defaultTunnelHost, OS, os.release());
    }
    retainOrCreateTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol) {
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        if (isTunnelProvider(addressOrTunnelProvider)) {
            return this.createWithProvider(addressOrTunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol);
        }
        else {
            this.logService.trace(`ForwardedPorts: (TunnelService) Creating tunnel without provider ${remoteHost}:${remotePort} on local port ${localPort}.`);
            const options = {
                commit: this.productService.commit,
                quality: this.productService.quality,
                addressProvider: addressOrTunnelProvider,
                remoteSocketFactoryService: this.remoteSocketFactoryService,
                signService: this.signService,
                logService: this.logService,
                ipcLogger: null,
            };
            const tunnel = createRemoteTunnel(options, localHost, remoteHost, remotePort, localPort);
            this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created without provider.');
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            return tunnel;
        }
    }
};
BaseTunnelService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, ISignService),
    __param(3, IProductService),
    __param(4, IConfigurationService)
], BaseTunnelService);
export { BaseTunnelService };
let TunnelService = class TunnelService extends BaseTunnelService {
    constructor(remoteSocketFactoryService, logService, signService, productService, configurationService) {
        super(remoteSocketFactoryService, logService, signService, productService, configurationService);
    }
};
TunnelService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, ISignService),
    __param(3, IProductService),
    __param(4, IConfigurationService)
], TunnelService);
export { TunnelService };
let SharedTunnelsService = class SharedTunnelsService extends Disposable {
    constructor(remoteSocketFactoryService, logService, productService, signService, configurationService) {
        super();
        this.remoteSocketFactoryService = remoteSocketFactoryService;
        this.logService = logService;
        this.productService = productService;
        this.signService = signService;
        this.configurationService = configurationService;
        this._tunnelServices = new Map();
    }
    async openTunnel(authority, addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (SharedTunnelService) openTunnel request for ${remoteHost}:${remotePort} on local port ${localPort}.`);
        if (!this._tunnelServices.has(authority)) {
            const tunnelService = new TunnelService(this.remoteSocketFactoryService, this.logService, this.signService, this.productService, this.configurationService);
            this._register(tunnelService);
            this._tunnelServices.set(authority, tunnelService);
            tunnelService.onTunnelClosed(async () => {
                if ((await tunnelService.tunnels).length === 0) {
                    tunnelService.dispose();
                    this._tunnelServices.delete(authority);
                }
            });
        }
        return this._tunnelServices
            .get(authority)
            .openTunnel(addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol);
    }
};
SharedTunnelsService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, ILogService),
    __param(2, IProductService),
    __param(3, ISignService),
    __param(4, IConfigurationService)
], SharedTunnelsService);
export { SharedTunnelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdHVubmVsL25vZGUvdHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUMxQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBR04sd0JBQXdCLEdBQ3hCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hELE9BQU8sRUFDTixxQkFBcUIsRUFLckIsZUFBZSxFQUNmLGVBQWUsRUFDZixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUs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