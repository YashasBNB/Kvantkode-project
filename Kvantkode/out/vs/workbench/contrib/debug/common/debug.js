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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Zy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsR0FBRyxFQUE2QixNQUFNLGdDQUFnQyxDQUFBO0FBSy9FLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQWdCNUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLHNCQUFzQixDQUFBO0FBRWhELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLCtCQUErQixDQUFBO0FBQ2hFLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxzQ0FBc0MsQ0FBQTtBQUNuRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRywrQkFBK0IsQ0FBQTtBQUNoRSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxtQ0FBbUMsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxpQ0FBaUMsQ0FBQTtBQUNwRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxpQ0FBaUMsQ0FBQTtBQUNwRSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUE7QUFDcEQsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLDJCQUEyQixDQUFBO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLElBQUksYUFBYSxDQUFTLFdBQVcsRUFBRSxTQUFTLEVBQUU7SUFDbkYsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIs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