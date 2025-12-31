/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/notebookFind.css';
import { Schemas } from '../../../../../../base/common/network.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { ICodeEditorService } from '../../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { getSelectionSearchString, StartFindAction, StartFindReplaceAction, } from '../../../../../../editor/contrib/find/browser/findController.js';
import { localize2 } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { NotebookFindContrib } from './notebookFindWidget.js';
import { NotebookMultiCellAction } from '../../controller/coreActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CellUri, NotebookFindScopeType } from '../../../common/notebookCommon.js';
import { INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../../common/notebookContextKeys.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
registerNotebookContribution(NotebookFindContrib.id, NotebookFindContrib);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.hideFind',
            title: localize2('notebookActions.hideFind', 'Hide Find in Notebook'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED),
                primary: 9 /* KeyCode.Escape */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookFindContrib.id);
        controller.hide();
        editor.focus();
    }
});
registerAction2(class extends NotebookMultiCellAction {
    constructor() {
        super({
            id: 'notebook.find',
            title: localize2('notebookActions.findInNotebook', 'Find in Notebook'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.or(NOTEBOOK_IS_ACTIVE_EDITOR, INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR), EditorContextKeys.focus.toNegated()),
                primary: 36 /* KeyCode.KeyF */ | 2048 /* KeyMod.CtrlCmd */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookFindContrib.id);
        controller.show(undefined, { findScope: { findScopeType: NotebookFindScopeType.None } });
    }
});
function notebookContainsTextModel(uri, textModel) {
    if (textModel.uri.scheme === Schemas.vscodeNotebookCell) {
        const cellUri = CellUri.parse(textModel.uri);
        if (cellUri && isEqual(cellUri.notebook, uri)) {
            return true;
        }
    }
    return false;
}
function getSearchStringOptions(editor, opts) {
    // Get the search string result, following the same logic in _start function in 'vs/editor/contrib/find/browser/findController'
    if (opts.seedSearchStringFromSelection === 'single') {
        const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection, opts.seedSearchStringFromNonEmptySelection);
        if (selectionSearchString) {
            return {
                searchString: selectionSearchString,
                selection: editor.getSelection(),
            };
        }
    }
    else if (opts.seedSearchStringFromSelection === 'multiple' && !opts.updateSearchScope) {
        const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection);
        if (selectionSearchString) {
            return {
                searchString: selectionSearchString,
                selection: editor.getSelection(),
            };
        }
    }
    return undefined;
}
StartFindAction.addImplementation(100, (accessor, codeEditor, args) => {
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        return false;
    }
    if (!codeEditor.hasModel()) {
        return false;
    }
    if (!editor.hasEditorFocus() && !editor.hasWebviewFocus()) {
        const codeEditorService = accessor.get(ICodeEditorService);
        // check if the active pane contains the active text editor
        const textEditor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (editor.hasModel() &&
            textEditor &&
            textEditor.hasModel() &&
            notebookContainsTextModel(editor.textModel.uri, textEditor.getModel())) {
            // the active text editor is in notebook editor
        }
        else {
            return false;
        }
    }
    const controller = editor.getContribution(NotebookFindContrib.id);
    const searchStringOptions = getSearchStringOptions(codeEditor, {
        forceRevealReplace: false,
        seedSearchStringFromSelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never'
            ? 'single'
            : 'none',
        seedSearchStringFromNonEmptySelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: codeEditor.getOption(43 /* EditorOption.find */)
            .globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: codeEditor.getOption(43 /* EditorOption.find */).loop,
    });
    let options = undefined;
    const uri = codeEditor.getModel().uri;
    const data = CellUri.parse(uri);
    if (searchStringOptions?.selection && data) {
        const cell = editor.getCellByHandle(data.handle);
        if (cell) {
            options = {
                searchStringSeededFrom: { cell, range: searchStringOptions.selection },
            };
        }
    }
    controller.show(searchStringOptions?.searchString, options);
    return true;
});
StartFindReplaceAction.addImplementation(100, (accessor, codeEditor, args) => {
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        return false;
    }
    if (!codeEditor.hasModel()) {
        return false;
    }
    const controller = editor.getContribution(NotebookFindContrib.id);
    const searchStringOptions = getSearchStringOptions(codeEditor, {
        forceRevealReplace: false,
        seedSearchStringFromSelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never'
            ? 'single'
            : 'none',
        seedSearchStringFromNonEmptySelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: codeEditor.getOption(43 /* EditorOption.find */)
            .globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: codeEditor.getOption(43 /* EditorOption.find */).loop,
    });
    if (controller) {
        controller.replace(searchStringOptions?.searchString);
        return true;
    }
    return false;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2ZpbmQvbm90ZWJvb2tGaW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV4RixPQUFPLEVBRU4sd0JBQXdCLEVBRXhCLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHM0YsT0FBTyxFQUFrQyxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzdGLE9BQU8sRUFBMkIsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQywrQ0FBK0MsRUFD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