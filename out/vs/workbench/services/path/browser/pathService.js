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
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IPathService, AbstractPathService } from '../common/pathService.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { dirname } from '../../../../base/common/resources.js';
let BrowserPathService = class BrowserPathService extends AbstractPathService {
    constructor(remoteAgentService, environmentService, contextService) {
        super(guessLocalUserHome(environmentService, contextService), remoteAgentService, environmentService, contextService);
    }
};
BrowserPathService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IWorkspaceContextService)
], BrowserPathService);
export { BrowserPathService };
function guessLocalUserHome(environmentService, contextService) {
    // In web we do not really have the concept of a "local" user home
    // but we still require it in many places as a fallback. As such,
    // we have to come up with a synthetic location derived from the
    // environment.
    const workspace = contextService.getWorkspace();
    const firstFolder = workspace.folders.at(0);
    if (firstFolder) {
        return firstFolder.uri;
    }
    if (workspace.configuration) {
        return dirname(workspace.configuration);
    }
    // This is not ideal because with a user home location of `/`, all paths
    // will potentially appear with `~/...`, but at this point we really do
    // not have any other good alternative.
    return URI.from({
        scheme: AbstractPathService.findDefaultUriScheme(environmentService, contextService),
        authority: environmentService.remoteAuthority,
        path: '/',
    });
}
registerSingleton(IPathService, BrowserPathService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcGF0aC9icm93c2VyL3BhdGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV2RCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLG1CQUFtQjtJQUMxRCxZQUNzQixrQkFBdUMsRUFDOUIsa0JBQWdELEVBQ3BELGNBQXdDO1FBRWxFLEtBQUssQ0FDSixrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsRUFDdEQsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixjQUFjLENBQ2QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBYlksa0JBQWtCO0lBRTVCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLHdCQUF3QixDQUFBO0dBSmQsa0JBQWtCLENBYTlCOztBQUVELFNBQVMsa0JBQWtCLENBQzFCLGtCQUFnRCxFQUNoRCxjQUF3QztJQUV4QyxrRUFBa0U7SUFDbEUsaUVBQWlFO0lBQ2pFLGdFQUFnRTtJQUNoRSxlQUFlO0lBRWYsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFBO0lBRS9DLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNDLElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM3QixPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVELHdFQUF3RTtJQUN4RSx1RUFBdUU7SUFDdkUsdUNBQXVDO0lBRXZDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUM7UUFDcEYsU0FBUyxFQUFFLGtCQUFrQixDQUFDLGVBQWU7UUFDN0MsSUFBSSxFQUFFLEdBQUc7S0FDVCxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsaUJBQWlCLENBQUMsWUFBWSxFQUFFLGtCQUFrQixvQ0FBNEIsQ0FBQSJ9