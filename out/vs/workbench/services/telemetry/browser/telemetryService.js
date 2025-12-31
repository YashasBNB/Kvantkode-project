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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBT2hHLE9BQU8sRUFFTixpQkFBaUIsRUFFakIsb0JBQW9CLEdBQ3BCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDcEcsT0FBTyxFQUVOLGdCQUFnQixJQUFJLG9CQUFvQixHQUN4QyxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLGFBQWEsRUFFYixvQkFBb0IsRUFDcEIsaUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxF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