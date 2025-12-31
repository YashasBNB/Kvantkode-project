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
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationResolverService } from '../common/configurationResolver.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { BaseConfigurationResolverService } from '../browser/baseConfigurationResolverService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IShellEnvironmentService } from '../../environment/electron-sandbox/shellEnvironmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ConfigurationResolverService = class ConfigurationResolverService extends BaseConfigurationResolverService {
    constructor(editorService, environmentService, configurationService, commandService, workspaceContextService, quickInputService, labelService, shellEnvironmentService, pathService, extensionService, storageService) {
        super({
            getAppRoot: () => {
                return environmentService.appRoot;
            },
            getExecPath: () => {
                return environmentService.execPath;
            },
        }, shellEnvironmentService.getShellEnv(), editorService, configurationService, commandService, workspaceContextService, quickInputService, labelService, pathService, extensionService, storageService);
    }
};
ConfigurationResolverService = __decorate([
    __param(0, IEditorService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, IConfigurationService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService),
    __param(5, IQuickInputService),
    __param(6, ILabelService),
    __param(7, IShellEnvironmentService),
    __param(8, IPathService),
    __param(9, IExtensionService),
    __param(10, IStorageService)
], ConfigurationResolverService);
export { ConfigurationResolverService };
registerSingleton(IConfigurationResolverService, ConfigurationResolverService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvZWxlY3Ryb24tc2FuZGJveC9jb25maWd1cmF0aW9uUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsZ0NBQWdDO0lBQ2pGLFlBQ2lCLGFBQTZCLEVBQ1Qsa0JBQXNELEVBQ25FLG9CQUEyQyxFQUNqRCxjQUErQixFQUN0Qix1QkFBaUQsRUFDdkQsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ2hCLHVCQUFpRCxFQUM3RCxXQUF5QixFQUNwQixnQkFBbUMsRUFDckMsY0FBK0I7UUFFaEQsS0FBSyxDQUNKO1lBQ0MsVUFBVSxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3BDLE9BQU8sa0JBQWtCLENBQUMsT0FBTyxDQUFBO1lBQ2xDLENBQUM7WUFDRCxXQUFXLEVBQUUsR0FBdUIsRUFBRTtnQkFDckMsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLENBQUE7WUFDbkMsQ0FBQztTQUNELEVBQ0QsdUJBQXVCLENBQUMsV0FBVyxFQUFFLEVBQ3JDLGFBQWEsRUFDYixvQkFBb0IsRUFDcEIsY0FBYyxFQUNkLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsWUFBWSxFQUNaLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQW5DWSw0QkFBNEI7SUFFdEMsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtDQUFrQyxDQUFBO0lBQ2xDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGVBQWUsQ0FBQTtHQVpMLDRCQUE0QixDQW1DeEM7O0FBRUQsaUJBQWlCLENBQ2hCLDZCQUE2QixFQUM3Qiw0QkFBNEIsb0NBRTVCLENBQUEifQ==