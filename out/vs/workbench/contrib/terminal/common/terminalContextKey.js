/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { TERMINAL_VIEW_ID } from './terminal.js';
export var TerminalContextKeyStrings;
(function (TerminalContextKeyStrings) {
    TerminalContextKeyStrings["IsOpen"] = "terminalIsOpen";
    TerminalContextKeyStrings["Count"] = "terminalCount";
    TerminalContextKeyStrings["GroupCount"] = "terminalGroupCount";
    TerminalContextKeyStrings["TabsNarrow"] = "isTerminalTabsNarrow";
    TerminalContextKeyStrings["HasFixedWidth"] = "terminalHasFixedWidth";
    TerminalContextKeyStrings["ProcessSupported"] = "terminalProcessSupported";
    TerminalContextKeyStrings["Focus"] = "terminalFocus";
    TerminalContextKeyStrings["FocusInAny"] = "terminalFocusInAny";
    TerminalContextKeyStrings["AccessibleBufferFocus"] = "terminalAccessibleBufferFocus";
    TerminalContextKeyStrings["AccessibleBufferOnLastLine"] = "terminalAccessibleBufferOnLastLine";
    TerminalContextKeyStrings["EditorFocus"] = "terminalEditorFocus";
    TerminalContextKeyStrings["TabsFocus"] = "terminalTabsFocus";
    TerminalContextKeyStrings["WebExtensionContributedProfile"] = "terminalWebExtensionContributedProfile";
    TerminalContextKeyStrings["TerminalHasBeenCreated"] = "terminalHasBeenCreated";
    TerminalContextKeyStrings["TerminalEditorActive"] = "terminalEditorActive";
    TerminalContextKeyStrings["TabsMouse"] = "terminalTabsMouse";
    TerminalContextKeyStrings["AltBufferActive"] = "terminalAltBufferActive";
    TerminalContextKeyStrings["SuggestWidgetVisible"] = "terminalSuggestWidgetVisible";
    TerminalContextKeyStrings["A11yTreeFocus"] = "terminalA11yTreeFocus";
    TerminalContextKeyStrings["ViewShowing"] = "terminalViewShowing";
    TerminalContextKeyStrings["TextSelected"] = "terminalTextSelected";
    TerminalContextKeyStrings["TextSelectedInFocused"] = "terminalTextSelectedInFocused";
    TerminalContextKeyStrings["FindVisible"] = "terminalFindVisible";
    TerminalContextKeyStrings["FindInputFocused"] = "terminalFindInputFocused";
    TerminalContextKeyStrings["FindFocused"] = "terminalFindFocused";
    TerminalContextKeyStrings["TabsSingularSelection"] = "terminalTabsSingularSelection";
    TerminalContextKeyStrings["SplitTerminal"] = "terminalSplitTerminal";
    TerminalContextKeyStrings["ShellType"] = "terminalShellType";
    TerminalContextKeyStrings["InTerminalRunCommandPicker"] = "inTerminalRunCommandPicker";
    TerminalContextKeyStrings["TerminalShellIntegrationEnabled"] = "terminalShellIntegrationEnabled";
})(TerminalContextKeyStrings || (TerminalContextKeyStrings = {}));
export var TerminalContextKeys;
(function (TerminalContextKeys) {
    /** Whether there is at least one opened terminal. */
    TerminalContextKeys.isOpen = new RawContextKey("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */, false, true);
    /** Whether the terminal is focused. */
    TerminalContextKeys.focus = new RawContextKey("terminalFocus" /* TerminalContextKeyStrings.Focus */, false, localize('terminalFocusContextKey', 'Whether the terminal is focused.'));
    /** Whether any terminal is focused, including detached terminals used in other UI. */
    TerminalContextKeys.focusInAny = new RawContextKey("terminalFocusInAny" /* TerminalContextKeyStrings.FocusInAny */, false, localize('terminalFocusInAnyContextKey', 'Whether any terminal is focused, including detached terminals used in other UI.'));
    /** Whether a terminal in the editor area is focused. */
    TerminalContextKeys.editorFocus = new RawContextKey("terminalEditorFocus" /* TerminalContextKeyStrings.EditorFocus */, false, localize('terminalEditorFocusContextKey', 'Whether a terminal in the editor area is focused.'));
    /** The current number of terminals. */
    TerminalContextKeys.count = new RawContextKey("terminalCount" /* TerminalContextKeyStrings.Count */, 0, localize('terminalCountContextKey', 'The current number of terminals.'));
    /** The current number of terminal groups. */
    TerminalContextKeys.groupCount = new RawContextKey("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 0, true);
    /** Whether the terminal tabs view is narrow. */
    TerminalContextKeys.tabsNarrow = new RawContextKey("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */, false, true);
    /** Whether the terminal tabs view is narrow. */
    TerminalContextKeys.terminalHasFixedWidth = new RawContextKey("terminalHasFixedWidth" /* TerminalContextKeyStrings.HasFixedWidth */, false, true);
    /** Whether the terminal tabs widget is focused. */
    TerminalContextKeys.tabsFocus = new RawContextKey("terminalTabsFocus" /* TerminalContextKeyStrings.TabsFocus */, false, localize('terminalTabsFocusContextKey', 'Whether the terminal tabs widget is focused.'));
    /** Whether a web extension has contributed a profile */
    TerminalContextKeys.webExtensionContributedProfile = new RawContextKey("terminalWebExtensionContributedProfile" /* TerminalContextKeyStrings.WebExtensionContributedProfile */, false, true);
    /** Whether at least one terminal has been created */
    TerminalContextKeys.terminalHasBeenCreated = new RawContextKey("terminalHasBeenCreated" /* TerminalContextKeyStrings.TerminalHasBeenCreated */, false, true);
    /** Whether at least one terminal has been created */
    TerminalContextKeys.terminalEditorActive = new RawContextKey("terminalEditorActive" /* TerminalContextKeyStrings.TerminalEditorActive */, false, true);
    /** Whether the mouse is within the terminal tabs list. */
    TerminalContextKeys.tabsMouse = new RawContextKey("terminalTabsMouse" /* TerminalContextKeyStrings.TabsMouse */, false, true);
    /** The shell type of the active terminal, this is set if the type can be detected. */
    TerminalContextKeys.shellType = new RawContextKey("terminalShellType" /* TerminalContextKeyStrings.ShellType */, undefined, {
        type: 'string',
        description: localize('terminalShellTypeContextKey', 'The shell type of the active terminal, this is set if the type can be detected.'),
    });
    /** Whether the terminal's alt buffer is active. */
    TerminalContextKeys.altBufferActive = new RawContextKey("terminalAltBufferActive" /* TerminalContextKeyStrings.AltBufferActive */, false, localize('terminalAltBufferActive', "Whether the terminal's alt buffer is active."));
    /** Whether the terminal's suggest widget is visible. */
    TerminalContextKeys.suggestWidgetVisible = new RawContextKey("terminalSuggestWidgetVisible" /* TerminalContextKeyStrings.SuggestWidgetVisible */, false, localize('terminalSuggestWidgetVisible', "Whether the terminal's suggest widget is visible."));
    /** Whether the terminal is NOT focused. */
    TerminalContextKeys.notFocus = TerminalContextKeys.focus.toNegated();
    /** Whether the terminal view is showing. */
    TerminalContextKeys.viewShowing = new RawContextKey("terminalViewShowing" /* TerminalContextKeyStrings.ViewShowing */, false, localize('terminalViewShowing', 'Whether the terminal view is showing'));
    /** Whether text is selected in the active terminal. */
    TerminalContextKeys.textSelected = new RawContextKey("terminalTextSelected" /* TerminalContextKeyStrings.TextSelected */, false, localize('terminalTextSelectedContextKey', 'Whether text is selected in the active terminal.'));
    /** Whether text is selected in a focused terminal. `textSelected` counts text selected in an active in a terminal view or an editor, where `textSelectedInFocused` simply counts text in an element with DOM focus. */
    TerminalContextKeys.textSelectedInFocused = new RawContextKey("terminalTextSelectedInFocused" /* TerminalContextKeyStrings.TextSelectedInFocused */, false, localize('terminalTextSelectedInFocusedContextKey', 'Whether text is selected in a focused terminal.'));
    /** Whether text is NOT selected in the active terminal. */
    TerminalContextKeys.notTextSelected = TerminalContextKeys.textSelected.toNegated();
    /** Whether the active terminal's find widget is visible. */
    TerminalContextKeys.findVisible = new RawContextKey("terminalFindVisible" /* TerminalContextKeyStrings.FindVisible */, false, true);
    /** Whether the active terminal's find widget is NOT visible. */
    TerminalContextKeys.notFindVisible = TerminalContextKeys.findVisible.toNegated();
    /** Whether the active terminal's find widget text input is focused. */
    TerminalContextKeys.findInputFocus = new RawContextKey("terminalFindInputFocused" /* TerminalContextKeyStrings.FindInputFocused */, false, true);
    /** Whether an element within the active terminal's find widget is focused. */
    TerminalContextKeys.findFocus = new RawContextKey("terminalFindFocused" /* TerminalContextKeyStrings.FindFocused */, false, true);
    /** Whether NO elements within the active terminal's find widget is focused. */
    TerminalContextKeys.notFindFocus = TerminalContextKeys.findInputFocus.toNegated();
    /** Whether terminal processes can be launched in the current workspace. */
    TerminalContextKeys.processSupported = new RawContextKey("terminalProcessSupported" /* TerminalContextKeyStrings.ProcessSupported */, false, localize('terminalProcessSupportedContextKey', 'Whether terminal processes can be launched in the current workspace.'));
    /** Whether one terminal is selected in the terminal tabs list. */
    TerminalContextKeys.tabsSingularSelection = new RawContextKey("terminalTabsSingularSelection" /* TerminalContextKeyStrings.TabsSingularSelection */, false, localize('terminalTabsSingularSelectedContextKey', 'Whether one terminal is selected in the terminal tabs list.'));
    /** Whether the focused tab's terminal is a split terminal. */
    TerminalContextKeys.splitTerminal = new RawContextKey("terminalSplitTerminal" /* TerminalContextKeyStrings.SplitTerminal */, false, localize('isSplitTerminalContextKey', "Whether the focused tab's terminal is a split terminal."));
    /** Whether the terminal run command picker is currently open. */
    TerminalContextKeys.inTerminalRunCommandPicker = new RawContextKey("inTerminalRunCommandPicker" /* TerminalContextKeyStrings.InTerminalRunCommandPicker */, false, localize('inTerminalRunCommandPickerContextKey', 'Whether the terminal run command picker is currently open.'));
    /** Whether shell integration is enabled in the active terminal. This only considers full VS Code shell integration. */
    TerminalContextKeys.terminalShellIntegrationEnabled = new RawContextKey("terminalShellIntegrationEnabled" /* TerminalContextKeyStrings.TerminalShellIntegrationEnabled */, false, localize('terminalShellIntegrationEnabled', 'Whether shell integration is enabled in the active terminal'));
    TerminalContextKeys.shouldShowViewInlineActions = ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.notEquals(`config.${"terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */}`, 'never'), ContextKeyExpr.or(ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'always')));
})(TerminalContextKeys || (TerminalContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0S2V5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsQ29udGV4dEtleS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFaEQsTUFBTSxDQUFOLElBQWtCLHlCQStCakI7QUEvQkQsV0FBa0IseUJBQXlCO0lBQzFDLHNEQUF5QixDQUFBO0lBQ3pCLG9EQUF1QixDQUFBO0lBQ3ZCLDhEQUFpQyxDQUFBO0lBQ2pDLGdFQUFtQyxDQUFBO0lBQ25DLG9FQUF1QyxDQUFBO0lBQ3ZDLDBFQUE2QyxDQUFBO0lBQzdDLG9EQUF1QixDQUFBO0lBQ3ZCLDhEQUFpQyxDQUFBO0lBQ2pDLG9GQUF1RCxDQUFBO0lBQ3ZELDhGQUFpRSxDQUFBO0lBQ2pFLGdFQUFtQyxDQUFBO0lBQ25DLDREQUErQixDQUFBO0lBQy9CLHNHQUF5RSxDQUFBO0lBQ3pFLDhFQUFpRCxDQUFBO0lBQ2pELDBFQUE2QyxDQUFBO0lBQzdDLDREQUErQixDQUFBO0lBQy9CLHdFQUEyQyxDQUFBO0lBQzNDLGtGQUFxRCxDQUFBO0lBQ3JELG9FQUF1QyxDQUFBO0lBQ3ZDLGdFQUFtQyxDQUFBO0lBQ25DLGtFQUFxQyxDQUFBO0lBQ3JDLG9GQUF1RCxDQUFBO0lBQ3ZELGdFQUFtQyxDQUFBO0lBQ25DLDBFQUE2QyxDQUFBO0lBQzdDLGdFQUFtQyxDQUFBO0lBQ25DLG9GQUF1RCxDQUFBO0lBQ3ZELG9FQUF1QyxDQUFBO0lBQ3ZDLDREQUEr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