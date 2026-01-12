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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9waWVjZVRyZWVUZXh0QnVmZmVyL3BpZWNlVHJlZVRleHRCdWZmZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzNDLE9BQU8sRUFDTixnQkFBZ0IsR0FVaEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsYUFBYSxFQUFnQixNQUFNLG9CQUFvQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQWEsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBb0JqRSxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQVVsRCxZQUNDLE1BQXNCLEVBQ3RCLEdBQVcsRUFDWCxHQUFrQixFQUNsQixXQUFvQixFQUNwQiw4QkFBdUMsRUFDdkMsWUFBcUIsRUFDckIsYUFBc0I7UUFFdEIsS0FBSyxFQUFFLENBQUE7UUFaUyx3QkFBbUIsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDekUsdUJBQWtCLEdBQWdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFZL0UsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUE7UUFDZixJQUFJLENBQUMsMEJBQTBCLEdBQUcsQ0FBQyxZQUFZ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