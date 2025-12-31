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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZUVkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsRUFHakMsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFDTixlQUFlLEVBQ2YsZUFBZSxFQUNmLFdBQVcsRUFDWCw0QkFBNEIsRUFDNUIsNEJBQTRCLEVBQzVCLHlCQUF5QixFQUN6Qiw2QkFBNkIsRUFDN0IsWUFBWSxFQUNaLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsOEJBQThCLEVBQzlCLGVBQWUsRUFDZixjQUFjLEVBQ2QsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixZQUFZLEVBQ1oseUJBQXlCLEVBQ3pCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsNkJBQTZCLEdBQzdCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUNOLDZCQUE2QixFQUM3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