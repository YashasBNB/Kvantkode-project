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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVN0cmluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc3RhbmRhbG9uZVN0cmluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFFbkMsTUFBTSxLQUFXLG9CQUFvQixDQXFLcEM7QUFyS0QsV0FBaUIsb0JBQW9CO0lBQ3ZCLDJDQUFzQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUNyRixnQ0FBVyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3RDLGFBQWEsRUFDYiwrQ0FBK0MsQ0FDL0MsQ0FBQTtJQUNZLHVDQUFrQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzdDLG9CQUFvQixFQUNwQiwrQ0FBK0MsQ0FDL0MsQ0FBQTtJQUNZLHVDQUFrQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzdDLG9CQUFvQixFQUNwQixxQ0FBcUMsQ0FDckMsQ0FBQTtJQUNZLG1DQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDekMsZ0JBQWdCLEVBQ2hCLHFDQUFxQyxDQUNyQyxDQUFBO0lBQ1ksbUNBQWMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixDQUFDLENBQUE7SUFDNUUsMERBQXFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDaEUsdUNBQXVDLEVBQ3ZDLDZLQUE2SyxDQUM3SyxDQUFBO0lBQ1ksMkRBQXNDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDakUsd0NBQXdDLEVBQ3hDLDBMQUEwTCxDQUMxTCxDQUFBO0lBQ1ksNEJBQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNsQyxTQUFTLEVBQ1QsK0lBQStJLENB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