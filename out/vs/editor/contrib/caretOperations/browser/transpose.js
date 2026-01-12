/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { ReplaceCommand } from '../../../common/commands/replaceCommand.js';
import { MoveOperations } from '../../../common/cursor/cursorMoveOperations.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
class TransposeLettersAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.transposeLetters',
            label: nls.localize2('transposeLetters.label', 'Transpose Letters'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 50 /* KeyCode.KeyT */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const commands = [];
        const selections = editor.getSelections();
        for (const selection of selections) {
            if (!selection.isEmpty()) {
                continue;
            }
            const lineNumber = selection.startLineNumber;
            const column = selection.startColumn;
            const lastColumn = model.getLineMaxColumn(lineNumber);
            if (lineNumber === 1 && (column === 1 || (column === 2 && lastColumn === 2))) {
                // at beginning of file, nothing to do
                continue;
            }
            // handle special case: when at end of line, transpose left two chars
            // otherwise, transpose left and right chars
            const endPosition = column === lastColumn
                ? selection.getPosition()
                : MoveOperations.rightPosition(model, selection.getPosition().lineNumber, selection.getPosition().column);
            const middlePosition = MoveOperations.leftPosition(model, endPosition);
            const beginPosition = MoveOperations.leftPosition(model, middlePosition);
            const leftChar = model.getValueInRange(Range.fromPositions(beginPosition, middlePosition));
            const rightChar = model.getValueInRange(Range.fromPositions(middlePosition, endPosition));
            const replaceRange = Range.fromPositions(beginPosition, endPosition);
            commands.push(new ReplaceCommand(replaceRange, rightChar + leftChar));
        }
        if (commands.length > 0) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, commands);
            editor.pushUndoStop();
        }
    }
}
registerEditorAction(TransposeLettersAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwb3NlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jYXJldE9wZXJhdGlvbnMvYnJvd3Nlci90cmFuc3Bvc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUNOLFlBQVksRUFDWixvQkFBb0IsR0FFcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE1BQU0sc0JBQXVCLFNBQVEsWUFBWTtJQUNoRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7WUFDcEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLENBQUM7WUFDbkUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDeEMsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxjQUFjO2dCQUN4QyxPQUFPLEVBQUUsQ0FBQztnQkFDVixHQUFHLEVBQUU7b0JBQ0osT0FBTyxFQUFFLGdEQUE2QjtpQkFDdEM7Z0JBQ0QsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7UUFFekMsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzFCLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQTtZQUM1QyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFBO1lBRXBDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUVyRCxJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxzQ0FBc0M7Z0JBQ3RDLFNBQVE7WUFDVCxDQUFDO1lBRUQscUVBQXFFO1lBQ3JFLDRDQUE0QztZQUM1QyxNQUFNLFdBQVcsR0FDaEIsTUFBTSxLQUFLLFVBQVU7Z0JBQ3BCLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFO2dCQUN6QixDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FDNUIsS0FBSyxFQUNMLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLEVBQ2xDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQzlCLENBQUE7WUFFSixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUN0RSxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUV4RSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7WUFDMUYsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBRXpGLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3BFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN6QyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUEifQ==