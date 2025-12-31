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
import { ITelemetryService, } from '../../../../platform/telemetry/common/telemetry.js';
import { supportsTelemetry, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { TelemetryAppenderClient } from '../../../../platform/telemetry/common/telemetryIpc.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { resolveWorkbenchCommonProperties } from '../common/workbenchCommonProperties.js';
import { TelemetryService as BaseTelemetryService, } from '../../../../platform/telemetry/common/telemetryService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
let TelemetryService = class TelemetryService extends Disposable {
    get sessionId() {
        return this.impl.sessionId;
    }
    get machineId() {
        return this.impl.machineId;
    }
    get sqmId() {
        return this.impl.sqmId;
    }
    get devDeviceId() {
        return this.impl.devDeviceId;
    }
    get firstSessionDate() {
        return this.impl.firstSessionDate;
    }
    get msftInternal() {
        return this.impl.msftInternal;
    }
    constructor(environmentService, productService, sharedProcessService, storageService, configurationService) {
        super();
        if (supportsTelemetry(productService, environmentService)) {
            const isInternal = isInternalTelemetry(productService, configurationService);
            const channel = sharedProcessService.getChannel('telemetryAppender');
            const config = {
                appenders: [new TelemetryAppenderClient(channel)],
                commonProperties: resolveWorkbenchCommonProperties(storageService, environmentService.os.release, environmentService.os.hostname, productService.commit, productService.version, environmentService.machineId, environmentService.sqmId, environmentService.devDeviceId, isInternal, process, environmentService.remoteAuthority),
                piiPaths: getPiiPathsFromEnvironment(environmentService),
                sendErrorTelemetry: true,
            };
            this.impl = this._register(new BaseTelemetryService(config, configurationService, productService));
        }
        else {
            this.impl = NullTelemetryService;
        }
        this.sendErrorTelemetry = this.impl.sendErrorTelemetry;
    }
    setExperimentProperty(name, value) {
        return this.impl.setExperimentProperty(name, value);
    }
    get telemetryLevel() {
        return this.impl.telemetryLevel;
    }
    publicLog(eventName, data) {
        this.impl.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        this.impl.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IProductService),
    __param(2, ISharedProcessService),
    __param(3, IStorageService),
    __param(4, IConfigurationService)
], TelemetryService);
export { TelemetryService };
registerSingleton(ITelemetryService, TelemetryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvZWxlY3Ryb24tc2FuZGJveC90ZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQiwwQkFBMEIsRUFDMUIsbUJBQW1CLEdBQ25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekYsT0FBTyxFQUNOLGdCQUFnQixJQUFJLG9CQUFvQixHQUV4QyxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQU9oRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFN0UsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIs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