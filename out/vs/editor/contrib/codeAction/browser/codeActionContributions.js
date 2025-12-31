/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { editorConfigurationBaseNode } from '../../../common/config/editorConfigurationSchema.js';
import { AutoFixAction, CodeActionCommand, FixAllAction, OrganizeImportsAction, QuickFixAction, RefactorAction, SourceAction, } from './codeActionCommands.js';
import { CodeActionController } from './codeActionController.js';
import { LightBulbWidget } from './lightBulbWidget.js';
import * as nls from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
registerEditorContribution(CodeActionController.ID, CodeActionController, 3 /* EditorContributionInstantiation.Eventually */);
registerEditorContribution(LightBulbWidget.ID, LightBulbWidget, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(QuickFixAction);
registerEditorAction(RefactorAction);
registerEditorAction(SourceAction);
registerEditorAction(OrganizeImportsAction);
registerEditorAction(AutoFixAction);
registerEditorAction(FixAllAction);
registerEditorCommand(new CodeActionCommand());
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionWidget.showHeaders': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('showCodeActionHeaders', 'Enable/disable showing group headers in the Code Action menu.'),
            default: true,
        },
    },
});
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionWidget.includeNearbyQuickFixes': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('includeNearbyQuickFixes', 'Enable/disable showing nearest Quick Fix within a line when not currently on a diagnostic.'),
            default: true,
        },
    },
});
Registry.as(Extensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActions.triggerOnFocusChange': {
            type: 'boolean',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: nls.localize('triggerOnFocusChange', 'Enable triggering {0} when {1} is set to {2}. Code Actions must be set to {3} to be triggered for window and focus changes.', '`#editor.codeActionsOnSave#`', '`#files.autoSave#`', '`afterDelay`', '`always`'),
            default: false,
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbkNvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIsMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakcsT0FBTyxFQUNOLGFBQWEsRUFDYixpQkFBaUIsRUFDakIsWUFBWSxFQUNaLHFCQUFxQixFQUNyQixjQUFjLEVBQ2QsY0FBYyxFQUNkLFlBQVksR0FDWixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsMEJBQTBCLENBQ3pCLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIsb0JBQW9CLHFEQUVwQixDQUFBO0FBQ0QsMEJBQTBCLENBQ3pCLGVBQWUsQ0FBQyxFQUFFLEVBQ2xCLGVBQWUsK0NBRWYsQ0FBQTtBQUNELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQ3BDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQ3BDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ2xDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUE7QUFDM0Msb0JBQW9CLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDbkMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDbEMscUJBQXFCLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7QUFFOUMsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ25GLEdBQUcsMkJBQTJCO0lBQzlCLFVBQVUsRUFBRTtRQUNYLHFDQUFxQyxFQUFFO1lBQ3RDLElBQUksRUFBRSxTQUFTO1lBQ2YsS0FBSyxpREFBeUM7WUFDOUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVCQUF1QixFQUN2QiwrREFBK0QsQ0FDL0Q7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNiO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDbkYsR0FBRywyQkFBMkI7SUFDOUIsVUFBVSxFQUFFO1FBQ1gsaURBQWlELEVBQUU7WUFDbEQsSUFBSSxFQUFFLFNBQVM7WUFDZixLQUFLLGlEQUF5QztZQUM5QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIseUJBQXlCLEVBQ3pCLDRGQUE0RixDQUM1RjtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCx5Q0FBeUMsRUFBRTtZQUMxQyxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHNCQUFzQixFQUN0Qiw2SEFBNkgsRUFDN0gsOEJBQThCLEVBQzlCLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsVUFBVSxDQUNWO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=