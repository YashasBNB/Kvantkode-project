/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { timeout } from '../../../../base/common/async.js';
import { localize } from '../../../../nls.js';
/**
 * Abstract implementation of the low level API for a debug adapter.
 * Missing is how this API communicates with the debug adapter.
 */
export class AbstractDebugAdapter {
    constructor() {
        this.pendingRequests = new Map();
        this.queue = [];
        this._onError = new Emitter();
        this._onExit = new Emitter();
        this.sequence = 1;
    }
    get onError() {
        return this._onError.event;
    }
    get onExit() {
        return this._onExit.event;
    }
    onMessage(callback) {
        if (this.messageCallback) {
            this._onError.fire(new Error(`attempt to set more than one 'Message' callback`));
        }
        this.messageCallback = callback;
    }
    onEvent(callback) {
        if (this.eventCallback) {
            this._onError.fire(new Error(`attempt to set more than one 'Event' callback`));
        }
        this.eventCallback = callback;
    }
    onRequest(callback) {
        if (this.requestCallback) {
            this._onError.fire(new Error(`attempt to set more than one 'Request' callback`));
        }
        this.requestCallback = callback;
    }
    sendResponse(response) {
        if (response.seq > 0) {
            this._onError.fire(new Error(`attempt to send more than one response for command ${response.command}`));
        }
        else {
            this.internalSend('response', response);
        }
    }
    sendRequest(command, args, clb, timeout) {
        const request = {
            command: command,
        };
        if (args && Object.keys(args).length > 0) {
            request.arguments = args;
        }
        this.internalSend('request', request);
        if (typeof timeout === 'number') {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                const clb = this.pendingRequests.get(request.seq);
                if (clb) {
                    this.pendingRequests.delete(request.seq);
                    const err = {
                        type: 'response',
                        seq: 0,
                        request_seq: request.seq,
                        success: false,
                        command,
                        message: localize('timeout', "Timeout after {0} ms for '{1}'", timeout, command),
                    };
                    clb(err);
                }
            }, timeout);
        }
        if (clb) {
            // store callback for this request
            this.pendingRequests.set(request.seq, clb);
        }
        return request.seq;
    }
    acceptMessage(message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        }
        else {
            this.queue.push(message);
            if (this.queue.length === 1) {
                // first item = need to start processing loop
                this.processQueue();
            }
        }
    }
    /**
     * Returns whether we should insert a timeout between processing messageA
     * and messageB. Artificially queueing protocol messages guarantees that any
     * microtasks for previous message finish before next message is processed.
     * This is essential ordering when using promises anywhere along the call path.
     *
     * For example, take the following, where `chooseAndSendGreeting` returns
     * a person name and then emits a greeting event:
     *
     * ```
     * let person: string;
     * adapter.onGreeting(() => console.log('hello', person));
     * person = await adapter.chooseAndSendGreeting();
     * ```
     *
     * Because the event is dispatched synchronously, it may fire before person
     * is assigned if they're processed in the same task. Inserting a task
     * boundary avoids this issue.
     */
    needsTaskBoundaryBetween(messageA, messageB) {
        return messageA.type !== 'event' || messageB.type !== 'event';
    }
    /**
     * Reads and dispatches items from the queue until it is empty.
     */
    async processQueue() {
        let message;
        while (this.queue.length) {
            if (!message || this.needsTaskBoundaryBetween(this.queue[0], message)) {
                await timeout(0);
            }
            message = this.queue.shift();
            if (!message) {
                return; // may have been disposed of
            }
            switch (message.type) {
                case 'event':
                    this.eventCallback?.(message);
                    break;
                case 'request':
                    this.requestCallback?.(message);
                    break;
                case 'response': {
                    const response = message;
                    const clb = this.pendingRequests.get(response.request_seq);
                    if (clb) {
                        this.pendingRequests.delete(response.request_seq);
                        clb(response);
                    }
                    break;
                }
            }
        }
    }
    internalSend(typ, message) {
        message.type = typ;
        message.seq = this.sequence++;
        this.sendMessage(message);
    }
    async cancelPendingRequests() {
        if (this.pendingRequests.size === 0) {
            return Promise.resolve();
        }
        const pending = new Map();
        this.pendingRequests.forEach((value, key) => pending.set(key, value));
        await timeout(500);
        pending.forEach((callback, request_seq) => {
            const err = {
                type: 'response',
                seq: 0,
                request_seq,
                success: false,
                command: 'canceled',
                message: 'canceled',
            };
            callback(err);
            this.pendingRequests.delete(request_seq);
        });
    }
    getPendingRequestIds() {
        return Array.from(this.pendingRequests.keys());
    }
    dispose() {
        this.queue = [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3REZWJ1Z0FkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9hYnN0cmFjdERlYnVnQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLG9CQUFvQjtJQVV6QztRQVJRLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUE7UUFJeEUsVUFBSyxHQUFvQyxFQUFFLENBQUE7UUFDaEMsYUFBUSxHQUFHLElBQUksT0FBTyxFQUFTLENBQUE7UUFDL0IsWUFBTyxHQUFHLElBQUksT0FBTyxFQUFpQixDQUFBO1FBR3hELElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCLENBQUM7SUFRRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO0lBQzFCLENBQUM7SUFFRCxTQUFTLENBQUMsUUFBMEQ7UUFDbkUsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FB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