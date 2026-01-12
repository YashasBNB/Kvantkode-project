/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { InsertFinalNewLineCommand } from './insertFinalNewLineCommand.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
export class InsertFinalNewLineAction extends EditorAction {
    static { this.ID = 'editor.action.insertFinalNewLine'; }
    constructor() {
        super({
            id: InsertFinalNewLineAction.ID,
            label: nls.localize2('insertFinalNewLine', 'Insert Final New Line'),
            precondition: EditorContextKeys.writable,
        });
    }
    run(_accessor, editor, args) {
        const selection = editor.getSelection();
        if (selection === null) {
            return;
        }
        const command = new InsertFinalNewLineCommand(selection);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
    }
}
registerEditorAction(InsertFinalNewLineAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RmluYWxOZXdMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbnNlcnRGaW5hbE5ld0xpbmUvYnJvd3Nlci9pbnNlcnRGaW5hbE5ld0xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLFlBQVksRUFDWixvQkFBb0IsR0FFcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxZQUFZO2FBQ2xDLE9BQUUsR0FBRyxrQ0FBa0MsQ0FBQTtJQUU5RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxFQUFFO1lBQy9CLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixDQUFDO1lBQ25FLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1NBQ3hDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxHQUFHLENBQUMsU0FBMkIsRUFBRSxNQUFtQixFQUFFLElBQVM7UUFDckUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3ZDLElBQUksU0FBUyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUV4RCxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDdEIsQ0FBQzs7QUFHRixvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBIn0=