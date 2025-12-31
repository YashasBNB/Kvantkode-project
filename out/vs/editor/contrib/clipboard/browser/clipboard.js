/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { getActiveDocument } from '../../../../base/browser/dom.js';
import * as platform from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { CopyOptions, InMemoryClipboardMetadataManager, } from '../../../browser/controller/editContext/clipboardUtils.js';
import { NativeEditContextRegistry } from '../../../browser/controller/editContext/native/nativeEditContextRegistry.js';
import { EditorAction, MultiCommand, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CopyPasteController } from '../../dropOrPasteInto/browser/copyPasteController.js';
const CLIPBOARD_CONTEXT_MENU_GROUP = '9_cutcopypaste';
const supportsCut = platform.isNative || document.queryCommandSupported('cut');
const supportsCopy = platform.isNative || document.queryCommandSupported('copy');
// Firefox only supports navigator.clipboard.readText() in browser extensions.
// See https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText#Browser_compatibility
// When loading over http, navigator.clipboard can be undefined. See https://github.com/microsoft/monaco-editor/issues/2313
const supportsPaste = typeof navigator.clipboard === 'undefined' || browser.isFirefox
    ? document.queryCommandSupported('paste')
    : true;
function registerCommand(command) {
    command.register();
    return command;
}
export const CutAction = supportsCut
    ? registerCommand(new MultiCommand({
        id: 'editor.action.clipboardCutAction',
        precondition: undefined,
        kbOpts: 
        // Do not bind cut keybindings in the browser,
        // since browsers do that for us and it avoids security prompts
        platform.isNative
            ? {
                primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
                    secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            }
            : undefined,
        menuOpts: [
            {
                menuId: MenuId.MenubarEditMenu,
                group: '2_ccp',
                title: nls.localize({ key: 'miCut', comment: ['&& denotes a mnemonic'] }, 'Cu&&t'),
                order: 1,
            },
            {
                menuId: MenuId.EditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.cutLabel', 'Cut'),
                when: EditorContextKeys.writable,
                order: 1,
            },
            {
                menuId: MenuId.CommandPalette,
                group: '',
                title: nls.localize('actions.clipboard.cutLabel', 'Cut'),
                order: 1,
            },
            {
                menuId: MenuId.SimpleEditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.cutLabel', 'Cut'),
                when: EditorContextKeys.writable,
                order: 1,
            },
        ],
    }))
    : undefined;
export const CopyAction = supportsCopy
    ? registerCommand(new MultiCommand({
        id: 'editor.action.clipboardCopyAction',
        precondition: undefined,
        kbOpts: 
        // Do not bind copy keybindings in the browser,
        // since browsers do that for us and it avoids security prompts
        platform.isNative
            ? {
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            }
            : undefined,
        menuOpts: [
            {
                menuId: MenuId.MenubarEditMenu,
                group: '2_ccp',
                title: nls.localize({ key: 'miCopy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
                order: 2,
            },
            {
                menuId: MenuId.EditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.copyLabel', 'Copy'),
                order: 2,
            },
            {
                menuId: MenuId.CommandPalette,
                group: '',
                title: nls.localize('actions.clipboard.copyLabel', 'Copy'),
                order: 1,
            },
            {
                menuId: MenuId.SimpleEditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.copyLabel', 'Copy'),
                order: 2,
            },
        ],
    }))
    : undefined;
MenuRegistry.appendMenuItem(MenuId.MenubarEditMenu, {
    submenu: MenuId.MenubarCopy,
    title: nls.localize2('copy as', 'Copy As'),
    group: '2_ccp',
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.EditorContextCopy,
    title: nls.localize2('copy as', 'Copy As'),
    group: CLIPBOARD_CONTEXT_MENU_GROUP,
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.EditorContextShare,
    title: nls.localize2('share', 'Share'),
    group: '11_share',
    order: -1,
    when: ContextKeyExpr.and(ContextKeyExpr.notEquals('resourceScheme', 'output'), EditorContextKeys.editorTextFocus),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    submenu: MenuId.ExplorerContextShare,
    title: nls.localize2('share', 'Share'),
    group: '11_share',
    order: -1,
});
export const PasteAction = supportsPaste
    ? registerCommand(new MultiCommand({
        id: 'editor.action.clipboardPasteAction',
        precondition: undefined,
        kbOpts: 
        // Do not bind paste keybindings in the browser,
        // since browsers do that for us and it avoids security prompts
        platform.isNative
            ? {
                primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                    secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */],
                },
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                    secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            }
            : undefined,
        menuOpts: [
            {
                menuId: MenuId.MenubarEditMenu,
                group: '2_ccp',
                title: nls.localize({ key: 'miPaste', comment: ['&& denotes a mnemonic'] }, '&&Paste'),
                order: 4,
            },
            {
                menuId: MenuId.EditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.pasteLabel', 'Paste'),
                when: EditorContextKeys.writable,
                order: 4,
            },
            {
                menuId: MenuId.CommandPalette,
                group: '',
                title: nls.localize('actions.clipboard.pasteLabel', 'Paste'),
                order: 1,
            },
            {
                menuId: MenuId.SimpleEditorContext,
                group: CLIPBOARD_CONTEXT_MENU_GROUP,
                title: nls.localize('actions.clipboard.pasteLabel', 'Paste'),
                when: EditorContextKeys.writable,
                order: 4,
            },
        ],
    }))
    : undefined;
