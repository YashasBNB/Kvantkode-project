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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvYnJvd3Nlci9pbmRleGVkREJGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLDZCQUE2QixFQUs3QiwyQkFBMkIsRUFDM0IsUUFBUSxHQU1SLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFekUsb0dBQW9HO0FBQ3BHLE1BQU0sa0JBQWtCLEdBQUcsNkJBQTZCLENBQ3ZELFFBQVEsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLENBQUMsRUFDaEQsMkJBQTJCLENBQUMsWUFBWSxDQUN4QyxDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUcsNkJBQTZCLENBQ3BELFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUNoRCwyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FD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