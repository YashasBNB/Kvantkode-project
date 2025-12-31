/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export class ExtensionHostDebugBroadcastChannel {
    constructor() {
        this._onCloseEmitter = new Emitter();
        this._onReloadEmitter = new Emitter();
        this._onTerminateEmitter = new Emitter();
        this._onAttachEmitter = new Emitter();
    }
    static { this.ChannelName = 'extensionhostdebugservice'; }
    call(ctx, command, arg) {
        switch (command) {
            case 'close':
                return Promise.resolve(this._onCloseEmitter.fire({ sessionId: arg[0] }));
            case 'reload':
                return Promise.resolve(this._onReloadEmitter.fire({ sessionId: arg[0] }));
            case 'terminate':
                return Promise.resolve(this._onTerminateEmitter.fire({ sessionId: arg[0] }));
            case 'attach':
                return Promise.resolve(this._onAttachEmitter.fire({ sessionId: arg[0], port: arg[1], subId: arg[2] }));
        }
        throw new Error('Method not implemented.');
    }
    listen(ctx, event, arg) {
        switch (event) {
            case 'close':
                return this._onCloseEmitter.event;
            case 'reload':
                return this._onReloadEmitter.event;
            case 'terminate':
                return this._onTerminateEmitter.event;
            case 'attach':
                return this._onAttachEmitter.event;
        }
        throw new Error('Method not implemented.');
    }
}
export class ExtensionHostDebugChannelClient extends Disposable {
    constructor(channel) {
        super();
        this.channel = channel;
    }
    reload(sessionId) {
        this.channel.call('reload', [sessionId]);
    }
    get onReload() {
        return this.channel.listen('reload');
    }
    close(sessionId) {
        this.channel.call('close', [sessionId]);
    }
    get onClose() {
        return this.channel.listen('close');
    }
    attachSession(sessionId, port, subId) {
        this.channel.call('attach', [sessionId, port, subId]);
    }
    get onAttachSession() {
        return this.channel.listen('attach');
    }
    terminateSession(sessionId, subId) {
        this.channel.call('terminate', [sessionId, subId]);
    }
    get onTerminateSession() {
        return this.channel.listen('terminate');
    }
    openExtensionDevelopmentHostWindow(args, debugRenderer) {
        return this.channel.call('openExtensionDevelopmentHostWindow', [args, debugRenderer]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGVidWcvY29tbW9uL2V4dGVuc2lvbkhvc3REZWJ1Z0lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBVzlELE1BQU0sT0FBTyxrQ0FBa0M7SUFBL0M7UUFHa0Isb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBc0IsQ0FBQTtRQUNuRCxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQTtRQUNyRCx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBMEIsQ0FBQTtRQUMzRCxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQTtJQStCdkUsQ0FBQzthQXBDZ0IsZ0JBQVcsR0FBRywyQkFBMkIsQUFBOUIsQ0FBOEI7SUFPekQsSUFBSSxDQUFDLEdBQWEsRUFBRSxPQUFlLEVBQUUsR0FBUztRQUM3QyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssT0FBTztnQkFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLEtBQUssUUFBUTtnQkFDWixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUUsS0FBSyxXQUFXO2dCQUNmLE9BQU8sT0FBTyxDQUFDLE9B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