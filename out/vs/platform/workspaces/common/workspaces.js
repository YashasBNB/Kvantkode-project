/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUNC, toSlashes } from '../../../base/common/extpath.js';
import * as json from '../../../base/common/json.js';
import * as jsonEdit from '../../../base/common/jsonEdit.js';
import { normalizeDriveLetter } from '../../../base/common/labels.js';
import { Schemas } from '../../../base/common/network.js';
import { isAbsolute, posix } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { isEqualAuthority } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getRemoteAuthority } from '../../remote/common/remoteHosts.js';
import { WorkspaceFolder, } from '../../workspace/common/workspace.js';
export const IWorkspacesService = createDecorator('workspacesService');
export function isRecentWorkspace(curr) {
    return curr.hasOwnProperty('workspace');
}
export function isRecentFolder(curr) {
    return curr.hasOwnProperty('folderUri');
}
export function isRecentFile(curr) {
    return curr.hasOwnProperty('fileUri');
}
//#endregion
//#region Workspace File Utilities
export function isStoredWorkspaceFolder(obj) {
    return isRawFileWorkspaceFolder(obj) || isRawUriWorkspaceFolder(obj);
}
function isRawFileWorkspaceFolder(obj) {
    const candidate = obj;
    return (typeof candidate?.path === 'string' && (!candidate.name || typeof candidate.name === 'string'));
}
function isRawUriWorkspaceFolder(obj) {
    const candidate = obj;
    return (typeof candidate?.uri === 'string' && (!candidate.name || typeof candidate.name === 'string'));
}
/**
 * Given a folder URI and the workspace config folder, computes the `IStoredWorkspaceFolder`
 * using a relative or absolute path or a uri.
 * Undefined is returned if the `folderURI` and the `targetConfigFolderURI` don't have the
 * same schema or authority.
 *
 * @param folderURI a workspace folder
 * @param forceAbsolute if set, keep the path absolute
 * @param folderName a workspace name
 * @param targetConfigFolderURI the folder where the workspace is living in
 */
export function getStoredWorkspaceFolder(folderURI, forceAbsolute, folderName, targetConfigFolderURI, extUri) {
    // Scheme mismatch: use full absolute URI as `uri`
    if (folderURI.scheme !== targetConfigFolderURI.scheme) {
        return { name: folderName, uri: folderURI.toString(true) };
    }
    // Always prefer a relative path if possible unless
    // prevented to make the workspace file shareable
    // with other users
    let folderPath = !forceAbsolute
        ? extUri.relativePath(targetConfigFolderURI, folderURI)
        : undefined;
    if (folderPath !== undefined) {
        if (folderPath.length === 0) {
            folderPath = '.';
        }
        else {
            if (isWindows) {
                folderPath = massagePathForWindows(folderPath);
            }
        }
    }
    // We could not resolve a relative path
    else {
        // Local file: use `fsPath`
        if (folderURI.scheme === Schemas.file) {
            folderPath = folderURI.fsPath;
            if (isWindows) {
                folderPath = massagePathForWindows(folderPath);
            }
        }
        // Different authority: use full absolute URI
        else if (!extUri.isEqualAuthority(folderURI.authority, targetConfigFolderURI.authority)) {
            return { name: folderName, uri: folderURI.toString(true) };
        }
        // Non-local file: use `path` of URI
        else {
            folderPath = folderURI.path;
        }
    }
    return { name: folderName, path: folderPath };
}
function massagePathForWindows(folderPath) {
    // Drive letter should be upper case
    folderPath = normalizeDriveLetter(folderPath);
    // Always prefer slash over backslash unless
    // we deal with UNC paths where backslash is
    // mandatory.
    if (!isUNC(folderPath)) {
        folderPath = toSlashes(folderPath);
    }
    return folderPath;
}
export function toWorkspaceFolders(configuredFolders, workspaceConfigFile, extUri) {
    const result = [];
    const seen = new Set();
    const relativeTo = extUri.dirname(workspaceConfigFile);
    for (const configuredFolder of configuredFolders) {
        let uri = undefined;
        if (isRawFileWorkspaceFolder(configuredFolder)) {
            if (configuredFolder.path) {
                uri = extUri.resolvePath(relativeTo, configuredFolder.path);
            }
        }
        else if (isRawUriWorkspaceFolder(configuredFolder)) {
            try {
                uri = URI.parse(configuredFolder.uri);
                if (uri.path[0] !== posix.sep) {
                    uri = uri.with({ path: posix.sep + uri.path }); // this makes sure all workspace folder are absolute
                }
            }
            catch (e) {
                console.warn(e); // ignore
            }
        }
        if (uri) {
            // remove duplicates
            const comparisonKey = extUri.getComparisonKey(uri);
            if (!seen.has(comparisonKey)) {
                seen.add(comparisonKey);
                const name = configuredFolder.name || extUri.basenameOrAuthority(uri);
                result.push(new WorkspaceFolder({ uri, name, index: result.length }, configuredFolder));
            }
        }
    }
    return result;
}
/**
 * Rewrites the content of a workspace file to be saved at a new location.
 * Throws an exception if file is not a valid workspace file
 */
