/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
    isBefore(other) {
        return false;
    }
    isBeforeOrEqual(other) {
        return false;
    }
    isAfter(other) {
        return false;
    }
    isAfterOrEqual(other) {
        return false;
    }
    isEqual(other) {
        return false;
    }
    compareTo(other) {
        return 0;
    }
    translate(_, _2) {
        return new Position(0, 0);
    }
    with(_) {
        return new Position(0, 0);
    }
}
export class Range {
    constructor(startLine, startCol, endLine, endCol) {
        this.isEmpty = false;
        this.isSingleLine = false;
        this.start = new Position(startLine, startCol);
        this.end = new Position(endLine, endCol);
    }
    contains(positionOrRange) {
        return false;
    }
    isEqual(other) {
        return false;
    }
    intersection(range) {
        return undefined;
    }
    union(other) {
        return new Range(0, 0, 0, 0);
    }
    with(_) {
        return new Range(0, 0, 0, 0);
    }
}
/**
 * The main match information for a {@link TextSearchResult2}.
 */
export class TextSearchMatch2 {
    /**
     * @param uri The uri for the matching document.
     * @param ranges The ranges associated with this match.
     * @param previewText The text that is used to preview the match. The highlighted range in `previewText` is specified in `ranges`.
     */
    constructor(uri, ranges, previewText) {
        this.uri = uri;
        this.ranges = ranges;
        this.previewText = previewText;
    }
}
/**
 * The potential context information for a {@link TextSearchResult2}.
 */
export class TextSearchContext2 {
    /**
     * @param uri The uri for the matching document.
     * @param text The line of context text.
     * @param lineNumber The line number of this line of context.
     */
    constructor(uri, text, lineNumber) {
        this.uri = uri;
        this.text = text;
        this.lineNumber = lineNumber;
    }
}
/**
 * Options for following search.exclude and files.exclude settings.
 */
export var ExcludeSettingOptions;
(function (ExcludeSettingOptions) {
    /*
     * Don't use any exclude settings.
     */
    ExcludeSettingOptions[ExcludeSettingOptions["None"] = 1] = "None";
    /*
     * Use:
     * - files.exclude setting
     */
    ExcludeSettingOptions[ExcludeSettingOptions["FilesExclude"] = 2] = "FilesExclude";
    /*
     * Use:
     * - files.exclude setting
     * - search.exclude setting
     */
    ExcludeSettingOptions[ExcludeSettingOptions["SearchAndFilesExclude"] = 3] = "SearchAndFilesExclude";
})(ExcludeSettingOptions || (ExcludeSettingOptions = {}));
export var TextSearchCompleteMessageType;
(function (TextSearchCompleteMessageType) {
    TextSearchCompleteMessageType[TextSearchCompleteMessageType["Information"] = 1] = "Information";
    TextSearchCompleteMessageType[TextSearchCompleteMessageType["Warning"] = 2] = "Warning";
})(TextSearchCompleteMessageType || (TextSearchCompleteMessageType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3NlYXJjaEV4dFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxRQUFRO0lBQ3BCLFlBQ1UsSUFBWSxFQUNaLFNBQWlCO1FBRGpCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQ3hCLENBQUM7SUFFSixRQUFRLENBQUMsS0FBZTtRQUN2QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxlQUFlLENBQUMsS0FBZTtRQUM5QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLENBQUMsS0FBZTtRQUN0QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxjQUFjLENBQUMsS0FBZTtRQUM3QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLENBQUMsS0FBZTtRQUN0QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxTQUFTLENBQUMsS0FBZTtRQUN4QixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFHRCxTQUFTLENBQUMsQ0FBTyxFQUFFLEVBQVE7UUFDMUIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUdELElBQUksQ0FBQyxDQUFNO1FBQ1YsT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLEtBQUs7SUFJakIsWUFBWSxTQUFpQixFQUFFLFFBQWdCLEVBQUUsT0FBZSxFQUFFLE1BQWM7UUFLaEYsWUFBTyxHQUFHLEtBQUssQ0FBQTtRQUNmLGlCQUFZLEdBQUcsS0FBSyxDQUFBO1FBTG5CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFJRCxRQUFRLENBQUMsZUFBaUM7UUFDekMsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxDQUFDLEtBQVk7UUFDbkIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsWUFBWSxDQUFDLEtBQVk7UUFDeEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELEtBQUssQ0FBQyxLQUFZO1FBQ2pCLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUlELElBQUksQ0FBQyxDQUFNO1FBQ1YsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0Q7QUE0T0Q7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQzVCOzs7O09BSUc7SUFDSCxZQUNRLEdBQVEsRUFDUixNQUFxRCxFQUNyRCxXQUFtQjtRQUZuQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBK0M7UUFDckQsZ0JBQVcsR0FBWCxXQUFXLENBQVE7SUFDeEIsQ0FBQztDQUNKO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCOzs7O09BSUc7SUFDSCxZQUNRLEdBQVEsRUFDUixJQUFZLEVBQ1osVUFBa0I7UUFGbEIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixlQUFVLEdBQVYsVUFBVSxDQUFRO0lBQ3ZCLENBQUM7Q0FDSjtBQXFMRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHFCQWdCWDtBQWhCRCxXQUFZLHFCQUFxQjtJQUNoQzs7T0FFRztJQUNILGlFQUFRLENBQUE7SUFDUjs7O09BR0c7SUFDSCxpRkFBZ0IsQ0FBQTtJQUNoQjs7OztPQUlHO0lBQ0gsbUdBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQWhCVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBZ0JoQztBQUVELE1BQU0sQ0FBTixJQUFZLDZCQUdYO0FBSEQsV0FBWSw2QkFBNkI7SUFDeEMsK0ZBQWUsQ0FBQTtJQUNmLHVGQUFXLENBQUE7QUFDWixDQUFDLEVBSFcsNkJBQTZCLEtBQTdCLDZCQUE2QixRQUd4QyJ9