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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL211bHRpRGlmZkVkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQ0FBbUMsRUFDbkMseUJBQXlCLEdBQ3pCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDakYsT0FBTyxFQUNOLCtCQUErQixFQUMvQiw4QkFBOEIsR0FDOUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixzQ0FBc0MsR0FDdEMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV4QyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDL0IsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFDbEMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0FBRWhDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixVQUFVLEVBQUU7UUFDWCxzQ0FBc0MsRUFBRTtZQUN2QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLHdDQUF3QztTQUNyRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsaUJBQWlCLENBQ2hCLCtCQUErQixFQUMvQiw4QkFBOEIsb0NBRTlCLENBQUE7QUFFRCxxQkFBcUI7QUFDckIsOEJBQThCLENBQzdCLG1DQUFtQyxDQUFDLEVBQUUsRUFDdEMsbUNBQW1DLHNDQUVuQyxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQy9FLG9CQUFvQixDQUFDLE1BQU0sQ0FDMUIsZUFBZSxFQUNmLGVBQWUsQ0FBQyxFQUFFLEVBQ2xCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FDckMsRUFDRCxDQUFDLElBQUksY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FDMUMsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLHdCQUF3QixDQUMzRixvQkFBb0IsQ0FBQyxFQUFFLEVBQ3ZCLHlCQUF5QixDQUN6QixDQUFBO0FBRUQsa0JBQWtCO0FBQ2xCLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBQ25DLDhCQUE4QixDQUM3QixzQ0FBc0MsQ0FBQyxFQUFFLEVBQ3pDLHNDQUFzQyxzQ0FFdEMsQ0FBQSJ9