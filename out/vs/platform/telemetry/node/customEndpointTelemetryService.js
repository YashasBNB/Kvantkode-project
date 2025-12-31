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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRW5kcG9pbnRUZWxlbWV0cnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L25vZGUvY3VzdG9tRW5kcG9pbnRUZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsTUFBTSxJQUFJLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUlOLGlCQUFpQixHQUNqQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXpELElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO0lBSzFDLFlBQ3dCLG9CQUE0RCxFQUNoRSxnQkFBb0QsRUFDdkQsYUFBOEMsRUFDekMsa0JBQXdELEVBQzVELGNBQWdEO1FBSnpCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDeEIsdUJBQWtC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