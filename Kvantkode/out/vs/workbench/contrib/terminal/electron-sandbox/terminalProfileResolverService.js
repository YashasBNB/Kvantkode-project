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
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalInstanceService } from '../browser/terminal.js';
import { BaseTerminalProfileResolverService } from '../browser/terminalProfileResolverService.js';
import { ITerminalProfileService } from '../common/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let ElectronTerminalProfileResolverService = class ElectronTerminalProfileResolverService extends BaseTerminalProfileResolverService {
    constructor(configurationResolverService, configurationService, historyService, logService, workspaceContextService, terminalProfileService, remoteAgentService, terminalInstanceService) {
        super({
            getDefaultSystemShell: async (remoteAuthority, platform) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!backend) {
                    throw new ErrorNoTelemetry(`Cannot get default system shell when there is no backend for remote authority '${remoteAuthority}'`);
                }
                return backend.getDefaultSystemShell(platform);
            },
            getEnvironment: async (remoteAuthority) => {
                const backend = await terminalInstanceService.getBackend(remoteAuthority);
                if (!backend) {
                    throw new ErrorNoTelemetry(`Cannot get environment when there is no backend for remote authority '${remoteAuthority}'`);
                }
                return backend.getEnvironment();
            },
        }, configurationService, configurationResolverService, historyService, logService, terminalProfileService, workspaceContextService, remoteAgentService);
    }
};
ElectronTerminalProfileResolverService = __decorate([
    __param(0, IConfigurationResolverService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, ITerminalLogService),
    __param(4, IWorkspaceContextService),
    __param(5, ITerminalProfileService),
    __param(6, IRemoteAgentService),
    __param(7, ITerminalInstanceService)
], ElectronTerminalProfileResolverService);
export { ElectronTerminalProfileResolverService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L3Rlcm1pbmFsUHJvZmlsZVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFcEYsSUFBTSxzQ0FBc0MsR0FBNUMsTUFBTSxzQ0FBdUMsU0FBUSxrQ0FBa0M7SUFDN0YsWUFDZ0MsNEJBQTJELEVBQ25FLG9CQUEyQyxFQUNqRCxjQUErQixFQUMzQixVQUErQixFQUMxQix1QkFBaUQsRUFDbEQsc0JBQStDLEVBQ25ELGtCQUF1QyxFQUNsQyx1QkFBaUQ7UUFFM0UsS0FBSyxDQUNKO1lBQ0MscUJBQXFCLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsRUFBRTtnQkFDMUQsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ3pFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxNQUFNLElBQUksZ0JBQWdCLENBQ3pCLGtGQUFrRixlQUFlLEdBQUcsQ0FDcEcsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8sT0FBTyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFDRCxjQUFjLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFO2dCQUN6QyxNQUFNLE9BQU8sR0FBRyxNQUFNLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDekUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNkLE1BQU0sSUFBSSxnQkFBZ0IsQ0FDekIseUVBQXlFLGVBQWUsR0FBRyxDQUMzRixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDaEMsQ0FBQztTQUNELEVBQ0Qsb0JBQW9CLEVBQ3BCLDRCQUE0QixFQUM1QixjQUFjLEVBQ2QsVUFBVSxFQUNWLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLENBQ2xCLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXpDWSxzQ0FBc0M7SUFFaEQsV0FBQSw2QkFBNkIsQ0FBQTtJQUM3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0dBVGQsc0NBQXNDLENBeUNsRCJ9