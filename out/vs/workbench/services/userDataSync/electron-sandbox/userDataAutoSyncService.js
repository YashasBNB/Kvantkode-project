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
import { IUserDataAutoSyncService, UserDataSyncError, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Event } from '../../../../base/common/event.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
let UserDataAutoSyncService = class UserDataAutoSyncService {
    get onError() {
        return Event.map(this.channel.listen('onError'), (e) => UserDataSyncError.toUserDataSyncError(e));
    }
    constructor(sharedProcessService) {
        this.channel = sharedProcessService.getChannel('userDataAutoSync');
    }
    triggerSync(sources, options) {
        return this.channel.call('triggerSync', [sources, options]);
    }
    turnOn() {
        return this.channel.call('turnOn');
    }
    turnOff(everywhere) {
        return this.channel.call('turnOff', [everywhere]);
    }
};
UserDataAutoSyncService = __decorate([
    __param(0, ISharedProcessService)
], UserDataAutoSyncService);
registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvZWxlY3Ryb24tc2FuZGJveC91c2VyRGF0YUF1dG9TeW5jU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sd0JBQXdCLEVBRXhCLGlCQUFpQixHQUNqQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFJNUIsSUFBSSxPQUFPO1FBQ1YsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFRLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDN0QsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQ3hDLENBQUE7SUFDRixDQUFDO0lBRUQsWUFBbUMsb0JBQTJDO1FBQzdFLElBQUksQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFpQixFQUFFLE9BQXFCO1FBQ25ELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxPQUFPLENBQUMsVUFBbUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7Q0FDRCxDQUFBO0FBekJLLHVCQUF1QjtJQVVmLFdBQUEscUJBQXFCLENBQUE7R0FWN0IsdUJBQXVCLENBeUI1QjtBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQSJ9