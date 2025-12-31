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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXJsL2NvbW1vbi91cmxJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBV2pELE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFBb0IsT0FBb0I7UUFBcEIsWUFBTyxHQUFQLE9BQU8sQ0FBYTtJQUFHLENBQUM7SUFFNUMsTUFBTSxDQUFJLENBQVUsRUFBRSxLQUFhO1FBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFVLEVBQUUsT0FBZSxFQUFFLEdBQVM7UUFDMUMsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLFdBQVc7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFDbkMsWUFBb0IsT0FBaUI7UUFBakIsWUFBTyxHQUFQLE9BQU8sQ0FBVTtJQUFHLENBQUM7SUFFekMsU0FBUyxDQUFDLEdBQVEsRUFBRSxPQUF5QjtRQUM1QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRDtB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