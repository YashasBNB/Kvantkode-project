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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2RpZmZFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHdCQUF3QixHQUN4QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsTUFBTSxPQUFPLDJCQUEyQjtJQUF4QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsYUFBYSxDQUFBO1FBQ3BCLFNBQUksR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUQsU0FBSSx3Q0FBMEI7SUFnRXhDLENBQUM7SUEvREEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixZQUFZLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUNmLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLElBQUksaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUNwRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQzNCLE1BQU0sRUFDTixrR0FBa0csRUFDbEcsb0NBQW9DLENBQ3BDLENBQUE7UUFDRCxNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FDNUMsTUFBTSxFQUNOLDBJQUEwSSxDQUMxSSxDQUFBO1FBRUQsTUFBTSxJQUFJLEdBQUc7WUFDWix1Q0FBdUM7WUFDdkMsd0NBQXdDO1lBQ3hDLHdDQUF3QztTQUN4QyxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUc7WUFDZixRQUFRLENBQUMsTUFBTSxFQUFFLDJCQUEyQixDQUFDO1lBQzdDLFFBQVEsQ0FDUCxNQUFNLEVBQ04sa0dBQWtHLEVBQ2xHLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUNsRCxjQUFjLEdBQUcsd0JBQXdCLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FDbEQ7WUFDRCxXQUFXO1lBQ1gsNEJBQTRCO1lBQzVCLFFBQVEsQ0FDUCxNQUFNLEVBQ04seUdBQXlHLEVBQ3pHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ2Y7U0FDRCxDQUFBO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FDL0MsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixVQUFVLENBQ1YsQ0FBQTtRQUNELElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sSUFBSSx5QkFBeUIseURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN4QixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLHdGQUV4QixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=