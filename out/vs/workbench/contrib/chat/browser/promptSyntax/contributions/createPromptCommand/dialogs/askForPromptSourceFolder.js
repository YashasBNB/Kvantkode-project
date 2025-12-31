/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { DOCUMENTATION_URL } from '../../../../../common/promptSyntax/constants.js';
import { basename, extUri } from '../../../../../../../../base/common/resources.js';
/**
 * Asks the user for a specific prompt folder, if multiple folders provided.
 * Returns immediately if only one folder available.
 */
export const askForPromptSourceFolder = async (options) => {
    const { type, promptsService, quickInputService, labelService, openerService, workspaceService } = options;
    // get prompts source folders based on the prompt type
    const folders = promptsService.getSourceFolders(type);
    // if no source folders found, show 'learn more' dialog
    // note! this is a temporary solution and must be replaced with a dialog to select
    //       a custom folder path, or switch to a different prompt type
    if (folders.length === 0) {
        return await showNoFoldersDialog(quickInputService, openerService);
    }
    // if there is only one folder, no need to ask
    // note! when we add more actions to the dialog, this will have to go
    if (folders.length === 1) {
        return folders[0].uri;
    }
    const pickOptions = {
        placeHolder: localize('commands.prompts.create.ask-folder.placeholder', 'Select a prompt source folder'),
        canPickMany: false,
        matchOnDescription: true,
    };
    // create list of source folder locations
    const foldersList = folders.map(({ uri }) => {
        const { folders } = workspaceService.getWorkspace();
        const isMultirootWorkspace = folders.length > 1;
        const firstFolder = folders[0];
        // if multi-root or empty workspace, or source folder `uri` does not point to
        // the root folder of a single-root workspace, return the default label and description
        if (isMultirootWorkspace || !firstFolder || !extUri.isEqual(firstFolder.uri, uri)) {
            return {
                type: 'item',
                label: basename(uri),
                description: labelService.getUriLabel(uri, { relative: true }),
                tooltip: uri.fsPath,
                value: uri,
            };
        }
        // if source folder points to the root of this single-root workspace,
        // use appropriate label and description strings to prevent confusion
        return {
            type: 'item',
            label: localize('commands.prompts.create.source-folder.current-workspace', 'Current Workspace'),
            // use absolute path as the description
            description: labelService.getUriLabel(uri, { relative: false }),
            tooltip: uri.fsPath,
            value: uri,
        };
    });
    const answer = await quickInputService.pick(foldersList, pickOptions);
    if (!answer) {
        return;
    }
    return answer.value;
};
/**
 * Shows a dialog to the user when no prompt source folders are found.
 *
 * Note! this is a temporary solution and must be replaced with a dialog to select
 *       a custom folder path, or switch to a different prompt type
 */
const showNoFoldersDialog = async (quickInputService, openerService) => {
    const docsQuickPick = {
        type: 'item',
        label: localize('commands.prompts.create.ask-folder.empty.docs-label', 'Learn how to configure reusable prompts'),
        description: DOCUMENTATION_URL,
        tooltip: DOCUMENTATION_URL,
        value: URI.parse(DOCUMENTATION_URL),
    };
    const result = await quickInputService.pick([docsQuickPick], {
        placeHolder: localize('commands.prompts.create.ask-folder.empty.placeholder', 'No prompt source folders found.'),
        canPickMany: false,
    });
    if (!result) {
        return;
    }
    await openerService.open(result.value);
    return;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvZGlhbG9ncy9hc2tGb3JQcm9tcHRTb3VyY2VGb2xkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBMkJuRjs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLEVBQzVDLE9BQTZCLEVBQ0YsRUFBRTtJQUM3QixNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLEdBQy9GLE9BQU8sQ0FBQTtJQUVSLHNEQUFzRDtJQUN0RCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFckQsdURBQXVEO0lBQ3ZELGtGQUFrRjtJQUNsRixtRUFBbUU7SUFDbkUsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sTUFBTSxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsOENBQThDO0lBQzlDLHFFQUFxRTtJQUNyRSxJQUFJLE9BQU8sQ0FBQyxN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