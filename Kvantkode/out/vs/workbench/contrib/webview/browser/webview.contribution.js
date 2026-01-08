/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { RedoCommand, SelectAllCommand, UndoCommand, } from '../../../../editor/browser/editorExtensions.js';
import { CopyAction, CutAction, PasteAction, } from '../../../../editor/contrib/clipboard/browser/clipboard.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IWebviewService } from './webview.js';
import { WebviewInput } from '../../webviewPanel/browser/webviewEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const PRIORITY = 100;
function overrideCommandForWebview(command, f) {
    command?.addImplementation(PRIORITY, 'webview', (accessor) => {
        const webviewService = accessor.get(IWebviewService);
        const webview = webviewService.activeWebview;
        if (webview?.isFocused) {
            f(webview);
            return true;
        }
        // When focused in a custom menu try to fallback to the active webview
        // This is needed for context menu actions and the menubar
        if (getActiveElement()?.classList.contains('action-menu-item')) {
            const editorService = accessor.get(IEditorService);
            if (editorService.activeEditor instanceof WebviewInput) {
                f(editorService.activeEditor.webview);
                return true;
            }
        }
        return false;
    });
}
overrideCommandForWebview(UndoCommand, (webview) => webview.undo());
overrideCommandForWebview(RedoCommand, (webview) => webview.redo());
overrideCommandForWebview(SelectAllCommand, (webview) => webview.selectAll());
overrideCommandForWebview(CopyAction, (webview) => webview.copy());
overrideCommandForWebview(PasteAction, (webview) => webview.paste());
overrideCommandForWebview(CutAction, (webview) => webview.cut());
export const PreventDefaultContextMenuItemsContextKeyName = 'preventDefaultContextMenuItems';
if (CutAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: CutAction.id,
            title: nls.localize('cut', 'Cut'),
        },
        group: '5_cutcopypaste',
        order: 1,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
if (CopyAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: CopyAction.id,
            title: nls.localize('copy', 'Copy'),
        },
        group: '5_cutcopypaste',
        order: 2,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
if (PasteAction) {
    MenuRegistry.appendMenuItem(MenuId.WebviewContext, {
        command: {
            id: PasteAction.id,
            title: nls.localize('paste', 'Paste'),
        },
        group: '5_cutcopypaste',
        order: 3,
        when: ContextKeyExpr.not(PreventDefaultContextMenuItemsContextKeyName),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBRU4sV0FBVyxFQUNYLGdCQUFnQixFQUNoQixXQUFXLEdBQ1gsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sVUFBVSxFQUNWLFNBQVMsRUFDVCxXQUFXLEdBQ1gsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQVksTUFBTSxjQUFjLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUE7QUFFcEIsU0FBUyx5QkFBeUIsQ0FDakMsT0FBaUMsRUFDakMsQ0FBOEI7SUFFOUIsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUM1RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUE7UUFDNUMsSUFBSSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDeEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ1YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsc0VBQXNFO1FBQ3RFLDBEQUEwRDtRQUMxRCxJQUFJLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDaEUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUNsRCxJQUFJLGFBQWEsQ0FBQyxZQUFZLFlBQVksWUFBWSxFQUFFLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyQyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCx5QkFBeUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQ25FLHlCQUF5QixDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7QUFDbkUseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0FBQzdFLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7QUFDbEUseUJBQXlCLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUNwRSx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO0FBRWhFLE1BQU0sQ0FBQyxNQUFNLDRDQUE0QyxHQUFHLGdDQUFnQyxDQUFBO0FBRTVGLElBQUksU0FBUyxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7UUFDbEQsT0FBTyxFQUFFO1lBQ1IsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFO1lBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7U0FDakM7UUFDRCxLQUFLLEVBQUUsZ0JBQWdCO1FBQ3ZCLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUM7S0FDdEUsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELElBQUksVUFBVSxFQUFFLENBQUM7SUFDaEIsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1FBQ2xELE9BQU8sRUFBRTtZQUNSLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRTtZQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1NBQ25DO1FBQ0QsS0FBSyxFQUFFLGdCQUFnQjtRQUN2QixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDO0tBQ3RFLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ2pCLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtRQUNsRCxPQUFPLEVBQUU7WUFDUixFQUFFLEVBQUUsV0FBVyxDQUFDLEVBQUU7WUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztTQUNyQztRQUNELEtBQUssRUFBRSxnQkFBZ0I7UUFDdkIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsQ0FBQztLQUN0RSxDQUFDLENBQUE7QUFDSCxDQUFDIn0=