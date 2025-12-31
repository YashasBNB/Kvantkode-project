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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9tZXRyaWNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQVMvRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFrQixnQkFBZ0IsQ0FBQyxDQUFBO0FBRWpGLGlDQUFpQztBQUMxQixJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBSTFCLFlBQ3NCLGtCQUF1QztRQUU1RCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUMzQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FDckQsQ0FBQTtJQUNGLENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLEdBQUcsTUFBOEM7UUFDeEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQUcsTUFBZ0Q7UUFDNUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsZ0dBQWdHO0lBQ2hHLEtBQUssQ0FBQyxzQkFBc0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDcEQsQ0FBQztDQUNELENBQUE7QUExQlksY0FBYztJQUt4QixXQUFBLG1CQUFtQixDQUFBO0dBTFQsY0FBYyxDQTBCMUI7O0FBRUQsaUJBQWlCLENBQUMsZUFBZSxFQUFFLGNBQWMsa0NBQTBCLENBQUE7QUFFM0UsbUJBQW1CO0FBQ25CLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSwyQkFBMkIsQ0FBQztTQUNqRSxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV2RCxNQUFNLGVBQWUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3hDLFlBQVksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDeEYsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9