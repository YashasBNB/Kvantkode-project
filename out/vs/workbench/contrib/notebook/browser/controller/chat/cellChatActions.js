/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { KeyChord } from '../../../../../../base/common/keyCodes.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../../platform/accessibility/common/accessibility.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, CTX_INLINE_CHAT_VISIBLE, MENU_INLINE_CHAT_WIDGET_STATUS, } from '../../../../inlineChat/common/inlineChat.js';
import { CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST, CTX_NOTEBOOK_CHAT_HAS_AGENT, CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, MENU_CELL_CHAT_INPUT, MENU_CELL_CHAT_WIDGET, MENU_CELL_CHAT_WIDGET_STATUS, } from './notebookChatContext.js';
import { NotebookChatController } from './notebookChatController.js';
import { CELL_TITLE_CELL_GROUP_ID, NotebookAction, NotebookCellAction, getContextFromActiveEditor, getEditorFromArgsOrActivePane, } from '../coreActions.js';
import { insertNewCell } from '../insertCellActions.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellKind, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, NotebookSetting, } from '../../../common/notebookCommon.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_GENERATED_BY_CHAT, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, } from '../../../common/notebookContextKeys.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../../../chat/common/chatContextKeys.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { EditorAction2 } from '../../../../../../editor/browser/editorExtensions.js';
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.accept',
            title: localize2('notebook.cell.chat.accept', 'Make Request'),
            icon: Codicon.send,
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 3 /* KeyCode.Enter */,
            },
            menu: {
                id: MENU_CELL_CHAT_INPUT,
                group: 'navigation',
                order: 1,
                when: CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST.negate(),
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.acceptInput();
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx < 1 || editor.getLength() === 0) {
            // we don't do loop
            return;
        }
        const newCell = editor.cellAt(idx - 1);
        const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview
            ? 'container'
            : 'editor';
        const focusEditorLine = newCell.textBuffer.getLineCount();
        await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: focusEditorLine });
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        await NotebookChatController.get(context.notebookEditor)?.focusNext();
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.focusChatWidget',
            title: localize('focusChatWidget', 'Focus Chat Widget'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('bottom'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        const index = context.notebookEditor.getCellIndex(context.cell);
        await NotebookChatController.get(context.notebookEditor)?.focusNearestWidget(index, 'above');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.focusNextChatWidget',
            title: localize('focusNextChatWidget', 'Focus Next Cell Chat Widget'),
            keybinding: {
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('top'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
            f1: false,
            precondition: ContextKeyExpr.or(ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK.negate(), NOTEBOOK_CELL_EDITOR_FOCUSED), ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_EDITOR_FOCUSED.negate())),
        });
    }
    async runWithContext(accessor, context) {
        const index = context.notebookEditor.getCellIndex(context.cell);
        await NotebookChatController.get(context.notebookEditor)?.focusNearestWidget(index, 'below');
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.stop',
            title: localize2('notebook.cell.chat.stop', 'Stop Request'),
            icon: Codicon.debugStop,
            menu: {
                id: MENU_CELL_CHAT_INPUT,
                group: 'navigation',
                order: 1,
                when: CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.cancelCurrentRequest(false);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.close',
            title: localize2('notebook.cell.chat.close', 'Close Chat'),
            icon: Codicon.close,
            menu: {
                id: MENU_CELL_CHAT_WIDGET,
                group: 'navigation',
                order: 2,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.dismiss(false);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.acceptChanges',
            title: localize2('apply1', 'Accept Changes'),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            tooltip: localize('apply3', 'Accept Changes'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                },
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                    primary: 9 /* KeyCode.Escape */,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('below')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            menu: [
                {
                    id: MENU_CELL_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 0,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */),
                },
            ],
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.acceptSession();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.discard',
            title: localize('discard', 'Discard'),
            icon: Codicon.discard,
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_USER_DID_EDIT.negate(), NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: {
                id: MENU_CELL_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 1,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.discard();
    }
});
async function startChat(accessor, context, index, input, autoSend, source) {
    const configurationService = accessor.get(IConfigurationService);
    const commandService = accessor.get(ICommandService);
    if (configurationService.getValue(NotebookSetting.cellGenerate) ||
        configurationService.getValue(NotebookSetting.cellChat)) {
        const activeCell = context.notebookEditor.getActiveCell();
        const targetCell = activeCell?.getTextLength() === 0 && source !== 'insertToolbar'
            ? activeCell
            : await insertNewCell(accessor, context, CellKind.Code, 'below', true);
        if (targetCell) {
            targetCell.enableAutoLanguageDetection();
            await context.notebookEditor.revealFirstLineIfOutsideViewport(targetCell);
            const codeEditor = context.notebookEditor.codeEditors.find((ce) => ce[0] === targetCell)?.[1];
            if (codeEditor) {
                codeEditor.focus();
                commandService.executeCommand('inlineChat.start');
            }
        }
    }
}
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.start',
            title: {
                value: '$(sparkle) ' + localize('notebookActions.menu.insertCodeCellWithChat', 'Generate'),
                original: '$(sparkle) Generate',
            },
            tooltip: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', 'Start Chat to Generate Code'),
            metadata: {
                description: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', 'Start Chat to Generate Code'),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            required: ['index'],
                            properties: {
                                index: {
                                    type: 'number',
                                },
                                input: {
                                    type: 'string',
                                },
                                autoSend: {
                                    type: 'boolean',
                                },
                            },
                        },
                    },
                ],
            },
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true))),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                secondary: [KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 39 /* KeyCode.KeyI */)],
            },
            menu: [
                {
                    id: MenuId.NotebookCellBetween,
                    group: 'inline',
                    order: -1,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true))),
                },
            ],
        });
    }
    getEditorContextFromArgsOrActive(accessor, ...args) {
        const [firstArg] = args;
        if (!firstArg) {
            const notebookEditor = getEditorFromArgsOrActivePane(accessor);
            if (!notebookEditor) {
                return undefined;
            }
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return undefined;
            }
            return {
                cell: activeCell,
                notebookEditor,
                input: undefined,
                autoSend: undefined,
            };
        }
        if (typeof firstArg !== 'object' || typeof firstArg.index !== 'number') {
            return undefined;
        }
        const notebookEditor = getEditorFromArgsOrActivePane(accessor);
        if (!notebookEditor) {
            return undefined;
        }
        const cell = firstArg.index <= 0 ? undefined : notebookEditor.cellAt(firstArg.index - 1);
        return {
            cell,
            notebookEditor,
            input: firstArg.input,
            autoSend: firstArg.autoSend,
        };
    }
    async runWithContext(accessor, context) {
        const index = Math.max(0, context.cell ? context.notebookEditor.getCellIndex(context.cell) + 1 : 0);
        await startChat(accessor, context, index, context.input, context.autoSend, context.source);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.startAtTop',
            title: {
                value: '$(sparkle) ' + localize('notebookActions.menu.insertCodeCellWithChat', 'Generate'),
                original: '$(sparkle) Generate',
            },
            tooltip: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', 'Start Chat to Generate Code'),
            f1: false,
            menu: [
                {
                    id: MenuId.NotebookCellListTop,
                    group: 'inline',
                    order: -1,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true))),
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        await startChat(accessor, context, 0, '', false);
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: 'notebook.cell.chat.start',
        icon: Codicon.sparkle,
        title: localize('notebookActions.menu.insertCode.ontoolbar', 'Generate'),
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Start Chat to Generate Code'),
    },
    order: -10,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden'), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true))),
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focus',
            title: localize('focusNotebookChat', 'Focus Chat'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('above')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('below')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focus();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focusNextCell',
            title: localize('focusNextCell', 'Focus Next Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focusNext();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focusPreviousCell',
            title: localize('focusPreviousCell', 'Focus Previous Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focusAbove();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.previousFromHistory',
            title: localize2('notebook.cell.chat.previousFromHistory', 'Previous From History'),
            precondition: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                primary: 16 /* KeyCode.UpArrow */,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.populateHistory(true);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.nextFromHistory',
            title: localize2('notebook.cell.chat.nextFromHistory', 'Next From History'),
            precondition: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                primary: 18 /* KeyCode.DownArrow */,
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.populateHistory(false);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.restore',
            title: localize2('notebookActions.restoreCellprompt', 'Generate'),
            icon: Codicon.sparkle,
            menu: {
                id: MenuId.NotebookCellTitle,
                group: CELL_TITLE_CELL_GROUP_ID,
                order: 0,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, NOTEBOOK_CELL_GENERATED_BY_CHAT, ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true)),
            },
            f1: false,
        });
    }
    async runWithContext(accessor, context) {
        const cell = context.cell;
        if (!cell) {
            return;
        }
        const notebookEditor = context.notebookEditor;
        const controller = NotebookChatController.get(notebookEditor);
        if (!controller) {
            return;
        }
        const prompt = controller.getPromptFromCache(cell);
        if (prompt) {
            controller.restore(cell, prompt);
        }
    }
});
export class AcceptChangesAndRun extends EditorAction2 {
    constructor() {
        super({
            id: 'notebook.inlineChat.acceptChangesAndRun',
            title: localize2('notebook.apply1', 'Accept and Run'),
            shortTitle: localize('notebook.apply2', 'Accept & Run'),
            tooltip: localize('notebook.apply3', 'Accept the changes and run the cell'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_INLINE_CHAT_VISIBLE),
            keybinding: undefined,
            menu: [
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 2,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)),
                },
            ],
        });
    }
    runEditorCommand(accessor, codeEditor) {
        const editor = getContextFromActiveEditor(accessor.get(IEditorService));
        const ctrl = InlineChatController.get(codeEditor);
        if (!editor || !ctrl) {
            return;
        }
        const matchedCell = editor.notebookEditor.codeEditors.find((e) => e[1] === codeEditor);
        const cell = matchedCell?.[0];
        if (!cell) {
            return;
        }
        ctrl.acceptSession();
        return editor.notebookEditor.executeNotebookCells(Iterable.single(cell));
    }
}
registerAction2(AcceptChangesAndRun);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NoYXQvY2VsbENoYXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLDJDQUEyQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckgsT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUdwRyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLGtDQUFrQyxFQUNsQyxpQ0FBaUMsRUFDakMsbUNBQW1DLEVBQ25DLDZCQUE2QixFQUM3Qix1QkFBdUIsRUFFdkIsOEJBQThCLEdBQzlCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixvQ0FBb0MsRUFDcEMsMkJBQTJCLEVBQzNCLHNDQUFzQyxFQUN0QywrQkFBK0IsRUFDL0Is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