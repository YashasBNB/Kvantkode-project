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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2VsZWN0cm9uLXNhbmRib3gvdXNlckRhdGFBdXRvU3luY1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHdCQUF3QixFQUV4QixpQkFBaUIsR0FDakIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBSTVCLElBQUksT0FBTztRQUNWLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBUSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzdELGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUN4QyxDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQW1DLG9CQUEyQztRQUM3RSxJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBaUIsRUFBRSxPQUFxQjtRQUNuRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFVBQW1CO1FBQzFCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0QsQ0FBQTtBQXpCSyx1QkFBdUI7SUFVZixXQUFBLHFCQUFxQixDQUFBO0dBVjdCLHVCQUF1QixDQXlCNUI7QUFFRCxpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsb0NBQTRCLENBQUEifQ==