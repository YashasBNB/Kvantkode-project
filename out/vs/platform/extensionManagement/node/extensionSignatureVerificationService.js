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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2lnbmF0dXJlVmVyaWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvbm9kZS9leHRlbnNpb25TaWduYXR1cmVWZXJpZmljYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFckYsTUFBTSxDQUFDLE1BQU0sc0NBQXNDLEdBQ2xELGVBQWUsQ0FBeUMsd0NBQXdDLENBQUMsQ0FBQTtBQStDM0YsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7SUFPakQsWUFDK0IsVUFBdUIsRUFDakIsZ0JBQW1DO1FBRHpDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDakIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtJQUNyRSxDQUFDO0lBRUksUUFBUTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ25ELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sS0FB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