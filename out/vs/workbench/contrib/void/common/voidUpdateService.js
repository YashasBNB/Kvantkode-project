/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
export const IVoidUpdateService = createDecorator('VoidUpdateService');
// implemented by calling channel
let VoidUpdateService = class VoidUpdateService {
    constructor(mainProcessService) {
        // anything transmitted over a channel must be async even if it looks like it doesn't have to be
        this.check = async (explicit) => {
            const res = await this.voidUpdateService.check(explicit);
            return res;
        };
        // creates an IPC proxy to use metricsMainService.ts
        this.voidUpdateService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-update'));
    }
};
VoidUpdateService = __decorate([
    __param(0, IMainProcessService)
], VoidUpdateService);
export { VoidUpdateService };
registerSingleton(IVoidUpdateService, VoidUpdateService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi92b2lkVXBkYXRlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQVEzRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUE7QUFFMUYsaUNBQWlDO0FBQzFCLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBSTdCLFlBQ3NCLGtCQUF1QztRQVE3RCxnR0FBZ0c7UUFDaEcsVUFBSyxHQUFnQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDdkQsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hELE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQyxDQUFBO1FBVkEsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUM5QyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FDcEQsQ0FBQTtJQUNGLENBQUM7Q0FPRCxDQUFBO0FBbEJZLGlCQUFpQjtJQUszQixXQUFBLG1CQUFtQixDQUFBO0dBTFQsaUJBQWlCLENBa0I3Qjs7QUFFRCxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsa0NBQTBCLENBQUEifQ==