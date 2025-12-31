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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3REZWJ1Z0FkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vYWJzdHJhY3REZWJ1Z0FkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixvQkFBb0I7SUFVekM7UUFSUSxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFBO1FBSXhFLFVBQUssR0FBb0MsRUFBRSxDQUFBO1FBQ2hDLGFBQVEsR0FBRyxJQUFJLE9BQU8sRUFBUyxDQUFBO1FBQy9CLFlBQU8sR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQTtRQUd4RCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBUUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtJQUMxQixDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQTBEO1FBQ25FLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUE7SUFDaEMsQ0FBQztJQUVELE9BQU8s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