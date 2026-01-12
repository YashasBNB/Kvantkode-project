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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbkNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uQ29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sYUFBYSxFQUNiLGlCQUFpQixFQUNqQixZQUFZLEVBQ1oscUJBQXFCLEVBQ3JCLGNBQWMsRUFDZCxjQUFjLEVBQ2QsWUFBWSxHQUNaLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSwwQkFBMEIsQ0FDekIsb0JBQW9CLENBQUMsRUFBRSxFQUN2QixvQkFBb0IscURBRXBCLENBQUE7QUFDRCwwQkFBMEIsQ0FDekIsZUFBZSxDQUFDLEVBQUUsRUFDbEIsZUFBZSwrQ0FFZixDQUFBO0FBQ0Qsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDcEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7QUFDcEMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDbEMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNuQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUNsQyxxQkFBcUIsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtBQUU5QyxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDbkYsR0FBRywyQkFBMkI7SUFDOUIsVUFBVSxFQUFFO1FBQ1gscUNBQXFDLEVBQUU7WUFDdEMsSUFBSSxFQUFFLFNBQVM7WUFDZixLQUFLLGlEQUF5QztZQUM5QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsdUJBQXVCLEVBQ3ZCLCtEQUErRCxDQUMvRDtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCxpREFBaUQsRUFBRTtZQUNsRCxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssaURBQXlDO1lBQzlDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix5QkFBeUIsRUFDekIsNEZBQTRGLENBQzVGO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ25GLEdBQUcsMkJBQTJCO0lBQzlCLFVBQVUsRUFBRTtRQUNYLHlDQUF5QyxFQUFFO1lBQzFDLElBQUksRUFBRSxTQUFTO1lBQ2YsS0FBSyxpREFBeUM7WUFDOUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsc0JBQXNCLEVBQ3RCLDZIQUE2SCxFQUM3SCw4QkFBOEIsRUFDOUIsb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxVQUFVLENBQ1Y7WUFDRCxPQUFPLEVBQUUsS0FBSztTQUNkO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==