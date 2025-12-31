/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { StartupProfiler } from './startupProfiler.js';
import { NativeStartupTimings } from './startupTimings.js';
import { RendererProfiling } from './rendererAutoProfiler.js';
import { Extensions as ConfigExt, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { applicationConfigurationNodeBase } from '../../../common/configuration.js';
// -- auto profiler
Registry.as(Extensions.Workbench).registerWorkbenchContribution(RendererProfiling, 4 /* LifecyclePhase.Eventually */);
// -- startup profiler
Registry.as(Extensions.Workbench).registerWorkbenchContribution(StartupProfiler, 3 /* LifecyclePhase.Restored */);
// -- startup timings
Registry.as(Extensions.Workbench).registerWorkbenchContribution(NativeStartupTimings, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigExt.Configuration).registerConfiguration({
    ...applicationConfigurationNodeBase,
    properties: {
        'application.experimental.rendererProfiling': {
            type: 'boolean',
            default: false,
            tags: ['experimental', 'onExP'],
            markdownDescription: localize('experimental.rendererProfiling', 'When enabled, slow renderers are automatically profiled.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvZWxlY3Ryb24tc2FuZGJveC9wZXJmb3JtYW5jZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzdELE9BQU8sRUFFTixVQUFVLElBQUksU0FBUyxHQUN2QixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRixtQkFBbUI7QUFFbkIsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUMvRixpQkFBaUIsb0NBRWpCLENBQUE7QUFFRCxzQkFBc0I7QUFFdEIsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUMvRixlQUFlLGtDQUVmLENBQUE7QUFFRCxxQkFBcUI7QUFFckIsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUMvRixvQkFBb0Isb0NBRXBCLENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5QixTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDbEYsR0FBRyxnQ0FBZ0M7SUFDbkMsVUFBVSxFQUFFO1FBQ1gsNENBQTRDLEVBQUU7WUFDN0MsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QixnQ0FBZ0MsRUFDaEMsMERBQTBELENBQzFEO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQSJ9