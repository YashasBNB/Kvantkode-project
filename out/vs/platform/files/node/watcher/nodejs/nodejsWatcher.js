/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { patternsEquals } from '../../../../../base/common/glob.js';
import { BaseWatcher } from '../baseWatcher.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { NodeJSFileWatcherLibrary } from './nodejsWatcherLib.js';
export class NodeJSWatcher extends BaseWatcher {
    get watchers() {
        return this._watchers.values();
    }
    constructor(recursiveWatcher) {
        super();
        this.recursiveWatcher = recursiveWatcher;
        this.onDidError = Event.None;
        this._watchers = new Map();
    }
    async doWatch(requests) {
        // Figure out duplicates to remove from the requests
        requests = this.removeDuplicateRequests(requests);
        // Figure out which watchers to start and which to stop
        const requestsToStart = [];
        const watchersToStop = new Set(Array.from(this.watchers));
        for (const request of requests) {
            const watcher = this._watchers.get(this.requestToWatcherKey(request));
            if (watcher &&
                patternsEquals(watcher.request.excludes, request.excludes) &&
                patternsEquals(watcher.request.includes, request.includes)) {
                watchersToStop.delete(watcher); // keep watcher
            }
            else {
                requestsToStart.push(request); // start watching
            }
        }
        // Logging
        if (requestsToStart.length) {
            this.trace(`Request to start watching: ${requestsToStart.map((request) => this.requestToString(request)).join(',')}`);
        }
        if (watchersToStop.size) {
            this.trace(`Request to stop watching: ${Array.from(watchersToStop)
                .map((watcher) => this.requestToString(watcher.request))
                .join(',')}`);
        }
        // Stop watching as instructed
        for (const watcher of watchersToStop) {
            this.stopWatching(watcher);
        }
        // Start watching as instructed
        for (const request of requestsToStart) {
            this.startWatching(request);
        }
    }
    requestToWatcherKey(request) {
        return typeof request.correlationId === 'number'
            ? request.correlationId
            : this.pathToWatcherKey(request.path);
    }
    pathToWatcherKey(path) {
        return isLinux ? path : path.toLowerCase(); /* ignore path casing */
    }
    startWatching(request) {
        // Start via node.js lib
        const instance = new NodeJSFileWatcherLibrary(request, this.recursiveWatcher, (changes) => this._onDidChangeFile.fire(changes), () => this._onDidWatchFail.fire(request), (msg) => this._onDidLogMessage.fire(msg), this.verboseLogging);
        // Remember as watcher instance
        const watcher = { request, instance };
        this._watchers.set(this.requestToWatcherKey(request), watcher);
    }
    async stop() {
        await super.stop();
        for (const watcher of this.watchers) {
            this.stopWatching(watcher);
        }
    }
    stopWatching(watcher) {
        this.trace(`stopping file watcher`, watcher);
        this._watchers.delete(this.requestToWatcherKey(watcher.request));
        watcher.instance.dispose();
    }
    removeDuplicateRequests(requests) {
        const mapCorrelationtoRequests = new Map();
        // Ignore requests for the same paths that have the same correlation
        for (const request of requests) {
            let requestsForCorrelation = mapCorrelationtoRequests.get(request.correlationId);
            if (!requestsForCorrelation) {
                requestsForCorrelation = new Map();
                mapCorrelationtoRequests.set(request.correlationId, requestsForCorrelation);
            }
            const path = this.pathToWatcherKey(request.path);
            if (requestsForCorrelation.has(path)) {
                this.trace(`ignoring a request for watching who's path is already watched: ${this.requestToString(request)}`);
            }
            requestsForCorrelation.set(path, request);
        }
        return Array.from(mapCorrelationtoRequests.values())
            .map((requests) => Array.from(requests.values()))
            .flat();
    }
    async setVerboseLogging(enabled) {
        super.setVerboseLogging(enabled);
        for (const watcher of this.watchers) {
            watcher.instance.setVerboseLogging(enabled);
        }
    }
    trace(message, watcher) {
        if (this.verboseLogging) {
            this._onDidLogMessage.fire({ type: 'trace', message: this.toMessage(message, watcher) });
        }
    }
    warn(message) {
        this._onDidLogMessage.fire({ type: 'warn', message: this.toMessage(message) });
    }
    toMessage(message, watcher) {
        return watcher
            ? `[File Watcher (node.js)] ${message} (${this.requestToString(watcher.request)})`
            : `[File Watcher (node.js)] ${message}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvd2F0Y2hlci9ub2RlanMvbm9kZWpzV2F0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFNaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFjaEUsTUFBTSxPQUFPLGFBQWMsU0FBUSxXQUFXO0lBTzdDLElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsWUFBK0IsZ0JBQTREO1FBQzFGLEtBQUssRUFBRSxDQUFBO1FBRHVCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBNEM7UUFWbEYsZUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFZixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBR2pDLENBQUE7SUFPSCxDQUFDO0lBRWtCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBcUM7UUFDckUsb0RBQW9EO1FBQ3BELFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFakQsdURBQXVEO1FBQ3ZELE1BQU0sZUFBZSxHQUFnQyxFQUFFLENBQUE7UUFDdkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENB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