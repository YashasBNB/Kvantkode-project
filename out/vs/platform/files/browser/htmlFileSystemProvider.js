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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2Jyb3dzZXIvaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sZ0NBQWdDLENBQUE7QUFDekYsT0FBTyxFQUNOLDZCQUE2QixFQUs3Qix1QkFBdUIsRUFDdkIsMkJBQTJCLEVBQzNCLFFBQVEsR0FRUixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFFTixtQkFBbUIsRUFDbkIscUJBQXFCLEdBQ3JCLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFlLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRS9ELE1BQU0sT0FBTyxzQkFDWixTQUFRLFVBQVU7SUFnQmxCLElBQUksWUFBWTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pCLDZHQUE0RixDQUFBO1lBRTdGLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGFBQWEsK0RBQW9ELENBQUE7WUFDdkUsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELFlBQVk7SUFFWixZQUNTLFNBQWdDLEVBQ3ZCLEtBQWEsRUFDdEIsVUFBdUI7UUFFL0IsS0FBSyxFQUFFLENBQUE7UUFKQyxjQUFTLEdBQVQsU0FBUyxDQUF1QjtRQUN2QixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ3RCLGVBQVUsR0FBVixVQUFVLENBQWE7UUE3QmhDLDhCQUE4QjtRQUVyQiw0QkFBdUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBRTdDLFlBQVk7UUFFWiwyQkFBMkI7UUFFbkIsV0FBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQTtRQXVUeEQsWUFBWTtRQUVaLHFDQUFxQztRQUVwQiw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUEwQixDQUFDLENBQUE7UUFDdkYsb0JBQWUsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO1FBb0Y3RCxZQUFZO1FBRVosdUNBQXVDO1FBRXRCLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQTtRQUNoRCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO0lBN1g1RSxDQUFDO0lBRUQsaUNBQWlDO0lBRWpDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYTtRQUN2QixJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDN0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1IsaUNBQWlDLEVBQ2pDLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLG1CQUFtQixDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3hELE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUVuQyxPQUFPO29CQUNOLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtvQkFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZO29CQUN4QixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7aUJBQ2YsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPO2dCQUNOLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUztnQkFDeEIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLENBQUM7YUFDUCxDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWE7UUFDMUIsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1Isb0NBQW9DLEVBQ3BDLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1lBRXZDLElBQUksS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSTtvQkFDSixtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVM7aUJBQ3RGLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLDhCQUE4QjtJQUU5QixjQUFjLENBQ2IsUUFBYSxFQUNiLElBQTRCLEVBQzVCLEtBQXdCO1FBRXhCLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUNoQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQ3pFO1lBQ0MsNENBQTRDO1lBQzVDLDJDQUEyQztZQUMzQyxZQUFZO1lBQ1osYUFBYSxFQUFFLEVBQUU7U0FDakIsQ0FDRCxDQUVBO1FBQUEsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNaLElBQUksQ0FBQztnQkFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FDdkMsUUFBUSxFQUNSLHFDQUFxQyxFQUNyQywyQkFBMkIsQ0FBQyxZQUFZLENBQ3hDLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFFbkMsa0RBQWtEO2dCQUNsRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUMxRSxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO29CQUVyRCxJQUFJLE9BQU8sSUFBSSxFQUFFLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDeEMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNyQyxDQUFDO29CQUVELElBQUksT0FBTyxJQUFJLEVBQUUsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUN0QyxDQUFDO29CQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ25CLENBQUM7Z0JBRUQsY0FBYztxQkFDVCxDQUFDO29CQUNMLE1BQU0sTUFBTSxHQUE0QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUE7b0JBRWpGLElBQUksR0FBRyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO29CQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNsQixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDOzRCQUNuQyxNQUFLO3dCQUNOLENBQUM7d0JBRUQsaURBQWlEO3dCQUNqRCx5Q0FBeUM7d0JBQ3pDLE1BQU0sTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBRTdCLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7NEJBQ25DLE1BQUs7d0JBQ04sQ0FBQzt3QkFFRCxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQzFCLENBQUM7b0JBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdEIsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO2dCQUNuRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVKLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBYTtRQUMzQixJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1IscUNBQXFDLEVBQ3JDLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUVuQyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQWEsRUFBRSxPQUFtQixFQUFFLElBQXVCO1FBQzFFLElBQUksQ0FBQztZQUNKLElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUvQywyREFBMkQ7WUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3JDLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDckIsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQ3ZDLFFBQVEsRUFDUixnQ0FBZ0MsRUFDaEMsMkJBQTJCLENBQUMsVUFBVSxDQUN0QyxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2xCLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1IseUJBQXlCLEVBQ3pCLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO2dCQUMzRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQ3ZDLFFBQVEsRUFDUixxQ0FBcUMsRUFDckMsMkJBQTJCLENBQUMsWUFBWSxDQUN4QyxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQ3ZDLFFBQVEsRUFDUixtQ0FBbUMsRUFDbkMsMkJBQTJCLENBQUMsT0FBTyxDQUNuQyxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQzlDLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM3QixNQUFNLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN2QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWix3Q0FBd0M7SUFFeEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFhO1FBQ3hCLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDM0UsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1IsaUNBQWlDLEVBQ2pDLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2xGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFhLEVBQUUsSUFBd0I7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQ3ZDLFFBQVEsRUFDUixrQ0FBa0MsRUFDbEMsMkJBQTJCLENBQUMsWUFBWSxDQUN4QyxDQUFBO1lBQ0YsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBUyxFQUFFLEVBQU8sRUFBRSxJQUEyQjtRQUMzRCxJQUFJLENBQUM7WUFDSixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxPQUFNLENBQUMsa0NBQWtDO1lBQzFDLENBQUM7WUFFRCwwQ0FBMEM7WUFDMUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUN2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtvQkFDbEMsTUFBTSxFQUFFLElBQUk7b0JBQ1osU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO29CQUN6QixNQUFNLEVBQUUsS0FBSztvQkFDYixNQUFNLEVBQUUsS0FBSztpQkFDYixDQUFDLENBQUE7Z0JBQ0YsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1lBRUQsc0RBQXNEO2lCQUNqRCxDQUFDO2dCQUNMLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxJQUFJLEVBQ0osUUFBUSxDQUFDLHVCQUF1QixFQUFFLHFDQUFxQyxDQUFDLEVBQ3hFLDJCQUEyQixDQUFDLFdBQVcsQ0FDdkMsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQVNELEtBQUssQ0FBQyxRQUFhLEVBQUUsSUFBbUI7UUFDdkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDekQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0RBQWdELEtBQUssS0FBSyxRQUFRLEdBQUcsQ0FBQyxDQUM1RixDQUFBO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQ3BCLFFBQWEsRUFDYixJQUFtQixFQUNuQixXQUE0QjtRQUU1QixJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDbEQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLE1BQU0sSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFLLFVBQWtCLENBQUMsa0JBQWtCLENBQzFELENBQUMsT0FBbUMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM1QixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFrQixFQUFFLENBQUE7WUFDaEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDBDQUEwQyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUNoSCxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3JCLEtBQUssVUFBVTt3QkFDZCxNQUFNLENBQUMsSUFBSSxDQUFDOzRCQUNYLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDLHNCQUFzQixDQUFDOzRCQUM5RCxJQUFJLDhCQUFzQjt5QkFDMUIsQ0FBQyxDQUFBO3dCQUNGLE1BQUs7b0JBQ04sS0FBSyxhQUFhO3dCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDOzRCQUNYLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDLHNCQUFzQixDQUFDOzRCQUM5RCxJQUFJLGdDQUF3Qjt5QkFDNUIsQ0FBQyxDQUFBO3dCQUNGLE1BQUs7b0JBQ04sS0FBSyxVQUFVO3dCQUNkLE1BQU0sQ0FBQyxJQUFJLENBQUM7NEJBQ1gsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUMsc0JBQXNCLENBQUM7NEJBQzlELElBQUksZ0NBQXdCO3lCQUM1QixDQUFDLENBQUE7d0JBQ0YsTUFBSztvQkFDTixLQUFLLFNBQVM7d0JBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLHNFQUFzRSxRQUFRLEdBQUcsQ0FDakYsQ0FBQTt3QkFDRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDMUMsQ0FBQztRQUNGLENBQUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakYsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzVCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFTRCxrQkFBa0IsQ0FBQyxNQUE0QjtRQUM5QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsTUFBaUM7UUFDeEQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsTUFBd0IsRUFDeEIsR0FBa0M7UUFFbEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFaEMsd0RBQXdEO1FBQ3hELElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNwQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUUvQyxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFDdkIsR0FBRyxDQUFDO2dCQUNILFFBQVEsR0FBRyxJQUFJLFFBQVEsSUFBSSxlQUFlLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQTtZQUN6RCxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDO1FBQy9FLENBQUM7UUFFRCxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUV6Qix3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDL0UsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQ2pDLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBYTtRQUM1QiwrQ0FBK0M7UUFDL0MsSUFBSSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTdDLG9FQUFvRTtRQUNwRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQzNFLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDdEMsSUFBSSxDQUFDO29CQUNKLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFDLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDO3dCQUNKLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDL0MsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixTQUFTO29CQUNWLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFhO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxJQUFJLE1BQU0sWUFBWSxvQkFBb0IsRUFBRSxDQUFDO1lBQzVDLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFM0UsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLE1BQU0sRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sU0FBUyxDQUFBLENBQUMsc0NBQXNDO1FBQ3hELENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWE7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLElBQUksTUFBTSxZQUFZLHlCQUF5QixFQUFFLENBQUM7WUFDakQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLFNBQVMsQ0FBQSxDQUFDLDREQUE0RDtRQUM5RSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFdkQsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxTQUFTLENBQUEsQ0FBQyxzQ0FBc0M7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQWE7UUFDdEMsc0RBQXNEO1FBQ3RELHFEQUFxRDtRQUNyRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNoRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsa0RBQWtEO1FBRXBHLDBEQUEwRDtRQUMxRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuRixJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sY0FBYyxDQUFBO1FBQ3RCLENBQUM7UUFFRCwyREFBMkQ7UUFDM0QsTUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUM3RCxJQUFJLENBQUMsS0FBSyxFQUNWLFVBQVUsRUFDVixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FDOUIsQ0FBQTtRQUNELElBQUksbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUM3RCxJQUFJLGNBQWMsR0FBRyxDQUFDLE1BQU0sZUFBZSxDQUFDLGVBQWUsRUFBRSxDQUFDLEtBQUssU0FBUyxDQUFBO1lBQzVFLElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3JCLGNBQWMsR0FBRyxDQUFDLE1BQU0sZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUMsS0FBSyxTQUFTLENBQUE7Z0JBQzNFLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxvQ0FBb0M7WUFDbEUsQ0FBQztZQUVELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDakUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUMzQyxDQUFDO3FCQUFNLElBQUksbUJBQW1CLENBQUMsMkJBQTJCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDN0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNqRCxDQUFDO2dCQUVELE9BQU8sZUFBZSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1Isa0NBQWtDLEVBQ2xDLDJCQUEyQixDQUFDLFdBQVcsQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUFZO0lBRUoseUJBQXlCLENBQUMsS0FBWTtRQUM3QyxJQUFJLEtBQUssWUFBWSx1QkFBdUIsRUFBRSxDQUFDO1lBQzlDLE9BQU8sS0FBSyxDQUFBLENBQUMsMEJBQTBCO1FBQ3hDLENBQUM7UUFFRCxJQUFJLElBQUksR0FBRywyQkFBMkIsQ0FBQyxPQUFPLENBQUE7UUFDOUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDdEMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUNoQixRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLGlFQUFpRSxDQUNqRSxDQUNELENBQUE7WUFDRCxJQUFJLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxDQUFBO1FBQy9DLENBQUM7UUFFRCxPQUFPLDZCQUE2QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sNkJBQTZCLENBQ3BDLFFBQWEsRUFDYixHQUFXLEVBQ1gsSUFBaUM7UUFFakMsT0FBTyw2QkFBNkIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM5RixDQUFDO0NBQ0QifQ==