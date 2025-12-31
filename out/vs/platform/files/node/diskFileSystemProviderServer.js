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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBOEIsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFhekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFROUU7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLHFDQUNyQixTQUFRLFVBQVU7SUFHbEIsWUFDb0IsUUFBZ0MsRUFDaEMsVUFBdUI7UUFFMUMsS0FBSyxFQUFFLENBQUE7UUFIWSxhQUFRLEdBQVIsUUFBUSxDQUF3QjtRQUNoQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBd08zQyxZQUFZO1FBRVosdUJBQXVCO1FBRU4scUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWdELENBQUE7UUFDMUUsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBcUQsQ0FBQTtJQTFPN0YsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFNLEVBQUUsT0FBZSxFQUFFLEdBQVM7UUFDdEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWxELFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxN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