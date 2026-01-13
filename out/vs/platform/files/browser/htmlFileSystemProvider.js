/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { URI } from '../../../base/common/uri.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, extname, normalize } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { extUri, extUriIgnorePathCase, joinPath } from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { createFileSystemProviderError, FileSystemProviderError, FileSystemProviderErrorCode, FileType, } from '../common/files.js';
import { WebFileSystemAccess, WebFileSystemObserver, } from './webFileSystemAccess.js';
import { LogLevel } from '../../log/common/log.js';
export class HTMLFileSystemProvider extends Disposable {
    get capabilities() {
        if (!this._capabilities) {
            this._capabilities =
                2 /* FileSystemProviderCapabilities.FileReadWrite */ | 16 /* FileSystemProviderCapabilities.FileReadStream */;
            if (isLinux) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    constructor(indexedDB, store, logService) {
        super();
        this.indexedDB = indexedDB;
        this.store = store;
        this.logService = logService;
        //#region Events (unsupported)
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Capabilities
        this.extUri = isLinux ? extUri : extUriIgnorePathCase;
        //#endregion
        //#region File Watching (unsupported)
        this._onDidChangeFileEmitter = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFileEmitter.event;
        //#endregion
        //#region File/Directoy Handle Registry
        this._files = new Map();
        this._directories = new Map();
    }
    //#region File Metadata Resolving
    async stat(resource) {
        try {
            const handle = await this.getHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, stat', FileSystemProviderErrorCode.FileNotFound);
            }
            if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                const file = await handle.getFile();
                return {
                    type: FileType.File,
                    mtime: file.lastModified,
                    ctime: 0,
                    size: file.size,
                };
            }
            return {
                type: FileType.Directory,
                mtime: 0,
                ctime: 0,
                size: 0,
            };
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async readdir(resource) {
        try {
            const handle = await this.getDirectoryHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, readdir', FileSystemProviderErrorCode.FileNotFound);
            }
            const result = [];
            for await (const [name, child] of handle) {
                result.push([
                    name,
                    WebFileSystemAccess.isFileSystemFileHandle(child) ? FileType.File : FileType.Directory,
                ]);
            }
            return result;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    //#endregion
    //#region File Reading/Writing
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream((data) => VSBuffer.concat(data.map((data) => VSBuffer.wrap(data))).buffer, {
            // Set a highWaterMark to prevent the stream
            // for file upload to produce large buffers
            // in-memory
            highWaterMark: 10,
        });
        (async () => {
            try {
                const handle = await this.getFileHandle(resource);
                if (!handle) {
                    throw this.createFileSystemProviderError(resource, 'No such file or directory, readFile', FileSystemProviderErrorCode.FileNotFound);
                }
                const file = await handle.getFile();
                // Partial file: implemented simply via `readFile`
                if (typeof opts.length === 'number' || typeof opts.position === 'number') {
                    let buffer = new Uint8Array(await file.arrayBuffer());
                    if (typeof opts?.position === 'number') {
                        buffer = buffer.slice(opts.position);
                    }
                    if (typeof opts?.length === 'number') {
                        buffer = buffer.slice(0, opts.length);
                    }
                    stream.end(buffer);
                }
                // Entire file
                else {
                    const reader = file.stream().getReader();
                    let res = await reader.read();
                    while (!res.done) {
                        if (token.isCancellationRequested) {
                            break;
                        }
                        // Write buffer into stream but make sure to wait
                        // in case the `highWaterMark` is reached
                        await stream.write(res.value);
                        if (token.isCancellationRequested) {
                            break;
                        }
                        res = await reader.read();
                    }
                    stream.end(undefined);
                }
            }
            catch (error) {
                stream.error(this.toFileSystemProviderError(error));
                stream.end();
            }
        })();
        return stream;
    }
    async readFile(resource) {
        try {
            const handle = await this.getFileHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, readFile', FileSystemProviderErrorCode.FileNotFound);
            }
            const file = await handle.getFile();
            return new Uint8Array(await file.arrayBuffer());
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async writeFile(resource, content, opts) {
        try {
            let handle = await this.getFileHandle(resource);
            // Validate target unless { create: true, overwrite: true }
            if (!opts.create || !opts.overwrite) {
                if (handle) {
                    if (!opts.overwrite) {
                        throw this.createFileSystemProviderError(resource, 'File already exists, writeFile', FileSystemProviderErrorCode.FileExists);
                    }
                }
                else {
                    if (!opts.create) {
                        throw this.createFileSystemProviderError(resource, 'No such file, writeFile', FileSystemProviderErrorCode.FileNotFound);
                    }
                }
            }
            // Create target as needed
            if (!handle) {
                const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
                if (!parent) {
                    throw this.createFileSystemProviderError(resource, 'No such parent directory, writeFile', FileSystemProviderErrorCode.FileNotFound);
                }
                handle = await parent.getFileHandle(this.extUri.basename(resource), { create: true });
                if (!handle) {
                    throw this.createFileSystemProviderError(resource, 'Unable to create file , writeFile', FileSystemProviderErrorCode.Unknown);
                }
            }
            // Write to target overwriting any existing contents
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async mkdir(resource) {
        try {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (!parent) {
                throw this.createFileSystemProviderError(resource, 'No such parent directory, mkdir', FileSystemProviderErrorCode.FileNotFound);
            }
            await parent.getDirectoryHandle(this.extUri.basename(resource), { create: true });
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async delete(resource, opts) {
        try {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (!parent) {
                throw this.createFileSystemProviderError(resource, 'No such parent directory, delete', FileSystemProviderErrorCode.FileNotFound);
            }
            return parent.removeEntry(this.extUri.basename(resource), { recursive: opts.recursive });
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async rename(from, to, opts) {
        try {
            if (this.extUri.isEqual(from, to)) {
                return; // no-op if the paths are the same
            }
            // Implement file rename by write + delete
            const fileHandle = await this.getFileHandle(from);
            if (fileHandle) {
                const file = await fileHandle.getFile();
                const contents = new Uint8Array(await file.arrayBuffer());
                await this.writeFile(to, contents, {
                    create: true,
                    overwrite: opts.overwrite,
                    unlock: false,
                    atomic: false,
                });
                await this.delete(from, { recursive: false, useTrash: false, atomic: false });
            }
            // File API does not support any real rename otherwise
            else {
                throw this.createFileSystemProviderError(from, localize('fileSystemRenameError', 'Rename is only supported for files.'), FileSystemProviderErrorCode.Unavailable);
            }
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    watch(resource, opts) {
        const disposables = new DisposableStore();
        this.doWatch(resource, opts, disposables).catch((error) => this.logService.error(`[File Watcher ('FileSystemObserver')] Error: ${error} (${resource})`));
        return disposables;
    }
    async doWatch(resource, opts, disposables) {
        if (!WebFileSystemObserver.supported(globalThis)) {
            return;
        }
        const handle = await this.getHandle(resource);
        if (!handle || disposables.isDisposed) {
            return;
        }
        const observer = new globalThis.FileSystemObserver((records) => {
            if (disposables.isDisposed) {
                return;
            }
            const events = [];
            for (const record of records) {
                if (this.logService.getLevel() === LogLevel.Trace) {
                    this.logService.trace(`[File Watcher ('FileSystemObserver')] [${record.type}] ${joinPath(resource, ...record.relativePathComponents)}`);
                }
                switch (record.type) {
                    case 'appeared':
                        events.push({
                            resource: joinPath(resource, ...record.relativePathComponents),
                            type: 1 /* FileChangeType.ADDED */,
                        });
                        break;
                    case 'disappeared':
                        events.push({
                            resource: joinPath(resource, ...record.relativePathComponents),
                            type: 2 /* FileChangeType.DELETED */,
                        });
                        break;
                    case 'modified':
                        events.push({
                            resource: joinPath(resource, ...record.relativePathComponents),
                            type: 0 /* FileChangeType.UPDATED */,
                        });
                        break;
                    case 'errored':
                        this.logService.trace(`[File Watcher ('FileSystemObserver')] errored, disposing observer (${resource})`);
                        disposables.dispose();
                }
            }
            if (events.length) {
                this._onDidChangeFileEmitter.fire(events);
            }
        });
        try {
            await observer.observe(handle, opts.recursive ? { recursive: true } : undefined);
        }
        finally {
            if (disposables.isDisposed) {
                observer.disconnect();
            }
            else {
                disposables.add(toDisposable(() => observer.disconnect()));
            }
        }
    }
    registerFileHandle(handle) {
        return this.registerHandle(handle, this._files);
    }
    registerDirectoryHandle(handle) {
        return this.registerHandle(handle, this._directories);
    }
    get directories() {
        return this._directories.values();
    }
    async registerHandle(handle, map) {
        let handleId = `/${handle.name}`;
        // Compute a valid handle ID in case this exists already
        if (map.has(handleId) && !(await map.get(handleId)?.isSameEntry(handle))) {
            const fileExt = extname(handle.name);
            const fileName = basename(handle.name, fileExt);
            let handleIdCounter = 1;
            do {
                handleId = `/${fileName}-${handleIdCounter++}${fileExt}`;
            } while (map.has(handleId) && !(await map.get(handleId)?.isSameEntry(handle)));
        }
        map.set(handleId, handle);
        // Remember in IndexDB for future lookup
        try {
            await this.indexedDB?.runInTransaction(this.store, 'readwrite', (objectStore) => objectStore.put(handle, handleId));
        }
        catch (error) {
            this.logService.error(error);
        }
        return URI.from({ scheme: Schemas.file, path: handleId });
    }
    async getHandle(resource) {
        // First: try to find a well known handle first
        let handle = await this.doGetHandle(resource);
        // Second: walk up parent directories and resolve handle if possible
        if (!handle) {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (parent) {
                const name = extUri.basename(resource);
                try {
                    handle = await parent.getFileHandle(name);
                }
                catch (error) {
                    try {
                        handle = await parent.getDirectoryHandle(name);
                    }
                    catch (error) {
                        // Ignore
                    }
                }
            }
        }
        return handle;
    }
    async getFileHandle(resource) {
        const handle = await this.doGetHandle(resource);
        if (handle instanceof FileSystemFileHandle) {
            return handle;
        }
        const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
        try {
            return await parent?.getFileHandle(extUri.basename(resource));
        }
        catch (error) {
            return undefined; // guard against possible DOMException
        }
    }
    async getDirectoryHandle(resource) {
        const handle = await this.doGetHandle(resource);
        if (handle instanceof FileSystemDirectoryHandle) {
            return handle;
        }
        const parentUri = this.extUri.dirname(resource);
        if (this.extUri.isEqual(parentUri, resource)) {
            return undefined; // return when root is reached to prevent infinite recursion
        }
        const parent = await this.getDirectoryHandle(parentUri);
        try {
            return await parent?.getDirectoryHandle(extUri.basename(resource));
        }
        catch (error) {
            return undefined; // guard against possible DOMException
        }
    }
    async doGetHandle(resource) {
        // We store file system handles with the `handle.name`
        // and as such require the resource to be on the root
        if (this.extUri.dirname(resource).path !== '/') {
            return undefined;
        }
        const handleId = resource.path.replace(/\/$/, ''); // remove potential slash from the end of the path
        // First: check if we have a known handle stored in memory
        const inMemoryHandle = this._files.get(handleId) ?? this._directories.get(handleId);
        if (inMemoryHandle) {
            return inMemoryHandle;
        }
        // Second: check if we have a persisted handle in IndexedDB
        const persistedHandle = await this.indexedDB?.runInTransaction(this.store, 'readonly', (store) => store.get(handleId));
        if (WebFileSystemAccess.isFileSystemHandle(persistedHandle)) {
            let hasPermissions = (await persistedHandle.queryPermission()) === 'granted';
            try {
                if (!hasPermissions) {
                    hasPermissions = (await persistedHandle.requestPermission()) === 'granted';
                }
            }
            catch (error) {
                this.logService.error(error); // this can fail with a DOMException
            }
            if (hasPermissions) {
                if (WebFileSystemAccess.isFileSystemFileHandle(persistedHandle)) {
                    this._files.set(handleId, persistedHandle);
                }
                else if (WebFileSystemAccess.isFileSystemDirectoryHandle(persistedHandle)) {
                    this._directories.set(handleId, persistedHandle);
                }
                return persistedHandle;
            }
        }
        // Third: fail with an error
        throw this.createFileSystemProviderError(resource, 'No file system handle registered', FileSystemProviderErrorCode.Unavailable);
    }
    //#endregion
    toFileSystemProviderError(error) {
        if (error instanceof FileSystemProviderError) {
            return error; // avoid double conversion
        }
        let code = FileSystemProviderErrorCode.Unknown;
        if (error.name === 'NotAllowedError') {
            error = new Error(localize('fileSystemNotAllowedError', 'Insufficient permissions. Please retry and allow the operation.'));
            code = FileSystemProviderErrorCode.Unavailable;
        }
        return createFileSystemProviderError(error, code);
    }
    createFileSystemProviderError(resource, msg, code) {
        return createFileSystemProviderError(new Error(`${msg} (${normalize(resource.path)})`), code);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvYnJvd3Nlci9odG1sRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBd0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RixPQUFPLEVBQ04sNkJBQTZCLEVBSzdCLHVCQUF1QixFQUN2QiwyQkFBMkIsRUFDM0IsUUFBUSxHQVFSLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUVOLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxPQUFPLEVBQWUsUUFB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