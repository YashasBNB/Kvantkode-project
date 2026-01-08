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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FileService_1;
import { coalesce } from '../../../base/common/arrays.js';
import { Promises, ResourceQueue } from '../../../base/common/async.js';
import { bufferedStreamToBuffer, bufferToReadable, newWriteableBufferStream, readableToBuffer, streamToBuffer, VSBuffer, } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { Schemas } from '../../../base/common/network.js';
import { mark } from '../../../base/common/performance.js';
import { extUri, extUriIgnorePathCase, isAbsolutePath, } from '../../../base/common/resources.js';
import { consumeStream, isReadableBufferedStream, isReadableStream, listenStream, newWriteableStream, peekReadable, peekStream, transform, } from '../../../base/common/stream.js';
import { localize } from '../../../nls.js';
import { ensureFileSystemProviderError, etag, ETAG_DISABLED, FileChangesEvent, FileOperationError, FileOperationEvent, FilePermission, FileSystemProviderErrorCode, FileType, hasFileAtomicReadCapability, hasFileFolderCopyCapability, hasFileReadStreamCapability, hasOpenReadWriteCloseCapability, hasReadWriteCapability, NotModifiedSinceFileOperationError, toFileOperationResult, toFileSystemProviderErrorCode, hasFileCloneCapability, TooLargeFileOperationError, hasFileAtomicDeleteCapability, hasFileAtomicWriteCapability, } from './files.js';
import { readFileIntoStream } from './io.js';
import { ILogService } from '../../log/common/log.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
let FileService = class FileService extends Disposable {
    static { FileService_1 = this; }
    constructor(logService) {
        super();
        this.logService = logService;
        // Choose a buffer size that is a balance between memory needs and
        // manageable IPC overhead. The larger the buffer size, the less
        // roundtrips we have to do for reading/writing data.
        this.BUFFER_SIZE = 256 * 1024;
        //#region File System Provider
        this._onDidChangeFileSystemProviderRegistrations = this._register(new Emitter());
        this.onDidChangeFileSystemProviderRegistrations = this._onDidChangeFileSystemProviderRegistrations.event;
        this._onWillActivateFileSystemProvider = this._register(new Emitter());
        this.onWillActivateFileSystemProvider = this._onWillActivateFileSystemProvider.event;
        this._onDidChangeFileSystemProviderCapabilities = this._register(new Emitter());
        this.onDidChangeFileSystemProviderCapabilities = this._onDidChangeFileSystemProviderCapabilities.event;
        this.provider = new Map();
        //#endregion
        //#region Operation events
        this._onDidRunOperation = this._register(new Emitter());
        this.onDidRunOperation = this._onDidRunOperation.event;
        //#endregion
        //#region File Watching
        this.internalOnDidFilesChange = this._register(new Emitter());
        this._onDidUncorrelatedFilesChange = this._register(new Emitter());
        this.onDidFilesChange = this._onDidUncorrelatedFilesChange.event; // global `onDidFilesChange` skips correlated events
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        this.activeWatchers = new Map();
        //#endregion
        //#region Helpers
        this.writeQueue = this._register(new ResourceQueue());
    }
    registerProvider(scheme, provider) {
        if (this.provider.has(scheme)) {
            throw new Error(`A filesystem provider for the scheme '${scheme}' is already registered.`);
        }
        mark(`code/registerFilesystem/${scheme}`);
        const providerDisposables = new DisposableStore();
        // Add provider with event
        this.provider.set(scheme, provider);
        this._onDidChangeFileSystemProviderRegistrations.fire({ added: true, scheme, provider });
        // Forward events from provider
        providerDisposables.add(provider.onDidChangeFile((changes) => {
            const event = new FileChangesEvent(changes, !this.isPathCaseSensitive(provider));
            // Always emit any event internally
            this.internalOnDidFilesChange.fire(event);
            // Only emit uncorrelated events in the global `onDidFilesChange` event
            if (!event.hasCorrelation()) {
                this._onDidUncorrelatedFilesChange.fire(event);
            }
        }));
        if (typeof provider.onDidWatchError === 'function') {
            providerDisposables.add(provider.onDidWatchError((error) => this._onDidWatchError.fire(new Error(error))));
        }
        providerDisposables.add(provider.onDidChangeCapabilities(() => this._onDidChangeFileSystemProviderCapabilities.fire({ provider, scheme })));
        return toDisposable(() => {
            this._onDidChangeFileSystemProviderRegistrations.fire({ added: false, scheme, provider });
            this.provider.delete(scheme);
            dispose(providerDisposables);
        });
    }
    getProvider(scheme) {
        return this.provider.get(scheme);
    }
    async activateProvider(scheme) {
        // Emit an event that we are about to activate a provider with the given scheme.
        // Listeners can participate in the activation by registering a provider for it.
        const joiners = [];
        this._onWillActivateFileSystemProvider.fire({
            scheme,
            join(promise) {
                joiners.push(promise);
            },
        });
        if (this.provider.has(scheme)) {
            return; // provider is already here so we can return directly
        }
        // If the provider is not yet there, make sure to join on the listeners assuming
        // that it takes a bit longer to register the file system provider.
        await Promises.settled(joiners);
    }
    async canHandleResource(resource) {
        // Await activation of potentially extension contributed providers
        await this.activateProvider(resource.scheme);
        return this.hasProvider(resource);
    }
    hasProvider(resource) {
        return this.provider.has(resource.scheme);
    }
    hasCapability(resource, capability) {
        const provider = this.provider.get(resource.scheme);
        return !!(provider && provider.capabilities & capability);
    }
    listCapabilities() {
        return Iterable.map(this.provider, ([scheme, provider]) => ({
            scheme,
            capabilities: provider.capabilities,
        }));
    }
    async withProvider(resource) {
        // Assert path is absolute
        if (!isAbsolutePath(resource)) {
            throw new FileOperationError(localize('invalidPath', "Unable to resolve filesystem provider with relative file path '{0}'", this.resourceForError(resource)), 8 /* FileOperationResult.FILE_INVALID_PATH */);
        }
        // Activate provider
        await this.activateProvider(resource.scheme);
        // Assert provider
        const provider = this.provider.get(resource.scheme);
        if (!provider) {
            const error = new ErrorNoTelemetry();
            error.message = localize('noProviderFound', "ENOPRO: No file system provider found for resource '{0}'", resource.toString());
            throw error;
        }
        return provider;
    }
    async withReadProvider(resource) {
        const provider = await this.withProvider(resource);
        if (hasOpenReadWriteCloseCapability(provider) ||
            hasReadWriteCapability(provider) ||
            hasFileReadStreamCapability(provider)) {
            return provider;
        }
        throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither has FileReadWrite, FileReadStream nor FileOpenReadWriteClose capability which is needed for the read operation.`);
    }
    async withWriteProvider(resource) {
        const provider = await this.withProvider(resource);
        if (hasOpenReadWriteCloseCapability(provider) || hasReadWriteCapability(provider)) {
            return provider;
        }
        throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither has FileReadWrite nor FileOpenReadWriteClose capability which is needed for the write operation.`);
    }
    async resolve(resource, options) {
        try {
            return await this.doResolveFile(resource, options);
        }
        catch (error) {
            // Specially handle file not found case as file operation result
            if (toFileSystemProviderErrorCode(error) === FileSystemProviderErrorCode.FileNotFound) {
                throw new FileOperationError(localize('fileNotFoundError', "Unable to resolve nonexistent file '{0}'", this.resourceForError(resource)), 1 /* FileOperationResult.FILE_NOT_FOUND */);
            }
            // Bubble up any other error as is
            throw ensureFileSystemProviderError(error);
        }
    }
    async doResolveFile(resource, options) {
        const provider = await this.withProvider(resource);
        const isPathCaseSensitive = this.isPathCaseSensitive(provider);
        const resolveTo = options?.resolveTo;
        const resolveSingleChildDescendants = options?.resolveSingleChildDescendants;
        const resolveMetadata = options?.resolveMetadata;
        const stat = await provider.stat(resource);
        let trie;
        return this.toFileStat(provider, resource, stat, undefined, !!resolveMetadata, (stat, siblings) => {
            // lazy trie to check for recursive resolving
            if (!trie) {
                trie = TernarySearchTree.forUris(() => !isPathCaseSensitive);
                trie.set(resource, true);
                if (resolveTo) {
                    trie.fill(true, resolveTo);
                }
            }
            // check for recursive resolving
            if (trie.get(stat.resource) ||
                trie.findSuperstr(stat.resource.with({
                    query: null,
                    fragment: null,
                } /* required for https://github.com/microsoft/vscode/issues/128151 */))) {
                return true;
            }
            // check for resolving single child folders
            if (stat.isDirectory && resolveSingleChildDescendants) {
                return siblings === 1;
            }
            return false;
        });
    }
    async toFileStat(provider, resource, stat, siblings, resolveMetadata, recurse) {
        const { providerExtUri } = this.getExtUri(provider);
        // convert to file stat
        const fileStat = {
            resource,
            name: providerExtUri.basename(resource),
            isFile: (stat.type & FileType.File) !== 0,
            isDirectory: (stat.type & FileType.Directory) !== 0,
            isSymbolicLink: (stat.type & FileType.SymbolicLink) !== 0,
            mtime: stat.mtime,
            ctime: stat.ctime,
            size: stat.size,
            readonly: Boolean((stat.permissions ?? 0) & FilePermission.Readonly) ||
                Boolean(provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */),
            locked: Boolean((stat.permissions ?? 0) & FilePermission.Locked),
            etag: etag({ mtime: stat.mtime, size: stat.size }),
            children: undefined,
        };
        // check to recurse for directories
        if (fileStat.isDirectory && recurse(fileStat, siblings)) {
            try {
                const entries = await provider.readdir(resource);
                const resolvedEntries = await Promises.settled(entries.map(async ([name, type]) => {
                    try {
                        const childResource = providerExtUri.joinPath(resource, name);
                        const childStat = resolveMetadata ? await provider.stat(childResource) : { type };
                        return await this.toFileStat(provider, childResource, childStat, entries.length, resolveMetadata, recurse);
                    }
                    catch (error) {
                        this.logService.trace(error);
                        return null; // can happen e.g. due to permission errors
                    }
                }));
                // make sure to get rid of null values that signal a failure to resolve a particular entry
                fileStat.children = coalesce(resolvedEntries);
            }
            catch (error) {
                this.logService.trace(error);
                fileStat.children = []; // gracefully handle errors, we may not have permissions to read
            }
            return fileStat;
        }
        return fileStat;
    }
    async resolveAll(toResolve) {
        return Promises.settled(toResolve.map(async (entry) => {
            try {
                return { stat: await this.doResolveFile(entry.resource, entry.options), success: true };
            }
            catch (error) {
                this.logService.trace(error);
                return { stat: undefined, success: false };
            }
        }));
    }
    async stat(resource) {
        const provider = await this.withProvider(resource);
        const stat = await provider.stat(resource);
        return this.toFileStat(provider, resource, stat, undefined, true, () => false /* Do not resolve any children */);
    }
    async exists(resource) {
        const provider = await this.withProvider(resource);
        try {
            const stat = await provider.stat(resource);
            return !!stat;
        }
        catch (error) {
            return false;
        }
    }
    //#endregion
    //#region File Reading/Writing
    async canCreateFile(resource, options) {
        try {
            await this.doValidateCreateFile(resource, options);
        }
        catch (error) {
            return error;
        }
        return true;
    }
    async doValidateCreateFile(resource, options) {
        // validate overwrite
        if (!options?.overwrite && (await this.exists(resource))) {
            throw new FileOperationError(localize('fileExists', "Unable to create file '{0}' that already exists when overwrite flag is not set", this.resourceForError(resource)), 3 /* FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
    }
    async createFile(resource, bufferOrReadableOrStream = VSBuffer.fromString(''), options) {
        // validate
        await this.doValidateCreateFile(resource, options);
        // do write into file (this will create it too)
        const fileStat = await this.writeFile(resource, bufferOrReadableOrStream);
        // events
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 0 /* FileOperation.CREATE */, fileStat));
        return fileStat;
    }
    async writeFile(resource, bufferOrReadableOrStream, options) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(resource), resource);
        const { providerExtUri } = this.getExtUri(provider);
        let writeFileOptions = options;
        if (hasFileAtomicWriteCapability(provider) && !writeFileOptions?.atomic) {
            const enforcedAtomicWrite = provider.enforceAtomicWriteFile?.(resource);
            if (enforcedAtomicWrite) {
                writeFileOptions = { ...options, atomic: enforcedAtomicWrite };
            }
        }
        try {
            // validate write (this may already return a peeked-at buffer)
            let { stat, buffer: bufferOrReadableOrStreamOrBufferedStream } = await this.validateWriteFile(provider, resource, bufferOrReadableOrStream, writeFileOptions);
            // mkdir recursively as needed
            if (!stat) {
                await this.mkdirp(provider, providerExtUri.dirname(resource));
            }
            // optimization: if the provider has unbuffered write capability and the data
            // to write is not a buffer, we consume up to 3 chunks and try to write the data
            // unbuffered to reduce the overhead. If the stream or readable has more data
            // to provide we continue to write buffered.
            if (!bufferOrReadableOrStreamOrBufferedStream) {
                bufferOrReadableOrStreamOrBufferedStream = await this.peekBufferForWriting(provider, bufferOrReadableOrStream);
            }
            // write file: unbuffered
            if (!hasOpenReadWriteCloseCapability(provider) || // buffered writing is unsupported
                (hasReadWriteCapability(provider) &&
                    bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer) || // data is a full buffer already
                (hasReadWriteCapability(provider) &&
                    hasFileAtomicWriteCapability(provider) &&
                    writeFileOptions?.atomic) // atomic write forces unbuffered write if the provider supports it
            ) {
                await this.doWriteUnbuffered(provider, resource, writeFileOptions, bufferOrReadableOrStreamOrBufferedStream);
            }
            // write file: buffered
            else {
                await this.doWriteBuffered(provider, resource, writeFileOptions, bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer
                    ? bufferToReadable(bufferOrReadableOrStreamOrBufferedStream)
                    : bufferOrReadableOrStreamOrBufferedStream);
            }
            // events
            this._onDidRunOperation.fire(new FileOperationEvent(resource, 4 /* FileOperation.WRITE */));
        }
        catch (error) {
            throw new FileOperationError(localize('err.write', "Unable to write file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperationResult(error), writeFileOptions);
        }
        return this.resolve(resource, { resolveMetadata: true });
    }
    async peekBufferForWriting(provider, bufferOrReadableOrStream) {
        let peekResult;
        if (hasReadWriteCapability(provider) && !(bufferOrReadableOrStream instanceof VSBuffer)) {
            if (isReadableStream(bufferOrReadableOrStream)) {
                const bufferedStream = await peekStream(bufferOrReadableOrStream, 3);
                if (bufferedStream.ended) {
                    peekResult = VSBuffer.concat(bufferedStream.buffer);
                }
                else {
                    peekResult = bufferedStream;
                }
            }
            else {
                peekResult = peekReadable(bufferOrReadableOrStream, (data) => VSBuffer.concat(data), 3);
            }
        }
        else {
            peekResult = bufferOrReadableOrStream;
        }
        return peekResult;
    }
    async validateWriteFile(provider, resource, bufferOrReadableOrStream, options) {
        // Validate unlock support
        const unlock = !!options?.unlock;
        if (unlock && !(provider.capabilities & 8192 /* FileSystemProviderCapabilities.FileWriteUnlock */)) {
            throw new Error(localize('writeFailedUnlockUnsupported', "Unable to unlock file '{0}' because provider does not support it.", this.resourceForError(resource)));
        }
        // Validate atomic support
        const atomic = !!options?.atomic;
        if (atomic) {
            if (!(provider.capabilities & 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */)) {
                throw new Error(localize('writeFailedAtomicUnsupported1', "Unable to atomically write file '{0}' because provider does not support it.", this.resourceForError(resource)));
            }
            if (!(provider.capabilities & 2 /* FileSystemProviderCapabilities.FileReadWrite */)) {
                throw new Error(localize('writeFailedAtomicUnsupported2', "Unable to atomically write file '{0}' because provider does not support unbuffered writes.", this.resourceForError(resource)));
            }
            if (unlock) {
                throw new Error(localize('writeFailedAtomicUnlock', "Unable to unlock file '{0}' because atomic write is enabled.", this.resourceForError(resource)));
            }
        }
        // Validate via file stat meta data
        let stat = undefined;
        try {
            stat = await provider.stat(resource);
        }
        catch (error) {
            return Object.create(null); // file might not exist
        }
        // File cannot be directory
        if ((stat.type & FileType.Directory) !== 0) {
            throw new FileOperationError(localize('fileIsDirectoryWriteError', "Unable to write file '{0}' that is actually a directory", this.resourceForError(resource)), 0 /* FileOperationResult.FILE_IS_DIRECTORY */, options);
        }
        // File cannot be readonly
        this.throwIfFileIsReadonly(resource, stat);
        // Dirty write prevention: if the file on disk has been changed and does not match our expected
        // mtime and etag, we bail out to prevent dirty writing.
        //
        // First, we check for a mtime that is in the future before we do more checks. The assumption is
        // that only the mtime is an indicator for a file that has changed on disk.
        //
        // Second, if the mtime has advanced, we compare the size of the file on disk with our previous
        // one using the etag() function. Relying only on the mtime check has prooven to produce false
        // positives due to file system weirdness (especially around remote file systems). As such, the
        // check for size is a weaker check because it can return a false negative if the file has changed
        // but to the same length. This is a compromise we take to avoid having to produce checksums of
        // the file content for comparison which would be much slower to compute.
        //
        // Third, if the etag() turns out to be different, we do one attempt to compare the buffer we
        // are about to write with the contents on disk to figure out if the contents are identical.
        // In that case we allow the writing as it would result in the same contents in the file.
        let buffer;
        if (typeof options?.mtime === 'number' &&
            typeof options.etag === 'string' &&
            options.etag !== ETAG_DISABLED &&
            typeof stat.mtime === 'number' &&
            typeof stat.size === 'number' &&
            options.mtime < stat.mtime &&
            options.etag !==
                etag({
                    mtime: options.mtime /* not using stat.mtime for a reason, see above */,
                    size: stat.size,
                })) {
            buffer = await this.peekBufferForWriting(provider, bufferOrReadableOrStream);
            if (buffer instanceof VSBuffer && buffer.byteLength === stat.size) {
                try {
                    const { value } = await this.readFile(resource, { limits: { size: stat.size } });
                    if (buffer.equals(value)) {
                        return { stat, buffer }; // allow writing since contents are identical
                    }
                }
                catch (error) {
                    // ignore, throw the FILE_MODIFIED_SINCE error
                }
            }
            throw new FileOperationError(localize('fileModifiedError', 'File Modified Since'), 3 /* FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
        return { stat, buffer };
    }
    async readFile(resource, options, token) {
        const provider = await this.withReadProvider(resource);
        if (options?.atomic) {
            return this.doReadFileAtomic(provider, resource, options, token);
        }
        return this.doReadFile(provider, resource, options, token);
    }
    async doReadFileAtomic(provider, resource, options, token) {
        return new Promise((resolve, reject) => {
            this.writeQueue.queueFor(resource, async () => {
                try {
                    const content = await this.doReadFile(provider, resource, options, token);
                    resolve(content);
                }
                catch (error) {
                    reject(error);
                }
            }, this.getExtUri(provider).providerExtUri);
        });
    }
    async doReadFile(provider, resource, options, token) {
        const stream = await this.doReadFileStream(provider, resource, {
            ...options,
            // optimization: since we know that the caller does not
            // care about buffering, we indicate this to the reader.
            // this reduces all the overhead the buffered reading
            // has (open, read, close) if the provider supports
            // unbuffered reading.
            preferUnbuffered: true,
        }, token);
        return {
            ...stream,
            value: await streamToBuffer(stream.value),
        };
    }
    async readFileStream(resource, options, token) {
        const provider = await this.withReadProvider(resource);
        return this.doReadFileStream(provider, resource, options, token);
    }
    async doReadFileStream(provider, resource, options, token) {
        // install a cancellation token that gets cancelled
        // when any error occurs. this allows us to resolve
        // the content of the file while resolving metadata
        // but still cancel the operation in certain cases.
        //
        // in addition, we pass the optional token in that
        // we got from the outside to even allow for external
        // cancellation of the read operation.
        const cancellableSource = new CancellationTokenSource(token);
        let readFileOptions = options;
        if (hasFileAtomicReadCapability(provider) && provider.enforceAtomicReadFile?.(resource)) {
            readFileOptions = { ...options, atomic: true };
        }
        // validate read operation
        const statPromise = this.validateReadFile(resource, readFileOptions).then((stat) => stat, (error) => {
            cancellableSource.dispose(true);
            throw error;
        });
        let fileStream = undefined;
        try {
            // if the etag is provided, we await the result of the validation
            // due to the likelihood of hitting a NOT_MODIFIED_SINCE result.
            // otherwise, we let it run in parallel to the file reading for
            // optimal startup performance.
            if (typeof readFileOptions?.etag === 'string' && readFileOptions.etag !== ETAG_DISABLED) {
                await statPromise;
            }
            // read unbuffered
            if ((readFileOptions?.atomic && hasFileAtomicReadCapability(provider)) || // atomic reads are always unbuffered
                !(hasOpenReadWriteCloseCapability(provider) || hasFileReadStreamCapability(provider)) || // provider has no buffered capability
                (hasReadWriteCapability(provider) && readFileOptions?.preferUnbuffered) // unbuffered read is preferred
            ) {
                fileStream = this.readFileUnbuffered(provider, resource, readFileOptions);
            }
            // read streamed (always prefer over primitive buffered read)
            else if (hasFileReadStreamCapability(provider)) {
                fileStream = this.readFileStreamed(provider, resource, cancellableSource.token, readFileOptions);
            }
            // read buffered
            else {
                fileStream = this.readFileBuffered(provider, resource, cancellableSource.token, readFileOptions);
            }
            fileStream.on('end', () => cancellableSource.dispose());
            fileStream.on('error', () => cancellableSource.dispose());
            const fileStat = await statPromise;
            return {
                ...fileStat,
                value: fileStream,
            };
        }
        catch (error) {
            // Await the stream to finish so that we exit this method
            // in a consistent state with file handles closed
            // (https://github.com/microsoft/vscode/issues/114024)
            if (fileStream) {
                await consumeStream(fileStream);
            }
            // Re-throw errors as file operation errors but preserve
            // specific errors (such as not modified since)
            throw this.restoreReadError(error, resource, readFileOptions);
        }
    }
    restoreReadError(error, resource, options) {
        const message = localize('err.read', "Unable to read file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString());
        if (error instanceof NotModifiedSinceFileOperationError) {
            return new NotModifiedSinceFileOperationError(message, error.stat, options);
        }
        if (error instanceof TooLargeFileOperationError) {
            return new TooLargeFileOperationError(message, error.fileOperationResult, error.size, error.options);
        }
        return new FileOperationError(message, toFileOperationResult(error), options);
    }
    readFileStreamed(provider, resource, token, options = Object.create(null)) {
        const fileStream = provider.readFileStream(resource, options, token);
        return transform(fileStream, {
            data: (data) => (data instanceof VSBuffer ? data : VSBuffer.wrap(data)),
            error: (error) => this.restoreReadError(error, resource, options),
        }, (data) => VSBuffer.concat(data));
    }
    readFileBuffered(provider, resource, token, options = Object.create(null)) {
        const stream = newWriteableBufferStream();
        readFileIntoStream(provider, resource, stream, (data) => data, {
            ...options,
            bufferSize: this.BUFFER_SIZE,
            errorTransformer: (error) => this.restoreReadError(error, resource, options),
        }, token);
        return stream;
    }
    readFileUnbuffered(provider, resource, options) {
        const stream = newWriteableStream((data) => VSBuffer.concat(data));
        (async () => {
            try {
                let buffer;
                if (options?.atomic && hasFileAtomicReadCapability(provider)) {
                    buffer = await provider.readFile(resource, { atomic: true });
                }
                else {
                    buffer = await provider.readFile(resource);
                }
                // respect position option
                if (typeof options?.position === 'number') {
                    buffer = buffer.slice(options.position);
                }
                // respect length option
                if (typeof options?.length === 'number') {
                    buffer = buffer.slice(0, options.length);
                }
                // Throw if file is too large to load
                this.validateReadFileLimits(resource, buffer.byteLength, options);
                // End stream with data
                stream.end(VSBuffer.wrap(buffer));
            }
            catch (err) {
                stream.error(err);
                stream.end();
            }
        })();
        return stream;
    }
    async validateReadFile(resource, options) {
        const stat = await this.resolve(resource, { resolveMetadata: true });
        // Throw if resource is a directory
        if (stat.isDirectory) {
            throw new FileOperationError(localize('fileIsDirectoryReadError', "Unable to read file '{0}' that is actually a directory", this.resourceForError(resource)), 0 /* FileOperationResult.FILE_IS_DIRECTORY */, options);
        }
        // Throw if file not modified since (unless disabled)
        if (typeof options?.etag === 'string' &&
            options.etag !== ETAG_DISABLED &&
            options.etag === stat.etag) {
            throw new NotModifiedSinceFileOperationError(localize('fileNotModifiedError', 'File not modified since'), stat, options);
        }
        // Throw if file is too large to load
        this.validateReadFileLimits(resource, stat.size, options);
        return stat;
    }
    validateReadFileLimits(resource, size, options) {
        if (typeof options?.limits?.size === 'number' && size > options.limits.size) {
            throw new TooLargeFileOperationError(localize('fileTooLargeError', "Unable to read file '{0}' that is too large to open", this.resourceForError(resource)), 7 /* FileOperationResult.FILE_TOO_LARGE */, size, options);
        }
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async canMove(source, target, overwrite) {
        return this.doCanMoveCopy(source, target, 'move', overwrite);
    }
    async canCopy(source, target, overwrite) {
        return this.doCanMoveCopy(source, target, 'copy', overwrite);
    }
    async doCanMoveCopy(source, target, mode, overwrite) {
        if (source.toString() !== target.toString()) {
            try {
                const sourceProvider = mode === 'move'
                    ? this.throwIfFileSystemIsReadonly(await this.withWriteProvider(source), source)
                    : await this.withReadProvider(source);
                const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
                await this.doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite);
            }
            catch (error) {
                return error;
            }
        }
        return true;
    }
    async move(source, target, overwrite) {
        const sourceProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(source), source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        // move
        const mode = await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'move', !!overwrite);
        // resolve and send events
        const fileStat = await this.resolve(target, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(source, mode === 'move' ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */, fileStat));
        return fileStat;
    }
    async copy(source, target, overwrite) {
        const sourceProvider = await this.withReadProvider(source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        // copy
        const mode = await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'copy', !!overwrite);
        // resolve and send events
        const fileStat = await this.resolve(target, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(source, mode === 'copy' ? 3 /* FileOperation.COPY */ : 2 /* FileOperation.MOVE */, fileStat));
        return fileStat;
    }
    async doMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite) {
        if (source.toString() === target.toString()) {
            return mode; // simulate node.js behaviour here and do a no-op if paths match
        }
        // validation
        const { exists, isSameResourceWithDifferentPathCase } = await this.doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite);
        // delete as needed (unless target is same resurce with different path case)
        if (exists && !isSameResourceWithDifferentPathCase && overwrite) {
            await this.del(target, { recursive: true });
        }
        // create parent folders
        await this.mkdirp(targetProvider, this.getExtUri(targetProvider).providerExtUri.dirname(target));
        // copy source => target
        if (mode === 'copy') {
            // same provider with fast copy: leverage copy() functionality
            if (sourceProvider === targetProvider && hasFileFolderCopyCapability(sourceProvider)) {
                await sourceProvider.copy(source, target, { overwrite });
            }
            // when copying via buffer/unbuffered, we have to manually
            // traverse the source if it is a folder and not a file
            else {
                const sourceFile = await this.resolve(source);
                if (sourceFile.isDirectory) {
                    await this.doCopyFolder(sourceProvider, sourceFile, targetProvider, target);
                }
                else {
                    await this.doCopyFile(sourceProvider, source, targetProvider, target);
                }
            }
            return mode;
        }
        // move source => target
        else {
            // same provider: leverage rename() functionality
            if (sourceProvider === targetProvider) {
                await sourceProvider.rename(source, target, { overwrite });
                return mode;
            }
            // across providers: copy to target & delete at source
            else {
                await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'copy', overwrite);
                await this.del(source, { recursive: true });
                return 'copy';
            }
        }
    }
    async doCopyFile(sourceProvider, source, targetProvider, target) {
        // copy: source (buffered) => target (buffered)
        if (hasOpenReadWriteCloseCapability(sourceProvider) &&
            hasOpenReadWriteCloseCapability(targetProvider)) {
            return this.doPipeBuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (buffered) => target (unbuffered)
        if (hasOpenReadWriteCloseCapability(sourceProvider) && hasReadWriteCapability(targetProvider)) {
            return this.doPipeBufferedToUnbuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (unbuffered) => target (buffered)
        if (hasReadWriteCapability(sourceProvider) && hasOpenReadWriteCloseCapability(targetProvider)) {
            return this.doPipeUnbufferedToBuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (unbuffered) => target (unbuffered)
        if (hasReadWriteCapability(sourceProvider) && hasReadWriteCapability(targetProvider)) {
            return this.doPipeUnbuffered(sourceProvider, source, targetProvider, target);
        }
    }
    async doCopyFolder(sourceProvider, sourceFolder, targetProvider, targetFolder) {
        // create folder in target
        await targetProvider.mkdir(targetFolder);
        // create children in target
        if (Array.isArray(sourceFolder.children)) {
            await Promises.settled(sourceFolder.children.map(async (sourceChild) => {
                const targetChild = this.getExtUri(targetProvider).providerExtUri.joinPath(targetFolder, sourceChild.name);
                if (sourceChild.isDirectory) {
                    return this.doCopyFolder(sourceProvider, await this.resolve(sourceChild.resource), targetProvider, targetChild);
                }
                else {
                    return this.doCopyFile(sourceProvider, sourceChild.resource, targetProvider, targetChild);
                }
            }));
        }
    }
    async doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite) {
        let isSameResourceWithDifferentPathCase = false;
        // Check if source is equal or parent to target (requires providers to be the same)
        if (sourceProvider === targetProvider) {
            const { providerExtUri, isPathCaseSensitive } = this.getExtUri(sourceProvider);
            if (!isPathCaseSensitive) {
                isSameResourceWithDifferentPathCase = providerExtUri.isEqual(source, target);
            }
            if (isSameResourceWithDifferentPathCase && mode === 'copy') {
                throw new Error(localize('unableToMoveCopyError1', "Unable to copy when source '{0}' is same as target '{1}' with different path case on a case insensitive file system", this.resourceForError(source), this.resourceForError(target)));
            }
            if (!isSameResourceWithDifferentPathCase && providerExtUri.isEqualOrParent(target, source)) {
                throw new Error(localize('unableToMoveCopyError2', "Unable to move/copy when source '{0}' is parent of target '{1}'.", this.resourceForError(source), this.resourceForError(target)));
            }
        }
        // Extra checks if target exists and this is not a rename
        const exists = await this.exists(target);
        if (exists && !isSameResourceWithDifferentPathCase) {
            // Bail out if target exists and we are not about to overwrite
            if (!overwrite) {
                throw new FileOperationError(localize('unableToMoveCopyError3', "Unable to move/copy '{0}' because target '{1}' already exists at destination.", this.resourceForError(source), this.resourceForError(target)), 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            }
            // Special case: if the target is a parent of the source, we cannot delete
            // it as it would delete the source as well. In this case we have to throw
            if (sourceProvider === targetProvider) {
                const { providerExtUri } = this.getExtUri(sourceProvider);
                if (providerExtUri.isEqualOrParent(source, target)) {
                    throw new Error(localize('unableToMoveCopyError4', "Unable to move/copy '{0}' into '{1}' since a file would replace the folder it is contained in.", this.resourceForError(source), this.resourceForError(target)));
                }
            }
        }
        return { exists, isSameResourceWithDifferentPathCase };
    }
    getExtUri(provider) {
        const isPathCaseSensitive = this.isPathCaseSensitive(provider);
        return {
            providerExtUri: isPathCaseSensitive ? extUri : extUriIgnorePathCase,
            isPathCaseSensitive,
        };
    }
    isPathCaseSensitive(provider) {
        return !!(provider.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
    }
    async createFolder(resource) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withProvider(resource), resource);
        // mkdir recursively
        await this.mkdirp(provider, resource);
        // events
        const fileStat = await this.resolve(resource, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 0 /* FileOperation.CREATE */, fileStat));
        return fileStat;
    }
    async mkdirp(provider, directory) {
        const directoriesToCreate = [];
        // mkdir until we reach root
        const { providerExtUri } = this.getExtUri(provider);
        while (!providerExtUri.isEqual(directory, providerExtUri.dirname(directory))) {
            try {
                const stat = await provider.stat(directory);
                if ((stat.type & FileType.Directory) === 0) {
                    throw new Error(localize('mkdirExistsError', "Unable to create folder '{0}' that already exists but is not a directory", this.resourceForError(directory)));
                }
                break; // we have hit a directory that exists -> good
            }
            catch (error) {
                // Bubble up any other error that is not file not found
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileNotFound) {
                    throw error;
                }
                // Upon error, remember directories that need to be created
                directoriesToCreate.push(providerExtUri.basename(directory));
                // Continue up
                directory = providerExtUri.dirname(directory);
            }
        }
        // Create directories as needed
        for (let i = directoriesToCreate.length - 1; i >= 0; i--) {
            directory = providerExtUri.joinPath(directory, directoriesToCreate[i]);
            try {
                await provider.mkdir(directory);
            }
            catch (error) {
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileExists) {
                    // For mkdirp() we tolerate that the mkdir() call fails
                    // in case the folder already exists. This follows node.js
                    // own implementation of fs.mkdir({ recursive: true }) and
                    // reduces the chances of race conditions leading to errors
                    // if multiple calls try to create the same folders
                    // As such, we only throw an error here if it is other than
                    // the fact that the file already exists.
                    // (see also https://github.com/microsoft/vscode/issues/89834)
                    throw error;
                }
            }
        }
    }
    async canDelete(resource, options) {
        try {
            await this.doValidateDelete(resource, options);
        }
        catch (error) {
            return error;
        }
        return true;
    }
    async doValidateDelete(resource, options) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withProvider(resource), resource);
        // Validate trash support
        const useTrash = !!options?.useTrash;
        if (useTrash && !(provider.capabilities & 4096 /* FileSystemProviderCapabilities.Trash */)) {
            throw new Error(localize('deleteFailedTrashUnsupported', "Unable to delete file '{0}' via trash because provider does not support it.", this.resourceForError(resource)));
        }
        // Validate atomic support
        const atomic = options?.atomic;
        if (atomic && !(provider.capabilities & 65536 /* FileSystemProviderCapabilities.FileAtomicDelete */)) {
            throw new Error(localize('deleteFailedAtomicUnsupported', "Unable to delete file '{0}' atomically because provider does not support it.", this.resourceForError(resource)));
        }
        if (useTrash && atomic) {
            throw new Error(localize('deleteFailedTrashAndAtomicUnsupported', "Unable to atomically delete file '{0}' because using trash is enabled.", this.resourceForError(resource)));
        }
        // Validate delete
        let stat = undefined;
        try {
            stat = await provider.stat(resource);
        }
        catch (error) {
            // Handled later
        }
        if (stat) {
            this.throwIfFileIsReadonly(resource, stat);
        }
        else {
            throw new FileOperationError(localize('deleteFailedNotFound', "Unable to delete nonexistent file '{0}'", this.resourceForError(resource)), 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        // Validate recursive
        const recursive = !!options?.recursive;
        if (!recursive) {
            const stat = await this.resolve(resource);
            if (stat.isDirectory && Array.isArray(stat.children) && stat.children.length > 0) {
                throw new Error(localize('deleteFailedNonEmptyFolder', "Unable to delete non-empty folder '{0}'.", this.resourceForError(resource)));
            }
        }
        return provider;
    }
    async del(resource, options) {
        const provider = await this.doValidateDelete(resource, options);
        let deleteFileOptions = options;
        if (hasFileAtomicDeleteCapability(provider) && !deleteFileOptions?.atomic) {
            const enforcedAtomicDelete = provider.enforceAtomicDelete?.(resource);
            if (enforcedAtomicDelete) {
                deleteFileOptions = { ...options, atomic: enforcedAtomicDelete };
            }
        }
        const useTrash = !!deleteFileOptions?.useTrash;
        const recursive = !!deleteFileOptions?.recursive;
        const atomic = deleteFileOptions?.atomic ?? false;
        // Delete through provider
        await provider.delete(resource, { recursive, useTrash, atomic });
        // Events
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 1 /* FileOperation.DELETE */));
    }
    //#endregion
    //#region Clone File
    async cloneFile(source, target) {
        const sourceProvider = await this.withProvider(source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        if (sourceProvider === targetProvider &&
            this.getExtUri(sourceProvider).providerExtUri.isEqual(source, target)) {
            return; // return early if paths are equal
        }
        // same provider, use `cloneFile` when native support is provided
        if (sourceProvider === targetProvider && hasFileCloneCapability(sourceProvider)) {
            return sourceProvider.cloneFile(source, target);
        }
        // otherwise, either providers are different or there is no native
        // `cloneFile` support, then we fallback to emulate a clone as best
        // as we can with the other primitives
        // create parent folders
        await this.mkdirp(targetProvider, this.getExtUri(targetProvider).providerExtUri.dirname(target));
        // leverage `copy` method if provided and providers are identical
        // queue on the source to ensure atomic read
        if (sourceProvider === targetProvider && hasFileFolderCopyCapability(sourceProvider)) {
            return this.writeQueue.queueFor(source, () => sourceProvider.copy(source, target, { overwrite: true }), this.getExtUri(sourceProvider).providerExtUri);
        }
        // otherwise copy via buffer/unbuffered and use a write queue
        // on the source to ensure atomic operation as much as possible
        return this.writeQueue.queueFor(source, () => this.doCopyFile(sourceProvider, source, targetProvider, target), this.getExtUri(sourceProvider).providerExtUri);
    }
    static { this.WATCHER_CORRELATION_IDS = 0; }
    createWatcher(resource, options) {
        return this.watch(resource, {
            ...options,
            // Explicitly set a correlation id so that file events that originate
            // from requests from extensions are exclusively routed back to the
            // extension host and not into the workbench.
            correlationId: FileService_1.WATCHER_CORRELATION_IDS++,
        });
    }
    watch(resource, options = { recursive: false, excludes: [] }) {
        const disposables = new DisposableStore();
        // Forward watch request to provider and wire in disposables
        let watchDisposed = false;
        let disposeWatch = () => {
            watchDisposed = true;
        };
        disposables.add(toDisposable(() => disposeWatch()));
        (async () => {
            try {
                const disposable = await this.doWatch(resource, options);
                if (watchDisposed) {
                    dispose(disposable);
                }
                else {
                    disposeWatch = () => dispose(disposable);
                }
            }
            catch (error) {
                this.logService.error(error);
            }
        })();
        // When a correlation identifier is set, return a specific
        // watcher that only emits events matching that correalation.
        const correlationId = options.correlationId;
        if (typeof correlationId === 'number') {
            const fileChangeEmitter = disposables.add(new Emitter());
            disposables.add(this.internalOnDidFilesChange.event((e) => {
                if (e.correlates(correlationId)) {
                    fileChangeEmitter.fire(e);
                }
            }));
            const watcher = {
                onDidChange: fileChangeEmitter.event,
                dispose: () => disposables.dispose(),
            };
            return watcher;
        }
        return disposables;
    }
    async doWatch(resource, options) {
        const provider = await this.withProvider(resource);
        // Deduplicate identical watch requests
        const watchHash = hash([
            this.getExtUri(provider).providerExtUri.getComparisonKey(resource),
            options,
        ]);
        let watcher = this.activeWatchers.get(watchHash);
        if (!watcher) {
            watcher = {
                count: 0,
                disposable: provider.watch(resource, options),
            };
            this.activeWatchers.set(watchHash, watcher);
        }
        // Increment usage counter
        watcher.count += 1;
        return toDisposable(() => {
            if (watcher) {
                // Unref
                watcher.count--;
                // Dispose only when last user is reached
                if (watcher.count === 0) {
                    dispose(watcher.disposable);
                    this.activeWatchers.delete(watchHash);
                }
            }
        });
    }
    dispose() {
        super.dispose();
        for (const [, watcher] of this.activeWatchers) {
            dispose(watcher.disposable);
        }
        this.activeWatchers.clear();
    }
    async doWriteBuffered(provider, resource, options, readableOrStreamOrBufferedStream) {
        return this.writeQueue.queueFor(resource, async () => {
            // open handle
            const handle = await provider.open(resource, {
                create: true,
                unlock: options?.unlock ?? false,
            });
            // write into handle until all bytes from buffer have been written
            try {
                if (isReadableStream(readableOrStreamOrBufferedStream) ||
                    isReadableBufferedStream(readableOrStreamOrBufferedStream)) {
                    await this.doWriteStreamBufferedQueued(provider, handle, readableOrStreamOrBufferedStream);
                }
                else {
                    await this.doWriteReadableBufferedQueued(provider, handle, readableOrStreamOrBufferedStream);
                }
            }
            catch (error) {
                throw ensureFileSystemProviderError(error);
            }
            finally {
                // close handle always
                await provider.close(handle);
            }
        }, this.getExtUri(provider).providerExtUri);
    }
    async doWriteStreamBufferedQueued(provider, handle, streamOrBufferedStream) {
        let posInFile = 0;
        let stream;
        // Buffered stream: consume the buffer first by writing
        // it to the target before reading from the stream.
        if (isReadableBufferedStream(streamOrBufferedStream)) {
            if (streamOrBufferedStream.buffer.length > 0) {
                const chunk = VSBuffer.concat(streamOrBufferedStream.buffer);
                await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
                posInFile += chunk.byteLength;
            }
            // If the stream has been consumed, return early
            if (streamOrBufferedStream.ended) {
                return;
            }
            stream = streamOrBufferedStream.stream;
        }
        // Unbuffered stream - just take as is
        else {
            stream = streamOrBufferedStream;
        }
        return new Promise((resolve, reject) => {
            listenStream(stream, {
                onData: async (chunk) => {
                    // pause stream to perform async write operation
                    stream.pause();
                    try {
                        await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
                    }
                    catch (error) {
                        return reject(error);
                    }
                    posInFile += chunk.byteLength;
                    // resume stream now that we have successfully written
                    // run this on the next tick to prevent increasing the
                    // execution stack because resume() may call the event
                    // handler again before finishing.
                    setTimeout(() => stream.resume());
                },
                onError: (error) => reject(error),
                onEnd: () => resolve(),
            });
        });
    }
    async doWriteReadableBufferedQueued(provider, handle, readable) {
        let posInFile = 0;
        let chunk;
        while ((chunk = readable.read()) !== null) {
            await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
            posInFile += chunk.byteLength;
        }
    }
    async doWriteBuffer(provider, handle, buffer, length, posInFile, posInBuffer) {
        let totalBytesWritten = 0;
        while (totalBytesWritten < length) {
            // Write through the provider
            const bytesWritten = await provider.write(handle, posInFile + totalBytesWritten, buffer.buffer, posInBuffer + totalBytesWritten, length - totalBytesWritten);
            totalBytesWritten += bytesWritten;
        }
    }
    async doWriteUnbuffered(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream) {
        return this.writeQueue.queueFor(resource, () => this.doWriteUnbufferedQueued(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream), this.getExtUri(provider).providerExtUri);
    }
    async doWriteUnbufferedQueued(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream) {
        let buffer;
        if (bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer) {
            buffer = bufferOrReadableOrStreamOrBufferedStream;
        }
        else if (isReadableStream(bufferOrReadableOrStreamOrBufferedStream)) {
            buffer = await streamToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        else if (isReadableBufferedStream(bufferOrReadableOrStreamOrBufferedStream)) {
            buffer = await bufferedStreamToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        else {
            buffer = readableToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        // Write through the provider
        await provider.writeFile(resource, buffer.buffer, {
            create: true,
            overwrite: true,
            unlock: options?.unlock ?? false,
            atomic: options?.atomic ?? false,
        });
    }
    async doPipeBuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeBufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeBufferedQueued(sourceProvider, source, targetProvider, target) {
        let sourceHandle = undefined;
        let targetHandle = undefined;
        try {
            // Open handles
            sourceHandle = await sourceProvider.open(source, { create: false });
            targetHandle = await targetProvider.open(target, { create: true, unlock: false });
            const buffer = VSBuffer.alloc(this.BUFFER_SIZE);
            let posInFile = 0;
            let posInBuffer = 0;
            let bytesRead = 0;
            do {
                // read from source (sourceHandle) at current position (posInFile) into buffer (buffer) at
                // buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
                bytesRead = await sourceProvider.read(sourceHandle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);
                // write into target (targetHandle) at current position (posInFile) from buffer (buffer) at
                // buffer position (posInBuffer) all bytes we read (bytesRead).
                await this.doWriteBuffer(targetProvider, targetHandle, buffer, bytesRead, posInFile, posInBuffer);
                posInFile += bytesRead;
                posInBuffer += bytesRead;
                // when buffer full, fill it again from the beginning
                if (posInBuffer === buffer.byteLength) {
                    posInBuffer = 0;
                }
            } while (bytesRead > 0);
        }
        catch (error) {
            throw ensureFileSystemProviderError(error);
        }
        finally {
            await Promises.settled([
                typeof sourceHandle === 'number' ? sourceProvider.close(sourceHandle) : Promise.resolve(),
                typeof targetHandle === 'number' ? targetProvider.close(targetHandle) : Promise.resolve(),
            ]);
        }
    }
    async doPipeUnbuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeUnbufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeUnbufferedQueued(sourceProvider, source, targetProvider, target) {
        return targetProvider.writeFile(target, await sourceProvider.readFile(source), {
            create: true,
            overwrite: true,
            unlock: false,
            atomic: false,
        });
    }
    async doPipeUnbufferedToBuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeUnbufferedToBufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeUnbufferedToBufferedQueued(sourceProvider, source, targetProvider, target) {
        // Open handle
        const targetHandle = await targetProvider.open(target, { create: true, unlock: false });
        // Read entire buffer from source and write buffered
        try {
            const buffer = await sourceProvider.readFile(source);
            await this.doWriteBuffer(targetProvider, targetHandle, VSBuffer.wrap(buffer), buffer.byteLength, 0, 0);
        }
        catch (error) {
            throw ensureFileSystemProviderError(error);
        }
        finally {
            await targetProvider.close(targetHandle);
        }
    }
    async doPipeBufferedToUnbuffered(sourceProvider, source, targetProvider, target) {
        // Read buffer via stream buffered
        const buffer = await streamToBuffer(this.readFileBuffered(sourceProvider, source, CancellationToken.None));
        // Write buffer into target at once
        await this.doWriteUnbuffered(targetProvider, target, undefined, buffer);
    }
    throwIfFileSystemIsReadonly(provider, resource) {
        if (provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */) {
            throw new FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this.resourceForError(resource)), 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
        }
        return provider;
    }
    throwIfFileIsReadonly(resource, stat) {
        if ((stat.permissions ?? 0) & FilePermission.Readonly) {
            throw new FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this.resourceForError(resource)), 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
        }
    }
    resourceForError(resource) {
        if (resource.scheme === Schemas.file) {
            return resource.fsPath;
        }
        return resource.toString(true);
    }
};
FileService = FileService_1 = __decorate([
    __param(0, ILogService)
], FileService);
export { FileService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkUsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFDaEIsd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsUUFBUSxHQUlSLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUNOLE1BQU0sRUFDTixvQkFBb0IsRUFFcEIsY0FBYyxHQUNkLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLGFBQWEsRUFDYix3QkFBd0IsRUFDeEIs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