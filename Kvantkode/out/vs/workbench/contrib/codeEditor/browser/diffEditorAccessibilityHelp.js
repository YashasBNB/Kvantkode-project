/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { AccessibleDiffViewerNext, AccessibleDiffViewerPrev, } from '../../../../editor/browser/widget/diffEditor/commands.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyEqualsExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getCommentCommandInfo } from '../../accessibility/browser/editorAccessibilityHelp.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
export class DiffEditorAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'diff-editor';
        this.when = ContextKeyEqualsExpr.create('isInDiffEditor', true);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const keybindingService = accessor.get(IKeybindingService);
        const contextKeyService = accessor.get(IContextKeyService);
        if (!(editorService.activeTextEditorControl instanceof DiffEditorWidget)) {
            return;
        }
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const switchSides = localize('msg3', 'Run the command Diff Editor: Switch Side{0} to toggle between the original and modified editors.', '<keybinding:diffEditor.switchSide>');
        const diffEditorActiveAnnouncement = localize('msg5', 'The setting, accessibility.verbosity.diffEditorActive, controls if a diff editor announcement is made when it becomes the active editor.');
        const keys = [
            'accessibility.signals.diffLineDeleted',
            'accessibility.signals.diffLineInserted',
            'accessibility.signals.diffLineModified',
        ];
        const content = [
            localize('msg1', 'You are in a diff editor.'),
            localize('msg2', 'View the next{0} or previous{1} diff in diff review mode, which is optimized for screen readers.', '<keybinding:' + AccessibleDiffViewerNext.id + '>', '<keybinding:' + AccessibleDiffViewerPrev.id + '>'),
            switchSides,
            diffEditorActiveAnnouncement,
            localize('msg4', 'To control which accessibility signals should be played, the following settings can be configured: {0}.', keys.join(', ')),
        ];
        const commentCommandInfo = getCommentCommandInfo(keybindingService, contextKeyService, codeEditor);
        if (commentCommandInfo) {
            content.push(commentCommandInfo);
        }
        return new AccessibleContentProvider("diffEditor" /* AccessibleViewProviderId.DiffEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => content.join('\n'), () => codeEditor.focus(), "accessibility.verbosity.diffEditor" /* AccessibilityVerbositySettingId.DiffEditor */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZGlmZkVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixNQUFNLE9BQU8sMkJBQTJCO0lBQXhDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxhQUFhLENBQUE7UUFDcEIsU0FBSSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxTQUFJLHdDQUEwQjtJQWdFeEMsQ0FBQztJQS9EQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUxRCxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLFlBQVksZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQzFFLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQ2YsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQ3BGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FDM0IsTUFBTSxFQUNOLGtHQUFrRyxFQUNsRyxvQ0FBb0MsQ0FDcEMsQ0FBQTtRQUNELE1BQU0sNEJBQTRCLEdBQUcsUUFBUSxDQUM1QyxNQUFNLEVBQ04sMElBQTBJLENBQzFJLENBQUE7UUFFRCxNQUFNLElBQUksR0FBRztZQUNaLHVDQUF1QztZQUN2Qyx3Q0FBd0M7WUFDeEMsd0NBQXdDO1NBQ3hDLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRztZQUNmLFFBQVEsQ0FBQyxNQUFNLEVBQUUsMkJBQTJCLENBQUM7WUFDN0MsUUFBUSxDQUNQLE1BQU0sRUFDTixrR0FBa0csRUFDbEcsY0FBYyxHQUFHLHdCQUF3QixDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQ2xELGNBQWMsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUNsRDtZQUNELFdBQVc7WUFDWCw0QkFBNEI7WUFDNUIsUUFBUSxDQUNQLE1BQU0sRUFDTix5R0FBeUcsRUFDekcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDZjtTQUNELENBQUE7UUFDRCxNQUFNLGtCQUFrQixHQUFHLHFCQUFxQixDQUMvQyxpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLFVBQVUsQ0FDVixDQUFBO1FBQ0QsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLHlCQUF5Qix5REFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3hCLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsd0ZBRXhCLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==