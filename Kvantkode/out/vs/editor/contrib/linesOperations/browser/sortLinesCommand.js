/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
export class SortLinesCommand {
    static { this._COLLATOR = null; }
    static getCollator() {
        if (!SortLinesCommand._COLLATOR) {
            SortLinesCommand._COLLATOR = new Intl.Collator();
        }
        return SortLinesCommand._COLLATOR;
    }
    constructor(selection, descending) {
        this.selection = selection;
        this.descending = descending;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        const op = sortLines(model, this.selection, this.descending);
        if (op) {
            builder.addEditOperation(op.range, op.text);
        }
        this.selectionId = builder.trackSelection(this.selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
    static canRun(model, selection, descending) {
        if (model === null) {
            return false;
        }
        const data = getSortData(model, selection, descending);
        if (!data) {
            return false;
        }
        for (let i = 0, len = data.before.length; i < len; i++) {
            if (data.before[i] !== data.after[i]) {
                return true;
            }
        }
        return false;
    }
}
function getSortData(model, selection, descending) {
    const startLineNumber = selection.startLineNumber;
    let endLineNumber = selection.endLineNumber;
    if (selection.endColumn === 1) {
        endLineNumber--;
    }
    // Nothing to sort if user didn't select anything.
    if (startLineNumber >= endLineNumber) {
        return null;
    }
    const linesToSort = [];
    // Get the contents of the selection to be sorted.
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        linesToSort.push(model.getLineContent(lineNumber));
    }
    let sorted = linesToSort.slice(0);
    sorted.sort(SortLinesCommand.getCollator().compare);
    // If descending, reverse the order.
    if (descending === true) {
        sorted = sorted.reverse();
    }
    return {
        startLineNumber: startLineNumber,
        endLineNumber: endLineNumber,
        before: linesToSort,
        after: sorted,
    };
}
/**
 * Generate commands for sorting lines on a model.
 */
function sortLines(model, selection, descending) {
    const data = getSortData(model, selection, descending);
    if (!data) {
        return null;
    }
    return EditOperation.replace(new Range(data.startLineNumber, 1, data.endLineNumber, model.getLineMaxColumn(data.endLineNumber)), data.after.join('\n'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydExpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGluZXNPcGVyYXRpb25zL2Jyb3dzZXIvc29ydExpbmVzQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQVNyRCxNQUFNLE9BQU8sZ0JBQWdCO2FBQ2IsY0FBUyxHQUF5QixJQUFJLENBQUE7SUFDOUMsTUFBTSxDQUFDLFdBQVc7UUFDeEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUE7SUFDbEMsQ0FBQztJQU1ELFlBQVksU0FBb0IsRUFBRSxVQUFtQjtRQUNwRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtJQUN4QixDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVELElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7UUFD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