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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlQnV0dG9uQ2xpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9oYW5kbGVCdXR0b25DbGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFLekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFpQnBHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FDdEMsT0FBa0MsRUFDbEMsT0FBZ0U7SUFFaEUsTUFBTSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUN4RSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUNoQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFBO0lBRXRCLDREQUE0RDtJQUM1RCxJQUFJLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUM1QixPQUFPLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsc0RBQXNEO0lBQ3RELElBQUksTUFBTSxLQUFLLGFBQWEsRUFBRSxDQUFDO1FBQzlCLDJDQUEyQztRQUMzQyxNQUFNLENBQ0ws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