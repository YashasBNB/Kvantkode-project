/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupAdjacentBy } from '../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { LineRange } from '../core/lineRange.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { SingleTextEdit } from '../core/textEdit.js';
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 */
export class LineRangeMapping {
    static inverse(mapping, originalLineCount, modifiedLineCount) {
        const result = [];
        let lastOriginalEndLineNumber = 1;
        let lastModifiedEndLineNumber = 1;
        for (const m of mapping) {
            const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, m.original.startLineNumber), new LineRange(lastModifiedEndLineNumber, m.modified.startLineNumber));
            if (!r.modified.isEmpty) {
                result.push(r);
            }
            lastOriginalEndLineNumber = m.original.endLineNumberExclusive;
            lastModifiedEndLineNumber = m.modified.endLineNumberExclusive;
        }
        const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, originalLineCount + 1), new LineRange(lastModifiedEndLineNumber, modifiedLineCount + 1));
        if (!r.modified.isEmpty) {
            result.push(r);
        }
        return result;
    }
    static clip(mapping, originalRange, modifiedRange) {
        const result = [];
        for (const m of mapping) {
            const original = m.original.intersect(originalRange);
            const modified = m.modified.intersect(modifiedRange);
            if (original && !original.isEmpty && modified && !modified.isEmpty) {
                result.push(new LineRangeMapping(original, modified));
            }
        }
        return result;
    }
    constructor(originalRange, modifiedRange) {
        this.original = originalRange;
        this.modified = modifiedRange;
    }
    toString() {
        return `{${this.original.toString()}->${this.modified.toString()}}`;
    }
    flip() {
        return new LineRangeMapping(this.modified, this.original);
    }
    join(other) {
        return new LineRangeMapping(this.original.join(other.original), this.modified.join(other.modified));
    }
    get changedLineCount() {
        return Math.max(this.original.length, this.modified.length);
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
     */
    toRangeMapping() {
        const origInclusiveRange = this.original.toInclusiveRange();
        const modInclusiveRange = this.modified.toInclusiveRange();
        if (origInclusiveRange && modInclusiveRange) {
            return new RangeMapping(origInclusiveRange, modInclusiveRange);
        }
        else if (this.original.startLineNumber === 1 || this.modified.startLineNumber === 1) {
            if (!(this.modified.startLineNumber === 1 && this.original.startLineNumber === 1)) {
                // If one line range starts at 1, the other one must start at 1 as well.
                throw new BugIndicatingError('not a valid diff');
            }
            // Because one range is empty and both ranges start at line 1, none of the ranges can cover all lines.
            // Thus, `endLineNumberExclusive` is a valid line number.
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        else {
            // We can assume here that both startLineNumbers are greater than 1.
            return new RangeMapping(new Range(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), new Range(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER));
        }
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
     */
    toRangeMapping2(original, modified) {
        if (isValidLineNumber(this.original.endLineNumberExclusive, original) &&
            isValidLineNumber(this.modified.endLineNumberExclusive, modified)) {
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        if (!this.original.isEmpty && !this.modified.isEmpty) {
            return new RangeMapping(Range.fromPositions(new Position(this.original.startLineNumber, 1), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(new Position(this.modified.startLineNumber, 1), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        if (this.original.startLineNumber > 1 && this.modified.startLineNumber > 1) {
            return new RangeMapping(Range.fromPositions(normalizePosition(new Position(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER), original), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(normalizePosition(new Position(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER), modified), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        // Situation now: one range is empty and one range touches the last line and one range starts at line 1.
        // I don't think this can happen.
        throw new BugIndicatingError();
    }
}
function normalizePosition(position, content) {
    if (position.lineNumber < 1) {
        return new Position(1, 1);
    }
    if (position.lineNumber > content.length) {
        return new Position(content.length, content[content.length - 1].length + 1);
    }
    const line = content[position.lineNumber - 1];
    if (position.column > line.length + 1) {
        return new Position(position.lineNumber, line.length + 1);
    }
    return position;
}
function isValidLineNumber(lineNumber, lines) {
    return lineNumber >= 1 && lineNumber <= lines.length;
}
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 * Also contains inner range mappings.
 */
export class DetailedLineRangeMapping extends LineRangeMapping {
    static fromRangeMappings(rangeMappings) {
        const originalRange = LineRange.join(rangeMappings.map((r) => LineRange.fromRangeInclusive(r.originalRange)));
        const modifiedRange = LineRange.join(rangeMappings.map((r) => LineRange.fromRangeInclusive(r.modifiedRange)));
        return new DetailedLineRangeMapping(originalRange, modifiedRange, rangeMappings);
    }
    constructor(originalRange, modifiedRange, innerChanges) {
        super(originalRange, modifiedRange);
        this.innerChanges = innerChanges;
    }
    flip() {
        return new DetailedLineRangeMapping(this.modified, this.original, this.innerChanges?.map((c) => c.flip()));
    }
    withInnerChangesFromLineRanges() {
        return new DetailedLineRangeMapping(this.original, this.modified, [this.toRangeMapping()]);
    }
}
/**
 * Maps a range in the original text model to a range in the modified text model.
 */
export class RangeMapping {
    static fromEdit(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.edits.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return result;
    }
    static fromEditJoin(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.edits.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return RangeMapping.join(result);
    }
    static join(rangeMappings) {
        if (rangeMappings.length === 0) {
            throw new BugIndicatingError('Cannot join an empty list of range mappings');
        }
        let result = rangeMappings[0];
        for (let i = 1; i < rangeMappings.length; i++) {
            result = result.join(rangeMappings[i]);
        }
        return result;
    }
    static assertSorted(rangeMappings) {
        for (let i = 1; i < rangeMappings.length; i++) {
            const previous = rangeMappings[i - 1];
            const current = rangeMappings[i];
            if (!(previous.originalRange
                .getEndPosition()
                .isBeforeOrEqual(current.originalRange.getStartPosition()) &&
                previous.modifiedRange
                    .getEndPosition()
                    .isBeforeOrEqual(current.modifiedRange.getStartPosition()))) {
                throw new BugIndicatingError('Range mappings must be sorted');
            }
        }
    }
    constructor(originalRange, modifiedRange) {
        this.originalRange = originalRange;
        this.modifiedRange = modifiedRange;
    }
    toString() {
        return `{${this.originalRange.toString()}->${this.modifiedRange.toString()}}`;
    }
    flip() {
        return new RangeMapping(this.modifiedRange, this.originalRange);
    }
    /**
     * Creates a single text edit that describes the change from the original to the modified text.
     */
    toTextEdit(modified) {
        const newText = modified.getValueOfRange(this.modifiedRange);
        return new SingleTextEdit(this.originalRange, newText);
    }
    join(other) {
        return new RangeMapping(this.originalRange.plusRange(other.originalRange), this.modifiedRange.plusRange(other.modifiedRange));
    }
}
export function lineRangeMappingFromRangeMappings(alignments, originalLines, modifiedLines, dontAssertStartLine = false) {
    const changes = [];
    for (const g of groupAdjacentBy(alignments.map((a) => getLineRangeMapping(a, originalLines, modifiedLines)), (a1, a2) => a1.original.overlapOrTouch(a2.original) || a1.modified.overlapOrTouch(a2.modified))) {
        const first = g[0];
        const last = g[g.length - 1];
        changes.push(new DetailedLineRangeMapping(first.original.join(last.original), first.modified.join(last.modified), g.map((a) => a.innerChanges[0])));
    }
    assertFn(() => {
        if (!dontAssertStartLine && changes.length > 0) {
            if (changes[0].modified.startLineNumber !== changes[0].original.startLineNumber) {
                return false;
            }
            if (modifiedLines.length.lineCount -
                changes[changes.length - 1].modified.endLineNumberExclusive !==
                originalLines.length.lineCount - changes[changes.length - 1].original.endLineNumberExclusive) {
                return false;
            }
        }
        return checkAdjacentItems(changes, (m1, m2) => m2.original.startLineNumber - m1.original.endLineNumberExclusive ===
            m2.modified.startLineNumber - m1.modified.endLineNumberExclusive &&
            // There has to be an unchanged line in between (otherwise both diffs should have been joined)
            m1.original.endLineNumberExclusive < m2.original.startLineNumber &&
            m1.modified.endLineNumberExclusive < m2.modified.startLineNumber);
    });
    return changes;
}
export function getLineRangeMapping(rangeMapping, originalLines, modifiedLines) {
    let lineStartDelta = 0;
    let lineEndDelta = 0;
    // rangeMapping describes the edit that replaces `rangeMapping.originalRange` with `newText := getText(modifiedLines, rangeMapping.modifiedRange)`.
    // original: ]xxx \n <- this line is not modified
    // modified: ]xx  \n
    if (rangeMapping.modifiedRange.endColumn === 1 &&
        rangeMapping.originalRange.endColumn === 1 &&
        rangeMapping.originalRange.startLineNumber + lineStartDelta <=
            rangeMapping.originalRange.endLineNumber &&
        rangeMapping.modifiedRange.startLineNumber + lineStartDelta <=
            rangeMapping.modifiedRange.endLineNumber) {
        // We can only do this if the range is not empty yet
        lineEndDelta = -1;
    }
    // original: xxx[ \n <- this line is not modified
    // modified: xxx[ \n
    if (rangeMapping.modifiedRange.startColumn - 1 >=
        modifiedLines.getLineLength(rangeMapping.modifiedRange.startLineNumber) &&
        rangeMapping.originalRange.startColumn - 1 >=
            originalLines.getLineLength(rangeMapping.originalRange.startLineNumber) &&
        rangeMapping.originalRange.startLineNumber <=
            rangeMapping.originalRange.endLineNumber + lineEndDelta &&
        rangeMapping.modifiedRange.startLineNumber <=
            rangeMapping.modifiedRange.endLineNumber + lineEndDelta) {
        // We can only do this if the range is not empty yet
        lineStartDelta = 1;
    }
    const originalLineRange = new LineRange(rangeMapping.originalRange.startLineNumber + lineStartDelta, rangeMapping.originalRange.endLineNumber + 1 + lineEndDelta);
    const modifiedLineRange = new LineRange(rangeMapping.modifiedRange.startLineNumber + lineStartDelta, rangeMapping.modifiedRange.endLineNumber + 1 + lineEndDelta);
    return new DetailedLineRangeMapping(originalLineRange, modifiedLineRange, [rangeMapping]);
}
export function lineRangeMappingFromChange(change) {
    let originalRange;
    if (change.originalEndLineNumber === 0) {
        // Insertion
        originalRange = new LineRange(change.originalStartLineNumber + 1, change.originalStartLineNumber + 1);
    }
    else {
        originalRange = new LineRange(change.originalStartLineNumber, change.originalEndLineNumber + 1);
    }
    let modifiedRange;
    if (change.modifiedEndLineNumber === 0) {
        // Deletion
        modifiedRange = new LineRange(change.modifiedStartLineNumber + 1, change.modifiedStartLineNumber + 1);
    }
    else {
        modifiedRange = new LineRange(change.modifiedStartLineNumber, change.modifiedEndLineNumber + 1);
    }
    return new LineRangeMapping(originalRange, modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvcmFuZ2VNYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDeEMsT0FBTyxFQUFnQixjQUFjLEVBQVksTUFBTSxxQkFBcUIsQ0FBQTtBQUc1RTs7R0FFRztBQUNILE1BQU0sT0FBTyxnQkFBZ0I7SUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FDcEIsT0FBb0MsRUFDcEMsaUJBQXlCLEVBQ3pCLGlCQUF5QjtRQUV6QixNQUFNLE1BQU0sR0FBdUIsRUFBRSxDQUFBO1FBQ3JDLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFBO1FBQ2pDLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFBO1FBRWpDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDN0IsSUFBSSxTQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFDcEUsSUFBSSxTQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMs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