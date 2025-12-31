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
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ILoggerService, ILogService, isLogLevel, log, LogLevelToString, parseLogLevel, } from '../../../platform/log/common/log.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
let MainThreadLoggerService = class MainThreadLoggerService {
    constructor(extHostContext, loggerService) {
        this.loggerService = loggerService;
        this.disposables = new DisposableStore();
        const proxy = extHostContext.getProxy(ExtHostContext.ExtHostLogLevelServiceShape);
        this.disposables.add(loggerService.onDidChangeLogLevel((arg) => {
            if (isLogLevel(arg)) {
                proxy.$setLogLevel(arg);
            }
            else {
                proxy.$setLogLevel(arg[1], arg[0]);
            }
        }));
    }
    $log(file, messages) {
        const logger = this.loggerService.getLogger(URI.revive(file));
        if (!logger) {
            throw new Error('Create the logger before logging');
        }
        for (const [level, message] of messages) {
            log(logger, level, message);
        }
    }
    async $createLogger(file, options) {
        this.loggerService.createLogger(URI.revive(file), options);
    }
    async $registerLogger(logResource) {
        this.loggerService.registerLogger({
            ...logResource,
            resource: URI.revive(logResource.resource),
        });
    }
    async $deregisterLogger(resource) {
        this.loggerService.deregisterLogger(URI.revive(resource));
    }
    async $setVisibility(resource, visible) {
        this.loggerService.setVisibility(URI.revive(resource), visible);
    }
    $flush(file) {
        const logger = this.loggerService.getLogger(URI.revive(file));
        if (!logger) {
            throw new Error('Create the logger before flushing');
        }
        logger.flush();
    }
    dispose() {
        this.disposables.dispose();
    }
};
MainThreadLoggerService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLogger),
    __param(1, ILoggerService)
], MainThreadLoggerService);
export { MainThreadLoggerService };
// --- Internal commands to improve extension test runs
CommandsRegistry.registerCommand('_extensionTests.setLogLevel', function (accessor, level) {
    const loggerService = accessor.get(ILoggerService);
    const environmentService = accessor.get(IEnvironmentService);
    if (environmentService.isExtensionDevelopment &&
        !!environmentService.extensionTestsLocationURI) {
        const logLevel = parseLogLevel(level);
        if (logLevel !== undefined) {
            loggerService.setLogLevel(logLevel);
        }
    }
});
CommandsRegistry.registerCommand('_extensionTests.getLogLevel', function (accessor) {
    const logService = accessor.get(ILogService);
    return LogLevelToString(logService.getLevel());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFHTixjQUFjLEVBQ2QsV0FBVyxFQUNYLFVBQVUsRUFDVixHQUFHLEVBRUgsZ0JBQWdCLEVBQ2hCLGFBQWEsR0FDYixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUF5QixXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRyxPQUFPLEVBQWlCLEdBQUcsRUFBVSxNQUFNLDZCQUE2QixDQUFBO0FBRXhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBR2xGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBR25DLFlBQ0MsY0FBK0IsRUFDZixhQUE4QztRQUE3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFKOUMsZ0JBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBTW5ELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ25CLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3pDLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFF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