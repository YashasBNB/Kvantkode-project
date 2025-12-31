/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
export class InsertFinalNewLineCommand {
    constructor(selection) {
        this._selection = selection;
        this._selectionId = null;
    }
    getEditOperations(model, builder) {
        const op = insertFinalNewLine(model);
        if (op) {
            builder.addEditOperation(op.range, op.text);
        }
        this._selectionId = builder.trackSelection(this._selection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
/**
 * Generate edit operations for inserting a final new line if needed.
 * Returns undefined if no edit is needed.
 */
export function insertFinalNewLine(model) {
    const lineCount = model.getLineCount();
    const lastLine = model.getLineContent(lineCount);
    const lastLineIsEmptyOrWhitespace = strings.lastNonWhitespaceIndex(lastLine) === -1;
    if (!lineCount || lastLineIsEmptyOrWhitespace) {
        return;
    }
    return EditOperation.insert(new Position(lineCount, model.getLineMaxColumn(lineCount)), model.getEOL());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RmluYWxOZXdMaW5lQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luc2VydEZpbmFsTmV3TGluZS9icm93c2VyL2luc2VydEZpbmFsTmV3TGluZUNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVMzRCxNQUFNLE9BQU8seUJBQXlCO0lBSXJDLFlBQVksU0FBb0I7UUFDL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7SUFDekIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEtBQWlCLEVBQUUsT0FBOEI7UUFDekUsTUFBTSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBaUIsRUFBRSxNQUFnQztRQUM1RSxPQUFPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBYSxDQUFDLENBQUE7SUFDdEQsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEtBQWlCO0lBQ25ELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUN0QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sMkJBQTJCLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBRW5GLElBQUksQ0FBQyxTQUFTLElBQUksMkJBQTJCLEVBQUUsQ0FBQztRQUMvQyxPQUFNO0lBQ1AsQ0FBQztJQUVELE9BQU8sYUFBYSxDQUFDLE1BQU0sQ0FDMUIsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsTUFBTSxFQUFFLENBQ2QsQ0FBQTtBQUNGLENBQUMifQ==