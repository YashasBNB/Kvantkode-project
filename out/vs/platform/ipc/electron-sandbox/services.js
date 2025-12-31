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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pcGMvZWxlY3Ryb24tc2FuZGJveC9zZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVksWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzVFLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBRXJCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFNckUsTUFBZSxpQkFBaUI7SUFDL0IsWUFDQyxXQUFtQixFQUNuQixPQUErRixFQUMvRixNQUFjLEVBQ2Qsb0JBQTJDO1FBRTNDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFOUMsSUFBSSx1Q0FBdUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RELE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUN6QyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUN4RCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzlELENBQUM7Q0FDRDtBQVVELFNBQVMsdUNBQXVDLENBQy9DLEdBQVk7SUFFWixNQUFNLFNBQVMsR0FBRyxHQUE0RCxDQUFBO0lBRTlFLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQTtBQUN0QyxDQUFDO0FBRUQsc0JBQXNCO0FBRXRCLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQStDLFNBQVEsaUJBQW9CO0lBQ2hGLFlBQ0MsV0FBbUIsRUFDbkIsT0FBK0YsRUFDMUUsVUFBK0IsRUFDN0Isb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQzlELENBQUM7Q0FDRCxDQUFBO0FBVEssNEJBQTRCO0lBSS9CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtHQUxsQiw0QkFBNEIsQ0FTakM7QUFFRCxNQUFNLFVBQVUsZ0NBQWdDLENBQy9DLEVBQXdCLEVBQ3hCLFdBQW1CLEVBQ25CLE9BQW9GO0lBRXBGLGlCQUFpQixDQUNoQixFQUFFLEVBQ0YsSUFBSSxjQUFjLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQzlFLENBQUE7QUFDRixDQUFDO0FBRUQsWUFBWTtBQUVaLHdCQUF3QjtBQUV4QixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFtQm5HLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQWlELFNBQVEsaUJBQW9CO0lBQ2xGLFlBQ0MsV0FBbUIsRUFDbkIsT0FBK0YsRUFDeEUsVUFBaUMsRUFDakMsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQzlELENBQUM7Q0FDRCxDQUFBO0FBVEssOEJBQThCO0lBSWpDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQUxsQiw4QkFBOEIsQ0FTbkM7QUFFRCxNQUFNLFVBQVUsa0NBQWtDLENBQ2pELEVBQXdCLEVBQ3hCLFdBQW1CLEVBQ25CLE9BQW9GO0lBRXBGLGlCQUFpQixDQUNoQixFQUFFLEVBQ0YsSUFBSSxjQUFjLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQ2hGLENBQUE7QUFDRixDQUFDO0FBRUQsWUFBWSJ9