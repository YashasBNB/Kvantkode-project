/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Throttler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ExtUri } from '../../../base/common/resources.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, FileType, } from '../common/files.js';
import { BroadcastDataChannel } from '../../../base/browser/broadcast.js';
// Standard FS Errors (expected to be thrown in production when invalid FS operations are requested)
const ERR_FILE_NOT_FOUND = createFileSystemProviderError(localize('fileNotExists', 'File does not exist'), FileSystemProviderErrorCode.FileNotFound);
const ERR_FILE_IS_DIR = createFileSystemProviderError(localize('fileIsDirectory', 'File is Directory'), FileSystemProviderErrorCode.FileIsADirectory);
const ERR_FILE_NOT_DIR = createFileSystemProviderError(localize('fileNotDirectory', 'File is not a directory'), FileSystemProviderErrorCode.FileNotADirectory);
const ERR_DIR_NOT_EMPTY = createFileSystemProviderError(localize('dirIsNotEmpty', 'Directory is not empty'), FileSystemProviderErrorCode.Unknown);
const ERR_FILE_EXCEEDS_STORAGE_QUOTA = createFileSystemProviderError(localize('fileExceedsStorageQuota', 'File exceeds available storage quota'), FileSystemProviderErrorCode.FileExceedsStorageQuota);
// Arbitrary Internal Errors
const ERR_UNKNOWN_INTERNAL = (message) => createFileSystemProviderError(localize('internal', 'Internal error occurred in IndexedDB File System Provider. ({0})', message), FileSystemProviderErrorCode.Unknown);
class IndexedDBFileSystemNode {
    constructor(entry) {
        this.entry = entry;
        this.type = entry.type;
    }
    read(path) {
        return this.doRead(path.split('/').filter((p) => p.length));
    }
    doRead(pathParts) {
        if (pathParts.length === 0) {
            return this.entry;
        }
        if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL('Internal error reading from IndexedDBFSNode -- expected directory at ' + this.entry.path);
        }
        const next = this.entry.children.get(pathParts[0]);
        if (!next) {
            return undefined;
        }
        return next.doRead(pathParts.slice(1));
    }
    delete(path) {
        const toDelete = path.split('/').filter((p) => p.length);
        if (toDelete.length === 0) {
            if (this.entry.type !== FileType.Directory) {
                throw ERR_UNKNOWN_INTERNAL(`Internal error deleting from IndexedDBFSNode. Expected root entry to be directory`);
            }
            this.entry.children.clear();
        }
        else {
            return this.doDelete(toDelete, path);
        }
    }
    doDelete(pathParts, originalPath) {
        if (pathParts.length === 0) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error deleting from IndexedDBFSNode -- got no deletion path parts (encountered while deleting ${originalPath})`);
        }
        else if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL('Internal error deleting from IndexedDBFSNode -- expected directory at ' + this.entry.path);
        }
        else if (pathParts.length === 1) {
            this.entry.children.delete(pathParts[0]);
        }
        else {
            const next = this.entry.children.get(pathParts[0]);
            if (!next) {
                throw ERR_UNKNOWN_INTERNAL('Internal error deleting from IndexedDBFSNode -- expected entry at ' +
                    this.entry.path +
                    '/' +
                    next);
            }
            next.doDelete(pathParts.slice(1), originalPath);
        }
    }
    add(path, entry) {
        this.doAdd(path.split('/').filter((p) => p.length), entry, path);
    }
    doAdd(pathParts, entry, originalPath) {
        if (pathParts.length === 0) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- adding empty path (encountered while adding ${originalPath})`);
        }
        else if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- parent is not a directory (encountered while adding ${originalPath})`);
        }
        else if (pathParts.length === 1) {
            const next = pathParts[0];
            const existing = this.entry.children.get(next);
            if (entry.type === 'dir') {
                if (existing?.entry.type === FileType.File) {
                    throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting file with directory: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
                }
                this.entry.children.set(next, existing ??
                    new IndexedDBFileSystemNode({
                        type: FileType.Directory,
                        path: this.entry.path + '/' + next,
                        children: new Map(),
                    }));
            }
            else {
                if (existing?.entry.type === FileType.Directory) {
                    throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting directory with file: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
                }
                this.entry.children.set(next, new IndexedDBFileSystemNode({
                    type: FileType.File,
                    path: this.entry.path + '/' + next,
                    size: entry.size,
                }));
            }
        }
        else if (pathParts.length > 1) {
            const next = pathParts[0];
            let childNode = this.entry.children.get(next);
            if (!childNode) {
                childNode = new IndexedDBFileSystemNode({
                    children: new Map(),
                    path: this.entry.path + '/' + next,
                    type: FileType.Directory,
                });
                this.entry.children.set(next, childNode);
            }
            else if (childNode.type === FileType.File) {
                throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting file entry with directory: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
            }
            childNode.doAdd(pathParts.slice(1), entry, originalPath);
        }
    }
    print(indentation = '') {
        console.log(indentation + this.entry.path);
        if (this.entry.type === FileType.Directory) {
            this.entry.children.forEach((child) => child.print(indentation + ' '));
        }
    }
}
export class IndexedDBFileSystemProvider extends Disposable {
    constructor(scheme, indexedDB, store, watchCrossWindowChanges) {
        super();
        this.scheme = scheme;
        this.indexedDB = indexedDB;
        this.store = store;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.onDidChangeCapabilities = Event.None;
        this.extUri = new ExtUri(() => false); /* Case Sensitive */
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.mtimes = new Map();
        this.fileWriteBatch = [];
        this.writeManyThrottler = new Throttler();
        if (watchCrossWindowChanges) {
            this.changesBroadcastChannel = this._register(new BroadcastDataChannel(`vscode.indexedDB.${scheme}.changes`));
            this._register(this.changesBroadcastChannel.onDidReceiveData((changes) => {
                this._onDidChangeFile.fire(changes.map((c) => ({ type: c.type, resource: URI.revive(c.resource) })));
            }));
        }
    }
    watch(resource, opts) {
        return Disposable.None;
    }
    async mkdir(resource) {
        try {
            const resourceStat = await this.stat(resource);
            if (resourceStat.type === FileType.File) {
                throw ERR_FILE_NOT_DIR;
            }
        }
        catch (error) {
            /* Ignore */
        }
        ;
        (await this.getFiletree()).add(resource.path, { type: 'dir' });
    }
    async stat(resource) {
        const entry = (await this.getFiletree()).read(resource.path);
        if (entry?.type === FileType.File) {
            return {
                type: FileType.File,
                ctime: 0,
                mtime: this.mtimes.get(resource.toString()) || 0,
                size: entry.size ?? (await this.readFile(resource)).byteLength,
            };
        }
        if (entry?.type === FileType.Directory) {
            return {
                type: FileType.Directory,
                ctime: 0,
                mtime: 0,
                size: 0,
            };
        }
        throw ERR_FILE_NOT_FOUND;
    }
    async readdir(resource) {
        try {
            const entry = (await this.getFiletree()).read(resource.path);
            if (!entry) {
                // Dirs aren't saved to disk, so empty dirs will be lost on reload.
                // Thus we have two options for what happens when you try to read a dir and nothing is found:
                // - Throw FileSystemProviderErrorCode.FileNotFound
                // - Return []
                // We choose to return [] as creating a dir then reading it (even after reload) should not throw an error.
                return [];
            }
            if (entry.type !== FileType.Directory) {
                throw ERR_FILE_NOT_DIR;
            }
            else {
                return [...entry.children.entries()].map(([name, node]) => [name, node.type]);
            }
        }
        catch (error) {
            throw error;
        }
    }
    async readFile(resource) {
        try {
            const result = await this.indexedDB.runInTransaction(this.store, 'readonly', (objectStore) => objectStore.get(resource.path));
            if (result === undefined) {
                throw ERR_FILE_NOT_FOUND;
            }
            const buffer = result instanceof Uint8Array
                ? result
                : isString(result)
                    ? VSBuffer.fromString(result).buffer
                    : undefined;
            if (buffer === undefined) {
                throw ERR_UNKNOWN_INTERNAL(`IndexedDB entry at "${resource.path}" in unexpected format`);
            }
            // update cache
            const fileTree = await this.getFiletree();
            fileTree.add(resource.path, { type: 'file', size: buffer.byteLength });
            return buffer;
        }
        catch (error) {
            throw error;
        }
    }
    async writeFile(resource, content, opts) {
        try {
            const existing = await this.stat(resource).catch(() => undefined);
            if (existing?.type === FileType.Directory) {
                throw ERR_FILE_IS_DIR;
            }
            await this.bulkWrite([[resource, content]]);
        }
        catch (error) {
            throw error;
        }
    }
    async rename(from, to, opts) {
        const fileTree = await this.getFiletree();
        const fromEntry = fileTree.read(from.path);
        if (!fromEntry) {
            throw ERR_FILE_NOT_FOUND;
        }
        const toEntry = fileTree.read(to.path);
        if (toEntry) {
            if (!opts.overwrite) {
                throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
            }
            if (toEntry.type !== fromEntry.type) {
                throw createFileSystemProviderError('Cannot rename files with different types', FileSystemProviderErrorCode.Unknown);
            }
            // delete the target file if exists
            await this.delete(to, { recursive: true, useTrash: false, atomic: false });
        }
        const toTargetResource = (path) => this.extUri.joinPath(to, this.extUri.relativePath(from, from.with({ path })) || '');
        const sourceEntries = await this.tree(from);
        const sourceFiles = [];
        for (const sourceEntry of sourceEntries) {
            if (sourceEntry[1] === FileType.File) {
                sourceFiles.push(sourceEntry);
            }
            else if (sourceEntry[1] === FileType.Directory) {
                // add directories to the tree
                fileTree.add(toTargetResource(sourceEntry[0]).path, { type: 'dir' });
            }
        }
        if (sourceFiles.length) {
            const targetFiles = [];
            const sourceFilesContents = await this.indexedDB.runInTransaction(this.store, 'readonly', (objectStore) => sourceFiles.map(([path]) => objectStore.get(path)));
            for (let index = 0; index < sourceFiles.length; index++) {
                const content = sourceFilesContents[index] instanceof Uint8Array
                    ? sourceFilesContents[index]
                    : isString(sourceFilesContents[index])
                        ? VSBuffer.fromString(sourceFilesContents[index]).buffer
                        : undefined;
                if (content) {
                    targetFiles.push([toTargetResource(sourceFiles[index][0]), content]);
                }
            }
            await this.bulkWrite(targetFiles);
        }
        await this.delete(from, { recursive: true, useTrash: false, atomic: false });
    }
    async delete(resource, opts) {
        let stat;
        try {
            stat = await this.stat(resource);
        }
        catch (e) {
            if (e.code === FileSystemProviderErrorCode.FileNotFound) {
                return;
            }
            throw e;
        }
        let toDelete;
        if (opts.recursive) {
            const tree = await this.tree(resource);
            toDelete = tree.map(([path]) => path);
        }
        else {
            if (stat.type === FileType.Directory && (await this.readdir(resource)).length) {
                throw ERR_DIR_NOT_EMPTY;
            }
            toDelete = [resource.path];
        }
        await this.deleteKeys(toDelete);
        (await this.getFiletree()).delete(resource.path);
        toDelete.forEach((key) => this.mtimes.delete(key));
        this.triggerChanges(toDelete.map((path) => ({ resource: resource.with({ path }), type: 2 /* FileChangeType.DELETED */ })));
    }
    async tree(resource) {
        const stat = await this.stat(resource);
        const allEntries = [[resource.path, stat.type]];
        if (stat.type === FileType.Directory) {
            const dirEntries = await this.readdir(resource);
            for (const [key, type] of dirEntries) {
                const childResource = this.extUri.joinPath(resource, key);
                allEntries.push([childResource.path, type]);
                if (type === FileType.Directory) {
                    const childEntries = await this.tree(childResource);
                    allEntries.push(...childEntries);
                }
            }
        }
        return allEntries;
    }
    triggerChanges(changes) {
        if (changes.length) {
            this._onDidChangeFile.fire(changes);
            this.changesBroadcastChannel?.postData(changes);
        }
    }
    getFiletree() {
        if (!this.cachedFiletree) {
            this.cachedFiletree = (async () => {
                const rootNode = new IndexedDBFileSystemNode({
                    children: new Map(),
                    path: '',
                    type: FileType.Directory,
                });
                const result = await this.indexedDB.runInTransaction(this.store, 'readonly', (objectStore) => objectStore.getAllKeys());
                const keys = result.map((key) => key.toString());
                keys.forEach((key) => rootNode.add(key, { type: 'file' }));
                return rootNode;
            })();
        }
        return this.cachedFiletree;
    }
    async bulkWrite(files) {
        files.forEach(([resource, content]) => this.fileWriteBatch.push({ content, resource }));
        await this.writeManyThrottler.queue(() => this.writeMany());
        const fileTree = await this.getFiletree();
        for (const [resource, content] of files) {
            fileTree.add(resource.path, { type: 'file', size: content.byteLength });
            this.mtimes.set(resource.toString(), Date.now());
        }
        this.triggerChanges(files.map(([resource]) => ({ resource, type: 0 /* FileChangeType.UPDATED */ })));
    }
    async writeMany() {
        if (this.fileWriteBatch.length) {
            const fileBatch = this.fileWriteBatch.splice(0, this.fileWriteBatch.length);
            try {
                await this.indexedDB.runInTransaction(this.store, 'readwrite', (objectStore) => fileBatch.map((entry) => {
                    return objectStore.put(entry.content, entry.resource.path);
                }));
            }
            catch (ex) {
                if (ex instanceof DOMException && ex.name === 'QuotaExceededError') {
                    throw ERR_FILE_EXCEEDS_STORAGE_QUOTA;
                }
                throw ex;
            }
        }
    }
    async deleteKeys(keys) {
        if (keys.length) {
            await this.indexedDB.runInTransaction(this.store, 'readwrite', (objectStore) => keys.map((key) => objectStore.delete(key)));
        }
    }
    async reset() {
        await this.indexedDB.runInTransaction(this.store, 'readwrite', (objectStore) => objectStore.clear());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9icm93c2VyL2luZGV4ZWREQkZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBVSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sNkJBQTZCLEVBSzdCLDJCQUEyQixFQUMzQixRQUFRLEdBTVIsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RSxvR0FBb0c7QUFDcEcsTUFBTSxrQkFBa0IsR0FBRyw2QkFBNkIsQ0FDdkQsUUFBUSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxFQUNoRCwyQkFBMkIsQ0FBQyxZQUFZLENBQ3hDLENBQUE7QUFDRCxNQUFNLGVBQWUsR0FBRyw2QkFBNkIsQ0FDcEQsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLEVBQ2hE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