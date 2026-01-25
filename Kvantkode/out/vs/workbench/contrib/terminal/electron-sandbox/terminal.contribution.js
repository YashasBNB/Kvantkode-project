/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILocalPtyService, TerminalIpcChannels, } from '../../../../platform/terminal/common/terminal.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { TerminalNativeContribution } from './terminalNativeContribution.js';
import { ElectronTerminalProfileResolverService } from './terminalProfileResolverService.js';
import { LocalTerminalBackendContribution } from './localTerminalBackend.js';
// Register services
registerMainProcessRemoteService(ILocalPtyService, TerminalIpcChannels.LocalPty);
registerSingleton(ITerminalProfileResolverService, ElectronTerminalProfileResolverService, 1 /* InstantiationType.Delayed */);
// Register workbench contributions
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
// This contribution needs to be active during the Startup phase to be available when a remote resolver tries to open a local
// terminal while connecting to the remote.
registerWorkbenchContribution2(LocalTerminalBackendContribution.ID, LocalTerminalBackendContribution, 1 /* WorkbenchPhase.BlockStartup */);
workbenchRegistry.registerWorkbenchContribution(TerminalNativeContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L3Rlcm1pbmFsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsbUJBQW1CLEdBQ25CLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsRUFDakMsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDdkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFNUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFNUUsb0JBQW9CO0FBQ3BCLGdDQUFnQyxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQ2hGLGlCQUFpQixDQUNoQiwrQkFBK0IsRUFDL0Isc0NBQXNDLG9DQUV0QyxDQUFBO0FBRUQsbUNBQW1DO0FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDcEMsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBRUQsNkhBQTZIO0FBQzdILDJDQUEyQztBQUMzQyw4QkFBOEIsQ0FDN0IsZ0NBQWdDLENBQUMsRUFBRSxFQUNuQyxnQ0FBZ0Msc0NBRWhDLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQywwQkFBMEIsa0NBQTBCLENBQUEifQ==