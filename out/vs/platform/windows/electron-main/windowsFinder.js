/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
export async function findWindowOnFile(windows, fileUri, localWorkspaceResolver) {
    // First check for windows with workspaces that have a parent folder of the provided path opened
    for (const window of windows) {
        const workspace = window.openedWorkspace;
        if (isWorkspaceIdentifier(workspace)) {
            const resolvedWorkspace = await localWorkspaceResolver(workspace);
            // resolved workspace: folders are known and can be compared with
            if (resolvedWorkspace) {
                if (resolvedWorkspace.folders.some((folder) => extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, folder.uri))) {
                    return window;
                }
            }
            // unresolved: can only compare with workspace location
            else {
                if (extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, workspace.configPath)) {
                    return window;
                }
            }
        }
    }
    // Then go with single folder windows that are parent of the provided file path
    const singleFolderWindowsOnFilePath = windows.filter((window) => isSingleFolderWorkspaceIdentifier(window.openedWorkspace) &&
        extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, window.openedWorkspace.uri));
    if (singleFolderWindowsOnFilePath.length) {
        return singleFolderWindowsOnFilePath.sort((windowA, windowB) => -(windowA.openedWorkspace.uri.path.length -
            windowB.openedWorkspace.uri.path.length))[0];
    }
    return undefined;
}
export function findWindowOnWorkspaceOrFolder(windows, folderOrWorkspaceConfigUri) {
    for (const window of windows) {
        // check for workspace config path
        if (isWorkspaceIdentifier(window.openedWorkspace) &&
            extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.configPath, folderOrWorkspaceConfigUri)) {
            return window;
        }
        // check for folder path
        if (isSingleFolderWorkspaceIdentifier(window.openedWorkspace) &&
            extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.uri, folderOrWorkspaceConfigUri)) {
            return window;
        }
    }
    return undefined;
}
export function findWindowOnExtensionDevelopmentPath(windows, extensionDevelopmentPaths) {
    const matches = (uriString) => {
        return extensionDevelopmentPaths.some((path) => extUriBiasedIgnorePathCase.isEqual(URI.file(path), URI.file(uriString)));
    };
    for (const window of windows) {
        // match on extension development path. the path can be one or more paths
        // so we check if any of the paths match on any of the provided ones
        if (window.config?.extensionDevelopmentPath?.some((path) => matches(path))) {
            return window;
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dzRmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBR04saUNBQWlDLEVBQ2pDLHFCQUFxQixHQUVyQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLE9BQXNCLEVBQ3RCLE9BQVksRUFDWixzQkFFNEM7SUFFNUMsZ0dBQWdHO0lBQ2hHLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7UUFDOUIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQTtRQUN4QyxJQUFJLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRWpFLGlFQUFpRTtZQUNqRSxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3ZCLElBQ0MsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3pDLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUMvRCxFQUNBLENBQUM7b0JBQ0YsT0FBTyxNQUFNLENBQUE7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFFRCx1REFBdUQ7aUJBQ2xELENBQUM7Z0JBQ0wsSUFBSSwwQkFBMEIsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFNB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