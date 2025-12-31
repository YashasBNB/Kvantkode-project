/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { InlineChatController, InlineChatController1, InlineChatController2, InlineChatRunOptions, } from './inlineChatController.js';
import { ACTION_ACCEPT_CHANGES, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_STASHED_SESSION, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_WIDGET_STATUS, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, ACTION_REGENERATE_RESPONSE, ACTION_VIEW_IN_CHAT, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, ACTION_DISCARD_CHANGES, CTX_INLINE_CHAT_POSSIBLE, ACTION_START, CTX_INLINE_CHAT_HAS_AGENT2, MENU_INLINE_CHAT_SIDE, } from '../common/inlineChat.js';
import { ctxIsGlobalEditingSession, ctxRequestCount, } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
CommandsRegistry.registerCommandAlias('interactiveEditor.start', 'inlineChat.start');
CommandsRegistry.registerCommandAlias('interactive.acceptChanges', ACTION_ACCEPT_CHANGES);
export const START_INLINE_CHAT = registerIcon('start-inline-chat', Codicon.sparkle, localize('startInlineChat', 'Icon which spawns the inline chat from the editor toolbar.'));
let _holdForSpeech = undefined;
export function setHoldForSpeech(holdForSpeech) {
    _holdForSpeech = holdForSpeech;
}
export class StartSessionAction extends Action2 {
    constructor() {
        super({
            id: ACTION_START,
            title: localize2('run', 'Editor Inline Chat'),
            category: AbstractInline1ChatAction.category,
            f1: true,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_AGENT2), CTX_INLINE_CHAT_POSSIBLE, EditorContextKeys.writable, EditorContextKeys.editorSimpleInput.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
            icon: START_INLINE_CHAT,
            menu: {
                id: MenuId.ChatTitleBarMenu,
                group: 'a_open',
                order: 3,
            },
        });
    }
    run(accessor, ...args) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor();
        if (!editor || editor.isSimpleWidget) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this._runEditorCommand(editorAccessor, editor, ...args);
        });
    }
    _runEditorCommand(accessor, editor, ..._args) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl) {
            return;
        }
        if (_holdForSpeech) {
            accessor.get(IInstantiationService).invokeFunction(_holdForSpeech, ctrl, this);
        }
        let options;
        const arg = _args[0];
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            options = arg;
        }
        InlineChatController.get(editor)?.run({ ...options });
    }
}
export class FocusInlineChat extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.focus',
            title: localize2('focus', 'Focus Input'),
            f1: true,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: [
                {
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('above'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                },
                {
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('below'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                },
            ],
        });
    }
    runEditorCommand(_accessor, editor, ..._args) {
        InlineChatController.get(editor)?.focus();
    }
}
//#region --- VERSION 1
export class UnstashSessionAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.unstash',
            title: localize2('unstash', 'Resume Last Dismissed Inline Chat'),
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_STASHED_SESSION, EditorContextKeys.writable),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
            },
        });
    }
    async runEditorCommand(_accessor, editor, ..._args) {
        const ctrl = InlineChatController1.get(editor);
        if (ctrl) {
            const session = ctrl.unstashLastSession();
            if (session) {
                ctrl.run({
                    existingSession: session,
                });
            }
        }
    }
}
export class AbstractInline1ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', 'Inline Chat'); }
    constructor(desc) {
        super({
            ...desc,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT, desc.precondition),
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController1.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController1.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor ||
                    diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class ArrowOutUpAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            },
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(true);
    }
}
export class ArrowOutDownAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(false);
    }
}
export class AcceptChanges extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_ACCEPT_CHANGES,
            title: localize2('apply1', 'Accept Changes'),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE),
            keybinding: [
                {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                },
            ],
            menu: [
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)),
                },
                {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 1,
                },
            ],
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        ctrl.acceptHunk(hunk);
    }
}
export class DiscardHunkAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_DISCARD_CHANGES,
            title: localize('discard', 'Discard'),
            icon: Codicon.chromeClose,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [
                {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 2,
                },
            ],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */),
            },
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        return ctrl.discardHunk(hunk);
    }
}
export class RerunAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_REGENERATE_RESPONSE,
            title: localize2('chat.rerun.label', 'Rerun Request'),
            shortTitle: localize('rerun', 'Rerun'),
            f1: false,
            icon: Codicon.refresh,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 5,
                when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate(), CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("none" /* InlineChatResponseType.None */)),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
            },
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        const chatService = accessor.get(IChatService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const model = ctrl.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionId(model.sessionId);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ctrl.chatWidget.location,
                userSelectedModelId: widget?.input.currentLanguageModel,
            });
        }
    }
}
export class CloseAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.close',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate()),
                },
            ],
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.cancelSession();
    }
}
export class ConfigureInlineChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.configure',
            title: localize2('configure', 'Configure Inline Chat'),
            icon: Codicon.settingsGear,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: 'zzz',
                order: 5,
            },
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        accessor.get(IPreferencesService).openSettings({ query: 'inlineChat' });
    }
}
export class MoveToNextHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToNextHunk',
            title: localize2('moveToNextHunk', 'Move to Next Change'),
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */,
            },
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(true);
    }
}
export class MoveToPreviousHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToPreviousHunk',
            title: localize2('moveToPreviousHunk', 'Move to Previous Change'),
            f1: true,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
            },
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(false);
    }
}
export class ViewInChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_VIEW_IN_CHAT,
            title: localize('viewInChat', 'View in Chat'),
            icon: Codicon.commentDiscussion,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'more',
                    order: 1,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */),
                },
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messages" /* InlineChatResponseType.Messages */), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate()),
                },
            ],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                when: ChatContextKeys.inChatInput,
            },
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        return ctrl.viewInChat();
    }
}
export class ToggleDiffForChange extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_TOGGLE_DIFF,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_CHANGE_HAS_DIFF),
            title: localize2('showChanges', 'Toggle Changes'),
            icon: Codicon.diffSingle,
            toggled: {
                condition: CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF,
            },
            menu: [
                {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'zzz',
                    order: 1,
                },
                {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_CHANGE_HAS_DIFF,
                    order: 2,
                },
            ],
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, hunkInfo) {
        ctrl.toggleDiff(hunkInfo);
    }
}
//#endregion
//#region --- VERSION 2
class AbstractInline2ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', 'Inline Chat'); }
    constructor(desc) {
        super({
            ...desc,
            category: AbstractInline2ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, desc.precondition),
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController2.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController2.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor ||
                    diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class StopSessionAction2 extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.stop',
            title: localize2('stop', 'Undo & Close'),
            f1: true,
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: [
                {
                    when: ctxRequestCount.isEqualTo(0),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                },
                {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 9 /* KeyCode.Escape */,
                },
            ],
            menu: {
                id: MENU_INLINE_CHAT_SIDE,
                group: 'navigation',
                when: CTX_INLINE_CHAT_HAS_AGENT2,
            },
        });
    }
    runInlineChatCommand(accessor, _ctrl, editor, ...args) {
        const inlineChatSessions = accessor.get(IInlineChatSessionService);
        if (!editor.hasModel()) {
            return;
        }
        const textModel = editor.getModel();
        inlineChatSessions.getSession2(textModel.uri)?.dispose();
    }
}
export class RevealWidget extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.reveal',
            title: localize2('reveal', 'Toggle Inline Chat'),
            f1: true,
            icon: Codicon.copilot,
            precondition: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1)),
            toggled: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1), ctxIsGlobalEditingSession.negate()),
                group: 'navigate',
                order: 4,
            },
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor) {
        ctrl.toggleWidgetUntilNextRequest();
        ctrl.markActiveController();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixvQkFBb0IsR0FDcEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHlCQUF5QixFQUN6QixtQ0FBbUMsRUFDbkMsdUJBQXVCLEVBQ3ZCLGtDQUFrQyxFQUNsQyxpQ0FBaUMsRUFDakMsdUJBQXVCLEVBQ3ZCLHFDQUFxQyxFQUNyQyw4QkFBOEIsRUFDOUIsbUNBQW1DLEVBQ25DLDZCQUE2QixFQUU3QiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQiwrQkFBK0IsRUFDL0IsaUNBQWlDLEVBQ2pDLHFCQUFxQixFQUNyQixzQkFBc0IsRUFDdEIsd0JBQXdCLEVBQ3hCLFlBQVksRUFDWiwwQkFBMEIsRUFDMUIscUJBQXFCLEdBQ3JCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FB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