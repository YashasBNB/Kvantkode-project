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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrVG9TZWxlY3RQcm9tcHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC9hc2tUb1NlbGVjdFByb21wdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFNUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBK0NsRjs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLEtBQUssRUFBRSxPQUE2QixFQUFpQixFQUFFO0lBQ3ZGLE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUUxRSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7UUFDbEQsT0FBTyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFD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