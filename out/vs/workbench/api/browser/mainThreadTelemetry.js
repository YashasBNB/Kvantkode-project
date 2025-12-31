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
var MainThreadTelemetry_1;
import { Disposable } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { ITelemetryService, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SETTING_ID, } from '../../../platform/telemetry/common/telemetry.js';
import { supportsTelemetry } from '../../../platform/telemetry/common/telemetryUtils.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
let MainThreadTelemetry = class MainThreadTelemetry extends Disposable {
    static { MainThreadTelemetry_1 = this; }
    static { this._name = 'pluginHostTelemetry'; }
    constructor(extHostContext, _telemetryService, _configurationService, _environmentService, _productService) {
        super();
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTelemetry);
        if (supportsTelemetry(this._productService, this._environmentService)) {
            this._register(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(TELEMETRY_SETTING_ID) ||
                    e.affectsConfiguration(TELEMETRY_OLD_SETTING_ID)) {
                    this._proxy.$onDidChangeTelemetryLevel(this.telemetryLevel);
                }
            }));
        }
        this._proxy.$initializeTelemetryLevel(this.telemetryLevel, supportsTelemetry(this._productService, this._environmentService), this._productService.enabledTelemetryLevels);
    }
    get telemetryLevel() {
        if (!supportsTelemetry(this._productService, this._environmentService)) {
            return 0 /* TelemetryLevel.NONE */;
        }
        return this._telemetryService.telemetryLevel;
    }
    $publicLog(eventName, data = Object.create(null)) {
        // __GDPR__COMMON__ "pluginHostTelemetry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        data[MainThreadTelemetry_1._name] = true;
        this._telemetryService.publicLog(eventName, data);
    }
    $publicLog2(eventName, data) {
        this.$publicLog(eventName, data);
    }
};
MainThreadTelemetry = MainThreadTelemetry_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTelemetry),
    __param(1, ITelemetryService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService),
    __param(4, IProductService)
], MainThreadTelemetry);
export { MainThreadTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBT3BGLE9BQU8sRUFDTixpQkFBaUIsRUFFakIsd0JBQXdCLEVBQ3hCLG9CQUFvQixHQUNwQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sY0FBYyxFQUVkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBRy9CLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFHMUIsVUFBSyxHQUFHLHFCQUFxQixBQUF4QixDQUF3QjtJQUVyRCxZQUNDLGNBQStCLEVBQ0ssaUJBQW9DLEVBQ2hDLHFCQUE0QyxFQUM5QyxtQkFBd0MsRUFDNUMsZUFBZ0M7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFMNkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDNUMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBSWxFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUV0RSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN2RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN6RCxJQUNDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQztvQkFDNUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLEVBQy9DLENBQUM7b0JBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQzVELENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQ3BDLElBQUksQ0FBQyxjQUFjLEVBQ25CLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQ2pFLElBQUksQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQzNDLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBWSxjQUFjO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDeEUsbUNBQTBCO1FBQzNCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUE7SUFDN0MsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFpQixFQUFFLE9BQVksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDNUQsc0lBQXNJO1FBQ3RJLElBQUksQ0FBQyxxQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELFdBQVcsQ0FDVixTQUFpQixFQUNqQixJQUFnQztRQUVoQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFXLENBQUMsQ0FBQTtJQUN4QyxDQUFDOztBQXREVyxtQkFBbUI7SUFEL0Isb0JBQW9CLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDO0lBUW5ELFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZUFBZSxDQUFBO0dBVkwsbUJBQW1CLENBdUQvQiJ9