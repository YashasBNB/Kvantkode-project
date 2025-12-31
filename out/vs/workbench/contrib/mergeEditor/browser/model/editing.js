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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvZWRpdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBSWxFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxhQUFhO0lBQ3pCLFlBQ2lCLEtBQWdCLEVBQ2hCLFFBQWtCO1FBRGxCLFVBQUssR0FBTCxLQUFLLENBQVc7UUFDaEIsYUFBUSxHQUFSLFFBQVEsQ0FBVTtJQUNoQyxDQUFDO0lBRUcsTUFBTSxDQUFDLEtBQW9CO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRU0sT0FBTyxDQUFDLGNBQXNCO1FBQ3BDLE9BQU8sSUFBSSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUNyQixZQUNpQixLQUFZLEVBQ1osT0FBZTtRQURmLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQzdCLENBQUM7SUFFRyxNQUFNLENBQUMsS0FBZ0I7UUFDN0IsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQTtJQUNwRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQUNyQixZQUE0QixLQUErQjtRQUEvQixVQUFLLEdBQUwsS0FBSyxDQUEwQjtJQUFHLENBQUM7SUFFeEQsT0FBTyxDQUFDLGNBQXNCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3RELE9BQU87b0JBQ04sS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztvQkFDL0UsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztpQkFDOUMsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxPQUFPO29CQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQy9ELElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7aUJBQzNCLENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTztnQkFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQ2YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUMzQixNQUFNLENBQUMsZ0JBQWdCLEVBQ3ZCLGNBQWMsRUFDZCxNQUFNLENBQUMsZ0JBQWdCLENBQ3ZCO2dCQUNELElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDOUMsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=