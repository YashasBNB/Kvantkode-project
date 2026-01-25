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
import { getErrorMessage } from '../../../base/common/errors.js';
import { isDefined } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService, LogLevel } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ExtensionSignatureVerificationCode } from '../common/extensionManagement.js';
export const IExtensionSignatureVerificationService = createDecorator('IExtensionSignatureVerificationService');
let ExtensionSignatureVerificationService = class ExtensionSignatureVerificationService {
    constructor(logService, telemetryService) {
        this.logService = logService;
        this.telemetryService = telemetryService;
    }
    vsceSign() {
        if (!this.moduleLoadingPromise) {
            this.moduleLoadingPromise = this.resolveVsceSign();
        }
        return this.moduleLoadingPromise;
    }
    async resolveVsceSign() {
        const mod = '@vscode/vsce-sign';
        return import(mod);
    }
    async verify(extensionId, version, vsixFilePath, signatureArchiveFilePath, clientTargetPlatform) {
        let module;
        try {
            module = await this.vsceSign();
        }
        catch (error) {
            this.logService.error('Could not load vsce-sign module', getErrorMessage(error));
            this.logService.info(`Extension signature verification is not done: ${extensionId}`);
            return undefined;
        }
        const startTime = new Date().getTime();
        let result;
        try {
            this.logService.trace(`Verifying extension signature for ${extensionId}...`);
            result = await module.verify(vsixFilePath, signatureArchiveFilePath, this.logService.getLevel() === LogLevel.Trace);
        }
        catch (e) {
            result = {
                code: ExtensionSignatureVerificationCode.UnknownError,
                didExecute: false,
                output: getErrorMessage(e),
            };
        }
        const duration = new Date().getTime() - startTime;
        this.logService.info(`Extension signature verification result for ${extensionId}: ${result.code}. ${isDefined(result.internalCode) ? `Internal Code: ${result.internalCode}. ` : ''}Executed: ${result.didExecute}. Duration: ${duration}ms.`);
        this.logService.trace(`Extension signature verification output for ${extensionId}:\n${result.output}`);
        this.telemetryService.publicLog2('extensionsignature:verification', {
            extensionId,
            extensionVersion: version,
            code: result.code,
            internalCode: result.internalCode,
            duration,
            didExecute: result.didExecute,
            clientTargetPlatform,
        });
        return { code: result.code };
    }
};
ExtensionSignatureVerificationService = __decorate([
    __param(0, ILogService),
    __param(1, ITelemetryService)
], ExtensionSignatureVerificationService);
export { ExtensionSignatureVerificationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2lnbmF0dXJlVmVyaWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvblNpZ25hdHVyZVZlcmlmaWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVyRixNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FDbEQsZUFBZSxDQUF5Qyx3Q0FBd0MsQ0FBQyxDQUFBO0FBK0MzRixJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFxQztJQU9qRCxZQUMrQixVQUF1QixFQUNqQixnQkFBbUM7UUFEekMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNqQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBQ3JFLENBQUM7SUFFSSxRQUFRO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDbkQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFF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