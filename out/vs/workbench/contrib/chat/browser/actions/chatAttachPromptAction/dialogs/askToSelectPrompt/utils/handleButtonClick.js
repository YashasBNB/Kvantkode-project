/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../../nls.js';
import { DELETE_BUTTON, EDIT_BUTTON } from '../constants.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { getCleanPromptName } from '../../../../../../../../../platform/prompts/common/constants.js';
/**
 * Handler for a button click event on a prompt file item in the prompt selection dialog.
 */
export async function handleButtonClick(options, context) {
    const { quickPick, openerService, fileService, dialogService } = options;
    const { item, button } = context;
    const { value } = item;
    // `edit` button was pressed, open the prompt file in editor
    if (button === EDIT_BUTTON) {
        return await openerService.open(value);
    }
    // `delete` button was pressed, delete the prompt file
    if (button === DELETE_BUTTON) {
        // sanity check to confirm our expectations
        assert(quickPick.activeItems.length < 2, `Expected maximum one active item, got '${quickPick.activeItems.length}'.`);
        const activeItem = quickPick.activeItems[0];
        // sanity checks - prompt file exists and is not a folder
        const info = await fileService.stat(value);
        assert(info.isDirectory === false, `'${value.fsPath}' points to a folder.`);
        // don't close the main prompt selection dialog by the confirmation dialog
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        const filename = getCleanPromptName(value);
        const { confirmed } = await dialogService.confirm({
            message: localize('commands.prompts.use.select-dialog.delete-prompt.confirm.message', "Are you sure you want to delete '{0}'?", filename),
        });
        // restore the previous value of the `ignoreFocusOut` property
        quickPick.ignoreFocusOut = previousIgnoreFocusOut;
        // if prompt deletion was not confirmed, nothing to do
        if (!confirmed) {
            return;
        }
        // prompt deletion was confirmed so delete the prompt file
        await fileService.del(value);
        // remove the deleted prompt from the selection dialog list
        let removedIndex = -1;
        quickPick.items = quickPick.items.filter((option, index) => {
            if (option === item) {
                removedIndex = index;
                return false;
            }
            return true;
        });
        // if the deleted item was active item, find a new item to set as active
        if (activeItem && activeItem === item) {
            assert(removedIndex >= 0, 'Removed item index must be a valid index.');
            // we set the previous item as new active, or the next item
            // if removed prompt item was in the beginning of the list
            const newActiveItemIndex = Math.max(removedIndex - 1, 0);
            const newActiveItem = quickPick.items[newActiveItemIndex];
            quickPick.activeItems = newActiveItem ? [newActiveItem] : [];
        }
        return;
    }
    throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlQnV0dG9uQ2xpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvaGFuZGxlQnV0dG9uQ2xpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBS3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBaUJwRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsaUJBQWlCLENBQ3RDLE9BQWtDLEVBQ2xDLE9BQWdFO0lBRWhFLE1BQU0sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFDeEUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFDaEMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQTtJQUV0Qiw0REFBNEQ7SUFDNUQsSUFBSSxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDNUIsT0FBTyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxJQUFJLE1BQU0sS0FBSyxhQUFhLEVBQUUsQ0FBQztRQUM5QiwyQ0FBMkM7UUFDM0MsTUFBTSxDQUNMLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDaEMsMENBQTBDLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQzFFLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBNkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRix5REFBeUQ7UUFDekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLHVCQUF1QixDQUFDLENBQUE7UUFFM0UsMEVBQTBFO1FBQzFFLE1BQU0sc0JBQXNCLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQTtRQUN2RCxTQUFTLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtRQUUvQixNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQ2pELE9BQU8sRUFBRSxRQUFRLENBQ2hCLGtFQUFrRSxFQUNsRSx3Q0FBd0MsRUFDeEMsUUFBUSxDQUNSO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsOERBQThEO1FBQzlELFNBQVMsQ0FBQyxjQUFjLEdBQUcsc0JBQXNCLENBQUE7UUFFakQsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFNO1FBQ1AsQ0FBQztRQUVELDBEQUEwRDtRQUMxRCxNQUFNLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUIsMkRBQTJEO1FBQzNELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDMUQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3JCLFlBQVksR0FBRyxLQUFLLENBQUE7Z0JBRXBCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUE7UUFFRix3RUFBd0U7UUFDeEUsSUFBSSxVQUFVLElBQUksVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxZQUFZLElBQUksQ0FBQyxFQUFFLDJDQUEyQyxDQUFDLENBQUE7WUFFdEUsMkRBQTJEO1lBQzNELDBEQUEwRDtZQUMxRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN4RCxNQUFNLGFBQWEsR0FDbEIsU0FBUyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBRXBDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDN0QsQ0FBQztRQUVELE9BQU07SUFDUCxDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDL0QsQ0FBQyJ9