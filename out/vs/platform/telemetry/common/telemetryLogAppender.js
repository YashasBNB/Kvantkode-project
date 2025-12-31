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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5TG9nQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3RlbGVtZXRyeUxvZ0FwcGVuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFXLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBRU4saUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixjQUFjLEVBQ2QscUJBQXFCLEdBQ3JCLE1BQU0scUJBQXFCLENBQUE7QUFFckIsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBR25ELFlBQ2tCLE1BQWMsRUFDL0IsTUFBZSxFQUNDLGFBQTZCLEVBQ3hCLGtCQUF1QyxFQUMzQyxjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQTtRQU5VLFdBQU0sR0FBTixNQUFNLENBQVE7UUFRL0IsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFBO1FBQ3RELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQyxDQUFDO2FBQU0sQ0FBQztZQUNQLHdJQUF3STtZQUN4SSxNQUFNLHdCQUF3QixHQUFHLGFBQWEsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtZQUNsRixNQUFNLFNBQVMsR0FBRyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDL0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQixhQUFhLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQztnQkFDekQsS0FBSyxFQUFFLGlCQUFpQjtnQkFDeEIsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxHQUFHLENBQUMsU0FBaUIsRUFBRSxJQUFTO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sYUFBYSxTQUFTLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7Q0FDRCxDQUFBO0FBckNZLG9CQUFvQjtJQU05QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxlQUFlLENBQUE7R0FSTCxvQkFBb0IsQ0FxQ2hDIn0=