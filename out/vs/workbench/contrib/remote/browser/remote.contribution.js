/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ShowCandidateContribution } from './showCandidate.js';
import { TunnelFactoryContribution } from './tunnelFactory.js';
import { RemoteAgentConnectionStatusListener, RemoteMarkers } from './remote.js';
import { RemoteStatusIndicator } from './remoteIndicator.js';
import { AutomaticPortForwarding, ForwardedPortsView, PortRestore } from './remoteExplorer.js';
import { InitialRemoteConnectionHealthContribution } from './remoteConnectionHealth.js';
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(ShowCandidateContribution.ID, ShowCandidateContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(TunnelFactoryContribution.ID, TunnelFactoryContribution, 2 /* WorkbenchPhase.BlockRestore */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteAgentConnectionStatusListener, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(RemoteStatusIndicator.ID, RemoteStatusIndicator, 1 /* WorkbenchPhase.BlockStartup */);
workbenchContributionsRegistry.registerWorkbenchContribution(ForwardedPortsView, 3 /* LifecyclePhase.Restored */);
workbenchContributionsRegistry.registerWorkbenchContribution(PortRestore, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(AutomaticPortForwarding, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteMarkers, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(InitialRemoteConnectionHealthContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3JlbW90ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsRUFDakMsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTlELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlGLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXZGLE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDakQsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHlCQUF5QixDQUFDLEVBQUUsRUFDNUIseUJBQXlCLHNDQUV6QixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHlCQUF5QixDQUFDLEVBQUUsRUFDNUIseUJBQXlCLHNDQUV6QixDQUFBO0FBQ0QsOEJBQThCLENBQUMsNkJBQTZCLENBQzNELG1DQUFtQyxvQ0FFbkMsQ0FBQTtBQUNELDhCQUE4QixDQUM3QixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLHFCQUFxQixzQ0FFckIsQ0FBQTtBQUNELDhCQUE4QixDQUFDLDZCQUE2QixDQUMzRCxrQkFBa0Isa0NBRWxCLENBQUE7QUFDRCw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FBQyxXQUFXLG9DQUE0QixDQUFBO0FBQ3BHLDhCQUE4QixDQUFDLDZCQUE2QixDQUMzRCx1QkFBdUIsb0NBRXZCLENBQUE7QUFDRCw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FDM0QsYUFBYSxvQ0FFYixDQUFBO0FBQ0QsOEJBQThCLENBQUMsNkJBQTZCLENBQzNELHlDQUF5QyxrQ0FFekMsQ0FBQSJ9