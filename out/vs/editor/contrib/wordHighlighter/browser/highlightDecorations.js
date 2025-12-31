/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './highlightDecorations.css';
import { OverviewRulerLane, } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { DocumentHighlightKind } from '../../../common/languages.js';
import * as nls from '../../../../nls.js';
import { activeContrastBorder, editorSelectionHighlight, minimapSelectionOccurrenceHighlight, overviewRulerSelectionHighlightForeground, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant, themeColorFromId, } from '../../../../platform/theme/common/themeService.js';
const wordHighlightBackground = registerColor('editor.wordHighlightBackground', { dark: '#575757B8', light: '#57575740', hcDark: null, hcLight: null }, nls.localize('wordHighlight', 'Background color of a symbol during read-access, like reading a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.wordHighlightStrongBackground', { dark: '#004972B8', light: '#0e639c40', hcDark: null, hcLight: null }, nls.localize('wordHighlightStrong', 'Background color of a symbol during write-access, like writing to a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.wordHighlightTextBackground', wordHighlightBackground, nls.localize('wordHighlightText', 'Background color of a textual occurrence for a symbol. The color must not be opaque so as not to hide underlying decorations.'), true);
const wordHighlightBorder = registerColor('editor.wordHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightBorder', 'Border color of a symbol during read-access, like reading a variable.'));
registerColor('editor.wordHighlightStrongBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightStrongBorder', 'Border color of a symbol during write-access, like writing to a variable.'));
registerColor('editor.wordHighlightTextBorder', wordHighlightBorder, nls.localize('wordHighlightTextBorder', 'Border color of a textual occurrence for a symbol.'));
const overviewRulerWordHighlightForeground = registerColor('editorOverviewRuler.wordHighlightForeground', '#A0A0A0CC', nls.localize('overviewRulerWordHighlightForeground', 'Overview ruler marker color for symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightStrongForeground = registerColor('editorOverviewRuler.wordHighlightStrongForeground', '#C0A0C0CC', nls.localize('overviewRulerWordHighlightStrongForeground', 'Overview ruler marker color for write-access symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightTextForeground = registerColor('editorOverviewRuler.wordHighlightTextForeground', overviewRulerSelectionHighlightForeground, nls.localize('overviewRulerWordHighlightTextForeground', 'Overview ruler marker color of a textual occurrence for a symbol. The color must not be opaque so as not to hide underlying decorations.'), true);
const _WRITE_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight-strong',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlightStrong',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightStrongForeground),
        position: OverviewRulerLane.Center,
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */,
    },
});
const _TEXT_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight-text',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlightText',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightTextForeground),
        position: OverviewRulerLane.Center,
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */,
    },
});
const _SELECTION_HIGHLIGHT_OPTIONS = ModelDecorationOptions.register({
    description: 'selection-highlight-overview',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'selectionHighlight',
    overviewRuler: {
        color: themeColorFromId(overviewRulerSelectionHighlightForeground),
        position: OverviewRulerLane.Center,
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */,
    },
});
const _SELECTION_HIGHLIGHT_OPTIONS_NO_OVERVIEW = ModelDecorationOptions.register({
    description: 'selection-highlight',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'selectionHighlight',
});
const _REGULAR_OPTIONS = ModelDecorationOptions.register({
    description: 'word-highlight',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    className: 'wordHighlight',
    overviewRuler: {
        color: themeColorFromId(overviewRulerWordHighlightForeground),
        position: OverviewRulerLane.Center,
    },
    minimap: {
        color: themeColorFromId(minimapSelectionOccurrenceHighlight),
        position: 1 /* MinimapPosition.Inline */,
    },
});
export function getHighlightDecorationOptions(kind) {
    if (kind === DocumentHighlightKind.Write) {
        return _WRITE_OPTIONS;
    }
    else if (kind === DocumentHighlightKind.Text) {
        return _TEXT_OPTIONS;
    }
    else {
        return _REGULAR_OPTIONS;
    }
}
export function getSelectionHighlightDecorationOptions(hasSemanticHighlights) {
    // Show in overviewRuler only if model has no semantic highlighting
    return hasSemanticHighlights
        ? _SELECTION_HIGHLIGHT_OPTIONS_NO_OVERVIEW
        : _SELECTION_HIGHLIGHT_OPTIONS;
}
registerThemingParticipant((theme, collector) => {
    const selectionHighlight = theme.getColor(editorSelectionHighlight);
    if (selectionHighlight) {
        collector.addRule(`.monaco-editor .selectionHighlight { background-color: ${selectionHighlight.transparent(0.5)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0RGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkSGlnaGxpZ2h0ZXIvYnJvd3Nlci9oaWdobGlnaHREZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsd0JBQXdCLEVBQ3hCLG1DQUFtQyxFQUNuQyx5Q0FBeUMsRUFDekMsYUFBYSxHQUNiLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixnQkFBZ0IsR0FDaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDNUMsZ0NBQWdDLEVBQ2hDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUN0RSxHQUFHLENBQUMsUUFBUSxDQUNYLGVBQWUsRUFDZixrSkFBa0osQ0FDbEosRUFDRCxJQUFJLENBQ0osQ0FBQTtBQUNELGFBQWEsQ0FDWixzQ0FBc0MsRUFDdEMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQ3RFLEdBQUcs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