/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { ExtHostTerminalService } from './extHostTerminalService.js';
import { ExtHostTask } from './extHostTask.js';
import { ExtHostDebugService } from './extHostDebugService.js';
import { NativeExtHostSearch } from './extHostSearch.js';
import { ExtHostExtensionService } from './extHostExtensionService.js';
import { NodeExtHostTunnelService } from './extHostTunnelService.js';
import { IExtHostDebugService } from '../common/extHostDebugService.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { IExtHostSearch } from '../common/extHostSearch.js';
import { IExtHostTask } from '../common/extHostTask.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostTunnelService } from '../common/extHostTunnelService.js';
import { IExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { ExtensionStoragePaths } from './extHostStoragePaths.js';
import { ExtHostLoggerService } from './extHostLoggerService.js';
import { ILogService, ILoggerService } from '../../../platform/log/common/log.js';
import { NodeExtHostVariableResolverProviderService } from './extHostVariableResolverService.js';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
import { ExtHostLogService } from '../common/extHostLogService.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ExtHostTelemetry, IExtHostTelemetry } from '../common/extHostTelemetry.js';
import { IExtHostMpcService } from '../common/extHostMcp.js';
import { NodeExtHostMpcService } from './extHostMpcNode.js';
// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################
registerSingleton(IExtHostExtensionService, ExtHostExtensionService, 0 /* InstantiationType.Eager */);
registerSingleton(ILoggerService, ExtHostLoggerService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [false], true));
registerSingleton(ISignService, SignService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTelemetry, new SyncDescriptor(ExtHostTelemetry, [false], true));
registerSingleton(IExtHostDebugService, ExtHostDebugService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostSearch, NativeExtHostSearch, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTask, ExtHostTask, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTerminalService, ExtHostTerminalService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTunnelService, NodeExtHostTunnelService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostVariableResolverProvider, NodeExtHostVariableResolverProviderService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostMpcService, NodeExtHostMpcService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5ub2RlLnNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdC5ub2RlLnNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTNELDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFFNUUsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLGtDQUEwQixDQUFBO0FBQzdGLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxvQkFBb0Isb0NBQTRCLENBQUE7QUFDbEYsaUJBQWlCLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUNwRixpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxvQ0FBNEIsQ0FBQTtBQUN2RSxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsa0NBQTBCLENBQUE7QUFDekYsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBRXpGLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixrQ0FBMEIsQ0FBQTtBQUNyRixpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLGtDQUEwQixDQUFBO0FBQy9FLGlCQUFpQixDQUFDLFlBQVksRUFBRSxXQUFXLGtDQUEwQixDQUFBO0FBQ3JFLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixrQ0FBMEIsQ0FBQTtBQUMzRixpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSx3QkFBd0Isa0NBQTBCLENBQUE7QUFDM0YsaUJBQWlCLENBQ2hCLGdDQUFnQyxFQUNoQywwQ0FBMEMsa0NBRTFDLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsa0NBQTBCLENBQUEifQ==