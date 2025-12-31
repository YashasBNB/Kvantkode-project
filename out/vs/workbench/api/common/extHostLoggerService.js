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
import { AbstractMessageLogger, AbstractLoggerService, } from '../../../platform/log/common/log.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { URI } from '../../../base/common/uri.js';
import { revive } from '../../../base/common/marshalling.js';
let ExtHostLoggerService = class ExtHostLoggerService extends AbstractLoggerService {
    constructor(rpc, initData) {
        super(initData.logLevel, initData.logsLocation, initData.loggers.map((logger) => revive(logger)));
        this._proxy = rpc.getProxy(MainContext.MainThreadLogger);
    }
    $setLogLevel(logLevel, resource) {
        if (resource) {
            this.setLogLevel(URI.revive(resource), logLevel);
        }
        else {
            this.setLogLevel(logLevel);
        }
    }
    setVisibility(resource, visibility) {
        super.setVisibility(resource, visibility);
        this._proxy.$setVisibility(resource, visibility);
    }
    doCreateLogger(resource, logLevel, options) {
        return new Logger(this._proxy, resource, logLevel, options);
    }
};
ExtHostLoggerService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], ExtHostLoggerService);
export { ExtHostLoggerService };
class Logger extends AbstractMessageLogger {
    constructor(proxy, file, logLevel, loggerOptions) {
        super(loggerOptions?.logLevel === 'always');
        this.proxy = proxy;
        this.file = file;
        this.isLoggerCreated = false;
        this.buffer = [];
        this.setLevel(logLevel);
        this.proxy.$createLogger(file, loggerOptions).then(() => {
            this.doLog(this.buffer);
            this.isLoggerCreated = true;
        });
    }
    log(level, message) {
        const messages = [[level, message]];
        if (this.isLoggerCreated) {
            this.doLog(messages);
        }
        else {
            this.buffer.push(...messages);
        }
    }
    doLog(messages) {
        this.proxy.$log(this.file, messages);
    }
    flush() {
        this.proxy.$flush(this.file);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TG9nZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBR04scUJBQXFCLEVBRXJCLHFCQUFxQixHQUNyQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFFTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVyRCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUNaLFNBQVEscUJBQXFCO0lBTTdCLFlBQ3FCLEdBQXVCLEVBQ2xCLFFBQWlDO1FBRTFELEtBQUssQ0FDSixRQUFRLENBQUMsUUFBUSxFQUNqQixRQUFRLENBQUMsWUFBWSxFQUNyQixRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ2hELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFrQixFQUFFLFFBQXdCO1FBQ3hELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNCLENBQUM7SUFDRixDQUFDO0lBRVEsYUFBYSxDQUFDLFFBQWEsRUFBRSxVQUFtQjtRQUN4RCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVTLGNBQWMsQ0FBQyxRQUFhLEVBQUUsUUFBa0IsRUFBRSxPQUF3QjtRQUNuRixPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0NBQ0QsQ0FBQTtBQW5DWSxvQkFBb0I7SUFROUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHVCQUF1QixDQUFBO0dBVGIsb0JBQW9CLENBbUNoQzs7QUFFRCxNQUFNLE1BQU8sU0FBUSxxQkFBcUI7SUFJekMsWUFDa0IsS0FBNEIsRUFDNUIsSUFBUyxFQUMxQixRQUFrQixFQUNsQixhQUE4QjtRQUU5QixLQUFLLENBQUMsYUFBYSxFQUFFLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQTtRQUwxQixVQUFLLEdBQUwsS0FBSyxDQUF1QjtRQUM1QixTQUFJLEdBQUosSUFBSSxDQUFLO1FBTG5CLG9CQUFlLEdBQVksS0FBSyxDQUFBO1FBQ2hDLFdBQU0sR0FBeUIsRUFBRSxDQUFBO1FBU3hDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVMsR0FBRyxDQUFDLEtBQWUsRUFBRSxPQUFlO1FBQzdDLE1BQU0sUUFBUSxHQUF5QixDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsUUFBOEI7UUFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRVEsS0FBSztRQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0QifQ==