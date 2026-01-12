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
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILoggerService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { TelemetryLogGroup, isLoggingOnly, telemetryLogId, validateTelemetryData, } from './telemetryUtils.js';
let TelemetryLogAppender = class TelemetryLogAppender extends Disposable {
    constructor(prefix, remote, loggerService, environmentService, productService) {
        super();
        this.prefix = prefix;
        const id = remote ? 'remoteTelemetry' : telemetryLogId;
        const logger = loggerService.getLogger(id);
        if (logger) {
            this.logger = this._register(logger);
        }
        else {
            // Not a perfect check, but a nice way to indicate if we only have logging enabled for debug purposes and nothing is actually being sent
            const justLoggingAndNotSending = isLoggingOnly(productService, environmentService);
            const logSuffix = justLoggingAndNotSending ? ' (Not Sent)' : '';
            this.logger = this._register(loggerService.createLogger(id, {
                name: localize('telemetryLog', 'Telemetry{0}', logSuffix),
                group: TelemetryLogGroup,
                hidden: true,
            }));
        }
    }
    flush() {
        return Promise.resolve();
    }
    log(eventName, data) {
        this.logger.trace(`${this.prefix}telemetry/${eventName}`, validateTelemetryData(data));
    }
};
TelemetryLogAppender = __decorate([
    __param(2, ILoggerService),
    __param(3, IEnvironmentService),
    __param(4, IProductService)
], TelemetryLogAppender);
export { TelemetryLogAppender };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5TG9nQXBwZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGNBQWMsRUFDZCxxQkFBcUIsR0FDckIsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyQixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFHbkQsWUFDa0IsTUFBYyxFQUMvQixNQUFlLEVBQ0MsYUFBNkIsRUFDeEIsa0JBQXVDLEVBQzNDLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFBO1FBTlUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQVEvQixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUE7UUFDdEQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMxQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7YUFBTSxDQUFDO1lBQ1Asd0lBQXdJO1lBQ3hJLE1BQU0sd0JBQXdCLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1lBQ2xGLE1BQU0sU0FBUyxHQUFHLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUMvRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzNCLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFO2dCQUM5QixJQUFJLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDO2dCQUN6RCxLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELEdBQUcsQ0FBQyxTQUFpQixFQUFFLElBQVM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxhQUFhLFNBQVMsRUFBRSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQztDQUNELENBQUE7QUFyQ1ksb0JBQW9CO0lBTTlCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGVBQWUsQ0FBQTtHQVJMLG9CQUFvQixDQXFDaEMifQ==