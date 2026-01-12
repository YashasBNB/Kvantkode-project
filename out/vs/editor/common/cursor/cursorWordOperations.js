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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yV29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvcldvcmRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFLMUQsT0FBTyxFQUlOLGlCQUFpQixHQUNqQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzlELE9BQU8sRUFJTix1QkFBdUIsR0FDdkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBeUJ4QyxJQUFXLFFBSVY7QUFKRCxXQUFXLFFBQVE7SUFDbEIsdUNBQVEsQ0FBQTtJQUNSLDZDQUFXLENBQUE7SUFDWCxpREFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUpVLFFBQVEsS0FBUixRQUFRLFFBSWxCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQUtqQjtBQUxELFdBQWtCLGtCQUFrQjtJQUNuQyxxRUFBYSxDQUFBO0lBQ2IsNkVBQWlCLENBQUE7SUFDakIsaUVBQVcsQ0FBQTtJQUNYLHFGQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFMaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUtuQztBQWNELE1BQU0sT0FBTyxjQUFjO0lBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQ3pCLFdBQW1CLEVBQ25CLFFBQWtCLEVBQ2xCLGFBQWlDLEVBQ2pDLEtBQWEsRUFDYixHQUFXO1FBRVgsNEdBQTRHO1FBQzVHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDcEYsQ0FBQztJQUVPLE1BQU0sQ0FBQyxlQUFlLENBQzdCLFFBQTZCLEVBQzdCLGFBQWlDO1FBRWpDLDhJQUE4STtRQUM5SSxPQUFPO1lBQ04sS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLEdBQUcsRUFBRSxRQUFRLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUM3QyxRQUFRLDBCQUFrQjtZQUMxQixhQUFhLEVBQUUsYUFBYTtTQUM1QixDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDckMsY0FBdUMsRUFDdkMsS0FBeUIsRUFDekIsUUFBa0I7UUFFbEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0QsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU8sTUFBTSxDQUFDLHlCQUF5QixDQUN2QyxXQUFtQixFQUNuQixjQUF1QyxFQUN2QyxRQUFrQjtRQUVsQixJQUFJLFFBQVEsd0JBQWdCLENBQUE7UUFFNUIsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsZ0NBQWdDLENBQ3ZFLFdBQVcsRUFDWCxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDbkIsQ0FBQTtRQUVELEtBQUssSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2pFLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUMsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUUxQyxJQUFJLGdCQUFnQixJQUFJLE9BQU8sS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZELENBQUM7WUFFRCxJQUFJLE9BQU8sdUNBQStCLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxRQUFRLCtCQUF1QixFQUFFLENBQUM7b0JBQ3JDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsV0FBVyxFQUNYLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxHQUFHLENBQUMsRUFDWCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FDdkUsQ0FBQTtnQkFDRixDQUFDO2dCQUNELFFBQVEsMkJBQW1CLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxJQUFJLE9BQU8sNkNBQXFDLEVBQUUsQ0FBQztnQkFDekQsSUFBSSxRQUFRLDZCQUFxQixFQUFFLENBQUM7b0JBQ25DLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsV0FBVyxFQUNYLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxHQUFHLENBQUMsRUFDWCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FDdkUsQ0FBQTtnQkFDRixDQUFDO2dCQUNELFFBQVEsNkJBQXFCLENBQUE7WUFDOUIsQ0FBQztpQkFBTSxJQUFJLE9BQU8sMENBQWtDLEVBQUUsQ0FBQztnQkFDdEQsSUFBSSxRQUFRLDBCQUFrQixFQUFFLENBQUM7b0JBQ2hDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsV0FBVyxFQUNYLFFBQVEsRUFDUixPQUFPLEVBQ1AsT0FBTyxHQUFHLENBQUMsRUFDWCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FDdkUsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFFBQVEsMEJBQWtCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLFdBQVcsRUFDWCxRQUFRLHlDQUVSLENBQUMsRUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUM3RCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLE1BQU0sQ0FBQyxjQUFjLENBQzVCLFdBQW1CLEVBQ25CLGNBQXVDLEVBQ3ZDLFFBQWtCLEVBQ2xCLFVBQWtCO1FBRWxCLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFNUYsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtRQUM5QixLQUFLLElBQUksT0FBTyxHQUFHLFVBQVUsRUFBRSxPQUFPLEdBQUcsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDekQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTFDLElBQUksWUFBWSxJQUFJLE9BQU8sS0FBSyxZQUFZLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xGLE9BQU8sT0FBTyxDQUFBO1lBQ2YsQ0FBQztZQUVELElBQUksT0FBTywwQ0FBa0MsRUFBRSxDQUFDO2dCQUMvQyxPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7WUFDRCxJQUFJLFFBQVEsNkJBQXFCLElBQUksT0FBTyw2Q0FBcUMsRUFBRSxDQUFDO2dCQUNuRixPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7WUFDRCxJQUFJLFFBQVEsK0JBQXVCLElBQUksT0FBTyx1Q0FBK0IsRUFBRSxDQUFDO2dCQUMvRSxPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRU8sTUFBTSxDQUFDLG1CQUFtQixDQUNqQyxjQUF1QyxFQUN2QyxLQUF5QixFQUN6QixRQUFrQjtRQUVsQixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3RCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFTyxNQUFNLENBQUMscUJBQXFCLENBQ25DLFdBQW1CLEVBQ25CLGNBQXVDLEVBQ3ZDLFFBQWtCO1FBRWxCLElBQUksUUFBUSx3QkFBZ0IsQ0FBQTtRQUM1QixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1FBRTlCLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQywrQkFBK0IsQ0FDbEUsV0FBVyxFQUNYLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUNuQixDQUFBO1FBRUQsS0FBSyxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxPQUFPLEdBQUcsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDbEUsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM5QyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTFDLElBQUksWUFBWSxJQUFJLE9BQU8sS0FBSyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUVELElBQUksT0FBTyx1Q0FBK0IsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLFFBQVEsK0JBQXVCLEVBQUUsQ0FBQztvQkFDckMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUN0QixXQUFXLEVBQ1gsUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUN6RSxPQUFPLENBQ1AsQ0FBQTtnQkFDRixDQUFDO2dCQUNELFFBQVEsMkJBQW1CLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxJQUFJLE9BQU8sNkNBQXFDLEVBQUUsQ0FBQztnQkFDekQsSUFBSSxRQUFRLDZCQUFxQixFQUFFLENBQUM7b0JBQ25DLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsV0FBVyxFQUNYLFFBQVEsRUFDUixPQUFPLEVBQ1AsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFDekUsT0FBTyxDQUNQLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxRQUFRLDZCQUFxQixDQUFBO1lBQzlCLENBQUM7aUJBQU0sSUFBSSxPQUFPLDBDQUFrQyxFQUFFLENBQUM7Z0JBQ3RELElBQUksUUFBUSwwQkFBa0IsRUFBRSxDQUFDO29CQUNoQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQ3RCLFdBQVcsRUFDWCxRQUFRLEVBQ1IsT0FBTyxFQUNQLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQ3pFLE9BQU8sQ0FDUCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksUUFBUSwwQkFBa0IsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FDdEIsV0FBVyxFQUNYLFFBQVEseUNBRVIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFDckUsR0FBRyxDQUNILENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUM5QixXQUFtQixFQUNuQixjQUF1QyxFQUN2QyxRQUFrQixFQUNsQixVQUFrQjtRQUVsQixNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxnQ0FBZ0MsQ0FDdkUsV0FBVyxFQUNYLFVBQVUsQ0FDVixDQUFBO1FBRUQsS0FBSyxJQUFJLE9BQU8sR0FBRyxVQUFVLEVBQUUsT0FBTyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3hELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUMsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUUxQyxJQUFJLGdCQUFnQixJQUFJLE9BQU8sS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxPQUFPLENBQUE7WUFDZixDQUFDO1lBRUQsSUFBSSxPQUFPLDBDQUFrQyxFQUFFLENBQUM7Z0JBQy9DLE9BQU8sT0FBTyxHQUFHLENBQUMsQ0FBQTtZQUNuQixDQUFDO1lBQ0QsSUFBSSxRQUFRLDZCQUFxQixJQUFJLE9BQU8sNkNBQXFDLEVBQUUsQ0FBQztnQkFDbkYsT0FBTyxPQUFPLEdBQUcsQ0FBQyxDQUFBO1lBQ25CLENBQUM7WUFDRCxJQUFJLFFBQVEsK0JBQXVCLElBQUksT0FBTyx1Q0FBK0IsRUFBRSxDQUFDO2dCQUMvRSxPQUFPLE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUN6QixjQUF1QyxFQUN2QyxLQUF5QixFQUN6QixRQUFrQixFQUNsQixrQkFBc0MsRUFDdEMsY0FBdUI7UUFFdkIsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUNwQyxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBRTVCLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xCLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNwQixVQUFVLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQTtnQkFDM0IsTUFBTSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyx1QkFBdUIsQ0FDMUQsY0FBYyxFQUNkLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQ2hDLENBQUE7UUFFRCxJQUFJLGtCQUFrQix5Q0FBaUMsRUFBRSxDQUFDO1lBQ3pELE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9FLENBQUM7UUFFRCxJQUFJLGtCQUFrQiw2Q0FBcUMsRUFBRSxDQUFDO1lBQzdELElBQ0MsQ0FBQyxjQUFjLElBQUksa0ZBQWtGO2dCQUNyRyxjQUFjO2dCQUNkLGNBQWMsQ0FBQyxRQUFRLCtCQUF1QjtnQkFDOUMsY0FBYyxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUMsS0FBSyxLQUFLLENBQUM7Z0JBQy9DLGNBQWMsQ0FBQyxhQUFhLHVDQUErQixFQUMxRCxDQUFDO2dCQUNGLHVGQUF1RjtnQkFDdkYsY0FBYyxHQUFHLGNBQWMsQ0FBQyx1QkFBdUIsQ0FDdEQsY0FBYyxFQUNkLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FDbEQsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBRUQsSUFBSSxrQkFBa0IsaURBQXlDLEVBQUUsQ0FBQztZQUNqRSxPQUFPLGNBQWMsSUFBSSxjQUFjLENBQUMsUUFBUSwrQkFBdUIsRUFBRSxDQUFDO2dCQUN6RSw2Q0FBNkM7Z0JBQzdDLGNBQWMsR0FBRyxjQUFjLENBQUMsdUJBQXVCLENBQ3RELGNBQWMsRUFDZCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQ2xELENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUVELHlDQUF5QztRQUV6QyxJQUFJLGNBQWMsSUFBSSxNQUFNLElBQUksY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4RCxjQUFjLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUN0RCxjQUFjLEVBQ2QsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUNsRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFTSxNQUFNLENBQUMsaUJBQWlCLENBQUMsS0FBeUIsRUFBRSxRQUFrQjtRQUM1RSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQ3RDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVwRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxVQUFVLEdBQUcsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BELEtBQUssSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzdELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBRWhELElBQUksSUFBSSxnQ0FBdUIsSUFBSSxLQUFLLGdDQUF1QixFQUFFLENBQUM7Z0JBQ2pFLHVCQUF1QjtnQkFDdkIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUVELElBQUksSUFBSSwyQkFBa0IsSUFBSSxLQUFLLDJCQUFrQixFQUFFLENBQUM7Z0JBQ3ZELHVCQUF1QjtnQkFDdkIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUVELElBQ0MsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEUsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUNoQyxDQUFDO2dCQUNGLHFCQUFxQjtnQkFDckIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzRSxxQ0FBcUM7Z0JBQ3JDLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDakQsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUNoRixPQUFPLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtvQkFDeEMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRU0sTUFBTSxDQUFDLGFBQWEsQ0FDMUIsY0FBdUMsRUFDdkMsS0FBeUIsRUFDekIsUUFBa0IsRUFDbEIsa0JBQXNDO1FBRXRDLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDcEMsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUU1QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7UUFDckIsSUFBSSxNQUFNLEtBQUssS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDbkQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLFVBQVUsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQixNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ1gsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGNBQWMsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQ3RELGNBQWMsRUFDZCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUNoQyxDQUFBO1FBRUQsSUFBSSxrQkFBa0IsdUNBQStCLEVBQUUsQ0FBQztZQUN2RCxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsUUFBUSwrQkFBdUIsRUFBRSxDQUFDO2dCQUN0RSxJQUNDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDLEtBQUssS0FBSyxDQUFDO29CQUMvQyxjQUFjLENBQUMsYUFBYSx1Q0FBK0IsRUFDMUQsQ0FBQztvQkFDRix1RkFBdUY7b0JBQ3ZGLGNBQWMsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQ2xELGNBQWMsRUFDZCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQ2hELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLGtCQUFrQixpREFBeUMsRUFBRSxDQUFDO1lBQ3hFLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsNEZBQTRGO2dCQUM1Rix3R0FBd0c7Z0JBQ3hHLDJCQUEyQjtnQkFDM0IsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNYLENBQUM7WUFFRCxPQUNDLGNBQWM7Z0JBQ2QsQ0FBQyxjQUFjLENBQUMsUUFBUSwrQkFBdUIsSUFBSSxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsRUFDckYsQ0FBQztnQkFDRixtREFBbUQ7Z0JBQ25ELDBIQUEwSDtnQkFDMUgsY0FBYyxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FDbEQsY0FBYyxFQUNkLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDaEQsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxjQUFjLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxJQUFJLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hFLGNBQWMsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQ2xELGNBQWMsRUFDZCxLQUFLLEVBQ0wsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQ2hELENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxHQUFHLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUF5QixFQUFFLFFBQWtCO1FBQzdFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDdEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXBELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUN0RixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNwRCxLQUFLLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNyRSxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUVoRCxJQUFJLElBQUksZ0NBQXVCLElBQUksS0FBSyxnQ0FBdUIsRUFBRSxDQUFDO2dCQUNqRSx1QkFBdUI7Z0JBQ3ZCLE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFFRCxJQUFJLElBQUksMkJBQWtCLElBQUksS0FBSywyQkFBa0IsRUFBRSxDQUFDO2dCQUN2RCx1QkFBdUI7Z0JBQ3ZCLE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFFRCxJQUNDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFDaEMsQ0FBQztnQkFDRixxQkFBcUI7Z0JBQ3JCLE9BQU8sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0UscUNBQXFDO2dCQUNyQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUM7b0JBQzVCLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2pELElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQzt3QkFDaEYsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQ3hDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVTLE1BQU0sQ0FBQyx5QkFBeUIsQ0FDekMsS0FBeUIsRUFDekIsUUFBa0I7UUFFbEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0QsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2pGLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxLQUFLLENBQ2YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsaUJBQWlCLEdBQUcsQ0FBQyxFQUNyQixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxDQUNmLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sTUFBTSxDQUFDLGNBQWMsQ0FDM0IsR0FBc0IsRUFDdEIsa0JBQXNDO1FBRXRDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUE7UUFDekMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQTtRQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFBO1FBQy9CLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLG9CQUFvQixDQUFBO1FBRXJELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFDQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FDdkMsR0FBRyxDQUFDLGlCQUFpQixFQUNyQixHQUFHLENBQUMsbUJBQW1CLEVBQ3ZCLEdBQUcsQ0FBQyxpQkFBaUIsRUFDckIsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixFQUM5QyxHQUFHLENBQUMsS0FBSyxFQUNULENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUNmLEdBQUcsQ0FBQyxvQkFBb0IsQ0FDeEIsRUFDQSxDQUFDO1lBQ0YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM1QyxPQUFPLElBQUksS0FBSyxDQUNmLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUNuQixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDbkIsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRXJGLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDcEMsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUU1QixJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RDLHVDQUF1QztZQUN2QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN6RCxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxDQUFBO1lBQ1QsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGNBQWMsR0FBRyxjQUFjLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUU1RixJQUFJLGtCQUFrQix5Q0FBaUMsRUFBRSxDQUFDO1lBQ3pELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sR0FBRyxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sR0FBRyxDQUFDLENBQUE7Z0JBQ1gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFVBQVUsRUFBRSxDQUFBO29CQUNaLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzVDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLGNBQWMsSUFBSSxNQUFNLElBQUksY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsY0FBYyxHQUFHLGNBQWMsQ0FBQyx1QkFBdUIsQ0FDdEQsY0FBYyxFQUNkLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FDbEQsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNoQixNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNYLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLEVBQUUsQ0FBQTtvQkFDWixNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDN0IsY0FBdUMsRUFDdkMsS0FBaUIsRUFDakIsU0FBb0I7UUFFcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzFCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLHFDQUFxQyxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUM1RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLE9BQU8sUUFBUSw0QkFBbUIsSUFBSSxRQUFRLHlCQUFpQixDQUFBO0lBQ2hFLENBQUM7SUFFTyxNQUFNLENBQUMsMkJBQTJCLENBQ3pDLEtBQXlCLEVBQ3pCLFFBQWtCO1FBRWxCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdELE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtRQUU1QyxJQUFJLGlCQUFpQixLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLGFBQWE7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDdkQsaURBQWlEO1lBQ2pELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN4RCxrREFBa0Q7WUFDbEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLE9BQU8sU0FBUyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlFLFNBQVMsRUFBRSxDQUFBO1FBQ1osQ0FBQztRQUVELG9DQUFvQztRQUNwQyxPQUNDLFVBQVUsR0FBRyxDQUFDLEdBQUcsaUJBQWlCO1lBQ2xDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUNwRCxDQUFDO1lBQ0YsVUFBVSxFQUFFLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUYsQ0FBQztJQUVPLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FDbkQsY0FBdUMsRUFDdkMsS0FBeUIsRUFDekIsUUFBa0I7UUFFbEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0QsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtRQUNyQyxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixhQUFhO1lBQ2IsSUFBSSxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM3QixPQUFPLElBQUksS0FBSyxDQUNmLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUN2QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFDL0MsUUFBUSxDQUFDLFVBQVUsRUFDbkIsQ0FBQyxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxRQUFRLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO29CQUNoRCxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsY0FBYztvQkFDZCxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFO1lBQzdDLE9BQU8sSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLENBQUMsQ0FBQTtRQUNELE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxXQUFtQixFQUFFLFNBQWlCLEVBQUUsRUFBRTtZQUMxRSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3BELFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEQsT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25GLENBQUMsQ0FBQTtRQUNELE1BQU0sK0JBQStCLEdBQUcsQ0FBQyxJQUFxQixFQUFFLEVBQUU7WUFDakUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDaEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDNUIsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDOUIsT0FBTyxTQUFTLEdBQUcsQ0FBQyxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzRixrQkFBa0IsR0FBRyxJQUFJLENBQUE7Z0JBQ3pCLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztZQUNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QixPQUFPLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbEYsV0FBVyxFQUFFLENBQUE7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2RCxDQUFDLENBQUE7UUFFRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5RixJQUFJLGNBQWMsSUFBSSxXQUFXLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxPQUFPLCtCQUErQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFDRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRixJQUFJLGNBQWMsSUFBSSxXQUFXLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxPQUFPLCtCQUErQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFDRCxJQUFJLGNBQWMsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUN0QyxPQUFPLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakYsQ0FBQztRQUNELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsT0FBTyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sdUJBQXVCLENBQUMsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBRUQsT0FBTyx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTSxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBeUIsRUFBRSxTQUFvQjtRQUNoRixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDMUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9ELE9BQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFTyxNQUFNLENBQUMsMkJBQTJCLENBQUMsR0FBVyxFQUFFLFVBQWtCO1FBQ3pFLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFDdEIsS0FBSyxJQUFJLE9BQU8sR0FBRyxVQUFVLEVBQUUsT0FBTyxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDOUIsSUFBSSxFQUFFLEtBQUssR0FBRyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxPQUFPLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVTLE1BQU0sQ0FBQywwQkFBMEIsQ0FDMUMsS0FBeUIsRUFDekIsUUFBa0I7UUFFbEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0QsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDdEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3BGLElBQUksVUFBVSxHQUFHLENBQUMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3pDLFFBQVE7WUFDUixPQUFPLElBQUksS0FBSyxDQUNmLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsa0JBQWtCLEdBQUcsQ0FBQyxDQUN0QixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLE1BQU0sQ0FBQyxlQUFlLENBQzVCLEdBQXNCLEVBQ3RCLGtCQUFzQztRQUV0QyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFBO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUE7UUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQTtRQUMvQixNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQTtRQUVyRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDMUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFckYsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUNwQyxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBRTVCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEQsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0RCxpQ0FBaUM7WUFDakMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDMUQsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDUCxPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFeEYsSUFBSSxrQkFBa0IsdUNBQStCLEVBQUUsQ0FBQztZQUN2RCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksTUFBTSxHQUFHLFNBQVMsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3BELE1BQU0sR0FBRyxTQUFTLENBQUE7Z0JBQ25CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLEVBQUUsQ0FBQTtvQkFDWixjQUFjLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixDQUNsRCxjQUFjLEVBQ2QsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FDM0IsQ0FBQTtvQkFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO3dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7b0JBQ2xDLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUM1QyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLGNBQWMsSUFBSSxNQUFNLElBQUksY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUQsY0FBYyxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FDbEQsY0FBYyxFQUNkLEtBQUssRUFDTCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FDaEQsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksTUFBTSxHQUFHLFNBQVMsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3BELE1BQU0sR0FBRyxTQUFTLENBQUE7Z0JBQ25CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLEVBQUUsQ0FBQTtvQkFDWixjQUFjLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixDQUNsRCxjQUFjLEVBQ2QsS0FBSyxFQUNMLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FDM0IsQ0FBQTtvQkFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO3dCQUNwQixNQUFNLEdBQUcsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7b0JBQ2xDLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUM1QyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRU0sTUFBTSxDQUFDLG9CQUFvQixDQUFDLEtBQXlCLEVBQUUsU0FBb0I7UUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzFCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbkMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRSxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxLQUFpQixFQUNqQixVQUFrQixFQUNsQixJQUFxQjtRQUVyQixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0UsT0FBTztZQUNOLElBQUksRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztZQUNsQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1NBQzFCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGlCQUFpQixDQUM5QixLQUFpQixFQUNqQixlQUF1QixFQUN2QixxQkFBK0IsRUFDL0IsUUFBa0I7UUFFbEIsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDdEYsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDeEYsSUFDQyxRQUFRO1lBQ1IsUUFBUSxDQUFDLFFBQVEsNkJBQXFCO1lBQ3RDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQ2xDLENBQUM7WUFDRixPQUFPLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDcEYsSUFDQyxRQUFRO1lBQ1IsUUFBUSxDQUFDLFFBQVEsNkJBQXFCO1lBQ3RDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQ2xDLENBQUM7WUFDRixPQUFPLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FDakIsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsTUFBeUIsRUFDekIsZUFBd0IsRUFDeEIsUUFBa0I7UUFFbEIsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQzdDLE1BQU0sQ0FBQyxjQUFjLEVBQ3JCLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDM0IsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXBGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0Qiw2Q0FBNkM7WUFDN0MsSUFBSSxXQUFtQixDQUFBO1lBQ3ZCLElBQUksU0FBaUIsQ0FBQTtZQUVyQixJQUNDLFFBQVE7Z0JBQ1IsUUFBUSxDQUFDLFFBQVEsNkJBQXFCO2dCQUN0QyxRQUFRLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDckMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsRUFDbEMsQ0FBQztnQkFDRixxQkFBcUI7Z0JBQ3JCLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtnQkFDaEMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLENBQUM7aUJBQU0sSUFDTixRQUFRO2dCQUNSLFFBQVEsQ0FBQyxRQUFRLDZCQUFxQjtnQkFDdEMsUUFBUSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ3JDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQ2xDLENBQUM7Z0JBQ0YscUJBQXFCO2dCQUNyQixXQUFXLEdBQUcsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7Z0JBQ2hDLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUM3QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7Z0JBQy9CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxXQUFXLEdBQUcsQ0FBQyxDQUFBO2dCQUNoQixDQUFDO2dCQUNELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsU0FBUyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUMvQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsU0FBUyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3hELENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxJQUFJLGlCQUFpQixDQUMzQixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxtQ0FFM0UsQ0FBQyxFQUNELElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQzVDLENBQUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksV0FBbUIsQ0FBQTtRQUN2QixJQUFJLFNBQWlCLENBQUE7UUFFckIsSUFDQyxRQUFRO1lBQ1IsUUFBUSxDQUFDLFFBQVEsNkJBQXFCO1lBQ3RDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQ2pDLENBQUM7WUFDRixtQkFBbUI7WUFDbkIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2hDLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDO2FBQU0sSUFDTixRQUFRO1lBQ1IsUUFBUSxDQUFDLFFBQVEsNkJBQXFCO1lBQ3RDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQ2pDLENBQUM7WUFDRixtQkFBbUI7WUFDbkIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2hDLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1lBQzdCLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQ3RDLElBQUksTUFBYyxDQUFBO1FBQ2xCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQTtRQUN6QyxDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDL0UsTUFBTSxHQUFHLFdBQVcsQ0FBQTtZQUNwQixNQUFNLGdCQUFnQixHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6RCxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLFNBQVMsQ0FBQTtZQUNsQixNQUFNLGdCQUFnQixHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6RCxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGNBQWM7SUFDOUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQXNCO1FBQ3RELE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQztZQUNqQyxjQUFjLENBQUMsY0FBYyxDQUFDLEdBQUcsdUNBQStCO1lBQ2hFLGNBQWMsQ0FBQyxjQUFjLENBQUMsR0FBRyxxQ0FBNkI7WUFDOUQsY0FBYyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQztTQUM1RCxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzdDLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JCLENBQUM7SUFFTSxNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBc0I7UUFDdkQsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO1lBQ2pDLGNBQWMsQ0FBQyxlQUFlLENBQUMsR0FBRyx1Q0FBK0I7WUFDakUsY0FBYyxDQUFDLGVBQWUsQ0FBQyxHQUFHLHFDQUE2QjtZQUMvRCxjQUFjLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDO1NBQzdELENBQUMsQ0FBQTtRQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDL0MsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDN0IsY0FBdUMsRUFDdkMsS0FBeUIsRUFDekIsUUFBa0IsRUFDbEIsY0FBdUI7UUFFdkIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO1lBQ2pDLGNBQWMsQ0FBQyxZQUFZLENBQzFCLGNBQWMsRUFDZCxLQUFLLEVBQ0wsUUFBUSx3Q0FFUixjQUFjLENBQ2Q7WUFDRCxjQUFjLENBQUMsWUFBWSxDQUMxQixjQUFjLEVBQ2QsS0FBSyxFQUNMLFFBQVEsc0NBRVIsY0FBYyxDQUNkO1lBQ0QsY0FBYyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7U0FDakQsQ0FBQyxDQUFBO1FBQ0YsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDOUIsY0FBdUMsRUFDdkMsS0FBeUIsRUFDekIsUUFBa0I7UUFFbEIsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO1lBQ2pDLGNBQWMsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxRQUFRLHVDQUErQjtZQUMzRixjQUFjLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsUUFBUSxxQ0FBNkI7WUFDekYsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7U0FDbEQsQ0FBQyxDQUFBO1FBQ0YsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakMsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckIsQ0FBQztDQUNEO0FBRUQsU0FBUyxjQUFjLENBQUksR0FBZ0M7SUFDMUQsT0FBWSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUM1QyxDQUFDIn0=