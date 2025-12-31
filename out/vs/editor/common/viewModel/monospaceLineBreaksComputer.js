/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CharacterClassifier } from '../core/characterClassifier.js';
import { LineInjectedText } from '../textModelEvents.js';
import { ModelLineProjectionData, } from '../modelLineProjectionData.js';
export class MonospaceLineBreaksComputerFactory {
    static create(options) {
        return new MonospaceLineBreaksComputerFactory(options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */), options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */));
    }
    constructor(breakBeforeChars, breakAfterChars) {
        this.classifier = new WrappingCharacterClassifier(breakBeforeChars, breakAfterChars);
    }
    createLineBreaksComputer(fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak) {
        const requests = [];
        const injectedTexts = [];
        const previousBreakingData = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                requests.push(lineText);
                injectedTexts.push(injectedText);
                previousBreakingData.push(previousLineBreakData);
            },
            finalize: () => {
                const columnsForFullWidthChar = fontInfo.typicalFullwidthCharacterWidth / fontInfo.typicalHalfwidthCharacterWidth;
                const result = [];
                for (let i = 0, len = requests.length; i < len; i++) {
                    const injectedText = injectedTexts[i];
                    const previousLineBreakData = previousBreakingData[i];
                    if (previousLineBreakData && !previousLineBreakData.injectionOptions && !injectedText) {
                        result[i] = createLineBreaksFromPreviousLineBreaks(this.classifier, previousLineBreakData, requests[i], tabSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent, wordBreak);
                    }
                    else {
                        result[i] = createLineBreaks(this.classifier, requests[i], injectedText, tabSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent, wordBreak);
                    }
                }
                arrPool1.length = 0;
                arrPool2.length = 0;
                return result;
            },
        };
    }
}
var CharacterClass;
(function (CharacterClass) {
    CharacterClass[CharacterClass["NONE"] = 0] = "NONE";
    CharacterClass[CharacterClass["BREAK_BEFORE"] = 1] = "BREAK_BEFORE";
    CharacterClass[CharacterClass["BREAK_AFTER"] = 2] = "BREAK_AFTER";
    CharacterClass[CharacterClass["BREAK_IDEOGRAPHIC"] = 3] = "BREAK_IDEOGRAPHIC";
})(CharacterClass || (CharacterClass = {}));
class WrappingCharacterClassifier extends CharacterClassifier {
    constructor(BREAK_BEFORE, BREAK_AFTER) {
        super(0 /* CharacterClass.NONE */);
        for (let i = 0; i < BREAK_BEFORE.length; i++) {
            this.set(BREAK_BEFORE.charCodeAt(i), 1 /* CharacterClass.BREAK_BEFORE */);
        }
        for (let i = 0; i < BREAK_AFTER.length; i++) {
            this.set(BREAK_AFTER.charCodeAt(i), 2 /* CharacterClass.BREAK_AFTER */);
        }
    }
    get(charCode) {
        if (charCode >= 0 && charCode < 256) {
            return this._asciiMap[charCode];
        }
        else {
            // Initialize CharacterClass.BREAK_IDEOGRAPHIC for these Unicode ranges:
            // 1. CJK Unified Ideographs (0x4E00 -- 0x9FFF)
            // 2. CJK Unified Ideographs Extension A (0x3400 -- 0x4DBF)
            // 3. Hiragana and Katakana (0x3040 -- 0x30FF)
            if ((charCode >= 0x3040 && charCode <= 0x30ff) ||
                (charCode >= 0x3400 && charCode <= 0x4dbf) ||
                (charCode >= 0x4e00 && charCode <= 0x9fff)) {
                return 3 /* CharacterClass.BREAK_IDEOGRAPHIC */;
            }
            return (this._map.get(charCode) || this._defaultValue);
        }
    }
}
let arrPool1 = [];
let arrPool2 = [];
function createLineBreaksFromPreviousLineBreaks(classifier, previousBreakingData, lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent, wordBreak) {
    if (firstLineBreakColumn === -1) {
        return null;
    }
    const len = lineText.length;
    if (len <= 1) {
        return null;
    }
    const isKeepAll = wordBreak === 'keepAll';
    const prevBreakingOffsets = previousBreakingData.breakOffsets;
    const prevBreakingOffsetsVisibleColumn = previousBreakingData.breakOffsetsVisibleColumn;
    const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
    const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;
    const breakingOffsets = arrPool1;
    const breakingOffsetsVisibleColumn = arrPool2;
    let breakingOffsetsCount = 0;
    let lastBreakingOffset = 0;
    let lastBreakingOffsetVisibleColumn = 0;
    let breakingColumn = firstLineBreakColumn;
    const prevLen = prevBreakingOffsets.length;
    let prevIndex = 0;
    if (prevIndex >= 0) {
        let bestDistance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex] - breakingColumn);
        while (prevIndex + 1 < prevLen) {
            const distance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex + 1] - breakingColumn);
            if (distance >= bestDistance) {
                break;
            }
            bestDistance = distance;
            prevIndex++;
        }
    }
    while (prevIndex < prevLen) {
        // Allow for prevIndex to be -1 (for the case where we hit a tab when walking backwards from the first break)
        let prevBreakOffset = prevIndex < 0 ? 0 : prevBreakingOffsets[prevIndex];
        let prevBreakOffsetVisibleColumn = prevIndex < 0 ? 0 : prevBreakingOffsetsVisibleColumn[prevIndex];
        if (lastBreakingOffset > prevBreakOffset) {
            prevBreakOffset = lastBreakingOffset;
            prevBreakOffsetVisibleColumn = lastBreakingOffsetVisibleColumn;
        }
        let breakOffset = 0;
        let breakOffsetVisibleColumn = 0;
        let forcedBreakOffset = 0;
        let forcedBreakOffsetVisibleColumn = 0;
        // initially, we search as much as possible to the right (if it fits)
        if (prevBreakOffsetVisibleColumn <= breakingColumn) {
            let visibleColumn = prevBreakOffsetVisibleColumn;
            let prevCharCode = prevBreakOffset === 0 ? 0 /* CharCode.Null */ : lineText.charCodeAt(prevBreakOffset - 1);
            let prevCharCodeClass = prevBreakOffset === 0 ? 0 /* CharacterClass.NONE */ : classifier.get(prevCharCode);
            let entireLineFits = true;
            for (let i = prevBreakOffset; i < len; i++) {
                const charStartOffset = i;
                const charCode = lineText.charCodeAt(i);
                let charCodeClass;
                let charWidth;
                if (strings.isHighSurrogate(charCode)) {
                    // A surrogate pair must always be considered as a single unit, so it is never to be broken
                    i++;
                    charCodeClass = 0 /* CharacterClass.NONE */;
                    charWidth = 2;
                }
                else {
                    charCodeClass = classifier.get(charCode);
                    charWidth = computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar);
                }
                if (charStartOffset > lastBreakingOffset &&
                    canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
                    breakOffset = charStartOffset;
                    breakOffsetVisibleColumn = visibleColumn;
                }
                visibleColumn += charWidth;
                // check if adding character at `i` will go over the breaking column
                if (visibleColumn > breakingColumn) {
                    // We need to break at least before character at `i`:
                    if (charStartOffset > lastBreakingOffset) {
                        forcedBreakOffset = charStartOffset;
                        forcedBreakOffsetVisibleColumn = visibleColumn - charWidth;
                    }
                    else {
                        // we need to advance at least by one character
                        forcedBreakOffset = i + 1;
                        forcedBreakOffsetVisibleColumn = visibleColumn;
                    }
                    if (visibleColumn - breakOffsetVisibleColumn > wrappedLineBreakColumn) {
                        // Cannot break at `breakOffset` => reset it if it was set
                        breakOffset = 0;
                    }
                    entireLineFits = false;
                    break;
                }
                prevCharCode = charCode;
                prevCharCodeClass = charCodeClass;
            }
            if (entireLineFits) {
                // there is no more need to break => stop the outer loop!
                if (breakingOffsetsCount > 0) {
                    // Add last segment, no need to assign to `lastBreakingOffset` and `lastBreakingOffsetVisibleColumn`
                    breakingOffsets[breakingOffsetsCount] =
                        prevBreakingOffsets[prevBreakingOffsets.length - 1];
                    breakingOffsetsVisibleColumn[breakingOffsetsCount] =
                        prevBreakingOffsetsVisibleColumn[prevBreakingOffsets.length - 1];
                    breakingOffsetsCount++;
                }
                break;
            }
        }
        if (breakOffset === 0) {
            // must search left
            let visibleColumn = prevBreakOffsetVisibleColumn;
            let charCode = lineText.charCodeAt(prevBreakOffset);
            let charCodeClass = classifier.get(charCode);
            let hitATabCharacter = false;
            for (let i = prevBreakOffset - 1; i >= lastBreakingOffset; i--) {
                const charStartOffset = i + 1;
                const prevCharCode = lineText.charCodeAt(i);
                if (prevCharCode === 9 /* CharCode.Tab */) {
                    // cannot determine the width of a tab when going backwards, so we must go forwards
                    hitATabCharacter = true;
                    break;
                }
                let prevCharCodeClass;
                let prevCharWidth;
                if (strings.isLowSurrogate(prevCharCode)) {
                    // A surrogate pair must always be considered as a single unit, so it is never to be broken
                    i--;
                    prevCharCodeClass = 0 /* CharacterClass.NONE */;
                    prevCharWidth = 2;
                }
                else {
                    prevCharCodeClass = classifier.get(prevCharCode);
                    prevCharWidth = strings.isFullWidthCharacter(prevCharCode) ? columnsForFullWidthChar : 1;
                }
                if (visibleColumn <= breakingColumn) {
                    if (forcedBreakOffset === 0) {
                        forcedBreakOffset = charStartOffset;
                        forcedBreakOffsetVisibleColumn = visibleColumn;
                    }
                    if (visibleColumn <= breakingColumn - wrappedLineBreakColumn) {
                        // went too far!
                        break;
                    }
                    if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
                        breakOffset = charStartOffset;
                        breakOffsetVisibleColumn = visibleColumn;
                        break;
                    }
                }
                visibleColumn -= prevCharWidth;
                charCode = prevCharCode;
                charCodeClass = prevCharCodeClass;
            }
            if (breakOffset !== 0) {
                const remainingWidthOfNextLine = wrappedLineBreakColumn - (forcedBreakOffsetVisibleColumn - breakOffsetVisibleColumn);
                if (remainingWidthOfNextLine <= tabSize) {
                    const charCodeAtForcedBreakOffset = lineText.charCodeAt(forcedBreakOffset);
                    let charWidth;
                    if (strings.isHighSurrogate(charCodeAtForcedBreakOffset)) {
                        // A surrogate pair must always be considered as a single unit, so it is never to be broken
                        charWidth = 2;
                    }
                    else {
                        charWidth = computeCharWidth(charCodeAtForcedBreakOffset, forcedBreakOffsetVisibleColumn, tabSize, columnsForFullWidthChar);
                    }
                    if (remainingWidthOfNextLine - charWidth < 0) {
                        // it is not worth it to break at breakOffset, it just introduces an extra needless line!
                        breakOffset = 0;
                    }
                }
            }
            if (hitATabCharacter) {
                // cannot determine the width of a tab when going backwards, so we must go forwards from the previous break
                prevIndex--;
                continue;
            }
        }
        if (breakOffset === 0) {
            // Could not find a good breaking point
            breakOffset = forcedBreakOffset;
            breakOffsetVisibleColumn = forcedBreakOffsetVisibleColumn;
        }
        if (breakOffset <= lastBreakingOffset) {
            // Make sure that we are advancing (at least one character)
            const charCode = lineText.charCodeAt(lastBreakingOffset);
            if (strings.isHighSurrogate(charCode)) {
                // A surrogate pair must always be considered as a single unit, so it is never to be broken
                breakOffset = lastBreakingOffset + 2;
                breakOffsetVisibleColumn = lastBreakingOffsetVisibleColumn + 2;
            }
            else {
                breakOffset = lastBreakingOffset + 1;
                breakOffsetVisibleColumn =
                    lastBreakingOffsetVisibleColumn +
                        computeCharWidth(charCode, lastBreakingOffsetVisibleColumn, tabSize, columnsForFullWidthChar);
            }
        }
        lastBreakingOffset = breakOffset;
        breakingOffsets[breakingOffsetsCount] = breakOffset;
        lastBreakingOffsetVisibleColumn = breakOffsetVisibleColumn;
        breakingOffsetsVisibleColumn[breakingOffsetsCount] = breakOffsetVisibleColumn;
        breakingOffsetsCount++;
        breakingColumn = breakOffsetVisibleColumn + wrappedLineBreakColumn;
        while (prevIndex < 0 ||
            (prevIndex < prevLen &&
                prevBreakingOffsetsVisibleColumn[prevIndex] < breakOffsetVisibleColumn)) {
            prevIndex++;
        }
        let bestDistance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex] - breakingColumn);
        while (prevIndex + 1 < prevLen) {
            const distance = Math.abs(prevBreakingOffsetsVisibleColumn[prevIndex + 1] - breakingColumn);
            if (distance >= bestDistance) {
                break;
            }
            bestDistance = distance;
            prevIndex++;
        }
    }
    if (breakingOffsetsCount === 0) {
        return null;
    }
    // Doing here some object reuse which ends up helping a huge deal with GC pauses!
    breakingOffsets.length = breakingOffsetsCount;
    breakingOffsetsVisibleColumn.length = breakingOffsetsCount;
    arrPool1 = previousBreakingData.breakOffsets;
    arrPool2 = previousBreakingData.breakOffsetsVisibleColumn;
    previousBreakingData.breakOffsets = breakingOffsets;
    previousBreakingData.breakOffsetsVisibleColumn = breakingOffsetsVisibleColumn;
    previousBreakingData.wrappedTextIndentLength = wrappedTextIndentLength;
    return previousBreakingData;
}
function createLineBreaks(classifier, _lineText, injectedTexts, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent, wordBreak) {
    const lineText = LineInjectedText.applyInjectedText(_lineText, injectedTexts);
    let injectionOptions;
    let injectionOffsets;
    if (injectedTexts && injectedTexts.length > 0) {
        injectionOptions = injectedTexts.map((t) => t.options);
        injectionOffsets = injectedTexts.map((text) => text.column - 1);
    }
    else {
        injectionOptions = null;
        injectionOffsets = null;
    }
    if (firstLineBreakColumn === -1) {
        if (!injectionOptions) {
            return null;
        }
        // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
        // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
        return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
    }
    const len = lineText.length;
    if (len <= 1) {
        if (!injectionOptions) {
            return null;
        }
        // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
        // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
        return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
    }
    const isKeepAll = wordBreak === 'keepAll';
    const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
    const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;
    const breakingOffsets = [];
    const breakingOffsetsVisibleColumn = [];
    let breakingOffsetsCount = 0;
    let breakOffset = 0;
    let breakOffsetVisibleColumn = 0;
    let breakingColumn = firstLineBreakColumn;
    let prevCharCode = lineText.charCodeAt(0);
    let prevCharCodeClass = classifier.get(prevCharCode);
    let visibleColumn = computeCharWidth(prevCharCode, 0, tabSize, columnsForFullWidthChar);
    let startOffset = 1;
    if (strings.isHighSurrogate(prevCharCode)) {
        // A surrogate pair must always be considered as a single unit, so it is never to be broken
        visibleColumn += 1;
        prevCharCode = lineText.charCodeAt(1);
        prevCharCodeClass = classifier.get(prevCharCode);
        startOffset++;
    }
    for (let i = startOffset; i < len; i++) {
        const charStartOffset = i;
        const charCode = lineText.charCodeAt(i);
        let charCodeClass;
        let charWidth;
        if (strings.isHighSurrogate(charCode)) {
            // A surrogate pair must always be considered as a single unit, so it is never to be broken
            i++;
            charCodeClass = 0 /* CharacterClass.NONE */;
            charWidth = 2;
        }
        else {
            charCodeClass = classifier.get(charCode);
            charWidth = computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar);
        }
        if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
            breakOffset = charStartOffset;
            breakOffsetVisibleColumn = visibleColumn;
        }
        visibleColumn += charWidth;
        // check if adding character at `i` will go over the breaking column
        if (visibleColumn > breakingColumn) {
            // We need to break at least before character at `i`:
            if (breakOffset === 0 || visibleColumn - breakOffsetVisibleColumn > wrappedLineBreakColumn) {
                // Cannot break at `breakOffset`, must break at `i`
                breakOffset = charStartOffset;
                breakOffsetVisibleColumn = visibleColumn - charWidth;
            }
            breakingOffsets[breakingOffsetsCount] = breakOffset;
            breakingOffsetsVisibleColumn[breakingOffsetsCount] = breakOffsetVisibleColumn;
            breakingOffsetsCount++;
            breakingColumn = breakOffsetVisibleColumn + wrappedLineBreakColumn;
            breakOffset = 0;
        }
        prevCharCode = charCode;
        prevCharCodeClass = charCodeClass;
    }
    if (breakingOffsetsCount === 0 && (!injectedTexts || injectedTexts.length === 0)) {
        return null;
    }
    // Add last segment
    breakingOffsets[breakingOffsetsCount] = len;
    breakingOffsetsVisibleColumn[breakingOffsetsCount] = visibleColumn;
    return new ModelLineProjectionData(injectionOffsets, injectionOptions, breakingOffsets, breakingOffsetsVisibleColumn, wrappedTextIndentLength);
}
function computeCharWidth(charCode, visibleColumn, tabSize, columnsForFullWidthChar) {
    if (charCode === 9 /* CharCode.Tab */) {
        return tabSize - (visibleColumn % tabSize);
    }
    if (strings.isFullWidthCharacter(charCode)) {
        return columnsForFullWidthChar;
    }
    if (charCode < 32) {
        // when using `editor.renderControlCharacters`, the substitutions are often wide
        return columnsForFullWidthChar;
    }
    return 1;
}
function tabCharacterWidth(visibleColumn, tabSize) {
    return tabSize - (visibleColumn % tabSize);
}
/**
 * Kinsoku Shori : Don't break after a leading character, like an open bracket
 * Kinsoku Shori : Don't break before a trailing character, like a period
 */
function canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll) {
    return (charCode !== 32 /* CharCode.Space */ &&
        ((prevCharCodeClass === 2 /* CharacterClass.BREAK_AFTER */ &&
            charCodeClass !== 2 /* CharacterClass.BREAK_AFTER */) || // break at the end of multiple BREAK_AFTER
            (prevCharCodeClass !== 1 /* CharacterClass.BREAK_BEFORE */ &&
                charCodeClass === 1 /* CharacterClass.BREAK_BEFORE */) || // break at the start of multiple BREAK_BEFORE
            (!isKeepAll &&
                prevCharCodeClass === 3 /* CharacterClass.BREAK_IDEOGRAPHIC */ &&
                charCodeClass !== 2 /* CharacterClass.BREAK_AFTER */) ||
            (!isKeepAll &&
                charCodeClass === 3 /* CharacterClass.BREAK_IDEOGRAPHIC */ &&
                prevCharCodeClass !== 1 /* CharacterClass.BREAK_BEFORE */)));
}
function computeWrappedTextIndentLength(lineText, tabSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent) {
    let wrappedTextIndentLength = 0;
    if (wrappingIndent !== 0 /* WrappingIndent.None */) {
        const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineText);
        if (firstNonWhitespaceIndex !== -1) {
            // Track existing indent
            for (let i = 0; i < firstNonWhitespaceIndex; i++) {
                const charWidth = lineText.charCodeAt(i) === 9 /* CharCode.Tab */
                    ? tabCharacterWidth(wrappedTextIndentLength, tabSize)
                    : 1;
                wrappedTextIndentLength += charWidth;
            }
            // Increase indent of continuation lines, if desired
            const numberOfAdditionalTabs = wrappingIndent === 3 /* WrappingIndent.DeepIndent */
                ? 2
                : wrappingIndent === 2 /* WrappingIndent.Indent */
                    ? 1
                    : 0;
            for (let i = 0; i < numberOfAdditionalTabs; i++) {
                const charWidth = tabCharacterWidth(wrappedTextIndentLength, tabSize);
                wrappedTextIndentLength += charWidth;
            }
            // Force sticking to beginning of line if no character would fit except for the indentation
            if (wrappedTextIndentLength + columnsForFullWidthChar > firstLineBreakColumn) {
                wrappedTextIndentLength = 0;
            }
        }
    }
    return wrappedTextIndentLength;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvbW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFeEQsT0FBTyxFQUdOLHVCQUF1QixHQUN2QixNQUFNLCtCQUErQixDQUFBO0FBRXRDLE1BQU0sT0FBTyxrQ0FBa0M7SUFDdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUErQjtRQUNuRCxPQUFPLElBQUksa0NBQWtDLENBQzVDLE9BQU8sQ0FBQyxHQUFHLHNEQUE0QyxFQUN2RCxPQUFPLENBQUMsR0FBRyxxREFBMkMsQ0FDdEQsQ0FBQTtJQUNGLENBQUM7SUFJRCxZQUFZLGdCQUF3QixFQUFFLGVBQXVCO1FBQzVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRU0sd0JBQXdCLENBQzlCLFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixjQUFzQixFQUN0QixjQUE4QixFQUM5QixTQUErQjtRQUUvQixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUE7UUFDN0IsTUFBTSxhQUFhLEdBQWtDLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLG9CQUFvQixHQUF1QyxFQUFFLENBQUE7UUFDbkUsT0FBTztZQUNOLFVBQVUsRUFBRSxDQUNYLFFBQWdCLEVBQ2hCLFlBQXVDLEVBQ3ZDLHFCQUFxRCxFQUNwRCxFQUFF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