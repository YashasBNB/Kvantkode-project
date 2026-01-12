/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export class URLHandlerChannel {
    constructor(handler) {
        this.handler = handler;
    }
    listen(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, arg) {
        switch (command) {
            case 'handleURL':
                return this.handler.handleURL(URI.revive(arg[0]), arg[1]);
        }
        throw new Error(`Call not found: ${command}`);
    }
}
export class URLHandlerChannelClient {
    constructor(channel) {
        this.channel = channel;
    }
    handleURL(uri, options) {
        return this.channel.call('handleURL', [uri.toJSON(), options]);
    }
}
export class URLHandlerRouter {
    constructor(next, logService) {
        this.next = next;
        this.logService = logService;
    }
    async routeCall(hub, command, arg, cancellationToken) {
        if (command !== 'handleURL') {
            throw new Error(`Call not found: ${command}`);
        }
        if (Array.isArray(arg) && arg.length > 0) {
            const uri = URI.revive(arg[0]);
            this.logService.trace('URLHandlerRouter#routeCall() with URI argument', uri.toString(true));
            if (uri.query) {
                const match = /\bwindowId=(\d+)/.exec(uri.query);
                if (match) {
                    const windowId = match[1];
                    this.logService.trace(`URLHandlerRouter#routeCall(): found windowId query parameter with value "${windowId}"`, uri.toString(true));
                    const regex = new RegExp(`window:${windowId}`);
                    const connection = hub.connections.find((c) => {
                        this.logService.trace('URLHandlerRouter#routeCall(): testing connection', c.ctx);
                        return regex.test(c.ctx);
                    });
                    if (connection) {
                        this.logService.trace('URLHandlerRouter#routeCall(): found a connection to route', uri.toString(true));
                        return connection;
                    }
                    else {
                        this.logService.trace('URLHandlerRouter#routeCall(): did not find a connection to route', uri.toString(true));
                    }
                }
                else {
                    this.logService.trace('URLHandlerRouter#routeCall(): did not find windowId query parameter', uri.toString(true));
                }
            }
        }
        else {
            this.logService.trace('URLHandlerRouter#routeCall() without URI argument');
        }
        return this.next.routeCall(hub, command, arg, cancellationToken);
    }
    routeEvent(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cmwvY29tbW9uL3VybElwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFXakQsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixZQUFvQixPQUFvQjtRQUFwQixZQUFPLEdBQVAsT0FBTyxDQUFhO0lBQUcsQ0FBQztJQUU1QyxNQUFNLENBQUksQ0FBVSxFQUFFLEtBQWE7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsR0FBUztRQUMxQyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssV0FBVztnQkFDZixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQyxZQUFvQixPQUFpQjtRQUFqQixZQUFPLEdBQVAsT0FBTyxDQUFVO0lBQUcsQ0FBQztJQUV6QyxTQUFTLENBQUMsR0FBUSxFQUFFLE9BQXlCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztD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