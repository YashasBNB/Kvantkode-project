/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const VIEWLET_ID = 'workbench.view.debug';
export const VARIABLES_VIEW_ID = 'workbench.debug.variablesView';
export const WATCH_VIEW_ID = 'workbench.debug.watchExpressionsView';
export const CALLSTACK_VIEW_ID = 'workbench.debug.callStackView';
export const LOADED_SCRIPTS_VIEW_ID = 'workbench.debug.loadedScriptsView';
export const BREAKPOINTS_VIEW_ID = 'workbench.debug.breakPointsView';
export const DISASSEMBLY_VIEW_ID = 'workbench.debug.disassemblyView';
export const DEBUG_PANEL_ID = 'workbench.panel.repl';
export const REPL_VIEW_ID = 'workbench.panel.repl.view';
export const CONTEXT_DEBUG_TYPE = new RawContextKey('debugType', undefined, {
    type: 'string',
    description: nls.localize('debugType', "Debug type of the active debug session. For example 'python'."),
});
export const CONTEXT_DEBUG_CONFIGURATION_TYPE = new RawContextKey('debugConfigurationType', undefined, {
    type: 'string',
    description: nls.localize('debugConfigurationType', "Debug type of the selected launch configuration. For example 'python'."),
});
export const CONTEXT_DEBUG_STATE = new RawContextKey('debugState', 'inactive', {
    type: 'string',
    description: nls.localize('debugState', "State that the focused debug session is in. One of the following: 'inactive', 'initializing', 'stopped' or 'running'."),
});
export const CONTEXT_DEBUG_UX_KEY = 'debugUx';
export const CONTEXT_DEBUG_UX = new RawContextKey(CONTEXT_DEBUG_UX_KEY, 'default', {
    type: 'string',
    description: nls.localize('debugUX', "Debug UX state. When there are no debug configurations it is 'simple', otherwise 'default'. Used to decide when to show welcome views in the debug viewlet."),
});
export const CONTEXT_HAS_DEBUGGED = new RawContextKey('hasDebugged', false, {
    type: 'boolean',
    description: nls.localize('hasDebugged', 'True when a debug session has been started at least once, false otherwise.'),
});
export const CONTEXT_IN_DEBUG_MODE = new RawContextKey('inDebugMode', false, {
    type: 'boolean',
    description: nls.localize('inDebugMode', 'True when debugging, false otherwise.'),
});
export const CONTEXT_IN_DEBUG_REPL = new RawContextKey('inDebugRepl', false, {
    type: 'boolean',
    description: nls.localize('inDebugRepl', 'True when focus is in the debug console, false otherwise.'),
});
export const CONTEXT_BREAKPOINT_WIDGET_VISIBLE = new RawContextKey('breakpointWidgetVisible', false, {
    type: 'boolean',
    description: nls.localize('breakpointWidgetVisibile', 'True when breakpoint editor zone widget is visible, false otherwise.'),
});
export const CONTEXT_IN_BREAKPOINT_WIDGET = new RawContextKey('inBreakpointWidget', false, {
    type: 'boolean',
    description: nls.localize('inBreakpointWidget', 'True when focus is in the breakpoint editor zone widget, false otherwise.'),
});
export const CONTEXT_BREAKPOINTS_FOCUSED = new RawContextKey('breakpointsFocused', true, {
    type: 'boolean',
    description: nls.localize('breakpointsFocused', 'True when the BREAKPOINTS view is focused, false otherwise.'),
});
export const CONTEXT_WATCH_EXPRESSIONS_FOCUSED = new RawContextKey('watchExpressionsFocused', true, {
    type: 'boolean',
    description: nls.localize('watchExpressionsFocused', 'True when the WATCH view is focused, false otherwise.'),
});
export const CONTEXT_WATCH_EXPRESSIONS_EXIST = new RawContextKey('watchExpressionsExist', false, {
    type: 'boolean',
    description: nls.localize('watchExpressionsExist', 'True when at least one watch expression exists, false otherwise.'),
});
export const CONTEXT_VARIABLES_FOCUSED = new RawContextKey('variablesFocused', true, {
    type: 'boolean',
    description: nls.localize('variablesFocused', 'True when the VARIABLES views is focused, false otherwise'),
});
export const CONTEXT_EXPRESSION_SELECTED = new RawContextKey('expressionSelected', false, {
    type: 'boolean',
    description: nls.localize('expressionSelected', 'True when an expression input box is open in either the WATCH or the VARIABLES view, false otherwise.'),
});
export const CONTEXT_BREAKPOINT_INPUT_FOCUSED = new RawContextKey('breakpointInputFocused', false, {
    type: 'boolean',
    description: nls.localize('breakpointInputFocused', 'True when the input box has focus in the BREAKPOINTS view.'),
});
export const CONTEXT_CALLSTACK_ITEM_TYPE = new RawContextKey('callStackItemType', undefined, {
    type: 'string',
    description: nls.localize('callStackItemType', "Represents the item type of the focused element in the CALL STACK view. For example: 'session', 'thread', 'stackFrame'"),
});
export const CONTEXT_CALLSTACK_SESSION_IS_ATTACH = new RawContextKey('callStackSessionIsAttach', false, {
    type: 'boolean',
    description: nls.localize('callStackSessionIsAttach', 'True when the session in the CALL STACK view is attach, false otherwise. Used internally for inline menus in the CALL STACK view.'),
});
export const CONTEXT_CALLSTACK_ITEM_STOPPED = new RawContextKey('callStackItemStopped', false, {
    type: 'boolean',
    description: nls.localize('callStackItemStopped', 'True when the focused item in the CALL STACK is stopped. Used internaly for inline menus in the CALL STACK view.'),
});
export const CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD = new RawContextKey('callStackSessionHasOneThread', false, {
    type: 'boolean',
    description: nls.localize('callStackSessionHasOneThread', 'True when the focused session in the CALL STACK view has exactly one thread. Used internally for inline menus in the CALL STACK view.'),
});
export const CONTEXT_CALLSTACK_FOCUSED = new RawContextKey('callStackFocused', true, {
    type: 'boolean',
    description: nls.localize('callStackFocused', 'True when the CALLSTACK view is focused, false otherwise.'),
});
export const CONTEXT_WATCH_ITEM_TYPE = new RawContextKey('watchItemType', undefined, {
    type: 'string',
    description: nls.localize('watchItemType', "Represents the item type of the focused element in the WATCH view. For example: 'expression', 'variable'"),
});
export const CONTEXT_CAN_VIEW_MEMORY = new RawContextKey('canViewMemory', undefined, {
    type: 'boolean',
    description: nls.localize('canViewMemory', 'Indicates whether the item in the view has an associated memory refrence.'),
});
export const CONTEXT_BREAKPOINT_ITEM_TYPE = new RawContextKey('breakpointItemType', undefined, {
    type: 'string',
    description: nls.localize('breakpointItemType', "Represents the item type of the focused element in the BREAKPOINTS view. For example: 'breakpoint', 'exceptionBreakppint', 'functionBreakpoint', 'dataBreakpoint'"),
});
export const CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES = new RawContextKey('breakpointItemBytes', undefined, {
    type: 'boolean',
    description: nls.localize('breakpointItemIsDataBytes', 'Whether the breakpoint item is a data breakpoint on a byte range.'),
});
export const CONTEXT_BREAKPOINT_HAS_MODES = new RawContextKey('breakpointHasModes', false, {
    type: 'boolean',
    description: nls.localize('breakpointHasModes', 'Whether the breakpoint has multiple modes it can switch to.'),
});
export const CONTEXT_BREAKPOINT_SUPPORTS_CONDITION = new RawContextKey('breakpointSupportsCondition', false, {
    type: 'boolean',
    description: nls.localize('breakpointSupportsCondition', 'True when the focused breakpoint supports conditions.'),
});
export const CONTEXT_LOADED_SCRIPTS_SUPPORTED = new RawContextKey('loadedScriptsSupported', false, {
    type: 'boolean',
    description: nls.localize('loadedScriptsSupported', 'True when the focused sessions supports the LOADED SCRIPTS view'),
});
export const CONTEXT_LOADED_SCRIPTS_ITEM_TYPE = new RawContextKey('loadedScriptsItemType', undefined, {
    type: 'string',
    description: nls.localize('loadedScriptsItemType', 'Represents the item type of the focused element in the LOADED SCRIPTS view.'),
});
export const CONTEXT_FOCUSED_SESSION_IS_ATTACH = new RawContextKey('focusedSessionIsAttach', false, {
    type: 'boolean',
    description: nls.localize('focusedSessionIsAttach', "True when the focused session is 'attach'."),
});
export const CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG = new RawContextKey('focusedSessionIsNoDebug', false, {
    type: 'boolean',
    description: nls.localize('focusedSessionIsNoDebug', 'True when the focused session is run without debugging.'),
});
export const CONTEXT_STEP_BACK_SUPPORTED = new RawContextKey('stepBackSupported', false, {
    type: 'boolean',
    description: nls.localize('stepBackSupported', "True when the focused session supports 'stepBack' requests."),
});
export const CONTEXT_RESTART_FRAME_SUPPORTED = new RawContextKey('restartFrameSupported', false, {
    type: 'boolean',
    description: nls.localize('restartFrameSupported', "True when the focused session supports 'restartFrame' requests."),
});
export const CONTEXT_STACK_FRAME_SUPPORTS_RESTART = new RawContextKey('stackFrameSupportsRestart', false, {
    type: 'boolean',
    description: nls.localize('stackFrameSupportsRestart', "True when the focused stack frame supports 'restartFrame'."),
});
export const CONTEXT_JUMP_TO_CURSOR_SUPPORTED = new RawContextKey('jumpToCursorSupported', false, {
    type: 'boolean',
    description: nls.localize('jumpToCursorSupported', "True when the focused session supports 'jumpToCursor' request."),
});
export const CONTEXT_STEP_INTO_TARGETS_SUPPORTED = new RawContextKey('stepIntoTargetsSupported', false, {
    type: 'boolean',
    description: nls.localize('stepIntoTargetsSupported', "True when the focused session supports 'stepIntoTargets' request."),
});
export const CONTEXT_BREAKPOINTS_EXIST = new RawContextKey('breakpointsExist', false, {
    type: 'boolean',
    description: nls.localize('breakpointsExist', 'True when at least one breakpoint exists.'),
});
export const CONTEXT_DEBUGGERS_AVAILABLE = new RawContextKey('debuggersAvailable', false, {
    type: 'boolean',
    description: nls.localize('debuggersAvailable', 'True when there is at least one debug extensions active.'),
});
export const CONTEXT_DEBUG_EXTENSION_AVAILABLE = new RawContextKey('debugExtensionAvailable', true, {
    type: 'boolean',
    description: nls.localize('debugExtensionsAvailable', 'True when there is at least one debug extension installed and enabled.'),
});
export const CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT = new RawContextKey('debugProtocolVariableMenuContext', undefined, {
    type: 'string',
    description: nls.localize('debugProtocolVariableMenuContext', 'Represents the context the debug adapter sets on the focused variable in the VARIABLES view.'),
});
export const CONTEXT_SET_VARIABLE_SUPPORTED = new RawContextKey('debugSetVariableSupported', false, {
    type: 'boolean',
    description: nls.localize('debugSetVariableSupported', "True when the focused session supports 'setVariable' request."),
});
export const CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED = new RawContextKey('debugSetDataBreakpointAddressSupported', false, {
    type: 'boolean',
    description: nls.localize('debugSetDataBreakpointAddressSupported', "True when the focused session supports 'getBreakpointInfo' request on an address."),
});
export const CONTEXT_SET_EXPRESSION_SUPPORTED = new RawContextKey('debugSetExpressionSupported', false, {
    type: 'boolean',
    description: nls.localize('debugSetExpressionSupported', "True when the focused session supports 'setExpression' request."),
});
export const CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED = new RawContextKey('breakWhenValueChangesSupported', false, {
    type: 'boolean',
    description: nls.localize('breakWhenValueChangesSupported', 'True when the focused session supports to break when value changes.'),
});
export const CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED = new RawContextKey('breakWhenValueIsAccessedSupported', false, {
    type: 'boolean',
    description: nls.localize('breakWhenValueIsAccessedSupported', 'True when the focused breakpoint supports to break when value is accessed.'),
});
export const CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED = new RawContextKey('breakWhenValueIsReadSupported', false, {
    type: 'boolean',
    description: nls.localize('breakWhenValueIsReadSupported', 'True when the focused breakpoint supports to break when value is read.'),
});
export const CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED = new RawContextKey('terminateDebuggeeSupported', false, {
    type: 'boolean',
    description: nls.localize('terminateDebuggeeSupported', 'True when the focused session supports the terminate debuggee capability.'),
});
export const CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED = new RawContextKey('suspendDebuggeeSupported', false, {
    type: 'boolean',
    description: nls.localize('suspendDebuggeeSupported', 'True when the focused session supports the suspend debuggee capability.'),
});
export const CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT = new RawContextKey('variableEvaluateNamePresent', false, {
    type: 'boolean',
    description: nls.localize('variableEvaluateNamePresent', "True when the focused variable has an 'evalauteName' field set."),
});
export const CONTEXT_VARIABLE_IS_READONLY = new RawContextKey('variableIsReadonly', false, {
    type: 'boolean',
    description: nls.localize('variableIsReadonly', 'True when the focused variable is read-only.'),
});
export const CONTEXT_VARIABLE_VALUE = new RawContextKey('variableValue', false, {
    type: 'string',
    description: nls.localize('variableValue', 'Value of the variable, present for debug visualization clauses.'),
});
export const CONTEXT_VARIABLE_TYPE = new RawContextKey('variableType', false, {
    type: 'string',
    description: nls.localize('variableType', 'Type of the variable, present for debug visualization clauses.'),
});
export const CONTEXT_VARIABLE_INTERFACES = new RawContextKey('variableInterfaces', false, {
    type: 'array',
    description: nls.localize('variableInterfaces', 'Any interfaces or contracts that the variable satisfies, present for debug visualization clauses.'),
});
export const CONTEXT_VARIABLE_NAME = new RawContextKey('variableName', false, {
    type: 'string',
    description: nls.localize('variableName', 'Name of the variable, present for debug visualization clauses.'),
});
export const CONTEXT_VARIABLE_LANGUAGE = new RawContextKey('variableLanguage', false, {
    type: 'string',
    description: nls.localize('variableLanguage', 'Language of the variable source, present for debug visualization clauses.'),
});
export const CONTEXT_VARIABLE_EXTENSIONID = new RawContextKey('variableExtensionId', false, {
    type: 'string',
    description: nls.localize('variableExtensionId', 'Extension ID of the variable source, present for debug visualization clauses.'),
});
export const CONTEXT_EXCEPTION_WIDGET_VISIBLE = new RawContextKey('exceptionWidgetVisible', false, {
    type: 'boolean',
    description: nls.localize('exceptionWidgetVisible', 'True when the exception widget is visible.'),
});
export const CONTEXT_MULTI_SESSION_REPL = new RawContextKey('multiSessionRepl', false, {
    type: 'boolean',
    description: nls.localize('multiSessionRepl', 'True when there is more than 1 debug console.'),
});
export const CONTEXT_MULTI_SESSION_DEBUG = new RawContextKey('multiSessionDebug', false, {
    type: 'boolean',
    description: nls.localize('multiSessionDebug', 'True when there is more than 1 active debug session.'),
});
export const CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED = new RawContextKey('disassembleRequestSupported', false, {
    type: 'boolean',
    description: nls.localize('disassembleRequestSupported', 'True when the focused sessions supports disassemble request.'),
});
export const CONTEXT_DISASSEMBLY_VIEW_FOCUS = new RawContextKey('disassemblyViewFocus', false, {
    type: 'boolean',
    description: nls.localize('disassemblyViewFocus', 'True when the Disassembly View is focused.'),
});
export const CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST = new RawContextKey('languageSupportsDisassembleRequest', false, {
    type: 'boolean',
    description: nls.localize('languageSupportsDisassembleRequest', 'True when the language in the current editor supports disassemble request.'),
});
export const CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE = new RawContextKey('focusedStackFrameHasInstructionReference', false, {
    type: 'boolean',
    description: nls.localize('focusedStackFrameHasInstructionReference', 'True when the focused stack frame has instruction pointer reference.'),
});
export const debuggerDisabledMessage = (debugType) => nls.localize('debuggerDisabled', "Configured debug type '{0}' is installed but not supported in this environment.", debugType);
export const EDITOR_CONTRIBUTION_ID = 'editor.contrib.debug';
export const BREAKPOINT_EDITOR_CONTRIBUTION_ID = 'editor.contrib.breakpoint';
export const DEBUG_SCHEME = 'debug';
export const INTERNAL_CONSOLE_OPTIONS_SCHEMA = {
    enum: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart'],
    default: 'openOnFirstSessionStart',
    description: nls.localize('internalConsoleOptions', 'Controls when the internal Debug Console should open.'),
};
export var State;
(function (State) {
    State[State["Inactive"] = 0] = "Inactive";
    State[State["Initializing"] = 1] = "Initializing";
    State[State["Stopped"] = 2] = "Stopped";
    State[State["Running"] = 3] = "Running";
})(State || (State = {}));
export function getStateLabel(state) {
    switch (state) {
        case 1 /* State.Initializing */:
            return 'initializing';
        case 2 /* State.Stopped */:
            return 'stopped';
        case 3 /* State.Running */:
            return 'running';
        default:
            return 'inactive';
    }
}
export var MemoryRangeType;
(function (MemoryRangeType) {
    MemoryRangeType[MemoryRangeType["Valid"] = 0] = "Valid";
    MemoryRangeType[MemoryRangeType["Unreadable"] = 1] = "Unreadable";
    MemoryRangeType[MemoryRangeType["Error"] = 2] = "Error";
})(MemoryRangeType || (MemoryRangeType = {}));
export const DEBUG_MEMORY_SCHEME = 'vscode-debug-memory';
export function isFrameDeemphasized(frame) {
    const hint = frame.presentationHint ?? frame.source.presentationHint;
    return hint === 'deemphasize' || hint === 'subtle';
}
export var DataBreakpointSetType;
(function (DataBreakpointSetType) {
    DataBreakpointSetType[DataBreakpointSetType["Variable"] = 0] = "Variable";
    DataBreakpointSetType[DataBreakpointSetType["Address"] = 1] = "Address";
})(DataBreakpointSetType || (DataBreakpointSetType = {}));
export var DebugConfigurationProviderTriggerKind;
(function (DebugConfigurationProviderTriggerKind) {
    /**
     *	`DebugConfigurationProvider.provideDebugConfigurations` is called to provide the initial debug configurations for a newly created launch.json.
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Initial"] = 1] = "Initial";
    /**
     * `DebugConfigurationProvider.provideDebugConfigurations` is called to provide dynamically generated debug configurations when the user asks for them through the UI (e.g. via the "Select and Start Debugging" command).
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Dynamic"] = 2] = "Dynamic";
})(DebugConfigurationProviderTriggerKind || (DebugConfigurationProviderTriggerKind = {}));
export var DebuggerString;
(function (DebuggerString) {
    DebuggerString["UnverifiedBreakpoints"] = "unverifiedBreakpoints";
})(DebuggerString || (DebuggerString = {}));
// Debug service interfaces
export const IDebugService = createDecorator('debugService');
// Editor interfaces
export var BreakpointWidgetContext;
(function (BreakpointWidgetContext) {
    BreakpointWidgetContext[BreakpointWidgetContext["CONDITION"] = 0] = "CONDITION";
    BreakpointWidgetContext[BreakpointWidgetContext["HIT_COUNT"] = 1] = "HIT_COUNT";
    BreakpointWidgetContext[BreakpointWidgetContext["LOG_MESSAGE"] = 2] = "LOG_MESSAGE";
    BreakpointWidgetContext[BreakpointWidgetContext["TRIGGER_POINT"] = 3] = "TRIGGER_POINT";
})(BreakpointWidgetContext || (BreakpointWidgetContext = {}));
export var DebugVisualizationType;
(function (DebugVisualizationType) {
    DebugVisualizationType[DebugVisualizationType["Command"] = 0] = "Command";
    DebugVisualizationType[DebugVisualizationType["Tree"] = 1] = "Tree";
})(DebugVisualizationType || (DebugVisualizationType = {}));
export var DebugTreeItemCollapsibleState;
(function (DebugTreeItemCollapsibleState) {
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["None"] = 0] = "None";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(DebugTreeItemCollapsibleState || (DebugTreeItemCollapsibleState = {}));
export var IDebugVisualizationTreeItem;
(function (IDebugVisualizationTreeItem) {
    IDebugVisualizationTreeItem.deserialize = (v) => v;
    IDebugVisualizationTreeItem.serialize = (item) => item;
})(IDebugVisualizationTreeItem || (IDebugVisualizationTreeItem = {}));
export var IDebugVisualization;
(function (IDebugVisualization) {
    IDebugVisualization.deserialize = (v) => ({
        id: v.id,
        name: v.name,
        iconPath: v.iconPath && {
            light: URI.revive(v.iconPath.light),
            dark: URI.revive(v.iconPath.dark),
        },
        iconClass: v.iconClass,
        visualization: v.visualization,
    });
    IDebugVisualization.serialize = (visualizer) => visualizer;
})(IDebugVisualization || (IDebugVisualization = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLEdBQUcsRUFBNkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUsvRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFnQjVGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQTtBQUVoRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRywrQkFBK0IsQ0FBQTtBQUNoRSxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsc0NBQXNDLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsK0JBQStCLENBQUE7QUFDaEUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsbUNBQW1DLENBQUE7QUFDekUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsaUNBQWlDLENBQUE7QUFDcEUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsaUNBQWlDLENBQUE7QUFDcEUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHNCQUFzQixDQUFBO0FBQ3BELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRywyQkFBMkIsQ0FBQTtBQUN2RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGFBQWEsQ0FBUyxXQUFXLEVBQUUsU0FBUyxFQUFFO0lBQ25GLElBQUksRUFBRSxRQUFRO0lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLFdBQVcsRUFDWCwrREFBK0QsQ0FDL0Q7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