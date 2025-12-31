/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { diffInserted, diffRemoved, editorWidgetBackground, editorWidgetBorder, editorWidgetForeground, focusBorder, inputBackground, inputPlaceholderForeground, registerColor, transparent, widgetShadow, } from '../../../../platform/theme/common/colorRegistry.js';
// settings
export var InlineChatConfigKeys;
(function (InlineChatConfigKeys) {
    InlineChatConfigKeys["FinishOnType"] = "inlineChat.finishOnType";
    InlineChatConfigKeys["StartWithOverlayWidget"] = "inlineChat.startWithOverlayWidget";
    InlineChatConfigKeys["HoldToSpeech"] = "inlineChat.holdToSpeech";
    InlineChatConfigKeys["AccessibleDiffView"] = "inlineChat.accessibleDiffView";
    InlineChatConfigKeys["LineEmptyHint"] = "inlineChat.lineEmptyHint";
    InlineChatConfigKeys["LineNLHint"] = "inlineChat.lineNaturalLanguageHint";
})(InlineChatConfigKeys || (InlineChatConfigKeys = {}));
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        ["inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */]: {
            description: localize('finishOnType', 'Whether to finish an inline chat session when typing outside of changed regions.'),
            default: false,
            type: 'boolean',
        },
        ["inlineChat.holdToSpeech" /* InlineChatConfigKeys.HoldToSpeech */]: {
            description: localize('holdToSpeech', 'Whether holding the inline chat keybinding will automatically enable speech recognition.'),
            default: true,
            type: 'boolean',
        },
        ["inlineChat.accessibleDiffView" /* InlineChatConfigKeys.AccessibleDiffView */]: {
            description: localize('accessibleDiffView', 'Whether the inline chat also renders an accessible diff viewer for its changes.'),
            default: 'auto',
            type: 'string',
            enum: ['auto', 'on', 'off'],
            markdownEnumDescriptions: [
                localize('accessibleDiffView.auto', 'The accessible diff viewer is based on screen reader mode being enabled.'),
                localize('accessibleDiffView.on', 'The accessible diff viewer is always enabled.'),
                localize('accessibleDiffView.off', 'The accessible diff viewer is never enabled.'),
            ],
        },
        ["inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */]: {
            description: localize('emptyLineHint', 'Whether empty lines show a hint to generate code with inline chat.'),
            default: false,
            type: 'boolean',
            tags: ['experimental'],
        },
        ["inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */]: {
            markdownDescription: localize('lineSuffixHint', 'Whether lines that are dominated by natural language or pseudo code show a hint to continue with inline chat. For instance, `class Person with name and hobbies` would show a hint to continue with chat.'),
            default: true,
            type: 'boolean',
            tags: ['experimental'],
        },
    },
});
export const INLINE_CHAT_ID = 'interactiveEditor';
export const INTERACTIVE_EDITOR_ACCESSIBILITY_HELP_ID = 'interactiveEditorAccessiblityHelp';
// --- CONTEXT
export var InlineChatResponseType;
(function (InlineChatResponseType) {
    InlineChatResponseType["None"] = "none";
    InlineChatResponseType["Messages"] = "messages";
    InlineChatResponseType["MessagesAndEdits"] = "messagesAndEdits";
})(InlineChatResponseType || (InlineChatResponseType = {}));
export const CTX_INLINE_CHAT_POSSIBLE = new RawContextKey('inlineChatPossible', false, localize('inlineChatHasPossible', 'Whether a provider for inline chat exists and whether an editor for inline chat is open'));
export const CTX_INLINE_CHAT_HAS_AGENT = new RawContextKey('inlineChatHasProvider', false, localize('inlineChatHasProvider', 'Whether a provider for interactive editors exists'));
export const CTX_INLINE_CHAT_HAS_AGENT2 = new RawContextKey('inlineChatHasEditsAgent', false, localize('inlineChatHasEditsAgent', 'Whether an agent for inliine for interactive editors exists'));
export const CTX_INLINE_CHAT_VISIBLE = new RawContextKey('inlineChatVisible', false, localize('inlineChatVisible', 'Whether the interactive editor input is visible'));
export const CTX_INLINE_CHAT_FOCUSED = new RawContextKey('inlineChatFocused', false, localize('inlineChatFocused', 'Whether the interactive editor input is focused'));
export const CTX_INLINE_CHAT_EDITING = new RawContextKey('inlineChatEditing', true, localize('inlineChatEditing', 'Whether the user is currently editing or generating code in the inline chat'));
export const CTX_INLINE_CHAT_RESPONSE_FOCUSED = new RawContextKey('inlineChatResponseFocused', false, localize('inlineChatResponseFocused', "Whether the interactive widget's response is focused"));
export const CTX_INLINE_CHAT_EMPTY = new RawContextKey('inlineChatEmpty', false, localize('inlineChatEmpty', 'Whether the interactive editor input is empty'));
export const CTX_INLINE_CHAT_INNER_CURSOR_FIRST = new RawContextKey('inlineChatInnerCursorFirst', false, localize('inlineChatInnerCursorFirst', 'Whether the cursor of the iteractive editor input is on the first line'));
export const CTX_INLINE_CHAT_INNER_CURSOR_LAST = new RawContextKey('inlineChatInnerCursorLast', false, localize('inlineChatInnerCursorLast', 'Whether the cursor of the iteractive editor input is on the last line'));
export const CTX_INLINE_CHAT_OUTER_CURSOR_POSITION = new RawContextKey('inlineChatOuterCursorPosition', '', localize('inlineChatOuterCursorPosition', 'Whether the cursor of the outer editor is above or below the interactive editor input'));
export const CTX_INLINE_CHAT_HAS_STASHED_SESSION = new RawContextKey('inlineChatHasStashedSession', false, localize('inlineChatHasStashedSession', 'Whether interactive editor has kept a session for quick restore'));
export const CTX_INLINE_CHAT_CHANGE_HAS_DIFF = new RawContextKey('inlineChatChangeHasDiff', false, localize('inlineChatChangeHasDiff', 'Whether the current change supports showing a diff'));
export const CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF = new RawContextKey('inlineChatChangeShowsDiff', false, localize('inlineChatChangeShowsDiff', 'Whether the current change showing a diff'));
export const CTX_INLINE_CHAT_REQUEST_IN_PROGRESS = new RawContextKey('inlineChatRequestInProgress', false, localize('inlineChatRequestInProgress', 'Whether an inline chat request is currently in progress'));
export const CTX_INLINE_CHAT_RESPONSE_TYPE = new RawContextKey('inlineChatResponseType', "none" /* InlineChatResponseType.None */, localize('inlineChatResponseTypes', 'What type was the responses have been receieved, nothing yet, just messages, or messaged and local edits'));
// --- (selected) action identifier
export const ACTION_START = 'inlineChat.start';
export const ACTION_ACCEPT_CHANGES = 'inlineChat.acceptChanges';
export const ACTION_DISCARD_CHANGES = 'inlineChat.discardHunkChange';
export const ACTION_REGENERATE_RESPONSE = 'inlineChat.regenerate';
export const ACTION_VIEW_IN_CHAT = 'inlineChat.viewInChat';
export const ACTION_TOGGLE_DIFF = 'inlineChat.toggleDiff';
export const ACTION_REPORT_ISSUE = 'inlineChat.reportIssue';
// --- menus
export const MENU_INLINE_CHAT_WIDGET_STATUS = MenuId.for('inlineChatWidget.status');
export const MENU_INLINE_CHAT_WIDGET_SECONDARY = MenuId.for('inlineChatWidget.secondary');
export const MENU_INLINE_CHAT_ZONE = MenuId.for('inlineChatWidget.changesZone');
export const MENU_INLINE_CHAT_SIDE = MenuId.for('inlineChatWidget.side');
// --- colors
export const inlineChatForeground = registerColor('inlineChat.foreground', editorWidgetForeground, localize('inlineChat.foreground', 'Foreground color of the interactive editor widget'));
export const inlineChatBackground = registerColor('inlineChat.background', editorWidgetBackground, localize('inlineChat.background', 'Background color of the interactive editor widget'));
export const inlineChatBorder = registerColor('inlineChat.border', editorWidgetBorder, localize('inlineChat.border', 'Border color of the interactive editor widget'));
export const inlineChatShadow = registerColor('inlineChat.shadow', widgetShadow, localize('inlineChat.shadow', 'Shadow color of the interactive editor widget'));
export const inlineChatInputBorder = registerColor('inlineChatInput.border', editorWidgetBorder, localize('inlineChatInput.border', 'Border color of the interactive editor input'));
export const inlineChatInputFocusBorder = registerColor('inlineChatInput.focusBorder', focusBorder, localize('inlineChatInput.focusBorder', 'Border color of the interactive editor input when focused'));
export const inlineChatInputPlaceholderForeground = registerColor('inlineChatInput.placeholderForeground', inputPlaceholderForeground, localize('inlineChatInput.placeholderForeground', 'Foreground color of the interactive editor input placeholder'));
export const inlineChatInputBackground = registerColor('inlineChatInput.background', inputBackground, localize('inlineChatInput.background', 'Background color of the interactive editor input'));
export const inlineChatDiffInserted = registerColor('inlineChatDiff.inserted', transparent(diffInserted, 0.5), localize('inlineChatDiff.inserted', 'Background color of inserted text in the interactive editor input'));
export const overviewRulerInlineChatDiffInserted = registerColor('editorOverviewRuler.inlineChatInserted', {
    dark: transparent(diffInserted, 0.6),
    light: transparent(diffInserted, 0.8),
    hcDark: transparent(diffInserted, 0.6),
    hcLight: transparent(diffInserted, 0.8),
}, localize('editorOverviewRuler.inlineChatInserted', 'Overview ruler marker color for inline chat inserted content.'));
export const minimapInlineChatDiffInserted = registerColor('editorMinimap.inlineChatInserted', {
    dark: transparent(diffInserted, 0.6),
    light: transparent(diffInserted, 0.8),
    hcDark: transparent(diffInserted, 0.6),
    hcLight: transparent(diffInserted, 0.8),
}, localize('editorMinimap.inlineChatInserted', 'Minimap marker color for inline chat inserted content.'));
export const inlineChatDiffRemoved = registerColor('inlineChatDiff.removed', transparent(diffRemoved, 0.5), localize('inlineChatDiff.removed', 'Background color of removed text in the interactive editor input'));
export const overviewRulerInlineChatDiffRemoved = registerColor('editorOverviewRuler.inlineChatRemoved', {
    dark: transparent(diffRemoved, 0.6),
    light: transparent(diffRemoved, 0.8),
    hcDark: transparent(diffRemoved, 0.6),
    hcLight: transparent(diffRemoved, 0.8),
}, localize('editorOverviewRuler.inlineChatRemoved', 'Overview ruler marker color for inline chat removed content.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvY29tbW9uL2lubGluZUNoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sWUFBWSxFQUNaLFdBQVcsRUFDWCxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0QixXQUFXLEVBQ1gsZUFBZSxFQUNmLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELFdBQVc7QUFFWCxNQUFNLENBQU4sSUFBa0Isb0JBT2pCO0FBUEQsV0FBa0Isb0JBQW9CO0lBQ3JDLGdFQUF3QyxDQUFBO0lBQ3hDLG9GQUE0RCxDQUFBO0lBQzVELGdFQUF3QyxDQUFBO0lBQ3hDLDRFQUFvRCxDQUFBO0lBQ3BELGtFQUEwQyxDQUFBO0lBQzFDLHlFQUFpRCxDQUFBO0FBQ2xELENBQUMsRUFQaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQU9yQztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUNuRixFQUFFLEVBQUUsUUFBUTtJQUNaLFVBQVUsRUFBRTtRQUNYLG1FQUFtQyxFQUFFO1lBQ3BD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