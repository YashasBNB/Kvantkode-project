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
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AcceptAllInput1, AcceptAllInput2, AcceptMerge, CompareInput1WithBaseCommand, CompareInput2WithBaseCommand, GoToNextUnhandledConflict, GoToPreviousUnhandledConflict, OpenBaseFile, OpenMergeEditor, OpenResultResource, ResetToBaseAndAutoMergeCommand, SetColumnLayout, SetMixedLayout, ShowHideTopBase, ShowHideCenterBase, ShowHideBase, ShowNonConflictingChanges, ToggleActiveConflictInput1, ToggleActiveConflictInput2, ResetCloseWithConflictsChoice, } from './commands/commands.js';
import { MergeEditorCopyContentsToJSON, MergeEditorLoadContentsFromFolder, MergeEditorSaveContentsToFolder, } from './commands/devCommands.js';
import { MergeEditorInput } from './mergeEditorInput.js';
import { MergeEditor, MergeEditorOpenHandlerContribution, MergeEditorResolverContribution, } from './view/mergeEditor.js';
import { MergeEditorSerializer } from './mergeEditorSerializer.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { MergeEditorAccessibilityHelpProvider } from './mergeEditorAccessibilityHelp.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(MergeEditor, MergeEditor.ID, localize('name', 'Merge Editor')), [new SyncDescriptor(MergeEditorInput)]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(MergeEditorInput.ID, MergeEditorSerializer);
Registry.as(Extensions.Configuration).registerConfiguration({
    properties: {
        'mergeEditor.diffAlgorithm': {
            type: 'string',
            enum: ['legacy', 'advanced'],
            default: 'advanced',
            markdownEnumDescriptions: [
                localize('diffAlgorithm.legacy', 'Uses the legacy diffing algorithm.'),
                localize('diffAlgorithm.advanced', 'Uses the advanced diffing algorithm.'),
            ],
        },
        'mergeEditor.showDeletionMarkers': {
            type: 'boolean',
            default: true,
            description: 'Controls if deletions in base or one of the inputs should be indicated by a vertical bar.',
        },
    },
});
registerAction2(OpenResultResource);
registerAction2(SetMixedLayout);
registerAction2(SetColumnLayout);
registerAction2(OpenMergeEditor);
registerAction2(OpenBaseFile);
registerAction2(ShowNonConflictingChanges);
registerAction2(ShowHideBase);
registerAction2(ShowHideTopBase);
registerAction2(ShowHideCenterBase);
registerAction2(GoToNextUnhandledConflict);
registerAction2(GoToPreviousUnhandledConflict);
registerAction2(ToggleActiveConflictInput1);
registerAction2(ToggleActiveConflictInput2);
registerAction2(CompareInput1WithBaseCommand);
registerAction2(CompareInput2WithBaseCommand);
registerAction2(AcceptAllInput1);
registerAction2(AcceptAllInput2);
registerAction2(ResetToBaseAndAutoMergeCommand);
registerAction2(AcceptMerge);
registerAction2(ResetCloseWithConflictsChoice);
// Dev Commands
registerAction2(MergeEditorCopyContentsToJSON);
registerAction2(MergeEditorSaveContentsToFolder);
registerAction2(MergeEditorLoadContentsFromFolder);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(MergeEditorOpenHandlerContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(MergeEditorResolverContribution.ID, MergeEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
AccessibleViewRegistry.register(new MergeEditorAccessibilityHelpProvider());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlRWRpdG9yLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixFQUdqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sMkJBQTJCLENBQUE7QUFDcEYsT0FBTyxFQUNOLGVBQWUsRUFDZixlQUFlLEVBQ2YsV0FBVyxFQUNYLDRCQUE0QixFQUM1Qiw0QkFBNEIsRUFDNUIseUJBQXlCLEVBQ3pCLDZCQUE2QixFQUM3QixZQUFZLEVBQ1osZUFBZSxFQUNmLGtCQUFrQixFQUNsQiw4QkFBOEIsRUFDOUIsZUFBZSxFQUNmLGNBQWMsRUFDZCxlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLFlBQVksRUFDWix5QkFBeUIsRUFDekIsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQiw2QkFBNkIsR0FDN0IsTUFBTSx3QkFBd0IsQ0FBQTtBQUMv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