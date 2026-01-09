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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jbGlwYm9hcmQvYnJvd3Nlci9jbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVuRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUNOLFdBQVcsRUFDWCxnQ0FBZ0MsR0FDaEMsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUV2SCxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksRUFDWixvQkFBb0IsR0FDcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUduRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUUxRixNQUFNLDRCQUE0QixHQUFHLGdCQUFnQixDQUFBO0FBRXJELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzlFLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2hGLDhFQUE4RTtBQUM5RSxnR0FBZ0c7QUFDaEcsMkhBQTJIO0FBQzNILE1BQU0sYUFBYSxHQUNsQixPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssV0FBVyxJQUFJLE9BQU8sQ0FBQyxTQUFTO0lBQzlELENBQUMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxJQUFJLENBQUE7QUFFUixTQUFTLGVBQWUsQ0FBb0IsT0FBVTtJQUNyRCxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDbEIsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLFdBQVc7SUFDbkMsQ0FBQyxDQUFDLGVBQWUsQ0FDZixJQUFJLFlBQVksQ0FBQztRQUNoQixFQUFFLEVBQUUsa0NBQWtDO1FBQ3RDLFlBQVksRUFBRSxTQUFTO1FBQ3ZCLE1BQU07UUFDTCw4Q0FBOEM7UUFDOUMsK0RBQStEO1FBQy9ELFFBQVEsQ0FBQyxRQUFRO1lBQ2hCLENBQUMsQ0FBQztnQkFDQSxPQUFPLEVBQUUsaURBQTZCO2dCQUN0QyxHQUFHLEVBQUU7b0JBQ0osT0FBTyxFQUFFLGlEQUE2QjtvQkFDdEMsU0FBUyxFQUFFLENBQUMsaURBQTZCLENBQUM7aUJBQzFDO2dCQUNELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0YsQ0FBQyxDQUFDLFNBQVM7UUFDYixRQUFRLEVBQUU7WUFDVDtnQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzlCLEtBQUssRUFBRSxPQUFPO2dCQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDO2dCQUNsRixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxhQUFhO2dCQUM1QixLQUFLLEVBQUUsNEJBQTRCO2dCQUNuQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUM7Z0JBQ3hELElBQUksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO2dCQUNoQyxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUM3QixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUM7Z0JBQ3hELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRDtnQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDbEMsS0FBSyxFQUFFLDRCQUE0QjtnQkFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDO2dCQUN4RCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtnQkFDaEMsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO0tBQ0QsQ0FBQyxDQUNGO0lBQ0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUVaLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxZQUFZO0lBQ3JDLENBQUMsQ0FBQyxlQUFlLENBQ2YsSUFBSSxZQUFZLENBQUM7UUFDaEIsRUFBRSxFQUFFLG1DQUFtQztRQUN2QyxZQUFZLEVBQUUsU0FBUztRQUN2QixNQUFNO1FBQ0wsK0NBQStDO1FBQy9DLCtEQUErRDtRQUMvRCxRQUFRLENBQUMsUUFBUTtZQUNoQixDQUFDLENBQUM7Z0JBQ0EsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxpREFBNkI7b0JBQ3RDLFNBQVMsRUFBRSxDQUFDLG1EQUErQixDQUFDO2lCQUM1QztnQkFDRCxNQUFNLDBDQUFnQzthQUN0QztZQUNGLENBQUMsQ0FBQyxTQUFTO1FBQ2IsUUFBUSxFQUFFO1lBQ1Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxlQUFlO2dCQUM5QixLQUFLLEVBQUUsT0FBTztnQkFDZCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQztnQkFDcEYsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxNQUFNLENBQUMsYUFBYTtnQkFDNUIsS0FBSyxFQUFFLDRCQUE0QjtnQkFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDO2dCQUMxRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUM3QixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLENBQUM7Z0JBQzFELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRDtnQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDbEMsS0FBSyxFQUFFLDRCQUE0QjtnQkFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDO2dCQUMxRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0Q7S0FDRCxDQUFDLENBQ0Y7SUFDRixDQUFDLENBQUMsU0FBUyxDQUFBO0FBRVosWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsV0FBVztJQUMzQixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO0lBQzFDLEtBQUssRUFBRSxPQUFPO0lBQ2QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7SUFDakQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7SUFDakMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztJQUMxQyxLQUFLLEVBQUUsNEJBQTRCO0lBQ25DLEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO0lBQ2pELE9BQU8sRUFBRSxNQUFNLENBQUMsa0JBQWtCO0lBQ2xDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDdEMsS0FBSyxFQUFFLFVBQVU7SUFDakIsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNULElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxFQUNwRCxpQkFBaUIsQ0FBQyxlQUFlLENBQ2pDO0NBQ0QsQ0FBQyxDQUFBO0FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDdEMsS0FBSyxFQUFFLFVBQVU7SUFDakIsS0FBSyxFQUFFLENBQUMsQ0FBQztDQUNULENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxhQUFhO0lBQ3ZDLENBQUMsQ0FBQyxlQUFlLENBQ2YsSUFBSSxZQUFZLENBQUM7UUFDaEIsRUFBRSxFQUFFLG9DQUFvQztRQUN4QyxZQUFZLEVBQUUsU0FBUztRQUN2QixNQUFNO1FBQ0wsZ0RBQWdEO1FBQ2hELCtEQUErRDtRQUMvRCxRQUFRLENBQUMsUUFBUTtZQUNoQixDQUFDLENBQUM7Z0JBQ0EsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxpREFBNkI7b0JBQ3RDLFNBQVMsRUFBRSxDQUFDLGlEQUE2QixDQUFDO2lCQUMxQztnQkFDRCxLQUFLLEVBQUU7b0JBQ04sT0FBTyxFQUFFLGlEQUE2QjtvQkFDdEMsU0FBUyxFQUFFLENBQUMsaURBQTZCLENBQUM7aUJBQzFDO2dCQUNELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0YsQ0FBQyxDQUFDLFNBQVM7UUFDYixRQUFRLEVBQUU7WUFDVDtnQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzlCLEtBQUssRUFBRSxPQUFPO2dCQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDO2dCQUN0RixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxhQUFhO2dCQUM1QixLQUFLLEVBQUUsNEJBQTRCO2dCQUNuQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxPQUFPLENBQUM7Z0JBQzVELElBQUksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO2dCQUNoQyxLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUM3QixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxPQUFPLENBQUM7Z0JBQzVELEtBQUssRUFBRSxDQUFDO2FBQ1I7WUFDRDtnQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDbEMsS0FBSyxFQUFFLDRCQUE0QjtnQkFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsT0FBTyxDQUFDO2dCQUM1RCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtnQkFDaEMsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNEO0tBQ0QsQ0FBQyxDQUNGO0lBQ0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUVaLE1BQU0sMkNBQTRDLFNBQVEsWUFBWTtJQUNyRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5REFBeUQ7WUFDN0QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ25CLG1EQUFtRCxFQUNuRCwrQkFBK0IsQ0FDL0I7WUFDRCxZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGNBQWM7Z0JBQ3hDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxDQUFDLFNBQVMsK0NBQXNDLENBQUE7UUFFdEYsSUFBSSxDQUFDLHVCQUF1QixJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2pFLE9BQU07UUFDUCxDQUFDO1FBRUQsV0FBVyxDQUFDLCtCQUErQixHQUFHLElBQUksQ0FBQTtRQUNsRCxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDZCxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzlELFdBQVcsQ0FBQywrQkFBK0IsR0FBRyxLQUFLLENBQUE7SUFDcEQsQ0FBQztDQUNEO0FBRUQsU0FBUyx1QkFBdUIsQ0FDL0IsTUFBZ0MsRUFDaEMsY0FBOEI7SUFFOUIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTTtJQUNQLENBQUM7SUFFRCwwQ0FBMEM7SUFDMUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsQ0FBQyxRQUEwQixFQUFFLElBQVMsRUFBRSxFQUFFO1FBQ3hGLG1FQUFtRTtRQUNuRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUM3RSxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNuRCwrRUFBK0U7WUFDL0UsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUMsU0FBUywrQ0FBc0MsQ0FBQTtZQUM3RixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDOUMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbEUsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QseUZBQXlGO1lBQ3pGLElBQ0MsYUFBYSxDQUFDLFNBQVMsZ0VBQXNEO2dCQUM3RSxjQUFjLEtBQUssS0FBSyxFQUN2QixDQUFDO2dCQUNGLHNFQUFzRTtnQkFDdEUsYUFBYSxDQUFDLG1CQUFtQixFQUFFLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDckUsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLDJCQUFlLFNBQVMsQ0FBQyxDQUFBO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzlFLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUMsQ0FBQyxDQUFBO0lBRUYseURBQXlEO0lBQ3pELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsUUFBMEIsRUFBRSxJQUFTLEVBQUUsRUFBRTtRQUNwRixpQkFBaUIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELHVCQUF1QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN6Qyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFFM0MsSUFBSSxXQUFXLEVBQUUsQ0FBQztJQUNqQixpREFBaUQ7SUFDakQsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsQ0FBQyxRQUEwQixFQUFFLElBQVMsRUFBRSxFQUFFO1FBQzdGLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXhELG1FQUFtRTtRQUNuRSxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzlELElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUMvRSxxREFBcUQ7WUFDckQsSUFBSSxNQUFlLENBQUE7WUFDbkIsTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQUMsU0FBUyxnRUFFN0QsQ0FBQTtZQUNELElBQUksOEJBQThCLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxpQkFBaUIsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQzlFLElBQUksaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxHQUFHLGlCQUFpQixDQUFDLFlBQVksRUFBRSxDQUFBO2dCQUMxQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLEtBQUssQ0FBQTtnQkFDZixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBRyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2hGLENBQUM7WUFDRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU8sbUJBQW1CLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNwRixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUMzQixnRkFBZ0Y7Z0JBQ2hGLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEIsTUFBTSxhQUFhLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtvQkFDdkQsSUFBSSxhQUFhLEtBQUssRUFBRSxFQUFFLENBQUM7d0JBQzFCLE1BQU0sUUFBUSxHQUFHLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7d0JBQzdFLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQTt3QkFDMUIsSUFBSSxlQUFlLEdBQW9CLElBQUksQ0FBQTt3QkFDM0MsSUFBSSxJQUFJLEdBQWtCLElBQUksQ0FBQTt3QkFDOUIsSUFBSSxRQUFRLEVBQUUsQ0FBQzs0QkFDZCxjQUFjO2dDQUNiLGFBQWEsQ0FBQyxTQUFTLCtDQUFzQztvQ0FDN0QsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQTs0QkFDaEMsZUFBZTtnQ0FDZCxPQUFPLFFBQVEsQ0FBQyxlQUFlLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7NEJBQ2xGLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO3dCQUNyQixDQUFDO3dCQUNELGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBVSwrQkFBaUI7NEJBQ2hELElBQUksRUFBRSxhQUFhOzRCQUNuQixjQUFjOzRCQUNkLGVBQWU7NEJBQ2YsSUFBSTt5QkFDSixDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDLENBQUMsRUFBRSxDQUFBO1lBQ0wsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFRixnRUFBZ0U7SUFDaEUsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxRQUEwQixFQUFFLElBQVMsRUFBRSxFQUFFO1FBQ3pGLGlCQUFpQixFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUNsQixvQkFBb0IsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO0FBQ2xFLENBQUMifQ==