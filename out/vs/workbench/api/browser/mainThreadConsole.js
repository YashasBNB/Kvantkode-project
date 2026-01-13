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
import { MainContext } from '../common/extHost.protocol.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { log } from '../../../base/common/console.js';
import { logRemoteEntry, logRemoteEntryIfError, } from '../../services/extensions/common/remoteConsoleUtil.js';
import { parseExtensionDevOptions } from '../../services/extensions/common/extensionDevOptions.js';
import { ILogService } from '../../../platform/log/common/log.js';
let MainThreadConsole = class MainThreadConsole {
    constructor(_extHostContext, _environmentService, _logService) {
        this._environmentService = _environmentService;
        this._logService = _logService;
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
    }
    dispose() {
        //
    }
    $logExtensionHostMessage(entry) {
        if (this._isExtensionDevTestFromCli) {
            // If running tests from cli, log to the log service everything
            logRemoteEntry(this._logService, entry);
        }
        else {
            // Log to the log service only errors and log everything to local console
            logRemoteEntryIfError(this._logService, entry, 'Extension Host');
            log(entry, 'Extension Host');
        }
    }
};
MainThreadConsole = __decorate([
    extHostNamedCustomer(MainContext.MainThreadConsole),
    __param(1, IEnvironmentService),
    __param(2, ILogService)
], MainThreadConsole);
export { MainThreadConsole };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbnNvbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ29uc29sZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBMEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQXFCLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixjQUFjLEVBQ2QscUJBQXFCLEdBQ3JCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRzFELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBRzdCLFlBQ0MsZUFBZ0MsRUFDTSxtQkFBd0MsRUFDaEQsV0FBd0I7UUFEaEIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUNoRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUV0RCxNQUFNLE9BQU8sR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFBO0lBQ3BFLENBQUM7SUFFRCxPQUFPO1FBQ04sRUFBRTtJQUNILENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxLQUF3QjtRQUNoRCxJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3JDLCtEQUErRDtZQUMvRCxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QyxDQUFDO2FBQU0sQ0FBQztZQUNQLHlFQUF5RTtZQUN6RSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2hFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExQlksaUJBQWlCO0lBRDdCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztJQU1qRCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0dBTkQsaUJBQWlCLENBMEI3QiJ9