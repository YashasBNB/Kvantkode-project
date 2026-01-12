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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ManagedSocket, connectManagedSocket, } from '../../../platform/remote/common/managedSocket.js';
import { IRemoteSocketFactoryService, } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadManagedSockets = class MainThreadManagedSockets extends Disposable {
    constructor(extHostContext, _remoteSocketFactoryService) {
        super();
        this._remoteSocketFactoryService = _remoteSocketFactoryService;
        this._registrations = new Map();
        this._remoteSockets = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostManagedSockets);
    }
    async $registerSocketFactory(socketFactoryId) {
        const that = this;
        const socketFactory = new (class {
            supports(connectTo) {
                return connectTo.id === socketFactoryId;
            }
            connect(connectTo, path, query, debugLabel) {
                return new Promise((resolve, reject) => {
                    if (connectTo.id !== socketFactoryId) {
                        return reject(new Error('Invalid connectTo'));
                    }
                    const factoryId = connectTo.id;
                    that._proxy
                        .$openRemoteSocket(factoryId)
                        .then((socketId) => {
                        const half = {
                            onClose: new Emitter(),
                            onData: new Emitter(),
                            onEnd: new Emitter(),
                        };
                        that._remoteSockets.set(socketId, half);
                        MainThreadManagedSocket.connect(socketId, that._proxy, path, query, debugLabel, half).then((socket) => {
                            socket.onDidDispose(() => that._remoteSockets.delete(socketId));
                            resolve(socket);
                        }, (err) => {
                            that._remoteSockets.delete(socketId);
                            reject(err);
                        });
                    })
                        .catch(reject);
                });
            }
        })();
        this._registrations.set(socketFactoryId, this._remoteSocketFactoryService.register(1 /* RemoteConnectionType.Managed */, socketFactory));
    }
    async $unregisterSocketFactory(socketFactoryId) {
        this._registrations.get(socketFactoryId)?.dispose();
    }
    $onDidManagedSocketHaveData(socketId, data) {
        this._remoteSockets.get(socketId)?.onData.fire(data);
    }
    $onDidManagedSocketClose(socketId, error) {
        this._remoteSockets.get(socketId)?.onClose.fire({
            type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
            error: error ? new Error(error) : undefined,
            hadError: !!error,
        });
        this._remoteSockets.delete(socketId);
    }
    $onDidManagedSocketEnd(socketId) {
        this._remoteSockets.get(socketId)?.onEnd.fire();
    }
};
MainThreadManagedSockets = __decorate([
    extHostNamedCustomer(MainContext.MainThreadManagedSockets),
    __param(1, IRemoteSocketFactoryService)
], MainThreadManagedSockets);
export { MainThreadManagedSockets };
export class MainThreadManagedSocket extends ManagedSocket {
    static connect(socketId, proxy, path, query, debugLabel, half) {
        const socket = new MainThreadManagedSocket(socketId, proxy, debugLabel, half);
        return connectManagedSocket(socket, path, query, debugLabel, half);
    }
    constructor(socketId, proxy, debugLabel, half) {
        super(debugLabel, half);
        this.socketId = socketId;
        this.proxy = proxy;
    }
    write(buffer) {
        this.proxy.$remoteSocketWrite(this.socketId, buffer);
    }
    closeRemote() {
        this.proxy.$remoteSocketEnd(this.socketId);
    }
    drain() {
        return this.proxy.$remoteSocketDrain(this.socketId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFFM0UsT0FBTyxFQUNOLGFBQWEsRUFFYixvQkFBb0IsR0FDcEIsTUFBTSxrREFBa0QsQ0FBQTtBQUt6RCxPQUFPLEVBQ04sMkJBQTJCLEdBRTNCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFHdEQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBS3ZELFlBQ0MsY0FBK0IsRUFFL0IsMkJBQXlFO1FBRXpFLEtBQUssRUFBRSxDQUFBO1FBRlUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQU56RCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFBO1FBQy9DLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUE7UUFRcEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsZUFBdUI7UUFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQztZ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