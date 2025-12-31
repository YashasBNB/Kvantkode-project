/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_EXPRESSION_SELECTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, CONTEXT_SET_EXPRESSION_SUPPORTED, CONTEXT_SET_VARIABLE_SUPPORTED, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED, } from './debug.js';
import { isSessionAttach } from './debugUtils.js';
export class ViewModel {
    constructor(contextKeyService) {
        this.contextKeyService = contextKeyService;
        this.firstSessionStart = true;
        this._onDidFocusSession = new Emitter();
        this._onDidFocusThread = new Emitter();
        this._onDidFocusStackFrame = new Emitter();
        this._onDidSelectExpression = new Emitter();
        this._onDidEvaluateLazyExpression = new Emitter();
        this._onWillUpdateViews = new Emitter();
        this._onDidChangeVisualization = new Emitter();
        this.visualized = new WeakMap();
        this.preferredVisualizers = new Map();
        contextKeyService.bufferChangeEvents(() => {
            this.expressionSelectedContextKey = CONTEXT_EXPRESSION_SELECTED.bindTo(contextKeyService);
            this.loadedScriptsSupportedContextKey =
                CONTEXT_LOADED_SCRIPTS_SUPPORTED.bindTo(contextKeyService);
            this.stepBackSupportedContextKey = CONTEXT_STEP_BACK_SUPPORTED.bindTo(contextKeyService);
            this.focusedSessionIsAttach = CONTEXT_FOCUSED_SESSION_IS_ATTACH.bindTo(contextKeyService);
            this.focusedSessionIsNoDebug = CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.bindTo(contextKeyService);
            this.restartFrameSupportedContextKey =
                CONTEXT_RESTART_FRAME_SUPPORTED.bindTo(contextKeyService);
            this.stepIntoTargetsSupported = CONTEXT_STEP_INTO_TARGETS_SUPPORTED.bindTo(contextKeyService);
            this.jumpToCursorSupported = CONTEXT_JUMP_TO_CURSOR_SUPPORTED.bindTo(contextKeyService);
            this.setVariableSupported = CONTEXT_SET_VARIABLE_SUPPORTED.bindTo(contextKeyService);
            this.setDataBreakpointAtByteSupported =
                CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED.bindTo(contextKeyService);
            this.setExpressionSupported = CONTEXT_SET_EXPRESSION_SUPPORTED.bindTo(contextKeyService);
            this.multiSessionDebug = CONTEXT_MULTI_SESSION_DEBUG.bindTo(contextKeyService);
            this.terminateDebuggeeSupported =
                CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED.bindTo(contextKeyService);
            this.suspendDebuggeeSupported = CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED.bindTo(contextKeyService);
            this.disassembleRequestSupported =
                CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED.bindTo(contextKeyService);
            this.focusedStackFrameHasInstructionPointerReference =
                CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE.bindTo(contextKeyService);
        });
    }
    getId() {
        return 'root';
    }
    get focusedSession() {
        return this._focusedSession;
    }
    get focusedThread() {
        return this._focusedThread;
    }
    get focusedStackFrame() {
        return this._focusedStackFrame;
    }
    setFocus(stackFrame, thread, session, explicit) {
        const shouldEmitForStackFrame = this._focusedStackFrame !== stackFrame;
        const shouldEmitForSession = this._focusedSession !== session;
        const shouldEmitForThread = this._focusedThread !== thread;
        this._focusedStackFrame = stackFrame;
        this._focusedThread = thread;
        this._focusedSession = session;
        this.contextKeyService.bufferChangeEvents(() => {
            this.loadedScriptsSupportedContextKey.set(!!session?.capabilities.supportsLoadedSourcesRequest);
            this.stepBackSupportedContextKey.set(!!session?.capabilities.supportsStepBack);
            this.restartFrameSupportedContextKey.set(!!session?.capabilities.supportsRestartFrame);
            this.stepIntoTargetsSupported.set(!!session?.capabilities.supportsStepInTargetsRequest);
            this.jumpToCursorSupported.set(!!session?.capabilities.supportsGotoTargetsRequest);
            this.setVariableSupported.set(!!session?.capabilities.supportsSetVariable);
            this.setDataBreakpointAtByteSupported.set(!!session?.capabilities.supportsDataBreakpointBytes);
            this.setExpressionSupported.set(!!session?.capabilities.supportsSetExpression);
            this.terminateDebuggeeSupported.set(!!session?.capabilities.supportTerminateDebuggee);
            this.suspendDebuggeeSupported.set(!!session?.capabilities.supportSuspendDebuggee);
            this.disassembleRequestSupported.set(!!session?.capabilities.supportsDisassembleRequest);
            this.focusedStackFrameHasInstructionPointerReference.set(!!stackFrame?.instructionPointerReference);
            const attach = !!session && isSessionAttach(session);
            this.focusedSessionIsAttach.set(attach);
            this.focusedSessionIsNoDebug.set(!!session && !!session.configuration.noDebug);
        });
        if (shouldEmitForSession) {
            this._onDidFocusSession.fire(session);
        }
        // should not call onDidFocusThread if onDidFocusStackFrame is called.
        if (shouldEmitForStackFrame) {
            this._onDidFocusStackFrame.fire({ stackFrame, explicit, session });
        }
        else if (shouldEmitForThread) {
            this._onDidFocusThread.fire({ thread, explicit, session });
        }
    }
    get onDidFocusSession() {
        return this._onDidFocusSession.event;
    }
    get onDidFocusThread() {
        return this._onDidFocusThread.event;
    }
    get onDidFocusStackFrame() {
        return this._onDidFocusStackFrame.event;
    }
    get onDidChangeVisualization() {
        return this._onDidChangeVisualization.event;
    }
    getSelectedExpression() {
        return this.selectedExpression;
    }
    setSelectedExpression(expression, settingWatch) {
        this.selectedExpression = expression ? { expression, settingWatch: settingWatch } : undefined;
        this.expressionSelectedContextKey.set(!!expression);
        this._onDidSelectExpression.fire(this.selectedExpression);
    }
    get onDidSelectExpression() {
        return this._onDidSelectExpression.event;
    }
    get onDidEvaluateLazyExpression() {
        return this._onDidEvaluateLazyExpression.event;
    }
    updateViews() {
        this._onWillUpdateViews.fire();
    }
    get onWillUpdateViews() {
        return this._onWillUpdateViews.event;
    }
    isMultiSessionView() {
        return !!this.multiSessionDebug.get();
    }
    setMultiSessionView(isMultiSessionView) {
        this.multiSessionDebug.set(isMultiSessionView);
    }
    setVisualizedExpression(original, visualized) {
        const current = this.visualized.get(original) || original;
        const key = this.getPreferredVisualizedKey(original);
        if (visualized) {
            this.visualized.set(original, visualized);
            this.preferredVisualizers.set(key, visualized.treeId);
        }
        else {
            this.visualized.delete(original);
            this.preferredVisualizers.delete(key);
        }
        this._onDidChangeVisualization.fire({ original: current, replacement: visualized || original });
    }
    getVisualizedExpression(expression) {
        return (this.visualized.get(expression) ||
            this.preferredVisualizers.get(this.getPreferredVisualizedKey(expression)));
    }
    async evaluateLazyExpression(expression) {
        await expression.evaluateLazy();
        this._onDidEvaluateLazyExpression.fire(expression);
    }
    getPreferredVisualizedKey(expr) {
        return JSON.stringify([expr.name, expr.type, !!expr.memoryReference].join('\0'));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBS2pFLE9BQU8sRUFDTixxQ0FBcUMsRUFDckMsMkJBQTJCLEVBQzNCLGlDQUFpQyxFQUNqQyxtQ0FBbUMsRUFDbkMsNkRBQTZELEVBQzdELGdDQUFnQyxFQUNoQyxnQ0FBZ0MsRUFDaEMsMkJBQTJCLEVBQzNCLCtCQUErQixFQUMvQiwyQ0FBMkMsRUFDM0MsZ0NBQWdDLEVBQ2hDLDhCQUE4QixFQUM5QiwyQkFBMkIsRUFDM0IsbUNBQW1DLEVBQ25DLGtDQUFrQyxFQUNsQyxvQ0FBb0MsR0FPcEMsTUFBTSxZQUFZLENBQUE7QUFDbkIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRWpELE1BQU0sT0FBTyxTQUFTO0lBOENyQixZQUFvQixpQkFBcUM7UUFBckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQTdDekQsc0JBQWlCLEdBQUcsSUFBSSxDQUFBO1FBTVAsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQTZCLENBQUE7UUFDN0Qsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBSTVDLENBQUE7UUFDYSwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFJaEQsQ0FBQTtRQUNhLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUVsRCxDQUFBO1FBQ2MsaUNBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQXdCLENBQUE7UUFDbEUsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUN4Qyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFHcEQsQ0FBQTtR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