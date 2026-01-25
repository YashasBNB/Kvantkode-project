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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9lbGVjdHJvbi1tYWluL3dpbmRvd3NGaW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE9BQU8sRUFHTixpQ0FBaUMsRUFDakMscUJBQXFCLEdBRXJCLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsT0FBc0IsRUFDdEIsT0FBWSxFQUNaLHNCQUU0QztJQUU1QyxnR0FBZ0c7SUFDaEcsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFBO1FBQ3hDLElBQUkscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFakUsaUVBQWlFO1lBQ2pFLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsSUFDQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDekMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQy9ELEVBQ0EsQ0FBQztvQkFDRixPQUFPLE1BQU0sQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQztZQUVELHVEQUF1RDtpQkFDbEQsQ0FBQztnQkFDTCxJQUFJLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVB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