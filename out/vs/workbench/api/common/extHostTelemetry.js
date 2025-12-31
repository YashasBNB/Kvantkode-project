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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { ILoggerService } from '../../../platform/log/common/log.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { cleanData, cleanRemoteAuthority, TelemetryLogGroup, } from '../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../base/common/objects.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
let ExtHostTelemetry = class ExtHostTelemetry extends Disposable {
    constructor(isWorker, initData, loggerService) {
        super();
        this.initData = initData;
        this._onDidChangeTelemetryEnabled = this._register(new Emitter());
        this.onDidChangeTelemetryEnabled = this._onDidChangeTelemetryEnabled.event;
        this._onDidChangeTelemetryConfiguration = this._register(new Emitter());
        this.onDidChangeTelemetryConfiguration = this._onDidChangeTelemetryConfiguration.event;
        this._productConfig = { usage: true, error: true };
        this._level = 0 /* TelemetryLevel.NONE */;
        this._inLoggingOnlyMode = false;
        this._telemetryLoggers = new Map();
        this._inLoggingOnlyMode = this.initData.environment.isExtensionTelemetryLoggingOnly;
        const id = initData.remote.isRemote
            ? 'remoteExtHostTelemetry'
            : isWorker
                ? 'workerExtHostTelemetry'
                : 'extHostTelemetry';
        this._outputLogger = this._register(loggerService.createLogger(id, {
            name: localize('extensionTelemetryLog', 'Extension Telemetry{0}', this._inLoggingOnlyMode ? ' (Not Sent)' : ''),
            hidden: true,
            group: TelemetryLogGroup,
        }));
    }
    getTelemetryConfiguration() {
        return this._level === 3 /* TelemetryLevel.USAGE */;
    }
    getTelemetryDetails() {
        return {
            isCrashEnabled: this._level >= 1 /* TelemetryLevel.CRASH */,
            isErrorsEnabled: this._productConfig.error ? this._level >= 2 /* TelemetryLevel.ERROR */ : false,
            isUsageEnabled: this._productConfig.usage ? this._level >= 3 /* TelemetryLevel.USAGE */ : false,
        };
    }
    instantiateLogger(extension, sender, options) {
        const telemetryDetails = this.getTelemetryDetails();
        const logger = new ExtHostTelemetryLogger(sender, options, extension, this._outputLogger, this._inLoggingOnlyMode, this.getBuiltInCommonProperties(extension), {
            isUsageEnabled: telemetryDetails.isUsageEnabled,
            isErrorsEnabled: telemetryDetails.isErrorsEnabled,
        });
        const loggers = this._telemetryLoggers.get(extension.identifier.value) ?? [];
        this._telemetryLoggers.set(extension.identifier.value, [...loggers, logger]);
        return logger.apiTelemetryLogger;
    }
    $initializeTelemetryLevel(level, supportsTelemetry, productConfig) {
        this._level = level;
        this._productConfig = productConfig ?? { usage: true, error: true };
    }
    getBuiltInCommonProperties(extension) {
        const commonProperties = Object.create(null);
        // TODO @lramos15, does os info like node arch, platform version, etc exist here.
        // Or will first party extensions just mix this in
        commonProperties['common.extname'] = `${extension.publisher}.${extension.name}`;
        commonProperties['common.extversion'] = extension.version;
        commonProperties['common.vscodemachineid'] = this.initData.telemetryInfo.machineId;
        commonProperties['common.vscodesessionid'] = this.initData.telemetryInfo.sessionId;
        commonProperties['common.vscodecommithash'] = this.initData.commit;
        commonProperties['common.sqmid'] = this.initData.telemetryInfo.sqmId;
        commonProperties['common.devDeviceId'] = this.initData.telemetryInfo.devDeviceId;
        commonProperties['common.vscodeversion'] = this.initData.version;
        commonProperties['common.isnewappinstall'] = isNewAppInstall(this.initData.telemetryInfo.firstSessionDate);
        commonProperties['common.product'] = this.initData.environment.appHost;
        switch (this.initData.uiKind) {
            case UIKind.Web:
                commonProperties['common.uikind'] = 'web';
                break;
            case UIKind.Desktop:
                commonProperties['common.uikind'] = 'desktop';
                break;
            default:
                commonProperties['common.uikind'] = 'unknown';
        }
        commonProperties['common.remotename'] = getRemoteName(cleanRemoteAuthority(this.initData.remote.authority));
        return commonProperties;
    }
    $onDidChangeTelemetryLevel(level) {
        this._oldTelemetryEnablement = this.getTelemetryConfiguration();
        this._level = level;
        const telemetryDetails = this.getTelemetryDetails();
        // Remove all disposed loggers
        this._telemetryLoggers.forEach((loggers, key) => {
            const newLoggers = loggers.filter((l) => !l.isDisposed);
            if (newLoggers.length === 0) {
                this._telemetryLoggers.delete(key);
            }
            else {
                this._telemetryLoggers.set(key, newLoggers);
            }
        });
        // Loop through all loggers and update their level
        this._telemetryLoggers.forEach((loggers) => {
            for (const logger of loggers) {
                logger.updateTelemetryEnablements(telemetryDetails.isUsageEnabled, telemetryDetails.isErrorsEnabled);
            }
        });
        if (this._oldTelemetryEnablement !== this.getTelemetryConfiguration()) {
            this._onDidChangeTelemetryEnabled.fire(this.getTelemetryConfiguration());
        }
        this._onDidChangeTelemetryConfiguration.fire(this.getTelemetryDetails());
    }
    onExtensionError(extension, error) {
        const loggers = this._telemetryLoggers.get(extension.value);
        const nonDisposedLoggers = loggers?.filter((l) => !l.isDisposed);
        if (!nonDisposedLoggers) {
            this._telemetryLoggers.delete(extension.value);
            return false;
        }
        let errorEmitted = false;
        for (const logger of nonDisposedLoggers) {
            if (logger.ignoreUnhandledExtHostErrors) {
                continue;
            }
            logger.logError(error);
            errorEmitted = true;
        }
        return errorEmitted;
    }
};
ExtHostTelemetry = __decorate([
    __param(1, IExtHostInitDataService),
    __param(2, ILoggerService)
], ExtHostTelemetry);
export { ExtHostTelemetry };
export class ExtHostTelemetryLogger {
    static validateSender(sender) {
        if (typeof sender !== 'object') {
            throw new TypeError('TelemetrySender argument is invalid');
        }
        if (typeof sender.sendEventData !== 'function') {
            throw new TypeError('TelemetrySender.sendEventData must be a function');
        }
        if (typeof sender.sendErrorData !== 'function') {
            throw new TypeError('TelemetrySender.sendErrorData must be a function');
        }
        if (typeof sender.flush !== 'undefined' && typeof sender.flush !== 'function') {
            throw new TypeError('TelemetrySender.flush must be a function or undefined');
        }
    }
    constructor(sender, options, _extension, _logger, _inLoggingOnlyMode, _commonProperties, telemetryEnablements) {
        this._extension = _extension;
        this._logger = _logger;
        this._inLoggingOnlyMode = _inLoggingOnlyMode;
        this._commonProperties = _commonProperties;
        this._onDidChangeEnableStates = new Emitter();
        this.ignoreUnhandledExtHostErrors = options?.ignoreUnhandledErrors ?? false;
        this._ignoreBuiltinCommonProperties = options?.ignoreBuiltInCommonProperties ?? false;
        this._additionalCommonProperties = options?.additionalCommonProperties;
        this._sender = sender;
        this._telemetryEnablements = {
            isUsageEnabled: telemetryEnablements.isUsageEnabled,
            isErrorsEnabled: telemetryEnablements.isErrorsEnabled,
        };
    }
    updateTelemetryEnablements(isUsageEnabled, isErrorsEnabled) {
        if (this._apiObject) {
            this._telemetryEnablements = { isUsageEnabled, isErrorsEnabled };
            this._onDidChangeEnableStates.fire(this._apiObject);
        }
    }
    mixInCommonPropsAndCleanData(data) {
        // Some telemetry modules prefer to break properties and measurmements up
        // We mix common properties into the properties tab.
        let updatedData = 'properties' in data ? (data.properties ?? {}) : data;
        // We don't clean measurements since they are just numbers
        updatedData = cleanData(updatedData, []);
        if (this._additionalCommonProperties) {
            updatedData = mixin(updatedData, this._additionalCommonProperties);
        }
        if (!this._ignoreBuiltinCommonProperties) {
            updatedData = mixin(updatedData, this._commonProperties);
        }
        if ('properties' in data) {
            data.properties = updatedData;
        }
        else {
            data = updatedData;
        }
        return data;
    }
    logEvent(eventName, data) {
        // No sender means likely disposed of, we should no-op
        if (!this._sender) {
            return;
        }
        // If it's a built-in extension (vscode publisher) we don't prefix the publisher and only the ext name
        if (this._extension.publisher === 'vscode') {
            eventName = this._extension.name + '/' + eventName;
        }
        else {
            eventName = this._extension.identifier.value + '/' + eventName;
        }
        data = this.mixInCommonPropsAndCleanData(data || {});
        if (!this._inLoggingOnlyMode) {
            this._sender?.sendEventData(eventName, data);
        }
        this._logger.trace(eventName, data);
    }
    logUsage(eventName, data) {
        if (!this._telemetryEnablements.isUsageEnabled) {
            return;
        }
        this.logEvent(eventName, data);
    }
    logError(eventNameOrException, data) {
        if (!this._telemetryEnablements.isErrorsEnabled || !this._sender) {
            return;
        }
        if (typeof eventNameOrException === 'string') {
            this.logEvent(eventNameOrException, data);
        }
        else {
            const errorData = {
                name: eventNameOrException.name,
                message: eventNameOrException.message,
                stack: eventNameOrException.stack,
                cause: eventNameOrException.cause,
            };
            const cleanedErrorData = cleanData(errorData, []);
            // Reconstruct the error object with the cleaned data
            const cleanedError = new Error(cleanedErrorData.message, {
                cause: cleanedErrorData.cause,
            });
            cleanedError.stack = cleanedErrorData.stack;
            cleanedError.name = cleanedErrorData.name;
            data = this.mixInCommonPropsAndCleanData(data || {});
            if (!this._inLoggingOnlyMode) {
                this._sender.sendErrorData(cleanedError, data);
            }
            this._logger.trace('exception', data);
        }
    }
    get apiTelemetryLogger() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                logUsage: that.logUsage.bind(that),
                get isUsageEnabled() {
                    return that._telemetryEnablements.isUsageEnabled;
                },
                get isErrorsEnabled() {
                    return that._telemetryEnablements.isErrorsEnabled;
                },
                logError: that.logError.bind(that),
                dispose: that.dispose.bind(that),
                onDidChangeEnableStates: that._onDidChangeEnableStates.event.bind(that),
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get isDisposed() {
        return !this._sender;
    }
    dispose() {
        if (this._sender?.flush) {
            let tempSender = this._sender;
            this._sender = undefined;
            Promise.resolve(tempSender.flush()).then((tempSender = undefined));
            this._apiObject = undefined;
        }
        else {
            this._sender = undefined;
        }
    }
}
export function isNewAppInstall(firstSessionDate) {
    const installAge = Date.now() - new Date(firstSessionDate).getTime();
    return isNaN(installAge) ? false : installAge < 1000 * 60 * 60 * 24; // install age is less than a day
}
export const IExtHostTelemetry = createDecorator('IExtHostTelemetry');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUc5RCxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFLckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sU0FBUyxFQUNULG9CQUFvQixFQUNwQixpQkFBaUIsR0FDakIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVuQyxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFtQi9DLFlBQ0MsUUFBaUIsRUFDUSxRQUFrRCxFQUMzRCxhQUE2QjtRQUU3QyxLQUFLLEVBQUUsQ0FBQTtRQUhtQyxhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQWxCM0QsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDN0UsZ0NBQTJCLEdBQW1CLElBQUksQ0FBQyw0QkFBNEIs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