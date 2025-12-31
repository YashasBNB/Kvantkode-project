/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess } from '../../../../base/common/network.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as QuickAccessExtensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { Extensions as ViewExtensions, } from '../../../common/views.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { COPY_NOTEBOOK_VARIABLE_VALUE_ID, COPY_NOTEBOOK_VARIABLE_VALUE_LABEL, } from '../../notebook/browser/contrib/notebookVariables/notebookVariableCommands.js';
import { BREAKPOINTS_VIEW_ID, BREAKPOINT_EDITOR_CONTRIBUTION_ID, CALLSTACK_VIEW_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_CAN_VIEW_MEMORY, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_UX, CONTEXT_EXPRESSION_SELECTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_HAS_DEBUGGED, CONTEXT_IN_DEBUG_MODE, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_SET_EXPRESSION_SUPPORTED, CONTEXT_SET_VARIABLE_SUPPORTED, CONTEXT_STACK_FRAME_SUPPORTS_RESTART, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, CONTEXT_VARIABLE_IS_READONLY, CONTEXT_VARIABLE_VALUE, CONTEXT_WATCH_ITEM_TYPE, DEBUG_PANEL_ID, DISASSEMBLY_VIEW_ID, EDITOR_CONTRIBUTION_ID, IDebugService, INTERNAL_CONSOLE_OPTIONS_SCHEMA, LOADED_SCRIPTS_VIEW_ID, REPL_VIEW_ID, VARIABLES_VIEW_ID, VIEWLET_ID, WATCH_VIEW_ID, getStateLabel, } from '../common/debug.js';
import { DebugWatchAccessibilityAnnouncer } from '../common/debugAccessibilityAnnouncer.js';
import { DebugContentProvider } from '../common/debugContentProvider.js';
import { DebugLifecycle } from '../common/debugLifecycle.js';
import { DebugVisualizerService, IDebugVisualizerService } from '../common/debugVisualizers.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { ReplAccessibilityAnnouncer } from '../common/replAccessibilityAnnouncer.js';
import { BreakpointEditorContribution } from './breakpointEditorContribution.js';
import { BreakpointsView } from './breakpointsView.js';
import { CallStackEditorContribution } from './callStackEditorContribution.js';
import { CallStackView } from './callStackView.js';
import { registerColors } from './debugColors.js';
import { ADD_CONFIGURATION_ID, ADD_TO_WATCH_ID, ADD_TO_WATCH_LABEL, CALLSTACK_BOTTOM_ID, CALLSTACK_BOTTOM_LABEL, CALLSTACK_DOWN_ID, CALLSTACK_DOWN_LABEL, CALLSTACK_TOP_ID, CALLSTACK_TOP_LABEL, CALLSTACK_UP_ID, CALLSTACK_UP_LABEL, CONTINUE_ID, CONTINUE_LABEL, COPY_EVALUATE_PATH_ID, COPY_EVALUATE_PATH_LABEL, COPY_STACK_TRACE_ID, COPY_VALUE_ID, COPY_VALUE_LABEL, DEBUG_COMMAND_CATEGORY, DEBUG_CONSOLE_QUICK_ACCESS_PREFIX, DEBUG_QUICK_ACCESS_PREFIX, DEBUG_RUN_COMMAND_ID, DEBUG_RUN_LABEL, DEBUG_START_COMMAND_ID, DEBUG_START_LABEL, DISCONNECT_AND_SUSPEND_ID, DISCONNECT_AND_SUSPEND_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, EDIT_EXPRESSION_COMMAND_ID, JUMP_TO_CURSOR_ID, NEXT_DEBUG_CONSOLE_ID, NEXT_DEBUG_CONSOLE_LABEL, OPEN_LOADED_SCRIPTS_LABEL, PAUSE_ID, PAUSE_LABEL, PREV_DEBUG_CONSOLE_ID, PREV_DEBUG_CONSOLE_LABEL, REMOVE_EXPRESSION_COMMAND_ID, RESTART_FRAME_ID, RESTART_LABEL, RESTART_SESSION_ID, SELECT_AND_START_ID, SELECT_AND_START_LABEL, SELECT_DEBUG_CONSOLE_ID, SELECT_DEBUG_CONSOLE_LABEL, SELECT_DEBUG_SESSION_ID, SELECT_DEBUG_SESSION_LABEL, SET_EXPRESSION_COMMAND_ID, SHOW_LOADED_SCRIPTS_ID, STEP_INTO_ID, STEP_INTO_LABEL, STEP_INTO_TARGET_ID, STEP_INTO_TARGET_LABEL, STEP_OUT_ID, STEP_OUT_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STOP_ID, STOP_LABEL, TERMINATE_THREAD_ID, TOGGLE_INLINE_BREAKPOINT_ID, } from './debugCommands.js';
import { DebugConsoleQuickAccess } from './debugConsoleQuickAccess.js';
import { RunToCursorAction, SelectionToReplAction, SelectionToWatchExpressionsAction, } from './debugEditorActions.js';
import { DebugEditorContribution } from './debugEditorContribution.js';
import * as icons from './debugIcons.js';
import { DebugProgressContribution } from './debugProgress.js';
import { StartDebugQuickAccessProvider } from './debugQuickAccess.js';
import { DebugService } from './debugService.js';
import './debugSettingMigration.js';
import { DebugStatusContribution } from './debugStatus.js';
import { DebugTitleContribution } from './debugTitle.js';
import { DebugToolBar } from './debugToolBar.js';
import { DebugViewPaneContainer } from './debugViewlet.js';
import { DisassemblyView, DisassemblyViewContribution } from './disassemblyView.js';
import { LoadedScriptsView } from './loadedScriptsView.js';
import './media/debug.contribution.css';
import './media/debugHover.css';
import { Repl } from './repl.js';
import { ReplAccessibilityHelp } from './replAccessibilityHelp.js';
import { ReplAccessibleView } from './replAccessibleView.js';
import { RunAndDebugAccessibilityHelp } from './runAndDebugAccessibilityHelp.js';
import { StatusBarColorProvider } from './statusbarColorProvider.js';
import { BREAK_WHEN_VALUE_CHANGES_ID, BREAK_WHEN_VALUE_IS_ACCESSED_ID, BREAK_WHEN_VALUE_IS_READ_ID, SET_VARIABLE_ID, VIEW_MEMORY_ID, VariablesView, } from './variablesView.js';
import { ADD_WATCH_ID, ADD_WATCH_LABEL, REMOVE_WATCH_EXPRESSIONS_COMMAND_ID, REMOVE_WATCH_EXPRESSIONS_LABEL, WatchExpressionsView, } from './watchExpressionsView.js';
import { WelcomeView } from './welcomeView.js';
const debugCategory = nls.localize('debugCategory', 'Debug');
registerColors();
registerSingleton(IDebugService, DebugService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDebugVisualizerService, DebugVisualizerService, 1 /* InstantiationType.Delayed */);
// Register Debug Workbench Contributions
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugStatusContribution, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugProgressContribution, 4 /* LifecyclePhase.Eventually */);
if (isWeb) {
    Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugTitleContribution, 4 /* LifecyclePhase.Eventually */);
}
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugToolBar, 3 /* LifecyclePhase.Restored */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugContentProvider, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(StatusBarColorProvider, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DisassemblyViewContribution, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DebugLifecycle, 4 /* LifecyclePhase.Eventually */);
// Register Quick Access
Registry.as(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: StartDebugQuickAccessProvider,
    prefix: DEBUG_QUICK_ACCESS_PREFIX,
    contextKey: 'inLaunchConfigurationsPicker',
    placeholder: nls.localize('startDebugPlaceholder', 'Type the name of a launch configuration to run.'),
    helpEntries: [
        {
            description: nls.localize('startDebuggingHelp', 'Start Debugging'),
            commandId: SELECT_AND_START_ID,
            commandCenterOrder: 50,
        },
    ],
});
// Register quick access for debug console
Registry.as(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: DebugConsoleQuickAccess,
    prefix: DEBUG_CONSOLE_QUICK_ACCESS_PREFIX,
    contextKey: 'inDebugConsolePicker',
    placeholder: nls.localize('tasksQuickAccessPlaceholder', 'Type the name of a debug console to open.'),
    helpEntries: [
        {
            description: nls.localize('tasksQuickAccessHelp', 'Show All Debug Consoles'),
            commandId: SELECT_DEBUG_CONSOLE_ID,
        },
    ],
});
registerEditorContribution('editor.contrib.callStack', CallStackEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID, BreakpointEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution(EDITOR_CONTRIBUTION_ID, DebugEditorContribution, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
const registerDebugCommandPaletteItem = (id, title, when, precondition) => {
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, when),
        group: debugCategory,
        command: {
            id,
            title,
            category: DEBUG_COMMAND_CATEGORY,
            precondition,
        },
    });
};
registerDebugCommandPaletteItem(RESTART_SESSION_ID, RESTART_LABEL);
registerDebugCommandPaletteItem(TERMINATE_THREAD_ID, nls.localize2('terminateThread', 'Terminate Thread'), CONTEXT_IN_DEBUG_MODE);
registerDebugCommandPaletteItem(STEP_OVER_ID, STEP_OVER_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(STEP_INTO_ID, STEP_INTO_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(STEP_INTO_TARGET_ID, STEP_INTO_TARGET_LABEL, CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped')));
registerDebugCommandPaletteItem(STEP_OUT_ID, STEP_OUT_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(PAUSE_ID, PAUSE_LABEL, CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.and(CONTEXT_DEBUG_STATE.isEqualTo('running'), CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated()));
registerDebugCommandPaletteItem(DISCONNECT_ID, DISCONNECT_LABEL, CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.or(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED));
registerDebugCommandPaletteItem(DISCONNECT_AND_SUSPEND_ID, DISCONNECT_AND_SUSPEND_LABEL, CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.or(CONTEXT_FOCUSED_SESSION_IS_ATTACH, ContextKeyExpr.and(CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED)));
registerDebugCommandPaletteItem(STOP_ID, STOP_LABEL, CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.or(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED));
registerDebugCommandPaletteItem(CONTINUE_ID, CONTINUE_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(JUMP_TO_CURSOR_ID, nls.localize2('jumpToCursor', 'Jump to Cursor'), CONTEXT_JUMP_TO_CURSOR_SUPPORTED);
registerDebugCommandPaletteItem(JUMP_TO_CURSOR_ID, nls.localize2('SetNextStatement', 'Set Next Statement'), CONTEXT_JUMP_TO_CURSOR_SUPPORTED);
registerDebugCommandPaletteItem(RunToCursorAction.ID, RunToCursorAction.LABEL, CONTEXT_DEBUGGERS_AVAILABLE);
registerDebugCommandPaletteItem(SelectionToReplAction.ID, SelectionToReplAction.LABEL, CONTEXT_IN_DEBUG_MODE);
registerDebugCommandPaletteItem(SelectionToWatchExpressionsAction.ID, SelectionToWatchExpressionsAction.LABEL);
registerDebugCommandPaletteItem(TOGGLE_INLINE_BREAKPOINT_ID, nls.localize2('inlineBreakpoint', 'Inline Breakpoint'));
registerDebugCommandPaletteItem(DEBUG_START_COMMAND_ID, DEBUG_START_LABEL, ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */))));
registerDebugCommandPaletteItem(DEBUG_RUN_COMMAND_ID, DEBUG_RUN_LABEL, ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */))));
registerDebugCommandPaletteItem(SELECT_AND_START_ID, SELECT_AND_START_LABEL, ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */))));
registerDebugCommandPaletteItem(NEXT_DEBUG_CONSOLE_ID, NEXT_DEBUG_CONSOLE_LABEL);
registerDebugCommandPaletteItem(PREV_DEBUG_CONSOLE_ID, PREV_DEBUG_CONSOLE_LABEL);
registerDebugCommandPaletteItem(SHOW_LOADED_SCRIPTS_ID, OPEN_LOADED_SCRIPTS_LABEL, CONTEXT_IN_DEBUG_MODE);
registerDebugCommandPaletteItem(SELECT_DEBUG_CONSOLE_ID, SELECT_DEBUG_CONSOLE_LABEL);
registerDebugCommandPaletteItem(SELECT_DEBUG_SESSION_ID, SELECT_DEBUG_SESSION_LABEL);
registerDebugCommandPaletteItem(CALLSTACK_TOP_ID, CALLSTACK_TOP_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(CALLSTACK_BOTTOM_ID, CALLSTACK_BOTTOM_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(CALLSTACK_UP_ID, CALLSTACK_UP_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugCommandPaletteItem(CALLSTACK_DOWN_ID, CALLSTACK_DOWN_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
// Debug callstack context menu
const registerDebugViewMenuItem = (menuId, id, title, order, when, precondition, group = 'navigation', icon) => {
    MenuRegistry.appendMenuItem(menuId, {
        group,
        when,
        order,
        icon,
        command: {
            id,
            title,
            icon,
            precondition,
        },
    });
};
registerDebugViewMenuItem(MenuId.DebugCallStackContext, RESTART_SESSION_ID, RESTART_LABEL, 10, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugCallStackContext, DISCONNECT_ID, DISCONNECT_LABEL, 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugCallStackContext, DISCONNECT_AND_SUSPEND_ID, DISCONNECT_AND_SUSPEND_LABEL, 21, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugCallStackContext, STOP_ID, STOP_LABEL, 30, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugCallStackContext, PAUSE_ID, PAUSE_LABEL, 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), ContextKeyExpr.and(CONTEXT_DEBUG_STATE.isEqualTo('running'), CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated())));
registerDebugViewMenuItem(MenuId.DebugCallStackContext, CONTINUE_ID, CONTINUE_LABEL, 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped')));
registerDebugViewMenuItem(MenuId.DebugCallStackContext, STEP_OVER_ID, STEP_OVER_LABEL, 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugViewMenuItem(MenuId.DebugCallStackContext, STEP_INTO_ID, STEP_INTO_LABEL, 30, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugViewMenuItem(MenuId.DebugCallStackContext, STEP_OUT_ID, STEP_OUT_LABEL, 40, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugViewMenuItem(MenuId.DebugCallStackContext, TERMINATE_THREAD_ID, nls.localize('terminateThread', 'Terminate Thread'), 10, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), undefined, 'termination');
registerDebugViewMenuItem(MenuId.DebugCallStackContext, RESTART_FRAME_ID, nls.localize('restartFrame', 'Restart Frame'), 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'), CONTEXT_RESTART_FRAME_SUPPORTED), CONTEXT_STACK_FRAME_SUPPORTS_RESTART);
registerDebugViewMenuItem(MenuId.DebugCallStackContext, COPY_STACK_TRACE_ID, nls.localize('copyStackTrace', 'Copy Call Stack'), 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, VIEW_MEMORY_ID, nls.localize('viewMemory', 'View Binary Data'), 15, CONTEXT_CAN_VIEW_MEMORY, CONTEXT_IN_DEBUG_MODE, 'inline', icons.debugInspectMemory);
registerDebugViewMenuItem(MenuId.DebugVariablesContext, SET_VARIABLE_ID, nls.localize('setValue', 'Set Value'), 10, ContextKeyExpr.or(CONTEXT_SET_VARIABLE_SUPPORTED, ContextKeyExpr.and(CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, CONTEXT_SET_EXPRESSION_SUPPORTED)), CONTEXT_VARIABLE_IS_READONLY.toNegated(), '3_modification');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, COPY_VALUE_ID, COPY_VALUE_LABEL, 10, undefined, undefined, '5_cutcopypaste');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, COPY_EVALUATE_PATH_ID, COPY_EVALUATE_PATH_LABEL, 20, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, '5_cutcopypaste');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, ADD_TO_WATCH_ID, ADD_TO_WATCH_LABEL, 100, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, BREAK_WHEN_VALUE_IS_READ_ID, nls.localize('breakWhenValueIsRead', 'Break on Value Read'), 200, CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, BREAK_WHEN_VALUE_CHANGES_ID, nls.localize('breakWhenValueChanges', 'Break on Value Change'), 210, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugVariablesContext, BREAK_WHEN_VALUE_IS_ACCESSED_ID, nls.localize('breakWhenValueIsAccessed', 'Break on Value Access'), 220, CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugHoverContext, VIEW_MEMORY_ID, nls.localize('viewMemory', 'View Binary Data'), 15, CONTEXT_CAN_VIEW_MEMORY, CONTEXT_IN_DEBUG_MODE, 'inline', icons.debugInspectMemory);
registerDebugViewMenuItem(MenuId.DebugHoverContext, COPY_VALUE_ID, COPY_VALUE_LABEL, 10, undefined, undefined, '5_cutcopypaste');
registerDebugViewMenuItem(MenuId.DebugHoverContext, COPY_EVALUATE_PATH_ID, COPY_EVALUATE_PATH_LABEL, 20, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, '5_cutcopypaste');
registerDebugViewMenuItem(MenuId.DebugHoverContext, ADD_TO_WATCH_ID, ADD_TO_WATCH_LABEL, 100, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugHoverContext, BREAK_WHEN_VALUE_IS_READ_ID, nls.localize('breakWhenValueIsRead', 'Break on Value Read'), 200, CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugHoverContext, BREAK_WHEN_VALUE_CHANGES_ID, nls.localize('breakWhenValueChanges', 'Break on Value Change'), 210, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugHoverContext, BREAK_WHEN_VALUE_IS_ACCESSED_ID, nls.localize('breakWhenValueIsAccessed', 'Break on Value Access'), 220, CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.DebugWatchContext, ADD_WATCH_ID, ADD_WATCH_LABEL, 10, undefined, undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugWatchContext, EDIT_EXPRESSION_COMMAND_ID, nls.localize('editWatchExpression', 'Edit Expression'), 20, CONTEXT_WATCH_ITEM_TYPE.isEqualTo('expression'), undefined, '3_modification');
registerDebugViewMenuItem(MenuId.DebugWatchContext, SET_EXPRESSION_COMMAND_ID, nls.localize('setValue', 'Set Value'), 30, ContextKeyExpr.or(ContextKeyExpr.and(CONTEXT_WATCH_ITEM_TYPE.isEqualTo('expression'), CONTEXT_SET_EXPRESSION_SUPPORTED), ContextKeyExpr.and(CONTEXT_WATCH_ITEM_TYPE.isEqualTo('variable'), CONTEXT_SET_VARIABLE_SUPPORTED)), CONTEXT_VARIABLE_IS_READONLY.toNegated(), '3_modification');
registerDebugViewMenuItem(MenuId.DebugWatchContext, COPY_VALUE_ID, nls.localize('copyValue', 'Copy Value'), 40, ContextKeyExpr.or(CONTEXT_WATCH_ITEM_TYPE.isEqualTo('expression'), CONTEXT_WATCH_ITEM_TYPE.isEqualTo('variable')), CONTEXT_IN_DEBUG_MODE, '3_modification');
registerDebugViewMenuItem(MenuId.DebugWatchContext, VIEW_MEMORY_ID, nls.localize('viewMemory', 'View Binary Data'), 10, CONTEXT_CAN_VIEW_MEMORY, undefined, 'inline', icons.debugInspectMemory);
registerDebugViewMenuItem(MenuId.DebugWatchContext, REMOVE_EXPRESSION_COMMAND_ID, nls.localize('removeWatchExpression', 'Remove Expression'), 20, CONTEXT_WATCH_ITEM_TYPE.isEqualTo('expression'), undefined, 'inline', icons.watchExpressionRemove);
registerDebugViewMenuItem(MenuId.DebugWatchContext, REMOVE_WATCH_EXPRESSIONS_COMMAND_ID, REMOVE_WATCH_EXPRESSIONS_LABEL, 20, undefined, undefined, 'z_commands');
registerDebugViewMenuItem(MenuId.NotebookVariablesContext, COPY_NOTEBOOK_VARIABLE_VALUE_ID, COPY_NOTEBOOK_VARIABLE_VALUE_LABEL, 20, CONTEXT_VARIABLE_VALUE);
KeybindingsRegistry.registerKeybindingRule({
    id: COPY_VALUE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(CONTEXT_EXPRESSION_SELECTED.negate(), ContextKeyExpr.or(FocusedViewContext.isEqualTo(WATCH_VIEW_ID), FocusedViewContext.isEqualTo(VARIABLES_VIEW_ID))),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
});
// Touch Bar
if (isMacintosh) {
    const registerTouchBarEntry = (id, title, order, when, iconUri) => {
        MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
            command: {
                id,
                title,
                icon: { dark: iconUri },
            },
            when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, when),
            group: '9_debug',
            order,
        });
    };
    registerTouchBarEntry(DEBUG_RUN_COMMAND_ID, DEBUG_RUN_LABEL, 0, CONTEXT_IN_DEBUG_MODE.toNegated(), FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/continue-tb.png'));
    registerTouchBarEntry(DEBUG_START_COMMAND_ID, DEBUG_START_LABEL, 1, CONTEXT_IN_DEBUG_MODE.toNegated(), FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/run-with-debugging-tb.png'));
    registerTouchBarEntry(CONTINUE_ID, CONTINUE_LABEL, 0, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/continue-tb.png'));
    registerTouchBarEntry(PAUSE_ID, PAUSE_LABEL, 1, ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.and(CONTEXT_DEBUG_STATE.isEqualTo('running'), CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated())), FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/pause-tb.png'));
    registerTouchBarEntry(STEP_OVER_ID, STEP_OVER_LABEL, 2, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/stepover-tb.png'));
    registerTouchBarEntry(STEP_INTO_ID, STEP_INTO_LABEL, 3, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/stepinto-tb.png'));
    registerTouchBarEntry(STEP_OUT_ID, STEP_OUT_LABEL, 4, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/stepout-tb.png'));
    registerTouchBarEntry(RESTART_SESSION_ID, RESTART_LABEL, 5, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/restart-tb.png'));
    registerTouchBarEntry(STOP_ID, STOP_LABEL, 6, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workbench/contrib/debug/browser/media/stop-tb.png'));
}
// Editor Title Menu's "Run/Debug" dropdown item
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    submenu: MenuId.EditorTitleRun,
    rememberDefaultAction: true,
    title: nls.localize2('run', 'Run or Debug...'),
    icon: icons.debugRun,
    group: 'navigation',
    order: -1,
});
// Debug menu
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarDebugMenu,
    title: {
        ...nls.localize2('runMenu', 'Run'),
        mnemonicTitle: nls.localize({ key: 'mRun', comment: ['&& denotes a mnemonic'] }, '&&Run'),
    },
    order: 6,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '1_debug',
    command: {
        id: DEBUG_START_COMMAND_ID,
        title: nls.localize({ key: 'miStartDebugging', comment: ['&& denotes a mnemonic'] }, '&&Start Debugging'),
    },
    order: 1,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '1_debug',
    command: {
        id: DEBUG_RUN_COMMAND_ID,
        title: nls.localize({ key: 'miRun', comment: ['&& denotes a mnemonic'] }, 'Run &&Without Debugging'),
    },
    order: 2,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '1_debug',
    command: {
        id: STOP_ID,
        title: nls.localize({ key: 'miStopDebugging', comment: ['&& denotes a mnemonic'] }, '&&Stop Debugging'),
        precondition: CONTEXT_IN_DEBUG_MODE,
    },
    order: 3,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '1_debug',
    command: {
        id: RESTART_SESSION_ID,
        title: nls.localize({ key: 'miRestart Debugging', comment: ['&& denotes a mnemonic'] }, '&&Restart Debugging'),
        precondition: CONTEXT_IN_DEBUG_MODE,
    },
    order: 4,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
// Configuration
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '2_configuration',
    command: {
        id: ADD_CONFIGURATION_ID,
        title: nls.localize({ key: 'miAddConfiguration', comment: ['&& denotes a mnemonic'] }, 'A&&dd Configuration...'),
    },
    order: 2,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
// Step Commands
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '3_step',
    command: {
        id: STEP_OVER_ID,
        title: nls.localize({ key: 'miStepOver', comment: ['&& denotes a mnemonic'] }, 'Step &&Over'),
        precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    },
    order: 1,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '3_step',
    command: {
        id: STEP_INTO_ID,
        title: nls.localize({ key: 'miStepInto', comment: ['&& denotes a mnemonic'] }, 'Step &&Into'),
        precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    },
    order: 2,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '3_step',
    command: {
        id: STEP_OUT_ID,
        title: nls.localize({ key: 'miStepOut', comment: ['&& denotes a mnemonic'] }, 'Step O&&ut'),
        precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    },
    order: 3,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '3_step',
    command: {
        id: CONTINUE_ID,
        title: nls.localize({ key: 'miContinue', comment: ['&& denotes a mnemonic'] }, '&&Continue'),
        precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    },
    order: 4,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
// New Breakpoints
MenuRegistry.appendMenuItem(MenuId.MenubarNewBreakpointMenu, {
    group: '1_breakpoints',
    command: {
        id: TOGGLE_INLINE_BREAKPOINT_ID,
        title: nls.localize({ key: 'miInlineBreakpoint', comment: ['&& denotes a mnemonic'] }, 'Inline Breakp&&oint'),
    },
    order: 2,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: '4_new_breakpoint',
    title: nls.localize({ key: 'miNewBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&New Breakpoint'),
    submenu: MenuId.MenubarNewBreakpointMenu,
    order: 2,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
});
// Breakpoint actions are registered from breakpointsView.ts
// Install Debuggers
MenuRegistry.appendMenuItem(MenuId.MenubarDebugMenu, {
    group: 'z_install',
    command: {
        id: 'debug.installAdditionalDebuggers',
        title: nls.localize({ key: 'miInstallAdditionalDebuggers', comment: ['&& denotes a mnemonic'] }, '&&Install Additional Debuggers...'),
    },
    order: 1,
});
// register repl panel
const VIEW_CONTAINER = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: DEBUG_PANEL_ID,
    title: nls.localize2({ comment: ['Debug is a noun in this context, not a verb.'], key: 'debugPanel' }, 'Debug Console'),
    icon: icons.debugConsoleViewIcon,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        DEBUG_PANEL_ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    storageId: DEBUG_PANEL_ID,
    hideIfEmpty: true,
    order: 2,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
Registry.as(ViewExtensions.ViewsRegistry).registerViews([
    {
        id: REPL_VIEW_ID,
        name: nls.localize2({ comment: ['Debug is a noun in this context, not a verb.'], key: 'debugPanel' }, 'Debug Console'),
        containerIcon: icons.debugConsoleViewIcon,
        canToggleVisibility: true,
        canMoveView: true,
        when: CONTEXT_DEBUGGERS_AVAILABLE,
        ctorDescriptor: new SyncDescriptor(Repl),
        openCommandActionDescriptor: {
            id: 'workbench.debug.action.toggleRepl',
            mnemonicTitle: nls.localize({ key: 'miToggleDebugConsole', comment: ['&& denotes a mnemonic'] }, 'De&&bug Console'),
            keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 55 /* KeyCode.KeyY */ },
            order: 2,
        },
    },
], VIEW_CONTAINER);
const viewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('run and debug', 'Run and Debug'),
    openCommandActionDescriptor: {
        id: VIEWLET_ID,
        mnemonicTitle: nls.localize({ key: 'miViewRun', comment: ['&& denotes a mnemonic'] }, '&&Run'),
        keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 34 /* KeyCode.KeyD */ },
        order: 3,
    },
    ctorDescriptor: new SyncDescriptor(DebugViewPaneContainer),
    icon: icons.runViewIcon,
    alwaysUseContainerInfo: true,
    order: 3,
}, 0 /* ViewContainerLocation.Sidebar */);
// Register default debug views
const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([
    {
        id: VARIABLES_VIEW_ID,
        name: nls.localize2('variables', 'Variables'),
        containerIcon: icons.variablesViewIcon,
        ctorDescriptor: new SyncDescriptor(VariablesView),
        order: 10,
        weight: 40,
        canToggleVisibility: true,
        canMoveView: true,
        focusCommand: { id: 'workbench.debug.action.focusVariablesView' },
        when: CONTEXT_DEBUG_UX.isEqualTo('default'),
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: WATCH_VIEW_ID,
        name: nls.localize2('watch', 'Watch'),
        containerIcon: icons.watchViewIcon,
        ctorDescriptor: new SyncDescriptor(WatchExpressionsView),
        order: 20,
        weight: 10,
        canToggleVisibility: true,
        canMoveView: true,
        focusCommand: { id: 'workbench.debug.action.focusWatchView' },
        when: CONTEXT_DEBUG_UX.isEqualTo('default'),
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: CALLSTACK_VIEW_ID,
        name: nls.localize2('callStack', 'Call Stack'),
        containerIcon: icons.callStackViewIcon,
        ctorDescriptor: new SyncDescriptor(CallStackView),
        order: 30,
        weight: 30,
        canToggleVisibility: true,
        canMoveView: true,
        focusCommand: { id: 'workbench.debug.action.focusCallStackView' },
        when: CONTEXT_DEBUG_UX.isEqualTo('default'),
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: BREAKPOINTS_VIEW_ID,
        name: nls.localize2('breakpoints', 'Breakpoints'),
        containerIcon: icons.breakpointsViewIcon,
        ctorDescriptor: new SyncDescriptor(BreakpointsView),
        order: 40,
        weight: 20,
        canToggleVisibility: true,
        canMoveView: true,
        focusCommand: { id: 'workbench.debug.action.focusBreakpointsView' },
        when: ContextKeyExpr.or(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_DEBUG_UX.isEqualTo('default'), CONTEXT_HAS_DEBUGGED),
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: WelcomeView.ID,
        name: WelcomeView.LABEL,
        containerIcon: icons.runViewIcon,
        ctorDescriptor: new SyncDescriptor(WelcomeView),
        order: 1,
        weight: 40,
        canToggleVisibility: true,
        when: CONTEXT_DEBUG_UX.isEqualTo('simple'),
    },
], viewContainer);
viewsRegistry.registerViews([
    {
        id: LOADED_SCRIPTS_VIEW_ID,
        name: nls.localize2('loadedScripts', 'Loaded Scripts'),
        containerIcon: icons.loadedScriptsViewIcon,
        ctorDescriptor: new SyncDescriptor(LoadedScriptsView),
        order: 35,
        weight: 5,
        canToggleVisibility: true,
        canMoveView: true,
        collapsed: true,
        when: ContextKeyExpr.and(CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_DEBUG_UX.isEqualTo('default')),
    },
], viewContainer);
// Register disassembly view
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(DisassemblyView, DISASSEMBLY_VIEW_ID, nls.localize('disassembly', 'Disassembly')), [new SyncDescriptor(DisassemblyViewInput)]);
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'debug',
    order: 20,
    title: nls.localize('debugConfigurationTitle', 'Debug'),
    type: 'object',
    properties: {
        'debug.showVariableTypes': {
            type: 'boolean',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'showVariableTypes' }, 'Show variable type in variable pane during debug session'),
            default: false,
        },
        'debug.allowBreakpointsEverywhere': {
            type: 'boolean',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'allowBreakpointsEverywhere' }, 'Allow setting breakpoints in any file.'),
            default: false,
        },
        'debug.gutterMiddleClickAction': {
            type: 'string',
            enum: ['logpoint', 'conditionalBreakpoint', 'triggeredBreakpoint', 'none'],
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'gutterMiddleClickAction' }, 'Controls the action to perform when clicking the editor gutter with the middle mouse button.'),
            enumDescriptions: [
                nls.localize('debug.gutterMiddleClickAction.logpoint', 'Add Logpoint.'),
                nls.localize('debug.gutterMiddleClickAction.conditionalBreakpoint', 'Add Conditional Breakpoint.'),
                nls.localize('debug.gutterMiddleClickAction.triggeredBreakpoint', 'Add Triggered Breakpoint.'),
                nls.localize('debug.gutterMiddleClickAction.none', "Don't perform any action."),
            ],
            default: 'logpoint',
        },
        'debug.openExplorerOnEnd': {
            type: 'boolean',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'openExplorerOnEnd' }, 'Automatically open the explorer view at the end of a debug session.'),
            default: false,
        },
        'debug.closeReadonlyTabsOnEnd': {
            type: 'boolean',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'closeReadonlyTabsOnEnd' }, 'At the end of a debug session, all the read-only tabs associated with that session will be closed'),
            default: false,
        },
        'debug.inlineValues': {
            type: 'string',
            enum: ['on', 'off', 'auto'],
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'inlineValues' }, 'Show variable values inline in editor while debugging.'),
            enumDescriptions: [
                nls.localize('inlineValues.on', 'Always show variable values inline in editor while debugging.'),
                nls.localize('inlineValues.off', 'Never show variable values inline in editor while debugging.'),
                nls.localize('inlineValues.focusNoScroll', 'Show variable values inline in editor while debugging when the language supports inline value locations.'),
            ],
            default: 'auto',
        },
        'debug.toolBarLocation': {
            enum: ['floating', 'docked', 'commandCenter', 'hidden'],
            markdownDescription: nls.localize({ comment: ['This is the description for a setting'], key: 'toolBarLocation' }, 'Controls the location of the debug toolbar. Either `floating` in all views, `docked` in the debug view, `commandCenter` (requires {0}), or `hidden`.', '`#window.commandCenter#`'),
            default: 'floating',
            markdownEnumDescriptions: [
                nls.localize('debugToolBar.floating', 'Show debug toolbar in all views.'),
                nls.localize('debugToolBar.docked', 'Show debug toolbar only in debug views.'),
                nls.localize('debugToolBar.commandCenter', '`(Experimental)` Show debug toolbar in the command center.'),
                nls.localize('debugToolBar.hidden', 'Do not show debug toolbar.'),
            ],
        },
        'debug.showInStatusBar': {
            enum: ['never', 'always', 'onFirstSessionStart'],
            enumDescriptions: [
                nls.localize('never', 'Never show debug in Status bar'),
                nls.localize('always', 'Always show debug in Status bar'),
                nls.localize('onFirstSessionStart', 'Show debug in Status bar only after debug was started for the first time'),
            ],
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'showInStatusBar' }, 'Controls when the debug Status bar should be visible.'),
            default: 'onFirstSessionStart',
        },
        'debug.internalConsoleOptions': INTERNAL_CONSOLE_OPTIONS_SCHEMA,
        'debug.console.closeOnEnd': {
            type: 'boolean',
            description: nls.localize('debug.console.closeOnEnd', 'Controls if the Debug Console should be automatically closed when the debug session ends.'),
            default: false,
        },
        'debug.terminal.clearBeforeReusing': {
            type: 'boolean',
            description: nls.localize({
                comment: ['This is the description for a setting'],
                key: 'debug.terminal.clearBeforeReusing',
            }, 'Before starting a new debug session in an integrated or external terminal, clear the terminal.'),
            default: false,
        },
        'debug.openDebug': {
            enum: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart', 'openOnDebugBreak'],
            default: 'openOnDebugBreak',
            description: nls.localize('openDebug', 'Controls when the debug view should open.'),
        },
        'debug.showSubSessionsInToolBar': {
            type: 'boolean',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'showSubSessionsInToolBar' }, 'Controls whether the debug sub-sessions are shown in the debug tool bar. When this setting is false the stop command on a sub-session will also stop the parent session.'),
            default: false,
        },
        'debug.console.fontSize': {
            type: 'number',
            description: nls.localize('debug.console.fontSize', 'Controls the font size in pixels in the Debug Console.'),
            default: isMacintosh ? 12 : 14,
        },
        'debug.console.fontFamily': {
            type: 'string',
            description: nls.localize('debug.console.fontFamily', 'Controls the font family in the Debug Console.'),
            default: 'default',
        },
        'debug.console.lineHeight': {
            type: 'number',
            description: nls.localize('debug.console.lineHeight', 'Controls the line height in pixels in the Debug Console. Use 0 to compute the line height from the font size.'),
            default: 0,
        },
        'debug.console.wordWrap': {
            type: 'boolean',
            description: nls.localize('debug.console.wordWrap', 'Controls if the lines should wrap in the Debug Console.'),
            default: true,
        },
        'debug.console.historySuggestions': {
            type: 'boolean',
            description: nls.localize('debug.console.historySuggestions', 'Controls if the Debug Console should suggest previously typed input.'),
            default: true,
        },
        'debug.console.collapseIdenticalLines': {
            type: 'boolean',
            description: nls.localize('debug.console.collapseIdenticalLines', 'Controls if the Debug Console should collapse identical lines and show a number of occurrences with a badge.'),
            default: true,
        },
        'debug.console.acceptSuggestionOnEnter': {
            enum: ['off', 'on'],
            description: nls.localize('debug.console.acceptSuggestionOnEnter', 'Controls whether suggestions should be accepted on Enter in the Debug Console. Enter is also used to evaluate whatever is typed in the Debug Console.'),
            default: 'off',
        },
        launch: {
            type: 'object',
            description: nls.localize({ comment: ['This is the description for a setting'], key: 'launch' }, "Global debug launch configuration. Should be used as an alternative to 'launch.json' that is shared across workspaces."),
            default: { configurations: [], compounds: [] },
            $ref: launchSchemaId,
            disallowConfigurationDefault: true,
        },
        'debug.focusWindowOnBreak': {
            type: 'boolean',
            description: nls.localize('debug.focusWindowOnBreak', 'Controls whether the workbench window should be focused when the debugger breaks.'),
            default: true,
        },
        'debug.focusEditorOnBreak': {
            type: 'boolean',
            description: nls.localize('debug.focusEditorOnBreak', 'Controls whether the editor should be focused when the debugger breaks.'),
            default: true,
        },
        'debug.onTaskErrors': {
            enum: ['debugAnyway', 'showErrors', 'prompt', 'abort'],
            enumDescriptions: [
                nls.localize('debugAnyway', 'Ignore task errors and start debugging.'),
                nls.localize('showErrors', 'Show the Problems view and do not start debugging.'),
                nls.localize('prompt', 'Prompt user.'),
                nls.localize('cancel', 'Cancel debugging.'),
            ],
            description: nls.localize('debug.onTaskErrors', 'Controls what to do when errors are encountered after running a preLaunchTask.'),
            default: 'prompt',
        },
        'debug.showBreakpointsInOverviewRuler': {
            type: 'boolean',
            description: nls.localize({
                comment: ['This is the description for a setting'],
                key: 'showBreakpointsInOverviewRuler',
            }, 'Controls whether breakpoints should be shown in the overview ruler.'),
            default: false,
        },
        'debug.showInlineBreakpointCandidates': {
            type: 'boolean',
            description: nls.localize({
                comment: ['This is the description for a setting'],
                key: 'showInlineBreakpointCandidates',
            }, 'Controls whether inline breakpoints candidate decorations should be shown in the editor while debugging.'),
            default: true,
        },
        'debug.saveBeforeStart': {
            description: nls.localize('debug.saveBeforeStart', 'Controls what editors to save before starting a debug session.'),
            enum: ['allEditorsInActiveGroup', 'nonUntitledEditorsInActiveGroup', 'none'],
            enumDescriptions: [
                nls.localize('debug.saveBeforeStart.allEditorsInActiveGroup', 'Save all editors in the active group before starting a debug session.'),
                nls.localize('debug.saveBeforeStart.nonUntitledEditorsInActiveGroup', 'Save all editors in the active group except untitled ones before starting a debug session.'),
                nls.localize('debug.saveBeforeStart.none', "Don't save any editors before starting a debug session."),
            ],
            default: 'allEditorsInActiveGroup',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'debug.confirmOnExit': {
            description: nls.localize('debug.confirmOnExit', 'Controls whether to confirm when the window closes if there are active debug sessions.'),
            type: 'string',
            enum: ['never', 'always'],
            enumDescriptions: [
                nls.localize('debug.confirmOnExit.never', 'Never confirm.'),
                nls.localize('debug.confirmOnExit.always', 'Always confirm if there are debug sessions.'),
            ],
            default: 'never',
        },
        'debug.disassemblyView.showSourceCode': {
            type: 'boolean',
            default: true,
            description: nls.localize('debug.disassemblyView.showSourceCode', 'Show Source Code in Disassembly View.'),
        },
        'debug.autoExpandLazyVariables': {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            default: 'auto',
            enumDescriptions: [
                nls.localize('debug.autoExpandLazyVariables.auto', 'When in screen reader optimized mode, automatically expand lazy variables.'),
                nls.localize('debug.autoExpandLazyVariables.on', 'Always automatically expand lazy variables.'),
                nls.localize('debug.autoExpandLazyVariables.off', 'Never automatically expand lazy variables.'),
            ],
            description: nls.localize('debug.autoExpandLazyVariables', 'Controls whether variables that are lazily resolved, such as getters, are automatically resolved and expanded by the debugger.'),
        },
        'debug.enableStatusBarColor': {
            type: 'boolean',
            description: nls.localize('debug.enableStatusBarColor', 'Color of the Status bar when debugger is active.'),
            default: true,
        },
        'debug.hideLauncherWhileDebugging': {
            type: 'boolean',
            markdownDescription: nls.localize({
                comment: ['This is the description for a setting'],
                key: 'debug.hideLauncherWhileDebugging',
            }, "Hide 'Start Debugging' control in title bar of 'Run and Debug' view while debugging is active. Only relevant when {0} is not `docked`.", '`#debug.toolBarLocation#`'),
            default: false,
        },
        'debug.hideSlowPreLaunchWarning': {
            type: 'boolean',
            markdownDescription: nls.localize('debug.hideSlowPreLaunchWarning', 'Hide the warning shown when a `preLaunchTask` has been running for a while.'),
            default: false,
        },
    },
});
AccessibleViewRegistry.register(new ReplAccessibleView());
AccessibleViewRegistry.register(new ReplAccessibilityHelp());
AccessibleViewRegistry.register(new RunAndDebugAccessibilityHelp());
registerWorkbenchContribution2(ReplAccessibilityAnnouncer.ID, ReplAccessibilityAnnouncer, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(DebugWatchAccessibilityAnnouncer.ID, DebugWatchAccessibilityAnnouncer, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Zy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFeEUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFFN0csT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUdyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sVUFBVSxJQUFJLHFCQUFxQixHQUNuQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1B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