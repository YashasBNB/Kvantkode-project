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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFFBQVEsR0FJUixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sRUFFUCxZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFDTixNQUFNLEVBQ04sb0JBQW9CLEVBRXBCLGNBQWMsR0FDZCxNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLFlBQVksRUFDWixVQUFVLEVBQ1YsU0FBUyxHQUNULE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsSUFBSSxFQUNKLGFBQWEsRUFDYixnQkFBZ0IsRUFHaEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUVsQixjQUFjLEVBRWQsMkJBQTJCLEVBQzNCLFFBQVEsRUFDUiwyQkFBMkIsRUFDM0IsMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiwrQkFBK0IsRUFDL0Isc0JBQXNCLEVBeUJ0QixrQ0FBa0MsRUFDbEMscUJBQXFCLEVBQ3JCLDZCQUE2QixFQUM3QixzQkFBc0IsRUFDdEIsMEJBQTBCLEVBQzFCLDZCQUE2QixFQUM3Qiw0QkFBNEIsR0FJNUIsTUFBTSxZQUFZLENBQUE7QUFDbkIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUxRCxJQUFNLFdBQVcsR0FBakIsTUFBTSxXQUFZLFNBQVEsVUFBVTs7SUFRMUMsWUFBeUIsVUFBd0M7UUFDaEUsS0FBSyxFQUFFLENBQUE7UUFEa0MsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUxqRSxrRUFBa0U7UUFDbEUsZ0VBQWdFO1FBQ2hFLHFEQUFxRDtRQUNwQyxnQkFBVyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUE7UUFNekMsOEJBQThCO1FBRWIsZ0RBQTJDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUUsSUFBSSxPQUFPLEVBQXdDLENBQ25ELENBQUE7UUFDUSwrQ0FBMEMsR0FDbEQsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLEtBQUssQ0FBQTtRQUV0QyxzQ0FBaUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsRSxJQUFJLE9BQU8sRUFBc0MsQ0FDakQsQ0FBQTtRQUNRLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUE7UUFFdkUsK0NBQTBDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0UsSUFBSSxPQUFPLEVBQThDLENBQ3pELENBQUE7UUFDUSw4Q0FBeUMsR0FDakQsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLEtBQUssQ0FBQTtRQUVyQyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7UUF1S2xFLFlBQVk7UUFFWiwwQkFBMEI7UUFFVCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFDOUUsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQXE2QzFELFlBQVk7UUFFWix1QkFBdUI7UUFFTiw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFvQixDQUFDLENBQUE7UUFFMUUsa0NBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0IsQ0FBQyxDQUFBO1FBQ3ZGLHFCQUFnQixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUEsQ0FBQyxvREFBb0Q7UUFFeEcscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUE7UUFDL0Qsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO1FBRXJDLG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBR3RDLENBQUE7UUFvSEgsWUFBWTtRQUVaLGlCQUFpQjtRQUVBLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQTtJQTd1RGpFLENBQUM7SUF1QkQsZ0JBQWdCLENBQUMsTUFBYyxFQUFFLFFBQTZCO1FBQzdELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxNQUFNLDBCQUEwQixDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUVELElBQUksQ0FBQywyQkFBMkIsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUV6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFakQsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsMkNBQTJDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUV4RiwrQkFBK0I7UUFDL0IsbUJBQW1CLENBQUMsR0FBRyxDQUN0QixRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUVoRixtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUV6Qyx1RUFBdUU7WUFDdkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxPQUFPLFFBQVEsQ0FBQyxlQUFlLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEQsbUJBQW1CLENBQUMsR0FBRyxDQUN0QixRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FDakYsQ0FBQTtRQUNGLENBQUM7UUFDRCxtQkFBbUIsQ0FBQyxHQUFHLENBQ3RCLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FDckMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUMxRSxDQUNELENBQUE7UUFFRCxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDekYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFNUIsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLE1BQWM7UUFDekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQWM7UUFDcEMsZ0ZBQWdGO1FBQ2hGLGdGQUFnRjtRQUNoRixNQUFNLE9BQU8sR0FBb0IsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUM7WUFDM0MsTUFBTTtZQUNOLElBQUksQ0FBQyxPQUFPO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFNLENBQUMscURBQXFEO1FBQzdELENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsbUVBQW1FO1FBQ25FLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQWE7UUFDcEMsa0VBQWtFO1FBQ2xFLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU1QyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFhO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxhQUFhLENBQUMsUUFBYSxFQUFFLFVBQTBDO1FBQ3RFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVuRCxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzNELE1BQU07WUFDTixZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7U0FDbkMsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRVMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFhO1FBQ3pDLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixRQUFRLENBQ1AsYUFBYSxFQUNiLHFFQUFxRSxFQUNyRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQy9CLGdEQUVELENBQUE7UUFDRixDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU1QyxrQkFBa0I7UUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sS0FBSyxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtZQUNwQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FDdkIsaUJBQWlCLEVBQ2pCLDBEQUEwRCxFQUMxRCxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ25CLENBQUE7WUFFRCxNQUFNLEtBQUssQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUM3QixRQUFhO1FBTWIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxELElBQ0MsK0JBQStCLENBQUMsUUFBUSxDQUFDO1lBQ3pDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztZQUNoQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsRUFDcEMsQ0FBQztZQUNGLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUNkLG1DQUFtQyxRQUFRLENBQUMsTUFBTSwySEFBMkgsQ0FDN0ssQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQzlCLFFBQWE7UUFLYixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbEQsSUFBSSwrQkFBK0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25GLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUNkLG1DQUFtQyxRQUFRLENBQUMsTUFBTSw0R0FBNEcsQ0FDOUosQ0FBQTtJQUNGLENBQUM7SUFlRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWEsRUFBRSxPQUE2QjtRQUN6RCxJQUFJLENBQUM7WUFDSixPQUFPLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsZ0VBQWdFO1lBQ2hFLElBQUksNkJBQTZCLENBQUMsS0FBSyxDQUFDLEtBQUssMkJBQTJCLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZGLE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUNQLG1CQUFtQixFQUNuQiwwQ0FBMEMsRUFDMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQiw2Q0FFRCxDQUFBO1lBQ0YsQ0FBQztZQUVELGtDQUFrQztZQUNsQyxNQUFNLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBT08sS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFhLEVBQUUsT0FBNkI7UUFDdkUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTlELE1BQU0sU0FBUyxHQUFHLE9BQU8sRUFBRSxTQUFTLENBQUE7UUFDcEMsTUFBTSw2QkFBNkIsR0FBRyxPQUFPLEVBQUUsNkJBQTZCLENBQUE7UUFDNUUsTUFBTSxlQUFlLEdBQUcsT0FBTyxFQUFFLGVBQWUsQ0FBQTtRQUVoRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFMUMsSUFBSSxJQUFpRCxDQUFBO1FBRXJELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FDckIsUUFBUSxFQUNSLFFBQVEsRUFDUixJQUFJLEVBQ0osU0FBUyxFQUNULENBQUMsQ0FBQyxlQUFlLEVBQ2pCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ2xCLDZDQUE2QztZQUM3QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0JBQ2xFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUN4QixJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztZQUVELGdDQUFnQztZQUNoQyxJQUNDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFlBQVksQ0FDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ2pCO29CQUNDLEtBQUssRUFBRSxJQUFJO29CQUNYLFFBQVEsRUFBRSxJQUFJO2lCQUNkLENBQUMsb0VBQW9FLENBQ3RFLENBQ0QsRUFDQSxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELDJDQUEyQztZQUMzQyxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksNkJBQTZCLEVBQUUsQ0FBQztnQkFDdkQsT0FBTyxRQUFRLEtBQUssQ0FBQyxDQUFBO1lBQ3RCLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQWtCTyxLQUFLLENBQUMsVUFBVSxDQUN2QixRQUE2QixFQUM3QixRQUFhLEVBQ2IsSUFBbUQsRUFDbkQsUUFBNEIsRUFDNUIsZUFBd0IsRUFDeEIsT0FBd0Q7UUFFeEQsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbkQsdUJBQXVCO1FBQ3ZCLE1BQU0sUUFBUSxHQUFjO1lBQzNCLFFBQVE7WUFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7WUFDdkMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUN6QyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQ25ELGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7WUFDekQsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixRQUFRLEVBQ1AsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO2dCQUMxRCxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVkscURBQTBDLENBQUM7WUFDekUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztZQUNoRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsRCxRQUFRLEVBQUUsU0FBUztTQUNuQixDQUFBO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksUUFBUSxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxlQUFlLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO29CQUNsQyxJQUFJLENBQUM7d0JBQ0osTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7d0JBQzdELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFBO3dCQUVqRixPQUFPLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FDM0IsUUFBUSxFQUNSLGFBQWEsRUFDYixTQUFTLEVBQ1QsT0FBTyxDQUFDLE1BQU0sRUFDZCxlQUFlLEVBQ2YsT0FBTyxDQUNQLENBQUE7b0JBQ0YsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFFNUIsT0FBTyxJQUFJLENBQUEsQ0FBQywyQ0FBMkM7b0JBQ3hELENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFFRCwwRkFBMEY7Z0JBQzFGLFFBQVEsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzlDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFFNUIsUUFBUSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUEsQ0FBQyxnRUFBZ0U7WUFDeEYsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBUUQsS0FBSyxDQUFDLFVBQVUsQ0FDZixTQUE2RDtRQUU3RCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQ3RCLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQztnQkFDSixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDeEYsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUU1QixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFhO1FBQ3ZCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFMUMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUNyQixRQUFRLEVBQ1IsUUFBUSxFQUNSLElBQUksRUFDSixTQUFTLEVBQ1QsSUFBSSxFQUNKLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FDN0MsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQWE7UUFDekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxELElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUxQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDZCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtJQUVaLDhCQUE4QjtJQUU5QixLQUFLLENBQUMsYUFBYSxDQUFDLFFBQWEsRUFBRSxPQUE0QjtRQUM5RCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQWEsRUFBRSxPQUE0QjtRQUM3RSxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzFELE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUNQLFlBQVksRUFDWixnRkFBZ0YsRUFDaEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixtREFFRCxPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FDZixRQUFhLEVBQ2IsMkJBRzRCLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQ25ELE9BQTRCO1FBRTVCLFdBQVc7UUFDWCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbEQsK0NBQStDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUV6RSxTQUFTO1FBQ1QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsZ0NBQXdCLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFOUYsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQ2QsUUFBYSxFQUNiLHdCQUE4RSxFQUM5RSxPQUEyQjtRQUUzQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQ2hELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUN0QyxRQUFRLENBQ1IsQ0FBQTtRQUNELE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRW5ELElBQUksZ0JBQWdCLEdBQUcsT0FBTyxDQUFBO1FBQzlCLElBQUksNEJBQTRCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUN6RSxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZFLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDekIsZ0JBQWdCLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQTtZQUMvRCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLDhEQUE4RDtZQUM5RCxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSx3Q0FBd0MsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUM1RixRQUFRLEVBQ1IsUUFBUSxFQUNSLHdCQUF3QixFQUN4QixnQkFBZ0IsQ0FDaEIsQ0FBQTtZQUVELDhCQUE4QjtZQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDOUQsQ0FBQztZQUVELDZFQUE2RTtZQUM3RSxnRkFBZ0Y7WUFDaEYsNkVBQTZFO1lBQzdFLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsQ0FBQztnQkFDL0Msd0NBQXdDLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQ3pFLFFBQVEsRUFDUix3QkFBd0IsQ0FDeEIsQ0FBQTtZQUNGLENBQUM7WUFFRCx5QkFBeUI7WUFDekIsSUFDQyxDQUFDLCtCQUErQixDQUFDLFFBQVEsQ0FBQyxJQUFJLGtDQUFrQztnQkFDaEYsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7b0JBQ2hDLHdDQUF3QyxZQUFZLFFBQVEsQ0FBQyxJQUFJLGdDQUFnQztnQkFDbEcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7b0JBQ2hDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQztvQkFDdEMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsbUVBQW1FO2NBQzdGLENBQUM7Z0JBQ0YsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQzNCLFFBQVEsRUFDUixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLHdDQUF3QyxDQUN4QyxDQUFBO1lBQ0YsQ0FBQztZQUVELHVCQUF1QjtpQkFDbEIsQ0FBQztnQkFDTCxNQUFNLElBQUksQ0FBQyxlQUFlLENBQ3pCLFFBQVEsRUFDUixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLHdDQUF3QyxZQUFZLFFBQVE7b0JBQzNELENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyx3Q0FBd0MsQ0FBQztvQkFDNUQsQ0FBQyxDQUFDLHdDQUF3QyxDQUMzQyxDQUFBO1lBQ0YsQ0FBQztZQUVELFNBQVM7WUFDVCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksa0JBQWtCLENBQUMsUUFBUSw4QkFBc0IsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUNQLFdBQVcsRUFDWCxrQ0FBa0MsRUFDbEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUMvQiw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FDL0MsRUFDRCxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFDNUIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQ2pDLFFBRXNELEVBQ3RELHdCQUE4RTtRQUk5RSxJQUFJLFVBSTZCLENBQUE7UUFDakMsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsd0JBQXdCLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN6RixJQUFJLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDaEQsTUFBTSxjQUFjLEdBQUcsTUFBTSxVQUFVLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BFLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMxQixVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLEdBQUcsY0FBYyxDQUFBO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFVBQVUsR0FBRyxZQUFZLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEYsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVSxHQUFHLHdCQUF3QixDQUFBO1FBQ3RDLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUM5QixRQUVzRCxFQUN0RCxRQUFhLEVBQ2Isd0JBQThFLEVBQzlFLE9BQTJCO1FBVTNCLDBCQUEwQjtRQUMxQixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQTtRQUNoQyxJQUFJLE1BQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksNERBQWlELENBQUMsRUFBRSxDQUFDO1lBQ3pGLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLDhCQUE4QixFQUM5QixtRUFBbUUsRUFDbkUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFBO1FBQ2hDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSw2REFBaUQsQ0FBQyxFQUFFLENBQUM7Z0JBQy9FLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLCtCQUErQixFQUMvQiw2RUFBNkUsRUFDN0UsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksdURBQStDLENBQUMsRUFBRSxDQUFDO2dCQUM3RSxNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsNEZBQTRGLEVBQzVGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDL0IsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1AseUJBQXlCLEVBQ3pCLDhEQUE4RCxFQUM5RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQy9CLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksSUFBSSxHQUFzQixTQUFTLENBQUE7UUFDdkMsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyx1QkFBdUI7UUFDbkQsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLHlEQUF5RCxFQUN6RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQy9CLGlEQUVELE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQztRQUVELDBCQUEwQjtRQUMxQixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTFDLCtGQUErRjtRQUMvRix3REFBd0Q7UUFDeEQsRUFBRTtRQUNGLGdHQUFnRztRQUNoRywyRUFBMkU7UUFDM0UsRUFBRTtRQUNGLCtGQUErRjtRQUMvRiw4RkFBOEY7UUFDOUYsK0ZBQStGO1FBQy9GLGtHQUFrRztRQUNsRywrRkFBK0Y7UUFDL0YseUVBQXlFO1FBQ3pFLEVBQUU7UUFDRiw2RkFBNkY7UUFDN0YsNEZBQTRGO1FBQzVGLHlGQUF5RjtRQUN6RixJQUFJLE1BS1EsQ0FBQTtRQUNaLElBQ0MsT0FBTyxPQUFPLEVBQUUsS0FBSyxLQUFLLFFBQVE7WUFDbEMsT0FBTyxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDaEMsT0FBTyxDQUFDLElBQUksS0FBSyxhQUFhO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRO1lBQzdCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUs7WUFDMUIsT0FBTyxDQUFDLElBQUk7Z0JBQ1gsSUFBSSxDQUFDO29CQUNKLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGtEQUFrRDtvQkFDdkUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2lCQUNmLENBQUMsRUFDRixDQUFDO1lBQ0YsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1lBQzVFLElBQUksTUFBTSxZQUFZLFFBQVEsSUFBSSxNQUFNLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxDQUFDO29CQUNKLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQ2hGLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUMxQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFBLENBQUMsNkNBQTZDO29CQUN0RSxDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsOENBQThDO2dCQUMvQyxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDLG1EQUVwRCxPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBUSxDQUNiLFFBQWEsRUFDYixPQUEwQixFQUMxQixLQUF5QjtRQUV6QixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV0RCxJQUFJLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLFFBR2tELEVBQ2xELFFBQWEsRUFDYixPQUEwQixFQUMxQixLQUF5QjtRQUV6QixPQUFPLElBQUksT0FBTyxDQUFlLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUN2QixRQUFRLEVBQ1IsS0FBSyxJQUFJLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDO29CQUNKLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDekUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNqQixDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxFQUNELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsY0FBYyxDQUN2QyxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FDdkIsUUFHa0QsRUFDbEQsUUFBYSxFQUNiLE9BQTBCLEVBQzFCLEtBQXlCO1FBRXpCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUN6QyxRQUFRLEVBQ1IsUUFBUSxFQUNSO1lBQ0MsR0FBRyxPQUFPO1lBQ1YsdURBQXVEO1lBQ3ZELHdEQUF3RDtZQUN4RCxxREFBcUQ7WUFDckQsbURBQW1EO1lBQ25ELHNCQUFzQjtZQUN0QixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLEVBQ0QsS0FBSyxDQUNMLENBQUE7UUFFRCxPQUFPO1lBQ04sR0FBRyxNQUFNO1lBQ1QsS0FBSyxFQUFFLE1BQU0sY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDekMsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUNuQixRQUFhLEVBQ2IsT0FBZ0MsRUFDaEMsS0FBeUI7UUFFekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdEQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDN0IsUUFHa0QsRUFDbEQsUUFBYSxFQUNiLE9BQW9GLEVBQ3BGLEtBQXlCO1FBRXpCLG1EQUFtRDtRQUNuRCxtREFBbUQ7UUFDbkQsbURBQW1EO1FBQ25ELG1EQUFtRDtRQUNuRCxFQUFFO1FBQ0Ysa0RBQWtEO1FBQ2xELHFEQUFxRDtRQUNyRCxzQ0FBc0M7UUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTVELElBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQTtRQUM3QixJQUFJLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDekYsZUFBZSxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFBO1FBQy9DLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQ3hFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQ2QsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNULGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUUvQixNQUFNLEtBQUssQ0FBQTtRQUNaLENBQUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxVQUFVLEdBQXVDLFNBQVMsQ0FBQTtRQUM5RCxJQUFJLENBQUM7WUFDSixpRUFBaUU7WUFDakUsZ0VBQWdFO1lBQ2hFLCtEQUErRDtZQUMvRCwrQkFBK0I7WUFDL0IsSUFBSSxPQUFPLGVBQWUsRUFBRSxJQUFJLEtBQUssUUFBUSxJQUFJLGVBQWUsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQ3pGLE1BQU0sV0FBVyxDQUFBO1lBQ2xCLENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsSUFDQyxDQUFDLGVBQWUsRUFBRSxNQUFNLElBQUksMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxxQ0FBcUM7Z0JBQzNHLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLHNDQUFzQztnQkFDL0gsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQywrQkFBK0I7Y0FDdEcsQ0FBQztnQkFDRixVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDMUUsQ0FBQztZQUVELDZEQUE2RDtpQkFDeEQsSUFBSSwyQkFBMkIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUNqQyxRQUFRLEVBQ1IsUUFBUSxFQUNSLGlCQUFpQixDQUFDLEtBQUssRUFDdkIsZUFBZSxDQUNmLENBQUE7WUFDRixDQUFDO1lBRUQsZ0JBQWdCO2lCQUNYLENBQUM7Z0JBQ0wsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FDakMsUUFBUSxFQUNSLFFBQVEsRUFDUixpQkFBaUIsQ0FBQyxLQUFLLEVBQ3ZCLGVBQWUsQ0FDZixDQUFBO1lBQ0YsQ0FBQztZQUVELFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDdkQsVUFBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUV6RCxNQUFNLFFBQVEsR0FBRyxNQUFNLFdBQVcsQ0FBQTtZQUVsQyxPQUFPO2dCQUNOLEdBQUcsUUFBUTtnQkFDWCxLQUFLLEVBQUUsVUFBVTthQUNqQixDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIseURBQXlEO1lBQ3pELGlEQUFpRDtZQUNqRCxzREFBc0Q7WUFDdEQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDaEMsQ0FBQztZQUVELHdEQUF3RDtZQUN4RCwrQ0FBK0M7WUFDL0MsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixLQUFZLEVBQ1osUUFBYSxFQUNiLE9BQWdDO1FBRWhDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FDdkIsVUFBVSxFQUNWLGlDQUFpQyxFQUNqQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQy9CLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUMvQyxDQUFBO1FBRUQsSUFBSSxLQUFLLFlBQVksa0NBQWtDLEVBQUUsQ0FBQztZQUN6RCxPQUFPLElBQUksa0NBQWtDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUVELElBQUksS0FBSyxZQUFZLDBCQUEwQixFQUFFLENBQUM7WUFDakQsT0FBTyxJQUFJLDBCQUEwQixDQUNwQyxPQUFPLEVBQ1AsS0FBSyxDQUFDLG1CQUFtQixFQUN6QixLQUFLLENBQUMsSUFBSSxFQUNWLEtBQUssQ0FBQyxPQUEyQixDQUNqQyxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDOUUsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixRQUF5RCxFQUN6RCxRQUFhLEVBQ2IsS0FBd0IsRUFDeEIsVUFBa0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFFckQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXBFLE9BQU8sU0FBUyxDQUNmLFVBQVUsRUFDVjtZQUNDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLFlBQVksUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkUsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUM7U0FDakUsRUFDRCxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FDL0IsQ0FBQTtJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsUUFBNkQsRUFDN0QsUUFBYSxFQUNiLEtBQXdCLEVBQ3hCLFVBQWtDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRXJELE1BQU0sTUFBTSxHQUFHLHdCQUF3QixFQUFFLENBQUE7UUFFekMsa0JBQWtCLENBQ2pCLFFBQVEsRUFDUixRQUFRLEVBQ1IsTUFBTSxFQUNOLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQ2Q7WUFDQyxHQUFHLE9BQU87WUFDVixVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDNUIsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztTQUM1RSxFQUNELEtBQUssQ0FDTCxDQUFBO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sa0JBQWtCLENBQ3pCLFFBRWtELEVBQ2xELFFBQWEsRUFDYixPQUFtRDtRQUVuRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUkzRTtRQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDWixJQUFJLENBQUM7Z0JBQ0osSUFBSSxNQUFrQixDQUFBO2dCQUN0QixJQUFJLE9BQU8sRUFBRSxNQUFNLElBQUksMkJBQTJCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDN0QsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzNDLENBQUM7Z0JBRUQsMEJBQTBCO2dCQUMxQixJQUFJLE9BQU8sT0FBTyxFQUFFLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDM0MsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO2dCQUVELHdCQUF3QjtnQkFDeEIsSUFBSSxPQUFPLE9BQU8sRUFBRSxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ3pDLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pDLENBQUM7Z0JBRUQscUNBQXFDO2dCQUNyQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBRWpFLHVCQUF1QjtnQkFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDakIsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFSixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLFFBQWEsRUFDYixPQUFnQztRQUVoQyxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFcEUsbUNBQW1DO1FBQ25DLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUNQLDBCQUEwQixFQUMxQix3REFBd0QsRUFDeEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixpREFFRCxPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7UUFFRCxxREFBcUQ7UUFDckQsSUFDQyxPQUFPLE9BQU8sRUFBRSxJQUFJLEtBQUssUUFBUTtZQUNqQyxPQUFPLENBQUMsSUFBSSxLQUFLLGFBQWE7WUFDOUIsT0FBTyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUN6QixDQUFDO1lBQ0YsTUFBTSxJQUFJLGtDQUFrQyxDQUMzQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUseUJBQXlCLENBQUMsRUFDM0QsSUFBSSxFQUNKLE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sc0JBQXNCLENBQzdCLFFBQWEsRUFDYixJQUFZLEVBQ1osT0FBZ0M7UUFFaEMsSUFBSSxPQUFPLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3RSxNQUFNLElBQUksMEJBQTBCLENBQ25DLFFBQVEsQ0FDUCxtQkFBbUIsRUFDbkIscURBQXFELEVBQ3JELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDL0IsOENBRUQsSUFBSSxFQUNKLE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosd0NBQXdDO0lBRXhDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBVyxFQUFFLE1BQVcsRUFBRSxTQUFtQjtRQUMxRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBVyxFQUFFLE1BQVcsRUFBRSxTQUFtQjtRQUMxRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQzFCLE1BQVcsRUFDWCxNQUFXLEVBQ1gsSUFBcUIsRUFDckIsU0FBbUI7UUFFbkIsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDO2dCQUNKLE1BQU0sY0FBYyxHQUNuQixJQUFJLEtBQUssTUFBTTtvQkFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDaEYsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN2QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQ3RELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUNwQyxNQUFNLENBQ04sQ0FBQTtnQkFFRCxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FDNUIsY0FBYyxFQUNkLE1BQU0sRUFDTixjQUFjLEVBQ2QsTUFBTSxFQUNOLElBQUksRUFDSixTQUFTLENBQ1QsQ0FBQTtZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFXLEVBQUUsTUFBVyxFQUFFLFNBQW1CO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FDdEQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQ3BDLE1BQU0sQ0FDTixDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUN0RCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFDcEMsTUFBTSxDQUNOLENBQUE7UUFFRCxPQUFPO1FBQ1AsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUNqQyxjQUFjLEVBQ2QsTUFBTSxFQUNOLGNBQWMsRUFDZCxNQUFNLEVBQ04sTUFBTSxFQUNOLENBQUMsQ0FBQyxTQUFTLENBQ1gsQ0FBQTtRQUVELDBCQUEwQjtRQUMxQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FDM0IsSUFBSSxrQkFBa0IsQ0FDckIsTUFBTSxFQUNOLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQyw0QkFBb0IsQ0FBQywyQkFBbUIsRUFDekQsUUFBUSxDQUNSLENBQ0QsQ0FBQTtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQVcsRUFBRSxNQUFXLEVBQUUsU0FBbUI7UUFDdkQsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUN0RCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFDcEMsTUFBTSxDQUNOLENBQUE7UUFFRCxPQUFPO1FBQ1AsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUNqQyxjQUFjLEVBQ2QsTUFBTSxFQUNOLGNBQWMsRUFDZCxNQUFNLEVBQ04sTUFBTSxFQUNOLENBQUMsQ0FBQyxTQUFTLENBQ1gsQ0FBQTtRQUVELDBCQUEwQjtRQUMxQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FDM0IsSUFBSSxrQkFBa0IsQ0FDckIsTUFBTSxFQUNOLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQyw0QkFBb0IsQ0FBQywyQkFBbUIsRUFDekQsUUFBUSxDQUNSLENBQ0QsQ0FBQTtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVSxDQUN2QixjQUFtQyxFQUNuQyxNQUFXLEVBQ1gsY0FBbUMsRUFDbkMsTUFBVyxFQUNYLElBQXFCLEVBQ3JCLFNBQWtCO1FBRWxCLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE9BQU8sSUFBSSxDQUFBLENBQUMsZ0VBQWdFO1FBQzdFLENBQUM7UUFFRCxhQUFhO1FBQ2IsTUFBTSxFQUFFLE1BQU0sRUFBRSxtQ0FBbUMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUNwRixjQUFjLEVBQ2QsTUFBTSxFQUNOLGNBQWMsRUFDZCxNQUFNLEVBQ04sSUFBSSxFQUNKLFNBQVMsQ0FDVCxDQUFBO1FBRUQsNEVBQTRFO1FBQzVFLElBQUksTUFBTSxJQUFJLENBQUMsbUNBQW1DLElBQUksU0FBUyxFQUFFLENBQUM7WUFDakUsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVoRyx3QkFBd0I7UUFDeEIsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDckIsOERBQThEO1lBQzlELElBQUksY0FBYyxLQUFLLGNBQWMsSUFBSSwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO2dCQUN0RixNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7WUFDekQsQ0FBQztZQUVELDBEQUEwRDtZQUMxRCx1REFBdUQ7aUJBQ2xELENBQUM7Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUM1RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN0RSxDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELHdCQUF3QjthQUNuQixDQUFDO1lBQ0wsaURBQWlEO1lBQ2pELElBQUksY0FBYyxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7Z0JBRTFELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELHNEQUFzRDtpQkFDakQsQ0FBQztnQkFDTCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDeEYsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUUzQyxPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVLENBQ3ZCLGNBQW1DLEVBQ25DLE1BQVcsRUFDWCxjQUFtQyxFQUNuQyxNQUFXO1FBRVgsK0NBQStDO1FBQy9DLElBQ0MsK0JBQStCLENBQUMsY0FBYyxDQUFDO1lBQy9DLCtCQUErQixDQUFDLGNBQWMsQ0FBQyxFQUM5QyxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFFRCxpREFBaUQ7UUFDakQsSUFBSSwrQkFBK0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQy9GLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7UUFFRCxpREFBaUQ7UUFDakQsSUFBSSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSwrQkFBK0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQy9GLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsSUFBSSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3RGLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdFLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVksQ0FDekIsY0FBbUMsRUFDbkMsWUFBdUIsRUFDdkIsY0FBbUMsRUFDbkMsWUFBaUI7UUFFakIsMEJBQTBCO1FBQzFCLE1BQU0sY0FBYyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUV4Qyw0QkFBNEI7UUFDNUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FDckIsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQ3pFLFlBQVksRUFDWixXQUFXLENBQUMsSUFBSSxDQUNoQixDQUFBO2dCQUNELElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUM3QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCLGNBQWMsRUFDZCxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUN4QyxjQUFjLEVBQ2QsV0FBVyxDQUNYLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FDckIsY0FBYyxFQUNkLFdBQVcsQ0FBQyxRQUFRLEVBQ3BCLGNBQWMsRUFDZCxXQUFXLENBQ1gsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUMvQixjQUFtQyxFQUNuQyxNQUFXLEVBQ1gsY0FBbUMsRUFDbkMsTUFBVyxFQUNYLElBQXFCLEVBQ3JCLFNBQW1CO1FBRW5CLElBQUksbUNBQW1DLEdBQUcsS0FBSyxDQUFBO1FBRS9DLG1GQUFtRjtRQUNuRixJQUFJLGNBQWMsS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN2QyxNQUFNLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUM5RSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDMUIsbUNBQW1DLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUVELElBQUksbUNBQW1DLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM1RCxNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCx3QkFBd0IsRUFDeEIscUhBQXFILEVBQ3JILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUM3QixDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLG1DQUFtQyxJQUFJLGNBQWMsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVGLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHdCQUF3QixFQUN4QixrRUFBa0UsRUFDbEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUM3QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQzdCLENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQseURBQXlEO1FBQ3pELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxJQUFJLE1BQU0sSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUM7WUFDcEQsOERBQThEO1lBQzlELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixRQUFRLENBQ1Asd0JBQXdCLEVBQ3hCLCtFQUErRSxFQUMvRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FDN0IsaURBRUQsQ0FBQTtZQUNGLENBQUM7WUFFRCwwRUFBMEU7WUFDMUUsMEVBQTBFO1lBQzFFLElBQUksY0FBYyxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDekQsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNwRCxNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCx3QkFBd0IsRUFDeEIsZ0dBQWdHLEVBQ2hHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUM3QixDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxtQ0FBbUMsRUFBRSxDQUFBO0lBQ3ZELENBQUM7SUFFTyxTQUFTLENBQUMsUUFBNkI7UUFJOUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFOUQsT0FBTztZQUNOLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFDbkUsbUJBQW1CO1NBQ25CLENBQUE7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsUUFBNkI7UUFDeEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSw4REFBbUQsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQWE7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUU5RixvQkFBb0I7UUFDcEIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVyQyxTQUFTO1FBQ1QsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLGdDQUF3QixRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRTlGLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQTZCLEVBQUUsU0FBYztRQUNqRSxNQUFNLG1CQUFtQixHQUFhLEVBQUUsQ0FBQTtRQUV4Qyw0QkFBNEI7UUFDNUIsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQztnQkFDSixNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1Asa0JBQWtCLEVBQ2xCLDBFQUEwRSxFQUMxRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQ2hDLENBQ0QsQ0FBQTtnQkFDRixDQUFDO2dCQUVELE1BQUssQ0FBQyw4Q0FBOEM7WUFDckQsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLHVEQUF1RDtnQkFDdkQsSUFBSSw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsS0FBSywyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDdkYsTUFBTSxLQUFLLENBQUE7Z0JBQ1osQ0FBQztnQkFFRCwyREFBMkQ7Z0JBQzNELG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7Z0JBRTVELGNBQWM7Z0JBQ2QsU0FBUyxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDOUMsQ0FBQztRQUNGLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxRCxTQUFTLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV0RSxJQUFJLENBQUM7Z0JBQ0osTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxLQUFLLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNyRix1REFBdUQ7b0JBQ3ZELDBEQUEwRDtvQkFDMUQsMERBQTBEO29CQUMxRCwyREFBMkQ7b0JBQzNELG1EQUFtRDtvQkFDbkQsMkRBQTJEO29CQUMzRCx5Q0FBeUM7b0JBQ3pDLDhEQUE4RDtvQkFDOUQsTUFBTSxLQUFLLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBYSxFQUFFLE9BQXFDO1FBQ25FLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLFFBQWEsRUFDYixPQUFxQztRQUVyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTlGLHlCQUF5QjtRQUN6QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQTtRQUNwQyxJQUFJLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksa0RBQXVDLENBQUMsRUFBRSxDQUFDO1lBQ2pGLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLDhCQUE4QixFQUM5Qiw2RUFBNkUsRUFDN0UsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxNQUFNLENBQUE7UUFDOUIsSUFBSSxNQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLDhEQUFrRCxDQUFDLEVBQUUsQ0FBQztZQUMxRixNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsOEVBQThFLEVBQzlFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDL0IsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksUUFBUSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQ2QsUUFBUSxDQUNQLHVDQUF1QyxFQUN2Qyx3RUFBd0UsRUFDeEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksSUFBSSxHQUFzQixTQUFTLENBQUE7UUFDdkMsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixnQkFBZ0I7UUFDakIsQ0FBQztRQUVELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixRQUFRLENBQ1Asc0JBQXNCLEVBQ3RCLHlDQUF5QyxFQUN6QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQy9CLDZDQUVELENBQUE7UUFDRixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDekMsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsRixNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCw0QkFBNEIsRUFDNUIsMENBQTBDLEVBQzFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDL0IsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFhLEVBQUUsT0FBcUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRS9ELElBQUksaUJBQWlCLEdBQUcsT0FBTyxDQUFBO1FBQy9CLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUMzRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3JFLElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDMUIsaUJBQWlCLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQTtZQUNqRSxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUE7UUFDOUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQTtRQUNoRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFBO1FBRWpELDBCQUEwQjtRQUMxQixNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBRWhFLFNBQVM7UUFDVCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksa0JBQWtCLENBQUMsUUFBUSwrQkFBdUIsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxZQUFZO0lBRVosb0JBQW9CO0lBRXBCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBVyxFQUFFLE1BQVc7UUFDdkMsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FDdEQsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQ3BDLE1BQU0sQ0FDTixDQUFBO1FBRUQsSUFDQyxjQUFjLEtBQUssY0FBYztZQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUNwRSxDQUFDO1lBQ0YsT0FBTSxDQUFDLGtDQUFrQztRQUMxQyxDQUFDO1FBRUQsaUVBQWlFO1FBQ2pFLElBQUksY0FBYyxLQUFLLGNBQWMsSUFBSSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ2pGLE9BQU8sY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSxtRUFBbUU7UUFDbkUsc0NBQXNDO1FBRXRDLHdCQUF3QjtRQUN4QixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRWhHLGlFQUFpRTtRQUNqRSw0Q0FBNEM7UUFDNUMsSUFBSSxjQUFjLEtBQUssY0FBYyxJQUFJLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEYsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FDOUIsTUFBTSxFQUNOLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUM5RCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FDN0MsQ0FBQTtRQUNGLENBQUM7UUFFRCw2REFBNkQ7UUFDN0QsK0RBQStEO1FBQy9ELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQzlCLE1BQU0sRUFDTixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FDN0MsQ0FBQTtJQUNGLENBQUM7YUFtQmMsNEJBQXVCLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFFMUMsYUFBYSxDQUNaLFFBQWEsRUFDYixPQUErRDtRQUUvRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQzNCLEdBQUcsT0FBTztZQUNWLHFFQUFxRTtZQUNyRSxtRUFBbUU7WUFDbkUsNkNBQTZDO1lBQzdDLGFBQWEsRUFBRSxhQUFXLENBQUMsdUJBQXVCLEVBQUU7U0FDcEQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUlELEtBQUssQ0FDSixRQUFhLEVBQ2IsVUFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7UUFFM0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6Qyw0REFBNEQ7UUFDNUQsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLElBQUksWUFBWSxHQUFHLEdBQUcsRUFBRTtZQUN2QixhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLENBQUMsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FJbEQ7UUFBQSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDO2dCQUNKLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ3hELElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDcEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFSiwwREFBMEQ7UUFDMUQsNkRBQTZEO1FBQzdELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDM0MsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN2QyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQTtZQUMxRSxXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDekMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxNQUFNLE9BQU8sR0FBdUI7Z0JBQ25DLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO2dCQUNwQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRTthQUNwQyxDQUFBO1lBRUQsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBYSxFQUFFLE9BQXNCO1FBQzFELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsRCx1Q0FBdUM7UUFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztZQUNsRSxPQUFPO1NBQ1AsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHO2dCQUNULEtBQUssRUFBRSxDQUFDO2dCQUNSLFVBQVUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7YUFDN0MsQ0FBQTtZQUVELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFBO1FBRWxCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLFFBQVE7Z0JBQ1IsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUVmLHlDQUF5QztnQkFDekMsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO29CQUMzQixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRWYsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDL0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBUU8sS0FBSyxDQUFDLGVBQWUsQ0FDNUIsUUFBNkQsRUFDN0QsUUFBYSxFQUNiLE9BQXNDLEVBQ3RDLGdDQUdpQztRQUVqQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUM5QixRQUFRLEVBQ1IsS0FBSyxJQUFJLEVBQUU7WUFDVixjQUFjO1lBQ2QsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDNUMsTUFBTSxFQUFFLElBQUk7Z0JBQ1osTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksS0FBSzthQUNoQyxDQUFDLENBQUE7WUFFRixrRUFBa0U7WUFDbEUsSUFBSSxDQUFDO2dCQUNKLElBQ0MsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUM7b0JBQ2xELHdCQUF3QixDQUFDLGdDQUFnQyxDQUFDLEVBQ3pELENBQUM7b0JBQ0YsTUFBTSxJQUFJLENBQUMsMkJBQTJCLENBQ3JDLFFBQVEsRUFDUixNQUFNLEVBQ04sZ0NBQWdDLENBQ2hDLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUN2QyxRQUFRLEVBQ1IsTUFBTSxFQUNOLGdDQUFnQyxDQUNoQyxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzQyxDQUFDO29CQUFTLENBQUM7Z0JBQ1Ysc0JBQXNCO2dCQUN0QixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsRUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCLENBQ3hDLFFBQTZELEVBQzdELE1BQWMsRUFDZCxzQkFBK0U7UUFFL0UsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLElBQUksTUFBOEIsQ0FBQTtRQUVsQyx1REFBdUQ7UUFDdkQsbURBQW1EO1FBQ25ELElBQUksd0JBQXdCLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO1lBQ3RELElBQUksc0JBQXNCLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUQsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUVqRixTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQTtZQUM5QixDQUFDO1lBRUQsZ0RBQWdEO1lBQ2hELElBQUksc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxHQUFHLHNCQUFzQixDQUFDLE1BQU0sQ0FBQTtRQUN2QyxDQUFDO1FBRUQsc0NBQXNDO2FBQ2pDLENBQUM7WUFDTCxNQUFNLEdBQUcsc0JBQXNCLENBQUE7UUFDaEMsQ0FBQztRQUVELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDdEMsWUFBWSxDQUFDLE1BQU0sRUFBRTtnQkFDcEIsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDdkIsZ0RBQWdEO29CQUNoRCxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBRWQsSUFBSSxDQUFDO3dCQUNKLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDbEYsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDckIsQ0FBQztvQkFFRCxTQUFTLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQTtvQkFFN0Isc0RBQXNEO29CQUN0RCxzREFBc0Q7b0JBQ3RELHNEQUFzRDtvQkFDdEQsa0NBQWtDO29CQUNsQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNqQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFO2FBQ3RCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyw2QkFBNkIsQ0FDMUMsUUFBNkQsRUFDN0QsTUFBYyxFQUNkLFFBQTBCO1FBRTFCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUVqQixJQUFJLEtBQXNCLENBQUE7UUFDMUIsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFakYsU0FBUyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYSxDQUMxQixRQUE2RCxFQUM3RCxNQUFjLEVBQ2QsTUFBZ0IsRUFDaEIsTUFBYyxFQUNkLFNBQWlCLEVBQ2pCLFdBQW1CO1FBRW5CLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLE9BQU8saUJBQWlCLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDbkMsNkJBQTZCO1lBQzdCLE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FDeEMsTUFBTSxFQUNOLFNBQVMsR0FBRyxpQkFBaUIsRUFDN0IsTUFBTSxDQUFDLE1BQU0sRUFDYixXQUFXLEdBQUcsaUJBQWlCLEVBQy9CLE1BQU0sR0FBRyxpQkFBaUIsQ0FDMUIsQ0FBQTtZQUNELGlCQUFpQixJQUFJLFlBQVksQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FDOUIsUUFBd0QsRUFDeEQsUUFBYSxFQUNiLE9BQXNDLEVBQ3RDLHdDQUlpQztRQUVqQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUM5QixRQUFRLEVBQ1IsR0FBRyxFQUFFLENBQ0osSUFBSSxDQUFDLHVCQUF1QixDQUMzQixRQUFRLEVBQ1IsUUFBUSxFQUNSLE9BQU8sRUFDUCx3Q0FBd0MsQ0FDeEMsRUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsdUJBQXVCLENBQ3BDLFFBQXdELEVBQ3hELFFBQWEsRUFDYixPQUFzQyxFQUN0Qyx3Q0FJaUM7UUFFakMsSUFBSSxNQUFnQixDQUFBO1FBQ3BCLElBQUksd0NBQXdDLFlBQVksUUFBUSxFQUFFLENBQUM7WUFDbEUsTUFBTSxHQUFHLHdDQUF3QyxDQUFBO1FBQ2xELENBQUM7YUFBTSxJQUFJLGdCQUFnQixDQUFDLHdDQUF3QyxDQUFDLEVBQUUsQ0FBQztZQUN2RSxNQUFNLEdBQUcsTUFBTSxjQUFjLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUN4RSxDQUFDO2FBQU0sSUFBSSx3QkFBd0IsQ0FBQyx3Q0FBd0MsQ0FBQyxFQUFFLENBQUM7WUFDL0UsTUFBTSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUNoRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFBO1FBQ3BFLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ2pELE1BQU0sRUFBRSxJQUFJO1lBQ1osU0FBUyxFQUFFLElBQUk7WUFDZixNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxLQUFLO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLEtBQUs7U0FDaEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjLENBQzNCLGNBQW1FLEVBQ25FLE1BQVcsRUFDWCxjQUFtRSxFQUNuRSxNQUFXO1FBRVgsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FDOUIsTUFBTSxFQUNOLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxjQUFjLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUNqQyxjQUFtRSxFQUNuRSxNQUFXLEVBQ1gsY0FBbUUsRUFDbkUsTUFBVztRQUVYLElBQUksWUFBWSxHQUF1QixTQUFTLENBQUE7UUFDaEQsSUFBSSxZQUFZLEdBQXVCLFNBQVMsQ0FBQTtRQUVoRCxJQUFJLENBQUM7WUFDSixlQUFlO1lBQ2YsWUFBWSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNuRSxZQUFZLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFFakYsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7WUFFL0MsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1lBQ2pCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNuQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7WUFDakIsR0FBRyxDQUFDO2dCQUNILDBGQUEwRjtnQkFDMUYsa0ZBQWtGO2dCQUNsRixTQUFTLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUNwQyxZQUFZLEVBQ1osU0FBUyxFQUNULE1BQU0sQ0FBQyxNQUFNLEVBQ2IsV0FBVyxFQUNYLE1BQU0sQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUMvQixDQUFBO2dCQUVELDJGQUEyRjtnQkFDM0YsK0RBQStEO2dCQUMvRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQ3ZCLGNBQWMsRUFDZCxZQUFZLEVBQ1osTUFBTSxFQUNOLFNBQVMsRUFDVCxTQUFTLEVBQ1QsV0FBVyxDQUNYLENBQUE7Z0JBRUQsU0FBUyxJQUFJLFNBQVMsQ0FBQTtnQkFDdEIsV0FBVyxJQUFJLFNBQVMsQ0FBQTtnQkFFeEIscURBQXFEO2dCQUNyRCxJQUFJLFdBQVcsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ3ZDLFdBQVcsR0FBRyxDQUFDLENBQUE7Z0JBQ2hCLENBQUM7WUFDRixDQUFDLFFBQVEsU0FBUyxHQUFHLENBQUMsRUFBQztRQUN4QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDdEIsT0FBTyxZQUFZLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUN6RixPQUFPLFlBQVksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7YUFDekYsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLGNBQThELEVBQzlELE1BQVcsRUFDWCxjQUE4RCxFQUM5RCxNQUFXO1FBRVgsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FDOUIsTUFBTSxFQUNOLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxjQUFjLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQixDQUNuQyxjQUE4RCxFQUM5RCxNQUFXLEVBQ1gsY0FBOEQsRUFDOUQsTUFBVztRQUVYLE9BQU8sY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzlFLE1BQU0sRUFBRSxJQUFJO1lBQ1osU0FBUyxFQUFFLElBQUk7WUFDZixNQUFNLEVBQUUsS0FBSztZQUNiLE1BQU0sRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FDdkMsY0FBOEQsRUFDOUQsTUFBVyxFQUNYLGNBQW1FLEVBQ25FLE1BQVc7UUFFWCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUM5QixNQUFNLEVBQ04sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUMzRixJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGNBQWMsQ0FDN0MsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsZ0NBQWdDLENBQzdDLGNBQThELEVBQzlELE1BQVcsRUFDWCxjQUFtRSxFQUNuRSxNQUFXO1FBRVgsY0FBYztRQUNkLE1BQU0sWUFBWSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXZGLG9EQUFvRDtRQUNwRCxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDcEQsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUN2QixjQUFjLEVBQ2QsWUFBWSxFQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQ3JCLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sNkJBQTZCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0MsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsTUFBTSxjQUFjLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQixDQUN2QyxjQUFtRSxFQUNuRSxNQUFXLEVBQ1gsY0FBOEQsRUFDOUQsTUFBVztRQUVYLGtDQUFrQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FDbEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQ3JFLENBQUE7UUFFRCxtQ0FBbUM7UUFDbkMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVTLDJCQUEyQixDQUNwQyxRQUFXLEVBQ1gsUUFBYTtRQUViLElBQUksUUFBUSxDQUFDLFlBQVkscURBQTBDLEVBQUUsQ0FBQztZQUNyRSxNQUFNLElBQUksa0JBQWtCLENBQzNCLFFBQVEsQ0FDUCxjQUFjLEVBQ2QsdUNBQXVDLEVBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDL0IscURBRUQsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRU8scUJBQXFCLENBQUMsUUFBYSxFQUFFLElBQVc7UUFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsUUFBUSxDQUNQLGNBQWMsRUFDZCx1Q0FBdUMsRUFDdkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixxREFFRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxRQUFhO1FBQ3JDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0IsQ0FBQzs7QUExbkVXLFdBQVc7SUFRVixXQUFBLFdBQVcsQ0FBQTtHQVJaLFdBQVcsQ0E2bkV2QiJ9