/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export var AccessibilityHelpNLS;
(function (AccessibilityHelpNLS) {
    AccessibilityHelpNLS.accessibilityHelpTitle = nls.localize('accessibilityHelpTitle', 'Accessibility Help');
    AccessibilityHelpNLS.openingDocs = nls.localize('openingDocs', 'Opening the Accessibility documentation page.');
    AccessibilityHelpNLS.readonlyDiffEditor = nls.localize('readonlyDiffEditor', 'You are in a read-only pane of a diff editor.');
    AccessibilityHelpNLS.editableDiffEditor = nls.localize('editableDiffEditor', 'You are in a pane of a diff editor.');
    AccessibilityHelpNLS.readonlyEditor = nls.localize('readonlyEditor', 'You are in a read-only code editor.');
    AccessibilityHelpNLS.editableEditor = nls.localize('editableEditor', 'You are in a code editor.');
    AccessibilityHelpNLS.defaultWindowTitleIncludesEditorState = nls.localize('defaultWindowTitleIncludesEditorState', 'activeEditorState - such as modified, problems, and more, is included as a part of the window.title setting by default. Disable it with accessibility.windowTitleOptimized.');
    AccessibilityHelpNLS.defaultWindowTitleExcludingEditorState = nls.localize('defaultWindowTitleExcludingEditorState', 'activeEditorState - such as modified, problems, and more, is currently not included as a part of the window.title setting by default. Enable it with accessibility.windowTitleOptimized.');
    AccessibilityHelpNLS.toolbar = nls.localize('toolbar', "Around the workbench, when the screen reader announces you've landed in a toolbar, use narrow keys to navigate between the toolbar's actions.");
    AccessibilityHelpNLS.changeConfigToOnMac = nls.localize('changeConfigToOnMac', 'Configure the application to be optimized for usage with a Screen Reader (Command+E).');
    AccessibilityHelpNLS.changeConfigToOnWinLinux = nls.localize('changeConfigToOnWinLinux', 'Configure the application to be optimized for usage with a Screen Reader (Control+E).');
    AccessibilityHelpNLS.auto_on = nls.localize('auto_on', 'The application is configured to be optimized for usage with a Screen Reader.');
    AccessibilityHelpNLS.auto_off = nls.localize('auto_off', 'The application is configured to never be optimized for usage with a Screen Reader.');
    AccessibilityHelpNLS.screenReaderModeEnabled = nls.localize('screenReaderModeEnabled', 'Screen Reader Optimized Mode enabled.');
    AccessibilityHelpNLS.screenReaderModeDisabled = nls.localize('screenReaderModeDisabled', 'Screen Reader Optimized Mode disabled.');
    AccessibilityHelpNLS.tabFocusModeOnMsg = nls.localize('tabFocusModeOnMsg', 'Pressing Tab in the current editor will move focus to the next focusable element. Toggle this behavior{0}.', '<keybinding:editor.action.toggleTabFocusMode>');
    AccessibilityHelpNLS.tabFocusModeOffMsg = nls.localize('tabFocusModeOffMsg', 'Pressing Tab in the current editor will insert the tab character. Toggle this behavior{0}.', '<keybinding:editor.action.toggleTabFocusMode>');
    AccessibilityHelpNLS.stickScroll = nls.localize('stickScrollKb', 'Focus Sticky Scroll{0} to focus the currently nested scopes.', '<keybinding:editor.action.focusStickyDebugConsole>');
    AccessibilityHelpNLS.suggestActions = nls.localize('suggestActionsKb', 'Trigger the suggest widget{0} to show possible code completions.', '<keybinding:editor.action.triggerSuggest>');
    AccessibilityHelpNLS.acceptSuggestAction = nls.localize('acceptSuggestAction', 'Accept suggestion{0} to accept the currently selected suggestion.', '<keybinding:acceptSelectedSuggestion>');
    AccessibilityHelpNLS.toggleSuggestionFocus = nls.localize('toggleSuggestionFocus', 'Toggle focus between the suggest widget and the editor{0} and toggle details focus with{1} to learn more about the suggestion.', '<keybinding:focusSuggestion>', '<keybinding:toggleSuggestionFocus>');
    AccessibilityHelpNLS.codeFolding = nls.localize('codeFolding', "Use code folding to collapse blocks of code and focus on the code you're interested in via the Toggle Folding Command{0}.", '<keybinding:editor.toggleFold>');
    AccessibilityHelpNLS.intellisense = nls.localize('intellisense', 'Use Intellisense to improve coding efficiency and reduce errors. Trigger suggestions{0}.', '<keybinding:editor.action.triggerSuggest>');
    AccessibilityHelpNLS.showOrFocusHover = nls.localize('showOrFocusHover', 'Show or focus the hover{0} to read information about the current symbol.', '<keybinding:editor.action.showHover>');
    AccessibilityHelpNLS.goToSymbol = nls.localize('goToSymbol', 'Go to Symbol{0} to quickly navigate between symbols in the current file.', '<keybinding:workbench.action.gotoSymbol>');
    AccessibilityHelpNLS.showAccessibilityHelpAction = nls.localize('showAccessibilityHelpAction', 'Show Accessibility Help');
    AccessibilityHelpNLS.listSignalSounds = nls.localize('listSignalSoundsCommand', 'Run the command: List Signal Sounds for an overview of all sounds and their current status.');
    AccessibilityHelpNLS.listAlerts = nls.localize('listAnnouncementsCommand', 'Run the command: List Signal Announcements for an overview of announcements and their current status.');
    AccessibilityHelpNLS.quickChat = nls.localize('quickChatCommand', 'Toggle quick chat{0} to open or close a chat session.', '<keybinding:workbench.action.quickchat.toggle>');
    AccessibilityHelpNLS.startInlineChat = nls.localize('startInlineChatCommand', 'Start inline chat{0} to create an in editor chat session.', '<keybinding:inlineChat.start>');
    AccessibilityHelpNLS.startDebugging = nls.localize('debug.startDebugging', 'The Debug: Start Debugging command{0} will start a debug session.', '<keybinding:workbench.action.debug.start>');
    AccessibilityHelpNLS.setBreakpoint = nls.localize('debugConsole.setBreakpoint', 'The Debug: Inline Breakpoint command{0} will set or unset a breakpoint at the current cursor position in the active editor.', '<keybinding:editor.debug.action.toggleInlineBreakpoint>');
    AccessibilityHelpNLS.addToWatch = nls.localize('debugConsole.addToWatch', 'The Debug: Add to Watch command{0} will add the selected text to the watch view.', '<keybinding:editor.debug.action.selectionToWatch>');
    AccessibilityHelpNLS.debugExecuteSelection = nls.localize('debugConsole.executeSelection', 'The Debug: Execute Selection command{0} will execute the selected text in the debug console.', '<keybinding:editor.debug.action.selectionToRepl>');
    AccessibilityHelpNLS.chatEditorModification = nls.localize('chatEditorModification', 'The editor contains pending modifications that have been made by chat.');
    AccessibilityHelpNLS.chatEditorRequestInProgress = nls.localize('chatEditorRequestInProgress', 'The editor is currently waiting for modifications to be made by chat.');
    AccessibilityHelpNLS.chatEditActions = nls.localize('chatEditing.navigation', 'Navigate between edits in the editor with navigate previous{0} and next{1} and accept{2}, reject{3} or view the diff{4} for the current change.', '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>', '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>');
})(AccessibilityHelpNLS || (AccessibilityHelpNLS = {}));
export var InspectTokensNLS;
(function (InspectTokensNLS) {
    InspectTokensNLS.inspectTokensAction = nls.localize('inspectTokens', 'Developer: Inspect Tokens');
})(InspectTokensNLS || (InspectTokensNLS = {}));
export var GoToLineNLS;
(function (GoToLineNLS) {
    GoToLineNLS.gotoLineActionLabel = nls.localize('gotoLineActionLabel', 'Go to Line/Column...');
})(GoToLineNLS || (GoToLineNLS = {}));
export var QuickHelpNLS;
(function (QuickHelpNLS) {
    QuickHelpNLS.helpQuickAccessActionLabel = nls.localize('helpQuickAccess', 'Show all Quick Access Providers');
})(QuickHelpNLS || (QuickHelpNLS = {}));
export var QuickCommandNLS;
(function (QuickCommandNLS) {
    QuickCommandNLS.quickCommandActionLabel = nls.localize('quickCommandActionLabel', 'Command Palette');
    QuickCommandNLS.quickCommandHelp = nls.localize('quickCommandActionHelp', 'Show And Run Commands');
})(QuickCommandNLS || (QuickCommandNLS = {}));
export var QuickOutlineNLS;
(function (QuickOutlineNLS) {
    QuickOutlineNLS.quickOutlineActionLabel = nls.localize('quickOutlineActionLabel', 'Go to Symbol...');
    QuickOutlineNLS.quickOutlineByCategoryActionLabel = nls.localize('quickOutlineByCategoryActionLabel', 'Go to Symbol by Category...');
})(QuickOutlineNLS || (QuickOutlineNLS = {}));
export var StandaloneCodeEditorNLS;
(function (StandaloneCodeEditorNLS) {
    StandaloneCodeEditorNLS.editorViewAccessibleLabel = nls.localize('editorViewAccessibleLabel', 'Editor content');
})(StandaloneCodeEditorNLS || (StandaloneCodeEditorNLS = {}));
export var ToggleHighContrastNLS;
(function (ToggleHighContrastNLS) {
    ToggleHighContrastNLS.toggleHighContrast = nls.localize('toggleHighContrast', 'Toggle High Contrast Theme');
})(ToggleHighContrastNLS || (ToggleHighContrastNLS = {}));
export var StandaloneServicesNLS;
(function (StandaloneServicesNLS) {
    StandaloneServicesNLS.bulkEditServiceSummary = nls.localize('bulkEditServiceSummary', 'Made {0} edits in {1} files');
})(StandaloneServicesNLS || (StandaloneServicesNLS = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVN0cmluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3N0YW5kYWxvbmVTdHJpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBRW5DLE1BQU0sS0FBVyxvQkFBb0IsQ0FxS3BDO0FBcktELFdBQWlCLG9CQUFvQjtJQUN2QiwyQ0FBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDckYsZ0NBQVcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUN0QyxhQUFhLEVBQ2IsK0NBQStDLENBQy9DLENBQUE7SUFDWSx1Q0FBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUM3QyxvQkFBb0IsRUFDcEIsK0NBQStDLENBQy9DLENBQUE7SUFDWSx1Q0FBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUM3QyxvQkFBb0IsRUFDcEIscUNBQXFDLENBQ3JDLENBQUE7SUFDWSxtQ0FBYyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3pDLGdCQUFnQixFQUNoQixxQ0FBcUMsQ0FDckMsQ0FBQTtJQUNZLG1DQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBO0lBQzVFLDBEQUFxQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ2hFLHVDQUF1QyxFQUN2Qyw2S0FBNkssQ0FDN0ssQ0FBQTtJQUNZLDJEQUFzQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ2pFLHdDQUF3QyxFQUN4QywwTEFBMEwsQ0FDMUwsQ0FBQTtJQUNZLDRCQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDbEMsU0FBUyxFQUNULCtJQUErSSxDQUMvSSxDQUFBO0lBQ1ksd0NBQW1CLEdB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