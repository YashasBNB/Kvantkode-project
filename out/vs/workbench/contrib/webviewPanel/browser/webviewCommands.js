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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld0NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixlQUFlLEVBQ2YsOENBQThDLEVBQzlDLDhDQUE4QyxFQUM5Qyw4Q0FBOEMsR0FFOUMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixNQUFNLDJCQUEyQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ3JELGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDdkQsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLHNEQUFzRCxDQUN6RixDQUFBO0FBRUYsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLE9BQU87YUFDdEMsT0FBRSxHQUFHLHNDQUFzQyxDQUFBO2FBQzNDLFVBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHND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