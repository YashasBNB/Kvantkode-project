/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError, transformErrorForSerialization } from '../errors.js';
import { Emitter } from '../event.js';
import { Disposable } from '../lifecycle.js';
import { isWeb } from '../platform.js';
import * as strings from '../strings.js';
const DEFAULT_CHANNEL = 'default';
const INITIALIZE = '$initialize';
let webWorkerWarningLogged = false;
export function logOnceWebWorkerWarning(err) {
    if (!isWeb) {
        // running tests
        return;
    }
    if (!webWorkerWarningLogged) {
        webWorkerWarningLogged = true;
        console.warn('Could not create web worker(s). Falling back to loading web worker code in main thread, which might cause UI freezes. Please see https://github.com/microsoft/monaco-editor#faq');
    }
    console.warn(err.message);
}
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 0] = "Request";
    MessageType[MessageType["Reply"] = 1] = "Reply";
    MessageType[MessageType["SubscribeEvent"] = 2] = "SubscribeEvent";
    MessageType[MessageType["Event"] = 3] = "Event";
    MessageType[MessageType["UnsubscribeEvent"] = 4] = "UnsubscribeEvent";
})(MessageType || (MessageType = {}));
class RequestMessage {
    constructor(vsWorker, req, channel, method, args) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.method = method;
        this.args = args;
        this.type = 0 /* MessageType.Request */;
    }
}
class ReplyMessage {
    constructor(vsWorker, seq, res, err) {
        this.vsWorker = vsWorker;
        this.seq = seq;
        this.res = res;
        this.err = err;
        this.type = 1 /* MessageType.Reply */;
    }
}
class SubscribeEventMessage {
    constructor(vsWorker, req, channel, eventName, arg) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.eventName = eventName;
        this.arg = arg;
        this.type = 2 /* MessageType.SubscribeEvent */;
    }
}
class EventMessage {
    constructor(vsWorker, req, event) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.event = event;
        this.type = 3 /* MessageType.Event */;
    }
}
class UnsubscribeEventMessage {
    constructor(vsWorker, req) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.type = 4 /* MessageType.UnsubscribeEvent */;
    }
}
class WebWorkerProtocol {
    constructor(handler) {
        this._workerId = -1;
        this._handler = handler;
        this._lastSentReq = 0;
        this._pendingReplies = Object.create(null);
        this._pendingEmitters = new Map();
        this._pendingEvents = new Map();
    }
    setWorkerId(workerId) {
        this._workerId = workerId;
    }
    sendMessage(channel, method, args) {
        const req = String(++this._lastSentReq);
        return new Promise((resolve, reject) => {
            this._pendingReplies[req] = {
                resolve: resolve,
                reject: reject,
            };
            this._send(new RequestMessage(this._workerId, req, channel, method, args));
        });
    }
    listen(channel, eventName, arg) {
        let req = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                req = String(++this._lastSentReq);
                this._pendingEmitters.set(req, emitter);
                this._send(new SubscribeEventMessage(this._workerId, req, channel, eventName, arg));
            },
            onDidRemoveLastListener: () => {
                this._pendingEmitters.delete(req);
                this._send(new UnsubscribeEventMessage(this._workerId, req));
                req = null;
            },
        });
        return emitter.event;
    }
    handleMessage(message) {
        if (!message || !message.vsWorker) {
            return;
        }
        if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
            return;
        }
        this._handleMessage(message);
    }
    createProxyToRemoteChannel(channel, sendMessageBarrier) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' && !target[name]) {
                    if (propertyIsDynamicEvent(name)) {
                        // onDynamic...
                        target[name] = (arg) => {
                            return this.listen(channel, name, arg);
                        };
                    }
                    else if (propertyIsEvent(name)) {
                        // on...
                        target[name] = this.listen(channel, name, undefined);
                    }
                    else if (name.charCodeAt(0) === 36 /* CharCode.DollarSign */) {
                        // $...
                        target[name] = async (...myArgs) => {
                            await sendMessageBarrier?.();
                            return this.sendMessage(channel, name, myArgs);
                        };
                    }
                }
                return target[name];
            },
        };
        return new Proxy(Object.create(null), handler);
    }
    _handleMessage(msg) {
        switch (msg.type) {
            case 1 /* MessageType.Reply */:
                return this._handleReplyMessage(msg);
            case 0 /* MessageType.Request */:
                return this._handleRequestMessage(msg);
            case 2 /* MessageType.SubscribeEvent */:
                return this._handleSubscribeEventMessage(msg);
            case 3 /* MessageType.Event */:
                return this._handleEventMessage(msg);
            case 4 /* MessageType.UnsubscribeEvent */:
                return this._handleUnsubscribeEventMessage(msg);
        }
    }
    _handleReplyMessage(replyMessage) {
        if (!this._pendingReplies[replyMessage.seq]) {
            console.warn('Got reply to unknown seq');
            return;
        }
        const reply = this._pendingReplies[replyMessage.seq];
        delete this._pendingReplies[replyMessage.seq];
        if (replyMessage.err) {
            let err = replyMessage.err;
            if (replyMessage.err.$isError) {
                err = new Error();
                err.name = replyMessage.err.name;
                err.message = replyMessage.err.message;
                err.stack = replyMessage.err.stack;
            }
            reply.reject(err);
            return;
        }
        reply.resolve(replyMessage.res);
    }
    _handleRequestMessage(requestMessage) {
        const req = requestMessage.req;
        const result = this._handler.handleMessage(requestMessage.channel, requestMessage.method, requestMessage.args);
        result.then((r) => {
            this._send(new ReplyMessage(this._workerId, req, r, undefined));
        }, (e) => {
            if (e.detail instanceof Error) {
                // Loading errors have a detail property that points to the actual error
                e.detail = transformErrorForSerialization(e.detail);
            }
            this._send(new ReplyMessage(this._workerId, req, undefined, transformErrorForSerialization(e)));
        });
    }
    _handleSubscribeEventMessage(msg) {
        const req = msg.req;
        const disposable = this._handler.handleEvent(msg.channel, msg.eventName, msg.arg)((event) => {
            this._send(new EventMessage(this._workerId, req, event));
        });
        this._pendingEvents.set(req, disposable);
    }
    _handleEventMessage(msg) {
        if (!this._pendingEmitters.has(msg.req)) {
            console.warn('Got event for unknown req');
            return;
        }
        this._pendingEmitters.get(msg.req).fire(msg.event);
    }
    _handleUnsubscribeEventMessage(msg) {
        if (!this._pendingEvents.has(msg.req)) {
            console.warn('Got unsubscribe for unknown req');
            return;
        }
        this._pendingEvents.get(msg.req).dispose();
        this._pendingEvents.delete(msg.req);
    }
    _send(msg) {
        const transfer = [];
        if (msg.type === 0 /* MessageType.Request */) {
            for (let i = 0; i < msg.args.length; i++) {
                if (msg.args[i] instanceof ArrayBuffer) {
                    transfer.push(msg.args[i]);
                }
            }
        }
        else if (msg.type === 1 /* MessageType.Reply */) {
            if (msg.res instanceof ArrayBuffer) {
                transfer.push(msg.res);
            }
        }
        this._handler.sendMessage(msg, transfer);
    }
}
/**
 * Main thread side
 */
