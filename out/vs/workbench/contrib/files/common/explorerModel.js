/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { URI } from '../../../../base/common/uri.js';
import { isEqual } from '../../../../base/common/extpath.js';
import { posix } from '../../../../base/common/path.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { rtrim, startsWithIgnoreCase, equalsIgnoreCase } from '../../../../base/common/strings.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { joinPath, isEqualOrParent, basenameOrAuthority, } from '../../../../base/common/resources.js';
import { ExplorerFileNestingTrie } from './explorerFileNestingTrie.js';
import { assertIsDefined } from '../../../../base/common/types.js';
export class ExplorerModel {
    constructor(contextService, uriIdentityService, fileService, configService, filesConfigService) {
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeRoots = new Emitter();
        const setRoots = () => (this._roots = this.contextService
            .getWorkspace()
            .folders.map((folder) => new ExplorerItem(folder.uri, fileService, configService, filesConfigService, undefined, true, false, false, false, folder.name)));
        setRoots();
        this._listener = this.contextService.onDidChangeWorkspaceFolders(() => {
            setRoots();
            this._onDidChangeRoots.fire();
        });
    }
    get roots() {
        return this._roots;
    }
    get onDidChangeRoots() {
        return this._onDidChangeRoots.event;
    }
    /**
     * Returns an array of child stat from this stat that matches with the provided path.
     * Starts matching from the first root.
     * Will return empty array in case the FileStat does not exist.
     */
    findAll(resource) {
        return coalesce(this.roots.map((root) => root.find(resource)));
    }
    /**
     * Returns a FileStat that matches the passed resource.
     * In case multiple FileStat are matching the resource (same folder opened multiple times) returns the FileStat that has the closest root.
     * Will return undefined in case the FileStat does not exist.
     */
    findClosest(resource) {
        const folder = this.contextService.getWorkspaceFolder(resource);
        if (folder) {
            const root = this.roots.find((r) => this.uriIdentityService.extUri.isEqual(r.resource, folder.uri));
            if (root) {
                return root.find(resource);
            }
        }
        return null;
    }
    dispose() {
        dispose(this._listener);
    }
}
export class ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory, _isSymbolicLink, _readonly, _locked, _name = basenameOrAuthority(resource), _mtime, _unknown = false) {
        this.resource = resource;
        this.fileService = fileService;
        this.configService = configService;
        this.filesConfigService = filesConfigService;
        this._parent = _parent;
        this._isDirectory = _isDirectory;
        this._isSymbolicLink = _isSymbolicLink;
        this._readonly = _readonly;
        this._locked = _locked;
        this._name = _name;
        this._mtime = _mtime;
        this._unknown = _unknown;
        this.error = undefined;
        this._isExcluded = false;
        // Find
        this.markedAsFindResult = false;
        this._isDirectoryResolved = false;
    }
    get isExcluded() {
        if (this._isExcluded) {
            return true;
        }
        if (!this._parent) {
            return false;
        }
        return this._parent.isExcluded;
    }
    set isExcluded(value) {
        this._isExcluded = value;
    }
    hasChildren(filter) {
        if (this.hasNests) {
            return this.nestedChildren?.some((c) => filter(c)) ?? false;
        }
        else {
            return this.isDirectory;
        }
    }
    get hasNests() {
        return !!this.nestedChildren?.length;
    }
    get isDirectoryResolved() {
        return this._isDirectoryResolved;
    }
    get isSymbolicLink() {
        return !!this._isSymbolicLink;
    }
    get isDirectory() {
        return !!this._isDirectory;
    }
    get isReadonly() {
        return this.filesConfigService.isReadonly(this.resource, {
            resource: this.resource,
            name: this.name,
            readonly: this._readonly,
            locked: this._locked,
        });
    }
    get mtime() {
        return this._mtime;
    }
    get name() {
        return this._name;
    }
    get isUnknown() {
        return this._unknown;
    }
    get parent() {
        return this._parent;
    }
    get root() {
        if (!this._parent) {
            return this;
        }
        return this._parent.root;
    }
    get children() {
        return new Map();
    }
    updateName(value) {
        // Re-add to parent since the parent has a name map to children and the name might have changed
        this._parent?.removeChild(this);
        this._name = value;
        this._parent?.addChild(this);
    }
    getId() {
        let id = this.root.resource.toString() + '::' + this.resource.toString();
        if (this.isMarkedAsFiltered()) {
            id += '::findFilterResult';
        }
        return id;
    }
    toString() {
        return `ExplorerItem: ${this.name}`;
    }
    get isRoot() {
        return this === this.root;
    }
    static create(fileService, configService, filesConfigService, raw, parent, resolveTo) {
        const stat = new ExplorerItem(raw.resource, fileService, configService, filesConfigService, parent, raw.isDirectory, raw.isSymbolicLink, raw.readonly, raw.locked, raw.name, raw.mtime, !raw.isFile && !raw.isDirectory);
        // Recursively add children if present
        if (stat.isDirectory) {
            // isDirectoryResolved is a very important indicator in the stat model that tells if the folder was fully resolved
            // the folder is fully resolved if either it has a list of children or the client requested this by using the resolveTo
            // array of resource path to resolve.
            stat._isDirectoryResolved =
                !!raw.children ||
                    (!!resolveTo &&
                        resolveTo.some((r) => {
                            return isEqualOrParent(r, stat.resource);
                        }));
            // Recurse into children
            if (raw.children) {
                for (let i = 0, len = raw.children.length; i < len; i++) {
                    const child = ExplorerItem.create(fileService, configService, filesConfigService, raw.children[i], stat, resolveTo);
                    stat.addChild(child);
                }
            }
        }
        return stat;
    }
    /**
     * Merges the stat which was resolved from the disk with the local stat by copying over properties
     * and children. The merge will only consider resolved stat elements to avoid overwriting data which
     * exists locally.
     */
    static mergeLocalWithDisk(disk, local) {
        if (disk.resource.toString() !== local.resource.toString()) {
            return; // Merging only supported for stats with the same resource
        }
        // Stop merging when a folder is not resolved to avoid loosing local data
        const mergingDirectories = disk.isDirectory || local.isDirectory;
        if (mergingDirectories && local._isDirectoryResolved && !disk._isDirectoryResolved) {
            return;
        }
        // Properties
        local.resource = disk.resource;
        if (!local.isRoot) {
            local.updateName(disk.name);
        }
        local._isDirectory = disk.isDirectory;
        local._mtime = disk.mtime;
        local._isDirectoryResolved = disk._isDirectoryResolved;
        local._isSymbolicLink = disk.isSymbolicLink;
        local.error = disk.error;
        // Merge Children if resolved
        if (mergingDirectories && disk._isDirectoryResolved) {
            // Map resource => stat
            const oldLocalChildren = new ResourceMap();
            local.children.forEach((child) => {
                oldLocalChildren.set(child.resource, child);
            });
            // Clear current children
            local.children.clear();
            // Merge received children
            disk.children.forEach((diskChild) => {
                const formerLocalChild = oldLocalChildren.get(diskChild.resource);
                // Existing child: merge
                if (formerLocalChild) {
                    ExplorerItem.mergeLocalWithDisk(diskChild, formerLocalChild);
                    local.addChild(formerLocalChild);
                    oldLocalChildren.delete(diskChild.resource);
                }
                // New child: add
                else {
                    local.addChild(diskChild);
                }
            });
            oldLocalChildren.forEach((oldChild) => {
                if (oldChild instanceof NewExplorerItem) {
                    local.addChild(oldChild);
                }
            });
        }
    }
    /**
     * Adds a child element to this folder.
     */
    addChild(child) {
        // Inherit some parent properties to child
        child._parent = this;
        child.updateResource(false);
        this.children.set(this.getPlatformAwareName(child.name), child);
    }
    getChild(name) {
        return this.children.get(this.getPlatformAwareName(name));
    }
    fetchChildren(sortOrder) {
        const nestingConfig = this.configService.getValue({
            resource: this.root.resource,
        }).explorer.fileNesting;
        // fast path when the children can be resolved sync
        if (nestingConfig.enabled && this.nestedChildren) {
            return this.nestedChildren;
        }
        return (async () => {
            if (!this._isDirectoryResolved) {
                // Resolve metadata only when the mtime is needed since this can be expensive
                // Mtime is only used when the sort order is 'modified'
                const resolveMetadata = sortOrder === "modified" /* SortOrder.Modified */;
                this.error = undefined;
                try {
                    const stat = await this.fileService.resolve(this.resource, {
                        resolveSingleChildDescendants: true,
                        resolveMetadata,
                    });
                    const resolved = ExplorerItem.create(this.fileService, this.configService, this.filesConfigService, stat, this);
                    ExplorerItem.mergeLocalWithDisk(resolved, this);
                }
                catch (e) {
                    this.error = e;
                    throw e;
                }
                this._isDirectoryResolved = true;
            }
            const items = [];
            if (nestingConfig.enabled) {
                const fileChildren = [];
                const dirChildren = [];
                for (const child of this.children.entries()) {
                    child[1].nestedParent = undefined;
                    if (child[1].isDirectory) {
                        dirChildren.push(child);
                    }
                    else {
                        fileChildren.push(child);
                    }
                }
                const nested = this.fileNester.nest(fileChildren.map(([name]) => name), this.getPlatformAwareName(this.name));
                for (const [fileEntryName, fileEntryItem] of fileChildren) {
                    const nestedItems = nested.get(fileEntryName);
                    if (nestedItems !== undefined) {
                        fileEntryItem.nestedChildren = [];
                        for (const name of nestedItems.keys()) {
                            const child = assertIsDefined(this.children.get(name));
                            fileEntryItem.nestedChildren.push(child);
                            child.nestedParent = fileEntryItem;
                        }
                        items.push(fileEntryItem);
                    }
                    else {
                        fileEntryItem.nestedChildren = undefined;
                    }
                }
                for (const [_, dirEntryItem] of dirChildren.values()) {
                    items.push(dirEntryItem);
                }
            }
            else {
                this.children.forEach((child) => {
                    items.push(child);
                });
            }
            return items;
        })();
    }
    get fileNester() {
        if (!this.root._fileNester) {
            const nestingConfig = this.configService.getValue({
                resource: this.root.resource,
            }).explorer.fileNesting;
            const patterns = Object.entries(nestingConfig.patterns)
                .filter((entry) => typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[0] && entry[1])
                .map(([parentPattern, childrenPatterns]) => [
                this.getPlatformAwareName(parentPattern.trim()),
                childrenPatterns
                    .split(',')
                    .map((p) => this.getPlatformAwareName(p
                    .trim()
                    .replace(/\u200b/g, '')
                    .trim()))
                    .filter((p) => p !== ''),
            ]);
            this.root._fileNester = new ExplorerFileNestingTrie(patterns);
        }
        return this.root._fileNester;
    }
    /**
     * Removes a child element from this folder.
     */
    removeChild(child) {
        this.nestedChildren = undefined;
        this.children.delete(this.getPlatformAwareName(child.name));
    }
    forgetChildren() {
        this.children.clear();
        this.nestedChildren = undefined;
        this._isDirectoryResolved = false;
        this._fileNester = undefined;
    }
    getPlatformAwareName(name) {
        return this.fileService.hasCapability(this.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */)
            ? name
            : name.toLowerCase();
    }
    /**
     * Moves this element under a new parent element.
     */
    move(newParent) {
        this.nestedParent?.removeChild(this);
        this._parent?.removeChild(this);
        newParent.removeChild(this); // make sure to remove any previous version of the file if any
        newParent.addChild(this);
        this.updateResource(true);
    }
    updateResource(recursive) {
        if (this._parent) {
            this.resource = joinPath(this._parent.resource, this.name);
        }
        if (recursive) {
            if (this.isDirectory) {
                this.children.forEach((child) => {
                    child.updateResource(true);
                });
            }
        }
    }
    /**
     * Tells this stat that it was renamed. This requires changes to all children of this stat (if any)
     * so that the path property can be updated properly.
     */
    rename(renamedStat) {
        // Merge a subset of Properties that can change on rename
        this.updateName(renamedStat.name);
        this._mtime = renamedStat.mtime;
        // Update Paths including children
        this.updateResource(true);
    }
    /**
     * Returns a child stat from this stat that matches with the provided path.
     * Will return "null" in case the child does not exist.
     */
    find(resource) {
        // Return if path found
        // For performance reasons try to do the comparison as fast as possible
        const ignoreCase = !this.fileService.hasCapability(resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (resource &&
            this.resource.scheme === resource.scheme &&
            equalsIgnoreCase(this.resource.authority, resource.authority) &&
            (ignoreCase
                ? startsWithIgnoreCase(resource.path, this.resource.path)
                : resource.path.startsWith(this.resource.path))) {
            return this.findByPath(rtrim(resource.path, posix.sep), this.resource.path.length, ignoreCase);
        }
        return null; //Unable to find
    }
    findByPath(path, index, ignoreCase) {
        if (isEqual(rtrim(this.resource.path, posix.sep), path, ignoreCase)) {
            return this;
        }
        if (this.isDirectory) {
            // Ignore separtor to more easily deduct the next name to search
            while (index < path.length && path[index] === posix.sep) {
                index++;
            }
            let indexOfNextSep = path.indexOf(posix.sep, index);
            if (indexOfNextSep === -1) {
                // If there is no separator take the remainder of the path
                indexOfNextSep = path.length;
            }
            // The name to search is between two separators
            const name = path.substring(index, indexOfNextSep);
            const child = this.children.get(this.getPlatformAwareName(name));
            if (child) {
                // We found a child with the given name, search inside it
                return child.findByPath(path, indexOfNextSep, ignoreCase);
            }
        }
        return null;
    }
    isMarkedAsFiltered() {
        return this.markedAsFindResult;
    }
    markItemAndParentsAsFiltered() {
        this.markedAsFindResult = true;
        this.parent?.markItemAndParentsAsFiltered();
    }
    unmarkItemAndChildren() {
        this.markedAsFindResult = false;
        this.children.forEach((child) => child.unmarkItemAndChildren());
    }
}
__decorate([
    memoize
], ExplorerItem.prototype, "children", null);
export class NewExplorerItem extends ExplorerItem {
    constructor(fileService, configService, filesConfigService, parent, isDirectory) {
        super(URI.file(''), fileService, configService, filesConfigService, parent, isDirectory);
        this._isDirectoryResolved = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2NvbW1vbi9leHBsb3Jlck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU01RCxPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixRQUFRLEVBQ1IsZUFBZSxFQUNmLG1CQUFtQixHQUNuQixNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUlsRSxNQUFNLE9BQU8sYUFBYTtJQUt6QixZQUNrQixjQUF3QyxFQUN4QyxrQkFBdUMsRUFDeEQsV0FBeUIsRUFDekIsYUFBb0MsRUFDcEMsa0JBQThDO1FBSjdCLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUN4Qyx1QkFB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