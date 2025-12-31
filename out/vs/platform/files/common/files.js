/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { sep } from '../../../base/common/path.js';
import { startsWithIgnoreCase } from '../../../base/common/strings.js';
import { isNumber } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { isWeb } from '../../../base/common/platform.js';
import { Schemas } from '../../../base/common/network.js';
import { Lazy } from '../../../base/common/lazy.js';
//#region file service & providers
export const IFileService = createDecorator('fileService');
export function isFileOpenForWriteOptions(options) {
    return options.create === true;
}
export var FileType;
(function (FileType) {
    /**
     * File is unknown (neither file, directory nor symbolic link).
     */
    FileType[FileType["Unknown"] = 0] = "Unknown";
    /**
     * File is a normal file.
     */
    FileType[FileType["File"] = 1] = "File";
    /**
     * File is a directory.
     */
    FileType[FileType["Directory"] = 2] = "Directory";
    /**
     * File is a symbolic link.
     *
     * Note: even when the file is a symbolic link, you can test for
     * `FileType.File` and `FileType.Directory` to know the type of
     * the target the link points to.
     */
    FileType[FileType["SymbolicLink"] = 64] = "SymbolicLink";
})(FileType || (FileType = {}));
export var FilePermission;
(function (FilePermission) {
    /**
     * File is readonly. Components like editors should not
     * offer to edit the contents.
     */
    FilePermission[FilePermission["Readonly"] = 1] = "Readonly";
    /**
     * File is locked. Components like editors should offer
     * to edit the contents and ask the user upon saving to
     * remove the lock.
     */
    FilePermission[FilePermission["Locked"] = 2] = "Locked";
})(FilePermission || (FilePermission = {}));
export var FileChangeFilter;
(function (FileChangeFilter) {
    FileChangeFilter[FileChangeFilter["UPDATED"] = 2] = "UPDATED";
    FileChangeFilter[FileChangeFilter["ADDED"] = 4] = "ADDED";
    FileChangeFilter[FileChangeFilter["DELETED"] = 8] = "DELETED";
})(FileChangeFilter || (FileChangeFilter = {}));
export function isFileSystemWatcher(thing) {
    const candidate = thing;
    return !!candidate && typeof candidate.onDidChange === 'function';
}
export var FileSystemProviderCapabilities;
(function (FileSystemProviderCapabilities) {
    /**
     * No capabilities.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["None"] = 0] = "None";
    /**
     * Provider supports unbuffered read/write.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileReadWrite"] = 2] = "FileReadWrite";
    /**
     * Provider supports open/read/write/close low level file operations.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileOpenReadWriteClose"] = 4] = "FileOpenReadWriteClose";
    /**
     * Provider supports stream based reading.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileReadStream"] = 16] = "FileReadStream";
    /**
     * Provider supports copy operation.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileFolderCopy"] = 8] = "FileFolderCopy";
    /**
     * Provider is path case sensitive.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["PathCaseSensitive"] = 1024] = "PathCaseSensitive";
    /**
     * All files of the provider are readonly.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["Readonly"] = 2048] = "Readonly";
    /**
     * Provider supports to delete via trash.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["Trash"] = 4096] = "Trash";
    /**
     * Provider support to unlock files for writing.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileWriteUnlock"] = 8192] = "FileWriteUnlock";
    /**
     * Provider support to read files atomically. This implies the
     * provider provides the `FileReadWrite` capability too.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicRead"] = 16384] = "FileAtomicRead";
    /**
     * Provider support to write files atomically. This implies the
     * provider provides the `FileReadWrite` capability too.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicWrite"] = 32768] = "FileAtomicWrite";
    /**
     * Provider support to delete atomically.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicDelete"] = 65536] = "FileAtomicDelete";
    /**
     * Provider support to clone files atomically.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileClone"] = 131072] = "FileClone";
})(FileSystemProviderCapabilities || (FileSystemProviderCapabilities = {}));
export function hasReadWriteCapability(provider) {
    return !!(provider.capabilities & 2 /* FileSystemProviderCapabilities.FileReadWrite */);
}
export function hasFileFolderCopyCapability(provider) {
    return !!(provider.capabilities & 8 /* FileSystemProviderCapabilities.FileFolderCopy */);
}
export function hasFileCloneCapability(provider) {
    return !!(provider.capabilities & 131072 /* FileSystemProviderCapabilities.FileClone */);
}
export function hasOpenReadWriteCloseCapability(provider) {
    return !!(provider.capabilities & 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
}
export function hasFileReadStreamCapability(provider) {
    return !!(provider.capabilities & 16 /* FileSystemProviderCapabilities.FileReadStream */);
}
export function hasFileAtomicReadCapability(provider) {
    if (!hasReadWriteCapability(provider)) {
        return false; // we require the `FileReadWrite` capability too
    }
    return !!(provider.capabilities & 16384 /* FileSystemProviderCapabilities.FileAtomicRead */);
}
export function hasFileAtomicWriteCapability(provider) {
    if (!hasReadWriteCapability(provider)) {
        return false; // we require the `FileReadWrite` capability too
    }
    return !!(provider.capabilities & 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
}
export function hasFileAtomicDeleteCapability(provider) {
    return !!(provider.capabilities & 65536 /* FileSystemProviderCapabilities.FileAtomicDelete */);
}
export function hasReadonlyCapability(provider) {
    return !!(provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */);
}
export var FileSystemProviderErrorCode;
(function (FileSystemProviderErrorCode) {
    FileSystemProviderErrorCode["FileExists"] = "EntryExists";
    FileSystemProviderErrorCode["FileNotFound"] = "EntryNotFound";
    FileSystemProviderErrorCode["FileNotADirectory"] = "EntryNotADirectory";
    FileSystemProviderErrorCode["FileIsADirectory"] = "EntryIsADirectory";
    FileSystemProviderErrorCode["FileExceedsStorageQuota"] = "EntryExceedsStorageQuota";
    FileSystemProviderErrorCode["FileTooLarge"] = "EntryTooLarge";
    FileSystemProviderErrorCode["FileWriteLocked"] = "EntryWriteLocked";
    FileSystemProviderErrorCode["NoPermissions"] = "NoPermissions";
    FileSystemProviderErrorCode["Unavailable"] = "Unavailable";
    FileSystemProviderErrorCode["Unknown"] = "Unknown";
})(FileSystemProviderErrorCode || (FileSystemProviderErrorCode = {}));
export class FileSystemProviderError extends Error {
    static create(error, code) {
        const providerError = new FileSystemProviderError(error.toString(), code);
        markAsFileSystemProviderError(providerError, code);
        return providerError;
    }
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export function createFileSystemProviderError(error, code) {
    return FileSystemProviderError.create(error, code);
}
export function ensureFileSystemProviderError(error) {
    if (!error) {
        return createFileSystemProviderError(localize('unknownError', 'Unknown Error'), FileSystemProviderErrorCode.Unknown); // https://github.com/microsoft/vscode/issues/72798
    }
    return error;
}
export function markAsFileSystemProviderError(error, code) {
    error.name = code ? `${code} (FileSystemError)` : `FileSystemError`;
    return error;
}
export function toFileSystemProviderErrorCode(error) {
    // Guard against abuse
    if (!error) {
        return FileSystemProviderErrorCode.Unknown;
    }
    // FileSystemProviderError comes with the code
    if (error instanceof FileSystemProviderError) {
        return error.code;
    }
    // Any other error, check for name match by assuming that the error
    // went through the markAsFileSystemProviderError() method
    const match = /^(.+) \(FileSystemError\)$/.exec(error.name);
    if (!match) {
        return FileSystemProviderErrorCode.Unknown;
    }
    switch (match[1]) {
        case FileSystemProviderErrorCode.FileExists:
            return FileSystemProviderErrorCode.FileExists;
        case FileSystemProviderErrorCode.FileIsADirectory:
            return FileSystemProviderErrorCode.FileIsADirectory;
        case FileSystemProviderErrorCode.FileNotADirectory:
            return FileSystemProviderErrorCode.FileNotADirectory;
        case FileSystemProviderErrorCode.FileNotFound:
            return FileSystemProviderErrorCode.FileNotFound;
        case FileSystemProviderErrorCode.FileTooLarge:
            return FileSystemProviderErrorCode.FileTooLarge;
        case FileSystemProviderErrorCode.FileWriteLocked:
            return FileSystemProviderErrorCode.FileWriteLocked;
        case FileSystemProviderErrorCode.NoPermissions:
            return FileSystemProviderErrorCode.NoPermissions;
        case FileSystemProviderErrorCode.Unavailable:
            return FileSystemProviderErrorCode.Unavailable;
    }
    return FileSystemProviderErrorCode.Unknown;
}
export function toFileOperationResult(error) {
    // FileSystemProviderError comes with the result already
    if (error instanceof FileOperationError) {
        return error.fileOperationResult;
    }
    // Otherwise try to find from code
    switch (toFileSystemProviderErrorCode(error)) {
        case FileSystemProviderErrorCode.FileNotFound:
            return 1 /* FileOperationResult.FILE_NOT_FOUND */;
        case FileSystemProviderErrorCode.FileIsADirectory:
            return 0 /* FileOperationResult.FILE_IS_DIRECTORY */;
        case FileSystemProviderErrorCode.FileNotADirectory:
            return 9 /* FileOperationResult.FILE_NOT_DIRECTORY */;
        case FileSystemProviderErrorCode.FileWriteLocked:
            return 5 /* FileOperationResult.FILE_WRITE_LOCKED */;
        case FileSystemProviderErrorCode.NoPermissions:
            return 6 /* FileOperationResult.FILE_PERMISSION_DENIED */;
        case FileSystemProviderErrorCode.FileExists:
            return 4 /* FileOperationResult.FILE_MOVE_CONFLICT */;
        case FileSystemProviderErrorCode.FileTooLarge:
            return 7 /* FileOperationResult.FILE_TOO_LARGE */;
        default:
            return 10 /* FileOperationResult.FILE_OTHER_ERROR */;
    }
}
export var FileOperation;
(function (FileOperation) {
    FileOperation[FileOperation["CREATE"] = 0] = "CREATE";
    FileOperation[FileOperation["DELETE"] = 1] = "DELETE";
    FileOperation[FileOperation["MOVE"] = 2] = "MOVE";
    FileOperation[FileOperation["COPY"] = 3] = "COPY";
    FileOperation[FileOperation["WRITE"] = 4] = "WRITE";
})(FileOperation || (FileOperation = {}));
export class FileOperationEvent {
    constructor(resource, operation, target) {
        this.resource = resource;
        this.operation = operation;
        this.target = target;
    }
    isOperation(operation) {
        return this.operation === operation;
    }
}
/**
 * Possible changes that can occur to a file.
 */
export var FileChangeType;
(function (FileChangeType) {
    FileChangeType[FileChangeType["UPDATED"] = 0] = "UPDATED";
    FileChangeType[FileChangeType["ADDED"] = 1] = "ADDED";
    FileChangeType[FileChangeType["DELETED"] = 2] = "DELETED";
})(FileChangeType || (FileChangeType = {}));
export class FileChangesEvent {
    static { this.MIXED_CORRELATION = null; }
    constructor(changes, ignorePathCasing) {
        this.ignorePathCasing = ignorePathCasing;
        this.correlationId = undefined;
        this.added = new Lazy(() => {
            const added = TernarySearchTree.forUris(() => this.ignorePathCasing);
            added.fill(this.rawAdded.map((resource) => [resource, true]));
            return added;
        });
        this.updated = new Lazy(() => {
            const updated = TernarySearchTree.forUris(() => this.ignorePathCasing);
            updated.fill(this.rawUpdated.map((resource) => [resource, true]));
            return updated;
        });
        this.deleted = new Lazy(() => {
            const deleted = TernarySearchTree.forUris(() => this.ignorePathCasing);
            deleted.fill(this.rawDeleted.map((resource) => [resource, true]));
            return deleted;
        });
        /**
         * @deprecated use the `contains` or `affects` method to efficiently find
         * out if the event relates to a given resource. these methods ensure:
         * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
         * - correctly handles `FileChangeType.DELETED` events
         */
        this.rawAdded = [];
        /**
         * @deprecated use the `contains` or `affects` method to efficiently find
         * out if the event relates to a given resource. these methods ensure:
         * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
         * - correctly handles `FileChangeType.DELETED` events
         */
        this.rawUpdated = [];
        /**
         * @deprecated use the `contains` or `affects` method to efficiently find
         * out if the event relates to a given resource. these methods ensure:
         * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
         * - correctly handles `FileChangeType.DELETED` events
         */
        this.rawDeleted = [];
        for (const change of changes) {
            // Split by type
            switch (change.type) {
                case 1 /* FileChangeType.ADDED */:
                    this.rawAdded.push(change.resource);
                    break;
                case 0 /* FileChangeType.UPDATED */:
                    this.rawUpdated.push(change.resource);
                    break;
                case 2 /* FileChangeType.DELETED */:
                    this.rawDeleted.push(change.resource);
                    break;
            }
            // Figure out events correlation
            if (this.correlationId !== FileChangesEvent.MIXED_CORRELATION) {
                if (typeof change.cId === 'number') {
                    if (this.correlationId === undefined) {
                        this.correlationId = change.cId; // correlation not yet set, just take it
                    }
                    else if (this.correlationId !== change.cId) {
                        this.correlationId = FileChangesEvent.MIXED_CORRELATION; // correlation mismatch, we have mixed correlation
                    }
                }
                else {
                    if (this.correlationId !== undefined) {
                        this.correlationId = FileChangesEvent.MIXED_CORRELATION; // correlation mismatch, we have mixed correlation
                    }
                }
            }
        }
    }
    /**
     * Find out if the file change events match the provided resource.
     *
     * Note: when passing `FileChangeType.DELETED`, we consider a match
     * also when the parent of the resource got deleted.
     */
    contains(resource, ...types) {
        return this.doContains(resource, { includeChildren: false }, ...types);
    }
    /**
     * Find out if the file change events either match the provided
     * resource, or contain a child of this resource.
     */
    affects(resource, ...types) {
        return this.doContains(resource, { includeChildren: true }, ...types);
    }
    doContains(resource, options, ...types) {
        if (!resource) {
            return false;
        }
        const hasTypesFilter = types.length > 0;
        // Added
        if (!hasTypesFilter || types.includes(1 /* FileChangeType.ADDED */)) {
            if (this.added.value.get(resource)) {
                return true;
            }
            if (options.includeChildren && this.added.value.findSuperstr(resource)) {
                return true;
            }
        }
        // Updated
        if (!hasTypesFilter || types.includes(0 /* FileChangeType.UPDATED */)) {
            if (this.updated.value.get(resource)) {
                return true;
            }
            if (options.includeChildren && this.updated.value.findSuperstr(resource)) {
                return true;
            }
        }
        // Deleted
        if (!hasTypesFilter || types.includes(2 /* FileChangeType.DELETED */)) {
            if (this.deleted.value.findSubstr(resource) /* deleted also considers parent folders */) {
                return true;
            }
            if (options.includeChildren && this.deleted.value.findSuperstr(resource)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Returns if this event contains added files.
     */
    gotAdded() {
        return this.rawAdded.length > 0;
    }
    /**
     * Returns if this event contains deleted files.
     */
    gotDeleted() {
        return this.rawDeleted.length > 0;
    }
    /**
     * Returns if this event contains updated files.
     */
    gotUpdated() {
        return this.rawUpdated.length > 0;
    }
    /**
     * Returns if this event contains changes that correlate to the
     * provided `correlationId`.
     *
     * File change event correlation is an advanced watch feature that
     * allows to  identify from which watch request the events originate
     * from. This correlation allows to route events specifically
     * only to the requestor and not emit them to all listeners.
     */
    correlates(correlationId) {
        return this.correlationId === correlationId;
    }
    /**
     * Figure out if the event contains changes that correlate to one
     * correlation identifier.
     *
     * File change event correlation is an advanced watch feature that
     * allows to  identify from which watch request the events originate
     * from. This correlation allows to route events specifically
     * only to the requestor and not emit them to all listeners.
     */
    hasCorrelation() {
        return typeof this.correlationId === 'number';
    }
}
export function isParent(path, candidate, ignoreCase) {
    if (!path || !candidate || path === candidate) {
        return false;
    }
    if (candidate.length > path.length) {
        return false;
    }
    if (candidate.charAt(candidate.length - 1) !== sep) {
        candidate += sep;
    }
    if (ignoreCase) {
        return startsWithIgnoreCase(path, candidate);
    }
    return path.indexOf(candidate) === 0;
}
export class FileOperationError extends Error {
    constructor(message, fileOperationResult, options) {
        super(message);
        this.fileOperationResult = fileOperationResult;
        this.options = options;
    }
}
export class TooLargeFileOperationError extends FileOperationError {
    constructor(message, fileOperationResult, size, options) {
        super(message, fileOperationResult, options);
        this.fileOperationResult = fileOperationResult;
        this.size = size;
    }
}
export class NotModifiedSinceFileOperationError extends FileOperationError {
    constructor(message, stat, options) {
        super(message, 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */, options);
        this.stat = stat;
    }
}
export var FileOperationResult;
(function (FileOperationResult) {
    FileOperationResult[FileOperationResult["FILE_IS_DIRECTORY"] = 0] = "FILE_IS_DIRECTORY";
    FileOperationResult[FileOperationResult["FILE_NOT_FOUND"] = 1] = "FILE_NOT_FOUND";
    FileOperationResult[FileOperationResult["FILE_NOT_MODIFIED_SINCE"] = 2] = "FILE_NOT_MODIFIED_SINCE";
    FileOperationResult[FileOperationResult["FILE_MODIFIED_SINCE"] = 3] = "FILE_MODIFIED_SINCE";
    FileOperationResult[FileOperationResult["FILE_MOVE_CONFLICT"] = 4] = "FILE_MOVE_CONFLICT";
    FileOperationResult[FileOperationResult["FILE_WRITE_LOCKED"] = 5] = "FILE_WRITE_LOCKED";
    FileOperationResult[FileOperationResult["FILE_PERMISSION_DENIED"] = 6] = "FILE_PERMISSION_DENIED";
    FileOperationResult[FileOperationResult["FILE_TOO_LARGE"] = 7] = "FILE_TOO_LARGE";
    FileOperationResult[FileOperationResult["FILE_INVALID_PATH"] = 8] = "FILE_INVALID_PATH";
    FileOperationResult[FileOperationResult["FILE_NOT_DIRECTORY"] = 9] = "FILE_NOT_DIRECTORY";
    FileOperationResult[FileOperationResult["FILE_OTHER_ERROR"] = 10] = "FILE_OTHER_ERROR";
})(FileOperationResult || (FileOperationResult = {}));
//#endregion
//#region Settings
export const AutoSaveConfiguration = {
    OFF: 'off',
    AFTER_DELAY: 'afterDelay',
    ON_FOCUS_CHANGE: 'onFocusChange',
    ON_WINDOW_CHANGE: 'onWindowChange',
};
export const HotExitConfiguration = {
    OFF: 'off',
    ON_EXIT: 'onExit',
    ON_EXIT_AND_WINDOW_CLOSE: 'onExitAndWindowClose',
};
export const FILES_ASSOCIATIONS_CONFIG = 'files.associations';
export const FILES_EXCLUDE_CONFIG = 'files.exclude';
export const FILES_READONLY_INCLUDE_CONFIG = 'files.readonlyInclude';
export const FILES_READONLY_EXCLUDE_CONFIG = 'files.readonlyExclude';
export const FILES_READONLY_FROM_PERMISSIONS_CONFIG = 'files.readonlyFromPermissions';
//#endregion
//#region Utilities
export var FileKind;
(function (FileKind) {
    FileKind[FileKind["FILE"] = 0] = "FILE";
    FileKind[FileKind["FOLDER"] = 1] = "FOLDER";
    FileKind[FileKind["ROOT_FOLDER"] = 2] = "ROOT_FOLDER";
})(FileKind || (FileKind = {}));
/**
 * A hint to disable etag checking for reading/writing.
 */
export const ETAG_DISABLED = '';
export function etag(stat) {
    if (typeof stat.size !== 'number' || typeof stat.mtime !== 'number') {
        return undefined;
    }
    return stat.mtime.toString(29) + stat.size.toString(31);
}
export async function whenProviderRegistered(file, fileService) {
    if (fileService.hasProvider(URI.from({ scheme: file.scheme }))) {
        return;
    }
    return new Promise((resolve) => {
        const disposable = fileService.onDidChangeFileSystemProviderRegistrations((e) => {
            if (e.scheme === file.scheme && e.added) {
                disposable.dispose();
                resolve();
            }
        });
    });
}
/**
 * Helper to format a raw byte size into a human readable label.
 */
export class ByteSize {
    static { this.KB = 1024; }
    static { this.MB = ByteSize.KB * ByteSize.KB; }
    static { this.GB = ByteSize.MB * ByteSize.KB; }
    static { this.TB = ByteSize.GB * ByteSize.KB; }
    static formatSize(size) {
        if (!isNumber(size)) {
            size = 0;
        }
        if (size < ByteSize.KB) {
            return localize('sizeB', '{0}B', size.toFixed(0));
        }
        if (size < ByteSize.MB) {
            return localize('sizeKB', '{0}KB', (size / ByteSize.KB).toFixed(2));
        }
        if (size < ByteSize.GB) {
            return localize('sizeMB', '{0}MB', (size / ByteSize.MB).toFixed(2));
        }
        if (size < ByteSize.TB) {
            return localize('sizeGB', '{0}GB', (size / ByteSize.GB).toFixed(2));
        }
        return localize('sizeTB', '{0}TB', (size / ByteSize.TB).toFixed(2));
    }
}
export function getLargeFileConfirmationLimit(arg) {
    const isRemote = typeof arg === 'string' || arg?.scheme === Schemas.vscodeRemote;
    const isLocal = typeof arg !== 'string' && arg?.scheme === Schemas.file;
    if (isLocal) {
        // Local almost has no limit in file size
        return 1024 * ByteSize.MB;
    }
    if (isRemote) {
        // With a remote, pick a low limit to avoid
        // potentially costly file transfers
        return 10 * ByteSize.MB;
    }
    if (isWeb) {
        // Web: we cannot know for sure if a cost
        // is associated with the file transfer
        // so we pick a reasonably small limit
        return 50 * ByteSize.MB;
    }
    // Local desktop: almost no limit in file size
    return 1024 * ByteSize.MB;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVuRCxrQ0FBa0M7QUFFbEMsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBZSxhQUFhLENBQUMsQ0FBQTtBQWtYeEUsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxPQUF5QjtJQUV6QixPQUFPLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFBO0FBQy9CLENBQUM7QUEyQ0QsTUFBTSxDQUFOLElBQVksUUF3Qlg7QUF4QkQsV0FBWSxRQUFRO0lBQ25COztPQUVHO0lBQ0gsNkNBQVcsQ0FBQTtJQUVYOztPQUVHO0lBQ0gsdUNBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gsaURBQWEsQ0FBQTtJQUViOzs7Ozs7T0FNRztJQUNILHdEQUFpQixDQUFBO0FBQ2xCLENBQUMsRUF4QlcsUUFBUSxLQUFSLFFBQVEsUUF3Qm5CO0FBRUQsTUFBTSxDQUFOLElBQVksY0FhWDtBQWJELFdBQVksY0FBYztJQUN6Qjs7O09BR0c7SUFDSCwyREFBWSxDQUFBO0lBRVo7Ozs7T0FJRztJQUNILHVEQUFVLENBQUE7QUFDWCxDQUFDLEVBYlcsY0FBYyxLQUFkLGNBQWMsUUFhekI7QUF5RUQsTUFBTSxDQUFOLElBQWtCLGdCQUlqQjtBQUpELFdBQWtCLGdCQUFnQjtJQUNqQyw2REFBZ0IsQ0FBQTtJQUNoQix5REFBYyxDQUFBO0lBQ2QsNkRBQWdCLENBQUE7QUFDakIsQ0FBQyxFQUppQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSWpDO0FBZUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLEtBQWM7SUFDakQsTUFBTSxTQUFTLEdBQUcsS0FBdUMsQ0FBQTtJQUV6RCxPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUksT0FBTyxTQUFTLENBQUMsV0FBVyxLQUFLLFVBQVUsQ0FBQTtBQUNsRSxDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDhCQW1FakI7QUFuRUQsV0FBa0IsOEJBQThCO0lBQy9DOztPQUVHO0lBQ0gsbUZBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gscUdBQXNCLENBQUE7SUFFdEI7O09BRUc7SUFDSCx1SEFBK0IsQ0FBQTtJQUUvQjs7T0FFRztJQUNILHdHQUF1QixDQUFBO0lBRXZCOztPQUVHO0lBQ0gsdUdBQXVCLENBQUE7SUFFdkI7O09BRUc7SUFDSCxnSEFBMkIsQ0FBQTtJQUUzQjs7T0FFRztJQUNILDhGQUFrQixDQUFBO0lBRWxCOztPQUVHO0lBQ0gsd0ZBQWUsQ0FBQTtJQUVmOztPQUVHO0lBQ0gsNEdBQXlCLENBQUE7SUFFekI7OztPQUdHO0lBQ0gsMkdBQXdCLENBQUE7SUFFeEI7OztPQUdHO0lBQ0gsNkdBQXlCLENBQUE7SUFFekI7O09BRUc7SUFDSCwrR0FBMEIsQ0FBQTtJQUUxQjs7T0FFRztJQUNILGtHQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFuRWlCLDhCQUE4QixLQUE5Qiw4QkFBOEIsUUFtRS9DO0FBd0NELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsUUFBNkI7SUFFN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSx1REFBK0MsQ0FBQyxDQUFBO0FBQ2hGLENBQUM7QUFNRCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFFBQTZCO0lBRTdCLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksd0RBQWdELENBQUMsQ0FBQTtBQUNqRixDQUFDO0FBTUQsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxRQUE2QjtJQUU3QixPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLHdEQUEyQyxDQUFDLENBQUE7QUFDNUUsQ0FBQztBQVNELE1BQU0sVUFBVSwrQkFBK0IsQ0FDOUMsUUFBNkI7SUFFN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxnRUFBd0QsQ0FBQyxDQUFBO0FBQ3pGLENBQUM7QUFVRCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFFBQTZCO0lBRTdCLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVkseURBQWdELENBQUMsQ0FBQTtBQUNqRixDQUFDO0FBT0QsTUFBTSxVQUFVLDJCQUEyQixDQUMxQyxRQUE2QjtJQUU3QixJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPLEtBQUssQ0FBQSxDQUFDLGdEQUFnRDtJQUM5RCxDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSw0REFBZ0QsQ0FBQyxDQUFBO0FBQ2pGLENBQUM7QUFPRCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLFFBQTZCO0lBRTdCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3ZDLE9BQU8sS0FBSyxDQUFBLENBQUMsZ0RBQWdEO0lBQzlELENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLDZEQUFpRCxDQUFDLENBQUE7QUFDbEYsQ0FBQztBQU9ELE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsUUFBNkI7SUFFN0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSw4REFBa0QsQ0FBQyxDQUFBO0FBQ25GLENBQUM7QUFXRCxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLFFBQTZCO0lBRTdCLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVkscURBQTBDLENBQUMsQ0FBQTtBQUMzRSxDQUFDO0FBRUQsTUFBTSxDQUFOLElBQVksMkJBV1g7QUFYRCxXQUFZLDJCQUEyQjtJQUN0Qyx5REFBMEIsQ0FBQTtJQUMxQiw2REFBOEIsQ0FBQTtJQUM5Qix1RUFBd0MsQ0FBQTtJQUN4QyxxRUFBc0MsQ0FBQTtJQUN0QyxtRkFBb0QsQ0FBQTtJQUNwRCw2REFBOEIsQ0FBQTtJQUM5QixtRUFBb0MsQ0FBQTtJQUNwQyw4REFBK0IsQ0FBQTtJQUMvQiwwREFBMkIsQ0FBQTtJQUMzQixrREFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBWFcsMkJBQTJCLEtBQTNCLDJCQUEyQixRQVd0QztBQU9ELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxLQUFLO0lBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBcUIsRUFBRSxJQUFpQztRQUNyRSxNQUFNLGFBQWEsR0FBRyxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RSw2QkFBNkIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEQsT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQztJQUVELFlBQ0MsT0FBZSxFQUNOLElBQWlDO1FBRTFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUZMLFNBQUksR0FBSixJQUFJLENBQTZCO0lBRzNDLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsS0FBcUIsRUFDckIsSUFBaUM7SUFFakMsT0FBTyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQ25ELENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsS0FBYTtJQUMxRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLDZCQUE2QixDQUNuQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxFQUN6QywyQkFBMkIsQ0FBQyxPQUFPLENBQ25DLENBQUEsQ0FBQyxtREFBbUQ7SUFDdEQsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsS0FBWSxFQUNaLElBQWlDO0lBRWpDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFBO0lBRW5FLE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsS0FBK0I7SUFFL0Isc0JBQXNCO0lBQ3RCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE9BQU8sMkJBQTJCLENBQUMsT0FBTyxDQUFBO0lBQzNDLENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMsSUFBSSxLQUFLLFlBQVksdUJBQXVCLEVBQUUsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFDbEIsQ0FBQztJQUVELG1FQUFtRTtJQUNuRSwwREFBMEQ7SUFDMUQsTUFBTSxLQUFLLEdBQUcsNEJBQTRCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLDJCQUEyQixDQUFDLE9BQU8sQ0FBQTtJQUMzQyxDQUFDO0lBRUQsUUFBUSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsQixLQUFLLDJCQUEyQixDQUFDLFVBQVU7WUFDMUMsT0FBTywyQkFBMkIsQ0FBQyxVQUFVLENBQUE7UUFDOUMsS0FBSywyQkFBMkIsQ0FBQyxnQkFBZ0I7WUFDaEQsT0FBTywyQkFBMkIsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNwRCxLQUFLLDJCQUEyQixDQUFDLGlCQUFpQjtZQUNqRCxPQUFPLDJCQUEyQixDQUFDLGlCQUFpQixDQUFBO1FBQ3JELEtBQUssMkJBQTJCLENBQUMsWUFBWTtZQUM1QyxPQUFPLDJCQUEyQixDQUFDLFlBQVksQ0FBQTtRQUNoRCxLQUFLLDJCQUEyQixDQUFDLFlBQVk7WUFDNUMsT0FBTywyQkFBMkIsQ0FBQyxZQUFZLENBQUE7UUFDaEQsS0FBSywyQkFBMkIsQ0FBQyxlQUFlO1lBQy9DLE9BQU8sMkJBQTJCLENBQUMsZUFBZSxDQUFBO1FBQ25ELEtBQUssMkJBQTJCLENBQUMsYUFBYTtZQUM3QyxPQUFPLDJCQUEyQixDQUFDLGFBQWEsQ0FBQTtRQUNqRCxLQUFLLDJCQUEyQixDQUFDLFdBQVc7WUFDM0MsT0FBTywyQkFBMkIsQ0FBQyxXQUFXLENBQUE7SUFDaEQsQ0FBQztJQUVELE9BQU8sMkJBQTJCLENBQUMsT0FBTyxDQUFBO0FBQzNDLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsS0FBWTtJQUNqRCx3REFBd0Q7SUFDeEQsSUFBSSxLQUFLLFlBQVksa0JBQWtCLEVBQUUsQ0FBQztRQUN6QyxPQUFPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsa0NBQWtDO0lBQ2xDLFFBQVEsNkJBQTZCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxLQUFLLDJCQUEyQixDQUFDLFlBQVk7WUFDNUMsa0RBQXlDO1FBQzFDLEtBQUssMkJBQTJCLENBQUMsZ0JBQWdCO1lBQ2hELHFEQUE0QztRQUM3QyxLQUFLLDJCQUEyQixDQUFDLGlCQUFpQjtZQUNqRCxzREFBNkM7UUFDOUMsS0FBSywyQkFBMkIsQ0FBQyxlQUFlO1lBQy9DLHFEQUE0QztRQUM3QyxLQUFLLDJCQUEyQixDQUFDLGFBQWE7WUFDN0MsMERBQWlEO1FBQ2xELEtBQUssMkJBQTJCLENBQUMsVUFBVTtZQUMxQyxzREFBNkM7UUFDOUMsS0FBSywyQkFBMkIsQ0FBQyxZQUFZO1lBQzVDLGtEQUF5QztRQUMxQztZQUNDLHFEQUEyQztJQUM3QyxDQUFDO0FBQ0YsQ0FBQztBQWtCRCxNQUFNLENBQU4sSUFBa0IsYUFNakI7QUFORCxXQUFrQixhQUFhO0lBQzlCLHFEQUFNLENBQUE7SUFDTixxREFBTSxDQUFBO0lBQ04saURBQUksQ0FBQTtJQUNKLGlEQUFJLENBQUE7SUFDSixtREFBSyxDQUFBO0FBQ04sQ0FBQyxFQU5pQixhQUFhLEtBQWIsYUFBYSxRQU05QjtBQWdCRCxNQUFNLE9BQU8sa0JBQWtCO0lBTzlCLFlBQ1UsUUFBYSxFQUNiLFNBQXdCLEVBQ3hCLE1BQThCO1FBRjlCLGFBQVEsR0FBUixRQUFRLENBQUs7UUFDYixjQUFTLEdBQVQsU0FBUyxDQUFlO1FBQ3hCLFdBQU0sR0FBTixNQUFNLENBQXdCO0lBQ3JDLENBQUM7SUFNSixXQUFXLENBQUMsU0FBd0I7UUFDbkMsT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQTtJQUNwQyxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixjQUlqQjtBQUpELFdBQWtCLGNBQWM7SUFDL0IseURBQU8sQ0FBQTtJQUNQLHFEQUFLLENBQUE7SUFDTCx5REFBTyxDQUFBO0FBQ1IsQ0FBQyxFQUppQixjQUFjLEtBQWQsY0FBYyxRQUkvQjtBQXlCRCxNQUFNLE9BQU8sZ0JBQWdCO2FBQ0osc0JBQWlCLEdBQUcsSUFBSSxBQUFQLENBQU87SUFLaEQsWUFDQyxPQUErQixFQUNkLGdCQUF5QjtRQUF6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVM7UUFMMUIsa0JBQWEsR0FDN0IsU0FBUyxDQUFBO1FBcUNPLFVBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDdEMsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFVLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzdFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUU3RCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxDQUFBO1FBRWUsWUFBTyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUN4QyxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQVUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDL0UsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWpFLE9BQU8sT0FBTyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7UUFFZSxZQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3hDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBVSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUMvRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFakUsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtRQWtIRjs7Ozs7V0FLRztRQUNNLGFBQVEsR0FBVSxFQUFFLENBQUE7UUFFN0I7Ozs7O1dBS0c7UUFDTSxlQUFVLEdBQVUsRUFBRSxDQUFBO1FBRS9COzs7OztXQUtHO1FBQ00sZUFBVSxHQUFVLEVBQUUsQ0FBQTtRQTFMOUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixnQkFBZ0I7WUFDaEIsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3JCO29CQUNDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDbkMsTUFBSztnQkFDTjtvQkFDQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ3JDLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNyQyxNQUFLO1lBQ1AsQ0FBQztZQUVELGdDQUFnQztZQUNoQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxPQUFPLE1BQU0sQ0FBQyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3BDLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFBLENBQUMsd0NBQXdDO29CQUN6RSxDQUFDO3lCQUFNLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQzlDLElBQUksQ0FBQyxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUEsQ0FBQyxrREFBa0Q7b0JBQzNHLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQSxDQUFDLGtEQUFrRDtvQkFDM0csQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBdUJEOzs7OztPQUtHO0lBQ0gsUUFBUSxDQUFDLFFBQWEsRUFBRSxHQUFHLEtBQXVCO1FBQ2pELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsT0FBTyxDQUFDLFFBQWEsRUFBRSxHQUFHLEtBQXVCO1FBQ2hELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRU8sVUFBVSxDQUNqQixRQUFhLEVBQ2IsT0FBcUMsRUFDckMsR0FBRyxLQUF1QjtRQUUxQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUV2QyxRQUFRO1FBQ1IsSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsUUFBUSw4QkFBc0IsRUFBRSxDQUFDO1lBQzdELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDeEUsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUVELFVBQVU7UUFDVixJQUFJLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLENBQUM7WUFDL0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsVUFBVTtRQUNWLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsQ0FBQztZQUMvRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQywyQ0FBMkMsRUFBRSxDQUFDO2dCQUN6RixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNILFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILFVBQVUsQ0FBQyxhQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxhQUFhLEtBQUssYUFBYSxDQUFBO0lBQzVDLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILGNBQWM7UUFDYixPQUFPLE9BQU8sSUFBSSxDQUFDLGFBQWEsS0FBSyxRQUFRLENBQUE7SUFDOUMsQ0FBQzs7QUEyQkYsTUFBTSxVQUFVLFFBQVEsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUFvQjtJQUM3RSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUMvQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3BELFNBQVMsSUFBSSxHQUFHLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsT0FBTyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDckMsQ0FBQztBQXFORCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUM1QyxZQUNDLE9BQWUsRUFDTixtQkFBd0MsRUFDeEMsT0FBbUU7UUFFNUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBSEwsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN4QyxZQUFPLEdBQVAsT0FBTyxDQUE0RDtJQUc3RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsa0JBQWtCO0lBQ2pFLFlBQ0MsT0FBZSxFQUNHLG1CQUF1RCxFQUNoRSxJQUFZLEVBQ3JCLE9BQTBCO1FBRTFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFKMUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFvQztRQUNoRSxTQUFJLEdBQUosSUFBSSxDQUFRO0lBSXRCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxrQkFBa0I7SUFDekUsWUFDQyxPQUFlLEVBQ04sSUFBMkIsRUFDcEMsT0FBMEI7UUFFMUIsS0FBSyxDQUFDLE9BQU8sdURBQStDLE9BQU8sQ0FBQyxDQUFBO1FBSDNELFNBQUksR0FBSixJQUFJLENBQXVCO0lBSXJDLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBTixJQUFrQixtQkFZakI7QUFaRCxXQUFrQixtQkFBbUI7SUFDcEMsdUZBQWlCLENBQUE7SUFDakIsaUZBQWMsQ0FBQTtJQUNkLG1HQUF1QixDQUFBO0lBQ3ZCLDJGQUFtQixDQUFBO0lBQ25CLHlGQUFrQixDQUFBO0lBQ2xCLHVGQUFpQixDQUFBO0lBQ2pCLGlHQUFzQixDQUFBO0lBQ3RCLGlGQUFjLENBQUE7SUFDZCx1RkFBaUIsQ0FBQTtJQUNqQix5RkFBa0IsQ0FBQTtJQUNsQixzRkFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBWmlCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFZcEM7QUFFRCxZQUFZO0FBRVosa0JBQWtCO0FBRWxCLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLEdBQUcsRUFBRSxLQUFLO0lBQ1YsV0FBVyxFQUFFLFlBQVk7SUFDekIsZUFBZSxFQUFFLGVBQWU7SUFDaEMsZ0JBQWdCLEVBQUUsZ0JBQWdCO0NBQ2xDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRztJQUNuQyxHQUFHLEVBQUUsS0FBSztJQUNWLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLHdCQUF3QixFQUFFLHNCQUFzQjtDQUNoRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsb0JBQW9CLENBQUE7QUFDN0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUFBO0FBQ25ELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLHVCQUF1QixDQUFBO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLHVCQUF1QixDQUFBO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLHNDQUFzQyxHQUFHLCtCQUErQixDQUFBO0FBaUNyRixZQUFZO0FBRVosbUJBQW1CO0FBRW5CLE1BQU0sQ0FBTixJQUFZLFFBSVg7QUFKRCxXQUFZLFFBQVE7SUFDbkIsdUNBQUksQ0FBQTtJQUNKLDJDQUFNLENBQUE7SUFDTixxREFBVyxDQUFBO0FBQ1osQ0FBQyxFQUpXLFFBQVEsS0FBUixRQUFRLFFBSW5CO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFBO0FBTy9CLE1BQU0sVUFBVSxJQUFJLENBQUMsSUFHcEI7SUFDQSxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JFLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQ3hELENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLHNCQUFzQixDQUFDLElBQVMsRUFBRSxXQUF5QjtJQUNoRixJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEUsT0FBTTtJQUNQLENBQUM7SUFFRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDOUIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0UsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ3BCLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sUUFBUTthQUNKLE9BQUUsR0FBRyxJQUFJLENBQUE7YUFDVCxPQUFFLEdBQUcsUUFBUSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO2FBQzlCLE9BQUUsR0FBRyxRQUFRLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUE7YUFDOUIsT0FBRSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQTtJQUU5QyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQVk7UUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3JCLElBQUksR0FBRyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBRUQsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxDQUFDO1FBRUQsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDOztBQU9GLE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxHQUFrQjtJQUMvRCxNQUFNLFFBQVEsR0FBRyxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFBO0lBQ2hGLE1BQU0sT0FBTyxHQUFHLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUE7SUFFdkUsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLHlDQUF5QztRQUN6QyxPQUFPLElBQUksR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2QsMkNBQTJDO1FBQzNDLG9DQUFvQztRQUNwQyxPQUFPLEVBQUUsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gseUNBQXlDO1FBQ3pDLHVDQUF1QztRQUN2QyxzQ0FBc0M7UUFDdEMsT0FBTyxFQUFFLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsOENBQThDO0lBQzlDLE9BQU8sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUE7QUFDMUIsQ0FBQztBQUVELFlBQVkifQ==