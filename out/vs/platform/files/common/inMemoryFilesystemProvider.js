/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as resources from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { FileSystemProviderErrorCode, FileType, createFileSystemProviderError, } from './files.js';
class File {
    constructor(name) {
        this.type = FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}
class Directory {
    constructor(name) {
        this.type = FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}
export class InMemoryFileSystemProvider extends Disposable {
    constructor() {
        super(...arguments);
        this.memoryFdCounter = 0;
        this.fdMemory = new Map();
        this._onDidChangeCapabilities = this._register(new Emitter());
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this._capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.root = new Directory('');
        // --- manage file events
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._bufferedChanges = [];
    }
    get capabilities() {
        return this._capabilities;
    }
    setReadOnly(readonly) {
        const isReadonly = !!(this._capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */);
        if (readonly !== isReadonly) {
            this._capabilities = readonly
                ? 2048 /* FileSystemProviderCapabilities.Readonly */ |
                    1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ |
                    2 /* FileSystemProviderCapabilities.FileReadWrite */
                : 2 /* FileSystemProviderCapabilities.FileReadWrite */ |
                    1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            this._onDidChangeCapabilities.fire();
        }
    }
    // --- manage file metadata
    async stat(resource) {
        return this._lookup(resource, false);
    }
    async readdir(resource) {
        const entry = this._lookupAsDirectory(resource, false);
        const result = [];
        entry.entries.forEach((child, name) => result.push([name, child.type]));
        return result;
    }
    // --- manage file contents
    async readFile(resource) {
        const data = this._lookupAsFile(resource, false).data;
        if (data) {
            return data;
        }
        throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
    }
    readFileStream(resource) {
        const data = this._lookupAsFile(resource, false).data;
        const stream = newWriteableStream((data) => VSBuffer.concat(data.map((data) => VSBuffer.wrap(data))).buffer);
        stream.end(data);
        return stream;
    }
    async writeFile(resource, content, opts) {
        const basename = resources.basename(resource);
        const parent = this._lookupParentDirectory(resource);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw createFileSystemProviderError('file is directory', FileSystemProviderErrorCode.FileIsADirectory);
        }
        if (!entry && !opts.create) {
            throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
        }
        if (entry && opts.create && !opts.overwrite) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: 1 /* FileChangeType.ADDED */, resource });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;
        this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource });
    }
    // file open/read/write/close
    open(resource, opts) {
        const data = this._lookupAsFile(resource, false).data;
        if (data) {
            const fd = this.memoryFdCounter++;
            this.fdMemory.set(fd, data);
            return Promise.resolve(fd);
        }
        throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
    }
    close(fd) {
        this.fdMemory.delete(fd);
        return Promise.resolve();
    }
    read(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const toWrite = VSBuffer.wrap(memory).slice(pos, pos + length);
        data.set(toWrite.buffer, offset);
        return Promise.resolve(toWrite.byteLength);
    }
    write(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const toWrite = VSBuffer.wrap(data).slice(offset, offset + length);
        memory.set(toWrite.buffer, pos);
        return Promise.resolve(toWrite.byteLength);
    }
    // --- manage files/folders
    async rename(from, to, opts) {
        if (!opts.overwrite && this._lookup(to, true)) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        const entry = this._lookup(from, false);
        const oldParent = this._lookupParentDirectory(from);
        const newParent = this._lookupParentDirectory(to);
        const newName = resources.basename(to);
        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);
        this._fireSoon({ type: 2 /* FileChangeType.DELETED */, resource: from }, { type: 1 /* FileChangeType.ADDED */, resource: to });
    }
    async delete(resource, opts) {
        const dirname = resources.dirname(resource);
        const basename = resources.basename(resource);
        const parent = this._lookupAsDirectory(dirname, false);
        if (parent.entries.has(basename)) {
            parent.entries.delete(basename);
            parent.mtime = Date.now();
            parent.size -= 1;
            this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource: dirname }, { resource, type: 2 /* FileChangeType.DELETED */ });
        }
    }
    async mkdir(resource) {
        if (this._lookup(resource, true)) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        const basename = resources.basename(resource);
        const dirname = resources.dirname(resource);
        const parent = this._lookupAsDirectory(dirname, false);
        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource: dirname }, { type: 1 /* FileChangeType.ADDED */, resource });
    }
    _lookup(uri, silent) {
        const parts = uri.path.split('/');
        let entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
                }
                else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }
    _lookupAsDirectory(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw createFileSystemProviderError('file not a directory', FileSystemProviderErrorCode.FileNotADirectory);
    }
    _lookupAsFile(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw createFileSystemProviderError('file is a directory', FileSystemProviderErrorCode.FileIsADirectory);
    }
    _lookupParentDirectory(uri) {
        const dirname = resources.dirname(uri);
        return this._lookupAsDirectory(dirname, false);
    }
    watch(resource, opts) {
        // ignore, fires for all changes...
        return Disposable.None;
    }
    _fireSoon(...changes) {
        this._bufferedChanges.push(...changes);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._onDidChangeFile.fire(this._bufferedChanges);
            this._bufferedChanges.length = 0;
        }, 5);
    }
    dispose() {
        super.dispose();
        this.fdMemory.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5NZW1vcnlGaWxlc3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vaW5NZW1vcnlGaWxlc3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxLQUFLLFNBQVMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekYsT0FBTyxFQUtOLDJCQUEyQixFQUMzQixRQUFRLEVBTVIsNkJBQTZCLEdBTzdCLE1BQU0sWUFBWSxDQUFBO0FBRW5CLE1BQU0sSUFBSTtJQVNULFlBQVksSUFBWTtRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7UUFDYixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFNBQVM7SUFTZCxZQUFZLElBQVk7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFBO1FBQzlCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ3pCLENBQUM7Q0FDRDtBQUlELE1BQU0sT0FBTywwQkFDWixTQUFRLFVBQVU7SUFEbkI7O1FBVVMsb0JBQWUsR0FBRyxDQUFDLENBQUE7UUFDVixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUE7UUFDakQsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDN0QsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQTtRQUU5RCxrQkFBYSxHQUNwQixrSEFBK0YsQ0FBQTtRQWtCaEcsU0FBSSxHQUFHLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBZ1B4Qix5QkFBeUI7UUFFUixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUEwQixDQUFDLENBQUE7UUFDaEYsb0JBQWUsR0FBa0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtRQUU3RSxxQkFBZ0IsR0FBa0IsRUFBRSxDQUFBO0lBMEI3QyxDQUFDO0lBaFNBLElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWlCO1FBQzVCLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLHFEQUEwQyxDQUFDLENBQUE7UUFDbkYsSUFBSSxRQUFRLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRO2dCQUM1QixDQUFDLENBQUM7K0VBQytDO3dFQUNKO2dCQUM3QyxDQUFDLENBQUM7K0VBQytDLENBQUE7WUFDbEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBSUQsMkJBQTJCO0lBRTNCLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWE7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELDJCQUEyQjtJQUUzQixLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWE7UUFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3JELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLDZCQUE2QixDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ2hHLENBQUM7SUFFRCxjQUFjLENBQUMsUUFBYTtRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFFckQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQ2hDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FDekUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFhLEVBQUUsT0FBbUIsRUFBRSxJQUF1QjtRQUMxRSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRCxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4QyxJQUFJLEtBQUssWUFBWSxTQUFTLEVBQUUsQ0FBQztZQUNoQyxNQUFNLDZCQUE2QixDQUNsQyxtQkFBbUIsRUFDbkIsMkJBQTJCLENBQUMsZ0JBQWdCLENBQzVDLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLDZCQUE2QixDQUNsQyxnQkFBZ0IsRUFDaEIsMkJBQTJCLENBQUMsWUFBWSxDQUN4QyxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0MsTUFBTSw2QkFBNkIsQ0FDbEMscUJBQXFCLEVBQ3JCLDJCQUEyQixDQUFDLFVBQVUsQ0FDdEMsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLDhCQUFzQixFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUNELEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLEtBQUssQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQTtRQUMvQixLQUFLLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQTtRQUVwQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxnQ0FBd0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCw2QkFBNkI7SUFDN0IsSUFBSSxDQUFDLFFBQWEsRUFBRSxJQUFzQjtRQUN6QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDckQsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDM0IsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFDRCxNQUFNLDZCQUE2QixDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ2hHLENBQUM7SUFFRCxLQUFLLENBQUMsRUFBVTtRQUNmLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxJQUFJLENBQUMsRUFBVSxFQUFFLEdBQVcsRUFBRSxJQUFnQixFQUFFLE1BQWMsRUFBRSxNQUFjO1FBQzdFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sNkJBQTZCLENBQ2xDLG1DQUFtQyxFQUNuQywyQkFBMkIsQ0FBQyxXQUFXLENBQ3ZDLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsS0FBSyxDQUNKLEVBQVUsRUFDVixHQUFXLEVBQ1gsSUFBZ0IsRUFDaEIsTUFBYyxFQUNkLE1BQWM7UUFFZCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLDZCQUE2QixDQUNsQyxtQ0FBbUMsRUFDbkMsMkJBQTJCLENBQUMsV0FBVyxDQUN2QyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELDJCQUEyQjtJQUUzQixLQUFLLENBQUMsTUFBTSxDQUFDLElBQVMsRUFBRSxFQUFPLEVBQUUsSUFBMkI7UUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxNQUFNLDZCQUE2QixDQUNsQyxxQkFBcUIsRUFDckIsMkJBQTJCLENBQUMsVUFBVSxDQUN0QyxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDakQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUV0QyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsS0FBSyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUE7UUFDcEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXJDLElBQUksQ0FBQyxTQUFTLENBQ2IsRUFBRSxJQUFJLGdDQUF3QixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFDaEQsRUFBRSxJQUFJLDhCQUFzQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FDNUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQWEsRUFBRSxJQUF3QjtRQUNuRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDekIsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUE7WUFDaEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixFQUFFLElBQUksZ0NBQXdCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUNuRCxFQUFFLFFBQVEsRUFBRSxJQUFJLGdDQUF3QixFQUFFLENBQzFDLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBYTtRQUN4QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsTUFBTSw2QkFBNkIsQ0FDbEMscUJBQXFCLEVBQ3JCLDJCQUEyQixDQUFDLFVBQVUsQ0FDdEMsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV0RCxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxTQUFTLENBQ2IsRUFBRSxJQUFJLGdDQUF3QixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFDbkQsRUFBRSxJQUFJLDhCQUFzQixFQUFFLFFBQVEsRUFBRSxDQUN4QyxDQUFBO0lBQ0YsQ0FBQztJQU1PLE9BQU8sQ0FBQyxHQUFRLEVBQUUsTUFBZTtRQUN4QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqQyxJQUFJLEtBQUssR0FBVSxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxLQUF3QixDQUFBO1lBQzVCLElBQUksS0FBSyxZQUFZLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEMsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsTUFBTSw2QkFBNkIsQ0FDbEMsZ0JBQWdCLEVBQ2hCLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxTQUFTLENBQUE7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNkLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsTUFBZTtRQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN2QyxJQUFJLEtBQUssWUFBWSxTQUFTLEVBQUUsQ0FBQztZQUNoQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLDZCQUE2QixDQUNsQyxzQkFBc0IsRUFDdEIsMkJBQTJCLENBQUMsaUJBQWlCLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLEdBQVEsRUFBRSxNQUFlO1FBQzlDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLElBQUksS0FBSyxZQUFZLElBQUksRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sNkJBQTZCLENBQ2xDLHFCQUFxQixFQUNyQiwyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FDNUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxHQUFRO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFVRCxLQUFLLENBQUMsUUFBYSxFQUFFLElBQW1CO1FBQ3ZDLG1DQUFtQztRQUNuQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVPLFNBQVMsQ0FBQyxHQUFHLE9BQXNCO1FBQzFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUV0QyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNqRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNqQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVmLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztDQUNEIn0=