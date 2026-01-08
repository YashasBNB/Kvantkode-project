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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi9maWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRW5ELGtDQUFrQztBQUVsQyxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFlLGFBQWEsQ0FBQyxDQUFBO0FBa1h4RSxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLE9BQXlCO0lBRXpCLE9BQU8sT0FBTyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUE7QUFDL0IsQ0FBQztBQTJDRCxNQUFNLENBQU4sSUFBWSxRQXdCWDtBQXhCRCxXQUFZLFFBQVE7SUFDbkI7O09BRUc7SUFDSCw2Q0FBVyxDQUFBO0lBRVg7O09BRUc7SUFDSCx1Q0FBUSxDQUFBO0lBRVI7O09BRUc7SUFDSCxpREFBYSxDQUFBO0lB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