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
import { FileAccess } from '../../../base/common/network.js';
import { Client as TelemetryClient } from '../../../base/parts/ipc/node/ipc.cp.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILoggerService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService, } from '../common/telemetry.js';
import { TelemetryAppenderClient } from '../common/telemetryIpc.js';
import { TelemetryLogAppender } from '../common/telemetryLogAppender.js';
import { TelemetryService } from '../common/telemetryService.js';
let CustomEndpointTelemetryService = class CustomEndpointTelemetryService {
    constructor(configurationService, telemetryService, loggerService, environmentService, productService) {
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.loggerService = loggerService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.customTelemetryServices = new Map();
    }
    getCustomTelemetryService(endpoint) {
        if (!this.customTelemetryServices.has(endpoint.id)) {
            const telemetryInfo = Object.create(null);
            telemetryInfo['common.vscodemachineid'] = this.telemetryService.machineId;
            telemetryInfo['common.vscodesessionid'] = this.telemetryService.sessionId;
            const args = [endpoint.id, JSON.stringify(telemetryInfo), endpoint.aiKey];
            const client = new TelemetryClient(FileAccess.asFileUri('bootstrap-fork').fsPath, {
                serverName: 'Debug Telemetry',
                timeout: 1000 * 60 * 5,
                args,
                env: {
                    ELECTRON_RUN_AS_NODE: 1,
                    VSCODE_PIPE_LOGGING: 'true',
                    VSCODE_ESM_ENTRYPOINT: 'vs/workbench/contrib/debug/node/telemetryApp',
                },
            });
            const channel = client.getChannel('telemetryAppender');
            const appenders = [
                new TelemetryAppenderClient(channel),
                new TelemetryLogAppender(`[${endpoint.id}] `, false, this.loggerService, this.environmentService, this.productService),
            ];
            this.customTelemetryServices.set(endpoint.id, new TelemetryService({
                appenders,
                sendErrorTelemetry: endpoint.sendErrorTelemetry,
            }, this.configurationService, this.productService));
        }
        return this.customTelemetryServices.get(endpoint.id);
    }
    publicLog(telemetryEndpoint, eventName, data) {
        const customTelemetryService = this.getCustomTelemetryService(telemetryEndpoint);
        customTelemetryService.publicLog(eventName, data);
    }
    publicLogError(telemetryEndpoint, errorEventName, data) {
        const customTelemetryService = this.getCustomTelemetryService(telemetryEndpoint);
        customTelemetryService.publicLogError(errorEventName, data);
    }
};
CustomEndpointTelemetryService = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITelemetryService),
    __param(2, ILoggerService),
    __param(3, IEnvironmentService),
    __param(4, IProductService)
], CustomEndpointTelemetryService);
export { CustomEndpointTelemetryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRW5kcG9pbnRUZWxlbWV0cnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvbm9kZS9jdXN0b21FbmRwb2ludFRlbGVtZXRyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxNQUFNLElBQUksZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBSU4saUJBQWlCLEdBQ2pCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFekQsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7SUFLMUMsWUFDd0Isb0JBQTRELEVBQ2hFLGdCQUFvRCxFQUN2RCxhQUE4QyxFQUN6QyxrQkFBd0QsRUFDNUQsY0FBZ0Q7UUFKekIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3RDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN4Qix1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