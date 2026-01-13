/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MultiDiffEditor } from './multiDiffEditor.js';
import { MultiDiffEditorInput, MultiDiffEditorResolverContribution, MultiDiffEditorSerializer, } from './multiDiffEditorInput.js';
import { CollapseAllAction, ExpandAllAction, GoToFileAction } from './actions.js';
import { IMultiDiffSourceResolverService, MultiDiffSourceResolverService, } from './multiDiffSourceResolverService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { OpenScmGroupAction, ScmMultiDiffSourceResolverContribution, } from './scmMultiDiffSourceResolver.js';
registerAction2(GoToFileAction);
registerAction2(CollapseAllAction);
registerAction2(ExpandAllAction);
Registry.as(Extensions.Configuration).registerConfiguration({
    properties: {
        'multiDiffEditor.experimental.enabled': {
            type: 'boolean',
            default: true,
            description: 'Enable experimental multi diff editor.',
        },
    },
});
registerSingleton(IMultiDiffSourceResolverService, MultiDiffSourceResolverService, 1 /* InstantiationType.Delayed */);
// Editor Integration
registerWorkbenchContribution2(MultiDiffEditorResolverContribution.ID, MultiDiffEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(MultiDiffEditor, MultiDiffEditor.ID, localize('name', 'Multi Diff Editor')), [new SyncDescriptor(MultiDiffEditorInput)]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(MultiDiffEditorInput.ID, MultiDiffEditorSerializer);
// SCM integration
registerAction2(OpenScmGroupAction);
registerWorkbenchContribution2(ScmMultiDiffSourceResolverContribution.ID, ScmMultiDiffSourceResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvbXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1DQUFtQyxFQUNuQyx5QkFBeUIsR0FDekIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sK0JBQStCLEVBQy9CLDhCQUE4QixHQUM5QixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHNDQUFzQyxHQUN0QyxNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtBQUMvQixlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUNsQyxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUE7QUFFaEMsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ25GLFVBQVUsRUFBRTtRQUNYLHNDQUFzQyxFQUFFO1lBQ3ZDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixXQUFXLEVBQUUsd0NBQXdDO1NBQ3JEO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixpQkFBaUIsQ0FDaEIsK0JBQStCLEVBQy9CLDhCQUE4QixvQ0FFOUIsQ0FBQTtBQUVELHFCQUFxQjtBQUNyQiw4QkFBOEIsQ0FDN0IsbUNBQW1DLENBQUMsRUFBRSxFQUN0QyxtQ0FBbUMsc0NBRW5DLENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUMxQixlQUFlLEVBQ2YsZUFBZSxDQUFDLEVBQUUsRUFDbEIsUUFBUSxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUNyQyxFQUNELENBQUMsSUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUMxQyxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsd0JBQXdCLENBQzNGLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIseUJBQXlCLENBQ3pCLENBQUE7QUFFRCxrQkFBa0I7QUFDbEIsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDbkMsOEJBQThCLENBQzdCLHNDQUFzQyxDQUFDLEVBQUUsRUFDekMsc0NBQXNDLHNDQUV0QyxDQUFBIn0=