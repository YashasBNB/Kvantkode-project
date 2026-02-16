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
import * as fs from 'fs';
import { exec } from 'child_process';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { MovingAverage } from '../../../base/common/numbers.js';
import { isLinux } from '../../../base/common/platform.js';
import * as resources from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import * as pfs from '../../../base/node/pfs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ManagedSocket, connectManagedSocket, } from '../../../platform/remote/common/managedSocket.js';
import { ManagedRemoteConnection } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { isAllInterfaces, isLocalhost } from '../../../platform/tunnel/common/tunnel.js';
import { NodeRemoteTunnel } from '../../../platform/tunnel/node/tunnelService.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { ExtHostTunnelService } from '../common/extHostTunnelService.js';
import { parseAddress } from '../../services/remote/common/tunnelModel.js';
export function getSockets(stdout) {
    const lines = stdout.trim().split('\n');
    const mapped = [];
    lines.forEach((line) => {
        const match = /\/proc\/(\d+)\/fd\/\d+ -> socket:\[(\d+)\]/.exec(line);
        if (match && match.length >= 3) {
            mapped.push({
                pid: parseInt(match[1], 10),
                socket: parseInt(match[2], 10),
            });
        }
    });
    const socketMap = mapped.reduce((m, socket) => {
        m[socket.socket] = socket;
        return m;
    }, {});
    return socketMap;
}
export function loadListeningPorts(...stdouts) {
    const table = [].concat(...stdouts.map(loadConnectionTable));
    return [
        ...new Map(table
            .filter((row) => row.st === '0A')
            .map((row) => {
            const address = row.local_address.split(':');
            return {
                socket: parseInt(row.inode, 10),
                ip: parseIpAddress(address[0]),
                port: parseInt(address[1], 16),
            };
        })
            .map((port) => [port.ip + ':' + port.port, port])).values(),
    ];
}
export function parseIpAddress(hex) {
    let result = '';
    if (hex.length === 8) {
        for (let i = hex.length - 2; i >= 0; i -= 2) {
            result += parseInt(hex.substr(i, 2), 16);
            if (i !== 0) {
                result += '.';
            }
        }
    }
    else {
        // Nice explanation of host format in tcp6 file: https://serverfault.com/questions/592574/why-does-proc-net-tcp6-represents-1-as-1000
        for (let i = 0; i < hex.length; i += 8) {
            const word = hex.substring(i, i + 8);
            let subWord = '';
            for (let j = 8; j >= 2; j -= 2) {
                subWord += word.substring(j - 2, j);
                if (j === 6 || j === 2) {
                    // Trim leading zeros
                    subWord = parseInt(subWord, 16).toString(16);
                    result += `${subWord}`;
                    subWord = '';
                    if (i + j !== hex.length - 6) {
                        result += ':';
                    }
                }
            }
        }
    }
    return result;
}
export function loadConnectionTable(stdout) {
    const lines = stdout.trim().split('\n');
    const names = lines
        .shift()
        .trim()
        .split(/\s+/)
        .filter((name) => name !== 'rx_queue' && name !== 'tm->when');
    const table = lines.map((line) => line
        .trim()
        .split(/\s+/)
        .reduce((obj, value, i) => {
        obj[names[i] || i] = value;
        return obj;
    }, {}));
    return table;
}
function knownExcludeCmdline(command) {
    if (command.length > 500) {
        return false;
    }
    return (!!command.match(/.*\.vscode-server-[a-zA-Z]+\/bin.*/) ||
        command.indexOf('out/server-main.js') !== -1 ||
        command.indexOf('_productName=VSCode') !== -1);
}
export function getRootProcesses(stdout) {
    const lines = stdout.trim().split('\n');
    const mapped = [];
    lines.forEach((line) => {
        const match = /^\d+\s+\D+\s+root\s+(\d+)\s+(\d+).+\d+\:\d+\:\d+\s+(.+)$/.exec(line);
        if (match && match.length >= 4) {
            mapped.push({
                pid: parseInt(match[1], 10),
                ppid: parseInt(match[2]),
                cmd: match[3],
            });
        }
    });
    return mapped;
}
export async function findPorts(connections, socketMap, processes) {
    const processMap = processes.reduce((m, process) => {
        m[process.pid] = process;
        return m;
    }, {});
    const ports = [];
    connections.forEach(({ socket, ip, port }) => {
        const pid = socketMap[socket] ? socketMap[socket].pid : undefined;
        const command = pid ? processMap[pid]?.cmd : undefined;
        if (pid && command && !knownExcludeCmdline(command)) {
            ports.push({ host: ip, port, detail: command, pid });
        }
    });
    return ports;
}
export function tryFindRootPorts(connections, rootProcessesStdout, previousPorts) {
    const ports = new Map();
    const rootProcesses = getRootProcesses(rootProcessesStdout);
    for (const connection of connections) {
        const previousPort = previousPorts.get(connection.port);
        if (previousPort) {
            ports.set(connection.port, previousPort);
            continue;
        }
        const rootProcessMatch = rootProcesses.find((value) => value.cmd.includes(`${connection.port}`));
        if (rootProcessMatch) {
            let bestMatch = rootProcessMatch;
            // There are often several processes that "look" like they could match the port.
            // The one we want is usually the child of the other. Find the most child process.
            let mostChild;
            do {
                mostChild = rootProcesses.find((value) => value.ppid === bestMatch.pid);
                if (mostChild) {
                    bestMatch = mostChild;
                }
            } while (mostChild);
            ports.set(connection.port, {
                host: connection.ip,
                port: connection.port,
                pid: bestMatch.pid,
                detail: bestMatch.cmd,
                ppid: bestMatch.ppid,
            });
        }
        else {
            ports.set(connection.port, {
                host: connection.ip,
                port: connection.port,
                ppid: Number.MAX_VALUE,
            });
        }
    }
    return ports;
}
let NodeExtHostTunnelService = class NodeExtHostTunnelService extends ExtHostTunnelService {
    constructor(extHostRpc, initData, logService, signService) {
        super(extHostRpc, initData, logService);
        this.initData = initData;
        this.signService = signService;
        this._initialCandidates = undefined;
        this._foundRootPorts = new Map();
        this._candidateFindingEnabled = false;
        if (isLinux && initData.remote.isRemote && initData.remote.authority) {
            this._proxy.$setRemoteTunnelService(process.pid);
            this.setInitialCandidates();
        }
    }
    async $registerCandidateFinder(enable) {
        if (enable && this._candidateFindingEnabled) {
            // already enabled
            return;
        }
        this._candidateFindingEnabled = enable;
        let oldPorts = undefined;
        // If we already have found initial candidates send those immediately.
        if (this._initialCandidates) {
            oldPorts = this._initialCandidates;
            await this._proxy.$onFoundNewCandidates(this._initialCandidates);
        }
        // Regularly scan to see if the candidate ports have changed.
        const movingAverage = new MovingAverage();
        let scanCount = 0;
        while (this._candidateFindingEnabled) {
            const startTime = new Date().getTime();
            const newPorts = (await this.findCandidatePorts()).filter((candidate) => isLocalhost(candidate.host) || isAllInterfaces(candidate.host));
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) found candidate ports ${newPorts.map((port) => port.port).join(', ')}`);
            const timeTaken = new Date().getTime() - startTime;
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) candidate port scan took ${timeTaken} ms.`);
            // Do not count the first few scans towards the moving average as they are likely to be slower.
            if (scanCount++ > 3) {
                movingAverage.update(timeTaken);
            }
            if (!oldPorts || JSON.stringify(oldPorts) !== JSON.stringify(newPorts)) {
                oldPorts = newPorts;
                await this._proxy.$onFoundNewCandidates(oldPorts);
            }
            const delay = this.calculateDelay(movingAverage.value);
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) next candidate port scan in ${delay} ms.`);
            await new Promise((resolve) => setTimeout(() => resolve(), delay));
        }
    }
    calculateDelay(movingAverage) {
        // Some local testing indicated that the moving average might be between 50-100 ms.
        return Math.max(movingAverage * 20, 2000);
    }
    async setInitialCandidates() {
        this._initialCandidates = await this.findCandidatePorts();
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) Initial candidates found: ${this._initialCandidates.map((c) => c.port).join(', ')}`);
    }
    async findCandidatePorts() {
        let tcp = '';
        let tcp6 = '';
        try {
            tcp = await fs.promises.readFile('/proc/net/tcp', 'utf8');
            tcp6 = await fs.promises.readFile('/proc/net/tcp6', 'utf8');
        }
        catch (e) {
            // File reading error. No additional handling needed.
        }
        const connections = loadListeningPorts(tcp, tcp6);
        const procSockets = await new Promise((resolve) => {
            exec('ls -l /proc/[0-9]*/fd/[0-9]* | grep socket:', (error, stdout, stderr) => {
                resolve(stdout);
            });
        });
        const socketMap = getSockets(procSockets);
        const procChildren = await pfs.Promises.readdir('/proc');
        const processes = [];
        for (const childName of procChildren) {
            try {
                const pid = Number(childName);
                const childUri = resources.joinPath(URI.file('/proc'), childName);
                const childStat = await fs.promises.stat(childUri.fsPath);
                if (childStat.isDirectory() && !isNaN(pid)) {
                    const cwd = await fs.promises.readlink(resources.joinPath(childUri, 'cwd').fsPath);
                    const cmd = await fs.promises.readFile(resources.joinPath(childUri, 'cmdline').fsPath, 'utf8');
                    processes.push({ pid, cwd, cmd });
                }
            }
            catch (e) {
                //
            }
        }
        const unFoundConnections = [];
        const filteredConnections = connections.filter((connection) => {
            const foundConnection = socketMap[connection.socket];
            if (!foundConnection) {
                unFoundConnections.push(connection);
            }
            return foundConnection;
        });
        const foundPorts = findPorts(filteredConnections, socketMap, processes);
        let heuristicPorts;
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) number of possible root ports ${unFoundConnections.length}`);
        if (unFoundConnections.length > 0) {
            const rootProcesses = await new Promise((resolve) => {
                exec('ps -F -A -l | grep root', (error, stdout, stderr) => {
                    resolve(stdout);
                });
            });
            this._foundRootPorts = tryFindRootPorts(unFoundConnections, rootProcesses, this._foundRootPorts);
            heuristicPorts = Array.from(this._foundRootPorts.values());
            this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) heuristic ports ${heuristicPorts.map((heuristicPort) => heuristicPort.port).join(', ')}`);
        }
        return foundPorts.then((foundCandidates) => {
            if (heuristicPorts) {
                return foundCandidates.concat(heuristicPorts);
            }
            else {
                return foundCandidates;
            }
        });
    }
    makeManagedTunnelFactory(authority) {
        return async (tunnelOptions) => {
            const t = new NodeRemoteTunnel({
                commit: this.initData.commit,
                quality: this.initData.quality,
                logService: this.logService,
                ipcLogger: null,
                // services and address providers have stubs since we don't need
                // the connection identification that the renderer process uses
                remoteSocketFactoryService: {
                    _serviceBrand: undefined,
                    async connect(_connectTo, path, query, debugLabel) {
                        const result = await authority.makeConnection();
                        return ExtHostManagedSocket.connect(result, path, query, debugLabel);
                    },
                    register() {
                        throw new Error('not implemented');
                    },
                },
                addressProvider: {
                    getAddress() {
                        return Promise.resolve({
                            connectTo: new ManagedRemoteConnection(0),
                            connectionToken: authority.connectionToken,
                        });
                    },
                },
                signService: this.signService,
            }, 'localhost', tunnelOptions.remoteAddress.host || 'localhost', tunnelOptions.remoteAddress.port, tunnelOptions.localAddressPort);
            await t.waitForReady();
            const disposeEmitter = new Emitter();
            return {
                localAddress: parseAddress(t.localAddress) ?? t.localAddress,
                remoteAddress: { port: t.tunnelRemotePort, host: t.tunnelRemoteHost },
                onDidDispose: disposeEmitter.event,
                dispose: () => {
                    t.dispose();
                    disposeEmitter.fire();
                    disposeEmitter.dispose();
                },
            };
        };
    }
};
NodeExtHostTunnelService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, ILogService),
    __param(3, ISignService)
], NodeExtHostTunnelService);
export { NodeExtHostTunnelService };
class ExtHostManagedSocket extends ManagedSocket {
    static connect(passing, path, query, debugLabel) {
        const d = new DisposableStore();
        const half = {
            onClose: d.add(new Emitter()),
            onData: d.add(new Emitter()),
            onEnd: d.add(new Emitter()),
        };
        d.add(passing.onDidReceiveMessage((d) => half.onData.fire(VSBuffer.wrap(d))));
        d.add(passing.onDidEnd(() => half.onEnd.fire()));
        d.add(passing.onDidClose((error) => half.onClose.fire({
            type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
            error,
            hadError: !!error,
        })));
        const socket = new ExtHostManagedSocket(passing, debugLabel, half);
        socket._register(d);
        return connectManagedSocket(socket, path, query, debugLabel, half);
    }
    constructor(passing, debugLabel, half) {
        super(debugLabel, half);
        this.passing = passing;
    }
    write(buffer) {
        this.passing.send(buffer.buffer);
    }
    closeRemote() {
        this.passing.end();
    }
    async drain() {
        await this.passing.drain?.();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0VHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxLQUFLLFNBQVMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxLQUFLLEdBQUcsTUFBTSwyQkFBMkIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUNOLGFBQWEsRUFFYixvQkFBb0IsR0FDcEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RixPQUFPLEVB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