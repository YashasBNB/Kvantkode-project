/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { ConfigMcpDiscovery } from '../common/discovery/configMcpDiscovery.js';
import { ExtensionMcpDiscovery } from '../common/discovery/extensionMcpDiscovery.js';
import { mcpDiscoveryRegistry } from '../common/discovery/mcpDiscovery.js';
import { RemoteNativeMpcDiscovery } from '../common/discovery/nativeMcpRemoteDiscovery.js';
import { CursorWorkspaceMcpDiscoveryAdapter } from '../common/discovery/workspaceMcpDiscoveryAdapter.js';
import { IMcpConfigPathsService, McpConfigPathsService } from '../common/mcpConfigPathsService.js';
import { mcpServerSchema } from '../common/mcpConfiguration.js';
import { McpContextKeysController } from '../common/mcpContextKeys.js';
import { McpRegistry } from '../common/mcpRegistry.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { McpService } from '../common/mcpService.js';
import { IMcpService } from '../common/mcpTypes.js';
import { AddConfigurationAction, EditStoredInput, InstallFromActivation, ListMcpServerCommand, MCPServerActionRendering, McpServerOptionsCommand, RemoveStoredInput, ResetMcpCachedTools, ResetMcpTrustCommand, RestartServer, ShowOutput, StartServer, StopServer, } from './mcpCommands.js';
import { McpDiscovery } from './mcpDiscovery.js';
import { McpLanguageFeatures } from './mcpLanguageFeatures.js';
import { McpUrlHandler } from './mcpUrlHandler.js';
registerSingleton(IMcpRegistry, McpRegistry, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpService, McpService, 1 /* InstantiationType.Delayed */);
registerSingleton(IMcpConfigPathsService, McpConfigPathsService, 1 /* InstantiationType.Delayed */);
mcpDiscoveryRegistry.register(new SyncDescriptor(RemoteNativeMpcDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(ConfigMcpDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(ExtensionMcpDiscovery));
mcpDiscoveryRegistry.register(new SyncDescriptor(CursorWorkspaceMcpDiscoveryAdapter));
registerWorkbenchContribution2('mcpDiscovery', McpDiscovery, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2('mcpContextKeys', McpContextKeysController, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2('mcpLanguageFeatures', McpLanguageFeatures, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2('mcpUrlHandler', McpUrlHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerAction2(ListMcpServerCommand);
registerAction2(McpServerOptionsCommand);
registerAction2(ResetMcpTrustCommand);
registerAction2(ResetMcpCachedTools);
registerAction2(AddConfigurationAction);
registerAction2(RemoveStoredInput);
registerAction2(EditStoredInput);
registerAction2(StartServer);
registerAction2(StopServer);
registerAction2(ShowOutput);
registerAction2(InstallFromActivation);
registerAction2(RestartServer);
registerWorkbenchContribution2('mcpActionRendering', MCPServerActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
const jsonRegistry = (Registry.as(jsonContributionRegistry.Extensions.JSONContribution));
jsonRegistry.registerSchema(mcpSchemaId, mcpServerSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsV0FB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