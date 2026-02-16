/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { BlockCommentCommand } from './blockCommentCommand.js';
export var Type;
(function (Type) {
    Type[Type["Toggle"] = 0] = "Toggle";
    Type[Type["ForceAdd"] = 1] = "ForceAdd";
    Type[Type["ForceRemove"] = 2] = "ForceRemove";
})(Type || (Type = {}));
export class LineCommentCommand {
    constructor(languageConfigurationService, selection, indentSize, type, insertSpace, ignoreEmptyLines, ignoreFirstLine) {
        this.languageConfigurationService = languageConfigurationService;
        this._selection = selection;
        this._indentSize = indentSize;
        this._type = type;
        this._insertSpace = insertSpace;
        this._selectionId = null;
        this._deltaColumn = 0;
        this._moveEndPositionDown = false;
        this._ignoreEmptyLines = ignoreEmptyLines;
        this._ignoreFirstLine = ignoreFirstLine || false;
    }
    /**
     * Do an initial pass over the lines and gather info about the line comment string.
     * Returns null if any of the lines doesn't support a line comment string.
     */
    static _gatherPreflightCommentStrings(model, startLineNumber, endLineNumber, languageConfigurationService) {
        model.tokenization.tokenizeIfCheap(startLineNumber);
        const languageId = model.getLanguageIdAtPosition(startLineNumber, 1);
        const config = languageConfigurationService.getLanguageConfiguration(languageId).comments;
        const commentStr = config ? config.lineCommentToken : null;
        if (!commentStr) {
            // Mode does not support line comments
            return null;
        }
        const lines = [];
        for (let i = 0, lineCount = endLineNumber - startLineNumber + 1; i < lineCount; i++) {
            lines[i] = {
                ignore: false,
                commentStr: commentStr,
                commentStrOffset: 0,
                commentStrLength: commentStr.length,
            };
        }
        return lines;
    }
    /**
     * Analyze lines and decide which lines are relevant and what the toggle should do.
     * Also, build up several offsets and lengths useful in the generation of editor operations.
     */
    static _analyzeLines(type, insertSpace, model, lines, startLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService) {
        let onlyWhitespaceLines = true;
        let shouldRemoveComments;
        if (type === 0 /* Type.Toggle */) {
            shouldRemoveComments = true;
        }
        else if (type === 1 /* Type.ForceAdd */) {
            shouldRemoveComments = false;
        }
        else {
            shouldRemoveComments = true;
        }
        for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
            const lineData = lines[i];
            const lineNumber = startLineNumber + i;
            if (lineNumber === startLineNumber && ignoreFirstLine) {
                // first line ignored
                lineData.ignore = true;
                continue;
            }
            const lineContent = model.getLineContent(lineNumber);
            const lineContentStartOffset = strings.firstNonWhitespaceIndex(lineContent);
            if (lineContentStartOffset === -1) {
                // Empty or whitespace only line
                lineData.ignore = ignoreEmptyLines;
                lineData.commentStrOffset = lineContent.length;
                continue;
            }
            onlyWhitespaceLines = false;
            lineData.ignore = false;
            lineData.commentStrOffset = lineContentStartOffset;
            if (shouldRemoveComments &&
                !BlockCommentCommand._haystackHasNeedleAtOffset(lineContent, lineData.commentStr, lineContentStartOffset)) {
                if (type === 0 /* Type.Toggle */) {
                    // Every line so far has been a line comment, but this one is not
                    shouldRemoveComments = false;
                }
                else if (type === 1 /* Type.ForceAdd */) {
                    // Will not happen
                }
                else {
                    lineData.ignore = true;
                }
            }
            if (shouldRemoveComments && insertSpace) {
                // Remove a following space if present
                const commentStrEndOffset = lineContentStartOffset + lineData.commentStrLength;
                if (commentStrEndOffset < lineContent.length &&
                    lineContent.charCodeAt(commentStrEndOffset) === 32 /* CharCode.Space */) {
                    lineData.commentStrLength += 1;
                }
            }
        }
        if (type === 0 /* Type.Toggle */ && onlyWhitespaceLines) {
            // For only whitespace lines, we insert comments
            shouldRemoveComments = false;
            // Also, no longer ignore them
            for (let i = 0, lineCount = lines.length; i < lineCount; i++) {
                lines[i].ignore = false;
            }
        }
        return {
            supported: true,
            shouldRemoveComments: shouldRemoveComments,
            lines: lines,
        };
    }
    /**
     * Analyze all lines and decide exactly what to do => not supported | insert line comments | remove line comments
     */
    static _gatherPreflightData(type, insertSpace, model, startLineNumber, endLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService) {
        const lines = LineCommentCommand._gatherPreflightCommentStrings(model, startLineNumber, endLineNumber, languageConfigurationService);
        if (lines === null) {
            return {
                supported: false,
            };
        }
        return LineCommentCommand._analyzeLines(type, insertSpace, model, lines, startLineNumber, ignoreEmptyLines, ignoreFirstLine, languageConfigurationService);
    }
    /**
     * Given a successful analysis, execute either insert line comments, either remove line comments
     */
    _executeLineComments(model, builder, data, s) {
        let ops;
        if (data.shouldRemoveComments) {
            ops = LineCommentCommand._createRemoveLineCommentsOperations(data.lines, s.startLineNumber);
        }
        else {
            LineCommentCommand._normalizeInsertionPoint(model, data.lines, s.startLineNumber, this._indentSize);
            ops = this._createAddLineCommentsOperations(data.lines, s.startLineNumber);
        }
        const cursorPosition = new Position(s.positionLineNumber, s.positionColumn);
        for (let i = 0, len = ops.length; i < len; i++) {
            builder.addEditOperation(ops[i].range, ops[i].text);
            if (Range.isEmpty(ops[i].range) &&
                Range.getStartPosition(ops[i].range).equals(cursorPosition)) {
                const lineContent = model.getLineContent(cursorPosition.lineNumber);
                if (lineContent.length + 1 === cursorPosition.column) {
                    this._deltaColumn = (ops[i].text || '').length;
                }
            }
        }
        this._selectionId = builder.trackSelection(s);
    }
    _attemptRemoveBlockComment(model, s, startToken, endToken) {
        let startLineNumber = s.startLineNumber;
        let endLineNumber = s.endLineNumber;
        const startTokenAllowedBeforeColumn = endToken.length +
            Math.max(model.getLineFirstNonWhitespaceColumn(s.startLineNumber), s.startColumn);
        let startTokenIndex = model
            .getLineContent(startLineNumber)
            .lastIndexOf(startToken, startTokenAllowedBeforeColumn - 1);
        let endTokenIndex = model
            .getLineContent(endLineNumber)
            .indexOf(endToken, s.endColumn - 1 - startToken.length);
        if (startTokenIndex !== -1 && endTokenIndex === -1) {
            endTokenIndex = model
                .getLineContent(startLineNumber)
                .indexOf(endToken, startTokenIndex + startToken.length);
            endLineNumber = startLineNumber;
        }
        if (startTokenIndex === -1 && endTokenIndex !== -1) {
            startTokenIndex = model.getLineContent(endLineNumber).lastIndexOf(startToken, endTokenIndex);
            startLineNumber = endLineNumber;
        }
        if (s.isEmpty() && (startTokenIndex === -1 || endTokenIndex === -1)) {
            startTokenIndex = model.getLineContent(startLineNumber).indexOf(startToken);
            if (startTokenIndex !== -1) {
                endTokenIndex = model
                    .getLineContent(startLineNumber)
                    .indexOf(endToken, startTokenIndex + startToken.length);
            }
        }
        // We have to adjust to possible inner white space.
        // For Space after startToken, add Space to startToken - range math will work out.
        if (startTokenIndex !== -1 &&
            model.getLineContent(startLineNumber).charCodeAt(startTokenIndex + startToken.length) ===
                32 /* CharCode.Space */) {
            startToken += ' ';
        }
        // For Space before endToken, add Space before endToken and shift index one left.
        if (endTokenIndex !== -1 &&
            model.getLineContent(endLineNumber).charCodeAt(endTokenIndex - 1) === 32 /* CharCode.Space */) {
            endToken = ' ' + endToken;
            endTokenIndex -= 1;
        }
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            return BlockCommentCommand._createRemoveBlockCommentOperations(new Range(startLineNumber, startTokenIndex + startToken.length + 1, endLineNumber, endTokenIndex + 1), startToken, endToken);
        }
        return null;
    }
    /**
     * Given an unsuccessful analysis, delegate to the block comment command
     */
    _executeBlockComment(model, builder, s) {
        model.tokenization.tokenizeIfCheap(s.startLineNumber);
        const languageId = model.getLanguageIdAtPosition(s.startLineNumber, 1);
        const config = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        if (!config || !config.blockCommentStartToken || !config.blockCommentEndToken) {
            // Mode does not support block comments
            return;
        }
        const startToken = config.blockCommentStartToken;
        const endToken = config.blockCommentEndToken;
        let ops = this._attemptRemoveBlockComment(model, s, startToken, endToken);
        if (!ops) {
            if (s.isEmpty()) {
                const lineContent = model.getLineContent(s.startLineNumber);
                let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
                if (firstNonWhitespaceIndex === -1) {
                    // Line is empty or contains only whitespace
                    firstNonWhitespaceIndex = lineContent.length;
                }
                ops = BlockCommentCommand._createAddBlockCommentOperations(new Range(s.startLineNumber, firstNonWhitespaceIndex + 1, s.startLineNumber, lineContent.length + 1), startToken, endToken, this._insertSpace);
            }
            else {
                ops = BlockCommentCommand._createAddBlockCommentOperations(new Range(s.startLineNumber, model.getLineFirstNonWhitespaceColumn(s.startLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), startToken, endToken, this._insertSpace);
            }
            if (ops.length === 1) {
                // Leave cursor after token and Space
                this._deltaColumn = startToken.length + 1;
            }
        }
        this._selectionId = builder.trackSelection(s);
        for (const op of ops) {
            builder.addEditOperation(op.range, op.text);
        }
    }
    getEditOperations(model, builder) {
        let s = this._selection;
        this._moveEndPositionDown = false;
        if (s.startLineNumber === s.endLineNumber && this._ignoreFirstLine) {
            builder.addEditOperation(new Range(s.startLineNumber, model.getLineMaxColumn(s.startLineNumber), s.startLineNumber + 1, 1), s.startLineNumber === model.getLineCount() ? '' : '\n');
            this._selectionId = builder.trackSelection(s);
            return;
        }
        if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
            this._moveEndPositionDown = true;
            s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
        }
        const data = LineCommentCommand._gatherPreflightData(this._type, this._insertSpace, model, s.startLineNumber, s.endLineNumber, this._ignoreEmptyLines, this._ignoreFirstLine, this.languageConfigurationService);
        if (data.supported) {
            return this._executeLineComments(model, builder, data, s);
        }
        return this._executeBlockComment(model, builder, s);
    }
    computeCursorState(model, helper) {
        let result = helper.getTrackedSelection(this._selectionId);
        if (this._moveEndPositionDown) {
            result = result.setEndPosition(result.endLineNumber + 1, 1);
        }
        return new Selection(result.selectionStartLineNumber, result.selectionStartColumn + this._deltaColumn, result.positionLineNumber, result.positionColumn + this._deltaColumn);
    }
    /**
     * Generate edit operations in the remove line comment case
     */
    static _createRemoveLineCommentsOperations(lines, startLineNumber) {
        const res = [];
        for (let i = 0, len = lines.length; i < len; i++) {
            const lineData = lines[i];
            if (lineData.ignore) {
                continue;
            }
            res.push(EditOperation.delete(new Range(startLineNumber + i, lineData.commentStrOffset + 1, startLineNumber + i, lineData.commentStrOffset + lineData.commentStrLength + 1)));
        }
        return res;
    }
    /**
     * Generate edit operations in the add line comment case
     */
    _createAddLineCommentsOperations(lines, startLineNumber) {
        const res = [];
        const afterCommentStr = this._insertSpace ? ' ' : '';
        for (let i = 0, len = lines.length; i < len; i++) {
            const lineData = lines[i];
            if (lineData.ignore) {
                continue;
            }
            res.push(EditOperation.insert(new Position(startLineNumber + i, lineData.commentStrOffset + 1), lineData.commentStr + afterCommentStr));
        }
        return res;
    }
    static nextVisibleColumn(currentVisibleColumn, indentSize, isTab, columnSize) {
        if (isTab) {
            return currentVisibleColumn + (indentSize - (currentVisibleColumn % indentSize));
        }
        return currentVisibleColumn + columnSize;
    }
    /**
     * Adjust insertion points to have them vertically aligned in the add line comment case
     */
    static _normalizeInsertionPoint(model, lines, startLineNumber, indentSize) {
        let minVisibleColumn = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        let j;
        let lenJ;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].ignore) {
                continue;
            }
            const lineContent = model.getLineContent(startLineNumber + i);
            let currentVisibleColumn = 0;
            for (let j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
                currentVisibleColumn = LineCommentCommand.nextVisibleColumn(currentVisibleColumn, indentSize, lineContent.charCodeAt(j) === 9 /* CharCode.Tab */, 1);
            }
            if (currentVisibleColumn < minVisibleColumn) {
                minVisibleColumn = currentVisibleColumn;
            }
        }
        minVisibleColumn = Math.floor(minVisibleColumn / indentSize) * indentSize;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].ignore) {
                continue;
            }
            const lineContent = model.getLineContent(startLineNumber + i);
            let currentVisibleColumn = 0;
            for (j = 0, lenJ = lines[i].commentStrOffset; currentVisibleColumn < minVisibleColumn && j < lenJ; j++) {
                currentVisibleColumn = LineCommentCommand.nextVisibleColumn(currentVisibleColumn, indentSize, lineContent.charCodeAt(j) === 9 /* CharCode.Tab */, 1);
            }
            if (currentVisibleColumn > minVisibleColumn) {
                lines[i].commentStrOffset = j - 1;
            }
            else {
                lines[i].commentStrOffset = j;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb21tZW50L2Jyb3dzZXIvbGluZUNvbW1lbnRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQTRCOUQsTUFBTSxDQUFOLElBQWtCLElBSWpCO0FBSkQsV0FBa0IsSUFBSTtJQUNyQixtQ0FBVSxDQUFBO0lBQ1YsdUNBQVksQ0FBQTtJQUNaLDZDQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUppQixJQUFJLEtBQUosSUFBSSxRQUlyQjtBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFXOUIsWUFDa0IsNEJBQTJELEVBQzVFLFNBQW9CLEVBQ3BCLFVBQWtCLEVBQ2xCLElBQVUsRUFDVixXQUFvQixFQUNwQixnQkFBeUIsRUFDekIsZUFBeUI7UUFOUixpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBUTVFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxZQUFZLEdBQUcs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