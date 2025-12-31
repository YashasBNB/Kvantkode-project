/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class CopyLinesCommand {
    constructor(selection, isCopyingDown, noop) {
        this._selection = selection;
        this._isCopyingDown = isCopyingDown;
        this._noop = noop || false;
        this._selectionDirection = 0 /* SelectionDirection.LTR */;
        this._selectionId = null;
        this._startLineNumberDelta = 0;
        this._endLineNumberDelta = 0;
    }
    getEditOperations(model, builder) {
        let s = this._selection;
        this._startLineNumberDelta = 0;
        this._endLineNumberDelta = 0;
        if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
            this._endLineNumberDelta = 1;
            s = s.setEndPosition(s.endLineNumber - 1, model.getLineMaxColumn(s.endLineNumber - 1));
        }
        const sourceLines = [];
        for (let i = s.startLineNumber; i <= s.endLineNumber; i++) {
            sourceLines.push(model.getLineContent(i));
        }
        const sourceText = sourceLines.join('\n');
        if (sourceText === '') {
            // Duplicating empty line
            if (this._isCopyingDown) {
                this._startLineNumberDelta++;
                this._endLineNumberDelta++;
            }
        }
        if (this._noop) {
            builder.addEditOperation(new Range(s.endLineNumber, model.getLineMaxColumn(s.endLineNumber), s.endLineNumber + 1, 1), s.endLineNumber === model.getLineCount() ? '' : '\n');
        }
        else {
            if (!this._isCopyingDown) {
                builder.addEditOperation(new Range(s.endLineNumber, model.getLineMaxColumn(s.endLineNumber), s.endLineNumber, model.getLineMaxColumn(s.endLineNumber)), '\n' + sourceText);
            }
            else {
                builder.addEditOperation(new Range(s.startLineNumber, 1, s.startLineNumber, 1), sourceText + '\n');
            }
        }
        this._selectionId = builder.trackSelection(s);
        this._selectionDirection = this._selection.getDirection();
    }
    computeCursorState(model, helper) {
        let result = helper.getTrackedSelection(this._selectionId);
        if (this._startLineNumberDelta !== 0 || this._endLineNumberDelta !== 0) {
            let startLineNumber = result.startLineNumber;
            let startColumn = result.startColumn;
            let endLineNumber = result.endLineNumber;
            let endColumn = result.endColumn;
            if (this._startLineNumberDelta !== 0) {
                startLineNumber = startLineNumber + this._startLineNumberDelta;
                startColumn = 1;
            }
            if (this._endLineNumberDelta !== 0) {
                endLineNumber = endLineNumber + this._endLineNumberDelta;
                endColumn = 1;
            }
            result = Selection.createWithDirection(startLineNumber, startColumn, endLineNumber, endColumn, this._selectionDirection);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weUxpbmVzQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmVzT3BlcmF0aW9ucy9icm93c2VyL2NvcHlMaW5lc0NvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0sbUNBQW1DLENBQUE7QUFRakYsTUFBTSxPQUFPLGdCQUFnQjtJQVU1QixZQUFZLFNBQW9CLEVBQUUsYUFBc0IsRUFBRSxJQUFjO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLEtBQUssQ0FBQTtRQUMxQixJQUFJLENBQUMsbUJBQW1CLGlDQUF5QixDQUFBO1FBQ2pELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBRXZCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyxtQkFBbUIs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