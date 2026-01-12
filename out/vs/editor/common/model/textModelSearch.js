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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3RleHRNb2RlbFNlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBdUIsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUd4RSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQTtBQUU1QixNQUFNLE9BQU8sWUFBWTtJQU14QixZQUNDLFlBQW9CLEVBQ3BCLE9BQWdCLEVBQ2hCLFNBQWtCLEVBQ2xCLGNBQTZCO1FBRTdCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO0lBQ3JDLENBQUM7SUFFTSxrQkFBa0I7UUFDeEIsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELDJDQUEyQztRQUMzQyxJQUFJLFNBQWtCLENBQUE7UUFDdEIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsU0FBUyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN0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