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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC9tb25vc3BhY2VMaW5lQnJlYWtzQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUV4RCxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsTUFBTSxPQUFPLGtDQUFrQztJQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQStCO1FBQ25ELE9BQU8sSUFBSSxrQ0FBa0MsQ0FDNUMsT0FBTyxDQUFDLEdBQUcsc0RBQTRDLEVBQ3ZELE9BQU8sQ0FBQyxHQUFHLHFEQUEyQyxDQUN0RCxDQUFBO0lBQ0YsQ0FBQztJQUlELFlBQVksZ0JBQXdCLEVBQUUsZUFBdUI7UUFDNUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLDJCQUEyQixDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFTSx3QkFBd0IsQ0FDOUIsUUFBa0IsRUFDbEIsT0FBZSxFQUNmLGNBQXNCLEVBQ3RCLGNBQThCLEVBQzlCLFNBQStCO1FBRS9CLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUM3QixNQUFNLGFBQWEsR0FBa0MsRUFBRSxDQUFBO1FBQ3ZELE1BQU0sb0JBQW9CLEdBQXVDLEVBQUUsQ0FBQTtRQUNuRSxPQUFPO1lBQ04sVUFBVSxFQUFFLENBQ1gsUUFBZ0IsRUFDaEIsWUFBdUMs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