/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { SashSettingsController } from './sash.js';
import { isIOS } from '../../../../base/common/platform.js';
// Sash size contribution
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SashSettingsController, 3 /* LifecyclePhase.Restored */);
// Sash size configuration contribution
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.sash.size': {
            type: 'number',
            default: isIOS ? 20 : 4,
            minimum: 1,
            maximum: 20,
            description: localize('sashSize', "Controls the feedback area size in pixels of the dragging area in between views/editors. Set it to a larger value if you feel it's hard to resize views using the mouse."),
        },
        'workbench.sash.hoverDelay': {
            type: 'number',
            default: 300,
            minimum: 0,
            maximum: 2000,
            description: localize('sashHoverDelay', 'Controls the hover feedback delay in milliseconds of the dragging area in between views/editors.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zYXNoL2Jyb3dzZXIvc2FzaC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0VBQW9FLENBQUE7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pGLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCx5QkFBeUI7QUFDekIsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsc0JBQXNCLGtDQUEwQixDQUFBO0FBRWhGLHVDQUF1QztBQUN2QyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNoRyxHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxFQUFFO1lBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsVUFBVSxFQUNWLDBLQUEwSyxDQUMxSztTQUNEO1FBQ0QsMkJBQTJCLEVBQUU7WUFDNUIsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsR0FBRztZQUNaLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLElBQUk7WUFDYixXQUFXLEVBQUUsUUFBUSxDQUNwQixnQkFBZ0IsRUFDaEIsa0dBQWtHLENBQ2xHO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQSJ9