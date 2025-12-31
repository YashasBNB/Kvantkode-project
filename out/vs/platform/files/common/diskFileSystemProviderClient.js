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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi9kaXNrRmlsZVN5c3RlbVByb3ZpZGVyQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sNkJBQTZCLEVBTzdCLDJCQUEyQixHQWEzQixNQUFNLFlBQVksQ0FBQTtBQUNuQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFaEQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsaUJBQWlCLENBQUE7QUFFL0Q7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyw0QkFDWixTQUFRLFVBQVU7SUFTbEIsWUFDa0IsT0FBaUIsRUFDakIsaUJBQW1FO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSFUsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUNqQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQWtEO1FBT3JGLDJCQUEyQjtRQUVsQiw0QkFBdUIsR0FBZ0IsS0FBSyxDQUFDLElB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