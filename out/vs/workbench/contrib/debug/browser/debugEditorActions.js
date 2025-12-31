/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { EditorAction, registerEditorAction, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import * as nls from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { PanelFocusContext } from '../../../common/contextkeys.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { openBreakpointSource } from './breakpointsView.js';
import { DisassemblyView } from './disassemblyView.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_DEBUG_STATE, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_EXCEPTION_WIDGET_VISIBLE, CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE, CONTEXT_IN_DEBUG_MODE, CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, EDITOR_CONTRIBUTION_ID, IDebugService, REPL_VIEW_ID, WATCH_VIEW_ID, } from '../common/debug.js';
import { getEvaluatableExpressionAtPosition } from '../common/debugUtils.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
class ToggleBreakpointAction extends Action2 {
    constructor() {
        super({
            id: 'editor.debug.action.toggleBreakpoint',
            title: {
                ...nls.localize2('toggleBreakpointAction', 'Debug: Toggle Breakpoint'),
                mnemonicTitle: nls.localize({ key: 'miToggleBreakpoint', comment: ['&& denotes a mnemonic'] }, 'Toggle &&Breakpoint'),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            keybinding: {
                when: ContextKeyExpr.or(EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLY_VIEW_FOCUS),
                primary: 67 /* KeyCode.F9 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: {
                id: MenuId.MenubarDebugMenu,
                when: CONTEXT_DEBUGGERS_AVAILABLE,
                group: '4_new_breakpoint',
                order: 1,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const debugService = accessor.get(IDebugService);
        const activePane = editorService.activeEditorPane;
        if (activePane instanceof DisassemblyView) {
            const location = activePane.focusedAddressAndOffset;
            if (location) {
                const bps = debugService.getModel().getInstructionBreakpoints();
                const toRemove = bps.find((bp) => bp.address === location.address);
                if (toRemove) {
                    debugService.removeInstructionBreakpoints(toRemove.instructionReference, toRemove.offset);
                }
                else {
                    debugService.addInstructionBreakpoint({
                        instructionReference: location.reference,
                        offset: location.offset,
                        address: location.address,
                        canPersist: false,
                    });
                }
            }
            return;
        }
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (editor?.hasModel()) {
            const modelUri = editor.getModel().uri;
            const canSet = debugService.canSetBreakpointsIn(editor.getModel());
            // Does not account for multi line selections, Set to remove multiple cursor on the same line
            const lineNumbers = [
                ...new Set(editor.getSelections().map((s) => s.getPosition().lineNumber)),
            ];
            await Promise.all(lineNumbers.map(async (line) => {
                const bps = debugService.getModel().getBreakpoints({ lineNumber: line, uri: modelUri });
                if (bps.length) {
                    await Promise.all(bps.map((bp) => debugService.removeBreakpoints(bp.getId())));
                }
                else if (canSet) {
                    await debugService.addBreakpoints(modelUri, [{ lineNumber: line }]);
                }
            }));
        }
    }
}
class ConditionalBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.conditionalBreakpoint',
            label: nls.localize2('conditionalBreakpointEditorAction', 'Debug: Add Conditional Breakpoint...'),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: {
                menuId: MenuId.MenubarNewBreakpointMenu,
                title: nls.localize({ key: 'miConditionalBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&Conditional Breakpoint...'),
                group: '1_breakpoints',
                order: 1,
                when: CONTEXT_DEBUGGERS_AVAILABLE,
            },
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor
                .getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)
                ?.showBreakpointWidget(position.lineNumber, undefined, 0 /* BreakpointWidgetContext.CONDITION */);
        }
    }
}
class LogPointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.addLogPoint',
            label: nls.localize2('logPointEditorAction', 'Debug: Add Logpoint...'),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: [
                {
                    menuId: MenuId.MenubarNewBreakpointMenu,
                    title: nls.localize({ key: 'miLogPoint', comment: ['&& denotes a mnemonic'] }, '&&Logpoint...'),
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor
                .getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)
                ?.showBreakpointWidget(position.lineNumber, position.column, 2 /* BreakpointWidgetContext.LOG_MESSAGE */);
        }
    }
}
class TriggerByBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.triggerByBreakpoint',
            label: nls.localize('triggerByBreakpointEditorAction', 'Debug: Add Triggered Breakpoint...'),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            alias: 'Debug: Triggered Breakpoint...',
            menuOpts: [
                {
                    menuId: MenuId.MenubarNewBreakpointMenu,
                    title: nls.localize({ key: 'miTriggerByBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&Triggered Breakpoint...'),
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor
                .getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)
                ?.showBreakpointWidget(position.lineNumber, position.column, 3 /* BreakpointWidgetContext.TRIGGER_POINT */);
        }
    }
}
class EditBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.editBreakpoint',
            label: nls.localize('EditBreakpointEditorAction', 'Debug: Edit Breakpoint'),
            alias: 'Debug: Edit Existing Breakpoint',
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: {
                menuId: MenuId.MenubarNewBreakpointMenu,
                title: nls.localize({ key: 'miEditBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&Edit Breakpoint'),
                group: '1_breakpoints',
                order: 1,
                when: CONTEXT_DEBUGGERS_AVAILABLE,
            },
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        const debugModel = debugService.getModel();
        if (!(editor.hasModel() && position)) {
            return;
        }
        const lineBreakpoints = debugModel.getBreakpoints({ lineNumber: position.lineNumber });
        if (lineBreakpoints.length === 0) {
            return;
        }
        const breakpointDistances = lineBreakpoints.map((b) => {
            if (!b.column) {
                return position.column;
            }
            return Math.abs(b.column - position.column);
        });
        const closestBreakpointIndex = breakpointDistances.indexOf(Math.min(...breakpointDistances));
        const closestBreakpoint = lineBreakpoints[closestBreakpointIndex];
        editor
            .getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)
            ?.showBreakpointWidget(closestBreakpoint.lineNumber, closestBreakpoint.column);
    }
}
class OpenDisassemblyViewAction extends Action2 {
    static { this.ID = 'debug.action.openDisassemblyView'; }
    constructor() {
        super({
            id: OpenDisassemblyViewAction.ID,
            title: {
                ...nls.localize2('openDisassemblyView', 'Open Disassembly View'),
                mnemonicTitle: nls.localize({ key: 'miDisassemblyView', comment: ['&& denotes a mnemonic'] }, '&&DisassemblyView'),
            },
            precondition: CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE,
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'debug',
                    order: 5,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST),
                },
                {
                    id: MenuId.DebugCallStackContext,
                    group: 'z_commands',
                    order: 50,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'), CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED),
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED),
                },
            ],
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor(DisassemblyViewInput.instance, { pinned: true, revealIfOpened: true });
    }
}
class ToggleDisassemblyViewSourceCodeAction extends Action2 {
    static { this.ID = 'debug.action.toggleDisassemblyViewSourceCode'; }
    static { this.configID = 'debug.disassemblyView.showSourceCode'; }
    constructor() {
        super({
            id: ToggleDisassemblyViewSourceCodeAction.ID,
            title: {
                ...nls.localize2('toggleDisassemblyViewSourceCode', 'Toggle Source Code in Disassembly View'),
                mnemonicTitle: nls.localize({ key: 'mitogglesource', comment: ['&& denotes a mnemonic'] }, '&&ToggleSource'),
            },
            metadata: {
                description: nls.localize2('toggleDisassemblyViewSourceCodeDescription', 'Shows or hides source code in disassembly'),
            },
            f1: true,
        });
    }
    run(accessor, editor, ...args) {
        const configService = accessor.get(IConfigurationService);
        if (configService) {
            const value = configService.getValue('debug').disassemblyView.showSourceCode;
            configService.updateValue(ToggleDisassemblyViewSourceCodeAction.configID, !value);
        }
    }
}
export class RunToCursorAction extends EditorAction {
    static { this.ID = 'editor.debug.action.runToCursor'; }
    static { this.LABEL = nls.localize2('runToCursor', 'Run to Cursor'); }
    constructor() {
        super({
            id: RunToCursorAction.ID,
            label: RunToCursorAction.LABEL.value,
            alias: 'Debug: Run to Cursor',
            precondition: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, PanelFocusContext.toNegated(), ContextKeyExpr.or(EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLY_VIEW_FOCUS), ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 2,
                when: CONTEXT_IN_DEBUG_MODE,
            },
        });
    }
    async run(accessor, editor) {
        const position = editor.getPosition();
        if (!(editor.hasModel() && position)) {
            return;
        }
        const uri = editor.getModel().uri;
        const debugService = accessor.get(IDebugService);
        const viewModel = debugService.getViewModel();
        const uriIdentityService = accessor.get(IUriIdentityService);
        let column = undefined;
        const focusedStackFrame = viewModel.focusedStackFrame;
        if (focusedStackFrame &&
            uriIdentityService.extUri.isEqual(focusedStackFrame.source.uri, uri) &&
            focusedStackFrame.range.startLineNumber === position.lineNumber) {
            // If the cursor is on a line different than the one the debugger is currently paused on, then send the breakpoint on the line without a column
            // otherwise set it at the precise column #102199
            column = position.column;
        }
        await debugService.runTo(uri, position.lineNumber, column);
    }
}
export class SelectionToReplAction extends EditorAction {
    static { this.ID = 'editor.debug.action.selectionToRepl'; }
    static { this.LABEL = nls.localize2('evaluateInDebugConsole', 'Evaluate in Debug Console'); }
    constructor() {
        super({
            id: SelectionToReplAction.ID,
            label: SelectionToReplAction.LABEL.value,
            alias: 'Debug: Evaluate in Console',
            precondition: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 0,
            },
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const viewsService = accessor.get(IViewsService);
        const viewModel = debugService.getViewModel();
        const session = viewModel.focusedSession;
        if (!editor.hasModel() || !session) {
            return;
        }
        const selection = editor.getSelection();
        let text;
        if (selection.isEmpty()) {
            text = editor.getModel().getLineContent(selection.selectionStartLineNumber).trim();
        }
        else {
            text = editor.getModel().getValueInRange(selection);
        }
        const replView = (await viewsService.openView(REPL_VIEW_ID, false));
        replView?.sendReplInput(text);
    }
}
export class SelectionToWatchExpressionsAction extends EditorAction {
    static { this.ID = 'editor.debug.action.selectionToWatch'; }
    static { this.LABEL = nls.localize2('addToWatch', 'Add to Watch'); }
    constructor() {
        super({
            id: SelectionToWatchExpressionsAction.ID,
            label: SelectionToWatchExpressionsAction.LABEL.value,
            alias: 'Debug: Add to Watch',
            precondition: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 1,
            },
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const viewsService = accessor.get(IViewsService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        if (!editor.hasModel()) {
            return;
        }
        let expression = undefined;
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (!selection.isEmpty()) {
            expression = model.getValueInRange(selection);
        }
        else {
            const position = editor.getPosition();
            const evaluatableExpression = await getEvaluatableExpressionAtPosition(languageFeaturesService, model, position);
            if (!evaluatableExpression) {
                return;
            }
            expression = evaluatableExpression.matchingExpression;
        }
        if (!expression) {
            return;
        }
        await viewsService.openView(WATCH_VIEW_ID);
        debugService.addWatchExpression(expression);
    }
}
class ShowDebugHoverAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.showDebugHover',
            label: nls.localize2('showDebugHover', 'Debug: Show Hover'),
            precondition: CONTEXT_IN_DEBUG_MODE,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor, editor) {
        const position = editor.getPosition();
        if (!position || !editor.hasModel()) {
            return;
        }
        return editor
            .getContribution(EDITOR_CONTRIBUTION_ID)
            ?.showHover(position, true);
    }
}
const NO_TARGETS_MESSAGE = nls.localize('editor.debug.action.stepIntoTargets.notAvailable', 'Step targets are not available here');
class StepIntoTargetsAction extends EditorAction {
    static { this.ID = 'editor.debug.action.stepIntoTargets'; }
    static { this.LABEL = nls.localize({
        key: 'stepIntoTargets',
        comment: [
            'Step Into Targets lets the user step into an exact function he or she is interested in.',
        ],
    }, 'Step Into Target'); }
    constructor() {
        super({
            id: StepIntoTargetsAction.ID,
            label: StepIntoTargetsAction.LABEL,
            alias: 'Debug: Step Into Target',
            precondition: ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus),
            contextMenuOpts: {
                group: 'debug',
                order: 1.5,
            },
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const contextMenuService = accessor.get(IContextMenuService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const session = debugService.getViewModel().focusedSession;
        const frame = debugService.getViewModel().focusedStackFrame;
        const selection = editor.getSelection();
        const targetPosition = selection?.getPosition() ||
            (frame && { lineNumber: frame.range.startLineNumber, column: frame.range.startColumn });
        if (!session ||
            !frame ||
            !editor.hasModel() ||
            !uriIdentityService.extUri.isEqual(editor.getModel().uri, frame.source.uri)) {
            if (targetPosition) {
                MessageController.get(editor)?.showMessage(NO_TARGETS_MESSAGE, targetPosition);
            }
            return;
        }
        const targets = await session.stepInTargets(frame.frameId);
        if (!targets?.length) {
            MessageController.get(editor)?.showMessage(NO_TARGETS_MESSAGE, targetPosition);
            return;
        }
        // If there is a selection, try to find the best target with a position to step into.
        if (selection) {
            const positionalTargets = [];
            for (const target of targets) {
                if (target.line) {
                    positionalTargets.push({
                        start: new Position(target.line, target.column || 1),
                        end: target.endLine ? new Position(target.endLine, target.endColumn || 1) : undefined,
                        target,
                    });
                }
            }
            positionalTargets.sort((a, b) => b.start.lineNumber - a.start.lineNumber || b.start.column - a.start.column);
            const needle = selection.getPosition();
            // Try to find a target with a start and end that is around the cursor
            // position. Or, if none, whatever is before the cursor.
            const best = positionalTargets.find((t) => t.end && needle.isBefore(t.end) && t.start.isBeforeOrEqual(needle)) || positionalTargets.find((t) => t.end === undefined && t.start.isBeforeOrEqual(needle));
            if (best) {
                session.stepIn(frame.thread.threadId, best.target.id);
                return;
            }
        }
        // Otherwise, show a context menu and have the user pick a target
        editor.revealLineInCenterIfOutsideViewport(frame.range.startLineNumber);
        const cursorCoords = editor.getScrolledVisiblePosition(targetPosition);
        const editorCoords = getDomNodePagePosition(editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        contextMenuService.showContextMenu({
            getAnchor: () => ({ x, y }),
            getActions: () => {
                return targets.map((t) => new Action(`stepIntoTarget:${t.id}`, t.label, undefined, true, () => session.stepIn(frame.thread.threadId, t.id)));
            },
        });
    }
}
class GoToBreakpointAction extends EditorAction {
    constructor(isNext, opts) {
        super(opts);
        this.isNext = isNext;
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        if (editor.hasModel()) {
            const currentUri = editor.getModel().uri;
            const currentLine = editor.getPosition().lineNumber;
            //Breakpoints returned from `getBreakpoints` are already sorted.
            const allEnabledBreakpoints = debugService.getModel().getBreakpoints({ enabledOnly: true });
            //Try to find breakpoint in current file
            let moveBreakpoint = this.isNext
                ? allEnabledBreakpoints
                    .filter((bp) => uriIdentityService.extUri.isEqual(bp.uri, currentUri) &&
                    bp.lineNumber > currentLine)
                    .shift()
                : allEnabledBreakpoints
                    .filter((bp) => uriIdentityService.extUri.isEqual(bp.uri, currentUri) &&
                    bp.lineNumber < currentLine)
                    .pop();
            //Try to find breakpoints in following files
            if (!moveBreakpoint) {
                moveBreakpoint = this.isNext
                    ? allEnabledBreakpoints.filter((bp) => bp.uri.toString() > currentUri.toString()).shift()
                    : allEnabledBreakpoints.filter((bp) => bp.uri.toString() < currentUri.toString()).pop();
            }
            //Move to first or last possible breakpoint
            if (!moveBreakpoint && allEnabledBreakpoints.length) {
                moveBreakpoint = this.isNext
                    ? allEnabledBreakpoints[0]
                    : allEnabledBreakpoints[allEnabledBreakpoints.length - 1];
            }
            if (moveBreakpoint) {
                return openBreakpointSource(moveBreakpoint, false, true, false, debugService, editorService);
            }
        }
    }
}
class GoToNextBreakpointAction extends GoToBreakpointAction {
    constructor() {
        super(true, {
            id: 'editor.debug.action.goToNextBreakpoint',
            label: nls.localize2('goToNextBreakpoint', 'Debug: Go to Next Breakpoint'),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
        });
    }
}
class GoToPreviousBreakpointAction extends GoToBreakpointAction {
    constructor() {
        super(false, {
            id: 'editor.debug.action.goToPreviousBreakpoint',
            label: nls.localize2('goToPreviousBreakpoint', 'Debug: Go to Previous Breakpoint'),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
        });
    }
}
class CloseExceptionWidgetAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.closeExceptionWidget',
            label: nls.localize2('closeExceptionWidget', 'Close Exception Widget'),
            precondition: CONTEXT_EXCEPTION_WIDGET_VISIBLE,
            kbOpts: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(_accessor, editor) {
        const contribution = editor.getContribution(EDITOR_CONTRIBUTION_ID);
        contribution?.closeExceptionWidget();
    }
}
registerAction2(OpenDisassemblyViewAction);
registerAction2(ToggleDisassemblyViewSourceCodeAction);
registerAction2(ToggleBreakpointAction);
registerEditorAction(ConditionalBreakpointAction);
registerEditorAction(LogPointAction);
registerEditorAction(TriggerByBreakpointAction);
registerEditorAction(EditBreakpointAction);
registerEditorAction(RunToCursorAction);
registerEditorAction(StepIntoTargetsAction);
registerEditorAction(SelectionToReplAction);
registerEditorAction(SelectionToWatchExpressionsAction);
registerEditorAction(ShowDebugHoverAction);
registerEditorAction(GoToNextBreakpointAction);
registerEditorAction(GoToPreviousBreakpointAction);
registerEditorAction(CloseExceptionWidgetAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0VkaXRvckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFFL0UsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsR0FDcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENB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