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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9zZWFyY2hFeHRUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sUUFBUTtJQUNwQixZQUNVLElBQVksRUFDWixTQUFpQjtRQURqQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUN4QixDQUFDO0lBRUosUUFBUSxDQUFDLEtBQWU7UUFDdkIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsZUFBZSxDQUFDLEtBQWU7UUFDOUIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxDQUFDLEtBQWU7UUFDdEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsY0FBYyxDQUFDLEtBQWU7UUFDN0IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxDQUFDLEtBQWU7UUFDdEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsU0FBUyxDQUFDLEtBQWU7UUFDeEIsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBR0QsU0FBUyxDQUFDLENBQU8sRUFBRSxFQUFRO1FBQzFCLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFHRCxJQUFJLENBQUMsQ0FBTTtRQUNWLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxLQUFLO0lBSWpCLFlBQVksU0FBaUIsRUFBRSxRQUFnQixFQUFFLE9BQWUsRUFBRSxNQUFjO1FBS2hGLFlBQU8sR0FBRyxLQUFLLENBQUE7UUFDZixpQkFBWSxHQUFHLEtBQUssQ0FBQTtRQUxuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBSUQsUUFBUSxDQUFDLGVBQWlDO1FBQ3pDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sQ0FBQyxLQUFZO1FBQ25CLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELFlBQVksQ0FBQyxLQUFZO1FBQ3hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBWTtRQUNqQixPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFJRCxJQUFJLENBQUMsQ0FBTTtRQUNWLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBNE9EOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQUM1Qjs7OztPQUlHO0lBQ0gsWUFDUSxHQUFRLEVBQ1IsTUFBcUQsRUFDckQsV0FBbUI7UUFGbkIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQStDO1FBQ3JELGdCQUFXLEdBQVgsV0FBVyxDQUFRO0lBQ3hCLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM5Qjs7OztPQUlHO0lBQ0gsWUFDUSxHQUFRLEVBQ1IsSUFBWSxFQUNaLFVBQWtCO1FBRmxCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osZUFBVSxHQUFWLFVBQVUsQ0FBUTtJQUN2QixDQUFDO0NBQ0o7QUFxTEQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxxQkFnQlg7QUFoQkQsV0FBWSxxQkFBcUI7SUFDaEM7O09BRUc7SUFDSCxpRUFBUSxDQUFBO0lBQ1I7OztPQUdHO0lBQ0gsaUZBQWdCLENBQUE7SUFDaEI7Ozs7T0FJRztJQUNILG1HQUF5QixDQUFBO0FBQzFCLENBQUMsRUFoQlcscUJBQXFCLEtBQXJCLHFCQUFxQixRQWdCaEM7QUFFRCxNQUFNLENBQU4sSUFBWSw2QkFHWDtBQUhELFdBQVksNkJBQTZCO0lBQ3hDLCtGQUFlLENBQUE7SUFDZix1RkFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFHeEMifQ==