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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmNwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9ub2RlL2lwYy5jcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdCLElBQUksRUFBZSxNQUFNLGVBQWUsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRSxPQUFPLEtBQUssTUFBTSxNQUFNLDJCQUEyQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDL0QsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxFQUNOLGFBQWEsSUFBSSxTQUFTLEVBQzFCLGFBQWEsSUFBSSxTQUFTLEdBRzFCLE1BQU0sa0JBQWtCLENBQUE7QUFFekI7OztHQUdHO0FBRUgsTUFBTSxPQUFPLE1BQWdDLFNBQVEsU0FBbUI7SUFDdkUsWUFBWSxHQUFhO1FBQ3hCLEtBQUssQ0FDSjtZQUNDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNYLElBQUksQ0FB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