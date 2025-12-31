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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdFR1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUE7QUFFaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixhQUFhLEVBRWIsb0JBQW9CLEdBQ3BCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RB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