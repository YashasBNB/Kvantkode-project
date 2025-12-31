/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { hasWorkspaceFileExtension, IWorkspaceContextService, } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { dirname } from '../../../base/common/resources.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IFileDialogService, } from '../../../platform/dialogs/common/dialogs.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IPathService } from '../../services/path/common/pathService.js';
export const ADD_ROOT_FOLDER_COMMAND_ID = 'addRootFolder';
export const ADD_ROOT_FOLDER_LABEL = localize2('addFolderToWorkspace', 'Add Folder to Workspace...');
export const SET_ROOT_FOLDER_COMMAND_ID = 'setRootFolder';
export const PICK_WORKSPACE_FOLDER_COMMAND_ID = '_workbench.pickWorkspaceFolder';
// Command registration
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileFolderAndOpen({ forceNewWindow: true }),
});
CommandsRegistry.registerCommand({
    id: '_files.pickFolderAndOpen',
    handler: (accessor, options) => accessor.get(IFileDialogService).pickFolderAndOpen(options),
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFolderAndOpen({ forceNewWindow: true }),
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileAndOpen({ forceNewWindow: true }),
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.openWorkspaceInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickWorkspaceAndOpen({ forceNewWindow: true }),
});
CommandsRegistry.registerCommand({
    id: ADD_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.addFolders(folders.map((folder) => ({ uri: folder })));
    },
});
CommandsRegistry.registerCommand({
    id: SET_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.updateFolders(0, contextService.getWorkspace().folders.length, folders.map((folder) => ({ uri: folder })));
    },
});
async function selectWorkspaceFolders(accessor) {
    const dialogsService = accessor.get(IFileDialogService);
    const pathService = accessor.get(IPathService);
    const folders = await dialogsService.showOpenDialog({
        openLabel: mnemonicButtonLabel(localize({ key: 'add', comment: ['&& denotes a mnemonic'] }, '&&Add')),
        title: localize('addFolderToWorkspaceTitle', 'Add Folder to Workspace'),
        canSelectFolders: true,
        canSelectMany: true,
        defaultUri: await dialogsService.defaultFolderPath(),
        availableFileSystems: [pathService.defaultUriScheme],
    });
    return folders;
}
CommandsRegistry.registerCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, async function (accessor, args) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderPicks = folders.map((folder) => {
        const label = folder.name;
        const description = labelService.getUriLabel(dirname(folder.uri), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined, // https://github.com/microsoft/vscode/issues/183418
            folder,
            iconClasses: getIconClasses(modelService, languageService, folder.uri, FileKind.ROOT_FOLDER),
        };
    });
    const options = (args ? args[0] : undefined) || Object.create(null);
    if (!options.activeItem) {
        options.activeItem = folderPicks[0];
    }
    if (!options.placeHolder) {
        options.placeHolder = localize('workspaceFolderPickerPlaceholder', 'Select workspace folder');
    }
    if (typeof options.matchOnDescription !== 'boolean') {
        options.matchOnDescription = true;
    }
    const token = (args ? args[1] : undefined) || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    if (pick) {
        return folders[folderPicks.indexOf(pick)];
    }
    return;
});
CommandsRegistry.registerCommand({
    id: 'vscode.openFolder',
    handler: (accessor, uriComponents, arg) => {
        const commandService = accessor.get(ICommandService);
        // Be compatible to previous args by converting to options
        if (typeof arg === 'boolean') {
            arg = { forceNewWindow: arg };
        }
        // Without URI, ask to pick a folder or workspace to open
        if (!uriComponents) {
            const options = {
                forceNewWindow: arg?.forceNewWindow,
            };
            if (arg?.forceLocalWindow) {
                options.remoteAuthority = null;
                options.availableFileSystems = ['file'];
            }
            return commandService.executeCommand('_files.pickFolderAndOpen', options);
        }
        const uri = URI.from(uriComponents, true);
        const options = {
            forceNewWindow: arg?.forceNewWindow,
            forceReuseWindow: arg?.forceReuseWindow,
            noRecentEntry: arg?.noRecentEntry,
            remoteAuthority: arg?.forceLocalWindow ? null : undefined,
            forceProfile: arg?.forceProfile,
            forceTempProfile: arg?.forceTempProfile,
        };
        const uriToOpen = hasWorkspaceFileExtension(uri) || uri.scheme === Schemas.untitled
            ? { workspaceUri: uri }
            : { folderUri: uri };
        return commandService.executeCommand('_files.windowOpen', [uriToOpen], options);
    },
    metadata: {
        description: 'Open a folder or workspace in the current window or new window depending on the newWindow argument. Note that opening in the same window will shutdown the current extension host process and start a new one on the given folder/workspace unless the newWindow parameter is set to true.',
        args: [
            {
                name: 'uri',
                description: '(optional) Uri of the folder or workspace file to open. If not provided, a native dialog will ask the user for the folder',
                constraint: (value) => value === undefined || value === null || value instanceof URI,
            },
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`forceNewWindow`: Whether to open the folder/workspace in a new window or the same. Defaults to opening in the same window. ' +
                    '`forceReuseWindow`: Whether to force opening the folder/workspace in the same window.  Defaults to false. ' +
                    "`noRecentEntry`: Whether the opened URI will appear in the 'Open Recent' list. Defaults to false. " +
                    'Note, for backward compatibility, options can also be of type boolean, representing the `forceNewWindow` setting.',
                constraint: (value) => value === undefined || typeof value === 'object' || typeof value === 'boolean',
            },
        ],
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.newWindow',
    handler: (accessor, options) => {
        const commandService = accessor.get(ICommandService);
        const commandOptions = {
            forceReuseWindow: options && options.reuseWindow,
            remoteAuthority: options && options.remoteAuthority,
        };
        return commandService.executeCommand('_files.newWindow', commandOptions);
    },
    metadata: {
        description: 'Opens an new window depending on the newWindow argument.',
        args: [
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`reuseWindow`: Whether to open a new window or the same. Defaults to opening in a new window. ',
                constraint: (value) => value === undefined || typeof value === 'object',
            },
        ],
    },
});
// recent history commands
CommandsRegistry.registerCommand('_workbench.removeFromRecentlyOpened', function (accessor, uri) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.removeRecentlyOpened([uri]);
});
CommandsRegistry.registerCommand({
    id: 'vscode.removeFromRecentlyOpened',
    handler: (accessor, path) => {
        const workspacesService = accessor.get(IWorkspacesService);
        if (typeof path === 'string') {
            path = path.match(/^[^:/?#]+:\/\//) ? URI.parse(path) : URI.file(path);
        }
        else {
            path = URI.revive(path); // called from extension host
        }
        return workspacesService.removeRecentlyOpened([path]);
    },
    metadata: {
        description: 'Removes an entry with the given path from the recently opened list.',
        args: [
            {
                name: 'path',
                description: 'URI or URI string to remove from recently opened.',
                constraint: (value) => typeof value === 'string' || value instanceof URI,
            },
        ],
    },
});
CommandsRegistry.registerCommand('_workbench.addToRecentlyOpened', async function (accessor, recentEntry) {
    const workspacesService = accessor.get(IWorkspacesService);
    const uri = recentEntry.uri;
    const label = recentEntry.label;
    const remoteAuthority = recentEntry.remoteAuthority;
    let recent = undefined;
    if (recentEntry.type === 'workspace') {
        const workspace = await workspacesService.getWorkspaceIdentifier(uri);
        recent = { workspace, label, remoteAuthority };
    }
    else if (recentEntry.type === 'folder') {
        recent = { folderUri: uri, label, remoteAuthority };
    }
    else {
        recent = { fileUri: uri, label, remoteAuthority };
    }
    return workspacesService.addRecentlyOpened([recent]);
});
CommandsRegistry.registerCommand('_workbench.getRecentlyOpened', async function (accessor) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.getRecentlyOpened();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL3dvcmtzcGFjZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDckQsT0FBTyxFQUNOLHlCQUF5QixFQUN6Qix3QkFBd0IsR0FDeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBTXpELE9BQU8sRUFBVyxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUd4RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQUE7QUFDekQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQXFCLFNBQVMsQ0FDL0Qsc0JBQXNCLEVBQ3RCLDRCQUE0QixDQUM1QixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUFBO0FBRXpELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGdDQUFnQyxDQUFBO0FBRWhGLHVCQUF1QjtBQUV2QixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLGtEQUFrRDtJQUN0RCxPQUFPLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQUUsQ0FDdkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDO0NBQ2pGLENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsMEJBQTBCO0lBQzlCLE9BQU8sRUFBRSxDQUFDLFFBQTBCLEVBQUUsT0FBb0MsRUFBRSxFQUFFLENBQzdFLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUM7Q0FDNUQsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSw4Q0FBOEM7SUFDbEQsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFLENBQ3ZDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQztDQUM3RSxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLDRDQUE0QztJQUNoRCxPQUFPLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQUUsQ0FDdkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQztDQUMzRSxDQUFDLENBQUE7QUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLDJDQUEyQztJQUMvQyxPQUFPLEVBQUUsQ0FBQyxRQUEwQixFQUFFLEVBQUUsQ0FDdkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDO0NBQ2hGLENBQUMsQ0FBQTtBQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsMEJBQTBCO0lBQzlCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDM0IsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFFdEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSwwQkFBMEI7SUFDOUIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMzQixNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFFN0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSx1QkFBdUIsQ0FBQyxhQUFhLENBQzFDLENBQUMsRUFDRCxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQzFDLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsS0FBSyxVQUFVLHNCQUFzQixDQUFDLFFBQTBCO0lBQy9ELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUN2RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQztRQUNuRCxTQUFTLEVBQUUsbUJBQW1CLENBQzdCLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUNyRTtRQUNELEtBQUssRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUseUJBQXlCLENBQUM7UUFDdkUsZ0JBQWdCLEVBQUUsSUFBSTtRQUN0QixhQUFhLEVBQUUsSUFBSTtRQUNuQixVQUFVLEVBQUUsTUFBTSxjQUFjLENBQUMsaUJBQWlCLEVBQUU7UUFDcEQsb0JBQW9CLEVBQUUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUM7S0FDcEQsQ0FBQyxDQUFBO0lBRUYsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixnQ0FBZ0MsRUFDaEMsS0FBSyxXQUFXLFFBQVEsRUFBRSxJQUF3RDtJQUNqRixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUMxRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUM3RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUV0RCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFBO0lBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckIsT0FBTTtJQUNQLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBcUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQzVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUE7UUFDekIsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFckYsT0FBTztZQUNOLEtBQUs7WUFDTCxXQUFXLEVBQUUsV0FBVyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsb0RBQW9EO1lBQ2xILE1BQU07WUFDTixXQUFXLEVBQUUsY0FBYyxDQUMxQixZQUFZLEVBQ1osZUFBZSxFQUNmLE1BQU0sQ0FBQyxHQUFHLEVBQ1YsUUFBUSxDQUFDLFdBQVcsQ0FDcEI7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLE9BQU8sR0FDWixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXBELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDekIsT0FBTyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUIsT0FBTyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsa0NBQWtDLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtJQUM5RixDQUFDO0lBRUQsSUFBSSxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNyRCxPQUFPLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxNQUFNLEtBQUssR0FBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFBO0lBQ3ZGLE1BQU0sSUFBSSxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNWLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsT0FBTTtBQUNQLENBQUMsQ0FDRCxDQUFBO0FBYUQsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxtQkFBbUI7SUFDdkIsT0FBTyxFQUFFLENBQ1IsUUFBMEIsRUFDMUIsYUFBNkIsRUFDN0IsR0FBNEMsRUFDM0MsRUFBRTtRQUNILE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsMERBQTBEO1FBQzFELElBQUksT0FBTyxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDOUIsR0FBRyxHQUFHLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFBO1FBQzlCLENBQUM7UUFFRCx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sT0FBTyxHQUF3QjtnQkFDcEMsY0FBYyxFQUFFLEdBQUcsRUFBRSxjQUFjO2FBQ25DLENBQUE7WUFFRCxJQUFJLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMzQixPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtnQkFDOUIsT0FBTyxDQUFDLG9CQUFvQixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEMsQ0FBQztZQUVELE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekMsTUFBTSxPQUFPLEdBQXVCO1lBQ25DLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYztZQUNuQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCO1lBQ3ZDLGFBQWEsRUFBRSxHQUFHLEVBQUUsYUFBYTtZQUNqQyxlQUFlLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDekQsWUFBWSxFQUFFLEdBQUcsRUFBRSxZQUFZO1lBQy9CLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxnQkFBZ0I7U0FDdkMsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUNkLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVE7WUFDaEUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRTtZQUN2QixDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDdEIsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDaEYsQ0FBQztJQUNELFFBQVEsRUFBRTtRQUNULFdBQVcsRUFDViw0UkFBNFI7UUFDN1IsSUFBSSxFQUFFO1lBQ0w7Z0JBQ0MsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsV0FBVyxFQUNWLDJIQUEySDtnQkFDNUgsVUFBVSxFQUFFLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxZQUFZLEdBQUc7YUFDekY7WUFDRDtnQkFDQyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQ1YsNERBQTREO29CQUM1RCw4SEFBOEg7b0JBQzlILDRHQUE0RztvQkFDNUcsb0dBQW9HO29CQUNwRyxtSEFBbUg7Z0JBQ3BILFVBQVUsRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQzFCLEtBQUssS0FBSyxTQUFTLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sS0FBSyxLQUFLLFNBQVM7YUFDL0U7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBV0YsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxrQkFBa0I7SUFDdEIsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxPQUFxQyxFQUFFLEVBQUU7UUFDOUUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVwRCxNQUFNLGNBQWMsR0FBNEI7WUFDL0MsZ0JBQWdCLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxXQUFXO1lBQ2hELGVBQWUsRUFBRSxPQUFPLElBQUksT0FBTyxDQUFDLGVBQWU7U0FDbkQsQ0FBQTtRQUVELE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsV0FBVyxFQUFFLDBEQUEwRDtRQUN2RSxJQUFJLEVBQUU7WUFDTDtnQkFDQyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQ1YsNERBQTREO29CQUM1RCxnR0FBZ0c7Z0JBQ2pHLFVBQVUsRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRO2FBQzVFO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUVGLDBCQUEwQjtBQUUxQixnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLHFDQUFxQyxFQUNyQyxVQUFVLFFBQTBCLEVBQUUsR0FBUTtJQUM3QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUMxRCxPQUFPLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNyRCxDQUFDLENBQ0QsQ0FBQTtBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsaUNBQWlDO0lBQ3JDLE9BQU8sRUFBRSxDQUFDLFFBQTBCLEVBQUUsSUFBa0IsRUFBaUIsRUFBRTtRQUMxRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUxRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkUsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLDZCQUE2QjtRQUN0RCxDQUFDO1FBRUQsT0FBTyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUNELFFBQVEsRUFBRTtRQUNULFdBQVcsRUFBRSxxRUFBcUU7UUFDbEYsSUFBSSxFQUFFO1lBQ0w7Z0JBQ0MsSUFBSSxFQUFFLE1BQU07Z0JBQ1osV0FBVyxFQUFFLG1EQUFtRDtnQkFDaEUsVUFBVSxFQUFFLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxZQUFZLEdBQUc7YUFDN0U7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBU0YsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixnQ0FBZ0MsRUFDaEMsS0FBSyxXQUFXLFFBQTBCLEVBQUUsV0FBd0I7SUFDbkUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDMUQsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQTtJQUMzQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFBO0lBQy9CLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7SUFFbkQsSUFBSSxNQUFNLEdBQXdCLFNBQVMsQ0FBQTtJQUMzQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyRSxNQUFNLEdBQUcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFBO0lBQy9DLENBQUM7U0FBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDMUMsTUFBTSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUE7SUFDcEQsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsT0FBTyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDckQsQ0FBQyxDQUNELENBQUE7QUFFRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLDhCQUE4QixFQUM5QixLQUFLLFdBQVcsUUFBMEI7SUFDekMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFFMUQsT0FBTyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0FBQzdDLENBQUMsQ0FDRCxDQUFBIn0=