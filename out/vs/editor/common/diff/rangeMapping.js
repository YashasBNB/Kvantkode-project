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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL3JhbmdlTWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBZ0IsY0FBYyxFQUFZLE1BQU0scUJBQXFCLENBQUE7QUFHNUU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxPQUFPLENBQ3BCLE9BQW9DLEVBQ3BDLGlCQUF5QixFQUN6QixpQkFBeUI7UUFFekIsTUFBTSxNQUFNLEdBQXVCLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLHlCQUF5QixHQUFHLENBQUMsQ0FBQTtRQUNqQyxJQUFJLHlCQUF5QixHQUFHLENBQUMsQ0FBQTtRQUVqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksZ0JBQWdCLENBQzdCLElBQUksU0FBUyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQ3BFLElBQUksU0FBUyxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQ3BF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