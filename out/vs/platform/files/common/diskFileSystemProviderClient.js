/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { canceled } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { newWriteableStream, } from '../../../base/common/stream.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, } from './files.js';
import { reviveFileChanges } from './watcher.js';
export const LOCAL_FILE_SYSTEM_CHANNEL_NAME = 'localFilesystem';
/**
 * An implementation of a local disk file system provider
 * that is backed by a `IChannel` and thus implemented via
 * IPC on a different process.
 */
export class DiskFileSystemProviderClient extends Disposable {
    constructor(channel, extraCapabilities) {
        super();
        this.channel = channel;
        this.extraCapabilities = extraCapabilities;
        //#region File Capabilities
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Watching
        this._onDidChange = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChange.event;
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        // The contract for file watching via remote is to identify us
        // via a unique but readonly session ID. Since the remote is
        // managing potentially many watchers from different clients,
        // this helps the server to properly partition events to the right
        // clients.
        this.sessionId = generateUuid();
        this.registerFileChangeListeners();
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
            if (this.extraCapabilities.pathCaseSensitive) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
            if (this.extraCapabilities.trash) {
                this._capabilities |= 4096 /* FileSystemProviderCapabilities.Trash */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    //#region File Metadata Resolving
    stat(resource) {
        return this.channel.call('stat', [resource]);
    }
    readdir(resource) {
        return this.channel.call('readdir', [resource]);
    }
    //#endregion
    //#region File Reading/Writing
    async readFile(resource, opts) {
        const { buffer } = (await this.channel.call('readFile', [resource, opts]));
        return buffer;
    }
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream((data) => VSBuffer.concat(data.map((data) => VSBuffer.wrap(data))).buffer);
        const disposables = new DisposableStore();
        // Reading as file stream goes through an event to the remote side
        disposables.add(this.channel.listen('readFileStream', [resource, opts])((dataOrErrorOrEnd) => {
            // data
            if (dataOrErrorOrEnd instanceof VSBuffer) {
                stream.write(dataOrErrorOrEnd.buffer);
            }
            // end or error
            else {
                if (dataOrErrorOrEnd === 'end') {
                    stream.end();
                }
                else {
                    let error;
                    // Take Error as is if type matches
                    if (dataOrErrorOrEnd instanceof Error) {
                        error = dataOrErrorOrEnd;
                    }
                    // Otherwise, try to deserialize into an error.
                    // Since we communicate via IPC, we cannot be sure
                    // that Error objects are properly serialized.
                    else {
                        const errorCandidate = dataOrErrorOrEnd;
                        error = createFileSystemProviderError(errorCandidate.message ?? toErrorMessage(errorCandidate), errorCandidate.code ?? FileSystemProviderErrorCode.Unknown);
                    }
                    stream.error(error);
                    stream.end();
                }
                // Signal to the remote side that we no longer listen
                disposables.dispose();
            }
        }));
        // Support cancellation
        disposables.add(token.onCancellationRequested(() => {
            // Ensure to end the stream properly with an error
            // to indicate the cancellation.
            stream.error(canceled());
            stream.end();
            // Ensure to dispose the listener upon cancellation. This will
            // bubble through the remote side as event and allows to stop
            // reading the file.
            disposables.dispose();
        }));
        return stream;
    }
    writeFile(resource, content, opts) {
        return this.channel.call('writeFile', [resource, VSBuffer.wrap(content), opts]);
    }
    open(resource, opts) {
        return this.channel.call('open', [resource, opts]);
    }
    close(fd) {
        return this.channel.call('close', [fd]);
    }
    async read(fd, pos, data, offset, length) {
        const [bytes, bytesRead] = await this.channel.call('read', [
            fd,
            pos,
            length,
        ]);
        // copy back the data that was written into the buffer on the remote
        // side. we need to do this because buffers are not referenced by
        // pointer, but only by value and as such cannot be directly written
        // to from the other process.
        data.set(bytes.buffer.slice(0, bytesRead), offset);
        return bytesRead;
    }
    write(fd, pos, data, offset, length) {
        return this.channel.call('write', [fd, pos, VSBuffer.wrap(data), offset, length]);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(resource) {
        return this.channel.call('mkdir', [resource]);
    }
    delete(resource, opts) {
        return this.channel.call('delete', [resource, opts]);
    }
    rename(resource, target, opts) {
        return this.channel.call('rename', [resource, target, opts]);
    }
    copy(resource, target, opts) {
        return this.channel.call('copy', [resource, target, opts]);
    }
    //#endregion
    //#region Clone File
    cloneFile(resource, target) {
        return this.channel.call('cloneFile', [resource, target]);
    }
    registerFileChangeListeners() {
        // The contract for file changes is that there is one listener
        // for both events and errors from the watcher. So we need to
        // unwrap the event from the remote and emit through the proper
        // emitter.
        this._register(this.channel.listen('fileChange', [this.sessionId])((eventsOrError) => {
            if (Array.isArray(eventsOrError)) {
                const events = eventsOrError;
                this._onDidChange.fire(reviveFileChanges(events));
            }
            else {
                const error = eventsOrError;
                this._onDidWatchError.fire(error);
            }
        }));
    }
    watch(resource, opts) {
        // Generate a request UUID to correlate the watcher
        // back to us when we ask to dispose the watcher later.
        const req = generateUuid();
        this.channel.call('watch', [this.sessionId, req, resource, opts]);
        return toDisposable(() => this.channel.call('unwatch', [this.sessionId, req]));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXJDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNELE9BQU8sRUFDTiw2QkFBNkIsRUFPN0IsMkJBQTJCLEdBYTNCLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVoRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxpQkFBaUIsQ0FBQTtBQUUvRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLDRCQUNaLFNBQVEsVUFBVTtJQVNsQixZQUNrQixPQUFpQixFQUNqQixpQkFBbUU7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFIVSxZQUFPLEdBQVAsT0FBTyxDQUFVO1FBQ2pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBa0Q7UUFPckYsMkJBQTJCO1FBRWxCLDRCQUF1QixHQUFnQixLQUFLLENB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