/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { SingleCursorState, } from '../cursorCommon.js';
import { DeleteOperations } from './cursorDeleteOperations.js';
import { getMapForWordSeparators, } from '../core/wordCharacterClassifier.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
var WordType;
(function (WordType) {
    WordType[WordType["None"] = 0] = "None";
    WordType[WordType["Regular"] = 1] = "Regular";
    WordType[WordType["Separator"] = 2] = "Separator";
})(WordType || (WordType = {}));
export var WordNavigationType;
(function (WordNavigationType) {
    WordNavigationType[WordNavigationType["WordStart"] = 0] = "WordStart";
    WordNavigationType[WordNavigationType["WordStartFast"] = 1] = "WordStartFast";
    WordNavigationType[WordNavigationType["WordEnd"] = 2] = "WordEnd";
    WordNavigationType[WordNavigationType["WordAccessibility"] = 3] = "WordAccessibility";
})(WordNavigationType || (WordNavigationType = {}));
export class WordOperations {
    static _createWord(lineContent, wordType, nextCharClass, start, end) {
        // console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.substring(start, end) + '>>>');
        return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
    }
    static _createIntlWord(intlWord, nextCharClass) {
        // console.log('INTL WORD ==> ' + intlWord.index + ' => ' + intlWord.index + intlWord.segment.length + ':::: <<<' + intlWord.segment + '>>>');
        return {
            start: intlWord.index,
            end: intlWord.index + intlWord.segment.length,
            wordType: 1 /* WordType.Regular */,
            nextCharClass: nextCharClass,
        };
    }
    static _findPreviousWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindPreviousWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindPreviousWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, position.column - 2);
        for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return this._createIntlWord(previousIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, 0, this._findEndOfWord(lineContent, wordSeparators, wordType, 0));
        }
        return null;
    }
    static _findEndOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, startIndex);
        const len = lineContent.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index + nextIntlWord.segment.length) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex;
            }
        }
        return len;
    }
    static _findNextWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindNextWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindNextWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const len = lineContent.length;
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, position.column - 1);
        for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index) {
                return this._createIntlWord(nextIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, this._findStartOfWord(lineContent, wordSeparators, wordType, len - 1), len);
        }
        return null;
    }
    static _findStartOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, startIndex);
        for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex + 1;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex + 1;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex + 1;
            }
        }
        return 0;
    }
    static moveWordLeft(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (column === 1) {
            if (lineNumber > 1) {
                lineNumber = lineNumber - 1;
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 1 /* WordNavigationType.WordStartFast */) {
            if (!hasMulticursor && // avoid having multiple cursors stop at different locations when doing word start
                prevWordOnLine &&
                prevWordOnLine.wordType === 2 /* WordType.Separator */ &&
                prevWordOnLine.end - prevWordOnLine.start === 1 &&
                prevWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                // Skip over a word made up of one single separator and followed by a regular character
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            while (prevWordOnLine && prevWordOnLine.wordType === 2 /* WordType.Separator */) {
                // Skip over words made up of only separators
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        // We are stopping at the ending of words
        if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
            prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
        }
        return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
    }
    static _moveWordPartLeft(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === 1) {
            return lineNumber > 1
                ? new Position(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1))
                : position;
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column - 1; column > 1; column--) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left === 95 /* CharCode.Underline */ && right !== 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left === 45 /* CharCode.Dash */ && right !== 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) &&
                strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, 1);
    }
    static moveWordRight(wordSeparators, model, position, wordNavigationType) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        let movedDown = false;
        if (column === model.getLineMaxColumn(lineNumber)) {
            if (lineNumber < model.getLineCount()) {
                movedDown = true;
                lineNumber = lineNumber + 1;
                column = 1;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine && nextWordOnLine.wordType === 2 /* WordType.Separator */) {
                if (nextWordOnLine.end - nextWordOnLine.start === 1 &&
                    nextWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                    // Skip over a word made up of one single separator and followed by a regular character
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
                }
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            if (movedDown) {
                // If we move to the next line, pretend that the cursor is right before the first character.
                // This is needed when the first word starts right at the first character - and in order not to miss it,
                // we need to start before.
                column = 0;
            }
            while (nextWordOnLine &&
                (nextWordOnLine.wordType === 2 /* WordType.Separator */ || nextWordOnLine.start + 1 <= column)) {
                // Skip over a word made up of one single separator
                // Also skip over word if it begins before current cursor position to ascertain we're moving forward at least 1 character.
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else {
            if (nextWordOnLine && !movedDown && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        return new Position(lineNumber, column);
    }
    static _moveWordPartRight(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === maxColumn) {
            return lineNumber < model.getLineCount() ? new Position(lineNumber + 1, 1) : position;
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column + 1; column < maxColumn; column++) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left !== 95 /* CharCode.Underline */ && right === 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left !== 45 /* CharCode.Dash */ && right === 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) &&
                strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, maxColumn);
    }
    static _deleteWordLeftWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 2;
        const lastNonWhitespace = strings.lastNonWhitespaceIndex(lineContent, startIndex);
        if (lastNonWhitespace + 1 < startIndex) {
            return new Range(position.lineNumber, lastNonWhitespace + 2, position.lineNumber, position.column);
        }
        return null;
    }
    static deleteWordLeft(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        if (DeleteOperations.isAutoClosingPairDelete(ctx.autoClosingDelete, ctx.autoClosingBrackets, ctx.autoClosingQuotes, ctx.autoClosingPairs.autoClosingPairsOpenByEnd, ctx.model, [ctx.selection], ctx.autoClosedCharacters)) {
            const position = ctx.selection.getPosition();
            return new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (lineNumber === 1 && column === 1) {
            // Ignore deleting at beginning of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordLeftWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            if (prevWordOnLine) {
                column = prevWordOnLine.start + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        else {
            if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            if (prevWordOnLine) {
                column = prevWordOnLine.end + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static deleteInsideWord(wordSeparators, model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        const r = this._deleteInsideWordWhitespace(model, position);
        if (r) {
            return r;
        }
        return this._deleteInsideWordDetermineDeleteRange(wordSeparators, model, position);
    }
    static _charAtIsWhitespace(str, index) {
        const charCode = str.charCodeAt(index);
        return charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */;
    }
    static _deleteInsideWordWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineContentLength = lineContent.length;
        if (lineContentLength === 0) {
            // empty line
            return null;
        }
        let leftIndex = Math.max(position.column - 2, 0);
        if (!this._charAtIsWhitespace(lineContent, leftIndex)) {
            // touches a non-whitespace character to the left
            return null;
        }
        let rightIndex = Math.min(position.column - 1, lineContentLength - 1);
        if (!this._charAtIsWhitespace(lineContent, rightIndex)) {
            // touches a non-whitespace character to the right
            return null;
        }
        // walk over whitespace to the left
        while (leftIndex > 0 && this._charAtIsWhitespace(lineContent, leftIndex - 1)) {
            leftIndex--;
        }
        // walk over whitespace to the right
        while (rightIndex + 1 < lineContentLength &&
            this._charAtIsWhitespace(lineContent, rightIndex + 1)) {
            rightIndex++;
        }
        return new Range(position.lineNumber, leftIndex + 1, position.lineNumber, rightIndex + 2);
    }
    static _deleteInsideWordDetermineDeleteRange(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineLength = lineContent.length;
        if (lineLength === 0) {
            // empty line
            if (position.lineNumber > 1) {
                return new Range(position.lineNumber - 1, model.getLineMaxColumn(position.lineNumber - 1), position.lineNumber, 1);
            }
            else {
                if (position.lineNumber < model.getLineCount()) {
                    return new Range(position.lineNumber, 1, position.lineNumber + 1, 1);
                }
                else {
                    // empty model
                    return new Range(position.lineNumber, 1, position.lineNumber, 1);
                }
            }
        }
        const touchesWord = (word) => {
            return word.start + 1 <= position.column && position.column <= word.end + 1;
        };
        const createRangeWithPosition = (startColumn, endColumn) => {
            startColumn = Math.min(startColumn, position.column);
            endColumn = Math.max(endColumn, position.column);
            return new Range(position.lineNumber, startColumn, position.lineNumber, endColumn);
        };
        const deleteWordAndAdjacentWhitespace = (word) => {
            let startColumn = word.start + 1;
            let endColumn = word.end + 1;
            let expandedToTheRight = false;
            while (endColumn - 1 < lineLength && this._charAtIsWhitespace(lineContent, endColumn - 1)) {
                expandedToTheRight = true;
                endColumn++;
            }
            if (!expandedToTheRight) {
                while (startColumn > 1 && this._charAtIsWhitespace(lineContent, startColumn - 2)) {
                    startColumn--;
                }
            }
            return createRangeWithPosition(startColumn, endColumn);
        };
        const prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWordOnLine && touchesWord(prevWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(prevWordOnLine);
        }
        const nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWordOnLine && touchesWord(nextWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(nextWordOnLine);
        }
        if (prevWordOnLine && nextWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.end + 1, nextWordOnLine.start + 1);
        }
        if (prevWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.start + 1, prevWordOnLine.end + 1);
        }
        if (nextWordOnLine) {
            return createRangeWithPosition(nextWordOnLine.start + 1, nextWordOnLine.end + 1);
        }
        return createRangeWithPosition(1, lineLength + 1);
    }
    static _deleteWordPartLeft(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartLeft(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _findFirstNonWhitespaceChar(str, startIndex) {
        const len = str.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const ch = str.charAt(chIndex);
            if (ch !== ' ' && ch !== '\t') {
                return chIndex;
            }
        }
        return len;
    }
    static _deleteWordRightWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 1;
        const firstNonWhitespace = this._findFirstNonWhitespaceChar(lineContent, startIndex);
        if (startIndex + 1 < firstNonWhitespace) {
            // bingo
            return new Range(position.lineNumber, position.column, position.lineNumber, firstNonWhitespace + 1);
        }
        return null;
    }
    static deleteWordRight(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        const lineCount = model.getLineCount();
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (lineNumber === lineCount && column === maxColumn) {
            // Ignore deleting at end of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordRightWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        else {
            if (nextWordOnLine && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static _deleteWordPartRight(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartRight(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _createWordAtPosition(model, lineNumber, word) {
        const range = new Range(lineNumber, word.start + 1, lineNumber, word.end + 1);
        return {
            word: model.getValueInRange(range),
            startColumn: range.startColumn,
            endColumn: range.endColumn,
        };
    }
    static getWordAtPosition(model, _wordSeparators, _intlSegmenterLocales, position) {
        const wordSeparators = getMapForWordSeparators(_wordSeparators, _intlSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWord &&
            prevWord.wordType === 1 /* WordType.Regular */ &&
            prevWord.start <= position.column - 1 &&
            position.column - 1 <= prevWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, prevWord);
        }
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWord &&
            nextWord.wordType === 1 /* WordType.Regular */ &&
            nextWord.start <= position.column - 1 &&
            position.column - 1 <= nextWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, nextWord);
        }
        return null;
    }
    static word(config, model, cursor, inSelectionMode, position) {
        const wordSeparators = getMapForWordSeparators(config.wordSeparators, config.wordSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (!inSelectionMode) {
            // Entering word selection for the first time
            let startColumn;
            let endColumn;
            if (prevWord &&
                prevWord.wordType === 1 /* WordType.Regular */ &&
                prevWord.start <= position.column - 1 &&
                position.column - 1 <= prevWord.end) {
                // isTouchingPrevWord
                startColumn = prevWord.start + 1;
                endColumn = prevWord.end + 1;
            }
            else if (nextWord &&
                nextWord.wordType === 1 /* WordType.Regular */ &&
                nextWord.start <= position.column - 1 &&
                position.column - 1 <= nextWord.end) {
                // isTouchingNextWord
                startColumn = nextWord.start + 1;
                endColumn = nextWord.end + 1;
            }
            else {
                if (prevWord) {
                    startColumn = prevWord.end + 1;
                }
                else {
                    startColumn = 1;
                }
                if (nextWord) {
                    endColumn = nextWord.start + 1;
                }
                else {
                    endColumn = model.getLineMaxColumn(position.lineNumber);
                }
            }
            return new SingleCursorState(new Range(position.lineNumber, startColumn, position.lineNumber, endColumn), 1 /* SelectionStartKind.Word */, 0, new Position(position.lineNumber, endColumn), 0);
        }
        let startColumn;
        let endColumn;
        if (prevWord &&
            prevWord.wordType === 1 /* WordType.Regular */ &&
            prevWord.start < position.column - 1 &&
            position.column - 1 < prevWord.end) {
            // isInsidePrevWord
            startColumn = prevWord.start + 1;
            endColumn = prevWord.end + 1;
        }
        else if (nextWord &&
            nextWord.wordType === 1 /* WordType.Regular */ &&
            nextWord.start < position.column - 1 &&
            position.column - 1 < nextWord.end) {
            // isInsideNextWord
            startColumn = nextWord.start + 1;
            endColumn = nextWord.end + 1;
        }
        else {
            startColumn = position.column;
            endColumn = position.column;
        }
        const lineNumber = position.lineNumber;
        let column;
        if (cursor.selectionStart.containsPosition(position)) {
            column = cursor.selectionStart.endColumn;
        }
        else if (position.isBeforeOrEqual(cursor.selectionStart.getStartPosition())) {
            column = startColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.endColumn;
            }
        }
        else {
            column = endColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.startColumn;
            }
        }
        return cursor.move(true, lineNumber, column, 0);
    }
}
export class WordPartOperations extends WordOperations {
    static deleteWordPartLeft(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordLeft(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordLeft(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartLeft(ctx.model, ctx.selection),
        ]);
        candidates.sort(Range.compareRangesUsingEnds);
        return candidates[2];
    }
    static deleteWordPartRight(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordRight(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordRight(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartRight(ctx.model, ctx.selection),
        ]);
        candidates.sort(Range.compareRangesUsingStarts);
        return candidates[0];
    }
    static moveWordPartLeft(wordSeparators, model, position, hasMulticursor) {
        const candidates = enforceDefined([
            WordOperations.moveWordLeft(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */, hasMulticursor),
            WordOperations.moveWordLeft(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */, hasMulticursor),
            WordOperations._moveWordPartLeft(model, position),
        ]);
        candidates.sort(Position.compare);
        return candidates[2];
    }
    static moveWordPartRight(wordSeparators, model, position) {
        const candidates = enforceDefined([
            WordOperations.moveWordRight(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */),
            WordOperations.moveWordRight(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */),
            WordOperations._moveWordPartRight(model, position),
        ]);
        candidates.sort(Position.compare);
        return candidates[0];
    }
}
function enforceDefined(arr) {
    return arr.filter((el) => Boolean(el));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yV29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JXb3JkT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBSzFELE9BQU8sRUFJTixpQkFBaUIsR0FDakIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM5RCxPQUFPLEVBSU4sdUJBQXVCLEdBQ3ZCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQXlCeEMsSUFBVyxRQUlWO0FBSkQsV0FBVyxRQUFRO0lBQ2xCLHVDQUFRLENBQUE7SUFDUiw2Q0FBVyxDQUFBO0lBQ1gsaURBQWEsQ0FBQTtBQUNkLENBQUMsRUFKVSxRQUFRLEtBQVIsUUFBUSxRQUlsQjtBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFLakI7QUFMRCxXQUFrQixrQkFBa0I7SUFDbkMscUVBQWEsQ0FBQTtJQUNiLDZFQUFpQixDQUFBO0lBQ2pCLGlFQUFXLENBQUE7SUFDWCxxRkFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBTGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFLbkM7QUFjRCxNQUFNLE9BQU8sY0FBYztJQUNsQixNQUFNLENBQUMsV0FBVyxDQUN6QixXQUFtQixFQUNuQixRQUFrQixFQUNsQixhQUFpQyxFQUNqQyxLQUFhLEVBQ2IsR0FBVztRQUVYLDRHQUE0RztRQUM1RyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FB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