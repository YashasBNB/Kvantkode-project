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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRNYW5hZ2VkU29ja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBRTNFLE9BQU8sRUFDTixhQUFhLEVBRWIsb0JBQW9CLEdBQ3BCLE1BQU0sa0RBQWtELENBQUE7QUFLekQsT0FBTyxFQUNOLDJCQUEyQixHQUUzQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQUt2RCxZQUNDLGNBQStCLEVBRS9CLDJCQUF5RTtRQUV6RSxLQUFLLEVBQUUsQ0FBQTtRQUZVLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFOekQsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQTtRQUMvQyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFBO1FBUXBFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLGVBQXVCO1FBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDMUIs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