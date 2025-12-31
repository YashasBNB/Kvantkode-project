/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DOCS_OPTION } from './constants.js';
import { attachPrompts } from './utils/attachPrompts.js';
import { handleButtonClick } from './utils/handleButtonClick.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { createPromptPickItem } from './utils/createPromptPickItem.js';
import { createPlaceholderText } from './utils/createPlaceholderText.js';
import { extUri } from '../../../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../../../base/common/lifecycle.js';
/**
 * Shows the prompt selection dialog to the user that allows to select a prompt file(s).
 *
 * If {@link ISelectPromptOptions.resource resource} is provided, the dialog will have
 * the resource pre-selected in the prompts list.
 */
export const askToSelectPrompt = async (options) => {
    const { promptFiles, resource, quickInputService, labelService } = options;
    const fileOptions = promptFiles.map((promptFile) => {
        return createPromptPickItem(promptFile, labelService);
    });
    /**
     * Add a link to the documentation to the end of prompts list.
     */
    fileOptions.push(DOCS_OPTION);
    // if a resource is provided, create an `activeItem` for it to pre-select
    // it in the UI, and sort the list so the active item appears at the top
    let activeItem;
    if (resource) {
        activeItem = fileOptions.find((file) => {
            return extUri.isEqual(file.value, resource);
        });
        // if no item for the `resource` was found, it means that the resource is not
        // in the list of prompt files, so add a new item for it; this ensures that
        // the currently active prompt file is always available in the selection dialog,
        // even if it is not included in the prompts list otherwise(from location setting)
        if (!activeItem) {
            activeItem = createPromptPickItem({
                uri: resource,
                // "user" prompts are always registered in the prompts list, hence it
                // should be safe to assume that `resource` is not "user" prompt here
                type: 'local',
            }, labelService);
            fileOptions.push(activeItem);
        }
        fileOptions.sort((file1, file2) => {
            if (extUri.isEqual(file1.value, resource)) {
                return -1;
            }
            if (extUri.isEqual(file2.value, resource)) {
                return 1;
            }
            return 0;
        });
    }
    /**
     * If still no active item present, fall back to the first item in the list.
     * This can happen only if command was invoked not from a focused prompt file
     * (hence the `resource` is not provided in the options).
     *
     * Fixes the two main cases:
     *  - when no prompt files found it, pre-selects the documentation link
     *  - when there is only a single prompt file, pre-selects it
     */
    if (!activeItem) {
        activeItem = fileOptions[0];
    }
    // otherwise show the prompt file selection dialog
    const quickPick = quickInputService.createQuickPick();
    quickPick.activeItems = activeItem ? [activeItem] : [];
    quickPick.placeholder = createPlaceholderText(options);
    quickPick.canAcceptInBackground = true;
    quickPick.matchOnDescription = true;
    quickPick.items = fileOptions;
    const { openerService } = options;
    return await new Promise((resolve) => {
        const disposables = new DisposableStore();
        let lastActiveWidget = options.widget;
        // then the dialog is hidden or disposed for other reason,
        // dispose everything and resolve the main promise
        disposables.add({
            dispose() {
                quickPick.dispose();
                resolve();
                // if something was attached (lastActiveWidget is set), focus on the target chat input
                lastActiveWidget?.focusInput();
            },
        });
        // handle the prompt `accept` event
        disposables.add(quickPick.onDidAccept(async (event) => {
            const { selectedItems } = quickPick;
            // sanity check to confirm our expectations
            assert(selectedItems.length === 1, `Only one item can be accepted, got '${selectedItems.length}'.`);
            const selectedOption = selectedItems[0];
            // whether user selected the docs link option
            const docsSelected = selectedOption === DOCS_OPTION;
            // if documentation item was selected, open its link in a browser
            if (docsSelected) {
                // note that opening a file in editor also hides(disposes) the dialog
                await openerService.open(selectedOption.value);
                return;
            }
            // otherwise attach the selected prompt to a chat input
            lastActiveWidget = await attachPrompts(selectedItems, options, quickPick.keyMods);
            // if user submitted their selection, close the dialog
            if (!event.inBackground) {
                disposables.dispose();
            }
        }));
        // handle the `button click` event on a list item (edit, delete, etc.)
        disposables.add(quickPick.onDidTriggerItemButton(handleButtonClick.bind(null, { quickPick, ...options })));
        // when the dialog is hidden, dispose everything
        disposables.add(quickPick.onDidHide(disposables.dispose.bind(disposables)));
        // finally, reveal the dialog
        quickPick.show();
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrVG9TZWxlY3RQcm9tcHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvYXNrVG9TZWxlY3RQcm9tcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRTVDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBR3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQStDbEY7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsT0FBNkIsRUFBaUIsRUFBRTtJQUN2RixNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFFMUUsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQ2xELE9BQU8sb0JBQW9CLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3RELENBQUMsQ0FBQyxDQUFBO0lBRUY7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