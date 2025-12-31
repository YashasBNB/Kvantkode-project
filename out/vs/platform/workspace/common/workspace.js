/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { basename, extname } from '../../../base/common/path.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { extname as resourceExtname, basenameOrAuthority, joinPath, extUriBiasedIgnorePathCase, } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
export const IWorkspaceContextService = createDecorator('contextService');
export function isSingleFolderWorkspaceIdentifier(obj) {
    const singleFolderIdentifier = obj;
    return typeof singleFolderIdentifier?.id === 'string' && URI.isUri(singleFolderIdentifier.uri);
}
export function isEmptyWorkspaceIdentifier(obj) {
    const emptyWorkspaceIdentifier = obj;
    return (typeof emptyWorkspaceIdentifier?.id === 'string' &&
        !isSingleFolderWorkspaceIdentifier(obj) &&
        !isWorkspaceIdentifier(obj));
}
export const EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE = {
    id: 'ext-dev',
};
export const UNKNOWN_EMPTY_WINDOW_WORKSPACE = { id: 'empty-window' };
export function toWorkspaceIdentifier(arg0, isExtensionDevelopment) {
    // Empty workspace
    if (typeof arg0 === 'string' || typeof arg0 === 'undefined') {
        // With a backupPath, the basename is the empty workspace identifier
        if (typeof arg0 === 'string') {
            return {
                id: basename(arg0),
            };
        }
        // Extension development empty windows have backups disabled
        // so we return a constant workspace identifier for extension
        // authors to allow to restore their workspace state even then.
        if (isExtensionDevelopment) {
            return EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE;
        }
        return UNKNOWN_EMPTY_WINDOW_WORKSPACE;
    }
    // Multi root
    const workspace = arg0;
    if (workspace.configuration) {
        return {
            id: workspace.id,
            configPath: workspace.configuration,
        };
    }
    // Single folder
    if (workspace.folders.length === 1) {
        return {
            id: workspace.id,
            uri: workspace.folders[0].uri,
        };
    }
    // Empty window
    return {
        id: workspace.id,
    };
}
export function isWorkspaceIdentifier(obj) {
    const workspaceIdentifier = obj;
    return typeof workspaceIdentifier?.id === 'string' && URI.isUri(workspaceIdentifier.configPath);
}
export function reviveIdentifier(identifier) {
    // Single Folder
    const singleFolderIdentifierCandidate = identifier;
    if (singleFolderIdentifierCandidate?.uri) {
        return {
            id: singleFolderIdentifierCandidate.id,
            uri: URI.revive(singleFolderIdentifierCandidate.uri),
        };
    }
    // Multi folder
    const workspaceIdentifierCandidate = identifier;
    if (workspaceIdentifierCandidate?.configPath) {
        return {
            id: workspaceIdentifierCandidate.id,
            configPath: URI.revive(workspaceIdentifierCandidate.configPath),
        };
    }
    // Empty
    if (identifier?.id) {
        return { id: identifier.id };
    }
    return undefined;
}
export var WorkbenchState;
(function (WorkbenchState) {
    WorkbenchState[WorkbenchState["EMPTY"] = 1] = "EMPTY";
    WorkbenchState[WorkbenchState["FOLDER"] = 2] = "FOLDER";
    WorkbenchState[WorkbenchState["WORKSPACE"] = 3] = "WORKSPACE";
})(WorkbenchState || (WorkbenchState = {}));
export function isWorkspace(thing) {
    const candidate = thing;
    return !!(candidate &&
        typeof candidate === 'object' &&
        typeof candidate.id === 'string' &&
        Array.isArray(candidate.folders));
}
export function isWorkspaceFolder(thing) {
    const candidate = thing;
    return !!(candidate &&
        typeof candidate === 'object' &&
        URI.isUri(candidate.uri) &&
        typeof candidate.name === 'string' &&
        typeof candidate.toResource === 'function');
}
export class Workspace {
    get folders() {
        return this._folders;
    }
    set folders(folders) {
        this._folders = folders;
        this.updateFoldersMap();
    }
    constructor(_id, folders, _transient, _configuration, ignorePathCasing) {
        this._id = _id;
        this._transient = _transient;
        this._configuration = _configuration;
        this.ignorePathCasing = ignorePathCasing;
        this.foldersMap = TernarySearchTree.forUris(this.ignorePathCasing, () => true);
        this.folders = folders;
    }
    update(workspace) {
        this._id = workspace.id;
        this._configuration = workspace.configuration;
        this._transient = workspace.transient;
        this.ignorePathCasing = workspace.ignorePathCasing;
        this.folders = workspace.folders;
    }
    get id() {
        return this._id;
    }
    get transient() {
        return this._transient;
    }
    get configuration() {
        return this._configuration;
    }
    set configuration(configuration) {
        this._configuration = configuration;
    }
    getFolder(resource) {
        if (!resource) {
            return null;
        }
        return this.foldersMap.findSubstr(resource) || null;
    }
    updateFoldersMap() {
        this.foldersMap = TernarySearchTree.forUris(this.ignorePathCasing, () => true);
        for (const folder of this.folders) {
            this.foldersMap.set(folder.uri, folder);
        }
    }
    toJSON() {
        return {
            id: this.id,
            folders: this.folders,
            transient: this.transient,
            configuration: this.configuration,
        };
    }
}
export class WorkspaceFolder {
    constructor(data, 
    /**
     * Provides access to the original metadata for this workspace
     * folder. This can be different from the metadata provided in
     * this class:
     * - raw paths can be relative
     * - raw paths are not normalized
     */
    raw) {
        this.raw = raw;
        this.uri = data.uri;
        this.index = data.index;
        this.name = data.name;
    }
    toResource(relativePath) {
        return joinPath(this.uri, relativePath);
    }
    toJSON() {
        return { uri: this.uri, name: this.name, index: this.index };
    }
}
export function toWorkspaceFolder(resource) {
    return new WorkspaceFolder({ uri: resource, index: 0, name: basenameOrAuthority(resource) }, { uri: resource.toString() });
}
export const WORKSPACE_EXTENSION = 'code-workspace';
export const WORKSPACE_SUFFIX = `.${WORKSPACE_EXTENSION}`;
export const WORKSPACE_FILTER = [
    { name: localize('codeWorkspace', 'Code Workspace'), extensions: [WORKSPACE_EXTENSION] },
];
export const UNTITLED_WORKSPACE_NAME = 'workspace.json';
export function isUntitledWorkspace(path, environmentService) {
    return extUriBiasedIgnorePathCase.isEqualOrParent(path, environmentService.untitledWorkspacesHome);
}
export function isTemporaryWorkspace(arg1) {
    let path;
    if (URI.isUri(arg1)) {
        path = arg1;
    }
    else {
        path = arg1.configuration;
    }
    return path?.scheme === Schemas.tmp;
}
export const STANDALONE_EDITOR_WORKSPACE_ID = '4064f6ec-cb38-4ad0-af64-ee6467e63c82';
export function isStandaloneEditorWorkspace(workspace) {
    return workspace.id === STANDALONE_EDITOR_WORKSPACE_ID;
}
export function isSavedWorkspace(path, environmentService) {
    return !isUntitledWorkspace(path, environmentService) && !isTemporaryWorkspace(path);
}
export function hasWorkspaceFileExtension(path) {
    const ext = typeof path === 'string' ? extname(path) : resourceExtname(path);
    return ext === WORKSPACE_SUFFIX;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlL2NvbW1vbi93b3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDN0UsT0FBTyxFQUNOLE9BQU8sSUFBSSxlQUFlLEVBQzFCLG1CQUFtQixFQUNuQixRQUFRLEVBQ1IsMEJBQTBCLEdBQzFCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQXlIbkcsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCxHQUFZO0lBRVosTUFBTSxzQkFBc0IsR0FBRyxHQUFtRCxDQUFBO0lBRWxGLE9BQU8sT0FBTyxzQkFBc0IsRUFBRSxFQUFFLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDL0YsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxHQUFZO0lBQ3RELE1BQU0sd0JBQXdCLEdBQUcsR0FBNEMsQ0FBQTtJQUM3RSxPQUFPLENBQ04sT0FBTyx3QkFBd0IsRUFBRSxFQUFFLEtBQUssUUFBUTtR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