export class WebWorkerClient extends Disposable {
    constructor(worker) {
        super();
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._worker = worker;
        this._register(this._worker.onMessage((msg) => {
            this._protocol.handleMessage(msg);
        }));
        this._register(this._worker.onError((err) => {
            logOnceWebWorkerWarning(err);
            onUnexpectedError(err);
        }));
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                this._worker.postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => {
                return this._handleMessage(channel, method, args);
            },
            handleEvent: (channel, eventName, arg) => {
                return this._handleEvent(channel, eventName, arg);
            },
        });
        this._protocol.setWorkerId(this._worker.getId());
        // Send initialize message
        this._onModuleLoaded = this._protocol.sendMessage(DEFAULT_CHANNEL, INITIALIZE, [
            this._worker.getId(),
        ]);
        this.proxy = this._protocol.createProxyToRemoteChannel(DEFAULT_CHANNEL, async () => {
            await this._onModuleLoaded;
        });
        this._onModuleLoaded.catch((e) => {
            this._onError('Worker failed to load ', e);
        });
    }
    _handleMessage(channelName, method, args) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            return Promise.reject(new Error(`Missing channel ${channelName} on main thread`));
        }
        if (typeof channel[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on main thread channel ${channelName}`));
        }
        try {
            return Promise.resolve(channel[method].apply(channel, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channelName, eventName, arg) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            throw new Error(`Missing channel ${channelName} on main thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = channel[eventName].call(channel, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = channel[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel, async () => {
                await this._onModuleLoaded;
            });
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    _onError(message, error) {
        console.error(message);
        console.info(error);
    }
}
function propertyIsEvent(name) {
    // Assume a property is an event if it has a form of "onSomething"
    return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
}
function propertyIsDynamicEvent(name) {
    // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
    return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
}
/**
 * Worker side
 */
export class WebWorkerServer {
    constructor(postMessage, requestHandlerFactory) {
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => this._handleMessage(channel, method, args),
            handleEvent: (channel, eventName, arg) => this._handleEvent(channel, eventName, arg),
        });
        this.requestHandler = requestHandlerFactory(this);
    }
    onmessage(msg) {
        this._protocol.handleMessage(msg);
    }
    _handleMessage(channel, method, args) {
        if (channel === DEFAULT_CHANNEL && method === INITIALIZE) {
            return this.initialize(args[0]);
        }
        const requestHandler = channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel);
        if (!requestHandler) {
            return Promise.reject(new Error(`Missing channel ${channel} on worker thread`));
        }
        if (typeof requestHandler[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on worker thread channel ${channel}`));
        }
        try {
            return Promise.resolve(requestHandler[method].apply(requestHandler, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channel, eventName, arg) {
        const requestHandler = channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel);
        if (!requestHandler) {
            throw new Error(`Missing channel ${channel} on worker thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = requestHandler[eventName].call(requestHandler, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on request handler.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = requestHandler[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on request handler.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel);
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    async initialize(workerId) {
        this._protocol.setWorkerId(workerId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vd29ya2VyL3dlYldvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGFBQWEsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0saUJBQWlCLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3RDLE9BQU8sS0FBSyxPQUFPLE1BQU0sZUFBZSxDQUFBO0FBRXhDLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQTtBQUNqQyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUE7QUFTaEMsSUFBSSxzQkFBc0IsR0FBRyxLQUFLLENBQUE7QUFDbEMsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEdBQVE7SUFDL0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osZ0JBQWdCO1FBQ2hCLE9BQU07SUFDUCxDQUFDO0lBQ0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDN0Isc0JBQXNCLEdBQUcsSUFBSSxDQUFBO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsaUxBQWlMLENBQ2pMLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDMUIsQ0FBQztBQUVELElBQVcsV0FNVjtBQU5ELFdBQVcsV0FBVztJQUNyQixtREFBTyxDQUFBO0lBQ1AsK0NBQUssQ0FBQTtJQUNMLGlFQUFjLENBQUE7SUFDZCwrQ0FBSyxDQUFBO0lBQ0wscUVBQWdCLENBQUE7QUFDakIsQ0FBQyxFQU5VLFdBQVcs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