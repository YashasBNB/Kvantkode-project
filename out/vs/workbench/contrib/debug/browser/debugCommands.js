/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IDebugService, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_VARIABLES_FOCUSED, EDITOR_CONTRIBUTION_ID, CONTEXT_IN_DEBUG_MODE, CONTEXT_EXPRESSION_SELECTED, CONTEXT_DEBUG_STATE, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, REPL_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE, getStateLabel, CONTEXT_BREAKPOINT_INPUT_FOCUSED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, VIEWLET_ID, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_IN_DEBUG_REPL, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, isFrameDeemphasized, } from '../common/debug.js';
import { Expression, Variable, Breakpoint, FunctionBreakpoint, DataBreakpoint, } from '../common/debugModel.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { MenuRegistry, MenuId, Action2, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { openBreakpointSource } from './breakpointsView.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { InputFocusedContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { ActiveEditorContext, PanelFocusContext, ResourceContextKey, } from '../../../common/contextkeys.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { saveAllBeforeDebugStart } from '../common/debugUtils.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { showLoadedScriptMenu } from '../common/loadedScriptsPicker.js';
import { showDebugSessionMenu } from './debugSessionPicker.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export const ADD_CONFIGURATION_ID = 'debug.addConfiguration';
export const TOGGLE_INLINE_BREAKPOINT_ID = 'editor.debug.action.toggleInlineBreakpoint';
export const COPY_STACK_TRACE_ID = 'debug.copyStackTrace';
export const REVERSE_CONTINUE_ID = 'workbench.action.debug.reverseContinue';
export const STEP_BACK_ID = 'workbench.action.debug.stepBack';
export const RESTART_SESSION_ID = 'workbench.action.debug.restart';
export const TERMINATE_THREAD_ID = 'workbench.action.debug.terminateThread';
export const STEP_OVER_ID = 'workbench.action.debug.stepOver';
export const STEP_INTO_ID = 'workbench.action.debug.stepInto';
export const STEP_INTO_TARGET_ID = 'workbench.action.debug.stepIntoTarget';
export const STEP_OUT_ID = 'workbench.action.debug.stepOut';
export const PAUSE_ID = 'workbench.action.debug.pause';
export const DISCONNECT_ID = 'workbench.action.debug.disconnect';
export const DISCONNECT_AND_SUSPEND_ID = 'workbench.action.debug.disconnectAndSuspend';
export const STOP_ID = 'workbench.action.debug.stop';
export const RESTART_FRAME_ID = 'workbench.action.debug.restartFrame';
export const CONTINUE_ID = 'workbench.action.debug.continue';
export const FOCUS_REPL_ID = 'workbench.debug.action.focusRepl';
export const JUMP_TO_CURSOR_ID = 'debug.jumpToCursor';
export const FOCUS_SESSION_ID = 'workbench.action.debug.focusProcess';
export const SELECT_AND_START_ID = 'workbench.action.debug.selectandstart';
export const SELECT_DEBUG_CONSOLE_ID = 'workbench.action.debug.selectDebugConsole';
export const SELECT_DEBUG_SESSION_ID = 'workbench.action.debug.selectDebugSession';
export const DEBUG_CONFIGURE_COMMAND_ID = 'workbench.action.debug.configure';
export const DEBUG_START_COMMAND_ID = 'workbench.action.debug.start';
export const DEBUG_RUN_COMMAND_ID = 'workbench.action.debug.run';
export const EDIT_EXPRESSION_COMMAND_ID = 'debug.renameWatchExpression';
export const COPY_WATCH_EXPRESSION_COMMAND_ID = 'debug.copyWatchExpression';
export const SET_EXPRESSION_COMMAND_ID = 'debug.setWatchExpression';
export const REMOVE_EXPRESSION_COMMAND_ID = 'debug.removeWatchExpression';
export const NEXT_DEBUG_CONSOLE_ID = 'workbench.action.debug.nextConsole';
export const PREV_DEBUG_CONSOLE_ID = 'workbench.action.debug.prevConsole';
export const SHOW_LOADED_SCRIPTS_ID = 'workbench.action.debug.showLoadedScripts';
export const CALLSTACK_TOP_ID = 'workbench.action.debug.callStackTop';
export const CALLSTACK_BOTTOM_ID = 'workbench.action.debug.callStackBottom';
export const CALLSTACK_UP_ID = 'workbench.action.debug.callStackUp';
export const CALLSTACK_DOWN_ID = 'workbench.action.debug.callStackDown';
export const ADD_TO_WATCH_ID = 'debug.addToWatchExpressions';
export const COPY_EVALUATE_PATH_ID = 'debug.copyEvaluatePath';
export const COPY_VALUE_ID = 'workbench.debug.viewlet.action.copyValue';
export const DEBUG_COMMAND_CATEGORY = nls.localize2('debug', 'Debug');
export const RESTART_LABEL = nls.localize2('restartDebug', 'Restart');
export const STEP_OVER_LABEL = nls.localize2('stepOverDebug', 'Step Over');
export const STEP_INTO_LABEL = nls.localize2('stepIntoDebug', 'Step Into');
export const STEP_INTO_TARGET_LABEL = nls.localize2('stepIntoTargetDebug', 'Step Into Target');
export const STEP_OUT_LABEL = nls.localize2('stepOutDebug', 'Step Out');
export const PAUSE_LABEL = nls.localize2('pauseDebug', 'Pause');
export const DISCONNECT_LABEL = nls.localize2('disconnect', 'Disconnect');
export const DISCONNECT_AND_SUSPEND_LABEL = nls.localize2('disconnectSuspend', 'Disconnect and Suspend');
export const STOP_LABEL = nls.localize2('stop', 'Stop');
export const CONTINUE_LABEL = nls.localize2('continueDebug', 'Continue');
export const FOCUS_SESSION_LABEL = nls.localize2('focusSession', 'Focus Session');
export const SELECT_AND_START_LABEL = nls.localize2('selectAndStartDebugging', 'Select and Start Debugging');
export const DEBUG_CONFIGURE_LABEL = nls.localize('openLaunchJson', "Open '{0}'", 'launch.json');
export const DEBUG_START_LABEL = nls.localize2('startDebug', 'Start Debugging');
export const DEBUG_RUN_LABEL = nls.localize2('startWithoutDebugging', 'Start Without Debugging');
export const NEXT_DEBUG_CONSOLE_LABEL = nls.localize2('nextDebugConsole', 'Focus Next Debug Console');
export const PREV_DEBUG_CONSOLE_LABEL = nls.localize2('prevDebugConsole', 'Focus Previous Debug Console');
export const OPEN_LOADED_SCRIPTS_LABEL = nls.localize2('openLoadedScript', 'Open Loaded Script...');
export const CALLSTACK_TOP_LABEL = nls.localize2('callStackTop', 'Navigate to Top of Call Stack');
export const CALLSTACK_BOTTOM_LABEL = nls.localize2('callStackBottom', 'Navigate to Bottom of Call Stack');
export const CALLSTACK_UP_LABEL = nls.localize2('callStackUp', 'Navigate Up Call Stack');
export const CALLSTACK_DOWN_LABEL = nls.localize2('callStackDown', 'Navigate Down Call Stack');
export const COPY_EVALUATE_PATH_LABEL = nls.localize2('copyAsExpression', 'Copy as Expression');
export const COPY_VALUE_LABEL = nls.localize2('copyValue', 'Copy Value');
export const ADD_TO_WATCH_LABEL = nls.localize2('addToWatchExpressions', 'Add to Watch');
export const SELECT_DEBUG_CONSOLE_LABEL = nls.localize2('selectDebugConsole', 'Select Debug Console');
export const SELECT_DEBUG_SESSION_LABEL = nls.localize2('selectDebugSession', 'Select Debug Session');
export const DEBUG_QUICK_ACCESS_PREFIX = 'debug ';
export const DEBUG_CONSOLE_QUICK_ACCESS_PREFIX = 'debug consoles ';
function isThreadContext(obj) {
    return obj && typeof obj.sessionId === 'string' && typeof obj.threadId === 'string';
}
async function getThreadAndRun(accessor, sessionAndThreadId, run) {
    const debugService = accessor.get(IDebugService);
    let thread;
    if (isThreadContext(sessionAndThreadId)) {
        const session = debugService.getModel().getSession(sessionAndThreadId.sessionId);
        if (session) {
            thread = session.getAllThreads().find((t) => t.getId() === sessionAndThreadId.threadId);
        }
    }
    else if (isSessionContext(sessionAndThreadId)) {
        const session = debugService.getModel().getSession(sessionAndThreadId.sessionId);
        if (session) {
            const threads = session.getAllThreads();
            thread = threads.length > 0 ? threads[0] : undefined;
        }
    }
    if (!thread) {
        thread = debugService.getViewModel().focusedThread;
        if (!thread) {
            const focusedSession = debugService.getViewModel().focusedSession;
            const threads = focusedSession ? focusedSession.getAllThreads() : undefined;
            thread = threads && threads.length ? threads[0] : undefined;
        }
    }
    if (thread) {
        await run(thread);
    }
}
function isStackFrameContext(obj) {
    return (obj &&
        typeof obj.sessionId === 'string' &&
        typeof obj.threadId === 'string' &&
        typeof obj.frameId === 'string');
}
function getFrame(debugService, context) {
    if (isStackFrameContext(context)) {
        const session = debugService.getModel().getSession(context.sessionId);
        if (session) {
            const thread = session.getAllThreads().find((t) => t.getId() === context.threadId);
            if (thread) {
                return thread.getCallStack().find((sf) => sf.getId() === context.frameId);
            }
        }
    }
    else {
        return debugService.getViewModel().focusedStackFrame;
    }
    return undefined;
}
function isSessionContext(obj) {
    return obj && typeof obj.sessionId === 'string';
}
async function changeDebugConsoleFocus(accessor, next) {
    const debugService = accessor.get(IDebugService);
    const viewsService = accessor.get(IViewsService);
    const sessions = debugService
        .getModel()
        .getSessions(true)
        .filter((s) => s.hasSeparateRepl());
    let currSession = debugService.getViewModel().focusedSession;
    let nextIndex = 0;
    if (sessions.length > 0 && currSession) {
        while (currSession && !currSession.hasSeparateRepl()) {
            currSession = currSession.parentSession;
        }
        if (currSession) {
            const currIndex = sessions.indexOf(currSession);
            if (next) {
                nextIndex = currIndex === sessions.length - 1 ? 0 : currIndex + 1;
            }
            else {
                nextIndex = currIndex === 0 ? sessions.length - 1 : currIndex - 1;
            }
        }
    }
    await debugService.focusStackFrame(undefined, undefined, sessions[nextIndex], { explicit: true });
    if (!viewsService.isViewVisible(REPL_VIEW_ID)) {
        await viewsService.openView(REPL_VIEW_ID, true);
    }
}
async function navigateCallStack(debugService, down) {
    const frame = debugService.getViewModel().focusedStackFrame;
    if (frame) {
        let callStack = frame.thread.getCallStack();
        let index = callStack.findIndex((elem) => elem.frameId === frame.frameId);
        let nextVisibleFrame;
        if (down) {
            if (index >= callStack.length - 1) {
                if (frame.thread.reachedEndOfCallStack) {
                    goToTopOfCallStack(debugService);
                    return;
                }
                else {
                    await debugService.getModel().fetchCallstack(frame.thread, 20);
                    callStack = frame.thread.getCallStack();
                    index = callStack.findIndex((elem) => elem.frameId === frame.frameId);
                }
            }
            nextVisibleFrame = findNextVisibleFrame(true, callStack, index);
        }
        else {
            if (index <= 0) {
                goToBottomOfCallStack(debugService);
                return;
            }
            nextVisibleFrame = findNextVisibleFrame(false, callStack, index);
        }
        if (nextVisibleFrame) {
            debugService.focusStackFrame(nextVisibleFrame, undefined, undefined, { preserveFocus: false });
        }
    }
}
async function goToBottomOfCallStack(debugService) {
    const thread = debugService.getViewModel().focusedThread;
    if (thread) {
        await debugService.getModel().fetchCallstack(thread);
        const callStack = thread.getCallStack();
        if (callStack.length > 0) {
            const nextVisibleFrame = findNextVisibleFrame(false, callStack, 0); // must consider the next frame up first, which will be the last frame
            if (nextVisibleFrame) {
                debugService.focusStackFrame(nextVisibleFrame, undefined, undefined, {
                    preserveFocus: false,
                });
            }
        }
    }
}
function goToTopOfCallStack(debugService) {
    const thread = debugService.getViewModel().focusedThread;
    if (thread) {
        debugService.focusStackFrame(thread.getTopStackFrame(), undefined, undefined, {
            preserveFocus: false,
        });
    }
}
/**
 * Finds next frame that is not skipped by SkipFiles. Skips frame at index and starts searching at next.
 * Must satisfy `0 <= startIndex <= callStack - 1`
 * @param down specifies whether to search downwards if the current file is skipped.
 * @param callStack the call stack to search
 * @param startIndex the index to start the search at
 */
function findNextVisibleFrame(down, callStack, startIndex) {
    if (startIndex >= callStack.length) {
        startIndex = callStack.length - 1;
    }
    else if (startIndex < 0) {
        startIndex = 0;
    }
    let index = startIndex;
    let currFrame;
    do {
        if (down) {
            if (index === callStack.length - 1) {
                index = 0;
            }
            else {
                index++;
            }
        }
        else {
            if (index === 0) {
                index = callStack.length - 1;
            }
            else {
                index--;
            }
        }
        currFrame = callStack[index];
        if (!isFrameDeemphasized(currFrame)) {
            return currFrame;
        }
    } while (index !== startIndex); // end loop when we've just checked the start index, since that should be the last one checked
    return undefined;
}
// These commands are used in call stack context menu, call stack inline actions, command palette, debug toolbar, mac native touch bar
// When the command is exectued in the context of a thread(context menu on a thread, inline call stack action) we pass the thread id
// Otherwise when it is executed "globaly"(using the touch bar, debug toolbar, command palette) we do not pass any id and just take whatever is the focussed thread
// Same for stackFrame commands and session commands.
CommandsRegistry.registerCommand({
    id: COPY_STACK_TRACE_ID,
    handler: async (accessor, _, context) => {
        const textResourcePropertiesService = accessor.get(ITextResourcePropertiesService);
        const clipboardService = accessor.get(IClipboardService);
        const debugService = accessor.get(IDebugService);
        const frame = getFrame(debugService, context);
        if (frame) {
            const eol = textResourcePropertiesService.getEOL(frame.source.uri);
            await clipboardService.writeText(frame.thread
                .getCallStack()
                .map((sf) => sf.toString())
                .join(eol));
        }
    },
});
CommandsRegistry.registerCommand({
    id: REVERSE_CONTINUE_ID,
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, (thread) => thread.reverseContinue());
    },
});
CommandsRegistry.registerCommand({
    id: STEP_BACK_ID,
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepBack('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepBack());
        }
    },
});
CommandsRegistry.registerCommand({
    id: TERMINATE_THREAD_ID,
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, (thread) => thread.terminate());
    },
});
CommandsRegistry.registerCommand({
    id: JUMP_TO_CURSOR_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const editorService = accessor.get(IEditorService);
        const activeEditorControl = editorService.activeTextEditorControl;
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        if (stackFrame && isCodeEditor(activeEditorControl) && activeEditorControl.hasModel()) {
            const position = activeEditorControl.getPosition();
            const resource = activeEditorControl.getModel().uri;
            const source = stackFrame.thread.session.getSourceForUri(resource);
            if (source) {
                const response = await stackFrame.thread.session.gotoTargets(source.raw, position.lineNumber, position.column);
                const targets = response?.body.targets;
                if (targets && targets.length) {
                    let id = targets[0].id;
                    if (targets.length > 1) {
                        const picks = targets.map((t) => ({ label: t.label, _id: t.id }));
                        const pick = await quickInputService.pick(picks, {
                            placeHolder: nls.localize('chooseLocation', 'Choose the specific location'),
                        });
                        if (!pick) {
                            return;
                        }
                        id = pick._id;
                    }
                    return await stackFrame.thread.session
                        .goto(stackFrame.thread.threadId, id)
                        .catch((e) => notificationService.warn(e));
                }
            }
        }
        return notificationService.warn(nls.localize('noExecutableCode', 'No executable code is associated at the current cursor position.'));
    },
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_TOP_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        goToTopOfCallStack(debugService);
    },
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_BOTTOM_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        await goToBottomOfCallStack(debugService);
    },
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_UP_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        navigateCallStack(debugService, false);
    },
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_DOWN_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        navigateCallStack(debugService, true);
    },
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    command: {
        id: JUMP_TO_CURSOR_ID,
        title: nls.localize('jumpToCursor', 'Jump to Cursor'),
        category: DEBUG_COMMAND_CATEGORY,
    },
    when: ContextKeyExpr.and(CONTEXT_JUMP_TO_CURSOR_SUPPORTED, EditorContextKeys.editorTextFocus),
    group: 'debug',
    order: 3,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: NEXT_DEBUG_CONSOLE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: CONTEXT_IN_DEBUG_REPL,
    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */ },
    handler: async (accessor, _, context) => {
        changeDebugConsoleFocus(accessor, true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: PREV_DEBUG_CONSOLE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: CONTEXT_IN_DEBUG_REPL,
    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */ },
    handler: async (accessor, _, context) => {
        changeDebugConsoleFocus(accessor, false);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: RESTART_SESSION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */,
    when: CONTEXT_IN_DEBUG_MODE,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        const configurationService = accessor.get(IConfigurationService);
        let session;
        if (isSessionContext(context)) {
            session = debugService.getModel().getSession(context.sessionId);
        }
        else {
            session = debugService.getViewModel().focusedSession;
        }
        if (!session) {
            const { launch, name } = debugService.getConfigurationManager().selectedConfiguration;
            await debugService.startDebugging(launch, name, { noDebug: false, startedByUser: true });
        }
        else {
            const showSubSessions = configurationService.getValue('debug').showSubSessionsInToolBar;
            // Stop should be sent to the root parent session
            while (!showSubSessions && session.lifecycleManagedByParent && session.parentSession) {
                session = session.parentSession;
            }
            session.removeReplExpressions();
            await debugService.restartSession(session);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_OVER_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 68 /* KeyCode.F10 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.next('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.next());
        }
    },
});
// Windows browsers use F11 for full screen, thus use alt+F11 as the default shortcut
const STEP_INTO_KEYBINDING = isWeb && isWindows ? 512 /* KeyMod.Alt */ | 69 /* KeyCode.F11 */ : 69 /* KeyCode.F11 */;
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_INTO_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // Have a stronger weight to have priority over full screen when debugging
    primary: STEP_INTO_KEYBINDING,
    // Use a more flexible when clause to not allow full screen command to take over when F11 pressed a lot of times
    when: CONTEXT_DEBUG_STATE.notEqualsTo('inactive'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepIn('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepIn());
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_OUT_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 69 /* KeyCode.F11 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepOut('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepOut());
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: PAUSE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2, // take priority over focus next part while we are debugging
    primary: 64 /* KeyCode.F6 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('running'),
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, (thread) => thread.pause());
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_INTO_TARGET_ID,
    primary: STEP_INTO_KEYBINDING | 2048 /* KeyMod.CtrlCmd */,
    when: ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped')),
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor, _, context) => {
        const quickInputService = accessor.get(IQuickInputService);
        const debugService = accessor.get(IDebugService);
        const session = debugService.getViewModel().focusedSession;
        const frame = debugService.getViewModel().focusedStackFrame;
        if (!frame || !session) {
            return;
        }
        const editor = await accessor.get(IEditorService).openEditor({
            resource: frame.source.uri,
            options: { revealIfOpened: true },
        });
        let codeEditor;
        if (editor) {
            const ctrl = editor?.getControl();
            if (isCodeEditor(ctrl)) {
                codeEditor = ctrl;
            }
        }
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.busy = true;
        qp.show();
        disposables.add(qp.onDidChangeActive(([item]) => {
            if (codeEditor && item && item.target.line !== undefined) {
                codeEditor.revealLineInCenterIfOutsideViewport(item.target.line);
                codeEditor.setSelection({
                    startLineNumber: item.target.line,
                    startColumn: item.target.column || 1,
                    endLineNumber: item.target.endLine || item.target.line,
                    endColumn: item.target.endColumn || item.target.column || 1,
                });
            }
        }));
        disposables.add(qp.onDidAccept(() => {
            if (qp.activeItems.length) {
                session.stepIn(frame.thread.threadId, qp.activeItems[0].target.id);
            }
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        session.stepInTargets(frame.frameId).then((targets) => {
            qp.busy = false;
            if (targets?.length) {
                qp.items = targets?.map((target) => ({ target, label: target.label }));
            }
            else {
                qp.placeholder = nls.localize('editor.debug.action.stepIntoTargets.none', 'No step targets available');
            }
        });
    },
});
async function stopHandler(accessor, _, context, disconnect, suspend) {
    const debugService = accessor.get(IDebugService);
    let session;
    if (isSessionContext(context)) {
        session = debugService.getModel().getSession(context.sessionId);
    }
    else {
        session = debugService.getViewModel().focusedSession;
    }
    const configurationService = accessor.get(IConfigurationService);
    const showSubSessions = configurationService.getValue('debug').showSubSessionsInToolBar;
    // Stop should be sent to the root parent session
    while (!showSubSessions && session && session.lifecycleManagedByParent && session.parentSession) {
        session = session.parentSession;
    }
    await debugService.stopSession(session, disconnect, suspend);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DISCONNECT_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_IN_DEBUG_MODE),
    handler: (accessor, _, context) => stopHandler(accessor, _, context, true),
});
CommandsRegistry.registerCommand({
    id: DISCONNECT_AND_SUSPEND_ID,
    handler: (accessor, _, context) => stopHandler(accessor, _, context, true, true),
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STOP_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_IN_DEBUG_MODE),
    handler: (accessor, _, context) => stopHandler(accessor, _, context, false),
});
CommandsRegistry.registerCommand({
    id: RESTART_FRAME_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        const notificationService = accessor.get(INotificationService);
        const frame = getFrame(debugService, context);
        if (frame) {
            try {
                await frame.restart();
            }
            catch (e) {
                notificationService.error(e);
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CONTINUE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // Use a stronger weight to get priority over start debugging F5 shortcut
    primary: 63 /* KeyCode.F5 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, (thread) => thread.continue());
    },
});
CommandsRegistry.registerCommand({
    id: SHOW_LOADED_SCRIPTS_ID,
    handler: async (accessor) => {
        await showLoadedScriptMenu(accessor);
    },
});
CommandsRegistry.registerCommand({
    id: 'debug.startFromConfig',
    handler: async (accessor, config) => {
        const debugService = accessor.get(IDebugService);
        await debugService.startDebugging(undefined, config);
    },
});
CommandsRegistry.registerCommand({
    id: FOCUS_SESSION_ID,
    handler: async (accessor, session) => {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const stoppedChildSession = debugService
            .getModel()
            .getSessions()
            .find((s) => s.parentSession === session && s.state === 2 /* State.Stopped */);
        if (stoppedChildSession && session.state !== 2 /* State.Stopped */) {
            session = stoppedChildSession;
        }
        await debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        if (stackFrame) {
            await stackFrame.openInEditor(editorService, true);
        }
    },
});
CommandsRegistry.registerCommand({
    id: SELECT_AND_START_ID,
    handler: async (accessor, debugType, debugStartOptions) => {
        const quickInputService = accessor.get(IQuickInputService);
        const debugService = accessor.get(IDebugService);
        if (debugType) {
            const configManager = debugService.getConfigurationManager();
            const dynamicProviders = await configManager.getDynamicProviders();
            for (const provider of dynamicProviders) {
                if (provider.type === debugType) {
                    const pick = await provider.pick();
                    if (pick) {
                        await configManager.selectConfiguration(pick.launch, pick.config.name, pick.config, {
                            type: provider.type,
                        });
                        debugService.startDebugging(pick.launch, pick.config, {
                            noDebug: debugStartOptions?.noDebug,
                            startedByUser: true,
                        });
                        return;
                    }
                }
            }
        }
        quickInputService.quickAccess.show(DEBUG_QUICK_ACCESS_PREFIX);
    },
});
CommandsRegistry.registerCommand({
    id: SELECT_DEBUG_CONSOLE_ID,
    handler: async (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(DEBUG_CONSOLE_QUICK_ACCESS_PREFIX);
    },
});
CommandsRegistry.registerCommand({
    id: SELECT_DEBUG_SESSION_ID,
    handler: async (accessor) => {
        showDebugSessionMenu(accessor, SELECT_AND_START_ID);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DEBUG_START_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.isEqualTo('inactive')),
    handler: async (accessor, debugStartOptions) => {
        const debugService = accessor.get(IDebugService);
        await saveAllBeforeDebugStart(accessor.get(IConfigurationService), accessor.get(IEditorService));
        const { launch, name, getConfig } = debugService.getConfigurationManager().selectedConfiguration;
        const config = await getConfig();
        const configOrName = config ? Object.assign(deepClone(config), debugStartOptions?.config) : name;
        await debugService.startDebugging(launch, configOrName, { noDebug: debugStartOptions?.noDebug, startedByUser: true }, false);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DEBUG_RUN_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 63 /* KeyCode.F5 */ },
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */))),
    handler: async (accessor) => {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(DEBUG_START_COMMAND_ID, { noDebug: true });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.toggleBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, InputFocusedContext.toNegated()),
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            if (focused && focused.length) {
                debugService.enableOrDisableBreakpoints(!focused[0].enabled, focused[0]);
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.enableOrDisableBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: undefined,
    when: EditorContextKeys.editorTextFocus,
    handler: (accessor) => {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const control = editorService.activeTextEditorControl;
        if (isCodeEditor(control)) {
            const model = control.getModel();
            if (model) {
                const position = control.getPosition();
                if (position) {
                    const bps = debugService
                        .getModel()
                        .getBreakpoints({ uri: model.uri, lineNumber: position.lineNumber });
                    if (bps.length) {
                        debugService.enableOrDisableBreakpoints(!bps[0].enabled, bps[0]);
                    }
                }
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: EDIT_EXPRESSION_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: CONTEXT_WATCH_EXPRESSIONS_FOCUSED,
    primary: 60 /* KeyCode.F2 */,
    mac: { primary: 3 /* KeyCode.Enter */ },
    handler: (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (!(expression instanceof Expression)) {
            const listService = accessor.get(IListService);
            const focused = listService.lastFocusedList;
            if (focused) {
                const elements = focused.getFocus();
                if (Array.isArray(elements) && elements[0] instanceof Expression) {
                    expression = elements[0];
                }
            }
        }
        if (expression instanceof Expression) {
            debugService.getViewModel().setSelectedExpression(expression, false);
        }
    },
});
CommandsRegistry.registerCommand({
    id: SET_EXPRESSION_COMMAND_ID,
    handler: async (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (expression instanceof Expression || expression instanceof Variable) {
            debugService.getViewModel().setSelectedExpression(expression, true);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.setVariable',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: CONTEXT_VARIABLES_FOCUSED,
    primary: 60 /* KeyCode.F2 */,
    mac: { primary: 3 /* KeyCode.Enter */ },
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const focused = listService.lastFocusedList;
        if (focused) {
            const elements = focused.getFocus();
            if (Array.isArray(elements) && elements[0] instanceof Variable) {
                debugService.getViewModel().setSelectedExpression(elements[0], false);
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: REMOVE_EXPRESSION_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_EXPRESSION_SELECTED.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
    handler: (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (expression instanceof Expression) {
            debugService.removeWatchExpressions(expression.getId());
            return;
        }
        const listService = accessor.get(IListService);
        const focused = listService.lastFocusedList;
        if (focused) {
            let elements = focused.getFocus();
            if (Array.isArray(elements) && elements[0] instanceof Expression) {
                const selection = focused.getSelection();
                if (selection && selection.indexOf(elements[0]) >= 0) {
                    elements = selection;
                }
                elements.forEach((e) => debugService.removeWatchExpressions(e.getId()));
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.removeBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_INPUT_FOCUSED.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            const element = focused.length ? focused[0] : undefined;
            if (element instanceof Breakpoint) {
                debugService.removeBreakpoints(element.getId());
            }
            else if (element instanceof FunctionBreakpoint) {
                debugService.removeFunctionBreakpoints(element.getId());
            }
            else if (element instanceof DataBreakpoint) {
                debugService.removeDataBreakpoints(element.getId());
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.installAdditionalDebuggers',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: undefined,
    handler: async (accessor, query) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        let searchFor = `@category:debuggers`;
        if (typeof query === 'string') {
            searchFor += ` ${query}`;
        }
        return extensionsWorkbenchService.openSearch(searchFor);
    },
});
registerAction2(class AddConfigurationAction extends Action2 {
    constructor() {
        super({
            id: ADD_CONFIGURATION_ID,
            title: nls.localize2('addConfiguration', 'Add Configuration...'),
            category: DEBUG_COMMAND_CATEGORY,
            f1: true,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]launch\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID)),
            },
        });
    }
    async run(accessor, launchUri) {
        const manager = accessor.get(IDebugService).getConfigurationManager();
        const launch = manager.getLaunches().find((l) => l.uri.toString() === launchUri) ||
            manager.selectedConfiguration.launch;
        if (launch) {
            const { editor, created } = await launch.openConfigFile({ preserveFocus: false });
            if (editor && !created) {
                const codeEditor = editor.getControl();
                if (codeEditor) {
                    await codeEditor
                        .getContribution(EDITOR_CONTRIBUTION_ID)
                        ?.addLaunchConfiguration();
                }
            }
        }
    }
});
const inlineBreakpointHandler = (accessor) => {
    const debugService = accessor.get(IDebugService);
    const editorService = accessor.get(IEditorService);
    const control = editorService.activeTextEditorControl;
    if (isCodeEditor(control)) {
        const position = control.getPosition();
        if (position && control.hasModel() && debugService.canSetBreakpointsIn(control.getModel())) {
            const modelUri = control.getModel().uri;
            const breakpointAlreadySet = debugService
                .getModel()
                .getBreakpoints({ lineNumber: position.lineNumber, uri: modelUri })
                .some((bp) => bp.sessionAgnosticData.column === position.column ||
                (!bp.column && position.column <= 1));
            if (!breakpointAlreadySet) {
                debugService.addBreakpoints(modelUri, [
                    {
                        lineNumber: position.lineNumber,
                        column: position.column > 1 ? position.column : undefined,
                    },
                ]);
            }
        }
    }
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 67 /* KeyCode.F9 */,
    when: EditorContextKeys.editorTextFocus,
    id: TOGGLE_INLINE_BREAKPOINT_ID,
    handler: inlineBreakpointHandler,
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    command: {
        id: TOGGLE_INLINE_BREAKPOINT_ID,
        title: nls.localize('addInlineBreakpoint', 'Add Inline Breakpoint'),
        category: DEBUG_COMMAND_CATEGORY,
    },
    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.toNegated()),
    group: 'debug',
    order: 1,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.openBreakpointToSide',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: CONTEXT_BREAKPOINTS_FOCUSED,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    secondary: [512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */],
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focus = list.getFocusedElements();
            if (focus.length && focus[0] instanceof Breakpoint) {
                return openBreakpointSource(focus[0], true, false, true, accessor.get(IDebugService), accessor.get(IEditorService));
            }
        }
        return undefined;
    },
});
// When there are no debug extensions, open the debug viewlet when F5 is pressed so the user can read the limitations
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.openView',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: CONTEXT_DEBUGGERS_AVAILABLE.toNegated(),
    primary: 63 /* KeyCode.F5 */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */],
    handler: async (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        await paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUNOLGFBQWEsRUFFYiwyQkFBMkIsRUFDM0IsaUNBQWlDLEVBQ2pDLHlCQUF5QixFQUN6QixzQkFBc0IsRUFFdEIscUJBQXFCLEVBQ3JCLDJCQUEyQixFQUszQixtQkFBbUIsRUFFbkIsZ0NBQWdDLEVBQ2hDLFlBQVksRUFDWiwyQkFBMkIsRUFFM0IsYUFBYSxFQUNiLGdDQUFnQyxFQUNoQyxpQ0FBaUMsRUFDakMsVUFBVSxFQUNWLDhCQUE4QixFQUM5QixxQkFBcUIsRUFDckIsbUNBQW1DLEVBQ25DLG1CQUFtQixHQUNuQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFDTixVQUFVLEVBQ1YsUUFBUSxFQUNSLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsY0FBYyxHQUVkLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkYsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLE9BQU8sRUFDUCxlQUFlLEdBQ2YsTUFBTSxn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