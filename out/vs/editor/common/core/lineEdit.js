/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, groupAdjacentBy, numberComparator } from '../../../base/common/arrays.js';
import { assert, checkAdjacentItems } from '../../../base/common/assert.js';
import { splitLines } from '../../../base/common/strings.js';
import { LineRange } from './lineRange.js';
import { OffsetEdit, SingleOffsetEdit } from './offsetEdit.js';
import { Position } from './position.js';
import { Range } from './range.js';
import { SingleTextEdit, TextEdit } from './textEdit.js';
export class LineEdit {
    static { this.empty = new LineEdit([]); }
    static deserialize(data) {
        return new LineEdit(data.map((e) => SingleLineEdit.deserialize(e)));
    }
    static fromEdit(edit, initialValue) {
        const textEdit = TextEdit.fromOffsetEdit(edit, initialValue);
        return LineEdit.fromTextEdit(textEdit, initialValue);
    }
    static fromTextEdit(edit, initialValue) {
        const edits = edit.edits;
        const result = [];
        const currentEdits = [];
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const nextEditRange = i + 1 < edits.length ? edits[i + 1] : undefined;
            currentEdits.push(edit);
            if (nextEditRange && nextEditRange.range.startLineNumber === edit.range.endLineNumber) {
                continue;
            }
            const singleEdit = SingleTextEdit.joinEdits(currentEdits, initialValue);
            currentEdits.length = 0;
            const singleLineEdit = SingleLineEdit.fromSingleTextEdit(singleEdit, initialValue);
            result.push(singleLineEdit);
        }
        return new LineEdit(result);
    }
    static createFromUnsorted(edits) {
        const result = edits.slice();
        result.sort(compareBy((i) => i.lineRange.startLineNumber, numberComparator));
        return new LineEdit(result);
    }
    constructor(
    /**
     * Have to be sorted by start line number and non-intersecting.
     */
    edits) {
        this.edits = edits;
        assert(checkAdjacentItems(edits, (i1, i2) => i1.lineRange.endLineNumberExclusive <= i2.lineRange.startLineNumber));
    }
    toEdit(initialValue) {
        const edits = [];
        for (const edit of this.edits) {
            const singleEdit = edit.toSingleEdit(initialValue);
            edits.push(singleEdit);
        }
        return new OffsetEdit(edits);
    }
    toString() {
        return this.edits.map((e) => e.toString()).join(',');
    }
    serialize() {
        return this.edits.map((e) => e.serialize());
    }
    getNewLineRanges() {
        const ranges = [];
        let offset = 0;
        for (const e of this.edits) {
            ranges.push(LineRange.ofLength(e.lineRange.startLineNumber + offset, e.newLines.length));
            offset += e.newLines.length - e.lineRange.length;
        }
        return ranges;
    }
    mapLineNumber(lineNumber) {
        let lineDelta = 0;
        for (const e of this.edits) {
            if (e.lineRange.endLineNumberExclusive > lineNumber) {
                break;
            }
            lineDelta += e.newLines.length - e.lineRange.length;
        }
        return lineNumber + lineDelta;
    }
    mapLineRange(lineRange) {
        return new LineRange(this.mapLineNumber(lineRange.startLineNumber), this.mapLineNumber(lineRange.endLineNumberExclusive));
    }
    rebase(base) {
        return new LineEdit(this.edits.map((e) => new SingleLineEdit(base.mapLineRange(e.lineRange), e.newLines)));
    }
    humanReadablePatch(originalLines) {
        const result = [];
        function pushLine(originalLineNumber, modifiedLineNumber, kind, content) {
            const specialChar = kind === 'unmodified' ? ' ' : kind === 'deleted' ? '-' : '+';
            if (content === undefined) {
                content = '[[[[[ WARNING: LINE DOES NOT EXIST ]]]]]';
            }
            const origLn = originalLineNumber === -1 ? '   ' : originalLineNumber.toString().padStart(3, ' ');
            const modLn = modifiedLineNumber === -1 ? '   ' : modifiedLineNumber.toString().padStart(3, ' ');
            result.push(`${specialChar} ${origLn} ${modLn} ${content}`);
        }
        function pushSeperator() {
            result.push('---');
        }
        let lineDelta = 0;
        let first = true;
        for (const edits of groupAdjacentBy(this.edits, (e1, e2) => e1.lineRange.distanceToRange(e2.lineRange) <= 5)) {
            if (!first) {
                pushSeperator();
            }
            else {
                first = false;
            }
            let lastLineNumber = edits[0].lineRange.startLineNumber - 2;
            for (const edit of edits) {
                for (let i = Math.max(1, lastLineNumber); i < edit.lineRange.startLineNumber; i++) {
                    pushLine(i, i + lineDelta, 'unmodified', originalLines[i - 1]);
                }
                const range = edit.lineRange;
                const newLines = edit.newLines;
                for (const replaceLineNumber of range.mapToLineArray((n) => n)) {
                    const line = originalLines[replaceLineNumber - 1];
                    pushLine(replaceLineNumber, -1, 'deleted', line);
                }
                for (let i = 0; i < newLines.length; i++) {
                    const line = newLines[i];
                    pushLine(-1, range.startLineNumber + lineDelta + i, 'added', line);
                }
                lastLineNumber = range.endLineNumberExclusive;
                lineDelta += edit.newLines.length - edit.lineRange.length;
            }
            for (let i = lastLineNumber; i <= Math.min(lastLineNumber + 2, originalLines.length); i++) {
                pushLine(i, i + lineDelta, 'unmodified', originalLines[i - 1]);
            }
        }
        return result.join('\n');
    }
    apply(lines) {
        const result = [];
        let currentLineIndex = 0;
        for (const edit of this.edits) {
            while (currentLineIndex < edit.lineRange.startLineNumber - 1) {
                result.push(lines[currentLineIndex]);
                currentLineIndex++;
            }
            for (const newLine of edit.newLines) {
                result.push(newLine);
            }
            currentLineIndex = edit.lineRange.endLineNumberExclusive - 1;
        }
        while (currentLineIndex < lines.length) {
            result.push(lines[currentLineIndex]);
            currentLineIndex++;
        }
        return result;
    }
    toSingleEdit() { }
}
export class SingleLineEdit {
    static deserialize(e) {
        return new SingleLineEdit(LineRange.ofLength(e[0], e[1] - e[0]), e[2]);
    }
    static fromSingleTextEdit(edit, initialValue) {
        // 1: ab[cde
        // 2: fghijk
        // 3: lmn]opq
        // replaced with
        // 1n: 123
        // 2n: 456
        // 3n: 789
        // simple solution: replace [1..4) with [1n..4n)
        const newLines = splitLines(edit.text);
        let startLineNumber = edit.range.startLineNumber;
        const survivingFirstLineText = initialValue.getValueOfRange(Range.fromPositions(new Position(edit.range.startLineNumber, 1), edit.range.getStartPosition()));
        newLines[0] = survivingFirstLineText + newLines[0];
        let endLineNumberEx = edit.range.endLineNumber + 1;
        const editEndLineNumberMaxColumn = initialValue.getTransformer().getLineLength(edit.range.endLineNumber) + 1;
        const survivingEndLineText = initialValue.getValueOfRange(Range.fromPositions(edit.range.getEndPosition(), new Position(edit.range.endLineNumber, editEndLineNumberMaxColumn)));
        newLines[newLines.length - 1] = newLines[newLines.length - 1] + survivingEndLineText;
        // Replacing [startLineNumber, endLineNumberEx) with newLines would be correct, however it might not be minimal.
        const startBeforeNewLine = edit.range.startColumn ===
            initialValue.getTransformer().getLineLength(edit.range.startLineNumber) + 1;
        const endAfterNewLine = edit.range.endColumn === 1;
        if (startBeforeNewLine && newLines[0].length === survivingFirstLineText.length) {
            // the replacement would not delete any text on the first line
            startLineNumber++;
            newLines.shift();
        }
        if (newLines.length > 0 &&
            startLineNumber < endLineNumberEx &&
            endAfterNewLine &&
            newLines[newLines.length - 1].length === survivingEndLineText.length) {
            // the replacement would not delete any text on the last line
            endLineNumberEx--;
            newLines.pop();
        }
        return new SingleLineEdit(new LineRange(startLineNumber, endLineNumberEx), newLines);
    }
    constructor(lineRange, newLines) {
        this.lineRange = lineRange;
        this.newLines = newLines;
    }
    toSingleTextEdit(initialValue) {
        if (this.newLines.length === 0) {
            // Deletion
            const textLen = initialValue.getTransformer().textLength;
            if (this.lineRange.endLineNumberExclusive === textLen.lineCount + 2) {
                let startPos;
                if (this.lineRange.startLineNumber > 1) {
                    const startLineNumber = this.lineRange.startLineNumber - 1;
                    const startColumn = initialValue.getTransformer().getLineLength(startLineNumber) + 1;
                    startPos = new Position(startLineNumber, startColumn);
                }
                else {
                    // Delete everything.
                    // In terms of lines, this would end up with 0 lines.
                    // However, a string has always 1 line (which can be empty).
                    startPos = new Position(1, 1);
                }
                const lastPosition = textLen.addToPosition(new Position(1, 1));
                return new SingleTextEdit(Range.fromPositions(startPos, lastPosition), '');
            }
            else {
                return new SingleTextEdit(new Range(this.lineRange.startLineNumber, 1, this.lineRange.endLineNumberExclusive, 1), '');
            }
        }
        else if (this.lineRange.isEmpty) {
            // Insertion
            let endLineNumber;
            let column;
            let text;
            const insertionLine = this.lineRange.startLineNumber;
            if (insertionLine === initialValue.getTransformer().textLength.lineCount + 2) {
                endLineNumber = insertionLine - 1;
                column = initialValue.getTransformer().getLineLength(endLineNumber) + 1;
                text = this.newLines.map((l) => '\n' + l).join('');
            }
            else {
                endLineNumber = insertionLine;
                column = 1;
                text = this.newLines.map((l) => l + '\n').join('');
            }
            return new SingleTextEdit(Range.fromPositions(new Position(endLineNumber, column)), text);
        }
        else {
            const endLineNumber = this.lineRange.endLineNumberExclusive - 1;
            const endLineNumberMaxColumn = initialValue.getTransformer().getLineLength(endLineNumber) + 1;
            const range = new Range(this.lineRange.startLineNumber, 1, endLineNumber, endLineNumberMaxColumn);
            // Don't add \n to the last line. This is because we subtract one from lineRange.endLineNumberExclusive for endLineNumber.
            const text = this.newLines.join('\n');
            return new SingleTextEdit(range, text);
        }
    }
    toSingleEdit(initialValue) {
        const textEdit = this.toSingleTextEdit(initialValue);
        const range = initialValue.getTransformer().getOffsetRange(textEdit.range);
        return new SingleOffsetEdit(range, textEdit.text);
    }
    toString() {
        return `${this.lineRange}->${JSON.stringify(this.newLines)}`;
    }
    serialize() {
        return [this.lineRange.startLineNumber, this.lineRange.endLineNumberExclusive, this.newLines];
    }
    removeCommonSuffixPrefixLines(initialValue) {
        let startLineNumber = this.lineRange.startLineNumber;
        let endLineNumberEx = this.lineRange.endLineNumberExclusive;
        let trimStartCount = 0;
        while (startLineNumber < endLineNumberEx &&
            trimStartCount < this.newLines.length &&
            this.newLines[trimStartCount] === initialValue.getLineAt(startLineNumber)) {
            startLineNumber++;
            trimStartCount++;
        }
        let trimEndCount = 0;
        while (startLineNumber < endLineNumberEx &&
            trimEndCount + trimStartCount < this.newLines.length &&
            this.newLines[this.newLines.length - 1 - trimEndCount] ===
                initialValue.getLineAt(endLineNumberEx - 1)) {
            endLineNumberEx--;
            trimEndCount++;
        }
        if (trimStartCount === 0 && trimEndCount === 0) {
            return this;
        }
        return new SingleLineEdit(new LineRange(startLineNumber, endLineNumberEx), this.newLines.slice(trimStartCount, this.newLines.length - trimEndCount));
    }
    toLineEdit() {
        return new LineEdit([this]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvbGluZUVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ2xDLE9BQU8sRUFBZ0IsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV0RSxNQUFNLE9BQU8sUUFBUTthQUNHLFVBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUV4QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQXdCO1FBQ2pELE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBZ0IsRUFBRSxZQUEwQjtRQUNsRSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxZQUFZLENB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