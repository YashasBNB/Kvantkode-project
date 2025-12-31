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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3R1bm5lbC9ub2RlL3R1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXJELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUdOLHdCQUF3QixHQUN4QixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQ04scUJBQXFCLEVBS3JCLGVBQWUsRUFDZixlQUFlLEVBQ2YsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0s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