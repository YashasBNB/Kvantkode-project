/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../../base/common/arrays.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit, TextEdit } from '../../../../common/core/textEdit.js';
import { LineDecoration } from '../../../../common/viewLayout/lineDecorations.js';
export class GhostText {
    constructor(lineNumber, parts) {
        this.lineNumber = lineNumber;
        this.parts = parts;
    }
    equals(other) {
        return (this.lineNumber === other.lineNumber &&
            this.parts.length === other.parts.length &&
            this.parts.every((part, index) => part.equals(other.parts[index])));
    }
    /**
     * Only used for testing/debugging.
     */
    render(documentText, debug = false) {
        return new TextEdit([
            ...this.parts.map((p) => new SingleTextEdit(Range.fromPositions(new Position(this.lineNumber, p.column)), debug
                ? `[${p.lines.map((line) => line.line).join('\n')}]`
                : p.lines.map((line) => line.line).join('\n'))),
        ]).applyToString(documentText);
    }
    renderForScreenReader(lineText) {
        if (this.parts.length === 0) {
            return '';
        }
        const lastPart = this.parts[this.parts.length - 1];
        const cappedLineText = lineText.substr(0, lastPart.column - 1);
        const text = new TextEdit([
            ...this.parts.map((p) => new SingleTextEdit(Range.fromPositions(new Position(1, p.column)), p.lines.map((line) => line.line).join('\n'))),
        ]).applyToString(cappedLineText);
        return text.substring(this.parts[0].column - 1);
    }
    isEmpty() {
        return this.parts.every((p) => p.lines.length === 0);
    }
    get lineCount() {
        return 1 + this.parts.reduce((r, p) => r + p.lines.length - 1, 0);
    }
}
export class GhostTextPart {
    constructor(column, text, 
    /**
     * Indicates if this part is a preview of an inline suggestion when a suggestion is previewed.
     */
    preview, _inlineDecorations = []) {
        this.column = column;
        this.text = text;
        this.preview = preview;
        this._inlineDecorations = _inlineDecorations;
        this.lines = splitLines(this.text).map((line, i) => ({
            line,
            lineDecorations: LineDecoration.filter(this._inlineDecorations, i + 1, 1, line.length + 1),
        }));
    }
    equals(other) {
        return (this.column === other.column &&
            this.lines.length === other.lines.length &&
            this.lines.every((line, index) => line.line === other.lines[index].line &&
                LineDecoration.equalsArr(line.lineDecorations, other.lines[index].lineDecorations)));
    }
}
export class GhostTextReplacement {
    constructor(lineNumber, columnRange, text, additionalReservedLineCount = 0) {
        this.lineNumber = lineNumber;
        this.columnRange = columnRange;
        this.text = text;
        this.additionalReservedLineCount = additionalReservedLineCount;
        this.parts = [new GhostTextPart(this.columnRange.endColumnExclusive, this.text, false)];
        this.newLines = splitLines(this.text);
    }
    renderForScreenReader(_lineText) {
        return this.newLines.join('\n');
    }
    render(documentText, debug = false) {
        const replaceRange = this.columnRange.toRange(this.lineNumber);
        if (debug) {
            return new TextEdit([
                new SingleTextEdit(Range.fromPositions(replaceRange.getStartPosition()), '('),
                new SingleTextEdit(Range.fromPositions(replaceRange.getEndPosition()), `)[${this.newLines.join('\n')}]`),
            ]).applyToString(documentText);
        }
        else {
            return new TextEdit([
                new SingleTextEdit(replaceRange, this.newLines.join('\n')),
            ]).applyToString(documentText);
        }
    }
    get lineCount() {
        return this.newLines.length;
    }
    isEmpty() {
        return this.parts.every((p) => p.lines.length === 0);
    }
    equals(other) {
        return (this.lineNumber === other.lineNumber &&
            this.columnRange.equals(other.columnRange) &&
            this.newLines.length === other.newLines.length &&
            this.newLines.every((line, index) => line === other.newLines[index]) &&
            this.additionalReservedLineCount === other.additionalReservedLineCount);
    }
}
export function ghostTextsOrReplacementsEqual(a, b) {
    return equals(a, b, ghostTextOrReplacementEquals);
}
export function ghostTextOrReplacementEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a instanceof GhostText && b instanceof GhostText) {
        return a.equals(b);
    }
    if (a instanceof GhostTextReplacement && b instanceof GhostTextReplacement) {
        return a.equals(b);
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9naG9zdFRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBSWpGLE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQ2lCLFVBQWtCLEVBQ2xCLEtBQXNCO1FBRHRCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsVUFBSyxHQUFMLEtBQUssQ0FBaUI7SUFDcEMsQ0FBQztJQUVKLE1BQU0sQ0FBQyxLQUFnQjtRQUN0QixPQUFPLENBQ04sSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVTtZQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUNsRSxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxD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