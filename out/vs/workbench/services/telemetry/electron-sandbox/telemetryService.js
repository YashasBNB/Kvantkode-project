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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS9lbGVjdHJvbi1zYW5kYm94L3RlbGVtZXRyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGlCQUFpQixHQUdqQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixtQkFBbUIsR0FDbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZ0JBQWdCLElBQUksb0JBQW9CLEdBRXhDLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBT2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU3RSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdC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