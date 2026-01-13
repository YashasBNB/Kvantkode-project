/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DiskFileSystemProvider } from './diskFileSystemProvider.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { listenStream } from '../../../base/common/stream.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
/**
 * A server implementation for a IPC based file system provider client.
 */
export class AbstractDiskFileSystemProviderChannel extends Disposable {
    constructor(provider, logService) {
        super();
        this.provider = provider;
        this.logService = logService;
        //#endregion
        //#region File Watching
        this.sessionToWatcher = new Map();
        this.watchRequests = new Map();
    }
    call(ctx, command, arg) {
        const uriTransformer = this.getUriTransformer(ctx);
        switch (command) {
            case 'stat':
                return this.stat(uriTransformer, arg[0]);
            case 'readdir':
                return this.readdir(uriTransformer, arg[0]);
            case 'open':
                return this.open(uriTransformer, arg[0], arg[1]);
            case 'close':
                return this.close(arg[0]);
            case 'read':
                return this.read(arg[0], arg[1], arg[2]);
            case 'readFile':
                return this.readFile(uriTransformer, arg[0], arg[1]);
            case 'write':
                return this.write(arg[0], arg[1], arg[2], arg[3], arg[4]);
            case 'writeFile':
                return this.writeFile(uriTransformer, arg[0], arg[1], arg[2]);
            case 'rename':
                return this.rename(uriTransformer, arg[0], arg[1], arg[2]);
            case 'copy':
                return this.copy(uriTransformer, arg[0], arg[1], arg[2]);
            case 'cloneFile':
                return this.cloneFile(uriTransformer, arg[0], arg[1]);
            case 'mkdir':
                return this.mkdir(uriTransformer, arg[0]);
            case 'delete':
                return this.delete(uriTransformer, arg[0], arg[1]);
            case 'watch':
                return this.watch(uriTransformer, arg[0], arg[1], arg[2], arg[3]);
            case 'unwatch':
                return this.unwatch(arg[0], arg[1]);
        }
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(ctx, event, arg) {
        const uriTransformer = this.getUriTransformer(ctx);
        switch (event) {
            case 'fileChange':
                return this.onFileChange(uriTransformer, arg[0]);
            case 'readFileStream':
                return this.onReadFileStream(uriTransformer, arg[0], arg[1]);
        }
        throw new Error(`Unknown event ${event}`);
    }
    //#region File Metadata Resolving
    stat(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        return this.provider.stat(resource);
    }
    readdir(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.readdir(resource);
    }
    //#endregion
    //#region File Reading/Writing
    async readFile(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        const buffer = await this.provider.readFile(resource, opts);
        return VSBuffer.wrap(buffer);
    }
    onReadFileStream(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        const cts = new CancellationTokenSource();
        const emitter = new Emitter({
            onDidRemoveLastListener: () => {
                // Ensure to cancel the read operation when there is no more
                // listener on the other side to prevent unneeded work.
                cts.cancel();
            },
        });
        const fileStream = this.provider.readFileStream(resource, opts, cts.token);
        listenStream(fileStream, {
            onData: (chunk) => emitter.fire(VSBuffer.wrap(chunk)),
            onError: (error) => emitter.fire(error),
            onEnd: () => {
                // Forward event
                emitter.fire('end');
                // Cleanup
                emitter.dispose();
                cts.dispose();
            },
        });
        return emitter.event;
    }
    writeFile(uriTransformer, _resource, content, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.writeFile(resource, content.buffer, opts);
    }
    open(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        return this.provider.open(resource, opts);
    }
    close(fd) {
        return this.provider.close(fd);
    }
    async read(fd, pos, length) {
        const buffer = VSBuffer.alloc(length);
        const bufferOffset = 0; // offset is 0 because we create a buffer to read into for each call
        const bytesRead = await this.provider.read(fd, pos, buffer.buffer, bufferOffset, length);
        return [buffer, bytesRead];
    }
    write(fd, pos, data, offset, length) {
        return this.provider.write(fd, pos, data.buffer, offset, length);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.mkdir(resource);
    }
    delete(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.delete(resource, opts);
    }
    rename(uriTransformer, _source, _target, opts) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.rename(source, target, opts);
    }
    copy(uriTransformer, _source, _target, opts) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.copy(source, target, opts);
    }
    //#endregion
    //#region Clone File
    cloneFile(uriTransformer, _source, _target) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.cloneFile(source, target);
    }
    onFileChange(uriTransformer, sessionId) {
        // We want a specific emitter for the given session so that events
        // from the one session do not end up on the other session. As such
        // we create a `SessionFileWatcher` and a `Emitter` for that session.
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                this.sessionToWatcher.set(sessionId, this.createSessionFileWatcher(uriTransformer, emitter));
            },
            onDidRemoveLastListener: () => {
                dispose(this.sessionToWatcher.get(sessionId));
                this.sessionToWatcher.delete(sessionId);
            },
        });
        return emitter.event;
    }
    async watch(uriTransformer, sessionId, req, _resource, opts) {
        const watcher = this.sessionToWatcher.get(sessionId);
        if (watcher) {
            const resource = this.transformIncoming(uriTransformer, _resource);
            const disposable = watcher.watch(req, resource, opts);
            this.watchRequests.set(sessionId + req, disposable);
        }
    }
    async unwatch(sessionId, req) {
        const id = sessionId + req;
        const disposable = this.watchRequests.get(id);
        if (disposable) {
            dispose(disposable);
            this.watchRequests.delete(id);
        }
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, disposable] of this.watchRequests) {
            disposable.dispose();
        }
        this.watchRequests.clear();
        for (const [, disposable] of this.sessionToWatcher) {
            disposable.dispose();
        }
        this.sessionToWatcher.clear();
    }
}
export class AbstractSessionFileWatcher extends Disposable {
    constructor(uriTransformer, sessionEmitter, logService, environmentService) {
        super();
        this.uriTransformer = uriTransformer;
        this.environmentService = environmentService;
        this.watcherRequests = new Map();
        this.fileWatcher = this._register(new DiskFileSystemProvider(logService));
        this.registerListeners(sessionEmitter);
    }
    registerListeners(sessionEmitter) {
        const localChangeEmitter = this._register(new Emitter());
        this._register(localChangeEmitter.event((events) => {
            sessionEmitter.fire(events.map((e) => ({
                resource: this.uriTransformer.transformOutgoingURI(e.resource),
                type: e.type,
                cId: e.cId,
            })));
        }));
        this._register(this.fileWatcher.onDidChangeFile((events) => localChangeEmitter.fire(events)));
        this._register(this.fileWatcher.onDidWatchError((error) => sessionEmitter.fire(error)));
    }
    getRecursiveWatcherOptions(environmentService) {
        return undefined; // subclasses can override
    }
    getExtraExcludes(environmentService) {
        return undefined; // subclasses can override
    }
    watch(req, resource, opts) {
        const extraExcludes = this.getExtraExcludes(this.environmentService);
        if (Array.isArray(extraExcludes)) {
            opts.excludes = [...opts.excludes, ...extraExcludes];
        }
        this.watcherRequests.set(req, this.fileWatcher.watch(resource, opts));
        return toDisposable(() => {
            dispose(this.watcherRequests.get(req));
            this.watcherRequests.delete(req);
        });
    }
    dispose() {
        for (const [, disposable] of this.watcherRequests) {
            disposable.dispose();
        }
        this.watcherRequests.clear();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS9kaXNrRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUlsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUE4QixZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQWF6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVE5RTs7R0FFRztBQUNILE1BQU0sT0FBZ0IscUNBQ3JCLFNBQVEsVUFBVTtJQUdsQixZQUNvQixRQUFnQyxFQUNoQyxVQUF1QjtRQUUxQyxLQUFLLEVBQUUsQ0FBQTtRQUhZLGFBQVEsR0FBUixRQUFRLENBQXdCO1FBQ2hDLGVBQVUsR0FBVixVQUFVLENBQWE7UUF3TzNDLFlBQVk7UUFFWix1QkFBdUI7UUFFTixxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQTtRQUMxRSxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFBO0lBMU83RixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQU0sRUFBRSxPQUFlLEVBQUUsR0FBUztRQUN0QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFbEQsUUFBUSxPQUFP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