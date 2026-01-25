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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { OneDataSystemWebAppender } from '../../../../platform/telemetry/browser/1dsAppender.js';
import { ITelemetryService, TELEMETRY_SETTING_ID, } from '../../../../platform/telemetry/common/telemetry.js';
import { TelemetryLogAppender } from '../../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService as BaseTelemetryService, } from '../../../../platform/telemetry/common/telemetryService.js';
import { getTelemetryLevel, isInternalTelemetry, isLoggingOnly, NullTelemetryService, supportsTelemetry, } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { resolveWorkbenchCommonProperties } from './workbenchCommonProperties.js';
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
    constructor(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService) {
        super();
        this.impl = NullTelemetryService;
        this.sendErrorTelemetry = true;
        this.impl = this.initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService);
        // When the level changes it could change from off to on and we want to make sure telemetry is properly intialized
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
                this.impl = this.initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService);
            }
        }));
    }
    /**
     * Initializes the telemetry service to be a full fledged service.
     * This is only done once and only when telemetry is enabled as this will also ping the endpoint to
     * ensure its not adblocked and we can send telemetry
     */
    initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService) {
        const telemetrySupported = supportsTelemetry(productService, environmentService) && productService.aiConfig?.ariaKey;
        if (telemetrySupported &&
            getTelemetryLevel(configurationService) !== 0 /* TelemetryLevel.NONE */ &&
            this.impl === NullTelemetryService) {
            // If remote server is present send telemetry through that, else use the client side appender
            const appenders = [];
            const isInternal = isInternalTelemetry(productService, configurationService);
            if (!isLoggingOnly(productService, environmentService)) {
                if (remoteAgentService.getConnection() !== null) {
                    const remoteTelemetryProvider = {
                        log: remoteAgentService.logTelemetry.bind(remoteAgentService),
                        flush: remoteAgentService.flushTelemetry.bind(remoteAgentService),
                    };
                    appenders.push(remoteTelemetryProvider);
                }
                else {
                    appenders.push(new OneDataSystemWebAppender(isInternal, 'monacoworkbench', null, productService.aiConfig?.ariaKey));
                }
            }
            appenders.push(new TelemetryLogAppender('', false, loggerService, environmentService, productService));
            const config = {
                appenders,
                commonProperties: resolveWorkbenchCommonProperties(storageService, productService.commit, productService.version, isInternal, environmentService.remoteAuthority, productService.embedderIdentifier, productService.removeTelemetryMachineId, environmentService.options && environmentService.options.resolveCommonTelemetryProperties),
                sendErrorTelemetry: this.sendErrorTelemetry,
            };
            return this._register(new BaseTelemetryService(config, configurationService, productService));
        }
        return this.impl;
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
        this.impl.publicLog(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, ILogService),
    __param(2, ILoggerService),
    __param(3, IConfigurationService),
    __param(4, IStorageService),
    __param(5, IProductService),
    __param(6, IRemoteAgentService)
], TelemetryService);
export { TelemetryService };
registerSingleton(ITelemetryService, TelemetryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS9icm93c2VyL3RlbGVtZXRyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFPaEcsT0FBTyxFQUVOLGlCQUFpQixFQUVqQixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNwRyxPQUFPLEVBRU4sZ0JBQWdCLElBQUksb0JBQW9CLEdBQ3hDLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsYUFBYSxFQUViLG9CQUFvQixFQUNwQixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxP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