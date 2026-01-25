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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZXF1ZXN0L2Jyb3dzZXIvcmVxdWVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDeEYsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLDJDQUEyQyxDQUFBO0FBRWxELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixzQkFBc0IsR0FJdEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsc0JBQXNCO0lBR2hFLFlBQ3VDLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDbkUsYUFBNkI7UUFFN0MsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUU7WUFDcEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLEtBQUssRUFBRSxjQUFjO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0s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