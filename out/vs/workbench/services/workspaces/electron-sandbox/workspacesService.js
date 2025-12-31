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
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
// @ts-ignore: interface is implemented via proxy
let NativeWorkspacesService = class NativeWorkspacesService {
    constructor(mainProcessService, nativeHostService) {
        return ProxyChannel.toService(mainProcessService.getChannel('workspaces'), {
            context: nativeHostService.windowId,
        });
    }
};
NativeWorkspacesService = __decorate([
    __param(0, IMainProcessService),
    __param(1, INativeHostService)
], NativeWorkspacesService);
export { NativeWorkspacesService };
registerSingleton(IWorkspacesService, NativeWorkspacesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9lbGVjdHJvbi1zYW5kYm94L3dvcmtzcGFjZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFakYsaURBQWlEO0FBQzFDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBR25DLFlBQ3NCLGtCQUF1QyxFQUN4QyxpQkFBcUM7UUFFekQsT0FBTyxZQUFZLENBQUMsU0FBUyxDQUFxQixrQkFBa0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDOUYsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFFBQVE7U0FDbkMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFYWSx1QkFBdUI7SUFJakMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0dBTFIsdUJBQXVCLENBV25DOztBQUVELGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQSJ9