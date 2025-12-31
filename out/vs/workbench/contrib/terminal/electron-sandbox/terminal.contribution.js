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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvZWxlY3Ryb24tc2FuZGJveC90ZXJtaW5hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUNuQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEVBQ2pDLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTVGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRTVFLG9CQUFvQjtBQUNwQixnQ0FBZ0MsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUNoRixpQkFBaUIsQ0FDaEIsK0JBQStCLEVBQy9CLHNDQUFzQyxvQ0FFdEMsQ0FBQTtBQUVELG1DQUFtQztBQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3BDLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtBQUVELDZIQUE2SDtBQUM3SCwyQ0FBMkM7QUFDM0MsOEJBQThCLENBQzdCLGdDQUFnQyxDQUFDLEVBQUUsRUFDbkMsZ0NBQWdDLHNDQUVoQyxDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsMEJBQTBCLGtDQUEwQixDQUFBIn0=