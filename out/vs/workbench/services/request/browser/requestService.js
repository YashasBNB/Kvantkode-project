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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RequestChannelClient } from '../../../../platform/request/common/requestIpc.js';
import { IRemoteAgentService, } from '../../remote/common/remoteAgentService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { AbstractRequestService, } from '../../../../platform/request/common/request.js';
import { request } from '../../../../base/parts/request/common/requestImpl.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';
import { LogService } from '../../../../platform/log/common/logService.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
let BrowserRequestService = class BrowserRequestService extends AbstractRequestService {
    constructor(remoteAgentService, configurationService, loggerService) {
        const logger = loggerService.createLogger(`network`, {
            name: localize('network', 'Network'),
            group: windowLogGroup,
        });
        const logService = new LogService(logger);
        super(logService);
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this._register(logger);
        this._register(logService);
    }
    async request(options, token) {
        try {
            if (!options.proxyAuthorization) {
                options.proxyAuthorization =
                    this.configurationService.inspect('http.proxyAuthorization').userLocalValue;
            }
            const context = await this.logAndRequest(options, () => request(options, token, () => navigator.onLine));
            const connection = this.remoteAgentService.getConnection();
            if (connection && context.res.statusCode === 405) {
                return this._makeRemoteRequest(connection, options, token);
            }
            return context;
        }
        catch (error) {
            const connection = this.remoteAgentService.getConnection();
            if (connection) {
                return this._makeRemoteRequest(connection, options, token);
            }
            throw error;
        }
    }
    async resolveProxy(url) {
        return undefined; // not implemented in the web
    }
    async lookupAuthorization(authInfo) {
        return undefined; // not implemented in the web
    }
    async lookupKerberosAuthorization(url) {
        return undefined; // not implemented in the web
    }
    async loadCertificates() {
        return []; // not implemented in the web
    }
    _makeRemoteRequest(connection, options, token) {
        return connection.withChannel('request', (channel) => new RequestChannelClient(channel).request(options, token));
    }
};
BrowserRequestService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IConfigurationService),
    __param(2, ILoggerService)
], BrowserRequestService);
export { BrowserRequestService };
// --- Internal commands to help authentication for extensions
CommandsRegistry.registerCommand('_workbench.fetchJSON', async function (accessor, url, method) {
    const result = await fetch(url, { method, headers: { Accept: 'application/json' } });
    if (result.ok) {
        return result.json();
    }
    else {
        throw new Error(result.statusText);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVxdWVzdC9icm93c2VyL3JlcXVlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQ04sc0JBQXNCLEdBSXRCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLHNCQUFzQjtJQUdoRSxZQUN1QyxrQkFBdUMsRUFDckMsb0JBQTJDLEVBQ25FLGFBQTZCO1FBRTdDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFO1lBQ3BELElBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUNwQyxLQUFLLEVBQUUsY0FBYztTQUNyQixDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUs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