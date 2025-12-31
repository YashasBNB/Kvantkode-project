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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlldy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEUsT0FBTyxFQUVOLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsV0FBVyxHQUNYLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLFVBQVUsRUFDVixTQUFTLEVBQ1QsV0FBVyxHQUNYLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFZLE1BQU0sY0FBYyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFBO0FBRXBCLFNBQVMseUJBQXlCLENBQ2pDLE9BQWlDLEVBQ2pDLENBQThCO0lBRTlCLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDNUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFBO1FBQzVDLElB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