/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CommandsRegistry, } from '../../../../platform/commands/common/commands.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuRegistry, MenuId, isIMenuItem } from '../../../../platform/actions/common/actions.js';
export function getAllUnboundCommands(boundCommands) {
    const unboundCommands = [];
    const seenMap = new Map();
    const addCommand = (id, includeCommandWithArgs) => {
        if (seenMap.has(id)) {
            return;
        }
        seenMap.set(id, true);
        if (id[0] === '_' || id.indexOf('vscode.') === 0) {
            // private command
            return;
        }
        if (boundCommands.get(id) === true) {
            return;
        }
        if (!includeCommandWithArgs) {
            const command = CommandsRegistry.getCommand(id);
            if (command &&
                typeof command.metadata === 'object' &&
                isNonEmptyArray(command.metadata.args)) {
                // command with args
                return;
            }
        }
        unboundCommands.push(id);
    };
    // Add all commands from Command Palette
    for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
        if (isIMenuItem(menuItem)) {
            addCommand(menuItem.command.id, true);
        }
    }
    // Add all editor actions
    for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
        addCommand(editorAction.id, true);
    }
    for (const id of CommandsRegistry.getCommands().keys()) {
        addCommand(id, false);
    }
    return unboundCommands;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5ib3VuZENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvYnJvd3Nlci91bmJvdW5kQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRyxNQUFNLFVBQVUscUJBQXFCLENBQUMsYUFBbUM7SUFDeEUsTUFBTSxlQUFlLEdBQWEsRUFBRSxDQUFBO0lBQ3BDLE1BQU0sT0FBTyxHQUF5QixJQUFJLEdBQUcsRUFBbUIsQ0FBQTtJQUNoRSxNQUFNLFVBQVUsR0FBRyxDQUFDLEVBQVUsRUFBRSxzQkFBK0IsRUFBRSxFQUFFO1FBQ2xFLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckIsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEQsa0JBQWtCO1lBQ2xCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3BDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0IsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLElBQ0MsT0FBTztnQkFDUCxPQUFPLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUTtnQkFDcEMsZUFBZSxDQUFvQixPQUFPLENBQUMsUUFBUyxDQUFDLElBQUksQ0FBQyxFQUN6RCxDQUFDO2dCQUNGLG9CQUFvQjtnQkFDcEIsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBQ0QsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN6QixDQUFDLENBQUE7SUFFRCx3Q0FBd0M7SUFDeEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQ3pFLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRUQseUJBQXlCO0lBQ3pCLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1FBQ3hFLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxLQUFLLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7UUFDeEQsVUFBVSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsT0FBTyxlQUFlLENBQUE7QUFDdkIsQ0FBQyJ9