/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import * as net from 'net';
import * as objects from '../../../../base/common/objects.js';
import * as path from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { Promises } from '../../../../base/node/pfs.js';
import * as nls from '../../../../nls.js';
import { AbstractDebugAdapter } from '../common/abstractDebugAdapter.js';
/**
 * An implementation that communicates via two streams with the debug adapter.
 */
export class StreamDebugAdapter extends AbstractDebugAdapter {
    static { this.TWO_CRLF = '\r\n\r\n'; }
    static { this.HEADER_LINESEPARATOR = /\r?\n/; } // allow for non-RFC 2822 conforming line separators
    static { this.HEADER_FIELDSEPARATOR = /: */; }
    constructor() {
        super();
        this.rawData = Buffer.allocUnsafe(0);
        this.contentLength = -1;
    }
    connect(readable, writable) {
        this.outputStream = writable;
        this.rawData = Buffer.allocUnsafe(0);
        this.contentLength = -1;
        readable.on('data', (data) => this.handleData(data));
    }
    sendMessage(message) {
        if (this.outputStream) {
            const json = JSON.stringify(message);
            this.outputStream.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}${StreamDebugAdapter.TWO_CRLF}${json}`, 'utf8');
        }
    }
    handleData(data) {
        this.rawData = Buffer.concat([this.rawData, data]);
        while (true) {
            if (this.contentLength >= 0) {
                if (this.rawData.length >= this.contentLength) {
                    const message = this.rawData.toString('utf8', 0, this.contentLength);
                    this.rawData = this.rawData.slice(this.contentLength);
                    this.contentLength = -1;
                    if (message.length > 0) {
                        try {
                            this.acceptMessage(JSON.parse(message));
                        }
                        catch (e) {
                            this._onError.fire(new Error((e.message || e) + '\n' + message));
                        }
                    }
                    continue; // there may be more complete messages to process
                }
            }
            else {
                const idx = this.rawData.indexOf(StreamDebugAdapter.TWO_CRLF);
                if (idx !== -1) {
                    const header = this.rawData.toString('utf8', 0, idx);
                    const lines = header.split(StreamDebugAdapter.HEADER_LINESEPARATOR);
                    for (const h of lines) {
                        const kvPair = h.split(StreamDebugAdapter.HEADER_FIELDSEPARATOR);
                        if (kvPair[0] === 'Content-Length') {
                            this.contentLength = Number(kvPair[1]);
                        }
                    }
                    this.rawData = this.rawData.slice(idx + StreamDebugAdapter.TWO_CRLF.length);
                    continue;
                }
            }
            break;
        }
    }
}
export class NetworkDebugAdapter extends StreamDebugAdapter {
    startSession() {
        return new Promise((resolve, reject) => {
            let connected = false;
            this.socket = this.createConnection(() => {
                this.connect(this.socket, this.socket);
                resolve();
                connected = true;
            });
            this.socket.on('close', () => {
                if (connected) {
                    this._onError.fire(new Error('connection closed'));
                }
                else {
                    reject(new Error('connection closed'));
                }
            });
            this.socket.on('error', (error) => {
                // On ipv6 posix this can be an AggregateError which lacks a message. Use the first.
                if (error instanceof AggregateError) {
                    error = error.errors[0];
                }
                if (connected) {
                    this._onError.fire(error);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    async stopSession() {
        await this.cancelPendingRequests();
        if (this.socket) {
            this.socket.end();
            this.socket = undefined;
        }
    }
}
/**
 * An implementation that connects to a debug adapter via a socket.
 */
export class SocketDebugAdapter extends NetworkDebugAdapter {
    constructor(adapterServer) {
        super();
        this.adapterServer = adapterServer;
    }
    createConnection(connectionListener) {
        return net.createConnection(this.adapterServer.port, this.adapterServer.host || '127.0.0.1', connectionListener);
    }
}
/**
 * An implementation that connects to a debug adapter via a NamedPipe (on Windows)/UNIX Domain Socket (on non-Windows).
 */
export class NamedPipeDebugAdapter extends NetworkDebugAdapter {
    constructor(adapterServer) {
        super();
        this.adapterServer = adapterServer;
    }
    createConnection(connectionListener) {
        return net.createConnection(this.adapterServer.path, connectionListener);
    }
}
/**
 * An implementation that launches the debug adapter as a separate process and communicates via stdin/stdout.
 */
export class ExecutableDebugAdapter extends StreamDebugAdapter {
    constructor(adapterExecutable, debugType) {
        super();
        this.adapterExecutable = adapterExecutable;
        this.debugType = debugType;
    }
    async startSession() {
        const command = this.adapterExecutable.command;
        const args = this.adapterExecutable.args;
        const options = this.adapterExecutable.options || {};
        try {
            // verify executables asynchronously
            if (command) {
                if (path.isAbsolute(command)) {
                    const commandExists = await Promises.exists(command);
                    if (!commandExists) {
                        throw new Error(nls.localize('debugAdapterBinNotFound', "Debug adapter executable '{0}' does not exist.", command));
                    }
                }
                else {
                    // relative path
                    if (command.indexOf('/') < 0 && command.indexOf('\\') < 0) {
                        // no separators: command looks like a runtime name like 'node' or 'mono'
                        // TODO: check that the runtime is available on PATH
                    }
                }
            }
            else {
                throw new Error(nls.localize({
                    key: 'debugAdapterCannotDetermineExecutable',
                    comment: ['Adapter executable file not found'],
                }, "Cannot determine executable for debug adapter '{0}'.", this.debugType));
            }
            let env = process.env;
            if (options.env && Object.keys(options.env).length > 0) {
                env = objects.mixin(objects.deepClone(process.env), options.env);
            }
            if (command === 'node') {
                if (Array.isArray(args) && args.length > 0) {
                    const isElectron = !!process.env['ELECTRON_RUN_AS_NODE'] || !!process.versions['electron'];
                    const forkOptions = {
                        env: env,
                        execArgv: isElectron
                            ? ['-e', 'delete process.env.ELECTRON_RUN_AS_NODE;require(process.argv[1])']
                            : [],
                        silent: true,
                    };
                    if (options.cwd) {
                        forkOptions.cwd = options.cwd;
                    }
                    const child = cp.fork(args[0], args.slice(1), forkOptions);
                    if (!child.pid) {
                        throw new Error(nls.localize('unableToLaunchDebugAdapter', "Unable to launch debug adapter from '{0}'.", args[0]));
                    }
                    this.serverProcess = child;
                }
                else {
                    throw new Error(nls.localize('unableToLaunchDebugAdapterNoArgs', 'Unable to launch debug adapter.'));
                }
            }
            else {
                let spawnCommand = command;
                let spawnArgs = args;
                const spawnOptions = {
                    env: env,
                };
                if (options.cwd) {
                    spawnOptions.cwd = options.cwd;
                }
                if (platform.isWindows && (command.endsWith('.bat') || command.endsWith('.cmd'))) {
                    // https://github.com/microsoft/vscode/issues/224184
                    spawnOptions.shell = true;
                    spawnCommand = `"${command}"`;
                    spawnArgs = args.map((a) => {
                        a = a.replace(/"/g, '\\"'); // Escape existing double quotes with \
                        // Wrap in double quotes
                        return `"${a}"`;
                    });
                }
                this.serverProcess = cp.spawn(spawnCommand, spawnArgs, spawnOptions);
            }
            this.serverProcess.on('error', (err) => {
                this._onError.fire(err);
            });
            this.serverProcess.on('exit', (code, signal) => {
                this._onExit.fire(code);
            });
            this.serverProcess.stdout.on('close', () => {
                this._onError.fire(new Error('read error'));
            });
            this.serverProcess.stdout.on('error', (error) => {
                this._onError.fire(error);
            });
            this.serverProcess.stdin.on('error', (error) => {
                this._onError.fire(error);
            });
            this.serverProcess.stderr.resume();
            // finally connect to the DA
            this.connect(this.serverProcess.stdout, this.serverProcess.stdin);
        }
        catch (err) {
            this._onError.fire(err);
        }
    }
    async stopSession() {
        if (!this.serverProcess) {
            return Promise.resolve(undefined);
        }
        // when killing a process in windows its child
        // processes are *not* killed but become root
        // processes. Therefore we use TASKKILL.EXE
        await this.cancelPendingRequests();
        if (platform.isWindows) {
            return new Promise((c, e) => {
                const killer = cp.exec(`taskkill /F /T /PID ${this.serverProcess.pid}`, function (err, stdout, stderr) {
                    if (err) {
                        return e(err);
                    }
                });
                killer.on('exit', c);
                killer.on('error', e);
            });
        }
        else {
            this.serverProcess.kill('SIGTERM');
            return Promise.resolve(undefined);
        }
    }
    static extract(platformContribution, extensionFolderPath) {
        if (!platformContribution) {
            return undefined;
        }
        const result = Object.create(null);
        if (platformContribution.runtime) {
            if (platformContribution.runtime.indexOf('./') === 0) {
                // TODO
                result.runtime = path.join(extensionFolderPath, platformContribution.runtime);
            }
            else {
                result.runtime = platformContribution.runtime;
            }
        }
        if (platformContribution.runtimeArgs) {
            result.runtimeArgs = platformContribution.runtimeArgs;
        }
        if (platformContribution.program) {
            if (!path.isAbsolute(platformContribution.program)) {
                result.program = path.join(extensionFolderPath, platformContribution.program);
            }
            else {
                result.program = platformContribution.program;
            }
        }
        if (platformContribution.args) {
            result.args = platformContribution.args;
        }
        const contribution = platformContribution;
        if (contribution.win) {
            result.win = ExecutableDebugAdapter.extract(contribution.win, extensionFolderPath);
        }
        if (contribution.winx86) {
            result.winx86 = ExecutableDebugAdapter.extract(contribution.winx86, extensionFolderPath);
        }
        if (contribution.windows) {
            result.windows = ExecutableDebugAdapter.extract(contribution.windows, extensionFolderPath);
        }
        if (contribution.osx) {
            result.osx = ExecutableDebugAdapter.extract(contribution.osx, extensionFolderPath);
        }
        if (contribution.linux) {
            result.linux = ExecutableDebugAdapter.extract(contribution.linux, extensionFolderPath);
        }
        return result;
    }
    static platformAdapterExecutable(extensionDescriptions, debugType) {
        let result = Object.create(null);
        debugType = debugType.toLowerCase();
        // merge all contributions into one
        for (const ed of extensionDescriptions) {
            if (ed.contributes) {
                const debuggers = ed.contributes['debuggers'];
                if (debuggers && debuggers.length > 0) {
                    debuggers
                        .filter((dbg) => typeof dbg.type === 'string' && strings.equalsIgnoreCase(dbg.type, debugType))
                        .forEach((dbg) => {
                        // extract relevant attributes and make them absolute where needed
                        const extractedDbg = ExecutableDebugAdapter.extract(dbg, ed.extensionLocation.fsPath);
                        // merge
                        result = objects.mixin(result, extractedDbg, ed.isBuiltin);
                    });
                }
            }
        }
        // select the right platform
        let platformInfo;
        if (platform.isWindows && !process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
            platformInfo = result.winx86 || result.win || result.windows;
        }
        else if (platform.isWindows) {
            platformInfo = result.win || result.windows;
        }
        else if (platform.isMacintosh) {
            platformInfo = result.osx;
        }
        else if (platform.isLinux) {
            platformInfo = result.linux;
        }
        platformInfo = platformInfo || result;
        // these are the relevant attributes
        const program = platformInfo.program || result.program;
        const args = platformInfo.args || result.args;
        const runtime = platformInfo.runtime || result.runtime;
        const runtimeArgs = platformInfo.runtimeArgs || result.runtimeArgs;
        if (runtime) {
            return {
                type: 'executable',
                command: runtime,
                args: (runtimeArgs || [])
                    .concat(typeof program === 'string' ? [program] : [])
                    .concat(args || []),
            };
        }
        else if (program) {
            return {
                type: 'executable',
                command: program,
                args: args || [],
            };
        }
        // nothing found
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvbm9kZS9kZWJ1Z0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFFMUIsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQVN6QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV4RTs7R0FFRztBQUNILE1BQU0sT0FBZ0Isa0JBQW1CLFNBQVEsb0JBQW9CO2FBQzVDLGFBQVEsR0FBRyxVQUFVLEFBQWIsQ0FBYTthQUNyQix5QkFBb0IsR0FBRyxPQUFPLEFBQVYsQ0FBVSxHQUFDLG9EQUFvRDthQUNuRiwwQkFBcUIsR0FBRyxLQUFLLEFBQVIsQ0FBUTtJQU1yRDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBSkEsWUFBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0Isa0JBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUkxQixDQUFDO0lBRVMsT0FBTyxDQUFDLFFBQXlCLEVBQUUsUUFBeUI7UUFDckUsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUE7UUFDNUIsSUFB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