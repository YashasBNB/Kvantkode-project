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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY2hhdC9jZWxsQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sMkNBQTJDLENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNySCxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBR3BHLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsa0NBQWtDLEVBQ2xDLGlDQUFpQyxFQUNqQyxtQ0FBbUMsRUFDbkMsNkJBQTZCLEVBQzdCLHVCQUF1QixFQUV2Qiw4QkFBOEIsR0FDOUIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLG9DQUFvQyxFQUNwQywyQkFBMkIsRUFDM0Isc0NBQXNDLEVBQ3RDLCtCQUErQixF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