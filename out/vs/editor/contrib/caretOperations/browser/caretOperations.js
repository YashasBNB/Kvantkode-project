/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { MoveCaretCommand } from './moveCaretCommand.js';
import * as nls from '../../../../nls.js';
class MoveCaretAction extends EditorAction {
    constructor(left, opts) {
        super(opts);
        this.left = left;
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const commands = [];
        const selections = editor.getSelections();
        for (const selection of selections) {
            commands.push(new MoveCaretCommand(selection, this.left));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
class MoveCaretLeftAction extends MoveCaretAction {
    constructor() {
        super(true, {
            id: 'editor.action.moveCarretLeftAction',
            label: nls.localize2('caret.moveLeft', 'Move Selected Text Left'),
            precondition: EditorContextKeys.writable,
        });
    }
}
class MoveCaretRightAction extends MoveCaretAction {
    constructor() {
        super(false, {
            id: 'editor.action.moveCarretRightAction',
            label: nls.localize2('caret.moveRight', 'Move Selected Text Right'),
            precondition: EditorContextKeys.writable,
        });
    }
}
registerEditorAction(MoveCaretLeftAction);
registerEditorAction(MoveCaretRightAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY2FyZXRPcGVyYXRpb25zL2Jyb3dzZXIvY2FyZXRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixZQUFZLEVBRVosb0JBQW9CLEdBRXBCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxNQUFNLGVBQWdCLFNBQVEsWUFBWTtJQUd6QyxZQUFZLElBQWEsRUFBRSxJQUFvQjtRQUM5QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFWCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUV6QyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQ3RCLENBQUM7Q0FDRDtBQUVELE1BQU0sbUJBQW9CLFNBQVEsZUFBZTtJQUNoRDtRQUNDLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDWCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixDQUFDO1lBQ2pFLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1NBQ3hDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sb0JBQXFCLFNBQVEsZUFBZTtJQUNqRDtRQUNDLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDWixFQUFFLEVBQUUscUNBQXFDO1lBQ3pDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLDBCQUEwQixDQUFDO1lBQ25FLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1NBQ3hDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDekMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQSJ9