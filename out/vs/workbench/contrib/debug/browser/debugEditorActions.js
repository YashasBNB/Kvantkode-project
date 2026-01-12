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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnRWRpdG9yQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRSxPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixHQUNwQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUc3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXRELE9BQU8sRUFDTixpQ0FBaUMsRUFFakMsMkJBQTJCLEVBQzNCLG1CQUFtQixFQUNuQiwyQkFBMkIsRUFDM0IscUNBQXFDLEVBQ3JDLDhCQUE4QixFQUM5QixnQ0FBZ0MsRUFDaEMsNkRBQTZELEVBQzdELHFCQUFxQixFQUNyQiw2Q0FBNkMsRUFDN0MsbUNBQW1DLEVBQ25DLHNCQUFzQixFQUl0QixhQUFhLEVBQ2IsWUFBWSxFQUNaLGFBQWEsR0FDYixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLDBCQUEwQixDQUFDO2dCQUN0RSxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNqRSxxQkFBcUIsQ0FDckI7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLDJCQUEyQjtZQUN6QyxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLDhCQUE4QixDQUFDO2dCQUMxRixPQUFPLHFCQUFZO2dCQUNuQixNQUFNLDBDQUFnQzthQUN0QztZQUNELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtnQkFDM0IsSUFBSSxFQUFFLDJCQUEyQjtnQkFDakMsS0FBSyxFQUFFLGtCQUFrQjtnQkFDekIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDakQsSUFBSSxVQUFVLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLHVCQUF1QixDQUFBO1lBQ25ELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLHlCQUF5QixFQUFFLENBQUE7Z0JBQy9ELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsRSxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLFlBQVksQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMxRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsWUFBWSxDQUFDLHdCQUF3QixDQUFDO3dCQUNyQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsU0FBUzt3QkFDeEMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO3dCQUN2QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87d0JBQ3pCLFVBQVUsRUFBRSxLQUFLO3FCQUNqQixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sTUFBTSxHQUNYLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNwRixJQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUE7WUFDdEMsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ2xFLDZGQUE2RjtZQUM3RixNQUFNLFdBQVcsR0FBRztnQkFDbkIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDekUsQ0FBQTtZQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQzlCLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUN2RixJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQy9FLENBQUM7cUJBQU0sSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDbkIsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDcEUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSwyQkFBNEIsU0FBUSxZQUFZO0lBQ3JEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJDQUEyQztZQUMvQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FDbkIsbUNBQW1DLEVBQ25DLHNDQUFzQyxDQUN0QztZQUNELFlBQVksRUFBRSwyQkFBMkI7WUFDekMsUUFBUSxFQUFFO2dCQUNULE1BQU0sRUFBRSxNQUFNLENBQUMsd0JBQXdCO2dCQUN2QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUN0RSw2QkFBNkIsQ0FDN0I7Z0JBQ0QsS0FBSyxFQUFFLGVBQWU7Z0JBQ3RCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSwyQkFBMkI7YUFDakM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFaEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3JDLElBQUksUUFBUSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxZQUFZLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMxRixNQUFNO2lCQUNKLGVBQWUsQ0FBZ0MsaUNBQWlDLENBQUM7Z0JBQ2xGLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLDRDQUFvQyxDQUFBO1FBQzNGLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGNBQWUsU0FBUSxZQUFZO0lBQ3hDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGlDQUFpQztZQUNyQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQztZQUN0RSxZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLFFBQVEsRUFBRTtnQkFDVDtvQkFDQyxNQUFNLEVBQUUsTUFBTSxDQUFDLHdCQUF3QjtvQkFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3pELGVBQWUsQ0FDZjtvQkFDRCxLQUFLLEVBQUUsZUFBZTtvQkFDdEIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLDJCQUEyQjtpQkFDakM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzFGLE1BQU07aUJBQ0osZUFBZSxDQUFnQyxpQ0FBaUMsQ0FBQztnQkFDbEYsRUFBRSxvQkFBb0IsQ0FDckIsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sOENBRWYsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHlCQUEwQixTQUFRLFlBQVk7SUFDbkQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLG9DQUFvQyxDQUFDO1lBQzVGLFlBQVksRUFBRSwyQkFBMkI7WUFDekMsS0FBSyxFQUFFLGdDQUFnQztZQUN2QyxRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsTUFBTSxFQUFFLE1BQU0sQ0FBQyx3QkFBd0I7b0JBQ3ZDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3BFLDJCQUEyQixDQUMzQjtvQkFDRCxLQUFLLEVBQUUsZUFBZTtvQkFDdEIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLDJCQUEyQjtpQkFDakM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzFGLE1BQU07aUJBQ0osZUFBZSxDQUFnQyxpQ0FBaUMsQ0FBQztnQkFDbEYsRUFBRSxvQkFBb0IsQ0FDckIsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sZ0RBRWYsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLG9CQUFxQixTQUFRLFlBQVk7SUFDOUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHdCQUF3QixDQUFDO1lBQzNFLEtBQUssRUFBRSxpQ0FBaUM7WUFDeEMsWUFBWSxFQUFFLDJCQUEyQjtZQUN6QyxRQUFRLEVBQUU7Z0JBQ1QsTUFBTSxFQUFFLE1BQU0sQ0FBQyx3QkFBd0I7Z0JBQ3ZDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQy9ELG1CQUFtQixDQUNuQjtnQkFDRCxLQUFLLEVBQUUsZUFBZTtnQkFDdEIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLDJCQUEyQjthQUNqQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUN0RixJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyRCxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNmLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQTtZQUN2QixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxzQkFBc0IsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUM1RixNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBRWpFLE1BQU07YUFDSixlQUFlLENBQWdDLGlDQUFpQyxDQUFDO1lBQ2xGLEVBQUUsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hGLENBQUM7Q0FDRDtBQUVELE1BQU0seUJBQTBCLFNBQVEsT0FBTzthQUN2QixPQUFFLEdBQUcsa0NBQWtDLENBQUE7SUFFOUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCLENBQUMsRUFBRTtZQUNoQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHFCQUFxQixFQUFFLHVCQUF1QixDQUFDO2dCQUNoRSxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNoRSxtQkFBbUIsQ0FDbkI7YUFDRDtZQUNELFlBQVksRUFBRSw2REFBNkQ7WUFDM0UsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYTtvQkFDeEIsS0FBSyxFQUFFLE9BQU87b0JBQ2QsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHFCQUFxQixFQUNyQixpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsRUFDN0IsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUN4QyxpQkFBaUIsQ0FBQyxlQUFlLEVBQ2pDLHFDQUFxQyxFQUNyQyw2Q0FBNkMsQ0FDN0M7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxxQkFBcUI7b0JBQ2hDLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsRUFBRTtvQkFDVCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDeEMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUNuRCxxQ0FBcUMsQ0FDckM7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDeEMscUNBQXFDLENBQ3JDO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsYUFBYSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ2hHLENBQUM7O0FBR0YsTUFBTSxxQ0FBc0MsU0FBUSxPQUFPO2FBQ25DLE9BQUUsR0FBRyw4Q0FBOEMsQ0FBQTthQUNuRCxhQUFRLEdBQVcsc0NBQXNDLENBQUE7SUFFaEY7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDLENBQUMsRUFBRTtZQUM1QyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUNmLGlDQUFpQyxFQUNqQyx3Q0FBd0MsQ0FDeEM7Z0JBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQzFCLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDN0QsZ0JBQWdCLENBQ2hCO2FBQ0Q7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ3pCLDRDQUE0QyxFQUM1QywyQ0FBMkMsQ0FDM0M7YUFDRDtZQUNELEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CLEVBQUUsR0FBRyxJQUFXO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN6RCxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUNWLGFBQWEsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUE7WUFDcEYsYUFBYSxDQUFDLFdBQVcsQ0FBQyxxQ0FBcUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRixDQUFDO0lBQ0YsQ0FBQzs7QUFHRixNQUFNLE9BQU8saUJBQWtCLFNBQVEsWUFBWTthQUMzQixPQUFFLEdBQUcsaUNBQWlDLENBQUE7YUFDdEMsVUFBSyxHQUFxQixHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUU5RjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3hCLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUNwQyxLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQiwyQkFBMkIsRUFDM0IsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQzdCLGNBQWMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLDhCQUE4QixDQUFDLEVBQ3BGLGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQ3RDO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQixLQUFLLEVBQUUsT0FBTztnQkFDZCxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUscUJBQXFCO2FBQzNCO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN4RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFBO1FBRWpDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzdDLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRTVELElBQUksTUFBTSxHQUF1QixTQUFTLENBQUE7UUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUE7UUFDckQsSUFDQyxpQkFBaUI7WUFDakIsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNwRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQzlELENBQUM7WUFDRiwrSUFBK0k7WUFDL0ksaURBQWlEO1lBQ2pELE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ3pCLENBQUM7UUFDRCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDM0QsQ0FBQzs7QUFHRixNQUFNLE9BQU8scUJBQXNCLFNBQVEsWUFBWTthQUMvQixPQUFFLEdBQUcscUNBQXFDLENBQUE7YUFDMUMsVUFBSyxHQUFxQixHQUFHLENBQUMsU0FBUyxDQUM3RCx3QkFBd0IsRUFDeEIsMkJBQTJCLENBQzNCLENBQUE7SUFFRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFO1lBQzVCLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUN4QyxLQUFLLEVBQUUsNEJBQTRCO1lBQ25DLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixxQkFBcUIsRUFDckIsaUJBQWlCLENBQUMsZUFBZSxFQUNqQyxlQUFlLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUN0QztZQUNELGVBQWUsRUFBRTtnQkFDaEIsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDeEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLElBQVksQ0FBQTtRQUNoQixJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25GLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBcUIsQ0FBQTtRQUN2RixRQUFRLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlCLENBQUM7O0FBR0YsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLFlBQVk7YUFDM0MsT0FBRSxHQUFHLHNDQUFzQyxDQUFBO2FBQzNDLFVBQUssR0FBcUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFFNUY7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsaUNBQWlDLENBQUMsRUFBRTtZQUN4QyxLQUFLLEVBQUUsaUNBQWlDLENBQUMsS0FBSyxDQUFDLEtBQUs7WUFDcEQsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IscUJBQXFCLEVBQ3JCLGlCQUFpQixDQUFDLGVBQWUsRUFDakMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FDdEM7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxPQUFPO2dCQUNkLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFVBQVUsR0FBdUIsU0FBUyxDQUFBO1FBRTlDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzFCLFVBQVUsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3JDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxrQ0FBa0MsQ0FDckUsdUJBQXVCLEVBQ3ZCLEtBQUssRUFDTCxRQUFRLENBQ1IsQ0FBQTtZQUNELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUM1QixPQUFNO1lBQ1AsQ0FBQztZQUNELFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM1QyxDQUFDOztBQUdGLE1BQU0sb0JBQXFCLFNBQVEsWUFBWTtJQUM5QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxvQ0FBb0M7WUFDeEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUM7WUFDM0QsWUFBWSxFQUFFLHFCQUFxQjtZQUNuQyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7Z0JBQ3pDLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsaURBQTZCLENBQUM7Z0JBQy9FLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN4RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxNQUFNO2FBQ1gsZUFBZSxDQUEyQixzQkFBc0IsQ0FBQztZQUNsRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUN0QyxrREFBa0QsRUFDbEQscUNBQXFDLENBQ3JDLENBQUE7QUFFRCxNQUFNLHFCQUFzQixTQUFRLFlBQVk7YUFDeEIsT0FBRSxHQUFHLHFDQUFxQyxDQUFBO2FBQzFDLFVBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUMxQztRQUNDLEdBQUcsRUFBRSxpQkFBaUI7UUFDdEIsT0FBTyxFQUFFO1lBQ1IseUZBQXlGO1NBQ3pGO0tBQ0QsRUFDRCxrQkFBa0IsQ0FDbEIsQ0FBQTtJQUVEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFCQUFxQixDQUFDLEVBQUU7WUFDNUIsS0FBSyxFQUFFLHFCQUFxQixDQUFDLEtBQUs7WUFDbEMsS0FBSyxFQUFFLHlCQUF5QjtZQUNoQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsbUNBQW1DLEVBQ25DLHFCQUFxQixFQUNyQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQ3hDLGlCQUFpQixDQUFDLGVBQWUsQ0FDakM7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxPQUFPO2dCQUNkLEtBQUssRUFBRSxHQUFHO2FBQ1Y7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDNUQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDNUQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsQ0FBQTtRQUMxRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUE7UUFDM0QsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRXZDLE1BQU0sY0FBYyxHQUNuQixTQUFTLEVBQUUsV0FBVyxFQUFFO1lBQ3hCLENBQUMsS0FBSyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFFeEYsSUFDQyxDQUFDLE9BQU87WUFDUixDQUFDLEtBQUs7WUFDTixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDbEIsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFDMUUsQ0FBQztZQUNGLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDL0UsQ0FBQztZQUNELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ3RCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsY0FBZSxDQUFDLENBQUE7WUFDL0UsT0FBTTtRQUNQLENBQUM7UUFFRCxxRkFBcUY7UUFDckYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0saUJBQWlCLEdBSWpCLEVBQUUsQ0FBQTtZQUNSLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNqQixpQkFBaUIsQ0FBQyxJQUFJLENBQUM7d0JBQ3RCLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO3dCQUNwRCxHQUFHLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUNyRixNQUFNO3FCQUNOLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztZQUVELGlCQUFpQixDQUFDLElBQUksQ0FDckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDcEYsQ0FBQTtZQUVELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUV0QyxzRUFBc0U7WUFDdEUsd0RBQXdEO1lBQ3hELE1BQU0sSUFBSSxHQUNULGlCQUFpQixDQUFDLElBQUksQ0FDckIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQ3pFLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQzNGLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRCxPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxpRUFBaUU7UUFDakUsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdkUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGNBQWUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sWUFBWSxHQUFHLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtRQUMvQyxNQUFNLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtRQUVuRSxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7WUFDbEMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0IsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUNqQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsSUFBSSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQ25FLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUMzQyxDQUNGLENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUFHRixNQUFNLG9CQUFxQixTQUFRLFlBQVk7SUFDOUMsWUFDUyxNQUFlLEVBQ3ZCLElBQW9CO1FBRXBCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUhILFdBQU0sR0FBTixNQUFNLENBQVM7SUFJeEIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN4RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFFNUQsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN2QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFBO1lBQ3hDLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUE7WUFDbkQsZ0VBQWdFO1lBQ2hFLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBRTNGLHdDQUF3QztZQUN4QyxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTTtnQkFDL0IsQ0FBQyxDQUFDLHFCQUFxQjtxQkFDcEIsTUFBTSxDQUNOLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FDTixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDO29CQUNyRCxFQUFFLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FDNUI7cUJBQ0EsS0FBSyxFQUFFO2dCQUNWLENBQUMsQ0FBQyxxQkFBcUI7cUJBQ3BCLE1BQU0sQ0FDTixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04sa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQztvQkFDckQsRUFBRSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQzVCO3FCQUNBLEdBQUcsRUFBRSxDQUFBO1lBRVQsNENBQTRDO1lBQzVDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDckIsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNO29CQUMzQixDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRTtvQkFDekYsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUN6RixDQUFDO1lBRUQsMkNBQTJDO1lBQzNDLElBQUksQ0FBQyxjQUFjLElBQUkscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JELGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTTtvQkFDM0IsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztvQkFDMUIsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1lBRUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzdGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSx3QkFBeUIsU0FBUSxvQkFBb0I7SUFDMUQ7UUFDQyxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ1gsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSw4QkFBOEIsQ0FBQztZQUMxRSxZQUFZLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sNEJBQTZCLFNBQVEsb0JBQW9CO0lBQzlEO1FBQ0MsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNaLEVBQUUsRUFBRSw0Q0FBNEM7WUFDaEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsa0NBQWtDLENBQUM7WUFDbEYsWUFBWSxFQUFFLDJCQUEyQjtTQUN6QyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLDBCQUEyQixTQUFRLFlBQVk7SUFDcEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMENBQTBDO1lBQzlDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLHdCQUF3QixDQUFDO1lBQ3RFLFlBQVksRUFBRSxnQ0FBZ0M7WUFDOUMsTUFBTSxFQUFFO2dCQUNQLE9BQU8sd0JBQWdCO2dCQUN2QixNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQTJCLEVBQUUsTUFBbUI7UUFDekQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBMkIsc0JBQXNCLENBQUMsQ0FBQTtRQUM3RixZQUFZLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMxQyxlQUFlLENBQUMscUNBQXFDLENBQUMsQ0FBQTtBQUN0RCxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUN2QyxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0FBQ2pELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQ3BDLG9CQUFvQixDQUFDLHlCQUF5QixDQUFDLENBQUE7QUFDL0Msb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUMxQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3ZDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUE7QUFDM0Msb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0FBQ3ZELG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUE7QUFDMUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtBQUM5QyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0FBQ2xELG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLENBQUEifQ==