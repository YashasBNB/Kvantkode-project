/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../../base/common/arrays.js';
import { Range } from '../../../../../editor/common/core/range.js';
/**
 * Represents an edit, expressed in whole lines:
 * At (before) {@link LineRange.startLineNumber}, delete {@link LineRange.lineCount} many lines and insert {@link newLines}.
 */
export class LineRangeEdit {
    constructor(range, newLines) {
        this.range = range;
        this.newLines = newLines;
    }
    equals(other) {
        return this.range.equals(other.range) && equals(this.newLines, other.newLines);
    }
    toEdits(modelLineCount) {
        return new LineEdits([this]).toEdits(modelLineCount);
    }
}
export class RangeEdit {
    constructor(range, newText) {
        this.range = range;
        this.newText = newText;
    }
    equals(other) {
        return Range.equalsRange(this.range, other.range) && this.newText === other.newText;
    }
}
export class LineEdits {
    constructor(edits) {
        this.edits = edits;
    }
    toEdits(modelLineCount) {
        return this.edits.map((e) => {
            if (e.range.endLineNumberExclusive <= modelLineCount) {
                return {
                    range: new Range(e.range.startLineNumber, 1, e.range.endLineNumberExclusive, 1),
                    text: e.newLines.map((s) => s + '\n').join(''),
                };
            }
            if (e.range.startLineNumber === 1) {
                return {
                    range: new Range(1, 1, modelLineCount, Number.MAX_SAFE_INTEGER),
                    text: e.newLines.join('\n'),
                };
            }
            return {
                range: new Range(e.range.startLineNumber - 1, Number.MAX_SAFE_INTEGER, modelLineCount, Number.MAX_SAFE_INTEGER),
                text: e.newLines.map((s) => '\n' + s).join(''),
            };
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9lZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFJbEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFDekIsWUFDaUIsS0FBZ0IsRUFDaEIsUUFBa0I7UUFEbEIsVUFBSyxHQUFMLEtBQUssQ0FBVztRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUFVO0lBQ2hDLENBQUM7SUFFRyxNQUFNLENBQUMsS0FBb0I7UUFDakMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTSxPQUFPLENBQUMsY0FBc0I7UUFDcEMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQ2lCLEtBQVksRUFDWixPQUFlO1FBRGYsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFlBQU8sR0FBUCxPQUFPLENBQVE7SUFDN0IsQ0FBQztJQUVHLE1BQU0sQ0FBQyxLQUFnQjtRQUM3QixPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsT0FBTyxDQUFBO0lBQ3BGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQTRCLEtBQStCO1FBQS9CLFVBQUssR0FBTCxLQUFLLENBQTBCO0lBQUcsQ0FBQztJQUV4RCxPQUFPLENBQUMsY0FBc0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDdEQsT0FBTztvQkFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO29CQUMvRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2lCQUM5QyxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE9BQU87b0JBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDL0QsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDM0IsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPO2dCQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FDZixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQzNCLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDdkIsY0FBYyxFQUNkLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdkI7Z0JBQ0QsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUM5QyxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==