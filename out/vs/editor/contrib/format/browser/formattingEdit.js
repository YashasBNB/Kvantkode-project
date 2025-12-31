/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
export class FormattingEdit {
    static _handleEolEdits(editor, edits) {
        let newEol = undefined;
        const singleEdits = [];
        for (const edit of edits) {
            if (typeof edit.eol === 'number') {
                newEol = edit.eol;
            }
            if (edit.range && typeof edit.text === 'string') {
                singleEdits.push(edit);
            }
        }
        if (typeof newEol === 'number') {
            if (editor.hasModel()) {
                editor.getModel().pushEOL(newEol);
            }
        }
        return singleEdits;
    }
    static _isFullModelReplaceEdit(editor, edit) {
        if (!editor.hasModel()) {
            return false;
        }
        const model = editor.getModel();
        const editRange = model.validateRange(edit.range);
        const fullModelRange = model.getFullModelRange();
        return fullModelRange.equalsRange(editRange);
    }
    static execute(editor, _edits, addUndoStops) {
        if (addUndoStops) {
            editor.pushUndoStop();
        }
        const scrollState = StableEditorScrollState.capture(editor);
        const edits = FormattingEdit._handleEolEdits(editor, _edits);
        if (edits.length === 1 && FormattingEdit._isFullModelReplaceEdit(editor, edits[0])) {
            // We use replace semantics and hope that markers stay put...
            editor.executeEdits('formatEditsCommand', edits.map((edit) => EditOperation.replace(Range.lift(edit.range), edit.text)));
        }
        else {
            editor.executeEdits('formatEditsCommand', edits.map((edit) => EditOperation.replaceMove(Range.lift(edit.range), edit.text)));
        }
        if (addUndoStops) {
            editor.pushUndoStop();
        }
        scrollState.restoreRelativeVerticalPositionOfCursor(editor);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGluZ0VkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb3JtYXQvYnJvd3Nlci9mb3JtYXR0aW5nRWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRixNQUFNLE9BQU8sY0FBYztJQUNsQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQW1CLEVBQUUsS0FBaUI7UUFDcEUsSUFBSSxNQUFNLEdBQWtDLFNBQVMsQ0FBQTtRQUNyRCxNQUFNLFdBQVcsR0FBMkIsRUFBRSxDQUFBO1FBRTlDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO1lBQ2xCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNqRCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUN2QixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFtQixFQUFFLElBQTBCO1FBQ3JGLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDL0IsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDaEQsT0FBTyxjQUFjLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQW1CLEVBQUUsTUFBa0IsRUFBRSxZQUFxQjtRQUM1RSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksY0FBYyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BGLDZEQUE2RDtZQUM3RCxNQUFNLENBQUMsWUFBWSxDQUNsQixvQkFBb0IsRUFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDN0UsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLFlBQVksQ0FDbEIsb0JBQW9CLEVBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ2pGLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUNELFdBQVcsQ0FBQyx1Q0FBdUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0NBQ0QifQ==