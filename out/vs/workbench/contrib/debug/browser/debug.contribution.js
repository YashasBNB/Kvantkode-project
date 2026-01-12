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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV4RSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUU3RyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEdBR3JDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUVOLG1CQUFtQixHQUNuQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFFTixVQUFVLElBQUkscUJBQXFCLEdBQ25DLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixFQUVqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RCxPQUFPLEVBS04sVUFBVSxJQUFJLGNBQWMsR0FDNUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFeEYsT0FBTyxFQUNOLCtCQUErQixFQUMvQixrQ0FBa0MsR0FDbEMsTUFBTSw4RUFBOEUsQ0FBQTtBQUNyRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGlDQUFpQyxFQUNqQyxpQkFBaUIsRUFDakIseUJBQXlCLEVBQ3pCLDBDQUEwQyxFQUMxQyw4Q0FBOEMsRUFDOUMsMENBQTBDLEVBQzFDLDJCQUEyQixFQUMzQix1QkFBdUIsRUFDdkIsMkJBQTJCLEVBQzNCLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIsMkJBQTJCLEVBQzNCLGlDQUFpQyxFQUNqQyxtQ0FBbUMsRUFDbkMsb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQixnQ0FBZ0MsRUFDaEMsZ0NBQWdDLEVBQ2hDLCtCQUErQixFQUMvQixnQ0FBZ0MsRUFDaEMsOEJBQThCLEVBQzlCLG9DQUFvQyxFQUNwQyxtQ0FBbUMsRUFDbkMsa0NBQWtDLEVBQ2xDLG9DQUFvQyxFQUNwQyxzQ0FBc0MsRUFDdEMsNEJBQTRCLEVBQzVCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsYUFBYSxFQUNiLCtCQUErQixFQUMvQixzQkFBc0IsRUFDdEIsWUFBWSxFQUVaLGlCQUFpQixFQUNqQixVQUFVLEVBQ1YsYUFBYSxFQUNiLGFBQWEsR0FDYixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsY0FBYyxFQUNkLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIsbUJBQW1CLEVBQ25CLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLGlDQUFpQyxFQUNqQyx5QkFBeUIsRUFDekIsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixzQkFBc0IsRUFDdEIsaUJBQWlCLEVBQ2pCLHlCQUF5QixFQUN6Qiw0QkFBNEIsRUFDNUIsYUFBYSxFQUNiLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFDMUIsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIseUJBQXlCLEVBQ3pCLFFBQVEsRUFDUixXQUFXLEVBQ1gscUJBQXFCLEVBQ3JCLHdCQUF3QixFQUN4Qiw0QkFBNEIsRUFDNUIsZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLHVCQUF1QixFQUN2QiwwQkFBMEIsRUFDMUIseUJBQXlCLEVBQ3pCLHNCQUFzQixFQUN0QixZQUFZLEVBQ1osZUFBZSxFQUNmLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsV0FBVyxFQUNYLGNBQWMsRUFDZCxZQUFZLEVBQ1osZUFBZSxFQUNmLE9BQU8sRUFDUCxVQUFVLEVBQ1YsbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIscUJBQXFCLEVBQ3JCLGlDQUFpQyxHQUNqQyxNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sS0FBSyxLQUFLLE1BQU0saUJBQWlCLENBQUE7QUFDeEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNoQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLCtCQUErQixFQUMvQiwyQkFBMkIsRUFDM0IsZUFBZSxFQUNmLGNBQWMsRUFDZCxhQUFhLEdBQ2IsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixtQ0FBbUMsRUFDbkMsOEJBQThCLEVBQzlCLG9CQUFvQixHQUNwQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU5QyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUM1RCxjQUFjLEVBQUUsQ0FBQTtBQUNoQixpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsWUFBWSxvQ0FBNEIsQ0FBQTtBQUN6RSxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxzQkFBc0Isb0NBQTRCLENBQUE7QUFFN0YseUNBQXlDO0FBQ3pDLFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLHVCQUF1QixvQ0FBNEIsQ0FBQTtBQUNuRixRQUFRLENBQUMsRUFBRSxDQUNWLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQyw2QkFBNkIsQ0FBQyx5QkFBeUIsb0NBQTRCLENBQUE7QUFDckYsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUNYLFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLHNCQUFzQixvQ0FBNEIsQ0FBQTtBQUNuRixDQUFDO0FBQ0QsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsWUFBWSxrQ0FBMEIsQ0FBQTtBQUN0RSxRQUFRLENBQUMsRUFBRSxDQUNWLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQyw2QkFBNkIsQ0FBQyxvQkFBb0Isb0NBQTRCLENBQUE7QUFDaEYsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsc0JBQXNCLG9DQUE0QixDQUFBO0FBQ2xGLFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLDJCQUEyQixvQ0FBNEIsQ0FBQTtBQUN2RixRQUFRLENBQUMsRUFBRSxDQUNWLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLG9DQUE0QixDQUFBO0FBRTFFLHdCQUF3QjtBQUN4QixRQUFRLENBQUMsRUFBRSxDQUF1QixxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNoRyxJQUFJLEVBQUUsNkJBQTZCO0lBQ25DLE1BQU0sRUFBRSx5QkFBeUI7SUFDakMsVUFBVSxFQUFFLDhCQUE4QjtJQUMxQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsdUJBQXVCLEVBQ3ZCLGlEQUFpRCxDQUNqRDtJQUNELFdBQVcsRUFBRTtRQUNaO1lBQ0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUM7WUFDbEUsU0FBUyxFQUFFLG1CQUFtQjtZQUM5QixrQkFBa0IsRUFBRSxFQUFFO1NBQ3RCO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRiwwQ0FBMEM7QUFDMUMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDaEcsSUFBSSxFQUFFLHVCQUF1QjtJQUM3QixNQUFNLEVBQUUsaUNBQWlDO0lBQ3pDLFVBQVUsRUFBRSxzQkFBc0I7SUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDZCQUE2QixFQUM3QiwyQ0FBMkMsQ0FDM0M7SUFDRCxXQUFXLEVBQUU7UUFDWjtZQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHlCQUF5QixDQUFDO1lBQzVFLFNBQVMsRUFBRSx1QkFBdUI7U0FDbEM7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLDBCQUEwQixDQUN6QiwwQkFBMEIsRUFDMUIsMkJBQTJCLDJEQUUzQixDQUFBO0FBQ0QsMEJBQTBCLENBQ3pCLGlDQUFpQyxFQUNqQyw0QkFBNEIsMkRBRTVCLENBQUE7QUFDRCwwQkFBMEIsQ0FDekIsc0JBQXNCLEVBQ3RCLHVCQUF1QixpRUFFdkIsQ0FBQTtBQUVELE1BQU0sK0JBQStCLEdBQUcsQ0FDdkMsRUFBVSxFQUNWLEtBQTBCLEVBQzFCLElBQTJCLEVBQzNCLFlBQW1DLEVBQ2xDLEVBQUU7SUFDSCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7UUFDbEQsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDO1FBQzNELEtBQUssRUFBRSxhQUFhO1FBQ3BCLE9BQU8sRUFBRTtZQUNSLEVBQUU7WUFDRixLQUFLO1lBQ0wsUUFBUSxFQUFFLHNCQUFzQjtZQUNoQyxZQUFZO1NBQ1o7S0FDRCxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUE7QUFFRCwrQkFBK0IsQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtBQUNsRSwrQkFBK0IsQ0FDOUIsbUJBQW1CLEVBQ25CLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsRUFDcEQscUJBQXFCLENBQ3JCLENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsWUFBWSxFQUNaLGVBQWUsRUFDZixxQkFBcUIsRUFDckIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLFlBQVksRUFDWixlQUFlLEVBQ2YscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FDeEMsQ0FBQTtBQUNELCtCQUErQixDQUM5QixtQkFBbUIsRUFDbkIsc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUNyQixjQUFjLENBQUMsR0FBRyxDQUNqQixtQ0FBbUMsRUFDbkMscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FDeEMsQ0FDRCxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLFdBQVcsRUFDWCxjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FDeEMsQ0FBQTtBQUNELCtCQUErQixDQUM5QixRQUFRLEVBQ1IsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixjQUFjLENBQUMsR0FBRyxDQUNqQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQ3hDLG1DQUFtQyxDQUFDLFNBQVMsRUFBRSxDQUMvQyxDQUNELENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixxQkFBcUIsRUFDckIsY0FBYyxDQUFDLEVBQUUsQ0FBQyxpQ0FBaUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUMxRixDQUFBO0FBQ0QsK0JBQStCLENBQzlCLHlCQUF5QixFQUN6Qiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGlDQUFpQyxFQUNqQyxjQUFjLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxFQUFFLG9DQUFvQyxDQUFDLENBQzVGLENBQ0QsQ0FBQTtBQUNELCtCQUErQixDQUM5QixPQUFPLEVBQ1AsVUFBVSxFQUNWLHFCQUFxQixFQUNyQixjQUFjLENBQUMsRUFBRSxDQUNoQixpQ0FBaUMsQ0FBQyxTQUFTLEVBQUUsRUFDN0Msb0NBQW9DLENBQ3BDLENBQ0QsQ0FBQTtBQUNELCtCQUErQixDQUM5QixXQUFXLEVBQ1gsY0FBYyxFQUNkLHFCQUFxQixFQUNyQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQ3hDLENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsaUJBQWlCLEVBQ2pCLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGdCQUFnQixDQUFDLEVBQy9DLGdDQUFnQyxDQUNoQyxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLGlCQUFpQixFQUNqQixHQUFHLENBQUMsU0FBUyxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLEVBQ3ZELGdDQUFnQyxDQUNoQyxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLGlCQUFpQixDQUFDLEVBQUUsRUFDcEIsaUJBQWlCLENBQUMsS0FBSyxFQUN2QiwyQkFBMkIsQ0FDM0IsQ0FBQTtBQUNELCtCQUErQixDQUM5QixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLHFCQUFxQixDQUFDLEtBQUssRUFDM0IscUJBQXFCLENBQ3JCLENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsaUNBQWlDLENBQUMsRUFBRSxFQUNwQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQ3ZDLENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsMkJBQTJCLEVBQzNCLEdBQUcsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsQ0FDdEQsQ0FBQTtBQUNELCtCQUErQixDQUM5QixzQkFBc0IsRUFDdEIsaUJBQWlCLEVBQ2pCLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLDJCQUEyQixFQUMzQixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsYUFBYSw0QkFBb0IsQ0FBQyxDQUNsRSxDQUNELENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixjQUFjLENBQUMsR0FBRyxDQUNqQiwyQkFBMkIsRUFDM0IsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGFBQWEsNEJBQW9CLENBQUMsQ0FDbEUsQ0FDRCxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsY0FBYyxDQUFDLEdBQUcsQ0FDakIsMkJBQTJCLEVBQzNCLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxhQUFhLDRCQUFvQixDQUFDLENBQ2xFLENBQ0QsQ0FBQTtBQUNELCtCQUErQixDQUFDLHFCQUFxQixFQUFFLHdCQUF3QixDQUFDLENBQUE7QUFDaEYsK0JBQStCLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtBQUNoRiwrQkFBK0IsQ0FDOUIsc0JBQXNCLEVBQ3RCLHlCQUF5QixFQUN6QixxQkFBcUIsQ0FDckIsQ0FBQTtBQUNELCtCQUErQixDQUFDLHVCQUF1QixFQUFFLDBCQUEwQixDQUFDLENBQUE7QUFDcEYsK0JBQStCLENBQUMsdUJBQXVCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtBQUNwRiwrQkFBK0IsQ0FDOUIsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO0FBQ0QsK0JBQStCLENBQzlCLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIscUJBQXFCLEVBQ3JCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FDeEMsQ0FBQTtBQUNELCtCQUErQixDQUM5QixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQ3hDLENBQUE7QUFDRCwrQkFBK0IsQ0FDOUIsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO0FBRUQsK0JBQStCO0FBQy9CLE1BQU0seUJBQXlCLEdBQUcsQ0FDakMsTUFBYyxFQUNkLEVBQVUsRUFDVixLQUFtQyxFQUNuQyxLQUFhLEVBQ2IsSUFBMkIsRUFDM0IsWUFBbUMsRUFDbkMsS0FBSyxHQUFHLFlBQVksRUFDcEIsSUFBVyxFQUNWLEVBQUU7SUFDSCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtRQUNuQyxLQUFLO1FBQ0wsSUFBSTtRQUNKLEtBQUs7UUFDTCxJQUFJO1FBQ0osT0FBTyxFQUFFO1lBQ1IsRUFBRTtZQUNGLEtBQUs7WUFDTCxJQUFJO1lBQ0osWUFBWTtTQUNaO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsa0JBQWtCLEVBQ2xCLGFBQWEsRUFDYixFQUFFLEVBQ0YsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUNoRCxTQUFTLEVBQ1QsZ0JBQWdCLENBQ2hCLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLEVBQUUsRUFDRiwyQkFBMkIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQ2hELFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLHlCQUF5QixFQUN6Qiw0QkFBNEIsRUFDNUIsRUFBRSxFQUNGLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDaEQsa0NBQWtDLEVBQ2xDLG9DQUFvQyxDQUNwQyxFQUNELFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLE9BQU8sRUFDUCxVQUFVLEVBQ1YsRUFBRSxFQUNGLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDaEQsU0FBUyxFQUNULGdCQUFnQixDQUNoQixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsUUFBUSxFQUNSLFdBQVcsRUFDWCxFQUFFLEVBQ0YsY0FBYyxDQUFDLEdBQUcsQ0FDakIsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUMvQyxjQUFjLENBQUMsR0FBRyxDQUNqQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQ3hDLG1DQUFtQyxDQUFDLFNBQVMsRUFBRSxDQUMvQyxDQUNELENBQ0QsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLFdBQVcsRUFDWCxjQUFjLEVBQ2QsRUFBRSxFQUNGLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFDL0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUNELENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixZQUFZLEVBQ1osZUFBZSxFQUNmLEVBQUUsRUFDRiwyQkFBMkIsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQy9DLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FDeEMsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLFlBQVksRUFDWixlQUFlLEVBQ2YsRUFBRSxFQUNGLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFDL0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsV0FBVyxFQUNYLGNBQWMsRUFDZCxFQUFFLEVBQ0YsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUMvQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQ3hDLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixtQkFBbUIsRUFDbkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUNuRCxFQUFFLEVBQ0YsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUMvQyxTQUFTLEVBQ1QsYUFBYSxDQUNiLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixnQkFBZ0IsRUFDaEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLEVBQzdDLEVBQUUsRUFDRixjQUFjLENBQUMsR0FBRyxDQUNqQiwyQkFBMkIsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQ25ELCtCQUErQixDQUMvQixFQUNELG9DQUFvQyxDQUNwQyxDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsbUJBQW1CLEVBQ25CLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsRUFDakQsRUFBRSxFQUNGLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFDbkQsU0FBUyxFQUNULGdCQUFnQixDQUNoQixDQUFBO0FBRUQseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsY0FBYyxFQUNkLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLEVBQzlDLEVBQUUsRUFDRix1QkFBdUIsRUFDdkIscUJBQXFCLEVBQ3JCLFFBQVEsRUFDUixLQUFLLENBQUMsa0JBQWtCLENBQ3hCLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixlQUFlLEVBQ2YsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQ3JDLEVBQUUsRUFDRixjQUFjLENBQUMsRUFBRSxDQUNoQiw4QkFBOEIsRUFDOUIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUM1RixFQUNELDRCQUE0QixDQUFDLFNBQVMsRUFBRSxFQUN4QyxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsRUFBRSxFQUNGLFNBQVMsRUFDVCxTQUFTLEVBQ1QsZ0JBQWdCLENBQ2hCLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixxQkFBcUIsRUFDckIsd0JBQXdCLEVBQ3hCLEVBQUUsRUFDRixzQ0FBc0MsRUFDdEMsU0FBUyxFQUNULGdCQUFnQixDQUNoQixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixHQUFHLEVBQ0gsc0NBQXNDLEVBQ3RDLFNBQVMsRUFDVCxZQUFZLENBQ1osQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMscUJBQXFCLEVBQzVCLDJCQUEyQixFQUMzQixHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixDQUFDLEVBQzNELEdBQUcsRUFDSCwwQ0FBMEMsRUFDMUMsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxxQkFBcUIsRUFDNUIsMkJBQTJCLEVBQzNCLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsRUFDOUQsR0FBRyxFQUNILDBDQUEwQyxFQUMxQyxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLHFCQUFxQixFQUM1QiwrQkFBK0IsRUFDL0IsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx1QkFBdUIsQ0FBQyxFQUNqRSxHQUFHLEVBQ0gsOENBQThDLEVBQzlDLFNBQVMsRUFDVCxZQUFZLENBQ1osQ0FBQTtBQUVELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLGNBQWMsRUFDZCxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxFQUM5QyxFQUFFLEVBQ0YsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQixRQUFRLEVBQ1IsS0FBSyxDQUFDLGtCQUFrQixDQUN4QixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxpQkFBaUIsRUFDeEIsYUFBYSxFQUNiLGdCQUFnQixFQUNoQixFQUFFLEVBQ0YsU0FBUyxFQUNULFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIsRUFBRSxFQUNGLHNDQUFzQyxFQUN0QyxTQUFTLEVBQ1QsZ0JBQWdCLENBQ2hCLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLGlCQUFpQixFQUN4QixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLEdBQUcsRUFDSCxzQ0FBc0MsRUFDdEMsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxpQkFBaUIsRUFDeEIsMkJBQTJCLEVBQzNCLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLENBQUMsRUFDM0QsR0FBRyxFQUNILDBDQUEwQyxFQUMxQyxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLGlCQUFpQixFQUN4QiwyQkFBMkIsRUFDM0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQyxFQUM5RCxHQUFHLEVBQ0gsMENBQTBDLEVBQzFDLFNBQVMsRUFDVCxZQUFZLENBQ1osQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLCtCQUErQixFQUMvQixHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHVCQUF1QixDQUFDLEVBQ2pFLEdBQUcsRUFDSCw4Q0FBOEMsRUFDOUMsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0FBRUQseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxpQkFBaUIsRUFDeEIsWUFBWSxFQUNaLGVBQWUsRUFDZixFQUFFLEVBQ0YsU0FBUyxFQUNULFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLDBCQUEwQixFQUMxQixHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGlCQUFpQixDQUFDLEVBQ3RELEVBQUUsRUFDRix1QkFBdUIsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQy9DLFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLHlCQUF5QixFQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFDckMsRUFBRSxFQUNGLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFDL0MsZ0NBQWdDLENBQ2hDLEVBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FDakIsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUM3Qyw4QkFBOEIsQ0FDOUIsQ0FDRCxFQUNELDRCQUE0QixDQUFDLFNBQVMsRUFBRSxFQUN4QyxnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLGFBQWEsRUFDYixHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFDdkMsRUFBRSxFQUNGLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFDL0MsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUM3QyxFQUNELHFCQUFxQixFQUNyQixnQkFBZ0IsQ0FDaEIsQ0FBQTtBQUNELHlCQUF5QixDQUN4QixNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLGNBQWMsRUFDZCxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxFQUM5QyxFQUFFLEVBQ0YsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxRQUFRLEVBQ1IsS0FBSyxDQUFDLGtCQUFrQixDQUN4QixDQUFBO0FBQ0QseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyxpQkFBaUIsRUFDeEIsNEJBQTRCLEVBQzVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsRUFDMUQsRUFBRSxFQUNGLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFDL0MsU0FBUyxFQUNULFFBQVEsRUFDUixLQUFLLENBQUMscUJBQXFCLENBQzNCLENBQUE7QUFDRCx5QkFBeUIsQ0FDeEIsTUFBTSxDQUFDLGlCQUFpQixFQUN4QixtQ0FBbUMsRUFDbkMsOEJBQThCLEVBQzlCLEVBQUUsRUFDRixTQUFTLEVBQ1QsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0FBRUQseUJBQXlCLENBQ3hCLE1BQU0sQ0FBQyx3QkFBd0IsRUFDL0IsK0JBQStCLEVBQy9CLGtDQUFrQyxFQUNsQyxFQUFFLEVBQ0Ysc0JBQXNCLENBQ3RCLENBQUE7QUFFRCxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQztJQUMxQyxFQUFFLEVBQUUsYUFBYTtJQUNqQixNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsMkJBQTJCLENBQUMsTUFBTSxFQUFFLEVBQ3BDLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsRUFDM0Msa0JBQWtCLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQy9DLENBQ0Q7SUFDRCxPQUFPLEVBQUUsaURBQTZCO0NBQ3RDLENBQUMsQ0FBQTtBQUVGLFlBQVk7QUFDWixJQUFJLFdBQVcsRUFBRSxDQUFDO0lBQ2pCLE1BQU0scUJBQXFCLEdBQUcsQ0FDN0IsRUFBVSxFQUNWLEtBQW1DLEVBQ25DLEtBQWEsRUFDYixJQUFzQyxFQUN0QyxPQUFZLEVBQ1gsRUFBRTtRQUNILFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtZQUNuRCxPQUFPLEVBQUU7Z0JBQ1IsRUFBRTtnQkFDRixLQUFLO2dCQUNMLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7YUFDdkI7WUFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUM7WUFDM0QsS0FBSyxFQUFFLFNBQVM7WUFDaEIsS0FBSztTQUNMLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQTtJQUVELHFCQUFxQixDQUNwQixvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsRUFDRCxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsRUFDakMsVUFBVSxDQUFDLFNBQVMsQ0FBQywwREFBMEQsQ0FBQyxDQUNoRixDQUFBO0lBQ0QscUJBQXFCLENBQ3BCLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsQ0FBQyxFQUNELHFCQUFxQixDQUFDLFNBQVMsRUFBRSxFQUNqQyxVQUFVLENBQUMsU0FBUyxDQUFDLG9FQUFvRSxDQUFDLENBQzFGLENBQUE7SUFDRCxxQkFBcUIsQ0FDcEIsV0FBVyxFQUNYLGNBQWMsRUFDZCxDQUFDLEVBQ0QsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUN4QyxVQUFVLENBQUMsU0FBUyxDQUFDLDBEQUEwRCxDQUFDLENBQ2hGLENBQUE7SUFDRCxxQkFBcUIsQ0FDcEIsUUFBUSxFQUNSLFdBQVcsRUFDWCxDQUFDLEVBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FDakIscUJBQXFCLEVBQ3JCLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDeEMsbUNBQW1DLENBQUMsU0FBUyxFQUFFLENBQy9DLENBQ0QsRUFDRCxVQUFVLENBQUMsU0FBUyxDQUFDLHVEQUF1RCxDQUFDLENBQzdFLENBQUE7SUFDRCxxQkFBcUIsQ0FDcEIsWUFBWSxFQUNaLGVBQWUsRUFDZixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLFVBQVUsQ0FBQyxTQUFTLENBQUMsMERBQTBELENBQUMsQ0FDaEYsQ0FBQTtJQUNELHFCQUFxQixDQUNwQixZQUFZLEVBQ1osZUFBZSxFQUNmLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsVUFBVSxDQUFDLFNBQVMsQ0FBQywwREFBMEQsQ0FBQyxDQUNoRixDQUFBO0lBQ0QscUJBQXFCLENBQ3BCLFdBQVcsRUFDWCxjQUFjLEVBQ2QsQ0FBQyxFQUNELHFCQUFxQixFQUNyQixVQUFVLENBQUMsU0FBUyxDQUFDLHlEQUF5RCxDQUFDLENBQy9FLENBQUE7SUFDRCxxQkFBcUIsQ0FDcEIsa0JBQWtCLEVBQ2xCLGFBQWEsRUFDYixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLFVBQVUsQ0FBQyxTQUFTLENBQUMseURBQXlELENBQUMsQ0FDL0UsQ0FBQTtJQUNELHFCQUFxQixDQUNwQixPQUFPLEVBQ1AsVUFBVSxFQUNWLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxzREFBc0QsQ0FBQyxDQUM1RSxDQUFBO0FBQ0YsQ0FBQztBQUVELGdEQUFnRDtBQUVoRCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUU7SUFDL0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxjQUFjO0lBQzlCLHFCQUFxQixFQUFFLElBQUk7SUFDM0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDO0lBQzlDLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUTtJQUNwQixLQUFLLEVBQUUsWUFBWTtJQUNuQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0NBQ1QsQ0FBQyxDQUFBO0FBRUYsYUFBYTtBQUViLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxPQUFPLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtJQUNoQyxLQUFLLEVBQUU7UUFDTixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztRQUNsQyxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQztLQUN6RjtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsS0FBSyxFQUFFLFNBQVM7SUFDaEIsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLHNCQUFzQjtRQUMxQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMvRCxtQkFBbUIsQ0FDbkI7S0FDRDtJQUNELEtBQUssRUFBRSxDQUFDO0lBQ1IsSUFBSSxFQUFFLDJCQUEyQjtDQUNqQyxDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtJQUNwRCxLQUFLLEVBQUUsU0FBUztJQUNoQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsb0JBQW9CO1FBQ3hCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNwRCx5QkFBeUIsQ0FDekI7S0FDRDtJQUNELEtBQUssRUFBRSxDQUFDO0lBQ1IsSUFBSSxFQUFFLDJCQUEyQjtDQUNqQyxDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtJQUNwRCxLQUFLLEVBQUUsU0FBUztJQUNoQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsT0FBTztRQUNYLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzlELGtCQUFrQixDQUNsQjtRQUNELFlBQVksRUFBRSxxQkFBcUI7S0FDbkM7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSwyQkFBMkI7Q0FDakMsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsS0FBSyxFQUFFLFNBQVM7SUFDaEIsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGtCQUFrQjtRQUN0QixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxHQUFHLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNsRSxxQkFBcUIsQ0FDckI7UUFDRCxZQUFZLEVBQUUscUJBQXFCO0tBQ25DO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsMkJBQTJCO0NBQ2pDLENBQUMsQ0FBQTtBQUVGLGdCQUFnQjtBQUVoQixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtJQUNwRCxLQUFLLEVBQUUsaUJBQWlCO0lBQ3hCLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxvQkFBb0I7UUFDeEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDakUsd0JBQXdCLENBQ3hCO0tBQ0Q7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSwyQkFBMkI7Q0FDakMsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCO0FBQ2hCLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFO0lBQ3BELEtBQUssRUFBRSxRQUFRO0lBQ2YsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLFlBQVk7UUFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUM7UUFDN0YsWUFBWSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7S0FDdEQ7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSwyQkFBMkI7Q0FDakMsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsS0FBSyxFQUFFLFFBQVE7SUFDZixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsWUFBWTtRQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQztRQUM3RixZQUFZLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztLQUN0RDtJQUNELEtBQUssRUFBRSxDQUFDO0lBQ1IsSUFBSSxFQUFFLDJCQUEyQjtDQUNqQyxDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTtJQUNwRCxLQUFLLEVBQUUsUUFBUTtJQUNmLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxXQUFXO1FBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUM7UUFDM0YsWUFBWSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7S0FDdEQ7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSwyQkFBMkI7Q0FDakMsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsS0FBSyxFQUFFLFFBQVE7SUFDZixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsV0FBVztRQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDO1FBQzVGLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0tBQ3REO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsMkJBQTJCO0NBQ2pDLENBQUMsQ0FBQTtBQUVGLGtCQUFrQjtBQUVsQixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRTtJQUM1RCxLQUFLLEVBQUUsZUFBZTtJQUN0QixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsMkJBQTJCO1FBQy9CLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ2pFLHFCQUFxQixDQUNyQjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsMkJBQTJCO0NBQ2pDLENBQUMsQ0FBQTtBQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFO0lBQ3BELEtBQUssRUFBRSxrQkFBa0I7SUFDekIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2xCLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDOUQsa0JBQWtCLENBQ2xCO0lBQ0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyx3QkFBd0I7SUFDeEMsS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsMkJBQTJCO0NBQ2pDLENBQUMsQ0FBQTtBQUVGLDREQUE0RDtBQUU1RCxvQkFBb0I7QUFDcEIsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7SUFDcEQsS0FBSyxFQUFFLFdBQVc7SUFDbEIsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGtDQUFrQztRQUN0QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsRUFBRSxHQUFHLEVBQUUsOEJBQThCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUMzRSxtQ0FBbUMsQ0FDbkM7S0FDRDtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsc0JBQXNCO0FBRXRCLE1BQU0sY0FBYyxHQUFrQixRQUFRLENBQUMsRUFBRSxDQUNoRCxjQUFjLENBQUMsc0JBQXNCLENBQ3JDLENBQUMscUJBQXFCLENBQ3RCO0lBQ0MsRUFBRSxFQUFFLGNBQWM7SUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ25CLEVBQUUsT0FBTyxFQUFFLENBQUMsOENBQThDLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEVBQ2hGLGVBQWUsQ0FDZjtJQUNELElBQUksRUFBRSxLQUFLLENBQUMsb0JBQW9CO0lBQ2hDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRTtRQUNyRCxjQUFjO1FBQ2QsRUFBRSxvQ0FBb0MsRUFBRSxJQUFJLEVBQUU7S0FDOUMsQ0FBQztJQUNGLFNBQVMsRUFBRSxjQUFjO0lBQ3pCLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLEtBQUssRUFBRSxDQUFDO0NBQ1IsdUNBRUQsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsQ0FDbEMsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQWlCLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxhQUFhLENBQ3RFO0lBQ0M7UUFDQyxFQUFFLEVBQUUsWUFBWTtRQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FDbEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsRUFDaEYsZUFBZSxDQUNmO1FBQ0QsYUFBYSxFQUFFLEtBQUssQ0FBQyxvQkFBb0I7UUFDekMsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixXQUFXLEVBQUUsSUFBSTtRQUNqQixJQUFJLEVBQUUsMkJBQTJCO1FBQ2pDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDeEMsMkJBQTJCLEVBQUU7WUFDNUIsRUFBRSxFQUFFLG1DQUFtQztZQUN2QyxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNuRSxpQkFBaUIsQ0FDakI7WUFDRCxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsbURBQTZCLHdCQUFlLEVBQUU7WUFDdEUsS0FBSyxFQUFFLENBQUM7U0FDUjtLQUNEO0NBQ0QsRUFDRCxjQUFjLENBQ2QsQ0FBQTtBQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ2hDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FDckMsQ0FBQyxxQkFBcUIsQ0FDdEI7SUFDQyxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUM7SUFDdEQsMkJBQTJCLEVBQUU7UUFDNUIsRUFBRSxFQUFFLFVBQVU7UUFDZCxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDeEQsT0FBTyxDQUNQO1FBQ0QsV0FBVyxFQUFFLEVBQUUsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZSxFQUFFO1FBQ3RFLEtBQUssRUFBRSxDQUFDO0tBQ1I7SUFDRCxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsc0JBQXNCLENBQUM7SUFDMUQsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXO0lBQ3ZCLHNCQUFzQixFQUFFLElBQUk7SUFDNUIsS0FBSyxFQUFFLENBQUM7Q0FDUix3Q0FFRCxDQUFBO0FBRUQsK0JBQStCO0FBQy9CLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUMvRSxhQUFhLENBQUMsYUFBYSxDQUMxQjtJQUNDO1FBQ0MsRUFBRSxFQUFFLGlCQUFpQjtRQUNyQixJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO1FBQzdDLGFBQWEsRUFBRSxLQUFLLENBQUMsaUJBQWlCO1FBQ3RDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxhQUFhLENBQUM7UUFDakQsS0FBSyxFQUFFLEVBQUU7UUFDVCxNQUFNLEVBQUUsRUFBRTtRQUNWLG1CQUFtQixFQUFFLElBQUk7UUFDekIsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLDJDQUEyQyxFQUFFO1FBQ2pFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0tBQzNDO0NBQ0QsRUFDRCxhQUFhLENBQ2IsQ0FBQTtBQUNELGFBQWEsQ0FBQyxhQUFhLENBQzFCO0lBQ0M7UUFDQyxFQUFFLEVBQUUsYUFBYTtRQUNqQixJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1FBQ3JDLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYTtRQUNsQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUM7UUFDeEQsS0FBSyxFQUFFLEVBQUU7UUFDVCxNQUFNLEVBQUUsRUFBRTtRQUNWLG1CQUFtQixFQUFFLElBQUk7UUFDekIsV0FBVyxFQUFFLElBQUk7UUFDakIsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLHVDQUF1QyxFQUFFO1FBQzdELElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0tBQzNDO0NBQ0QsRUFDRCxhQUFhLENBQ2IsQ0FBQTtBQUNELGFBQWEsQ0FBQyxhQUFhLENBQzFCO0lBQ0M7UUFDQyxFQUFFLEVBQUUsaUJBQWlCO1FBQ3JCLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUM7UUFDOUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxpQkFBaUI7UUFDdEMsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLGFBQWEsQ0FBQztRQUNqRCxLQUFLLEVBQUUsRUFBRTtRQUNULE1BQU0sRUFBRSxFQUFFO1FBQ1YsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixXQUFXLEVBQUUsSUFBSTtRQUNqQixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLEVBQUU7UUFDakUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7S0FDM0M7Q0FDRCxFQUNELGFBQWEsQ0FDYixDQUFBO0FBQ0QsYUFBYSxDQUFDLGFBQWEsQ0FDMUI7SUFDQztRQUNDLEVBQUUsRUFBRSxtQkFBbUI7UUFDdkIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztRQUNqRCxhQUFhLEVBQUUsS0FBSyxDQUFDLG1CQUFtQjtRQUN4QyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDO1FBQ25ELEtBQUssRUFBRSxFQUFFO1FBQ1QsTUFBTSxFQUFFLEVBQUU7UUFDVixtQkFBbUIsRUFBRSxJQUFJO1FBQ3pCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSw2Q0FBNkMsRUFBRTtRQUNuRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDdEIseUJBQXlCLEVBQ3pCLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFDckMsb0JBQW9CLENBQ3BCO0tBQ0Q7Q0FDRCxFQUNELGFBQWEsQ0FDYixDQUFBO0FBQ0QsYUFBYSxDQUFDLGFBQWEsQ0FDMUI7SUFDQztRQUNDLEVBQUUsRUFBRSxXQUFXLENBQUMsRUFBRTtRQUNsQixJQUFJLEVBQUUsV0FBVyxDQUFDLEtBQUs7UUFDdkIsYUFBYSxFQUFFLEtBQUssQ0FBQyxXQUFXO1FBQ2hDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUM7UUFDL0MsS0FBSyxFQUFFLENBQUM7UUFDUixNQUFNLEVBQUUsRUFBRTtRQUNWLG1CQUFtQixFQUFFLElBQUk7UUFDekIsSUFBSSxFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7S0FDMUM7Q0FDRCxFQUNELGFBQWEsQ0FDYixDQUFBO0FBQ0QsYUFBYSxDQUFDLGFBQWEsQ0FDMUI7SUFDQztRQUNDLEVBQUUsRUFBRSxzQkFBc0I7UUFDMUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO1FBQ3RELGFBQWEsRUFBRSxLQUFLLENBQUMscUJBQXFCO1FBQzFDLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQztRQUNyRCxLQUFLLEVBQUUsRUFBRTtRQUNULE1BQU0sRUFBRSxDQUFDO1FBQ1QsbUJBQW1CLEVBQUUsSUFBSTtRQUN6QixXQUFXLEVBQUUsSUFBSTtRQUNqQixTQUFTLEVBQUUsSUFBSTtRQUNmLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixnQ0FBZ0MsRUFDaEMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUNyQztLQUNEO0NBQ0QsRUFDRCxhQUFhLENBQ2IsQ0FBQTtBQUVELDRCQUE0QjtBQUU1QixRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUMxQixlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUMxQyxFQUNELENBQUMsSUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUMxQyxDQUFBO0FBRUQseUJBQXlCO0FBQ3pCLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFBO0FBQ0QscUJBQXFCLENBQUMscUJBQXFCLENBQUM7SUFDM0MsRUFBRSxFQUFFLE9BQU87SUFDWCxLQUFLLEVBQUUsRUFBRTtJQUNULEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sQ0FBQztJQUN2RCxJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLHlCQUF5QixFQUFFO1lBQzFCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUNBQXVDLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsRUFDaEYsMERBQTBELENBQzFEO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUNBQXVDLENBQUMsRUFBRSxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsRUFDekYsd0NBQXdDLENBQ3hDO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELCtCQUErQixFQUFFO1lBQ2hDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLHVCQUF1QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sQ0FBQztZQUMxRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSx5QkFBeUIsRUFBRSxFQUN0Riw4RkFBOEYsQ0FDOUY7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxlQUFlLENBQUM7Z0JBQ3ZFLEdBQUcsQ0FBQyxRQUFRLENBQ1gscURBQXFELEVBQ3JELDZCQUE2QixDQUM3QjtnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLG1EQUFtRCxFQUNuRCwyQkFBMkIsQ0FDM0I7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSwyQkFBMkIsQ0FBQzthQUMvRTtZQUNELE9BQU8sRUFBRSxVQUFVO1NBQ25CO1FBQ0QseUJBQXlCLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxFQUNoRixxRUFBcUUsQ0FDckU7WUFDRCxPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsOEJBQThCLEVBQUU7WUFDL0IsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsRUFBRSxFQUNyRixtR0FBbUcsQ0FDbkc7WUFDRCxPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0Qsb0JBQW9CLEVBQUU7WUFDckIsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztZQUMzQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUUsRUFDM0Usd0RBQXdELENBQ3hEO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsaUJBQWlCLEVBQ2pCLCtEQUErRCxDQUMvRDtnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLGtCQUFrQixFQUNsQiw4REFBOEQsQ0FDOUQ7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCw0QkFBNEIsRUFDNUIsMEdBQTBHLENBQzFHO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsTUFBTTtTQUNmO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDO1lBQ3ZELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLEVBQUUsT0FBTyxFQUFFLENBQUMsdUNBQXVDLENBQUMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsRUFDOUUsc0pBQXNKLEVBQ3RKLDBCQUEwQixDQUMxQjtZQUNELE9BQU8sRUFBRSxVQUFVO1lBQ25CLHdCQUF3QixFQUFFO2dCQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGtDQUFrQyxDQUFDO2dCQUN6RSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHlDQUF5QyxDQUFDO2dCQUM5RSxHQUFHLENBQUMsUUFBUSxDQUNYLDRCQUE0QixFQUM1Qiw0REFBNEQsQ0FDNUQ7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw0QkFBNEIsQ0FBQzthQUNqRTtTQUNEO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQztZQUNoRCxnQkFBZ0IsRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsZ0NBQWdDLENBQUM7Z0JBQ3ZELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLGlDQUFpQyxDQUFDO2dCQUN6RCxHQUFHLENBQUMsUUFBUSxDQUNYLHFCQUFxQixFQUNyQiwwRUFBMEUsQ0FDMUU7YUFDRDtZQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLEVBQzlFLHVEQUF1RCxDQUN2RDtZQUNELE9BQU8sRUFBRSxxQkFBcUI7U0FDOUI7UUFDRCw4QkFBOEIsRUFBRSwrQkFBK0I7UUFDL0QsMEJBQTBCLEVBQUU7WUFDM0IsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLDJGQUEyRixDQUMzRjtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxtQ0FBbUMsRUFBRTtZQUNwQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QjtnQkFDQyxPQUFPLEVBQUUsQ0FBQyx1Q0FBdUMsQ0FBQztnQkFDbEQsR0FBRyxFQUFFLG1DQUFtQzthQUN4QyxFQUNELGdHQUFnRyxDQUNoRztZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxpQkFBaUIsRUFBRTtZQUNsQixJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUsa0JBQWtCLENBQUM7WUFDeEYsT0FBTyxFQUFFLGtCQUFrQjtZQUMzQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsMkNBQTJDLENBQUM7U0FDbkY7UUFDRCxnQ0FBZ0MsRUFBRTtZQUNqQyxJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLEVBQ3ZGLDBLQUEwSyxDQUMxSztZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCx3QkFBd0IsRUFBRTtZQUN6QixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3QkFBd0IsRUFDeEIsd0RBQXdELENBQ3hEO1lBQ0QsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO1NBQzlCO1FBQ0QsMEJBQTBCLEVBQUU7WUFDM0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLGdEQUFnRCxDQUNoRDtZQUNELE9BQU8sRUFBRSxTQUFTO1NBQ2xCO1FBQ0QsMEJBQTBCLEVBQUU7WUFDM0IsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLCtHQUErRyxDQUMvRztZQUNELE9BQU8sRUFBRSxDQUFDO1NBQ1Y7UUFDRCx3QkFBd0IsRUFBRTtZQUN6QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3QkFBd0IsRUFDeEIseURBQXlELENBQ3pEO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtDQUFrQyxFQUNsQyxzRUFBc0UsQ0FDdEU7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNiO1FBQ0Qsc0NBQXNDLEVBQUU7WUFDdkMsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsc0NBQXNDLEVBQ3RDLDhHQUE4RyxDQUM5RztZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCx1Q0FBdUMsRUFBRTtZQUN4QyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDO1lBQ25CLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1Q0FBdUMsRUFDdkMsdUpBQXVKLENBQ3ZKO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUNBQXVDLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQ3JFLHdIQUF3SCxDQUN4SDtZQUNELE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtZQUM5QyxJQUFJLEVBQUUsY0FBYztZQUNwQiw0QkFBNEIsRUFBRSxJQUFJO1NBQ2xDO1FBQ0QsMEJBQTBCLEVBQUU7WUFDM0IsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLG1GQUFtRixDQUNuRjtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCwwQkFBMEIsRUFBRTtZQUMzQixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQkFBMEIsRUFDMUIseUVBQXlFLENBQ3pFO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELG9CQUFvQixFQUFFO1lBQ3JCLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztZQUN0RCxnQkFBZ0IsRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUseUNBQXlDLENBQUM7Z0JBQ3RFLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLG9EQUFvRCxDQUFDO2dCQUNoRixHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUM7Z0JBQ3RDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDO2FBQzNDO1lBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9CQUFvQixFQUNwQixnRkFBZ0YsQ0FDaEY7WUFDRCxPQUFPLEVBQUUsUUFBUTtTQUNqQjtRQUNELHNDQUFzQyxFQUFFO1lBQ3ZDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCO2dCQUNDLE9BQU8sRUFBRSxDQUFDLHVDQUF1QyxDQUFDO2dCQUNsRCxHQUFHLEVBQUUsZ0NBQWdDO2FBQ3JDLEVBQ0QscUVBQXFFLENBQ3JFO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELHNDQUFzQyxFQUFFO1lBQ3ZDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCO2dCQUNDLE9BQU8sRUFBRSxDQUFDLHVDQUF1QyxDQUFDO2dCQUNsRCxHQUFHLEVBQUUsZ0NBQWdDO2FBQ3JDLEVBQ0QsMEdBQTBHLENBQzFHO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELHVCQUF1QixFQUFFO1lBQ3hCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1QkFBdUIsRUFDdkIsZ0VBQWdFLENBQ2hFO1lBQ0QsSUFBSSxFQUFFLENBQUMseUJBQXlCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxDQUFDO1lBQzVFLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUNYLCtDQUErQyxFQUMvQyx1RUFBdUUsQ0FDdkU7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCx1REFBdUQsRUFDdkQsNEZBQTRGLENBQzVGO2dCQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsNEJBQTRCLEVBQzVCLHlEQUF5RCxDQUN6RDthQUNEO1lBQ0QsT0FBTyxFQUFFLHlCQUF5QjtZQUNsQyxLQUFLLGlEQUF5QztTQUM5QztRQUNELHFCQUFxQixFQUFFO1lBQ3RCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQkFBcUIsRUFDckIsd0ZBQXdGLENBQ3hGO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO1lBQ3pCLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGdCQUFnQixDQUFDO2dCQUMzRCxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDZDQUE2QyxDQUFDO2FBQ3pGO1lBQ0QsT0FBTyxFQUFFLE9BQU87U0FDaEI7UUFDRCxzQ0FBc0MsRUFBRTtZQUN2QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHNDQUFzQyxFQUN0Qyx1Q0FBdUMsQ0FDdkM7U0FDRDtRQUNELCtCQUErQixFQUFFO1lBQ2hDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7WUFDM0IsT0FBTyxFQUFFLE1BQU07WUFDZixnQkFBZ0IsRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FDWCxvQ0FBb0MsRUFDcEMsNEVBQTRFLENBQzVFO2dCQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsa0NBQWtDLEVBQ2xDLDZDQUE2QyxDQUM3QztnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLG1DQUFtQyxFQUNuQyw0Q0FBNEMsQ0FDNUM7YUFDRDtZQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQkFBK0IsRUFDL0IsZ0lBQWdJLENBQ2hJO1NBQ0Q7UUFDRCw0QkFBNEIsRUFBRTtZQUM3QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qiw0QkFBNEIsRUFDNUIsa0RBQWtELENBQ2xEO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELGtDQUFrQyxFQUFFO1lBQ25DLElBQUksRUFBRSxTQUFTO1lBQ2YsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEM7Z0JBQ0MsT0FBTyxFQUFFLENBQUMsdUNBQXVDLENBQUM7Z0JBQ2xELEdBQUcsRUFBRSxrQ0FBa0M7YUFDdkMsRUFDRCx3SUFBd0ksRUFDeEksMkJBQTJCLENBQzNCO1lBQ0QsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELGdDQUFnQyxFQUFFO1lBQ2pDLElBQUksRUFBRSxTQUFTO1lBQ2YsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsZ0NBQWdDLEVBQ2hDLDZFQUE2RSxDQUM3RTtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtBQUN6RCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUE7QUFDNUQsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksNEJBQTRCLEVBQUUsQ0FBQyxDQUFBO0FBQ25FLDhCQUE4QixDQUM3QiwwQkFBMEIsQ0FBQyxFQUFFLEVBQzdCLDBCQUEwQix1Q0FFMUIsQ0FBQTtBQUNELDhCQUE4QixDQUM3QixnQ0FBZ0MsQ0FBQyxFQUFFLEVBQ25DLGdDQUFnQyx1Q0FFaEMsQ0FBQSJ9