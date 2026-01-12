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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9saW5lRWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDbEMsT0FBTyxFQUFnQixjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXRFLE1BQU0sT0FBTyxRQUFRO2FBQ0csVUFBSyxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRXhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBd0I7UUFDakQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFnQixFQUFFLFlBQTBCO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzVELE9BQU8sUUFBUSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBYyxFQUFFLFlBQTBCO1FBQ3BFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7UUFFeEIsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFBO1FBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JCLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ3JFLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdkIsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdkYsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUN2RSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUV2QixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ2xGLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFnQztRQUNoRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUM1RSxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRDtJQUNDOztPQUVHO0lBQ2EsS0FBZ0M7UUFBaEMsVUFBSyxHQUFMLEtBQUssQ0FBMkI7UUFFaEQsTUFBTSxDQUNMLGtCQUFrQixDQUNqQixLQUFLLEVBQ0wsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLHNCQUFzQixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUMvRSxDQUNELENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFlBQTBCO1FBQ3ZDLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7UUFDcEMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVNLGdCQUFnQjtRQUN0QixNQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFBO1FBQzlCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLE1BQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sYUFBYSxDQUFDLFVBQWtCO1FBQ3RDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQ3JELE1BQUs7WUFDTixDQUFDO1lBRUQsU0FBUyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFBO1FBQ3BELENBQUM7UUFDRCxPQUFPLFVBQVUsR0FBRyxTQUFTLENBQUE7SUFDOUIsQ0FBQztJQUVNLFlBQVksQ0FBQyxTQUFvQjtRQUN2QyxPQUFPLElBQUksU0FBUyxDQUNuQixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsRUFDN0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FDcEQsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBYztRQUMzQixPQUFPLElBQUksUUFBUSxDQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQ3JGLENBQUE7SUFDRixDQUFDO0lBRU0sa0JBQWtCLENBQUMsYUFBdUI7UUFDaEQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBRTNCLFNBQVMsUUFBUSxDQUNoQixrQkFBMEIsRUFDMUIsa0JBQTBCLEVBQzFCLElBQXdDLEVBQ3hDLE9BQTJCO1lBRTNCLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7WUFFaEYsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sR0FBRywwQ0FBMEMsQ0FBQTtZQUNyRCxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQ1gsa0JBQWtCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNuRixNQUFNLEtBQUssR0FDVixrQkFBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRW5GLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLElBQUksTUFBTSxJQUFJLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxTQUFTLGFBQWE7WUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQixDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQTtRQUVoQixLQUFLLE1BQU0sS0FBSyxJQUFJLGVBQWUsQ0FDbEMsSUFBSSxDQUFDLEtBQUssRUFDVixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQzNELEVBQUUsQ0FBQztZQUNILElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixhQUFhLEVBQUUsQ0FBQTtZQUNoQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxHQUFHLEtBQUssQ0FBQTtZQUNkLENBQUM7WUFFRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFFM0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDbkYsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQy9ELENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQTtnQkFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtnQkFDOUIsS0FBSyxNQUFNLGlCQUFpQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2hFLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDakQsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztnQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3hCLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO2dCQUVELGNBQWMsR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUE7Z0JBRTdDLFNBQVMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtZQUMxRCxDQUFDO1lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxjQUFjLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0YsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUFlO1FBQzNCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUUzQixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQTtRQUV4QixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixPQUFPLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BDLGdCQUFnQixFQUFFLENBQUE7WUFDbkIsQ0FBQztZQUVELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3JCLENBQUM7WUFFRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsT0FBTyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLGdCQUFnQixFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLFlBQVksS0FBSSxDQUFDOztBQUd6QixNQUFNLE9BQU8sY0FBYztJQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLENBQTJCO1FBQ3BELE9BQU8sSUFBSSxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFTSxNQUFNLENBQUMsa0JBQWtCLENBQy9CLElBQW9CLEVBQ3BCLFlBQTBCO1FBRTFCLFlBQVk7UUFDWixZQUFZO1FBQ1osYUFBYTtRQUViLGdCQUFnQjtRQUVoQixVQUFVO1FBQ1YsVUFBVTtRQUNWLFVBQVU7UUFFVixnREFBZ0Q7UUFFaEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtRQUNoRCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQzFELEtBQUssQ0FBQyxhQUFhLENBQ2xCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQzdCLENBQ0QsQ0FBQTtRQUNELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sMEJBQTBCLEdBQy9CLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUUsTUFBTSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUN4RCxLQUFLLENBQUMsYUFBYSxDQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUMzQixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSwwQkFBMEIsQ0FBQyxDQUNsRSxDQUNELENBQUE7UUFDRCxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxvQkFBb0IsQ0FBQTtRQUVwRixnSEFBZ0g7UUFFaEgsTUFBTSxrQkFBa0IsR0FDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQ3RCLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDNUUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFBO1FBRWxELElBQUksa0JBQWtCLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoRiw4REFBOEQ7WUFDOUQsZUFBZSxFQUFFLENBQUE7WUFDakIsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUNDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNuQixlQUFlLEdBQUcsZUFBZTtZQUNqQyxlQUFlO1lBQ2YsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLG9CQUFvQixDQUFDLE1BQU0sRUFDbkUsQ0FBQztZQUNGLDZEQUE2RDtZQUM3RCxlQUFlLEVBQUUsQ0FBQTtZQUNqQixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDZixDQUFDO1FBRUQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVELFlBQ2lCLFNBQW9CLEVBQ3BCLFFBQTJCO1FBRDNCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7SUFDekMsQ0FBQztJQUVHLGdCQUFnQixDQUFDLFlBQTBCO1FBQ2pELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsV0FBVztZQUNYLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUE7WUFDeEQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixLQUFLLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLElBQUksUUFBa0IsQ0FBQTtnQkFDdEIsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFBO29CQUMxRCxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDcEYsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDdEQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHFCQUFxQjtvQkFDckIscURBQXFEO29CQUNyRCw0REFBNEQ7b0JBQzVELFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzlCLENBQUM7Z0JBRUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMzRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxJQUFJLGNBQWMsQ0FDeEIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQ3RGLEVBQUUsQ0FDRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsWUFBWTtZQUVaLElBQUksYUFBcUIsQ0FBQTtZQUN6QixJQUFJLE1BQWMsQ0FBQTtZQUNsQixJQUFJLElBQVksQ0FBQTtZQUNoQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQTtZQUNwRCxJQUFJLGFBQWEsS0FBSyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUUsYUFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7Z0JBQ2pDLE1BQU0sR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ25ELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLEdBQUcsYUFBYSxDQUFBO2dCQUM3QixNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNWLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksUUFBUSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUE7WUFDL0QsTUFBTSxzQkFBc0IsR0FBRyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3RixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQzlCLENBQUMsRUFDRCxhQUFhLEVBQ2Isc0JBQXNCLENBQ3RCLENBQUE7WUFDRCwwSEFBMEg7WUFDMUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFFTSxZQUFZLENBQUMsWUFBMEI7UUFDN0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3BELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFFLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQTtJQUM3RCxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM5RixDQUFDO0lBRU0sNkJBQTZCLENBQUMsWUFBMEI7UUFDOUQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUE7UUFDcEQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQTtRQUUzRCxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFDdEIsT0FDQyxlQUFlLEdBQUcsZUFBZTtZQUNqQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssWUFBWSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsRUFDeEUsQ0FBQztZQUNGLGVBQWUsRUFBRSxDQUFBO1lBQ2pCLGNBQWMsRUFBRSxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDcEIsT0FDQyxlQUFlLEdBQUcsZUFBZTtZQUNqQyxZQUFZLEdBQUcsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtZQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUM7Z0JBQ3JELFlBQVksQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxFQUMzQyxDQUFDO1lBQ0YsZUFBZSxFQUFFLENBQUE7WUFDakIsWUFBWSxFQUFFLENBQUE7UUFDZixDQUFDO1FBRUQsSUFBSSxjQUFjLEtBQUssQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksY0FBYyxDQUN4QixJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FDeEUsQ0FBQTtJQUNGLENBQUM7SUFFTSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7Q0FDRCJ9