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
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ITimelineService, } from '../../contrib/timeline/common/timeline.js';
import { revive } from '../../../base/common/marshalling.js';
let MainThreadTimeline = class MainThreadTimeline {
    constructor(context, logService, _timelineService) {
        this.logService = logService;
        this._timelineService = _timelineService;
        this._providerEmitters = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostTimeline);
    }
    $registerTimelineProvider(provider) {
        this.logService.trace(`MainThreadTimeline#registerTimelineProvider: id=${provider.id}`);
        const proxy = this._proxy;
        const emitters = this._providerEmitters;
        let onDidChange = emitters.get(provider.id);
        if (onDidChange === undefined) {
            onDidChange = new Emitter();
            emitters.set(provider.id, onDidChange);
        }
        this._timelineService.registerTimelineProvider({
            ...provider,
            onDidChange: onDidChange.event,
            async provideTimeline(uri, options, token) {
                return revive(await proxy.$getTimeline(provider.id, uri, options, token));
            },
            dispose() {
                emitters.delete(provider.id);
                onDidChange?.dispose();
            },
        });
    }
    $unregisterTimelineProvider(id) {
        this.logService.trace(`MainThreadTimeline#unregisterTimelineProvider: id=${id}`);
        this._timelineService.unregisterTimelineProvider(id);
    }
    $emitTimelineChangeEvent(e) {
        this.logService.trace(`MainThreadTimeline#emitChangeEvent: id=${e.id}, uri=${e.uri?.toString(true)}`);
        const emitter = this._providerEmitters.get(e.id);
        emitter?.fire(e);
    }
    dispose() {
        // noop
    }
};
MainThreadTimeline = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTimeline),
    __param(1, ILogService),
    __param(2, ITimelineService)
], MainThreadTimeline);
export { MainThreadTimeline };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRpbWVsaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUaW1lbGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixXQUFXLEVBR1gsY0FBYyxHQUNkLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFJTixnQkFBZ0IsR0FFaEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHckQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFJOUIsWUFDQyxPQUF3QixFQUNYLFVBQXdDLEVBQ25DLGdCQUFtRDtRQUR2QyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2xCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFMckQsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUE7UUFPbkYsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQseUJBQXlCLENBQUMsUUFBb0M7UUFDN0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsbURBQW1ELFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXZGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFFekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQ3ZDLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLFdBQVcsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQTtZQUNoRCxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQztZQUM5QyxHQUFHLFFBQVE7WUFDWCxXQUFXLEVBQUUsV0FBVyxDQUFDLEtBQUs7WUFDOUIsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFRLEVBQUUsT0FBd0IsRUFBRSxLQUF3QjtnQkFDakYsT0FBTyxNQUFNLENBQVcsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7WUFDRCxPQUFPO2dCQUNOLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM1QixXQUFXLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDdkIsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxFQUFVO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsQ0FBc0I7UUFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDBDQUEwQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQzlFLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNoRCxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTztJQUNSLENBQUM7Q0FDRCxDQUFBO0FBdkRZLGtCQUFrQjtJQUQ5QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUM7SUFPbEQsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGdCQUFnQixDQUFBO0dBUE4sa0JBQWtCLENBdUQ5QiJ9