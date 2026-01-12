/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { insert } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { removeTrailingPathSeparator } from '../../../base/common/extpath.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { normalize } from '../../../base/common/path.js';
import { isRecursiveWatchRequest, reviveFileChanges, } from './watcher.js';
import { LogLevel } from '../../log/common/log.js';
export class AbstractDiskFileSystemProvider extends Disposable {
    constructor(logService, options) {
        super();
        this.logService = logService;
        this.options = options;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        this.universalWatchRequests = [];
        this.universalWatchRequestDelayer = this._register(new ThrottledDelayer(0));
        this.nonRecursiveWatchRequests = [];
        this.nonRecursiveWatchRequestDelayer = this._register(new ThrottledDelayer(0));
    }
    watch(resource, opts) {
        if (opts.recursive || this.options?.watcher?.forceUniversal) {
            return this.watchUniversal(resource, opts);
        }
        return this.watchNonRecursive(resource, opts);
    }
    watchUniversal(resource, opts) {
        const request = this.toWatchRequest(resource, opts);
        const remove = insert(this.universalWatchRequests, request);
        // Trigger update
        this.refreshUniversalWatchers();
        return toDisposable(() => {
            // Remove from list of paths to watch universally
            remove();
            // Trigger update
            this.refreshUniversalWatchers();
        });
    }
    toWatchRequest(resource, opts) {
        const request = {
            path: this.toWatchPath(resource),
            excludes: opts.excludes,
            includes: opts.includes,
            recursive: opts.recursive,
            filter: opts.filter,
            correlationId: opts.correlationId,
        };
        if (isRecursiveWatchRequest(request)) {
            // Adjust for polling
            const usePolling = this.options?.watcher?.recursive?.usePolling;
            if (usePolling === true) {
                request.pollingInterval = this.options?.watcher?.recursive?.pollingInterval ?? 5000;
            }
            else if (Array.isArray(usePolling)) {
                if (usePolling.includes(request.path)) {
                    request.pollingInterval = this.options?.watcher?.recursive?.pollingInterval ?? 5000;
                }
            }
        }
        return request;
    }
    refreshUniversalWatchers() {
        // Buffer requests for universal watching to decide on right watcher
        // that supports potentially watching more than one path at once
        this.universalWatchRequestDelayer
            .trigger(() => {
            return this.doRefreshUniversalWatchers();
        })
            .catch((error) => onUnexpectedError(error));
    }
    doRefreshUniversalWatchers() {
        // Create watcher if this is the first time
        if (!this.universalWatcher) {
            this.universalWatcher = this._register(this.createUniversalWatcher((changes) => this._onDidChangeFile.fire(reviveFileChanges(changes)), (msg) => this.onWatcherLogMessage(msg), this.logService.getLevel() === LogLevel.Trace));
            // Apply log levels dynamically
            this._register(this.logService.onDidChangeLogLevel(() => {
                this.universalWatcher?.setVerboseLogging(this.logService.getLevel() === LogLevel.Trace);
            }));
        }
        // Ask to watch the provided paths
        return this.universalWatcher.watch(this.universalWatchRequests);
    }
    watchNonRecursive(resource, opts) {
        // Add to list of paths to watch non-recursively
        const request = {
            path: this.toWatchPath(resource),
            excludes: opts.excludes,
            includes: opts.includes,
            recursive: false,
            filter: opts.filter,
            correlationId: opts.correlationId,
        };
        const remove = insert(this.nonRecursiveWatchRequests, request);
        // Trigger update
        this.refreshNonRecursiveWatchers();
        return toDisposable(() => {
            // Remove from list of paths to watch non-recursively
            remove();
            // Trigger update
            this.refreshNonRecursiveWatchers();
        });
    }
    refreshNonRecursiveWatchers() {
        // Buffer requests for nonrecursive watching to decide on right watcher
        // that supports potentially watching more than one path at once
        this.nonRecursiveWatchRequestDelayer
            .trigger(() => {
            return this.doRefreshNonRecursiveWatchers();
        })
            .catch((error) => onUnexpectedError(error));
    }
    doRefreshNonRecursiveWatchers() {
        // Create watcher if this is the first time
        if (!this.nonRecursiveWatcher) {
            this.nonRecursiveWatcher = this._register(this.createNonRecursiveWatcher((changes) => this._onDidChangeFile.fire(reviveFileChanges(changes)), (msg) => this.onWatcherLogMessage(msg), this.logService.getLevel() === LogLevel.Trace));
            // Apply log levels dynamically
            this._register(this.logService.onDidChangeLogLevel(() => {
                this.nonRecursiveWatcher?.setVerboseLogging(this.logService.getLevel() === LogLevel.Trace);
            }));
        }
        // Ask to watch the provided paths
        return this.nonRecursiveWatcher.watch(this.nonRecursiveWatchRequests);
    }
    //#endregion
    onWatcherLogMessage(msg) {
        if (msg.type === 'error') {
            this._onDidWatchError.fire(msg.message);
        }
        this.logWatcherMessage(msg);
    }
    logWatcherMessage(msg) {
        this.logService[msg.type](msg.message);
    }
    toFilePath(resource) {
        return normalize(resource.fsPath);
    }
    toWatchPath(resource) {
        const filePath = this.toFilePath(resource);
        // Ensure to have any trailing path separators removed, otherwise
        // we may believe the path is not "real" and will convert every
        // event back to this form, which is not warranted.
        // See also https://github.com/microsoft/vscode/issues/210517
        return removeTrailingPathSeparator(filePath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd4RCxPQUFPLEVBTU4sdUJBQXVCLEVBRXZCLGlCQUFpQixHQUNqQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQWUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUF1Qi9ELE1BQU0sT0FBZ0IsOEJBQ3JCLFNBQVEsVUFBVTtJQU1sQixZQUNvQixVQUF1QixFQUN6QixPQUF3QztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQUhZLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDekIsWUFBTyxHQUFQLE9BQU8sQ0FBaUM7UUFLdkMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMEIsQ0FBQyxDQUFBO1FBQ2xGLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtRQUVuQyxxQkFBZ0IsR0FB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