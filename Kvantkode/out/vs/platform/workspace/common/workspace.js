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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2UvY29tbW9uL3dvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sT0FBTyxJQUFJLGVBQWUsRUFDMUIsbUJBQW1CLEVBQ25CLFFBQVEsRUFDUiwwQkFBMEIsR0FDMUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQixnQkFBZ0IsQ0FBQyxDQUFBO0FBeUhuRyxNQUFNLFVBQVUsaUNBQWlDLENBQ2hELEdBQVk7SUFFWixNQUFNLHNCQUFzQixHQUFHLEdBQW1ELENBQUE7SUFFbEYsT0FBTyxPQUFPLHNCQUFzQixFQUFFLEVBQUUsS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUMvRixDQUFDO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEdBQVk7SUFDdEQsTUFBTSx3QkFBd0IsR0FBRyxHQUE0QyxDQUFBO0lBQzdFLE9BQU8sQ0FDTixPQUFPLHdCQUF3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