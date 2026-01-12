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
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { localize2 } from '../../../../nls.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const IMetricsService = createDecorator('metricsService');
// implemented by calling channel
let MetricsService = class MetricsService {
    constructor(mainProcessService) {
        // creates an IPC proxy to use metricsMainService.ts
        this.metricsService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-metrics'));
    }
    // call capture on the channel
    capture(...params) {
        this.metricsService.capture(...params);
    }
    setOptOut(...params) {
        this.metricsService.setOptOut(...params);
    }
    // anything transmitted over a channel must be async even if it looks like it doesn't have to be
    async getDebuggingProperties() {
        return this.metricsService.getDebuggingProperties();
    }
};
MetricsService = __decorate([
    __param(0, IMainProcessService)
], MetricsService);
export { MetricsService };
registerSingleton(IMetricsService, MetricsService, 0 /* InstantiationType.Eager */);
// debugging action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'voidDebugInfo',
            f1: true,
            title: localize2('voidMetricsDebug', 'KvantKode: Log Debug Info'),
        });
    }
    async run(accessor) {
        const metricsService = accessor.get(IMetricsService);
        const notifService = accessor.get(INotificationService);
        const debugProperties = await metricsService.getDebuggingProperties();
        console.log('Metrics:', debugProperties);
        notifService.info(`KvantKode Debug info:\n${JSON.stringify(debugProperties, null, 2)}`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL21ldHJpY3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBUy9GLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUE7QUFFakYsaUNBQWlDO0FBQzFCLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFJMUIsWUFDc0Isa0JBQXVDO1FBRTVELG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQzNDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUNyRCxDQUFBO0lBQ0YsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixPQUFPLENBQUMsR0FBRyxNQUE4QztRQUN4RCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBRyxNQUFnRDtRQUM1RCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxnR0FBZ0c7SUFDaEcsS0FBSyxDQUFDLHNCQUFzQjtRQUMzQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxjQUFjO0lBS3hCLFdBQUEsbUJBQW1CLENBQUE7R0FMVCxjQUFjLENBMEIxQjs7QUFFRCxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsY0FBYyxrQ0FBMEIsQ0FBQTtBQUUzRSxtQkFBbUI7QUFDbkIsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGVBQWU7WUFDbkIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLDJCQUEyQixDQUFDO1NBQ2pFLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRXZELE1BQU0sZUFBZSxHQUFHLE1BQU0sY0FBYyxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDeEMsWUFBWSxDQUFDLElBQUksQ0FBQywwQkFBMEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN4RixDQUFDO0NBQ0QsQ0FDRCxDQUFBIn0=