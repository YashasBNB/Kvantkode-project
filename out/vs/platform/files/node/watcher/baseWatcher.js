/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { watchFile, unwatchFile } from 'fs';
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isWatchRequestWithCorrelation, requestFilterToString, } from '../../common/watcher.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { DeferredPromise, ThrottledDelayer } from '../../../../base/common/async.js';
import { hash } from '../../../../base/common/hash.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
export class BaseWatcher extends Disposable {
    constructor() {
        super();
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._onDidLogMessage = this._register(new Emitter());
        this.onDidLogMessage = this._onDidLogMessage.event;
        this._onDidWatchFail = this._register(new Emitter());
        this.onDidWatchFail = this._onDidWatchFail.event;
        this.correlatedWatchRequests = new Map();
        this.nonCorrelatedWatchRequests = new Map();
        this.suspendedWatchRequests = this._register(new DisposableMap());
        this.suspendedWatchRequestsWithPolling = new Set();
        this.updateWatchersDelayer = this._register(new ThrottledDelayer(this.getUpdateWatchersDelay()));
        this.suspendedWatchRequestPollingInterval = 5007; // node.js default
        this.joinWatch = new DeferredPromise();
        this.verboseLogging = false;
        this._register(this.onDidWatchFail((request) => this.suspendWatchRequest({
            id: this.computeId(request),
            correlationId: this.isCorrelated(request) ? request.correlationId : undefined,
            path: request.path,
        })));
    }
    isCorrelated(request) {
        return isWatchRequestWithCorrelation(request);
    }
    computeId(request) {
        if (this.isCorrelated(request)) {
            return request.correlationId;
        }
        else {
            // Requests without correlation do not carry any unique identifier, so we have to
            // come up with one based on the options of the request. This matches what the
            // file service does (vs/platform/files/common/fileService.ts#L1178).
            return hash(request);
        }
    }
    async watch(requests) {
        if (!this.joinWatch.isSettled) {
            this.joinWatch.complete();
        }
        this.joinWatch = new DeferredPromise();
        try {
            this.correlatedWatchRequests.clear();
            this.nonCorrelatedWatchRequests.clear();
            // Figure out correlated vs. non-correlated requests
            for (const request of requests) {
                if (this.isCorrelated(request)) {
                    this.correlatedWatchRequests.set(request.correlationId, request);
                }
                else {
                    this.nonCorrelatedWatchRequests.set(this.computeId(request), request);
                }
            }
            // Remove all suspended watch requests that are no longer watched
            for (const [id] of this.suspendedWatchRequests) {
                if (!this.nonCorrelatedWatchRequests.has(id) && !this.correlatedWatchRequests.has(id)) {
                    this.suspendedWatchRequests.deleteAndDispose(id);
                    this.suspendedWatchRequestsWithPolling.delete(id);
                }
            }
            return await this.updateWatchers(false /* not delayed */);
        }
        finally {
            this.joinWatch.complete();
        }
    }
    updateWatchers(delayed) {
        const nonSuspendedRequests = [];
        for (const [id, request] of [
            ...this.nonCorrelatedWatchRequests,
            ...this.correlatedWatchRequests,
        ]) {
            if (!this.suspendedWatchRequests.has(id)) {
                nonSuspendedRequests.push(request);
            }
        }
        return this.updateWatchersDelayer
            .trigger(() => this.doWatch(nonSuspendedRequests), delayed ? this.getUpdateWatchersDelay() : 0)
            .catch((error) => onUnexpectedError(error));
    }
    getUpdateWatchersDelay() {
        return 800;
    }
    isSuspended(request) {
        const id = this.computeId(request);
        return this.suspendedWatchRequestsWithPolling.has(id)
            ? 'polling'
            : this.suspendedWatchRequests.has(id);
    }
    async suspendWatchRequest(request) {
        if (this.suspendedWatchRequests.has(request.id)) {
            return; // already suspended
        }
        const disposables = new DisposableStore();
        this.suspendedWatchRequests.set(request.id, disposables);
        // It is possible that a watch request fails right during watch()
        // phase while other requests succeed. To increase the chance of
        // reusing another watcher for suspend/resume tracking, we await
        // all watch requests having processed.
        await this.joinWatch.p;
        if (disposables.isDisposed) {
            return;
        }
        this.monitorSuspendedWatchRequest(request, disposables);
        this.updateWatchers(true /* delay this call as we might accumulate many failing watch requests on startup */);
    }
    resumeWatchRequest(request) {
        this.suspendedWatchRequests.deleteAndDispose(request.id);
        this.suspendedWatchRequestsWithPolling.delete(request.id);
        this.updateWatchers(false);
    }
    monitorSuspendedWatchRequest(request, disposables) {
        if (this.doMonitorWithExistingWatcher(request, disposables)) {
            this.trace(`reusing an existing recursive watcher to monitor ${request.path}`);
            this.suspendedWatchRequestsWithPolling.delete(request.id);
        }
        else {
            this.doMonitorWithNodeJS(request, disposables);
            this.suspendedWatchRequestsWithPolling.add(request.id);
        }
    }
    doMonitorWithExistingWatcher(request, disposables) {
        const subscription = this.recursiveWatcher?.subscribe(request.path, (error, change) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            if (error) {
                this.monitorSuspendedWatchRequest(request, disposables);
            }
            else if (change?.type === 1 /* FileChangeType.ADDED */) {
                this.onMonitoredPathAdded(request);
            }
        });
        if (subscription) {
            disposables.add(subscription);
            return true;
        }
        return false;
    }
    doMonitorWithNodeJS(request, disposables) {
        let pathNotFound = false;
        const watchFileCallback = (curr, prev) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            const currentPathNotFound = this.isPathNotFound(curr);
            const previousPathNotFound = this.isPathNotFound(prev);
            const oldPathNotFound = pathNotFound;
            pathNotFound = currentPathNotFound;
            // Watch path created: resume watching request
            if (!currentPathNotFound && (previousPathNotFound || oldPathNotFound)) {
                this.onMonitoredPathAdded(request);
            }
        };
        this.trace(`starting fs.watchFile() on ${request.path} (correlationId: ${request.correlationId})`);
        try {
            watchFile(request.path, { persistent: false, interval: this.suspendedWatchRequestPollingInterval }, watchFileCallback);
        }
        catch (error) {
            this.warn(`fs.watchFile() failed with error ${error} on path ${request.path} (correlationId: ${request.correlationId})`);
        }
        disposables.add(toDisposable(() => {
            this.trace(`stopping fs.watchFile() on ${request.path} (correlationId: ${request.correlationId})`);
            try {
                unwatchFile(request.path, watchFileCallback);
            }
            catch (error) {
                this.warn(`fs.unwatchFile() failed with error ${error} on path ${request.path} (correlationId: ${request.correlationId})`);
            }
        }));
    }
    onMonitoredPathAdded(request) {
        this.trace(`detected ${request.path} exists again, resuming watcher (correlationId: ${request.correlationId})`);
        // Emit as event
        const event = {
            resource: URI.file(request.path),
            type: 1 /* FileChangeType.ADDED */,
            cId: request.correlationId,
        };
        this._onDidChangeFile.fire([event]);
        this.traceEvent(event, request);
        // Resume watching
        this.resumeWatchRequest(request);
    }
    isPathNotFound(stats) {
        return stats.ctimeMs === 0 && stats.ino === 0;
    }
    async stop() {
        this.suspendedWatchRequests.clearAndDisposeAll();
        this.suspendedWatchRequestsWithPolling.clear();
    }
    traceEvent(event, request) {
        if (this.verboseLogging) {
            const traceMsg = ` >> normalized ${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`;
            this.traceWithCorrelation(traceMsg, request);
        }
    }
    traceWithCorrelation(message, request) {
        if (this.verboseLogging) {
            this.trace(`${message}${typeof request.correlationId === 'number' ? ` <${request.correlationId}> ` : ``}`);
        }
    }
    requestToString(request) {
        return `${request.path} (excludes: ${request.excludes.length > 0 ? request.excludes : '<none>'}, includes: ${request.includes && request.includes.length > 0 ? JSON.stringify(request.includes) : '<all>'}, filter: ${requestFilterToString(request.filter)}, correlationId: ${typeof request.correlationId === 'number' ? request.correlationId : '<none>'})`;
    }
    async setVerboseLogging(enabled) {
        this.verboseLogging = enabled;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVdhdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvYmFzZVdhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQVMsTUFBTSxJQUFJLENBQUE7QUFDbEQsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUNmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFPTiw2QkFBNkIsRUFDN0IscUJBQXFCLEdBQ3JCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUXJFLE1BQU0sT0FBZ0IsV0FBWSxTQUFRLFVBQVU7SUFnQ25EO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFoQ1cscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUIsQ0FBQyxDQUFBO1FBQ3pFLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtRQUVuQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQTtRQUN2RSxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFFbkMsb0JB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