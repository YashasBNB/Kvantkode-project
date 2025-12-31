/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { MainContext, } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { VSBuffer } from '../../../base/common/buffer.js';
export const IExtHostManagedSockets = createDecorator('IExtHostManagedSockets');
let ExtHostManagedSockets = class ExtHostManagedSockets {
    constructor(extHostRpc) {
        this._remoteSocketIdCounter = 0;
        this._factory = null;
        this._managedRemoteSockets = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadManagedSockets);
    }
    setFactory(socketFactoryId, makeConnection) {
        // Terminate all previous sockets
        for (const socket of this._managedRemoteSockets.values()) {
            // calling dispose() will lead to it removing itself from the map
            socket.dispose();
        }
        // Unregister previous factory
        if (this._factory) {
            this._proxy.$unregisterSocketFactory(this._factory.socketFactoryId);
        }
        this._factory = new ManagedSocketFactory(socketFactoryId, makeConnection);
        this._proxy.$registerSocketFactory(this._factory.socketFactoryId);
    }
    async $openRemoteSocket(socketFactoryId) {
        if (!this._factory || this._factory.socketFactoryId !== socketFactoryId) {
            throw new Error(`No socket factory with id ${socketFactoryId}`);
        }
        const id = ++this._remoteSocketIdCounter;
        const socket = await this._factory.makeConnection();
        const disposable = new DisposableStore();
        this._managedRemoteSockets.set(id, new ManagedSocket(id, socket, disposable));
        disposable.add(toDisposable(() => this._managedRemoteSockets.delete(id)));
        disposable.add(socket.onDidEnd(() => {
            this._proxy.$onDidManagedSocketEnd(id);
            disposable.dispose();
        }));
        disposable.add(socket.onDidClose((e) => {
            this._proxy.$onDidManagedSocketClose(id, e?.stack ?? e?.message);
            disposable.dispose();
        }));
        disposable.add(socket.onDidReceiveMessage((e) => this._proxy.$onDidManagedSocketHaveData(id, VSBuffer.wrap(e))));
        return id;
    }
    $remoteSocketWrite(socketId, buffer) {
        this._managedRemoteSockets.get(socketId)?.actual.send(buffer.buffer);
    }
    $remoteSocketEnd(socketId) {
        const socket = this._managedRemoteSockets.get(socketId);
        if (socket) {
            socket.actual.end();
            socket.dispose();
        }
    }
    async $remoteSocketDrain(socketId) {
        await this._managedRemoteSockets.get(socketId)?.actual.drain?.();
    }
};
ExtHostManagedSockets = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostManagedSockets);
export { ExtHostManagedSockets };
class ManagedSocketFactory {
    constructor(socketFactoryId, makeConnection) {
        this.socketFactoryId = socketFactoryId;
        this.makeConnection = makeConnection;
    }
}
class ManagedSocket extends Disposable {
    constructor(socketId, actual, disposer) {
        super();
        this.socketId = socketId;
        this.actual = actual;
        this._register(disposer);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE1hbmFnZWRTb2NrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBVXpELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUE7QUFFM0QsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFRakMsWUFBZ0MsVUFBOEI7UUFKdEQsMkJBQXNCLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLGFBQVEsR0FBZ0MsSUFBSSxDQUFBO1FBQ25DLDBCQUFxQixHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRzdFLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsVUFBVSxDQUNULGVBQXVCLEVBQ3ZCLGNBQTREO1FBRTVELGlDQUFpQztRQUNqQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzFELGlFQUFpRTtZQUNqRSxNQUFNLENBQUMsT0FBTyxFQUFF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