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
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from './telemetry.js';
import { TelemetryService } from './telemetryService.js';
import { NullTelemetryServiceShape } from './telemetryUtils.js';
let ServerTelemetryService = class ServerTelemetryService extends TelemetryService {
    constructor(config, injectedTelemetryLevel, _configurationService, _productService) {
        super(config, _configurationService, _productService);
        this._injectedTelemetryLevel = injectedTelemetryLevel;
    }
    publicLog(eventName, data) {
        if (this._injectedTelemetryLevel < 3 /* TelemetryLevel.USAGE */) {
            return;
        }
        return super.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        return this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        if (this._injectedTelemetryLevel < 2 /* TelemetryLevel.ERROR */) {
            return Promise.resolve(undefined);
        }
        return super.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        return this.publicLogError(eventName, data);
    }
    async updateInjectedTelemetryLevel(telemetryLevel) {
        if (telemetryLevel === undefined) {
            this._injectedTelemetryLevel = 0 /* TelemetryLevel.NONE */;
            throw new Error('Telemetry level cannot be undefined. This will cause infinite looping!');
        }
        // We always take the most restrictive level because we don't want multiple clients to connect and send data when one client does not consent
        this._injectedTelemetryLevel = this._injectedTelemetryLevel
            ? Math.min(this._injectedTelemetryLevel, telemetryLevel)
            : telemetryLevel;
        if (this._injectedTelemetryLevel === 0 /* TelemetryLevel.NONE */) {
            this.dispose();
        }
    }
};
ServerTelemetryService = __decorate([
    __param(2, IConfigurationService),
    __param(3, IProductService)
], ServerTelemetryService);
export { ServerTelemetryService };
export const ServerNullTelemetryService = new (class extends NullTelemetryServiceShape {
    async updateInjectedTelemetryLevel() {
        return;
    } // No-op, telemetry is already disabled
})();
export const IServerTelemetryService = refineServiceDecorator(ITelemetryService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyVGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vc2VydmVyVGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFeEUsT0FBTyxFQUFrQixpQkFBaUIsRUFBa0IsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRixPQUFPLEVBQTJCLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFNeEQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxnQkFBZ0I7SUFLM0QsWUFDQyxNQUErQixFQUMvQixzQkFBc0MsRUFDZixxQkFBNEMsRUFDbEQsZUFBZ0M7UUFFakQsS0FBSyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsc0JBQXNCLENBQUE7SUFDdEQsQ0FBQztJQUVRLFNBQVMsQ0FBQyxTQUFpQixFQUFFLElBQXFCO1FBQzFELElBQUksSUFBSSxDQUFDLHVCQUF1QiwrQkFBdUIsRUFBRSxDQUFDO1lBQ3pELE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRVEsVUFBVSxDQUdqQixTQUFpQixFQUFFLElBQWdDO1FBQ3BELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBa0MsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFUSxjQUFjLENBQUMsY0FBc0IsRUFBRSxJQUFxQjtRQUNwRSxJQUFJLElBQUksQ0FBQyx1QkFBdUIsK0JBQXVCLEVBQUUsQ0FBQztZQUN6RCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVRLGVBQWUsQ0FHdEIsU0FBaUIsRUFBRSxJQUFnQztRQUNwRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQWtDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsS0FBSyxDQUFDLDRCQUE0QixDQUFDLGNBQThCO1FBQ2hFLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyx1QkFBdUIsOEJBQXNCLENBQUE7WUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3RUFBd0UsQ0FBQyxDQUFBO1FBQzFGLENBQUM7UUFDRCw2SUFBNkk7UUFDN0ksSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyx1QkFBdUI7WUFDMUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQztZQUN4RCxDQUFDLENBQUMsY0FBYyxDQUFBO1FBQ2pCLElBQUksSUFBSSxDQUFDLHVCQUF1QixnQ0FBd0IsRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXhEWSxzQkFBc0I7SUFRaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtHQVRMLHNCQUFzQixDQXdEbEM7O0FBRUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEtBQzlDLFNBQVEseUJBQXlCO0lBR2pDLEtBQUssQ0FBQyw0QkFBNEI7UUFDakMsT0FBTTtJQUNQLENBQUMsQ0FBQyx1Q0FBdUM7Q0FDekMsQ0FBQyxFQUFFLENBQUE7QUFFSixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FHM0QsaUJBQWlCLENBQUMsQ0FBQSJ9