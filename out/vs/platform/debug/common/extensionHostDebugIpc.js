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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kZWJ1Zy9jb21tb24vZXh0ZW5zaW9uSG9zdERlYnVnSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFXOUQsTUFBTSxPQUFPLGtDQUFrQztJQUEvQztRQUdrQixvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFzQixDQUFBO1FBQ25ELHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQ3JELHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFBO1FBQzNELHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO0lBK0J2RSxDQUFDO2FBcENnQixnQkFBVyxHQUFHLDJCQUEyQixBQUE5QixDQUE4QjtJQU96RCxJQUFJLENBQUMsR0FBYSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQzdDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxPQUFPO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekUsS0FBSyxRQUFRO2dCQUNaLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxRSxLQUFLLFdBQVc7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