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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi9kaXNrRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHeEQsT0FBTyxFQU1OLHVCQUF1QixFQUV2QixpQkFBaUIsR0FDakIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFlLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBdUIvRCxNQUFNLE9BQWdCLDhCQUNyQixTQUFRLFVBQVU7SUFNbEIsWUFDb0IsVUFBdUIsRUFDekIsT0FBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFIWSxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3pCLFlBQU8sR0FBUCxPQUFPLENBQWlDO1FBS3ZDLHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUNsRixvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFFbkMscUJBQWdCLEdBQUcsSUFB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