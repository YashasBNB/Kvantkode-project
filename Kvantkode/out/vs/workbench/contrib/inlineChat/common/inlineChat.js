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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9jb21tb24vaW5saW5lQ2hhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixZQUFZLEVBQ1osV0FBVyxFQUNYLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLFdBQVcsRUFDWCxlQUFlLEVBQ2YsMEJBQTBCLEVBQzFCLGFBQWEsRUFDYixXQUFXLEVBQ1gsWUFBWSxHQUNaLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsV0FBVztBQUVYLE1BQU0sQ0FBTixJQUFrQixvQkFPakI7QUFQRCxXQUFrQixvQkFBb0I7SUFDckMsZ0VBQXdDLENBQUE7SUFDeEMsb0ZBQTRELENBQUE7SUFDNUQsZ0VBQXdDLENBQUE7SUFDeEMsNEVBQW9ELENBQUE7SUFDcEQsa0VBQTBDLENBQUE7SUFDMUMseUVBQWlELENBQUE7QUFDbEQsQ0FBQyxFQVBpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBT3JDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ25GLEVBQUUsRUFBRSxRQUFRO0lBQ1osVUFBVSxFQUFFO1FBQ1gsbUVBQW1DLEVBQUU7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