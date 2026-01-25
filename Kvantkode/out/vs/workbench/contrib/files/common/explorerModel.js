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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvY29tbW9uL2V4cGxvcmVyTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBTTVELE9BQU8sRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFFBQVEsRUFDUixlQUFlLEVBQ2YsbUJBQW1CLEdBQ25CLE1BQU0sc0NBQXNDLENBQUE7QUFHN0MsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSWxFLE1BQU0sT0FBTyxhQUFhO0lBS3pCLFlBQ2tCLGNBQXdDLEVBQ3hDLGtCQUF1QyxFQUN4RCxXQUF5QixFQUN6QixhQUFvQyxFQUNwQyxrQkFBOEM7UUFKN0IsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ3hD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