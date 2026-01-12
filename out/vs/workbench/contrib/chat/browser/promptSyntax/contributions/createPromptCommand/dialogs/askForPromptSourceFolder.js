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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9kaWFsb2dzL2Fza0ZvclByb21wdFNvdXJjZUZvbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUEyQm5GOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLEtBQUssRUFDNUMsT0FBNkIsRUFDRixFQUFFO0lBQzdCLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsR0FDL0YsT0FBTyxDQUFBO0lBRVIsc0RBQXNEO0lBQ3RELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUVyRCx1REFBdUQ7SUFDdkQsa0ZBQWtGO0lBQ2xGLG1FQUFtRTtJQUNuRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUIsT0FBTyxNQUFNLG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMscUVBQXFFO0lBQ3JFLElBQUksT0FBTyxD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