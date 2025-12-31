/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { getMapForWordSeparators, } from '../core/wordCharacterClassifier.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { FindMatch, SearchData } from '../model.js';
const LIMIT_FIND_COUNT = 999;
export class SearchParams {
    constructor(searchString, isRegex, matchCase, wordSeparators) {
        this.searchString = searchString;
        this.isRegex = isRegex;
        this.matchCase = matchCase;
        this.wordSeparators = wordSeparators;
    }
    parseSearchRequest() {
        if (this.searchString === '') {
            return null;
        }
        // Try to create a RegExp out of the params
        let multiline;
        if (this.isRegex) {
            multiline = isMultilineRegexSource(this.searchString);
        }
        else {
            multiline = this.searchString.indexOf('\n') >= 0;
        }
        let regex = null;
        try {
            regex = strings.createRegExp(this.searchString, this.isRegex, {
                matchCase: this.matchCase,
                wholeWord: false,
                multiline: multiline,
                global: true,
                unicode: true,
            });
        }
        catch (err) {
            return null;
        }
        if (!regex) {
            return null;
        }
        let canUseSimpleSearch = !this.isRegex && !multiline;
        if (canUseSimpleSearch && this.searchString.toLowerCase() !== this.searchString.toUpperCase()) {
            // casing might make a difference
            canUseSimpleSearch = this.matchCase;
        }
        return new SearchData(regex, this.wordSeparators ? getMapForWordSeparators(this.wordSeparators, []) : null, canUseSimpleSearch ? this.searchString : null);
    }
}
export function isMultilineRegexSource(searchString) {
    if (!searchString || searchString.length === 0) {
        return false;
    }
    for (let i = 0, len = searchString.length; i < len; i++) {
        const chCode = searchString.charCodeAt(i);
        if (chCode === 10 /* CharCode.LineFeed */) {
            return true;
        }
        if (chCode === 92 /* CharCode.Backslash */) {
            // move to next char
            i++;
            if (i >= len) {
                // string ends with a \
                break;
            }
            const nextChCode = searchString.charCodeAt(i);
            if (nextChCode === 110 /* CharCode.n */ || nextChCode === 114 /* CharCode.r */ || nextChCode === 87 /* CharCode.W */) {
                return true;
            }
        }
    }
    return false;
}
export function createFindMatch(range, rawMatches, captureMatches) {
    if (!captureMatches) {
        return new FindMatch(range, null);
    }
    const matches = [];
    for (let i = 0, len = rawMatches.length; i < len; i++) {
        matches[i] = rawMatches[i];
    }
    return new FindMatch(range, matches);
}
class LineFeedCounter {
    constructor(text) {
        const lineFeedsOffsets = [];
        let lineFeedsOffsetsLen = 0;
        for (let i = 0, textLen = text.length; i < textLen; i++) {
            if (text.charCodeAt(i) === 10 /* CharCode.LineFeed */) {
                lineFeedsOffsets[lineFeedsOffsetsLen++] = i;
            }
        }
        this._lineFeedsOffsets = lineFeedsOffsets;
    }
    findLineFeedCountBeforeOffset(offset) {
        const lineFeedsOffsets = this._lineFeedsOffsets;
        let min = 0;
        let max = lineFeedsOffsets.length - 1;
        if (max === -1) {
            // no line feeds
            return 0;
        }
        if (offset <= lineFeedsOffsets[0]) {
            // before first line feed
            return 0;
        }
        while (min < max) {
            const mid = min + (((max - min) / 2) >> 0);
            if (lineFeedsOffsets[mid] >= offset) {
                max = mid - 1;
            }
            else {
                if (lineFeedsOffsets[mid + 1] >= offset) {
                    // bingo!
                    min = mid;
                    max = mid;
                }
                else {
                    min = mid + 1;
                }
            }
        }
        return min + 1;
    }
}
export class TextModelSearch {
    static findMatches(model, searchParams, searchRange, captureMatches, limitResultCount) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        if (searchData.regex.multiline) {
            return this._doFindMatchesMultiline(model, searchRange, new Searcher(searchData.wordSeparators, searchData.regex), captureMatches, limitResultCount);
        }
        return this._doFindMatchesLineByLine(model, searchRange, searchData, captureMatches, limitResultCount);
    }
    /**
     * Multiline search always executes on the lines concatenated with \n.
     * We must therefore compensate for the count of \n in case the model is CRLF
     */
    static _getMultilineMatchRange(model, deltaOffset, text, lfCounter, matchIndex, match0) {
        let startOffset;
        let lineFeedCountBeforeMatch = 0;
        if (lfCounter) {
            lineFeedCountBeforeMatch = lfCounter.findLineFeedCountBeforeOffset(matchIndex);
            startOffset =
                deltaOffset + matchIndex + lineFeedCountBeforeMatch; /* add as many \r as there were \n */
        }
        else {
            startOffset = deltaOffset + matchIndex;
        }
        let endOffset;
        if (lfCounter) {
            const lineFeedCountBeforeEndOfMatch = lfCounter.findLineFeedCountBeforeOffset(matchIndex + match0.length);
            const lineFeedCountInMatch = lineFeedCountBeforeEndOfMatch - lineFeedCountBeforeMatch;
            endOffset =
                startOffset + match0.length + lineFeedCountInMatch; /* add as many \r as there were \n */
        }
        else {
            endOffset = startOffset + match0.length;
        }
        const startPosition = model.getPositionAt(startOffset);
        const endPosition = model.getPositionAt(endOffset);
        return new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
    }
    static _doFindMatchesMultiline(model, searchRange, searcher, captureMatches, limitResultCount) {
        const deltaOffset = model.getOffsetAt(searchRange.getStartPosition());
        // We always execute multiline search over the lines joined with \n
        // This makes it that \n will match the EOL for both CRLF and LF models
        // We compensate for offset errors in `_getMultilineMatchRange`
        const text = model.getValueInRange(searchRange, 1 /* EndOfLinePreference.LF */);
        const lfCounter = model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null;
        const result = [];
        let counter = 0;
        let m;
        searcher.reset(0);
        while ((m = searcher.next(text))) {
            result[counter++] = createFindMatch(this._getMultilineMatchRange(model, deltaOffset, text, lfCounter, m.index, m[0]), m, captureMatches);
            if (counter >= limitResultCount) {
                return result;
            }
        }
        return result;
    }
    static _doFindMatchesLineByLine(model, searchRange, searchData, captureMatches, limitResultCount) {
        const result = [];
        let resultLen = 0;
        // Early case for a search range that starts & stops on the same line number
        if (searchRange.startLineNumber === searchRange.endLineNumber) {
            const text = model
                .getLineContent(searchRange.startLineNumber)
                .substring(searchRange.startColumn - 1, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, text, searchRange.startLineNumber, searchRange.startColumn - 1, resultLen, result, captureMatches, limitResultCount);
            return result;
        }
        // Collect results from first line
        const text = model
            .getLineContent(searchRange.startLineNumber)
            .substring(searchRange.startColumn - 1);
        resultLen = this._findMatchesInLine(searchData, text, searchRange.startLineNumber, searchRange.startColumn - 1, resultLen, result, captureMatches, limitResultCount);
        // Collect results from middle lines
        for (let lineNumber = searchRange.startLineNumber + 1; lineNumber < searchRange.endLineNumber && resultLen < limitResultCount; lineNumber++) {
            resultLen = this._findMatchesInLine(searchData, model.getLineContent(lineNumber), lineNumber, 0, resultLen, result, captureMatches, limitResultCount);
        }
        // Collect results from last line
        if (resultLen < limitResultCount) {
            const text = model
                .getLineContent(searchRange.endLineNumber)
                .substring(0, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, text, searchRange.endLineNumber, 0, resultLen, result, captureMatches, limitResultCount);
        }
        return result;
    }
    static _findMatchesInLine(searchData, text, lineNumber, deltaOffset, resultLen, result, captureMatches, limitResultCount) {
        const wordSeparators = searchData.wordSeparators;
        if (!captureMatches && searchData.simpleSearch) {
            const searchString = searchData.simpleSearch;
            const searchStringLen = searchString.length;
            const textLength = text.length;
            let lastMatchIndex = -searchStringLen;
            while ((lastMatchIndex = text.indexOf(searchString, lastMatchIndex + searchStringLen)) !== -1) {
                if (!wordSeparators ||
                    isValidMatch(wordSeparators, text, textLength, lastMatchIndex, searchStringLen)) {
                    result[resultLen++] = new FindMatch(new Range(lineNumber, lastMatchIndex + 1 + deltaOffset, lineNumber, lastMatchIndex + 1 + searchStringLen + deltaOffset), null);
                    if (resultLen >= limitResultCount) {
                        return resultLen;
                    }
                }
            }
            return resultLen;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        let m;
        // Reset regex to search from the beginning
        searcher.reset(0);
        do {
            m = searcher.next(text);
            if (m) {
                result[resultLen++] = createFindMatch(new Range(lineNumber, m.index + 1 + deltaOffset, lineNumber, m.index + 1 + m[0].length + deltaOffset), m, captureMatches);
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    static findNextMatch(model, searchParams, searchStart, captureMatches) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        if (searchData.regex.multiline) {
            return this._doFindNextMatchMultiline(model, searchStart, searcher, captureMatches);
        }
        return this._doFindNextMatchLineByLine(model, searchStart, searcher, captureMatches);
    }
    static _doFindNextMatchMultiline(model, searchStart, searcher, captureMatches) {
        const searchTextStart = new Position(searchStart.lineNumber, 1);
        const deltaOffset = model.getOffsetAt(searchTextStart);
        const lineCount = model.getLineCount();
        // We always execute multiline search over the lines joined with \n
        // This makes it that \n will match the EOL for both CRLF and LF models
        // We compensate for offset errors in `_getMultilineMatchRange`
        const text = model.getValueInRange(new Range(searchTextStart.lineNumber, searchTextStart.column, lineCount, model.getLineMaxColumn(lineCount)), 1 /* EndOfLinePreference.LF */);
        const lfCounter = model.getEOL() === '\r\n' ? new LineFeedCounter(text) : null;
        searcher.reset(searchStart.column - 1);
        const m = searcher.next(text);
        if (m) {
            return createFindMatch(this._getMultilineMatchRange(model, deltaOffset, text, lfCounter, m.index, m[0]), m, captureMatches);
        }
        if (searchStart.lineNumber !== 1 || searchStart.column !== 1) {
            // Try again from the top
            return this._doFindNextMatchMultiline(model, new Position(1, 1), searcher, captureMatches);
        }
        return null;
    }
    static _doFindNextMatchLineByLine(model, searchStart, searcher, captureMatches) {
        const lineCount = model.getLineCount();
        const startLineNumber = searchStart.lineNumber;
        // Look in first line
        const text = model.getLineContent(startLineNumber);
        const r = this._findFirstMatchInLine(searcher, text, startLineNumber, searchStart.column, captureMatches);
        if (r) {
            return r;
        }
        for (let i = 1; i <= lineCount; i++) {
            const lineIndex = (startLineNumber + i - 1) % lineCount;
            const text = model.getLineContent(lineIndex + 1);
            const r = this._findFirstMatchInLine(searcher, text, lineIndex + 1, 1, captureMatches);
            if (r) {
                return r;
            }
        }
        return null;
    }
    static _findFirstMatchInLine(searcher, text, lineNumber, fromColumn, captureMatches) {
        // Set regex to search from column
        searcher.reset(fromColumn - 1);
        const m = searcher.next(text);
        if (m) {
            return createFindMatch(new Range(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length), m, captureMatches);
        }
        return null;
    }
    static findPreviousMatch(model, searchParams, searchStart, captureMatches) {
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        if (searchData.regex.multiline) {
            return this._doFindPreviousMatchMultiline(model, searchStart, searcher, captureMatches);
        }
        return this._doFindPreviousMatchLineByLine(model, searchStart, searcher, captureMatches);
    }
    static _doFindPreviousMatchMultiline(model, searchStart, searcher, captureMatches) {
        const matches = this._doFindMatchesMultiline(model, new Range(1, 1, searchStart.lineNumber, searchStart.column), searcher, captureMatches, 10 * LIMIT_FIND_COUNT);
        if (matches.length > 0) {
            return matches[matches.length - 1];
        }
        const lineCount = model.getLineCount();
        if (searchStart.lineNumber !== lineCount ||
            searchStart.column !== model.getLineMaxColumn(lineCount)) {
            // Try again with all content
            return this._doFindPreviousMatchMultiline(model, new Position(lineCount, model.getLineMaxColumn(lineCount)), searcher, captureMatches);
        }
        return null;
    }
    static _doFindPreviousMatchLineByLine(model, searchStart, searcher, captureMatches) {
        const lineCount = model.getLineCount();
        const startLineNumber = searchStart.lineNumber;
        // Look in first line
        const text = model.getLineContent(startLineNumber).substring(0, searchStart.column - 1);
        const r = this._findLastMatchInLine(searcher, text, startLineNumber, captureMatches);
        if (r) {
            return r;
        }
        for (let i = 1; i <= lineCount; i++) {
            const lineIndex = (lineCount + startLineNumber - i - 1) % lineCount;
            const text = model.getLineContent(lineIndex + 1);
            const r = this._findLastMatchInLine(searcher, text, lineIndex + 1, captureMatches);
            if (r) {
                return r;
            }
        }
        return null;
    }
    static _findLastMatchInLine(searcher, text, lineNumber, captureMatches) {
        let bestResult = null;
        let m;
        searcher.reset(0);
        while ((m = searcher.next(text))) {
            bestResult = createFindMatch(new Range(lineNumber, m.index + 1, lineNumber, m.index + 1 + m[0].length), m, captureMatches);
        }
        return bestResult;
    }
}
function leftIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    if (matchStartIndex === 0) {
        // Match starts at start of string
        return true;
    }
    const charBefore = text.charCodeAt(matchStartIndex - 1);
    if (wordSeparators.get(charBefore) !== 0 /* WordCharacterClass.Regular */) {
        // The character before the match is a word separator
        return true;
    }
    if (charBefore === 13 /* CharCode.CarriageReturn */ || charBefore === 10 /* CharCode.LineFeed */) {
        // The character before the match is line break or carriage return.
        return true;
    }
    if (matchLength > 0) {
        const firstCharInMatch = text.charCodeAt(matchStartIndex);
        if (wordSeparators.get(firstCharInMatch) !== 0 /* WordCharacterClass.Regular */) {
            // The first character inside the match is a word separator
            return true;
        }
    }
    return false;
}
function rightIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    if (matchStartIndex + matchLength === textLength) {
        // Match ends at end of string
        return true;
    }
    const charAfter = text.charCodeAt(matchStartIndex + matchLength);
    if (wordSeparators.get(charAfter) !== 0 /* WordCharacterClass.Regular */) {
        // The character after the match is a word separator
        return true;
    }
    if (charAfter === 13 /* CharCode.CarriageReturn */ || charAfter === 10 /* CharCode.LineFeed */) {
        // The character after the match is line break or carriage return.
        return true;
    }
    if (matchLength > 0) {
        const lastCharInMatch = text.charCodeAt(matchStartIndex + matchLength - 1);
        if (wordSeparators.get(lastCharInMatch) !== 0 /* WordCharacterClass.Regular */) {
            // The last character in the match is a word separator
            return true;
        }
    }
    return false;
}
export function isValidMatch(wordSeparators, text, textLength, matchStartIndex, matchLength) {
    return (leftIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength) &&
        rightIsWordBounday(wordSeparators, text, textLength, matchStartIndex, matchLength));
}
export class Searcher {
    constructor(wordSeparators, searchRegex) {
        this._wordSeparators = wordSeparators;
        this._searchRegex = searchRegex;
        this._prevMatchStartIndex = -1;
        this._prevMatchLength = 0;
    }
    reset(lastIndex) {
        this._searchRegex.lastIndex = lastIndex;
        this._prevMatchStartIndex = -1;
        this._prevMatchLength = 0;
    }
    next(text) {
        const textLength = text.length;
        let m;
        do {
            if (this._prevMatchStartIndex + this._prevMatchLength === textLength) {
                // Reached the end of the line
                return null;
            }
            m = this._searchRegex.exec(text);
            if (!m) {
                return null;
            }
            const matchStartIndex = m.index;
            const matchLength = m[0].length;
            if (matchStartIndex === this._prevMatchStartIndex && matchLength === this._prevMatchLength) {
                if (matchLength === 0) {
                    // the search result is an empty string and won't advance `regex.lastIndex`, so `regex.exec` will stuck here
                    // we attempt to recover from that by advancing by two if surrogate pair found and by one otherwise
                    if (strings.getNextCodePoint(text, textLength, this._searchRegex.lastIndex) > 0xffff) {
                        this._searchRegex.lastIndex += 2;
                    }
                    else {
                        this._searchRegex.lastIndex += 1;
                    }
                    continue;
                }
                // Exit early if the regex matches the same range twice
                return null;
            }
            this._prevMatchStartIndex = matchStartIndex;
            this._prevMatchLength = matchLength;
            if (!this._wordSeparators ||
                isValidMatch(this._wordSeparators, text, textLength, matchStartIndex, matchLength)) {
                return m;
            }
        } while (m);
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQXVCLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHeEUsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUE7QUFFNUIsTUFBTSxPQUFPLFlBQVk7SUFNeEIsWUFDQyxZQUFvQixFQUNwQixPQUFnQixFQUNoQixTQUFrQixFQUNsQixjQUE2QjtRQUU3QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQTtJQUNyQyxDQUFDO0lBRU0sa0JBQWtCO1FBQ3hCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsSUFBSSxTQUFrQixDQUFBO1FBQ3RCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLFNBQVMsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdEQsQ0FB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