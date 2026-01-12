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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tDb21tZW50Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29tbWVudC9icm93c2VyL2Jsb2NrQ29tbWVudENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVM3RCxNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLFlBQ0MsU0FBb0IsRUFDcEIsV0FBb0IsRUFDSCw0QkFBMkQ7UUFBM0QsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUU1RSxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtJQUMxQixDQUFDO0lBRU0sTUFBTSxDQUFDLDBCQUEwQixDQUN2QyxRQUFnQixFQUNoQixNQUFjLEVBQ2QsTUFBYztRQUVkLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7UUFDbEMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLE1BQU0sR0FBRyxZQUFZLEdBQUcsY0FBYyxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsS0FBSyxJQUFJ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