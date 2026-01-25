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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TWFuYWdlZFNvY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV6RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFVekQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQTtBQUUzRCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVFqQyxZQUFnQyxVQUE4QjtRQUp0RCwyQkFBc0IsR0FBRyxDQUFDLENBQUE7UUFDMUIsYUFBUSxHQUFnQyxJQUFJLENBQUE7UUFDbkMsMEJBQXFCLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUE7UUFHN0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCxVQUFVLENBQ1QsZUFBdUIsRUFDdkIsY0FBNEQ7UUFFNUQsaUNBQWlDO1FBQ2pDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDMUQsaUVBQWlFO1lBQ2pFLE1BQU0sQ0FBQyxPQUFP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