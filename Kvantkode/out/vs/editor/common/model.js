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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBOEJyRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGlCQUtYO0FBTEQsV0FBWSxpQkFBaUI7SUFDNUIseURBQVEsQ0FBQTtJQUNSLDZEQUFVLENBQUE7SUFDViwyREFBUyxDQUFBO0lBQ1QseURBQVEsQ0FBQTtBQUNULENBQUMsRUFMVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBSzVCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxlQUlYO0FBSkQsV0FBWSxlQUFlO0lBQzFCLHFEQUFRLENBQUE7SUFDUix5REFBVSxDQUFBO0lBQ1YsdURBQVMsQ0FBQTtBQUNWLENBQUMsRUFKVyxlQUFlLEtBQWYsZUFBZSxRQUkxQjtBQTBCRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixlQUdqQjtBQUhELFdBQWtCLGVBQWU7SUFDaEMseURBQVUsQ0FBQTtJQUNWLHlEQUFVLENBQUE7QUFDWCxDQUFDLEVBSGlCLGVBQWUsS0FBZixlQUFlLFFBR2hDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IseUJBR2pCO0FBSEQsV0FBa0IseUJBQXlCO0lBQzFDLDZFQUFVLENBQUE7SUFDVixxRkFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUhpQix5QkFBeUIsS0FBekIseUJBQXlCLFFBRzFDO0FBeU9ELE1BQU0sQ0FBTixJQUFZLHVCQUtYO0FBTEQsV0FBWSx1QkFBdUI7SUFDbEMscUVBQUksQ0FBQTtJQUNKLHVFQUFLLENBQUE7SUFDTCxxRUFBSSxDQUFBO0lBQ0oscUVBQUksQ0FBQTtBQUNMLENBQUMsRUFMVyx1QkFB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