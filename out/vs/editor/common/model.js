/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../base/common/objects.js';
/**
 * Vertical Lane in the overview ruler of the editor.
 */
export var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
/**
 * Vertical Lane in the glyph margin of the editor.
 */
export var GlyphMarginLane;
(function (GlyphMarginLane) {
    GlyphMarginLane[GlyphMarginLane["Left"] = 1] = "Left";
    GlyphMarginLane[GlyphMarginLane["Center"] = 2] = "Center";
    GlyphMarginLane[GlyphMarginLane["Right"] = 3] = "Right";
})(GlyphMarginLane || (GlyphMarginLane = {}));
/**
 * Position in the minimap to render the decoration.
 */
export var MinimapPosition;
(function (MinimapPosition) {
    MinimapPosition[MinimapPosition["Inline"] = 1] = "Inline";
    MinimapPosition[MinimapPosition["Gutter"] = 2] = "Gutter";
})(MinimapPosition || (MinimapPosition = {}));
/**
 * Section header style.
 */
export var MinimapSectionHeaderStyle;
(function (MinimapSectionHeaderStyle) {
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Normal"] = 1] = "Normal";
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Underlined"] = 2] = "Underlined";
})(MinimapSectionHeaderStyle || (MinimapSectionHeaderStyle = {}));
export var InjectedTextCursorStops;
(function (InjectedTextCursorStops) {
    InjectedTextCursorStops[InjectedTextCursorStops["Both"] = 0] = "Both";
    InjectedTextCursorStops[InjectedTextCursorStops["Right"] = 1] = "Right";
    InjectedTextCursorStops[InjectedTextCursorStops["Left"] = 2] = "Left";
    InjectedTextCursorStops[InjectedTextCursorStops["None"] = 3] = "None";
})(InjectedTextCursorStops || (InjectedTextCursorStops = {}));
/**
 * End of line character preference.
 */
export var EndOfLinePreference;
(function (EndOfLinePreference) {
    /**
     * Use the end of line character identified in the text buffer.
     */
    EndOfLinePreference[EndOfLinePreference["TextDefined"] = 0] = "TextDefined";
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["CRLF"] = 2] = "CRLF";
})(EndOfLinePreference || (EndOfLinePreference = {}));
/**
 * The default end of line to use when instantiating models.
 */
export var DefaultEndOfLine;
(function (DefaultEndOfLine) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["CRLF"] = 2] = "CRLF";
})(DefaultEndOfLine || (DefaultEndOfLine = {}));
/**
 * End of line character preference.
 */
export var EndOfLineSequence;
(function (EndOfLineSequence) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["LF"] = 0] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["CRLF"] = 1] = "CRLF";
})(EndOfLineSequence || (EndOfLineSequence = {}));
export class TextModelResolvedOptions {
    get originalIndentSize() {
        return this._indentSizeIsTabSize ? 'tabSize' : this.indentSize;
    }
    /**
     * @internal
     */
    constructor(src) {
        this._textModelResolvedOptionsBrand = undefined;
        this.tabSize = Math.max(1, src.tabSize | 0);
        if (src.indentSize === 'tabSize') {
            this.indentSize = this.tabSize;
            this._indentSizeIsTabSize = true;
        }
        else {
            this.indentSize = Math.max(1, src.indentSize | 0);
            this._indentSizeIsTabSize = false;
        }
        this.insertSpaces = Boolean(src.insertSpaces);
        this.defaultEOL = src.defaultEOL | 0;
        this.trimAutoWhitespace = Boolean(src.trimAutoWhitespace);
        this.bracketPairColorizationOptions = src.bracketPairColorizationOptions;
    }
    /**
     * @internal
     */
    equals(other) {
        return (this.tabSize === other.tabSize &&
            this._indentSizeIsTabSize === other._indentSizeIsTabSize &&
            this.indentSize === other.indentSize &&
            this.insertSpaces === other.insertSpaces &&
            this.defaultEOL === other.defaultEOL &&
            this.trimAutoWhitespace === other.trimAutoWhitespace &&
            equals(this.bracketPairColorizationOptions, other.bracketPairColorizationOptions));
    }
    /**
     * @internal
     */
    createChangeEvent(newOpts) {
        return {
            tabSize: this.tabSize !== newOpts.tabSize,
            indentSize: this.indentSize !== newOpts.indentSize,
            insertSpaces: this.insertSpaces !== newOpts.insertSpaces,
            trimAutoWhitespace: this.trimAutoWhitespace !== newOpts.trimAutoWhitespace,
        };
    }
}
export class FindMatch {
    /**
     * @internal
     */
    constructor(range, matches) {
        this._findMatchBrand = undefined;
        this.range = range;
        this.matches = matches;
    }
}
/**
 * Describes the behavior of decorations when typing/editing near their edges.
 * Note: Please do not edit the values, as they very carefully match `DecorationRangeBehavior`
 */
