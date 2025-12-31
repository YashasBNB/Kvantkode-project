/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { ResourceQueue, timeout } from '../common/async.js';
import { isEqualOrParent, isRootOrDriveLetter, randomPath } from '../common/extpath.js';
import { normalizeNFC } from '../common/normalization.js';
import { join } from '../common/path.js';
import { isLinux, isMacintosh, isWindows } from '../common/platform.js';
import { extUriBiasedIgnorePathCase } from '../common/resources.js';
import { URI } from '../common/uri.js';
//#region rimraf
export var RimRafMode;
(function (RimRafMode) {
    /**
     * Slow version that unlinks each file and folder.
     */
    RimRafMode[RimRafMode["UNLINK"] = 0] = "UNLINK";
    /**
     * Fast version that first moves the file/folder
     * into a temp directory and then deletes that
     * without waiting for it.
     */
    RimRafMode[RimRafMode["MOVE"] = 1] = "MOVE";
})(RimRafMode || (RimRafMode = {}));
async function rimraf(path, mode = RimRafMode.UNLINK, moveToPath) {
    if (isRootOrDriveLetter(path)) {
        throw new Error('rimraf - will refuse to recursively delete root');
    }
    // delete: via rm
    if (mode === RimRafMode.UNLINK) {
        return rimrafUnlink(path);
    }
    // delete: via move
    return rimrafMove(path, moveToPath);
}
async function rimrafMove(path, moveToPath = randomPath(tmpdir())) {
    try {
        try {
            await fs.promises.rename(path, moveToPath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return; // ignore - path to delete did not exist
            }
            return rimrafUnlink(path); // otherwise fallback to unlink
        }
        // Delete but do not return as promise
        rimrafUnlink(moveToPath).catch((error) => {
            /* ignore */
        });
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
async function rimrafUnlink(path) {
    return fs.promises.rm(path, { recursive: true, force: true, maxRetries: 3 });
}
export function rimrafSync(path) {
    if (isRootOrDriveLetter(path)) {
        throw new Error('rimraf - will refuse to recursively delete root');
    }
    fs.rmSync(path, { recursive: true, force: true, maxRetries: 3 });
}
async function readdir(path, options) {
    return handleDirectoryChildren(await (options ? safeReaddirWithFileTypes(path) : fs.promises.readdir(path)));
}
async function safeReaddirWithFileTypes(path) {
    try {
        return await fs.promises.readdir(path, { withFileTypes: true });
    }
    catch (error) {
        console.warn('[node.js fs] readdir with filetypes failed with error: ', error);
    }
    // Fallback to manually reading and resolving each
    // children of the folder in case we hit an error
    // previously.
    // This can only really happen on exotic file systems
    // such as explained in #115645 where we get entries
    // from `readdir` that we can later not `lstat`.
    const result = [];
    const children = await readdir(path);
    for (const child of children) {
        let isFile = false;
        let isDirectory = false;
        let isSymbolicLink = false;
        try {
            const lstat = await fs.promises.lstat(join(path, child));
            isFile = lstat.isFile();
            isDirectory = lstat.isDirectory();
            isSymbolicLink = lstat.isSymbolicLink();
        }
        catch (error) {
            console.warn('[node.js fs] unexpected error from lstat after readdir: ', error);
        }
        result.push({
            name: child,
            isFile: () => isFile,
            isDirectory: () => isDirectory,
            isSymbolicLink: () => isSymbolicLink,
        });
    }
    return result;
}
/**
 * Drop-in replacement of `fs.readdirSync` with support
 * for converting from macOS NFD unicon form to NFC
 * (https://github.com/nodejs/node/issues/2165)
 */
export function readdirSync(path) {
    return handleDirectoryChildren(fs.readdirSync(path));
}
function handleDirectoryChildren(children) {
    return children.map((child) => {
        // Mac: uses NFD unicode form on disk, but we want NFC
        // See also https://github.com/nodejs/node/issues/2165
        if (typeof child === 'string') {
            return isMacintosh ? normalizeNFC(child) : child;
        }
        child.name = isMacintosh ? normalizeNFC(child.name) : child.name;
        return child;
    });
}
/**
 * A convenience method to read all children of a path that
 * are directories.
 */
async function readDirsInDir(dirPath) {
    const children = await readdir(dirPath);
    const directories = [];
    for (const child of children) {
        if (await SymlinkSupport.existsDirectory(join(dirPath, child))) {
            directories.push(child);
        }
    }
    return directories;
}
//#endregion
//#region whenDeleted()
/**
 * A `Promise` that resolves when the provided `path`
 * is deleted from disk.
 */
export function whenDeleted(path, intervalMs = 1000) {
    return new Promise((resolve) => {
        let running = false;
        const interval = setInterval(() => {
            if (!running) {
                running = true;
                fs.access(path, (err) => {
                    running = false;
                    if (err) {
                        clearInterval(interval);
                        resolve(undefined);
                    }
                });
            }
        }, intervalMs);
    });
}
//#endregion
//#region Methods with symbolic links support
export var SymlinkSupport;
(function (SymlinkSupport) {
    /**
     * Resolves the `fs.Stats` of the provided path. If the path is a
     * symbolic link, the `fs.Stats` will be from the target it points
     * to. If the target does not exist, `dangling: true` will be returned
     * as `symbolicLink` value.
     */
    async function stat(path) {
        // First stat the link
        let lstats;
        try {
            lstats = await fs.promises.lstat(path);
            // Return early if the stat is not a symbolic link at all
            if (!lstats.isSymbolicLink()) {
                return { stat: lstats };
            }
        }
        catch (error) {
            /* ignore - use stat() instead */
        }
        // If the stat is a symbolic link or failed to stat, use fs.stat()
        // which for symbolic links will stat the target they point to
        try {
            const stats = await fs.promises.stat(path);
            return {
                stat: stats,
                symbolicLink: lstats?.isSymbolicLink() ? { dangling: false } : undefined,
            };
        }
        catch (error) {
            // If the link points to a nonexistent file we still want
            // to return it as result while setting dangling: true flag
            if (error.code === 'ENOENT' && lstats) {
                return { stat: lstats, symbolicLink: { dangling: true } };
            }
            // Windows: workaround a node.js bug where reparse points
            // are not supported (https://github.com/nodejs/node/issues/36790)
            if (isWindows && error.code === 'EACCES') {
                try {
                    const stats = await fs.promises.stat(await fs.promises.readlink(path));
                    return { stat: stats, symbolicLink: { dangling: false } };
                }
                catch (error) {
                    // If the link points to a nonexistent file we still want
                    // to return it as result while setting dangling: true flag
                    if (error.code === 'ENOENT' && lstats) {
                        return { stat: lstats, symbolicLink: { dangling: true } };
                    }
                    throw error;
                }
            }
            throw error;
        }
    }
    SymlinkSupport.stat = stat;
    /**
     * Figures out if the `path` exists and is a file with support
     * for symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsFile(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isFile() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsFile = existsFile;
    /**
     * Figures out if the `path` exists and is a directory with support for
     * symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsDirectory(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isDirectory() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsDirectory = existsDirectory;
})(SymlinkSupport || (SymlinkSupport = {}));
//#endregion
//#region Write File
// According to node.js docs (https://nodejs.org/docs/v14.16.0/api/fs.html#fs_fs_writefile_file_data_options_callback)
// it is not safe to call writeFile() on the same path multiple times without waiting for the callback to return.
// Therefor we use a Queue on the path that is given to us to sequentialize calls to the same path properly.
const writeQueues = new ResourceQueue();
function writeFile(path, data, options) {
    return writeQueues.queueFor(URI.file(path), () => {
        const ensuredOptions = ensureWriteOptions(options);
        return new Promise((resolve, reject) => doWriteFileAndFlush(path, data, ensuredOptions, (error) => error ? reject(error) : resolve()));
    }, extUriBiasedIgnorePathCase);
}
let canFlush = true;
export function configureFlushOnWrite(enabled) {
    canFlush = enabled;
}
// Calls fs.writeFile() followed by a fs.sync() call to flush the changes to disk
// We do this in cases where we want to make sure the data is really on disk and
// not in some cache.
//
// See https://github.com/nodejs/node/blob/v5.10.0/lib/fs.js#L1194
function doWriteFileAndFlush(path, data, options, callback) {
    if (!canFlush) {
        return fs.writeFile(path, data, { mode: options.mode, flag: options.flag }, callback);
    }
    // Open the file with same flags and mode as fs.writeFile()
    fs.open(path, options.flag, options.mode, (openError, fd) => {
        if (openError) {
            return callback(openError);
        }
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFile(fd, data, (writeError) => {
            if (writeError) {
                return fs.close(fd, () => callback(writeError)); // still need to close the handle on error!
            }
            // Flush contents (not metadata) of the file to disk
            // https://github.com/microsoft/vscode/issues/9589
            fs.fdatasync(fd, (syncError) => {
                // In some exotic setups it is well possible that node fails to sync
                // In that case we disable flushing and warn to the console
                if (syncError) {
                    console.warn('[node.js fs] fdatasync is now disabled for this session because it failed: ', syncError);
                    configureFlushOnWrite(false);
                }
                return fs.close(fd, (closeError) => callback(closeError));
            });
        });
    });
}
/**
 * Same as `fs.writeFileSync` but with an additional call to
 * `fs.fdatasyncSync` after writing to ensure changes are
 * flushed to disk.
 */
export function writeFileSync(path, data, options) {
    const ensuredOptions = ensureWriteOptions(options);
    if (!canFlush) {
        return fs.writeFileSync(path, data, { mode: ensuredOptions.mode, flag: ensuredOptions.flag });
    }
    // Open the file with same flags and mode as fs.writeFile()
    const fd = fs.openSync(path, ensuredOptions.flag, ensuredOptions.mode);
    try {
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFileSync(fd, data);
        // Flush contents (not metadata) of the file to disk
        try {
            fs.fdatasyncSync(fd); // https://github.com/microsoft/vscode/issues/9589
        }
        catch (syncError) {
            console.warn('[node.js fs] fdatasyncSync is now disabled for this session because it failed: ', syncError);
            configureFlushOnWrite(false);
        }
    }
    finally {
        fs.closeSync(fd);
    }
}
function ensureWriteOptions(options) {
    if (!options) {
        return { mode: 0o666 /* default node.js mode for files */, flag: 'w' };
    }
    return {
        mode: typeof options.mode === 'number' ? options.mode : 0o666 /* default node.js mode for files */,
        flag: typeof options.flag === 'string' ? options.flag : 'w',
    };
}
//#endregion
//#region Move / Copy
/**
 * A drop-in replacement for `fs.rename` that:
 * - allows to move across multiple disks
 * - attempts to retry the operation for certain error codes on Windows
 */
async function rename(source, target, windowsRetryTimeout = 60000) {
    if (source === target) {
        return; // simulate node.js behaviour here and do a no-op if paths match
    }
    try {
        if (isWindows && typeof windowsRetryTimeout === 'number') {
            // On Windows, a rename can fail when either source or target
            // is locked by AV software.
            await renameWithRetry(source, target, Date.now(), windowsRetryTimeout);
        }
        else {
            await fs.promises.rename(source, target);
        }
    }
    catch (error) {
        // In two cases we fallback to classic copy and delete:
        //
        // 1.) The EXDEV error indicates that source and target are on different devices
        // In this case, fallback to using a copy() operation as there is no way to
        // rename() between different devices.
        //
        // 2.) The user tries to rename a file/folder that ends with a dot. This is not
        // really possible to move then, at least on UNC devices.
        if ((source.toLowerCase() !== target.toLowerCase() && error.code === 'EXDEV') ||
            source.endsWith('.')) {
            await copy(source, target, { preserveSymlinks: false /* copying to another device */ });
            await rimraf(source, RimRafMode.MOVE);
        }
        else {
            throw error;
        }
    }
}
async function renameWithRetry(source, target, startTime, retryTimeout, attempt = 0) {
    try {
        return await fs.promises.rename(source, target);
    }
    catch (error) {
        if (error.code !== 'EACCES' && error.code !== 'EPERM' && error.code !== 'EBUSY') {
            throw error; // only for errors we think are temporary
        }
        if (Date.now() - startTime >= retryTimeout) {
            console.error(`[node.js fs] rename failed after ${attempt} retries with error: ${error}`);
            throw error; // give up after configurable timeout
        }
        if (attempt === 0) {
            let abortRetry = false;
            try {
                const { stat } = await SymlinkSupport.stat(target);
                if (!stat.isFile()) {
                    abortRetry = true; // if target is not a file, EPERM error may be raised and we should not attempt to retry
                }
            }
            catch (error) {
                // Ignore
            }
            if (abortRetry) {
                throw error;
            }
        }
        // Delay with incremental backoff up to 100ms
        await timeout(Math.min(100, attempt * 10));
        // Attempt again
        return renameWithRetry(source, target, startTime, retryTimeout, attempt + 1);
    }
}
/**
 * Recursively copies all of `source` to `target`.
 *
 * The options `preserveSymlinks` configures how symbolic
 * links should be handled when encountered. Set to
 * `false` to not preserve them and `true` otherwise.
 */
async function copy(source, target, options) {
    return doCopy(source, target, {
        root: { source, target },
        options,
        handledSourcePaths: new Set(),
    });
}
// When copying a file or folder, we want to preserve the mode
// it had and as such provide it when creating. However, modes
// can go beyond what we expect (see link below), so we mask it.
// (https://github.com/nodejs/node-v0.x-archive/issues/3045#issuecomment-4862588)
const COPY_MODE_MASK = 0o777;
async function doCopy(source, target, payload) {
    // Keep track of paths already copied to prevent
    // cycles from symbolic links to cause issues
    if (payload.handledSourcePaths.has(source)) {
        return;
    }
    else {
        payload.handledSourcePaths.add(source);
    }
    const { stat, symbolicLink } = await SymlinkSupport.stat(source);
    // Symlink
    if (symbolicLink) {
        // Try to re-create the symlink unless `preserveSymlinks: false`
        if (payload.options.preserveSymlinks) {
            try {
                return await doCopySymlink(source, target, payload);
            }
            catch (error) {
                // in any case of an error fallback to normal copy via dereferencing
            }
        }
        if (symbolicLink.dangling) {
            return; // skip dangling symbolic links from here on (https://github.com/microsoft/vscode/issues/111621)
        }
    }
    // Folder
    if (stat.isDirectory()) {
        return doCopyDirectory(source, target, stat.mode & COPY_MODE_MASK, payload);
    }
    // File or file-like
    else {
        return doCopyFile(source, target, stat.mode & COPY_MODE_MASK);
    }
}
async function doCopyDirectory(source, target, mode, payload) {
    // Create folder
    await fs.promises.mkdir(target, { recursive: true, mode });
    // Copy each file recursively
    const files = await readdir(source);
    for (const file of files) {
        await doCopy(join(source, file), join(target, file), payload);
    }
}
async function doCopyFile(source, target, mode) {
    // Copy file
    await fs.promises.copyFile(source, target);
    // restore mode (https://github.com/nodejs/node/issues/1104)
    await fs.promises.chmod(target, mode);
}
async function doCopySymlink(source, target, payload) {
    // Figure out link target
    let linkTarget = await fs.promises.readlink(source);
    // Special case: the symlink points to a target that is
    // actually within the path that is being copied. In that
    // case we want the symlink to point to the target and
    // not the source
    if (isEqualOrParent(linkTarget, payload.root.source, !isLinux)) {
        linkTarget = join(payload.root.target, linkTarget.substr(payload.root.source.length + 1));
    }
    // Create symlink
    await fs.promises.symlink(linkTarget, target);
}
//#endregion
//#region Promise based fs methods
/**
 * Some low level `fs` methods provided as `Promises` similar to
 * `fs.promises` but with notable differences, either implemented
 * by us or by restoring the original callback based behavior.
 *
 * At least `realpath` is implemented differently in the promise
 * based implementation compared to the callback based one. The
 * promise based implementation actually calls `fs.realpath.native`.
 * (https://github.com/microsoft/vscode/issues/118562)
 */
export const Promises = new (class {
    //#region Implemented by node.js
    get read() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes read, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesRead, buffer });
                });
            });
        };
    }
    get write() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes written, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.write(fd, buffer, offset, length, position, (err, bytesWritten, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesWritten, buffer });
                });
            });
        };
    }
    get fdatasync() {
        return promisify(fs.fdatasync);
    } // not exposed as API in 20.x yet
    get open() {
        return promisify(fs.open);
    } // changed to return `FileHandle` in promise API
    get close() {
        return promisify(fs.close);
    } // not exposed as API due to the `FileHandle` return type of `open`
    get realpath() {
        return promisify(fs.realpath);
    } // `fs.promises.realpath` will use `fs.realpath.native` which we do not want
    get ftruncate() {
        return promisify(fs.ftruncate);
    } // not exposed as API in 20.x yet
    //#endregion
    //#region Implemented by us
    async exists(path) {
        try {
            await fs.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    get readdir() {
        return readdir;
    }
    get readDirsInDir() {
        return readDirsInDir;
    }
    get writeFile() {
        return writeFile;
    }
    get rm() {
        return rimraf;
    }
    get rename() {
        return rename;
    }
    get copy() {
        return copy;
    }
})();
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Bmcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUE7QUFDaEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDdkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXRDLGdCQUFnQjtBQUVoQixNQUFNLENBQU4sSUFBWSxVQVlYO0FBWkQsV0FBWSxVQUFVO0lBQ3JCOztPQUVHO0lBQ0gsK0NBQU0sQ0FBQTtJQUVOOzs7O09BSUc7SUFDSCwyQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQVpXLFVBQVUsS0FBVixVQUFVLFFBWXJCO0FBY0QsS0FBSyxVQUFVLE1BQU0sQ0FBQyxJQUFZLEVBQUUsSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBbUI7SUFDaEYsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQy9C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