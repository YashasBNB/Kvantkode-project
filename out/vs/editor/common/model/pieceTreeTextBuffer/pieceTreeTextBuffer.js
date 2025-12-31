/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../core/range.js';
import { ApplyEditsResult, } from '../../model.js';
import { PieceTreeBase } from './pieceTreeBase.js';
import { countEOL } from '../../core/eolCounter.js';
import { TextChange } from '../../core/textChange.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class PieceTreeTextBuffer extends Disposable {
    constructor(chunks, BOM, eol, containsRTL, containsUnusualLineTerminators, isBasicASCII, eolNormalized) {
        super();
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._BOM = BOM;
        this._mightContainNonBasicASCII = !isBasicASCII;
        this._mightContainRTL = containsRTL;
        this._mightContainUnusualLineTerminators = containsUnusualLineTerminators;
        this._pieceTree = new PieceTreeBase(chunks, eol, eolNormalized);
    }
    // #region TextBuffer
    equals(other) {
        if (!(other instanceof PieceTreeTextBuffer)) {
            return false;
        }
        if (this._BOM !== other._BOM) {
            return false;
        }
        if (this.getEOL() !== other.getEOL()) {
            return false;
        }
        return this._pieceTree.equal(other._pieceTree);
    }
    mightContainRTL() {
        return this._mightContainRTL;
    }
    mightContainUnusualLineTerminators() {
        return this._mightContainUnusualLineTerminators;
    }
    resetMightContainUnusualLineTerminators() {
        this._mightContainUnusualLineTerminators = false;
    }
    mightContainNonBasicASCII() {
        return this._mightContainNonBasicASCII;
    }
    getBOM() {
        return this._BOM;
    }
    getEOL() {
        return this._pieceTree.getEOL();
    }
    createSnapshot(preserveBOM) {
        return this._pieceTree.createSnapshot(preserveBOM ? this._BOM : '');
    }
    getOffsetAt(lineNumber, column) {
        return this._pieceTree.getOffsetAt(lineNumber, column);
    }
    getPositionAt(offset) {
        return this._pieceTree.getPositionAt(offset);
    }
    getRangeAt(start, length) {
        const end = start + length;
        const startPosition = this.getPositionAt(start);
        const endPosition = this.getPositionAt(end);
        return new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
    }
    getValueInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (range.isEmpty()) {
            return '';
        }
        const lineEnding = this._getEndOfLine(eol);
        return this._pieceTree.getValueInRange(range, lineEnding);
    }
    getValueLengthInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (range.isEmpty()) {
            return 0;
        }
        if (range.startLineNumber === range.endLineNumber) {
            return range.endColumn - range.startColumn;
        }
        const startOffset = this.getOffsetAt(range.startLineNumber, range.startColumn);
        const endOffset = this.getOffsetAt(range.endLineNumber, range.endColumn);
        // offsets use the text EOL, so we need to compensate for length differences
        // if the requested EOL doesn't match the text EOL
        let eolOffsetCompensation = 0;
        const desiredEOL = this._getEndOfLine(eol);
        const actualEOL = this.getEOL();
        if (desiredEOL.length !== actualEOL.length) {
            const delta = desiredEOL.length - actualEOL.length;
            const eolCount = range.endLineNumber - range.startLineNumber;
            eolOffsetCompensation = delta * eolCount;
        }
        return endOffset - startOffset + eolOffsetCompensation;
    }
    getCharacterCountInRange(range, eol = 0 /* EndOfLinePreference.TextDefined */) {
        if (this._mightContainNonBasicASCII) {
            // we must count by iterating
            let result = 0;
            const fromLineNumber = range.startLineNumber;
            const toLineNumber = range.endLineNumber;
            for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
                const lineContent = this.getLineContent(lineNumber);
                const fromOffset = lineNumber === fromLineNumber ? range.startColumn - 1 : 0;
                const toOffset = lineNumber === toLineNumber ? range.endColumn - 1 : lineContent.length;
                for (let offset = fromOffset; offset < toOffset; offset++) {
                    if (strings.isHighSurrogate(lineContent.charCodeAt(offset))) {
                        result = result + 1;
                        offset = offset + 1;
                    }
                    else {
                        result = result + 1;
                    }
                }
            }
            result += this._getEndOfLine(eol).length * (toLineNumber - fromLineNumber);
            return result;
        }
        return this.getValueLengthInRange(range, eol);
    }
    getNearestChunk(offset) {
        return this._pieceTree.getNearestChunk(offset);
    }
    getLength() {
        return this._pieceTree.getLength();
    }
    getLineCount() {
        return this._pieceTree.getLineCount();
    }
    getLinesContent() {
        return this._pieceTree.getLinesContent();
    }
    getLineContent(lineNumber) {
        return this._pieceTree.getLineContent(lineNumber);
    }
    getLineCharCode(lineNumber, index) {
        return this._pieceTree.getLineCharCode(lineNumber, index);
    }
    getCharCode(offset) {
        return this._pieceTree.getCharCode(offset);
    }
    getLineLength(lineNumber) {
        return this._pieceTree.getLineLength(lineNumber);
    }
    getLineMinColumn(lineNumber) {
        return 1;
    }
    getLineMaxColumn(lineNumber) {
        return this.getLineLength(lineNumber) + 1;
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 1;
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 2;
    }
    _getEndOfLine(eol) {
        switch (eol) {
            case 1 /* EndOfLinePreference.LF */:
                return '\n';
            case 2 /* EndOfLinePreference.CRLF */:
                return '\r\n';
            case 0 /* EndOfLinePreference.TextDefined */:
                return this.getEOL();
            default:
                throw new Error('Unknown EOL preference');
        }
    }
    setEOL(newEOL) {
        this._pieceTree.setEOL(newEOL);
    }
    applyEdits(rawOperations, recordTrimAutoWhitespace, computeUndoEdits) {
        let mightContainRTL = this._mightContainRTL;
        let mightContainUnusualLineTerminators = this._mightContainUnusualLineTerminators;
        let mightContainNonBasicASCII = this._mightContainNonBasicASCII;
        let canReduceOperations = true;
        let operations = [];
        for (let i = 0; i < rawOperations.length; i++) {
            const op = rawOperations[i];
            if (canReduceOperations && op._isTracked) {
                canReduceOperations = false;
            }
            const validatedRange = op.range;
            if (op.text) {
                let textMightContainNonBasicASCII = true;
                if (!mightContainNonBasicASCII) {
                    textMightContainNonBasicASCII = !strings.isBasicASCII(op.text);
                    mightContainNonBasicASCII = textMightContainNonBasicASCII;
                }
                if (!mightContainRTL && textMightContainNonBasicASCII) {
                    // check if the new inserted text contains RTL
                    mightContainRTL = strings.containsRTL(op.text);
                }
                if (!mightContainUnusualLineTerminators && textMightContainNonBasicASCII) {
                    // check if the new inserted text contains unusual line terminators
                    mightContainUnusualLineTerminators = strings.containsUnusualLineTerminators(op.text);
                }
            }
            let validText = '';
            let eolCount = 0;
            let firstLineLength = 0;
            let lastLineLength = 0;
            if (op.text) {
                let strEOL;
                [eolCount, firstLineLength, lastLineLength, strEOL] = countEOL(op.text);
                const bufferEOL = this.getEOL();
                const expectedStrEOL = bufferEOL === '\r\n' ? 2 /* StringEOL.CRLF */ : 1 /* StringEOL.LF */;
                if (strEOL === 0 /* StringEOL.Unknown */ || strEOL === expectedStrEOL) {
                    validText = op.text;
                }
                else {
                    validText = op.text.replace(/\r\n|\r|\n/g, bufferEOL);
                }
            }
            operations[i] = {
                sortIndex: i,
                identifier: op.identifier || null,
                range: validatedRange,
                rangeOffset: this.getOffsetAt(validatedRange.startLineNumber, validatedRange.startColumn),
                rangeLength: this.getValueLengthInRange(validatedRange),
                text: validText,
                eolCount: eolCount,
                firstLineLength: firstLineLength,
                lastLineLength: lastLineLength,
                forceMoveMarkers: Boolean(op.forceMoveMarkers),
                isAutoWhitespaceEdit: op.isAutoWhitespaceEdit || false,
            };
        }
        // Sort operations ascending
        operations.sort(PieceTreeTextBuffer._sortOpsAscending);
        let hasTouchingRanges = false;
        for (let i = 0, count = operations.length - 1; i < count; i++) {
            const rangeEnd = operations[i].range.getEndPosition();
            const nextRangeStart = operations[i + 1].range.getStartPosition();
            if (nextRangeStart.isBeforeOrEqual(rangeEnd)) {
                if (nextRangeStart.isBefore(rangeEnd)) {
                    // overlapping ranges
                    throw new Error('Overlapping ranges are not allowed!');
                }
                hasTouchingRanges = true;
            }
        }
        if (canReduceOperations) {
            operations = this._reduceOperations(operations);
        }
        // Delta encode operations
        const reverseRanges = computeUndoEdits || recordTrimAutoWhitespace
            ? PieceTreeTextBuffer._getInverseEditRanges(operations)
            : [];
        const newTrimAutoWhitespaceCandidates = [];
        if (recordTrimAutoWhitespace) {
            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                const reverseRange = reverseRanges[i];
                if (op.isAutoWhitespaceEdit && op.range.isEmpty()) {
                    // Record already the future line numbers that might be auto whitespace removal candidates on next edit
                    for (let lineNumber = reverseRange.startLineNumber; lineNumber <= reverseRange.endLineNumber; lineNumber++) {
                        let currentLineContent = '';
                        if (lineNumber === reverseRange.startLineNumber) {
                            currentLineContent = this.getLineContent(op.range.startLineNumber);
                            if (strings.firstNonWhitespaceIndex(currentLineContent) !== -1) {
                                continue;
                            }
                        }
                        newTrimAutoWhitespaceCandidates.push({
                            lineNumber: lineNumber,
                            oldContent: currentLineContent,
                        });
                    }
                }
            }
        }
        let reverseOperations = null;
        if (computeUndoEdits) {
            let reverseRangeDeltaOffset = 0;
            reverseOperations = [];
            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                const reverseRange = reverseRanges[i];
                const bufferText = this.getValueInRange(op.range);
                const reverseRangeOffset = op.rangeOffset + reverseRangeDeltaOffset;
                reverseRangeDeltaOffset += op.text.length - bufferText.length;
                reverseOperations[i] = {
                    sortIndex: op.sortIndex,
                    identifier: op.identifier,
                    range: reverseRange,
                    text: bufferText,
                    textChange: new TextChange(op.rangeOffset, bufferText, reverseRangeOffset, op.text),
                };
            }
            // Can only sort reverse operations when the order is not significant
            if (!hasTouchingRanges) {
                reverseOperations.sort((a, b) => a.sortIndex - b.sortIndex);
            }
        }
        this._mightContainRTL = mightContainRTL;
        this._mightContainUnusualLineTerminators = mightContainUnusualLineTerminators;
        this._mightContainNonBasicASCII = mightContainNonBasicASCII;
        const contentChanges = this._doApplyEdits(operations);
        let trimAutoWhitespaceLineNumbers = null;
        if (recordTrimAutoWhitespace && newTrimAutoWhitespaceCandidates.length > 0) {
            // sort line numbers auto whitespace removal candidates for next edit descending
            newTrimAutoWhitespaceCandidates.sort((a, b) => b.lineNumber - a.lineNumber);
            trimAutoWhitespaceLineNumbers = [];
            for (let i = 0, len = newTrimAutoWhitespaceCandidates.length; i < len; i++) {
                const lineNumber = newTrimAutoWhitespaceCandidates[i].lineNumber;
                if (i > 0 && newTrimAutoWhitespaceCandidates[i - 1].lineNumber === lineNumber) {
                    // Do not have the same line number twice
                    continue;
                }
                const prevContent = newTrimAutoWhitespaceCandidates[i].oldContent;
                const lineContent = this.getLineContent(lineNumber);
                if (lineContent.length === 0 ||
                    lineContent === prevContent ||
                    strings.firstNonWhitespaceIndex(lineContent) !== -1) {
                    continue;
                }
                trimAutoWhitespaceLineNumbers.push(lineNumber);
            }
        }
        this._onDidChangeContent.fire();
        return new ApplyEditsResult(reverseOperations, contentChanges, trimAutoWhitespaceLineNumbers);
    }
    /**
     * Transform operations such that they represent the same logic edit,
     * but that they also do not cause OOM crashes.
     */
    _reduceOperations(operations) {
        if (operations.length < 1000) {
            // We know from empirical testing that a thousand edits work fine regardless of their shape.
            return operations;
        }
        // At one point, due to how events are emitted and how each operation is handled,
        // some operations can trigger a high amount of temporary string allocations,
        // that will immediately get edited again.
        // e.g. a formatter inserting ridiculous ammounts of \n on a model with a single line
        // Therefore, the strategy is to collapse all the operations into a huge single edit operation
        return [this._toSingleEditOperation(operations)];
    }
    _toSingleEditOperation(operations) {
        let forceMoveMarkers = false;
        const firstEditRange = operations[0].range;
        const lastEditRange = operations[operations.length - 1].range;
        const entireEditRange = new Range(firstEditRange.startLineNumber, firstEditRange.startColumn, lastEditRange.endLineNumber, lastEditRange.endColumn);
        let lastEndLineNumber = firstEditRange.startLineNumber;
        let lastEndColumn = firstEditRange.startColumn;
        const result = [];
        for (let i = 0, len = operations.length; i < len; i++) {
            const operation = operations[i];
            const range = operation.range;
            forceMoveMarkers = forceMoveMarkers || operation.forceMoveMarkers;
            // (1) -- Push old text
            result.push(this.getValueInRange(new Range(lastEndLineNumber, lastEndColumn, range.startLineNumber, range.startColumn)));
            // (2) -- Push new text
            if (operation.text.length > 0) {
                result.push(operation.text);
            }
            lastEndLineNumber = range.endLineNumber;
            lastEndColumn = range.endColumn;
        }
        const text = result.join('');
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        return {
            sortIndex: 0,
            identifier: operations[0].identifier,
            range: entireEditRange,
            rangeOffset: this.getOffsetAt(entireEditRange.startLineNumber, entireEditRange.startColumn),
            rangeLength: this.getValueLengthInRange(entireEditRange, 0 /* EndOfLinePreference.TextDefined */),
            text: text,
            eolCount: eolCount,
            firstLineLength: firstLineLength,
            lastLineLength: lastLineLength,
            forceMoveMarkers: forceMoveMarkers,
            isAutoWhitespaceEdit: false,
        };
    }
    _doApplyEdits(operations) {
        operations.sort(PieceTreeTextBuffer._sortOpsDescending);
        const contentChanges = [];
        // operations are from bottom to top
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            const startLineNumber = op.range.startLineNumber;
            const startColumn = op.range.startColumn;
            const endLineNumber = op.range.endLineNumber;
            const endColumn = op.range.endColumn;
            if (startLineNumber === endLineNumber && startColumn === endColumn && op.text.length === 0) {
                // no-op
                continue;
            }
            if (op.text) {
                // replacement
                this._pieceTree.delete(op.rangeOffset, op.rangeLength);
                this._pieceTree.insert(op.rangeOffset, op.text, true);
            }
            else {
                // deletion
                this._pieceTree.delete(op.rangeOffset, op.rangeLength);
            }
            const contentChangeRange = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
            contentChanges.push({
                range: contentChangeRange,
                rangeLength: op.rangeLength,
                text: op.text,
                rangeOffset: op.rangeOffset,
                forceMoveMarkers: op.forceMoveMarkers,
            });
        }
        return contentChanges;
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        return this._pieceTree.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
    }
    // #endregion
    // #region helper
    // testing purpose.
    getPieceTree() {
        return this._pieceTree;
    }
    static _getInverseEditRange(range, text) {
        const startLineNumber = range.startLineNumber;
        const startColumn = range.startColumn;
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        let resultRange;
        if (text.length > 0) {
            // the operation inserts something
            const lineCount = eolCount + 1;
            if (lineCount === 1) {
                // single line insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn + firstLineLength);
            }
            else {
                // multi line insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber + lineCount - 1, lastLineLength + 1);
            }
        }
        else {
            // There is nothing to insert
            resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn);
        }
        return resultRange;
    }
    /**
     * Assumes `operations` are validated and sorted ascending
     */
    static _getInverseEditRanges(operations) {
        const result = [];
        let prevOpEndLineNumber = 0;
        let prevOpEndColumn = 0;
        let prevOp = null;
        for (let i = 0, len = operations.length; i < len; i++) {
            const op = operations[i];
            let startLineNumber;
            let startColumn;
            if (prevOp) {
                if (prevOp.range.endLineNumber === op.range.startLineNumber) {
                    startLineNumber = prevOpEndLineNumber;
                    startColumn = prevOpEndColumn + (op.range.startColumn - prevOp.range.endColumn);
                }
                else {
                    startLineNumber =
                        prevOpEndLineNumber + (op.range.startLineNumber - prevOp.range.endLineNumber);
                    startColumn = op.range.startColumn;
                }
            }
            else {
                startLineNumber = op.range.startLineNumber;
                startColumn = op.range.startColumn;
            }
            let resultRange;
            if (op.text.length > 0) {
                // the operation inserts something
                const lineCount = op.eolCount + 1;
                if (lineCount === 1) {
                    // single line insert
                    resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn + op.firstLineLength);
                }
                else {
                    // multi line insert
                    resultRange = new Range(startLineNumber, startColumn, startLineNumber + lineCount - 1, op.lastLineLength + 1);
                }
            }
            else {
                // There is nothing to insert
                resultRange = new Range(startLineNumber, startColumn, startLineNumber, startColumn);
            }
            prevOpEndLineNumber = resultRange.endLineNumber;
            prevOpEndColumn = resultRange.endColumn;
            result.push(resultRange);
            prevOp = op;
        }
        return result;
    }
    static _sortOpsAscending(a, b) {
        const r = Range.compareRangesUsingEnds(a.range, b.range);
        if (r === 0) {
            return a.sortIndex - b.sortIndex;
        }
        return r;
    }
    static _sortOpsDescending(a, b) {
        const r = Range.compareRangesUsingEnds(a.range, b.range);
        if (r === 0) {
            return b.sortIndex - a.sortIndex;
        }
        return -r;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvcGllY2VUcmVlVGV4dEJ1ZmZlci9waWVjZVRyZWVUZXh0QnVmZmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMzQyxPQUFPLEVBQ04sZ0JBQWdCLEdBVWhCLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUFFLGFBQWEsRUFBZ0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFhLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQW9CakUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFVbEQsWUFDQyxNQUFzQixFQUN0QixHQUFXLEVBQ1gsR0FBa0IsRUFDbEIsV0FBb0IsRUFDcEIsOEJBQXVDLEVBQ3ZDLFlBQXFCLEVBQ3JCLGFBQXNCO1FBRXRCLEtBQUssRUFBRSxDQUFBO1FBWlMsd0JBQW1CLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3pFLHVCQUFrQixHQUFnQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBWS9FLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO1FBQ2YsSUFBSSxDQUFDLDBCQUEwQixHQUFHLENBQUMsWUFBWSxDQUFB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