export var TrackedRangeStickiness;
(function (TrackedRangeStickiness) {
    TrackedRangeStickiness[TrackedRangeStickiness["AlwaysGrowsWhenTypingAtEdges"] = 0] = "AlwaysGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["NeverGrowsWhenTypingAtEdges"] = 1] = "NeverGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingBefore"] = 2] = "GrowsOnlyWhenTypingBefore";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingAfter"] = 3] = "GrowsOnlyWhenTypingAfter";
})(TrackedRangeStickiness || (TrackedRangeStickiness = {}));
/**
 * @internal
 */
export function isITextSnapshot(obj) {
    return obj && typeof obj.read === 'function';
}
/**
 * @internal
 */
export function isITextModel(obj) {
    return Boolean(obj && obj.uri);
}
export var PositionAffinity;
(function (PositionAffinity) {
    /**
     * Prefers the left most position.
     */
    PositionAffinity[PositionAffinity["Left"] = 0] = "Left";
    /**
     * Prefers the right most position.
     */
    PositionAffinity[PositionAffinity["Right"] = 1] = "Right";
    /**
     * No preference.
     */
    PositionAffinity[PositionAffinity["None"] = 2] = "None";
    /**
     * If the given position is on injected text, prefers the position left of it.
     */
    PositionAffinity[PositionAffinity["LeftOfInjectedText"] = 3] = "LeftOfInjectedText";
    /**
     * If the given position is on injected text, prefers the position right of it.
     */
    PositionAffinity[PositionAffinity["RightOfInjectedText"] = 4] = "RightOfInjectedText";
})(PositionAffinity || (PositionAffinity = {}));
/**
 * @internal
 */
export var ModelConstants;
(function (ModelConstants) {
    ModelConstants[ModelConstants["FIRST_LINE_DETECTION_LENGTH_LIMIT"] = 1000] = "FIRST_LINE_DETECTION_LENGTH_LIMIT";
})(ModelConstants || (ModelConstants = {}));
/**
 * @internal
 */
export class ValidAnnotatedEditOperation {
    constructor(identifier, range, text, forceMoveMarkers, isAutoWhitespaceEdit, _isTracked) {
        this.identifier = identifier;
        this.range = range;
        this.text = text;
        this.forceMoveMarkers = forceMoveMarkers;
        this.isAutoWhitespaceEdit = isAutoWhitespaceEdit;
        this._isTracked = _isTracked;
    }
}
/**
 * @internal
 */
export class SearchData {
    constructor(regex, wordSeparators, simpleSearch) {
        this.regex = regex;
        this.wordSeparators = wordSeparators;
        this.simpleSearch = simpleSearch;
    }
}
/**
 * @internal
 */
export class ApplyEditsResult {
    constructor(reverseEdits, changes, trimAutoWhitespaceLineNumbers) {
        this.reverseEdits = reverseEdits;
        this.changes = changes;
        this.trimAutoWhitespaceLineNumbers = trimAutoWhitespaceLineNumbers;
    }
}
/**
 * @internal
 */
export function shouldSynchronizeModel(model) {
    return !model.isTooLargeForSyncing() && !model.isForSimpleWidget;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQThCckQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxpQkFLWDtBQUxELFdBQVksaUJBQWlCO0lBQzVCLHlEQUFRLENBQUE7SUFDUiw2REFBVSxDQUFBO0lBQ1YsMkRBQVMsQ0FBQTtJQUNULHlEQUFRLENBQUE7QUFDVCxDQUFDLEVBTFcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUs1QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksZUFJWDtBQUpELFdBQVksZUFBZTtJQUMxQixxREFBUSxDQUFBO0lBQ1IseURBQVUsQ0FBQTtJQUNWLHVEQUFTLENBQUE7QUFDVixDQUFDLEVBSlcsZUFBZSxLQUFmLGVBQWUsUUFJMUI7QUEwQkQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLHlEQUFVLENBQUE7SUFDVix5REFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHlCQUdqQjtBQUhELFdBQWtCLHlCQUF5QjtJQUMxQyw2RUFBVSxDQUFBO0lBQ1YscUZBQWMsQ0FBQTtBQUNmLENBQUMsRUFIaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQUcxQztBQXlPRCxNQUFNLENBQU4sSUFBWSx1QkFLWDtBQUxELFdBQVksdUJBQXVCO0lBQ2xDLHFFQUFJLENBQUE7SUFDSix1RUFBSyxDQUFBO0lBQ0wscUVBQUksQ0FBQTtJQUNKLHFFQUFJLENBQUE7QUFDTCxDQUFDLEVBTFcsdUJBQXVCLEtB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