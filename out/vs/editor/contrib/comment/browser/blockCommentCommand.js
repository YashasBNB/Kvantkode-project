/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class BlockCommentCommand {
    constructor(selection, insertSpace, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._selection = selection;
        this._insertSpace = insertSpace;
        this._usedEndToken = null;
    }
    static _haystackHasNeedleAtOffset(haystack, needle, offset) {
        if (offset < 0) {
            return false;
        }
        const needleLength = needle.length;
        const haystackLength = haystack.length;
        if (offset + needleLength > haystackLength) {
            return false;
        }
        for (let i = 0; i < needleLength; i++) {
            const codeA = haystack.charCodeAt(offset + i);
            const codeB = needle.charCodeAt(i);
            if (codeA === codeB) {
                continue;
            }
            if (codeA >= 65 /* CharCode.A */ && codeA <= 90 /* CharCode.Z */ && codeA + 32 === codeB) {
                // codeA is upper-case variant of codeB
                continue;
            }
            if (codeB >= 65 /* CharCode.A */ && codeB <= 90 /* CharCode.Z */ && codeB + 32 === codeA) {
                // codeB is upper-case variant of codeA
                continue;
            }
            return false;
        }
        return true;
    }
    _createOperationsForBlockComment(selection, startToken, endToken, insertSpace, model, builder) {
        const startLineNumber = selection.startLineNumber;
        const startColumn = selection.startColumn;
        const endLineNumber = selection.endLineNumber;
        const endColumn = selection.endColumn;
        const startLineText = model.getLineContent(startLineNumber);
        const endLineText = model.getLineContent(endLineNumber);
        let startTokenIndex = startLineText.lastIndexOf(startToken, startColumn - 1 + startToken.length);
        let endTokenIndex = endLineText.indexOf(endToken, endColumn - 1 - endToken.length);
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            if (startLineNumber === endLineNumber) {
                const lineBetweenTokens = startLineText.substring(startTokenIndex + startToken.length, endTokenIndex);
                if (lineBetweenTokens.indexOf(endToken) >= 0) {
                    // force to add a block comment
                    startTokenIndex = -1;
                    endTokenIndex = -1;
                }
            }
            else {
                const startLineAfterStartToken = startLineText.substring(startTokenIndex + startToken.length);
                const endLineBeforeEndToken = endLineText.substring(0, endTokenIndex);
                if (startLineAfterStartToken.indexOf(endToken) >= 0 ||
                    endLineBeforeEndToken.indexOf(endToken) >= 0) {
                    // force to add a block comment
                    startTokenIndex = -1;
                    endTokenIndex = -1;
                }
            }
        }
        let ops;
        if (startTokenIndex !== -1 && endTokenIndex !== -1) {
            // Consider spaces as part of the comment tokens
            if (insertSpace &&
                startTokenIndex + startToken.length < startLineText.length &&
                startLineText.charCodeAt(startTokenIndex + startToken.length) === 32 /* CharCode.Space */) {
                // Pretend the start token contains a trailing space
                startToken = startToken + ' ';
            }
            if (insertSpace &&
                endTokenIndex > 0 &&
                endLineText.charCodeAt(endTokenIndex - 1) === 32 /* CharCode.Space */) {
                // Pretend the end token contains a leading space
                endToken = ' ' + endToken;
                endTokenIndex -= 1;
            }
            ops = BlockCommentCommand._createRemoveBlockCommentOperations(new Range(startLineNumber, startTokenIndex + startToken.length + 1, endLineNumber, endTokenIndex + 1), startToken, endToken);
        }
        else {
            ops = BlockCommentCommand._createAddBlockCommentOperations(selection, startToken, endToken, this._insertSpace);
            this._usedEndToken = ops.length === 1 ? endToken : null;
        }
        for (const op of ops) {
            builder.addTrackedEditOperation(op.range, op.text);
        }
    }
    static _createRemoveBlockCommentOperations(r, startToken, endToken) {
        const res = [];
        if (!Range.isEmpty(r)) {
            // Remove block comment start
            res.push(EditOperation.delete(new Range(r.startLineNumber, r.startColumn - startToken.length, r.startLineNumber, r.startColumn)));
            // Remove block comment end
            res.push(EditOperation.delete(new Range(r.endLineNumber, r.endColumn, r.endLineNumber, r.endColumn + endToken.length)));
        }
        else {
            // Remove both continuously
            res.push(EditOperation.delete(new Range(r.startLineNumber, r.startColumn - startToken.length, r.endLineNumber, r.endColumn + endToken.length)));
        }
        return res;
    }
    static _createAddBlockCommentOperations(r, startToken, endToken, insertSpace) {
        const res = [];
        if (!Range.isEmpty(r)) {
            // Insert block comment start
            res.push(EditOperation.insert(new Position(r.startLineNumber, r.startColumn), startToken + (insertSpace ? ' ' : '')));
            // Insert block comment end
            res.push(EditOperation.insert(new Position(r.endLineNumber, r.endColumn), (insertSpace ? ' ' : '') + endToken));
        }
        else {
            // Insert both continuously
            res.push(EditOperation.replace(new Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn), startToken + '  ' + endToken));
        }
        return res;
    }
    getEditOperations(model, builder) {
        const startLineNumber = this._selection.startLineNumber;
        const startColumn = this._selection.startColumn;
        model.tokenization.tokenizeIfCheap(startLineNumber);
        const languageId = model.getLanguageIdAtPosition(startLineNumber, startColumn);
        const config = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        if (!config || !config.blockCommentStartToken || !config.blockCommentEndToken) {
            // Mode does not support block comments
            return;
        }
        this._createOperationsForBlockComment(this._selection, config.blockCommentStartToken, config.blockCommentEndToken, this._insertSpace, model, builder);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        if (inverseEditOperations.length === 2) {
            const startTokenEditOperation = inverseEditOperations[0];
            const endTokenEditOperation = inverseEditOperations[1];
            return new Selection(startTokenEditOperation.range.endLineNumber, startTokenEditOperation.range.endColumn, endTokenEditOperation.range.startLineNumber, endTokenEditOperation.range.startColumn);
        }
        else {
            const srcRange = inverseEditOperations[0].range;
            const deltaColumn = this._usedEndToken ? -this._usedEndToken.length - 1 : 0; // minus 1 space before endToken
            return new Selection(srcRange.endLineNumber, srcRange.endColumn + deltaColumn, srcRange.endLineNumber, srcRange.endColumn + deltaColumn);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tDb21tZW50Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbW1lbnQvYnJvd3Nlci9ibG9ja0NvbW1lbnRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sdUNBQXVDLENBQUE7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFTN0QsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQixZQUNDLFNBQW9CLEVBQ3BCLFdBQW9CLEVBQ0gsNEJBQTJEO1FBQTNELGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFFNUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUE7UUFDL0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7SUFDMUIsQ0FBQztJQUVNLE1BQU0sQ0FBQywwQkFBMEIsQ0FDdkMsUUFBZ0IsRUFDaEIsTUFBYyxFQUNkLE1BQWM7UUFFZCxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDdEMsSUFBSSxNQUFNLEdBQUcsWUFBWSxHQUFHLGNBQWMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFD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