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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixhQUFhLEVBRWIsMkJBQTJCLEVBQzNCLGlDQUFpQyxFQUNqQyx5QkFBeUIsRUFDekIsc0JBQXNCLEVBRXRCLHFCQUFxQixFQUNyQiwyQkFBMkIsRUFLM0IsbUJBQW1CLEVBRW5CLGdDQUFnQyxFQUNoQyxZQUFZLEVBQ1osMkJBQTJCLEVBRTNCLGFBQWEsRUFDYixnQ0FBZ0MsRUFDaEMsaUNBQWlDLEVBQ2pDLFVBQVUsRUFDViw4QkFBOEIsRUFDOUIscUJBQXFCLEVBQ3JCLG1DQUFtQyxFQUNuQyxtQkFBbUIsR0FDbkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQ04sVUFBVSxFQUNWLFFBQVEsRUFDUixVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGNBQWMsR0FFZCxNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25GLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixPQUFPLEVBQ1AsZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFM0YsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsa0JBQWtCLEdBQ2xCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ2hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQTtBQUM1RCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyw0Q0FBNEMsQ0FBQTtBQUN2RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQTtBQUN6RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyx3Q0FBd0MsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsaUNBQWlDLENBQUE7QUFDN0QsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZ0NBQWdDLENBQUE7QUFDbEUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsd0NBQXdDLENBQUE7QUFDM0UsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLGlDQUFpQyxDQUFBO0FBQzdELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxpQ0FBaUMsQ0FBQTtBQUM3RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyx1Q0FBdUMsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZ0NBQWdDLENBQUE7QUFDM0QsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLDhCQUE4QixDQUFBO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxtQ0FBbUMsQ0FBQTtBQUNoRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyw2Q0FBNkMsQ0FBQTtBQUN0RixNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsNkJBQTZCLENBQUE7QUFDcEQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcscUNBQXFDLENBQUE7QUFDckUsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGlDQUFpQyxDQUFBO0FBQzVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxrQ0FBa0MsQ0FBQTtBQUMvRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQTtBQUNyRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxxQ0FBcUMsQ0FBQTtBQUNyRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyx1Q0FBdUMsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRywyQ0FBMkMsQ0FBQTtBQUNsRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRywyQ0FBMkMsQ0FBQTtBQUNsRixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxrQ0FBa0MsQ0FBQTtBQUM1RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyw4QkFBOEIsQ0FBQTtBQUNwRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyw0QkFBNEIsQ0FBQTtBQUNoRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyw2QkFBNkIsQ0FBQTtBQUN2RSxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRywyQkFBMkIsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRywwQkFBMEIsQ0FBQTtBQUNuRSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw2QkFBNkIsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxvQ0FBb0MsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxvQ0FBb0MsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRywwQ0FBMEMsQ0FBQTtBQUNoRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxxQ0FBcUMsQ0FBQTtBQUNyRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyx3Q0FBd0MsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsb0NBQW9DLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsc0NBQXNDLENBQUE7QUFDdkUsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLDZCQUE2QixDQUFBO0FBQzVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLHdCQUF3QixDQUFBO0FBQzdELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRywwQ0FBMEMsQ0FBQTtBQUV2RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBcUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDdkYsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0FBQ3JFLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7QUFDMUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO0FBQzlGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUN2RSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDekUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FDeEQsbUJBQW1CLEVBQ25CLHdCQUF3QixDQUN4QixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUN4RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQTtBQUNqRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUNsRCx5QkFBeUIsRUFDekIsNEJBQTRCLENBQzVCLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtBQUNoRyxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0FBQy9FLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLHlCQUF5QixDQUFDLENBQUE7QUFDaEcsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FDcEQsa0JBQWtCLEVBQ2xCLDBCQUEwQixDQUMxQixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FDcEQsa0JBQWtCLEVBQ2xCLDhCQUE4QixDQUM5QixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0FBQ25HLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLCtCQUErQixDQUFDLENBQUE7QUFDakcsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FDbEQsaUJBQWlCLEVBQ2pCLGtDQUFrQyxDQUNsQyxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtBQUN4RixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO0FBQzlGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtBQUMvRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQTtBQUN4RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxDQUFBO0FBRXhGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQ3RELG9CQUFvQixFQUNwQixzQkFBc0IsQ0FDdEIsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQ3RELG9CQUFvQixFQUNwQixzQkFBc0IsQ0FDdEIsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQTtBQUNqRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxpQkFBaUIsQ0FBQTtBQVFsRSxTQUFTLGVBQWUsQ0FBQyxHQUFRO0lBQ2hDLE9BQU8sR0FBRyxJQUFJLE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQTtBQUNwRixDQUFDO0FBRUQsS0FBSyxVQUFVLGVBQWUsQ0FDN0IsUUFBMEIsRUFDMUIsa0JBQThDLEVBQzlDLEdBQXVDO0lBRXZDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsSUFBSSxNQUEyQixDQUFBO0lBQy9CLElBQUksZUFBZSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hGLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7SUFDRixDQUFDO1NBQU0sSUFBSSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7UUFDakQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoRixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDckQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWEsQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxDQUFBO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDM0UsTUFBTSxHQUFHLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUM1RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBUTtJQUNwQyxPQUFPLENBQ04sR0FBRztRQUNILE9BQU8sR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRO1FBQ2pDLE9BQU8sR0FBRyxDQUFDLFFBQVEsS0FBSyxRQUFRO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQy9CLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQ2hCLFlBQTJCLEVBQzNCLE9BQW1DO0lBRW5DLElBQUksbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsRixJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU8sTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMxRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUE7SUFDckQsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEdBQVE7SUFDakMsT0FBTyxHQUFHLElBQUksT0FBTyxHQUFHLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQTtBQUNoRCxDQUFDO0FBRUQsS0FBSyxVQUFVLHVCQUF1QixDQUFDLFFBQTBCLEVBQUUsSUFBYTtJQUMvRSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsTUFBTSxRQUFRLEdBQUcsWUFBWTtTQUMzQixRQUFRLEVBQUU7U0FDVixXQUFXLENBQUMsSUFBSSxDQUFDO1NBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUE7SUFDcEMsSUFBSSxXQUFXLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsQ0FBQTtJQUU1RCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7SUFDakIsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUN4QyxPQUFPLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO1lBQ3RELFdBQVcsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFBO1FBQ3hDLENBQUM7UUFFRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDL0MsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixTQUFTLEdBQUcsU0FBUyxLQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7WUFDbEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUVqRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQy9DLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDaEQsQ0FBQztBQUNGLENBQUM7QUFFRCxLQUFLLFVBQVUsaUJBQWlCLENBQUMsWUFBMkIsRUFBRSxJQUFhO0lBQzFFLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQTtJQUMzRCxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6RSxJQUFJLGdCQUFnQixDQUFBO1FBQ3BCLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLEtBQUssSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxJQUFhLEtBQUssQ0FBQyxNQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDbEQsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQ2hDLE9BQU07Z0JBQ1AsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUM5RCxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtvQkFDdkMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN0RSxDQUFDO1lBQ0YsQ0FBQztZQUNELGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEUsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDaEIscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ25DLE9BQU07WUFDUCxDQUFDO1lBQ0QsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQy9GLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELEtBQUssVUFBVSxxQkFBcUIsQ0FBQyxZQUEyQjtJQUMvRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYSxDQUFBO0lBQ3hELElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixNQUFNLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3ZDLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxzRUFBc0U7WUFDekksSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixZQUFZLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7b0JBQ3BFLGFBQWEsRUFBRSxLQUFLO2lCQUNwQixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxZQUEyQjtJQUN0RCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYSxDQUFBO0lBRXhELElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixZQUFZLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUU7WUFDN0UsYUFBYSxFQUFFLEtBQUs7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztBQUNGLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLG9CQUFvQixDQUM1QixJQUFhLEVBQ2IsU0FBaUMsRUFDakMsVUFBa0I7SUFFbEIsSUFBSSxVQUFVLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BDLFVBQVUsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUNsQyxDQUFDO1NBQU0sSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDM0IsVUFBVSxHQUFHLENBQUMsQ0FBQTtJQUNmLENBQUM7SUFFRCxJQUFJLEtBQUssR0FBRyxVQUFVLENBQUE7SUFFdEIsSUFBSSxTQUFTLENBQUE7SUFDYixHQUFHLENBQUM7UUFDSCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxHQUFHLENBQUMsQ0FBQTtZQUNWLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLEVBQUUsQ0FBQTtZQUNSLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQixLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDN0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssRUFBRSxDQUFBO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFFRCxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDLFFBQVEsS0FBSyxLQUFLLFVBQVUsRUFBQyxDQUFDLDhGQUE4RjtJQUU3SCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsc0lBQXNJO0FBQ3RJLG9JQUFvSTtBQUNwSSxtS0FBbUs7QUFDbksscURBQXFEO0FBQ3JELGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsbUJBQW1CO0lBQ3ZCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sNkJBQTZCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxHQUFHLEdBQUcsNkJBQTZCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEUsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQy9CLEtBQUssQ0FBQyxNQUFNO2lCQUNWLFlBQVksRUFBRTtpQkFDZCxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztpQkFDMUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUNYLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsbUJBQW1CO0lBQ3ZCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLFlBQVk7SUFDaEIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsSUFBSSw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUM5RixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsTUFBTSxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDekUsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsaUJBQWlCO0lBQ3JCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO1FBQzdDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLGlCQUFpQixDQUFBO1FBQ2hFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQUE7UUFDakUsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsSUFBSSxVQUFVLElBQUksWUFBWSxDQUFDLG1CQUFtQixDQUFDLElBQUksbUJBQW1CLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN2RixNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNsRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUE7WUFDbkQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2xFLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQzNELE1BQU0sQ0FBQyxHQUFHLEVBQ1YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sQ0FDZixDQUFBO2dCQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFBO2dCQUN0QyxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQy9CLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7b0JBQ3RCLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDeEIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO3dCQUNqRSxNQUFNLElBQUksR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7NEJBQ2hELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDhCQUE4QixDQUFDO3lCQUMzRSxDQUFDLENBQUE7d0JBQ0YsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNYLE9BQU07d0JBQ1AsQ0FBQzt3QkFFRCxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtvQkFDZCxDQUFDO29CQUVELE9BQU8sTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU87eUJBQ3BDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7eUJBQ3BDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUM5QixHQUFHLENBQUMsUUFBUSxDQUNYLGtCQUFrQixFQUNsQixrRUFBa0UsQ0FDbEUsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsZ0JBQWdCO0lBQ3BCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDakMsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsbUJBQW1CO0lBQ3ZCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxlQUFlO0lBQ25CLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsaUJBQWlCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLGlCQUFpQjtJQUNyQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsQ0FBUyxFQUFFLE9BQW1DLEVBQUUsRUFBRTtRQUM3RixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELGlCQUFpQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO0lBQ2pELE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxpQkFBaUI7UUFDckIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGdCQUFnQixDQUFDO1FBQ3JELFFBQVEsRUFBRSxzQkFBc0I7S0FDaEM7SUFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUM7SUFDN0YsS0FBSyxFQUFFLE9BQU87SUFDZCxLQUFLLEVBQUUsQ0FBQztDQUNSLENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxxQkFBcUI7SUFDekIsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO0lBQzdDLElBQUksRUFBRSxxQkFBcUI7SUFDM0IsT0FBTyxFQUFFLHFEQUFpQztJQUMxQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsbURBQTZCLGdDQUF1QixFQUFFO0lBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixNQUFNLEVBQUUsOENBQW9DLENBQUM7SUFDN0MsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixPQUFPLEVBQUUsbURBQStCO0lBQ3hDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxtREFBNkIsK0JBQXNCLEVBQUU7SUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsdUJBQXVCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsa0JBQWtCO0lBQ3RCLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxtREFBNkIsc0JBQWE7SUFDbkQsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsQ0FBUyxFQUFFLE9BQW1DLEVBQUUsRUFBRTtRQUM3RixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLElBQUksT0FBa0MsQ0FBQTtRQUN0QyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7UUFDckQsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUMscUJBQXFCLENBQUE7WUFDckYsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxlQUFlLEdBQ3BCLG9CQUFvQixDQUFDLFFBQVEsQ0FBc0IsT0FBTyxDQUFDLENBQUMsd0JBQXdCLENBQUE7WUFDckYsaURBQWlEO1lBQ2pELE9BQU8sQ0FBQyxlQUFlLElBQUksT0FBTyxDQUFDLHdCQUF3QixJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdEYsT0FBTyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUE7WUFDaEMsQ0FBQztZQUNELE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQy9CLE1BQU0sWUFBWSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxZQUFZO0lBQ2hCLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sc0JBQWE7SUFDcEIsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7SUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsSUFBSSw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUMxRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYscUZBQXFGO0FBQ3JGLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsMkNBQXdCLENBQUMsQ0FBQyxxQkFBWSxDQUFBO0FBRXhGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxZQUFZO0lBQ2hCLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRSxFQUFFLDBFQUEwRTtJQUMxSCxPQUFPLEVBQUUsb0JBQW9CO0lBQzdCLGdIQUFnSDtJQUNoSCxJQUFJLEVBQUUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztJQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsQ0FBUyxFQUFFLE9BQW1DLEVBQUUsRUFBRTtRQUM3RixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxJQUFJLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDaEUsTUFBTSxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQWUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzVGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQWUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDL0UsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsV0FBVztJQUNmLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSw4Q0FBMEI7SUFDbkMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7SUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsSUFBSSw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUM3RixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLFFBQVE7SUFDWixNQUFNLEVBQUUsOENBQW9DLENBQUMsRUFBRSw0REFBNEQ7SUFDM0csT0FBTyxxQkFBWTtJQUNuQixJQUFJLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztJQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsQ0FBUyxFQUFFLE9BQW1DLEVBQUUsRUFBRTtRQUM3RixNQUFNLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLG1CQUFtQjtJQUN2QixPQUFPLEVBQUUsb0JBQW9CLDRCQUFpQjtJQUM5QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUNBQW1DLEVBQ25DLHFCQUFxQixFQUNyQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQ3hDO0lBQ0QsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLENBQVMsRUFBRSxPQUFtQyxFQUFFLEVBQUU7UUFDN0YsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxDQUFBO1FBQzFELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQTtRQUMzRCxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQzVELFFBQVEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7WUFDMUIsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTtTQUNqQyxDQUFDLENBQUE7UUFFRixJQUFJLFVBQW1DLENBQUE7UUFDdkMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQTtZQUNqQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QixVQUFVLEdBQUcsSUFBSSxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBTUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBZSxDQUFDLENBQUE7UUFDNUUsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDZCxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFVCxXQUFXLENBQUMsR0FBRyxDQUNkLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUMvQixJQUFJLFVBQVUsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFELFVBQVUsQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoRSxVQUFVLENBQUMsWUFBWSxDQUFDO29CQUN2QixlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO29CQUNqQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQztvQkFDcEMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtvQkFDdEQsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUM7aUJBQzNELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNuQixJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxRCxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNyRCxFQUFFLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQTtZQUNmLElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUNyQixFQUFFLENBQUMsS0FBSyxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEVBQUUsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDNUIsMENBQTBDLEVBQzFDLDJCQUEyQixDQUMzQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLEtBQUssVUFBVSxXQUFXLENBQ3pCLFFBQTBCLEVBQzFCLENBQVMsRUFDVCxPQUFtQyxFQUNuQyxVQUFtQixFQUNuQixPQUFpQjtJQUVqQixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELElBQUksT0FBa0MsQ0FBQTtJQUN0QyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7SUFDckQsQ0FBQztJQUVELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sZUFBZSxHQUNwQixvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLHdCQUF3QixDQUFBO0lBQ3JGLGlEQUFpRDtJQUNqRCxPQUFPLENBQUMsZUFBZSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsd0JBQXdCLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2pHLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxNQUFNLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUM3RCxDQUFDO0FBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLGFBQWE7SUFDakIsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyxFQUFFLDZDQUF5QjtJQUNsQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxxQkFBcUIsQ0FBQztJQUNsRixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQztDQUMxRSxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHlCQUF5QjtJQUM3QixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Q0FDaEYsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLE9BQU87SUFDWCxNQUFNLDZDQUFtQztJQUN6QyxPQUFPLEVBQUUsNkNBQXlCO0lBQ2xDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLFNBQVMsRUFBRSxFQUFFLHFCQUFxQixDQUFDO0lBQzlGLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDO0NBQzNFLENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsZ0JBQWdCO0lBQ3BCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDO2dCQUNKLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3RCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsV0FBVztJQUNmLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRSxFQUFFLHlFQUF5RTtJQUN6SCxPQUFPLHFCQUFZO0lBQ25CLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0lBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxDQUFTLEVBQUUsT0FBbUMsRUFBRSxFQUFFO1FBQzdGLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQzNCLE1BQU0sb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsdUJBQXVCO0lBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQWUsRUFBRSxFQUFFO1FBQzVDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxnQkFBZ0I7SUFDcEIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLE9BQXNCLEVBQUUsRUFBRTtRQUNyRSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxZQUFZO2FBQ3RDLFFBQVEsRUFBRTthQUNWLFdBQVcsRUFBRTthQUNiLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsS0FBSyxPQUFPLElBQUksQ0FBQyxDQUFDLEtBQUssMEJBQWtCLENBQUMsQ0FBQTtRQUN2RSxJQUFJLG1CQUFtQixJQUFJLE9BQU8sQ0FBQyxLQUFLLDBCQUFrQixFQUFFLENBQUM7WUFDNUQsT0FBTyxHQUFHLG1CQUFtQixDQUFBO1FBQzlCLENBQUM7UUFDRCxNQUFNLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsaUJBQWlCLENBQUE7UUFDaEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLFVBQVUsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25ELENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsT0FBTyxFQUFFLEtBQUssRUFDYixRQUEwQixFQUMxQixTQUEyQixFQUMzQixpQkFBeUMsRUFDeEMsRUFBRTtRQUNILE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFaEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1lBQzVELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtZQUNsRSxLQUFLLE1BQU0sUUFBUSxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3pDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ2xDLElBQUksSUFBSSxFQUFFLENBQUM7d0JBQ1YsTUFBTSxhQUFhLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFOzRCQUNuRixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7eUJBQ25CLENBQUMsQ0FBQTt3QkFDRixZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRTs0QkFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU87NEJBQ25DLGFBQWEsRUFBRSxJQUFJO3lCQUNuQixDQUFDLENBQUE7d0JBRUYsT0FBTTtvQkFDUCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsaUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHVCQUF1QjtJQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtRQUM3QyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixNQUFNLDZDQUFtQztJQUN6QyxPQUFPLHFCQUFZO0lBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUNiLFFBQTBCLEVBQzFCLGlCQUFvRSxFQUNuRSxFQUFFO1FBQ0gsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDaEcsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUMscUJBQXFCLENBQUE7UUFDaEcsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDaEcsTUFBTSxZQUFZLENBQUMsY0FBYyxDQUNoQyxNQUFNLEVBQ04sWUFBWSxFQUNaLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQzVELEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxvQkFBb0I7SUFDeEIsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyxFQUFFLCtDQUEyQjtJQUNwQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsOENBQTJCLEVBQUU7SUFDN0MsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDJCQUEyQixFQUMzQixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsYUFBYSw0QkFBb0IsQ0FBQyxDQUNsRTtJQUNELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO1FBQzdDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDL0UsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSx3QkFBd0I7SUFDNUIsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO0lBQzdDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3RGLE9BQU8sd0JBQWU7SUFDdEIsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7UUFDeEMsSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFLENBQUM7WUFDMUIsTUFBTSxPQUFPLEdBQWtCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1lBQ3hELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsaUNBQWlDO0lBQ3JDLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlO0lBQ3ZDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQUE7UUFDckQsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMzQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDaEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3RDLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsTUFBTSxHQUFHLEdBQUcsWUFBWTt5QkFDdEIsUUFBUSxFQUFFO3lCQUNWLGNBQWMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtvQkFDckUsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2hCLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2pFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSwwQkFBMEI7SUFDOUIsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO0lBQzdDLElBQUksRUFBRSxpQ0FBaUM7SUFDdkMsT0FBTyxxQkFBWTtJQUNuQixHQUFHLEVBQUUsRUFBRSxPQUFPLHVCQUFlLEVBQUU7SUFDL0IsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxVQUFnQyxFQUFFLEVBQUU7UUFDekUsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsQ0FBQyxVQUFVLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7WUFDM0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ25DLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxFQUFFLENBQUM7b0JBQ2xFLFVBQVUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksVUFBVSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHlCQUF5QjtJQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsVUFBZ0MsRUFBRSxFQUFFO1FBQy9FLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsSUFBSSxVQUFVLFlBQVksVUFBVSxJQUFJLFVBQVUsWUFBWSxRQUFRLEVBQUUsQ0FBQztZQUN4RSxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BFLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLG1CQUFtQjtJQUN2QixNQUFNLEVBQUUsOENBQW9DLENBQUM7SUFDN0MsSUFBSSxFQUFFLHlCQUF5QjtJQUMvQixPQUFPLHFCQUFZO0lBQ25CLEdBQUcsRUFBRSxFQUFFLE9BQU8sdUJBQWUsRUFBRTtJQUMvQixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQTtRQUUzQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25DLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksUUFBUSxFQUFFLENBQUM7Z0JBQ2hFLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLDRCQUE0QjtJQUNoQyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsaUNBQWlDLEVBQ2pDLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxDQUN2QztJQUNELE9BQU8seUJBQWdCO0lBQ3ZCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxxREFBa0MsRUFBRTtJQUNwRCxPQUFPLEVBQUUsQ0FBQyxRQUEwQixFQUFFLFVBQWdDLEVBQUUsRUFBRTtRQUN6RSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRWhELElBQUksVUFBVSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ3RDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN2RCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQTtRQUMzQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ2pDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQ2xFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtnQkFDeEMsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdEQsUUFBUSxHQUFHLFNBQVMsQ0FBQTtnQkFDckIsQ0FBQztnQkFDRCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBYSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsd0JBQXdCO0lBQzVCLE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QiwyQkFBMkIsRUFDM0IsZ0NBQWdDLENBQUMsU0FBUyxFQUFFLENBQzVDO0lBQ0QsT0FBTyx5QkFBZ0I7SUFDdkIsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLHFEQUFrQyxFQUFFO0lBQ3BELE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFBO1FBRXhDLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO1lBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ3ZELElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDaEQsQ0FBQztpQkFBTSxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO2dCQUNsRCxZQUFZLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDeEQsQ0FBQztpQkFBTSxJQUFJLE9BQU8sWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDOUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxrQ0FBa0M7SUFDdEMsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLFNBQVM7SUFDZixPQUFPLEVBQUUsU0FBUztJQUNsQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFhLEVBQUUsRUFBRTtRQUMxQyxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM1RSxJQUFJLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQTtRQUNyQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLFNBQVMsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ3pCLENBQUM7UUFDRCxPQUFPLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZUFBZSxDQUNkLE1BQU0sc0JBQXVCLFNBQVEsT0FBTztJQUMzQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsc0JBQXNCLENBQUM7WUFDaEUsUUFBUSxFQUFFLHNCQUFzQjtZQUNoQyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWE7Z0JBQ3hCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsRUFDL0UsbUJBQW1CLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQ2xEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFNBQWlCO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUVyRSxNQUFNLE1BQU0sR0FDWCxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFNBQVMsQ0FBQztZQUNqRSxPQUFPLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFBO1FBQ3JDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ2pGLElBQUksTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sVUFBVSxHQUFnQixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7Z0JBQ25ELElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sVUFBVTt5QkFDZCxlQUFlLENBQTJCLHNCQUFzQixDQUFDO3dCQUNsRSxFQUFFLHNCQUFzQixFQUFFLENBQUE7Z0JBQzVCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsUUFBMEIsRUFBRSxFQUFFO0lBQzlELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNsRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsdUJBQXVCLENBQUE7SUFDckQsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMzQixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDdEMsSUFBSSxRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzVGLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUE7WUFDdkMsTUFBTSxvQkFBb0IsR0FBRyxZQUFZO2lCQUN2QyxRQUFRLEVBQUU7aUJBQ1YsY0FBYyxDQUFDLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxDQUFDO2lCQUNsRSxJQUFJLENBQ0osQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUNOLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLE1BQU07Z0JBQ2pELENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQ3JDLENBQUE7WUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDM0IsWUFBWSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7b0JBQ3JDO3dCQUNDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTt3QkFDL0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO3FCQUN6RDtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDLENBQUE7QUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxNQUFNLDZDQUFtQztJQUN6QyxPQUFPLEVBQUUsNkNBQXlCO0lBQ2xDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlO0lBQ3ZDLEVBQUUsRUFBRSwyQkFBMkI7SUFDL0IsT0FBTyxFQUFFLHVCQUF1QjtDQUNoQyxDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7SUFDakQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLDJCQUEyQjtRQUMvQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1QkFBdUIsQ0FBQztRQUNuRSxRQUFRLEVBQUUsc0JBQXNCO0tBQ2hDO0lBQ0QsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHFCQUFxQixFQUNyQixpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsRUFDN0IsaUJBQWlCLENBQUMsZUFBZSxFQUNqQyxlQUFlLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUN6QztJQUNELEtBQUssRUFBRSxPQUFPO0lBQ2QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsNEJBQTRCO0lBQ2hDLE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSwyQkFBMkI7SUFDakMsT0FBTyxFQUFFLGlEQUE4QjtJQUN2QyxTQUFTLEVBQUUsQ0FBQyw0Q0FBMEIsQ0FBQztJQUN2QyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7UUFDeEMsSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFLENBQUM7WUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFDdkMsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDcEQsT0FBTyxvQkFBb0IsQ0FDMUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUNSLElBQUksRUFDSixLQUFLLEVBQ0wsSUFBSSxFQUNKLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQzNCLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQzVCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRCxDQUFDLENBQUE7QUFFRixxSEFBcUg7QUFDckgsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLGdCQUFnQjtJQUNwQixNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsMkJBQTJCLENBQUMsU0FBUyxFQUFFO0lBQzdDLE9BQU8scUJBQVk7SUFDbkIsU0FBUyxFQUFFLENBQUMsK0NBQTJCLENBQUM7SUFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMzQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLFVBQVUseUNBQWlDLElBQUksQ0FBQyxDQUFBO0lBQzlGLENBQUM7Q0FDRCxDQUFDLENBQUEifQ==