class ExecCommandCopyWithSyntaxHighlightingAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.clipboardCopyWithSyntaxHighlightingAction',
            label: nls.localize2('actions.clipboard.copyWithSyntaxHighlightingLabel', 'Copy with Syntax Highlighting'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const emptySelectionClipboard = editor.getOption(38 /* EditorOption.emptySelectionClipboard */);
        if (!emptySelectionClipboard && editor.getSelection().isEmpty()) {
            return;
        }
        CopyOptions.forceCopyWithSyntaxHighlighting = true;
        editor.focus();
        editor.getContainerDomNode().ownerDocument.execCommand('copy');
        CopyOptions.forceCopyWithSyntaxHighlighting = false;
    }
}
function registerExecCommandImpl(target, browserCommand) {
    if (!target) {
        return;
    }
    // 1. handle case when focus is in editor.
    target.addImplementation(10000, 'code-editor', (accessor, args) => {
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasTextFocus()) {
            // Do not execute if there is no selection and empty selection clipboard is off
            const emptySelectionClipboard = focusedEditor.getOption(38 /* EditorOption.emptySelectionClipboard */);
            const selection = focusedEditor.getSelection();
            if (selection && selection.isEmpty() && !emptySelectionClipboard) {
                return true;
            }
            // TODO this is very ugly. The entire copy/paste/cut system needs a complete refactoring.
            if (focusedEditor.getOption(156 /* EditorOption.effectiveExperimentalEditContextEnabled */) &&
                browserCommand === 'cut') {
                // execCommand(copy) works for edit context, but not execCommand(cut).
                focusedEditor.getContainerDomNode().ownerDocument.execCommand('copy');
                focusedEditor.trigger(undefined, "cut" /* Handler.Cut */, undefined);
            }
            else {
                focusedEditor.getContainerDomNode().ownerDocument.execCommand(browserCommand);
            }
            return true;
        }
        return false;
    });
    // 2. (default) handle case when focus is somewhere else.
    target.addImplementation(0, 'generic-dom', (accessor, args) => {
        getActiveDocument().execCommand(browserCommand);
        return true;
    });
}
registerExecCommandImpl(CutAction, 'cut');
registerExecCommandImpl(CopyAction, 'copy');
if (PasteAction) {
    // 1. Paste: handle case when focus is in editor.
    PasteAction.addImplementation(10000, 'code-editor', (accessor, args) => {
        const codeEditorService = accessor.get(ICodeEditorService);
        const clipboardService = accessor.get(IClipboardService);
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = codeEditorService.getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasModel() && focusedEditor.hasTextFocus()) {
            // execCommand(paste) does not work with edit context
            let result;
            const experimentalEditContextEnabled = focusedEditor.getOption(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
            if (experimentalEditContextEnabled) {
                const nativeEditContext = NativeEditContextRegistry.get(focusedEditor.getId());
                if (nativeEditContext) {
                    result = nativeEditContext.executePaste();
                }
                else {
                    result = false;
                }
            }
            else {
                result = focusedEditor.getContainerDomNode().ownerDocument.execCommand('paste');
            }
            if (result) {
                return CopyPasteController.get(focusedEditor)?.finishedPaste() ?? Promise.resolve();
            }
            else if (platform.isWeb) {
                // Use the clipboard service if document.execCommand('paste') was not successful
                return (async () => {
                    const clipboardText = await clipboardService.readText();
                    if (clipboardText !== '') {
                        const metadata = InMemoryClipboardMetadataManager.INSTANCE.get(clipboardText);
                        let pasteOnNewLine = false;
                        let multicursorText = null;
                        let mode = null;
                        if (metadata) {
                            pasteOnNewLine =
                                focusedEditor.getOption(38 /* EditorOption.emptySelectionClipboard */) &&
                                    !!metadata.isFromEmptySelection;
                            multicursorText =
                                typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null;
                            mode = metadata.mode;
                        }
                        focusedEditor.trigger('keyboard', "paste" /* Handler.Paste */, {
                            text: clipboardText,
                            pasteOnNewLine,
                            multicursorText,
                            mode,
                        });
                    }
                })();
            }
            return true;
        }
        return false;
    });
    // 2. Paste: (default) handle case when focus is somewhere else.
    PasteAction.addImplementation(0, 'generic-dom', (accessor, args) => {
        getActiveDocument().execCommand('paste');
        return true;
    });
}
if (supportsCopy) {
    registerEditorAction(ExecCommandCopyWithSyntaxHighlightingAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY2xpcGJvYXJkL2Jyb3dzZXIvY2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbkUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3JGLE9BQU8sRUFDTixXQUFXLEVBQ1gsZ0NBQWdDLEdBQ2hDLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFFdkgsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEVBQ1osb0JBQW9CLEdBQ3BCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFMUYsTUFBTSw0QkFBNEIsR0FBRyxnQkFBZ0IsQ0FBQTtBQUVyRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFL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