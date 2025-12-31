/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fork } from 'child_process';
import { createCancelablePromise, Delayer } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { CancellationToken } from '../../../common/cancellation.js';
import { isRemoteConsoleLog, log } from '../../../common/console.js';
import * as errors from '../../../common/errors.js';
import { Emitter, Event } from '../../../common/event.js';
import { dispose, toDisposable } from '../../../common/lifecycle.js';
import { deepClone } from '../../../common/objects.js';
import { createQueuedSender } from '../../../node/processes.js';
import { removeDangerousEnvVariables } from '../../../common/processes.js';
import { ChannelClient as IPCClient, ChannelServer as IPCServer, } from '../common/ipc.js';
/**
 * This implementation doesn't perform well since it uses base64 encoding for buffers.
 * We should move all implementations to use named ipc.net, so we stop depending on cp.fork.
 */
export class Server extends IPCServer {
    constructor(ctx) {
        super({
            send: (r) => {
                try {
                    process.send?.(r.buffer.toString('base64'));
                }
                catch (e) {
                    /* not much to do */
                }
            },
            onMessage: Event.fromNodeEventEmitter(process, 'message', (msg) => VSBuffer.wrap(Buffer.from(msg, 'base64'))),
        }, ctx);
        process.once('disconnect', () => this.dispose());
    }
}
export class Client {
    constructor(modulePath, options) {
        this.modulePath = modulePath;
        this.options = options;
        this.activeRequests = new Set();
        this.channels = new Map();
        this._onDidProcessExit = new Emitter();
        this.onDidProcessExit = this._onDidProcessExit.event;
        const timeout = options && options.timeout ? options.timeout : 60000;
        this.disposeDelayer = new Delayer(timeout);
        this.child = null;
        this._client = null;
    }
    getChannel(channelName) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                return that.requestPromise(channelName, command, arg, cancellationToken);
            },
            listen(event, arg) {
                return that.requestEvent(channelName, event, arg);
            },
        };
    }
    requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
        if (!this.disposeDelayer) {
            return Promise.reject(new Error('disposed'));
        }
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(errors.canceled());
        }
        this.disposeDelayer.cancel();
        const channel = this.getCachedChannel(channelName);
        const result = createCancelablePromise((token) => channel.call(name, arg, token));
        const cancellationTokenListener = cancellationToken.onCancellationRequested(() => result.cancel());
        const disposable = toDisposable(() => result.cancel());
        this.activeRequests.add(disposable);
        result.finally(() => {
            cancellationTokenListener.dispose();
            this.activeRequests.delete(disposable);
            if (this.activeRequests.size === 0 && this.disposeDelayer) {
                this.disposeDelayer.trigger(() => this.disposeClient());
            }
        });
        return result;
    }
    requestEvent(channelName, name, arg) {
        if (!this.disposeDelayer) {
            return Event.None;
        }
        this.disposeDelayer.cancel();
        let listener;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                const channel = this.getCachedChannel(channelName);
                const event = channel.listen(name, arg);
                listener = event(emitter.fire, emitter);
                this.activeRequests.add(listener);
            },
            onDidRemoveLastListener: () => {
                this.activeRequests.delete(listener);
                listener.dispose();
                if (this.activeRequests.size === 0 && this.disposeDelayer) {
                    this.disposeDelayer.trigger(() => this.disposeClient());
                }
            },
        });
        return emitter.event;
    }
    get client() {
        if (!this._client) {
            const args = this.options && this.options.args ? this.options.args : [];
            const forkOpts = Object.create(null);
            forkOpts.env = { ...deepClone(process.env), VSCODE_PARENT_PID: String(process.pid) };
            if (this.options && this.options.env) {
                forkOpts.env = { ...forkOpts.env, ...this.options.env };
            }
            if (this.options && this.options.freshExecArgv) {
                forkOpts.execArgv = [];
            }
            if (this.options && typeof this.options.debug === 'number') {
                forkOpts.execArgv = ['--nolazy', '--inspect=' + this.options.debug];
            }
            if (this.options && typeof this.options.debugBrk === 'number') {
                forkOpts.execArgv = ['--nolazy', '--inspect-brk=' + this.options.debugBrk];
            }
            if (forkOpts.execArgv === undefined) {
                forkOpts.execArgv = process.execArgv // if not set, the forked process inherits the execArgv of the parent process
                    .filter((a) => !/^--inspect(-brk)?=/.test(a)) // --inspect and --inspect-brk can not be inherited as the port would conflict
                    .filter((a) => !a.startsWith('--vscode-')); // --vscode-* arguments are unsupported by node.js and thus need to remove
            }
            removeDangerousEnvVariables(forkOpts.env);
            this.child = fork(this.modulePath, args, forkOpts);
            const onMessageEmitter = new Emitter();
            const onRawMessage = Event.fromNodeEventEmitter(this.child, 'message', (msg) => msg);
            const rawMessageDisposable = onRawMessage((msg) => {
                // Handle remote console logs specially
                if (isRemoteConsoleLog(msg)) {
                    log(msg, `IPC Library: ${this.options.serverName}`);
                    return;
                }
                // Anything else goes to the outside
                onMessageEmitter.fire(VSBuffer.wrap(Buffer.from(msg, 'base64')));
            });
            const sender = this.options.useQueue ? createQueuedSender(this.child) : this.child;
            const send = (r) => this.child && this.child.connected && sender.send(r.buffer.toString('base64'));
            const onMessage = onMessageEmitter.event;
            const protocol = { send, onMessage };
            this._client = new IPCClient(protocol);
            const onExit = () => this.disposeClient();
            process.once('exit', onExit);
            this.child.on('error', (err) => console.warn('IPC "' + this.options.serverName + '" errored with ' + err));
            this.child.on('exit', (code, signal) => {
                process.removeListener('exit', onExit); // https://github.com/electron/electron/issues/21475
                rawMessageDisposable.dispose();
                this.activeRequests.forEach((r) => dispose(r));
                this.activeRequests.clear();
                if (code !== 0 && signal !== 'SIGTERM') {
                    console.warn('IPC "' +
                        this.options.serverName +
                        '" crashed with exit code ' +
                        code +
                        ' and signal ' +
                        signal);
                }
                this.disposeDelayer?.cancel();
                this.disposeClient();
                this._onDidProcessExit.fire({ code, signal });
            });
        }
        return this._client;
    }
    getCachedChannel(name) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = this.client.getChannel(name);
            this.channels.set(name, channel);
        }
        return channel;
    }
    disposeClient() {
        if (this._client) {
            if (this.child) {
                this.child.kill();
                this.child = null;
            }
            this._client = null;
            this.channels.clear();
        }
    }
    dispose() {
        this._onDidProcessExit.dispose();
        this.disposeDelayer?.cancel();
        this.disposeDelayer = undefined;
        this.disposeClient();
        this.activeRequests.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmNwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvbm9kZS9pcGMuY3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixJQUFJLEVBQWUsTUFBTSxlQUFlLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDcEUsT0FBTyxLQUFLLE1BQU0sTUFBTSwyQkFBMkIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQy9ELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFFLE9BQU8sRUFDTixhQUFhLElBQUksU0FBUyxFQUMxQixhQUFhLElBQUksU0FBUyxHQUcxQixNQUFNLGtCQUFrQixDQUFBO0FBRXpCOzs7R0FHRztBQUVILE1BQU0sT0FBTyxNQUFnQyxTQUFRLFNBQW1CO0lBQ3ZFLFlBQVksR0FBYTtRQUN4QixLQUFLLENBQ0o7WUFDQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDWCxJQUFJLENBQUM7b0JB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