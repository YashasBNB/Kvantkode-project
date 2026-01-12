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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMb2dnZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTixxQkFBcUIsRUFFckIscUJBQXFCLEdBQ3JCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUVOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXJELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQ1osU0FBUSxxQkFBcUI7SUFNN0IsWUFDcUIsR0FBdUIsRUFDbEIsUUFBaUM7UUFFMUQsS0FBSyxDQUNKLFFBQVEsQ0FBQyxRQUFRLEVBQ2pCLFFBQVEsQ0FBQyxZQUFZLEVBQ3JCLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDaEQsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsWUFBWSxDQUFDLFFBQWtCLEVBQUUsUUFBd0I7UUFDeEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFUSxhQUFhLENBQUMsUUFBYSxFQUFFLFVBQW1CO1FBQ3hELEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRVMsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFrQixFQUFFLE9BQXdCO1FBQ25GLE9BQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzVELENBQUM7Q0FDRCxDQUFBO0FBbkNZLG9CQUFvQjtJQVE5QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7R0FUYixvQkFBb0IsQ0FtQ2hDOztBQUVELE1BQU0sTUFBTyxTQUFRLHFCQUFxQjtJQUl6QyxZQUNrQixLQUE0QixFQUM1QixJQUFTLEVBQzFCLFFBQWtCLEVBQ2xCLGFBQThCO1FBRTlCLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFBO1FBTDFCLFVBQUssR0FBTCxLQUFLLENBQXVCO1FBQzVCLFNBQUksR0FBSixJQUFJLENBQUs7UUFMbkIsb0JBQWUsR0FBWSxLQUFLLENBQUE7UUFDaEMsV0FBTSxHQUF5QixFQUFFLENBQUE7UUFTeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUN2RCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUM1QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUyxHQUFHLENBQUMsS0FBZSxFQUFFLE9BQWU7UUFDN0MsTUFBTSxRQUFRLEdBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUE4QjtRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFUSxLQUFLO1FBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7Q0FDRCJ9