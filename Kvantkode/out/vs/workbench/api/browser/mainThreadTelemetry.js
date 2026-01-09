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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFPcEYsT0FBTyxFQUNOLGlCQUFpQixFQUVqQix3QkFBd0IsRUFDeEIsb0JBQW9CLEdBQ3BCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFHL0IsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVOzthQUcxQixVQUFLLEdBQUcscUJBQXFCLEFBQXhCLENBQXdCO0lBRXJELFlBQ0MsY0FBK0IsRUFDSyxpQkFBb0MsRUFDaEMscUJBQTRDLEVBQzlDLG1CQUF3QyxFQUM1QyxlQUFnQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUw2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2hDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUM1QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFJbEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXRFLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pELElBQ0MsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDO29CQUM1QyxDQUFDLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsRUFDL0MsQ0FBQztvQkFDRixJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDNUQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FDcEMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFDakUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FDM0MsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFZLGNBQWM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN4RSxtQ0FBMEI7UUFDM0IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsVUFBVSxDQUFDLFNBQWlCLEVBQUUsT0FBWSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUM1RCxzSUFBc0k7UUFDdEksSUFBSSxDQUFDLHFCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQTtRQUN0QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsV0FBVyxDQUNWLFNBQWlCLEVBQ2pCLElBQWdDO1FBRWhDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQVcsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7O0FBdERXLG1CQUFtQjtJQUQvQixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUM7SUFRbkQsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxlQUFlLENBQUE7R0FWTCxtQkFBbUIsQ0F1RC9CIn0=