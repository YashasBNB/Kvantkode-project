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
import { IConfigurationService } from '../../configuration/common/configuration.js';
let McpManagementCli = class McpManagementCli {
    constructor(_logger, _userConfigurationService) {
        this._logger = _logger;
        this._userConfigurationService = _userConfigurationService;
    }
    async addMcpDefinitions(definitions) {
        const configs = definitions.map((config) => this.validateConfiguration(config));
        await this.updateMcpInConfig(this._userConfigurationService, configs);
        this._logger.info(`Added MCP servers: ${configs.map((c) => c.name).join(', ')}`);
    }
    async updateMcpInConfig(service, configs) {
        const mcp = service.getValue('mcp') || { servers: {} };
        mcp.servers ??= {};
        for (const config of configs) {
            mcp.servers[config.name] = config.config;
        }
        await service.updateValue('mcp', mcp);
    }
    validateConfiguration(config) {
        let parsed;
        try {
            parsed = JSON.parse(config);
        }
        catch (e) {
            throw new InvalidMcpOperationError(`Invalid JSON '${config}': ${e}`);
        }
        if (!parsed.name) {
            throw new InvalidMcpOperationError(`Missing name property in ${config}`);
        }
        if (!('command' in parsed) && !('url' in parsed)) {
            throw new InvalidMcpOperationError(`Missing command or URL property in ${config}`);
        }
        const { name, ...rest } = parsed;
        return { name, config: rest };
    }
};
McpManagementCli = __decorate([
    __param(1, IConfigurationService)
], McpManagementCli);
export { McpManagementCli };
class InvalidMcpOperationError extends Error {
    constructor(message) {
        super(message);
        this.stack = message;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudENsaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9jb21tb24vbWNwTWFuYWdlbWVudENsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVc1RSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUM1QixZQUNrQixPQUFnQixFQUNPLHlCQUFnRDtRQUR2RSxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ08sOEJBQXlCLEdBQXpCLHlCQUF5QixDQUF1QjtJQUN0RixDQUFDO0lBRUosS0FBSyxDQUFDLGlCQUFpQixDQUFDLFdBQXFCO1FBQzVDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDakYsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUE4QixFQUFFLE9BQTBCO1FBQ3pGLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQW9CLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQ3pFLEdBQUcsQ0FBQyxPQUFPLEtBQUssRUFBRSxDQUFBO1FBRWxCLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDOUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQTtRQUN6QyxDQUFDO1FBRUQsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRU8scUJBQXFCLENBQUMsTUFBYztRQUMzQyxJQUFJLE1BQWlELENBQUE7UUFDckQsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksd0JBQXdCLENBQUMsaUJBQWlCLE1BQU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSx3QkFBd0IsQ0FBQyw0QkFBNEIsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN6RSxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsRCxNQUFNLElBQUksd0JBQXdCLENBQUMsc0NBQXNDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDbkYsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUE7UUFDaEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBcUQsRUFBRSxDQUFBO0lBQy9FLENBQUM7Q0FDRCxDQUFBO0FBMUNZLGdCQUFnQjtJQUcxQixXQUFBLHFCQUFxQixDQUFBO0dBSFgsZ0JBQWdCLENBMEM1Qjs7QUFFRCxNQUFNLHdCQUF5QixTQUFRLEtBQUs7SUFDM0MsWUFBWSxPQUFlO1FBQzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFBO0lBQ3JCLENBQUM7Q0FDRCJ9