export function rewriteWorkspaceFileForNewLocation(rawWorkspaceContents, configPathURI, isFromUntitledWorkspace, targetConfigPathURI, extUri) {
    const storedWorkspace = doParseStoredWorkspace(configPathURI, rawWorkspaceContents);
    const sourceConfigFolder = extUri.dirname(configPathURI);
    const targetConfigFolder = extUri.dirname(targetConfigPathURI);
    const rewrittenFolders = [];
    for (const folder of storedWorkspace.folders) {
        const folderURI = isRawFileWorkspaceFolder(folder)
            ? extUri.resolvePath(sourceConfigFolder, folder.path)
            : URI.parse(folder.uri);
        let absolute;
        if (isFromUntitledWorkspace) {
            absolute = false; // if it was an untitled workspace, try to make paths relative
        }
        else {
            absolute = !isRawFileWorkspaceFolder(folder) || isAbsolute(folder.path); // for existing workspaces, preserve whether a path was absolute or relative
        }
        rewrittenFolders.push(getStoredWorkspaceFolder(folderURI, absolute, folder.name, targetConfigFolder, extUri));
    }
    // Preserve as much of the existing workspace as possible by using jsonEdit
    // and only changing the folders portion.
    const formattingOptions = {
        insertSpaces: false,
        tabSize: 4,
        eol: isLinux || isMacintosh ? '\n' : '\r\n',
    };
    const edits = jsonEdit.setProperty(rawWorkspaceContents, ['folders'], rewrittenFolders, formattingOptions);
    let newContent = jsonEdit.applyEdits(rawWorkspaceContents, edits);
    if (isEqualAuthority(storedWorkspace.remoteAuthority, getRemoteAuthority(targetConfigPathURI))) {
        // unsaved remote workspaces have the remoteAuthority set. Remove it when no longer nexessary.
        newContent = jsonEdit.applyEdits(newContent, jsonEdit.removeProperty(newContent, ['remoteAuthority'], formattingOptions));
    }
    return newContent;
}
function doParseStoredWorkspace(path, contents) {
    // Parse workspace file
    const storedWorkspace = json.parse(contents); // use fault tolerant parser
    // Filter out folders which do not have a path or uri set
    if (storedWorkspace && Array.isArray(storedWorkspace.folders)) {
        storedWorkspace.folders = storedWorkspace.folders.filter((folder) => isStoredWorkspaceFolder(folder));
    }
    else {
        throw new Error(`${path} looks like an invalid workspace file.`);
    }
    return storedWorkspace;
}
function isSerializedRecentWorkspace(data) {
    return (data.workspace &&
        typeof data.workspace === 'object' &&
        typeof data.workspace.id === 'string' &&
        typeof data.workspace.configPath === 'string');
}
function isSerializedRecentFolder(data) {
    return typeof data.folderUri === 'string';
}
function isSerializedRecentFile(data) {
    return typeof data.fileUri === 'string';
}
export function restoreRecentlyOpened(data, logService) {
    const result = { workspaces: [], files: [] };
    if (data) {
        const restoreGracefully = function (entries, onEntry) {
            for (let i = 0; i < entries.length; i++) {
                try {
                    onEntry(entries[i], i);
                }
                catch (e) {
                    logService.warn(`Error restoring recent entry ${JSON.stringify(entries[i])}: ${e.toString()}. Skip entry.`);
                }
            }
        };
        const storedRecents = data;
        if (Array.isArray(storedRecents.entries)) {
            restoreGracefully(storedRecents.entries, (entry) => {
                const label = entry.label;
                const remoteAuthority = entry.remoteAuthority;
                if (isSerializedRecentWorkspace(entry)) {
                    result.workspaces.push({
                        label,
                        remoteAuthority,
                        workspace: {
                            id: entry.workspace.id,
                            configPath: URI.parse(entry.workspace.configPath),
                        },
                    });
                }
                else if (isSerializedRecentFolder(entry)) {
                    result.workspaces.push({ label, remoteAuthority, folderUri: URI.parse(entry.folderUri) });
                }
                else if (isSerializedRecentFile(entry)) {
                    result.files.push({ label, remoteAuthority, fileUri: URI.parse(entry.fileUri) });
                }
            });
        }
    }
    return result;
}
export function toStoreData(recents) {
    const serialized = { entries: [] };
    const storeLabel = (label, uri) => {
        // Only store the label if it is provided
        // and only if it differs from the path
        // This gives us a chance to render the
        // path better, e.g. use `~` for home.
        return label && label !== uri.fsPath && label !== uri.path;
    };
    for (const recent of recents.workspaces) {
        if (isRecentFolder(recent)) {
            serialized.entries.push({
                folderUri: recent.folderUri.toString(),
                label: storeLabel(recent.label, recent.folderUri) ? recent.label : undefined,
                remoteAuthority: recent.remoteAuthority,
            });
        }
        else {
            serialized.entries.push({
                workspace: {
                    id: recent.workspace.id,
                    configPath: recent.workspace.configPath.toString(),
                },
                label: storeLabel(recent.label, recent.workspace.configPath) ? recent.label : undefined,
                remoteAuthority: recent.remoteAuthority,
            });
        }
    }
    for (const recent of recents.files) {
        serialized.entries.push({
            fileUri: recent.fileUri.toString(),
            label: storeLabel(recent.label, recent.fileUri) ? recent.label : undefined,
            remoteAuthority: recent.remoteAuthority,
        });
    }
    return serialized;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvY29tbW9uL3dvcmtzcGFjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUFXLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBS04sZUFBZSxHQUNmLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFBO0FBb0QxRixNQUFNLFVBQVUsaUJBQWlCLENBQUMsSUFBYTtJQUM5QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDeEMsQ0FBQztBQUVE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