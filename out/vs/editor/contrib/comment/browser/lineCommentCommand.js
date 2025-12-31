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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29tbWVudC9icm93c2VyL2xpbmVDb21tZW50Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sdUNBQXVDLENBQUE7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFRN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUE0QjlELE1BQU0sQ0FBTixJQUFrQixJQUlqQjtBQUpELFdBQWtCLElBQUk7SUFDckIsbUNBQVUsQ0FBQTtJQUNWLHVDQUFZLENBQUE7SUFDWiw2Q0FBZSxDQUFBO0FBQ2hCLENBQUMsRUFKaUIsSUFBSSxLQUFKLElBQUksUUFJckI7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBVzlCLFlBQ2tCLDRCQUEyRCxFQUM1RSxTQUFvQixFQUNwQixVQUFrQixFQUNsQixJQUFVLEVBQ1YsV0FBb0IsRUFDcEIsZ0JBQXlCLEVBQ3pCLGVBQXlCO1FBTlIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQVE1RSxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENB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