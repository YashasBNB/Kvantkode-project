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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9lbGVjdHJvbi1zYW5kYm94L3BlcmZvcm1hbmNlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDN0QsT0FBTyxFQUVOLFVBQVUsSUFBSSxTQUFTLEdBQ3ZCLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5GLG1CQUFtQjtBQUVuQixRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQy9GLGlCQUFpQixvQ0FFakIsQ0FBQTtBQUVELHNCQUFzQjtBQUV0QixRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQy9GLGVBQWUsa0NBRWYsQ0FBQTtBQUVELHFCQUFxQjtBQUVyQixRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQy9GLG9CQUFvQixvQ0FFcEIsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNsRixHQUFHLGdDQUFnQztJQUNuQyxVQUFVLEVBQUU7UUFDWCw0Q0FBNEMsRUFBRTtZQUM3QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQztZQUMvQixtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGdDQUFnQyxFQUNoQywwREFBMEQsQ0FDMUQ7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=