/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promises } from 'fs';
import { Barrier, retry } from '../../../base/common/async.js';
import { ResourceMap } from '../../../base/common/map.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { isEqual } from '../../../base/common/extpath.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { basename, dirname, join } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase, joinPath, basename as resourcesBasename, dirname as resourcesDirname, } from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { Promises, RimRafMode, SymlinkSupport } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, FileSystemProviderError, FileSystemProviderErrorCode, FileType, isFileOpenForWriteOptions, FilePermission, } from '../common/files.js';
import { readFileIntoStream } from '../common/io.js';
import { AbstractDiskFileSystemProvider, } from '../common/diskFileSystemProvider.js';
import { UniversalWatcherClient } from './watcher/watcherClient.js';
import { NodeJSWatcherClient } from './watcher/nodejs/nodejsClient.js';
export class DiskFileSystemProvider extends AbstractDiskFileSystemProvider {
    static { this.TRACE_LOG_RESOURCE_LOCKS = false; } // not enabled by default because very spammy
    constructor(logService, options) {
        super(logService, options);
        //#region File Capabilities
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Reading/Writing
        this.resourceLocks = new ResourceMap((resource) => extUriBiasedIgnorePathCase.getComparisonKey(resource));
        this.mapHandleToPos = new Map();
        this.mapHandleToLock = new Map();
        this.writeHandles = new Map();
    }
    get capabilities() {
        if (!this._capabilities) {
            this._capabilities =
                2 /* FileSystemProviderCapabilities.FileReadWrite */ |
                    4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
                    16 /* FileSystemProviderCapabilities.FileReadStream */ |
                    8 /* FileSystemProviderCapabilities.FileFolderCopy */ |
                    8192 /* FileSystemProviderCapabilities.FileWriteUnlock */ |
                    16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
                    32768 /* FileSystemProviderCapabilities.FileAtomicWrite */ |
                    65536 /* FileSystemProviderCapabilities.FileAtomicDelete */ |
                    131072 /* FileSystemProviderCapabilities.FileClone */;
            if (isLinux) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    //#region File Metadata Resolving
    async stat(resource) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(this.toFilePath(resource)); // cannot use fs.stat() here to support links properly
            return {
                type: this.toType(stat, symbolicLink),
                ctime: stat.birthtime.getTime(), // intentionally not using ctime here, we want the creation time
                mtime: stat.mtime.getTime(),
                size: stat.size,
                permissions: (stat.mode & 0o200) === 0 ? FilePermission.Locked : undefined,
            };
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async statIgnoreError(resource) {
        try {
            return await this.stat(resource);
        }
        catch (error) {
            return undefined;
        }
    }
    async readdir(resource) {
        try {
            const children = await Promises.readdir(this.toFilePath(resource), { withFileTypes: true });
            const result = [];
            await Promise.all(children.map(async (child) => {
                try {
                    let type;
                    if (child.isSymbolicLink()) {
                        type = (await this.stat(joinPath(resource, child.name))).type; // always resolve target the link points to if any
                    }
                    else {
                        type = this.toType(child);
                    }
                    result.push([child.name, type]);
                }
                catch (error) {
                    this.logService.trace(error); // ignore errors for individual entries that can arise from permission denied
                }
            }));
            return result;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    toType(entry, symbolicLink) {
        // Signal file type by checking for file / directory, except:
        // - symbolic links pointing to nonexistent files are FileType.Unknown
        // - files that are neither file nor directory are FileType.Unknown
        let type;
        if (symbolicLink?.dangling) {
            type = FileType.Unknown;
        }
        else if (entry.isFile()) {
            type = FileType.File;
        }
        else if (entry.isDirectory()) {
            type = FileType.Directory;
        }
        else {
            type = FileType.Unknown;
        }
        // Always signal symbolic link as file type additionally
        if (symbolicLink) {
            type |= FileType.SymbolicLink;
        }
        return type;
    }
    async createResourceLock(resource) {
        const filePath = this.toFilePath(resource);
        this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - request to acquire resource lock (${filePath})`);
        // Await pending locks for resource. It is possible for a new lock being
        // added right after opening, so we have to loop over locks until no lock
        // remains.
        let existingLock = undefined;
        while ((existingLock = this.resourceLocks.get(resource))) {
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - waiting for resource lock to be released (${filePath})`);
            await existingLock.wait();
        }
        // Store new
        const newLock = new Barrier();
        this.resourceLocks.set(resource, newLock);
        this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - new resource lock created (${filePath})`);
        return toDisposable(() => {
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock dispose() (${filePath})`);
            // Delete lock if it is still ours
            if (this.resourceLocks.get(resource) === newLock) {
                this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock removed from resource-lock map (${filePath})`);
                this.resourceLocks.delete(resource);
            }
            // Open lock
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock barrier open() (${filePath})`);
            newLock.open();
        });
    }
    async readFile(resource, options) {
        let lock = undefined;
        try {
            if (options?.atomic) {
                this.traceLock(`[Disk FileSystemProvider]: atomic read operation started (${this.toFilePath(resource)})`);
                // When the read should be atomic, make sure
                // to await any pending locks for the resource
                // and lock for the duration of the read.
                lock = await this.createResourceLock(resource);
            }
            const filePath = this.toFilePath(resource);
            return await promises.readFile(filePath);
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            lock?.dispose();
        }
    }
    traceLock(msg) {
        if (DiskFileSystemProvider.TRACE_LOG_RESOURCE_LOCKS) {
            this.logService.trace(msg);
        }
    }
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream((data) => VSBuffer.concat(data.map((data) => VSBuffer.wrap(data))).buffer);
        readFileIntoStream(this, resource, stream, (data) => data.buffer, {
            ...opts,
            bufferSize: 256 * 1024, // read into chunks of 256kb each to reduce IPC overhead
        }, token);
        return stream;
    }
    async writeFile(resource, content, opts) {
        if (opts?.atomic !== false &&
            opts?.atomic?.postfix &&
            (await this.canWriteFileAtomic(resource))) {
            return this.doWriteFileAtomic(resource, joinPath(resourcesDirname(resource), `${resourcesBasename(resource)}${opts.atomic.postfix}`), content, opts);
        }
        else {
            return this.doWriteFile(resource, content, opts);
        }
    }
    async canWriteFileAtomic(resource) {
        try {
            const filePath = this.toFilePath(resource);
            const { symbolicLink } = await SymlinkSupport.stat(filePath);
            if (symbolicLink) {
                // atomic writes are unsupported for symbolic links because
                // we need to ensure that the `rename` operation is atomic
                // and that only works if the link is on the same disk.
                // Since we do not know where the symbolic link points to
                // we refuse to write atomically.
                return false;
            }
        }
        catch (error) {
            // ignore stat errors here and just proceed trying to write
        }
        return true; // atomic writing supported
    }
    async doWriteFileAtomic(resource, tempResource, content, opts) {
        // Ensure to create locks for all resources involved
        // since atomic write involves mutiple disk operations
        // and resources.
        const locks = new DisposableStore();
        try {
            locks.add(await this.createResourceLock(resource));
            locks.add(await this.createResourceLock(tempResource));
            // Write to temp resource first
            await this.doWriteFile(tempResource, content, opts, true /* disable write lock */);
            try {
                // Rename over existing to ensure atomic replace
                await this.rename(tempResource, resource, { overwrite: true });
            }
            catch (error) {
                // Cleanup in case of rename error
                try {
                    await this.delete(tempResource, { recursive: false, useTrash: false, atomic: false });
                }
                catch (error) {
                    // ignore - we want the outer error to bubble up
                }
                throw error;
            }
        }
        finally {
            locks.dispose();
        }
    }
    async doWriteFile(resource, content, opts, disableWriteLock) {
        let handle = undefined;
        try {
            const filePath = this.toFilePath(resource);
            // Validate target unless { create: true, overwrite: true }
            if (!opts.create || !opts.overwrite) {
                const fileExists = await Promises.exists(filePath);
                if (fileExists) {
                    if (!opts.overwrite) {
                        throw createFileSystemProviderError(localize('fileExists', 'File already exists'), FileSystemProviderErrorCode.FileExists);
                    }
                }
                else {
                    if (!opts.create) {
                        throw createFileSystemProviderError(localize('fileNotExists', 'File does not exist'), FileSystemProviderErrorCode.FileNotFound);
                    }
                }
            }
            // Open
            handle = await this.open(resource, { create: true, unlock: opts.unlock }, disableWriteLock);
            // Write content at once
            await this.write(handle, 0, content, 0, content.byteLength);
        }
        catch (error) {
            throw await this.toFileSystemProviderWriteError(resource, error);
        }
        finally {
            if (typeof handle === 'number') {
                await this.close(handle);
            }
        }
    }
    static { this.canFlush = true; }
    static configureFlushOnWrite(enabled) {
        DiskFileSystemProvider.canFlush = enabled;
    }
    async open(resource, opts, disableWriteLock) {
        const filePath = this.toFilePath(resource);
        // Writes: guard multiple writes to the same resource
        // behind a single lock to prevent races when writing
        // from multiple places at the same time to the same file
        let lock = undefined;
        if (isFileOpenForWriteOptions(opts) && !disableWriteLock) {
            lock = await this.createResourceLock(resource);
        }
        let fd = undefined;
        try {
            // Determine whether to unlock the file (write only)
            if (isFileOpenForWriteOptions(opts) && opts.unlock) {
                try {
                    const { stat } = await SymlinkSupport.stat(filePath);
                    if (!((stat.mode & 0o200) /* File mode indicating writable by owner */)) {
                        await promises.chmod(filePath, stat.mode | 0o200);
                    }
                }
                catch (error) {
                    if (error.code !== 'ENOENT') {
                        this.logService.trace(error); // log errors but do not give up writing
                    }
                }
            }
            // Windows gets special treatment (write only)
            if (isWindows && isFileOpenForWriteOptions(opts)) {
                try {
                    // We try to use 'r+' for opening (which will fail if the file does not exist)
                    // to prevent issues when saving hidden files or preserving alternate data
                    // streams.
                    // Related issues:
                    // - https://github.com/microsoft/vscode/issues/931
                    // - https://github.com/microsoft/vscode/issues/6363
                    fd = await Promises.open(filePath, 'r+');
                    // The flag 'r+' will not truncate the file, so we have to do this manually
                    await Promises.ftruncate(fd, 0);
                }
                catch (error) {
                    if (error.code !== 'ENOENT') {
                        this.logService.trace(error); // log errors but do not give up writing
                    }
                    // Make sure to close the file handle if we have one
                    if (typeof fd === 'number') {
                        try {
                            await Promises.close(fd);
                        }
                        catch (error) {
                            this.logService.trace(error); // log errors but do not give up writing
                        }
                        // Reset `fd` to be able to try again with 'w'
                        fd = undefined;
                    }
                }
            }
            if (typeof fd !== 'number') {
                fd = await Promises.open(filePath, isFileOpenForWriteOptions(opts)
                    ? // We take `opts.create` as a hint that the file is opened for writing
                        // as such we use 'w' to truncate an existing or create the
                        // file otherwise. we do not allow reading.
                        'w'
                    : // Otherwise we assume the file is opened for reading
                        // as such we use 'r' to neither truncate, nor create
                        // the file.
                        'r');
            }
        }
        catch (error) {
            // Release lock because we have no valid handle
            // if we did open a lock during this operation
            lock?.dispose();
            // Rethrow as file system provider error
            if (isFileOpenForWriteOptions(opts)) {
                throw await this.toFileSystemProviderWriteError(resource, error);
            }
            else {
                throw this.toFileSystemProviderError(error);
            }
        }
        // Remember this handle to track file position of the handle
        // we init the position to 0 since the file descriptor was
        // just created and the position was not moved so far (see
        // also http://man7.org/linux/man-pages/man2/open.2.html -
        // "The file offset is set to the beginning of the file.")
        this.mapHandleToPos.set(fd, 0);
        // remember that this handle was used for writing
        if (isFileOpenForWriteOptions(opts)) {
            this.writeHandles.set(fd, resource);
        }
        if (lock) {
            const previousLock = this.mapHandleToLock.get(fd);
            // Remember that this handle has an associated lock
            this.traceLock(`[Disk FileSystemProvider]: open() - storing lock for handle ${fd} (${filePath})`);
            this.mapHandleToLock.set(fd, lock);
            // There is a slight chance that a resource lock for a
            // handle was not yet disposed when we acquire a new
            // lock, so we must ensure to dispose the previous lock
            // before storing a new one for the same handle, other
            // wise we end up in a deadlock situation
            // https://github.com/microsoft/vscode/issues/142462
            if (previousLock) {
                this.traceLock(`[Disk FileSystemProvider]: open() - disposing a previous lock that was still stored on same handle ${fd} (${filePath})`);
                previousLock.dispose();
            }
        }
        return fd;
    }
    async close(fd) {
        // It is very important that we keep any associated lock
        // for the file handle before attempting to call `fs.close(fd)`
        // because of a possible race condition: as soon as a file
        // handle is released, the OS may assign the same handle to
        // the next `fs.open` call and as such it is possible that our
        // lock is getting overwritten
        const lockForHandle = this.mapHandleToLock.get(fd);
        try {
            // Remove this handle from map of positions
            this.mapHandleToPos.delete(fd);
            // If a handle is closed that was used for writing, ensure
            // to flush the contents to disk if possible.
            if (this.writeHandles.delete(fd) && DiskFileSystemProvider.canFlush) {
                try {
                    await Promises.fdatasync(fd); // https://github.com/microsoft/vscode/issues/9589
                }
                catch (error) {
                    // In some exotic setups it is well possible that node fails to sync
                    // In that case we disable flushing and log the error to our logger
                    DiskFileSystemProvider.configureFlushOnWrite(false);
                    this.logService.error(error);
                }
            }
            return await Promises.close(fd);
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            if (lockForHandle) {
                if (this.mapHandleToLock.get(fd) === lockForHandle) {
                    this.traceLock(`[Disk FileSystemProvider]: close() - resource lock removed from handle-lock map ${fd}`);
                    this.mapHandleToLock.delete(fd); // only delete from map if this is still our lock!
                }
                this.traceLock(`[Disk FileSystemProvider]: close() - disposing lock for handle ${fd}`);
                lockForHandle.dispose();
            }
        }
    }
    async read(fd, pos, data, offset, length) {
        const normalizedPos = this.normalizePos(fd, pos);
        let bytesRead = null;
        try {
            bytesRead = (await Promises.read(fd, data, offset, length, normalizedPos)).bytesRead;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            this.updatePos(fd, normalizedPos, bytesRead);
        }
        return bytesRead;
    }
    normalizePos(fd, pos) {
        // When calling fs.read/write we try to avoid passing in the "pos" argument and
        // rather prefer to pass in "null" because this avoids an extra seek(pos)
        // call that in some cases can even fail (e.g. when opening a file over FTP -
        // see https://github.com/microsoft/vscode/issues/73884).
        //
        // as such, we compare the passed in position argument with our last known
        // position for the file descriptor and use "null" if they match.
        if (pos === this.mapHandleToPos.get(fd)) {
            return null;
        }
        return pos;
    }
    updatePos(fd, pos, bytesLength) {
        const lastKnownPos = this.mapHandleToPos.get(fd);
        if (typeof lastKnownPos === 'number') {
            // pos !== null signals that previously a position was used that is
            // not null. node.js documentation explains, that in this case
            // the internal file pointer is not moving and as such we do not move
            // our position pointer.
            //
            // Docs: "If position is null, data will be read from the current file position,
            // and the file position will be updated. If position is an integer, the file position
            // will remain unchanged."
            if (typeof pos === 'number') {
                // do not modify the position
            }
            // bytesLength = number is a signal that the read/write operation was
            // successful and as such we need to advance the position in the Map
            //
            // Docs (http://man7.org/linux/man-pages/man2/read.2.html):
            // "On files that support seeking, the read operation commences at the
            // file offset, and the file offset is incremented by the number of
            // bytes read."
            //
            // Docs (http://man7.org/linux/man-pages/man2/write.2.html):
            // "For a seekable file (i.e., one to which lseek(2) may be applied, for
            // example, a regular file) writing takes place at the file offset, and
            // the file offset is incremented by the number of bytes actually
            // written."
            else if (typeof bytesLength === 'number') {
                this.mapHandleToPos.set(fd, lastKnownPos + bytesLength);
            }
            // bytesLength = null signals an error in the read/write operation
            // and as such we drop the handle from the Map because the position
            // is unspecificed at this point.
            else {
                this.mapHandleToPos.delete(fd);
            }
        }
    }
    async write(fd, pos, data, offset, length) {
        // We know at this point that the file to write to is truncated and thus empty
        // if the write now fails, the file remains empty. as such we really try hard
        // to ensure the write succeeds by retrying up to three times.
        return retry(() => this.doWrite(fd, pos, data, offset, length), 100 /* ms delay */, 3 /* retries */);
    }
    async doWrite(fd, pos, data, offset, length) {
        const normalizedPos = this.normalizePos(fd, pos);
        let bytesWritten = null;
        try {
            bytesWritten = (await Promises.write(fd, data, offset, length, normalizedPos)).bytesWritten;
        }
        catch (error) {
            throw await this.toFileSystemProviderWriteError(this.writeHandles.get(fd), error);
        }
        finally {
            this.updatePos(fd, normalizedPos, bytesWritten);
        }
        return bytesWritten;
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async mkdir(resource) {
        try {
            await promises.mkdir(this.toFilePath(resource));
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async delete(resource, opts) {
        try {
            const filePath = this.toFilePath(resource);
            if (opts.recursive) {
                let rmMoveToPath = undefined;
                if (opts?.atomic !== false && opts.atomic.postfix) {
                    rmMoveToPath = join(dirname(filePath), `${basename(filePath)}${opts.atomic.postfix}`);
                }
                await Promises.rm(filePath, RimRafMode.MOVE, rmMoveToPath);
            }
            else {
                try {
                    await promises.unlink(filePath);
                }
                catch (unlinkError) {
                    // `fs.unlink` will throw when used on directories
                    // we try to detect this error and then see if the
                    // provided resource is actually a directory. in that
                    // case we use `fs.rmdir` to delete the directory.
                    if (unlinkError.code === 'EPERM' || unlinkError.code === 'EISDIR') {
                        let isDirectory = false;
                        try {
                            const { stat, symbolicLink } = await SymlinkSupport.stat(filePath);
                            isDirectory = stat.isDirectory() && !symbolicLink;
                        }
                        catch (statError) {
                            // ignore
                        }
                        if (isDirectory) {
                            await promises.rmdir(filePath);
                        }
                        else {
                            throw unlinkError;
                        }
                    }
                    else {
                        throw unlinkError;
                    }
                }
            }
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async rename(from, to, opts) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        if (fromFilePath === toFilePath) {
            return; // simulate node.js behaviour here and do a no-op if paths match
        }
        try {
            // Validate the move operation can perform
            await this.validateMoveCopy(from, to, 'move', opts.overwrite);
            // Rename
            await Promises.rename(fromFilePath, toFilePath);
        }
        catch (error) {
            // Rewrite some typical errors that can happen especially around symlinks
            // to something the user can better understand
            if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
                error = new Error(localize('moveError', "Unable to move '{0}' into '{1}' ({2}).", basename(fromFilePath), basename(dirname(toFilePath)), error.toString()));
            }
            throw this.toFileSystemProviderError(error);
        }
    }
    async copy(from, to, opts) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        if (fromFilePath === toFilePath) {
            return; // simulate node.js behaviour here and do a no-op if paths match
        }
        try {
            // Validate the copy operation can perform
            await this.validateMoveCopy(from, to, 'copy', opts.overwrite);
            // Copy
            await Promises.copy(fromFilePath, toFilePath, { preserveSymlinks: true });
        }
        catch (error) {
            // Rewrite some typical errors that can happen especially around symlinks
            // to something the user can better understand
            if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
                error = new Error(localize('copyError', "Unable to copy '{0}' into '{1}' ({2}).", basename(fromFilePath), basename(dirname(toFilePath)), error.toString()));
            }
            throw this.toFileSystemProviderError(error);
        }
    }
    async validateMoveCopy(from, to, mode, overwrite) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        let isSameResourceWithDifferentPathCase = false;
        const isPathCaseSensitive = !!(this.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (!isPathCaseSensitive) {
            isSameResourceWithDifferentPathCase = isEqual(fromFilePath, toFilePath, true /* ignore case */);
        }
        if (isSameResourceWithDifferentPathCase) {
            // You cannot copy the same file to the same location with different
            // path case unless you are on a case sensitive file system
            if (mode === 'copy') {
                throw createFileSystemProviderError(localize('fileCopyErrorPathCase', 'File cannot be copied to same path with different path case'), FileSystemProviderErrorCode.FileExists);
            }
            // You can move the same file to the same location with different
            // path case on case insensitive file systems
            else if (mode === 'move') {
                return;
            }
        }
        // Here we have to see if the target to move/copy to exists or not.
        // We need to respect the `overwrite` option to throw in case the
        // target exists.
        const fromStat = await this.statIgnoreError(from);
        if (!fromStat) {
            throw createFileSystemProviderError(localize('fileMoveCopyErrorNotFound', 'File to move/copy does not exist'), FileSystemProviderErrorCode.FileNotFound);
        }
        const toStat = await this.statIgnoreError(to);
        if (!toStat) {
            return; // target does not exist so we are good
        }
        if (!overwrite) {
            throw createFileSystemProviderError(localize('fileMoveCopyErrorExists', 'File at target already exists and thus will not be moved/copied to unless overwrite is specified'), FileSystemProviderErrorCode.FileExists);
        }
        // Handle existing target for move/copy
        if ((fromStat.type & FileType.File) !== 0 && (toStat.type & FileType.File) !== 0) {
            return; // node.js can move/copy a file over an existing file without having to delete it first
        }
        else {
            await this.delete(to, { recursive: true, useTrash: false, atomic: false });
        }
    }
    //#endregion
    //#region Clone File
    async cloneFile(from, to) {
        return this.doCloneFile(from, to, false /* optimistically assume parent folders exist */);
    }
    async doCloneFile(from, to, mkdir) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        const isPathCaseSensitive = !!(this.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (isEqual(fromFilePath, toFilePath, !isPathCaseSensitive)) {
            return; // cloning is only supported `from` and `to` are different files
        }
        // Implement clone by using `fs.copyFile`, however setup locks
        // for both `from` and `to` because node.js does not ensure
        // this to be an atomic operation
        const locks = new DisposableStore();
        try {
            locks.add(await this.createResourceLock(from));
            locks.add(await this.createResourceLock(to));
            if (mkdir) {
                await promises.mkdir(dirname(toFilePath), { recursive: true });
            }
            await promises.copyFile(fromFilePath, toFilePath);
        }
        catch (error) {
            if (error.code === 'ENOENT' && !mkdir) {
                return this.doCloneFile(from, to, true);
            }
            throw this.toFileSystemProviderError(error);
        }
        finally {
            locks.dispose();
        }
    }
    //#endregion
    //#region File Watching
    createUniversalWatcher(onChange, onLogMessage, verboseLogging) {
        return new UniversalWatcherClient((changes) => onChange(changes), (msg) => onLogMessage(msg), verboseLogging);
    }
    createNonRecursiveWatcher(onChange, onLogMessage, verboseLogging) {
        return new NodeJSWatcherClient((changes) => onChange(changes), (msg) => onLogMessage(msg), verboseLogging);
    }
    //#endregion
    //#region Helpers
    toFileSystemProviderError(error) {
        if (error instanceof FileSystemProviderError) {
            return error; // avoid double conversion
        }
        let resultError = error;
        let code;
        switch (error.code) {
            case 'ENOENT':
                code = FileSystemProviderErrorCode.FileNotFound;
                break;
            case 'EISDIR':
                code = FileSystemProviderErrorCode.FileIsADirectory;
                break;
            case 'ENOTDIR':
                code = FileSystemProviderErrorCode.FileNotADirectory;
                break;
            case 'EEXIST':
                code = FileSystemProviderErrorCode.FileExists;
                break;
            case 'EPERM':
            case 'EACCES':
                code = FileSystemProviderErrorCode.NoPermissions;
                break;
            case 'ERR_UNC_HOST_NOT_ALLOWED':
                resultError = `${error.message}. Please update the 'security.allowedUNCHosts' setting if you want to allow this host.`;
                code = FileSystemProviderErrorCode.Unknown;
                break;
            default:
                code = FileSystemProviderErrorCode.Unknown;
        }
        return createFileSystemProviderError(resultError, code);
    }
    async toFileSystemProviderWriteError(resource, error) {
        let fileSystemProviderWriteError = this.toFileSystemProviderError(error);
        // If the write error signals permission issues, we try
        // to read the file's mode to see if the file is write
        // locked.
        if (resource &&
            fileSystemProviderWriteError.code === FileSystemProviderErrorCode.NoPermissions) {
            try {
                const { stat } = await SymlinkSupport.stat(this.toFilePath(resource));
                if (!((stat.mode & 0o200) /* File mode indicating writable by owner */)) {
                    fileSystemProviderWriteError = createFileSystemProviderError(error, FileSystemProviderErrorCode.FileWriteLocked);
                }
            }
            catch (error) {
                this.logService.trace(error); // ignore - return original error
            }
        }
        return fileSystemProviderWriteError;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVMsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLFFBQVEsRUFDUixRQUFRLElBQUksaUJBQWlCLEVBQzdCLE9BQU8sSUFBSSxnQkFBZ0IsR0FDM0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sZ0NBQWdDLENBQUE7QUFFekYsT0FBTyxFQUFXLFFBQVEsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FB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