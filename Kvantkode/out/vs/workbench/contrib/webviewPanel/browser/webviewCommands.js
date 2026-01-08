/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, } from '../../webview/browser/webview.js';
import { WebviewEditor } from './webviewEditor.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const webviewActiveContextKeyExpr = ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', WebviewEditor.ID), EditorContextKeys.focus.toNegated() /* https://github.com/microsoft/vscode/issues/58668 */);
export class ShowWebViewEditorFindWidgetAction extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.showFind'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.showFind', 'Show find'); }
    constructor() {
        super({
            id: ShowWebViewEditorFindWidgetAction.ID,
            title: ShowWebViewEditorFindWidgetAction.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED),
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.showFind();
    }
}
export class HideWebViewEditorFindCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.hideFind'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.hideFind', 'Stop find'); }
    constructor() {
        super({
            id: HideWebViewEditorFindCommand.ID,
            title: HideWebViewEditorFindCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE),
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.hideFind();
    }
}
export class WebViewEditorFindNextCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.findNext'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.findNext', 'Find next'); }
    constructor() {
        super({
            id: WebViewEditorFindNextCommand.ID,
            title: WebViewEditorFindNextCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.runFindAction(false);
    }
}
export class WebViewEditorFindPreviousCommand extends Action2 {
    static { this.ID = 'editor.action.webvieweditor.findPrevious'; }
    static { this.LABEL = nls.localize('editor.action.webvieweditor.findPrevious', 'Find previous'); }
    constructor() {
        super({
            id: WebViewEditorFindPreviousCommand.ID,
            title: WebViewEditorFindPreviousCommand.LABEL,
            keybinding: {
                when: ContextKeyExpr.and(webviewActiveContextKeyExpr, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor) {
        getActiveWebviewEditor(accessor)?.runFindAction(true);
    }
}
export class ReloadWebviewAction extends Action2 {
    static { this.ID = 'workbench.action.webview.reloadWebviewAction'; }
    static { this.LABEL = nls.localize2('refreshWebviewLabel', 'Reload Webviews'); }
    constructor() {
        super({
            id: ReloadWebviewAction.ID,
            title: ReloadWebviewAction.LABEL,
            category: Categories.Developer,
            menu: [
                {
                    id: MenuId.CommandPalette,
                },
            ],
        });
    }
    async run(accessor) {
        const webviewService = accessor.get(IWebviewService);
        for (const webview of webviewService.webviews) {
            webview.reload();
        }
    }
}
function getActiveWebviewEditor(accessor) {
    const editorService = accessor.get(IEditorService);
    const activeEditor = editorService.activeEditor;
    return activeEditor instanceof WebviewInput ? activeEditor.webview : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUdyRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUNOLGVBQWUsRUFDZiw4Q0FBOEMsRUFDOUMsOENBQThDLEVBQzlDLDhDQUE4QyxHQUU5QyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE1BQU0sMkJBQTJCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDckQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUN2RCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsc0RBQXNELENBQ3pGLENBQUE7QUFFRixNQUFNLE9BQU8saUNBQWtDLFNBQVEsT0FBTzthQUN0QyxPQUFFLEdBQUcsc0NBQXNDLENBQUE7YUFDM0MsVUFBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENB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