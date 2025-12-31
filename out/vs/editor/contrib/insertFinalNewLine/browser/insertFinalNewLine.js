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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RmluYWxOZXdMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5zZXJ0RmluYWxOZXdMaW5lL2Jyb3dzZXIvaW5zZXJ0RmluYWxOZXdMaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixZQUFZLEVBQ1osb0JBQW9CLEdBRXBCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsWUFBWTthQUNsQyxPQUFFLEdBQUcsa0NBQWtDLENBQUE7SUFFOUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0JBQXdCLENBQUMsRUFBRTtZQUMvQixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQztZQUNuRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtTQUN4QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFNBQTJCLEVBQUUsTUFBbUIsRUFBRSxJQUFTO1FBQ3JFLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQ3RCLENBQUM7O0FBR0Ysb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQSJ9