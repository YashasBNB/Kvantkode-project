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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwb3NlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY2FyZXRPcGVyYXRpb25zL2Jyb3dzZXIvdHJhbnNwb3NlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFDTixZQUFZLEVBQ1osb0JBQW9CLEdBRXBCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxNQUFNLHNCQUF1QixTQUFRLFlBQVk7SUFDaEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0NBQWdDO1lBQ3BDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLG1CQUFtQixDQUFDO1lBQ25FLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1lBQ3hDLE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsY0FBYztnQkFDeEMsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxnREFBNkI7aUJBQ3RDO2dCQUNELE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBRXpDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUE7WUFDNUMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQTtZQUVwQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFFckQsSUFBSSxVQUFVLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDOUUsc0NBQXNDO2dCQUN0QyxTQUFRO1lBQ1QsQ0FBQztZQUVELHFFQUFxRTtZQUNyRSw0Q0FBNEM7WUFDNUMsTUFBTSxXQUFXLEdBQ2hCLE1BQU0sS0FBSyxVQUFVO2dCQUNwQixDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtnQkFDekIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQzVCLEtBQUssRUFDTCxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxFQUNsQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUM5QixDQUFBO1lBRUosTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDdEUsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFFeEUsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtZQUV6RixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUNwRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN0RSxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDekMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBIn0=