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
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { SyncDescriptor } from '../../instantiation/common/descriptors.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../instantiation/common/instantiation.js';
import { IMainProcessService } from '../common/mainProcessService.js';
class RemoteServiceStub {
    constructor(channelName, options, remote, instantiationService) {
        const channel = remote.getChannel(channelName);
        if (isRemoteServiceWithChannelClientOptions(options)) {
            return instantiationService.createInstance(new SyncDescriptor(options.channelClientCtor, [channel]));
        }
        return ProxyChannel.toService(channel, options?.proxyOptions);
    }
}
function isRemoteServiceWithChannelClientOptions(obj) {
    const candidate = obj;
    return !!candidate?.channelClientCtor;
}
//#region Main Process
let MainProcessRemoteServiceStub = class MainProcessRemoteServiceStub extends RemoteServiceStub {
    constructor(channelName, options, ipcService, instantiationService) {
        super(channelName, options, ipcService, instantiationService);
    }
};
MainProcessRemoteServiceStub = __decorate([
    __param(2, IMainProcessService),
    __param(3, IInstantiationService)
], MainProcessRemoteServiceStub);
export function registerMainProcessRemoteService(id, channelName, options) {
    registerSingleton(id, new SyncDescriptor(MainProcessRemoteServiceStub, [channelName, options], true));
}
//#endregion
//#region Shared Process
export const ISharedProcessService = createDecorator('sharedProcessService');
let SharedProcessRemoteServiceStub = class SharedProcessRemoteServiceStub extends RemoteServiceStub {
    constructor(channelName, options, ipcService, instantiationService) {
        super(channelName, options, ipcService, instantiationService);
    }
};
SharedProcessRemoteServiceStub = __decorate([
    __param(2, ISharedProcessService),
    __param(3, IInstantiationService)
], SharedProcessRemoteServiceStub);
export function registerSharedProcessRemoteService(id, channelName, options) {
    registerSingleton(id, new SyncDescriptor(SharedProcessRemoteServiceStub, [channelName, options], true));
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2lwYy9lbGVjdHJvbi1zYW5kYm94L3NlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBWSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDNUUsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FFckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU1yRSxNQUFlLGlCQUFpQjtJQUMvQixZQUNDLFdBQW1CLEVBQ25CLE9BQStGLEVBQy9GLE1BQWMsRUFDZCxvQkFBMkM7UUFFM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUU5QyxJQUFJLHVDQUF1QyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEQsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQ3hELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDOUQsQ0FBQztDQUNEO0FBVUQsU0FBUyx1Q0FBdUMsQ0FDL0MsR0FBWTtJQUVaLE1BQU0sU0FBUyxHQUFHLEdBQTRELENBQUE7SUFFOUUsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFBO0FBQ3RDLENBQUM7QUFFRCxzQkFBc0I7QUFFdEIsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBK0MsU0FBUSxpQkFBb0I7SUFDaEYsWUFDQyxXQUFtQixFQUNuQixPQUErRixFQUMxRSxVQUErQixFQUM3QixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDOUQsQ0FBQztDQUNELENBQUE7QUFUSyw0QkFBNEI7SUFJL0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0dBTGxCLDRCQUE0QixDQVNqQztBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsRUFBd0IsRUFDeEIsV0FBbUIsRUFDbkIsT0FBb0Y7SUFFcEYsaUJBQWlCLENBQ2hCLEVBQUUsRUFDRixJQUFJLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FDOUUsQ0FBQTtBQUNGLENBQUM7QUFFRCxZQUFZO0FBRVosd0JBQXdCO0FBRXhCLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQTtBQW1CbkcsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBaUQsU0FBUSxpQkFBb0I7SUFDbEYsWUFDQyxXQUFtQixFQUNuQixPQUErRixFQUN4RSxVQUFpQyxFQUNqQyxvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDOUQsQ0FBQztDQUNELENBQUE7QUFUSyw4QkFBOEI7SUFJakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBTGxCLDhCQUE4QixDQVNuQztBQUVELE1BQU0sVUFBVSxrQ0FBa0MsQ0FDakQsRUFBd0IsRUFDeEIsV0FBbUIsRUFDbkIsT0FBb0Y7SUFFcEYsaUJBQWlCLENBQ2hCLEVBQUUsRUFDRixJQUFJLGNBQWMsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FDaEYsQ0FBQTtBQUNGLENBQUM7QUFFRCxZQUFZIn0=