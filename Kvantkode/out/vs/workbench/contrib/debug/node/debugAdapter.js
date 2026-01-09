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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9ub2RlL2RlYnVnQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUUxQixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBU3pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXhFOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixrQkFBbUIsU0FBUSxvQkFBb0I7YUFDNUMsYUFBUSxHQUFHLFVBQVUsQUFBYixDQUFhO2FBQ3JCLHlCQUFvQixHQUFHLE9BQU8sQUFBVixDQUFVLEdBQUMsb0RBQW9EO2FBQ25GLDBCQUFxQixHQUFHLEtBQUssQUFBUixDQUFRO0lBTXJEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFKQSxZQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixrQkFBYSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBSTFCLENBQUM7SUFFUyxPQUFPLENBQUMsUUFBeUIsRUFBRSxRQUF5QjtRQUNyRSxJQUFJLENBQUMsWUFBWSxH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