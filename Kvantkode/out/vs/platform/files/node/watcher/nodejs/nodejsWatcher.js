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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL25vZGVqcy9ub2RlanNXYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQU1oRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQWNoRSxNQUFNLE9BQU8sYUFBYyxTQUFRLFdBQVc7SUFPN0MsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFRCxZQUErQixnQkFBNEQ7UUFDMUYsS0FBSyxFQUFFLENBQUE7UUFEdUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUE0QztRQVZsRixlQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUVmLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFHakMsQ0FBQTtJQU9ILENBQUM7SUFFa0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFxQztRQUNyRSxvREFBb0Q7UUFDcEQsUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVqRCx1REFBdUQ7UUFDdkQsTUFBTSxlQUFlLEdBQWdDLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3pELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDckUsSUFDQyxPQUFPO2dCQUNQLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDO2dCQUMxRCxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUN6RCxDQUFDO2dCQUNGLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUEsQ0FBQyxlQUFlO1lBQy9DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBLENBQUMsaUJBQWlCO1lBQ2hELENBQUM7UUFDRixDQUFDO1FBRUQsVUFBVTtRQUVWLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxLQUFLLENBQ1QsOEJBQThCLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FDekcsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsS0FBSyxDQUNULDZCQUE2QixLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztpQkFDckQsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQ2IsQ0FBQTtRQUNGLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsS0FBSyxNQUFNLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsS0FBSyxNQUFNLE9BQU8sSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsT0FBa0M7UUFDN0QsT0FBTyxPQUFPLE9BQU8sQ0FBQyxhQUFhLEtBQUssUUFBUTtZQUMvQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWE7WUFDdkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLGdCQUFnQixDQUFDLElBQVk7UUFDcEMsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUMsd0JBQXdCO0lBQ3BFLENBQUM7SUFFTyxhQUFhLENBQUMsT0FBa0M7UUFDdkQsd0JBQXdCO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLElBQUksd0JBQXdCLENBQzVDLE9BQU8sRUFDUCxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUNoRCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFDeEMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ3hDLElBQUksQ0FBQyxjQUFjLENBQ25CLENBQUE7UUFFRCwrQkFBK0I7UUFDL0IsTUFBTSxPQUFPLEdBQTJCLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUk7UUFDbEIsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFbEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxPQUErQjtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRTVDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVoRSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsUUFBcUM7UUFFckMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFHckMsQ0FBQTtRQUVILG9FQUFvRTtRQUNwRSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksc0JBQXNCLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUNoRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDN0Isc0JBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUE7Z0JBQ3JFLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLHNCQUFzQixDQUFDLENBQUE7WUFDNUUsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEQsSUFBSSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLEtBQUssQ0FDVCxrRUFBa0UsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUNqRyxDQUFBO1lBQ0YsQ0FBQztZQUVELHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNsRCxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDaEQsSUFBSSxFQUFFLENBQUE7SUFDVCxDQUFDO0lBRVEsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQWdCO1FBQ2hELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVoQyxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRVMsS0FBSyxDQUFDLE9BQWUsRUFBRSxPQUFnQztRQUNoRSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7SUFDRixDQUFDO0lBRVMsSUFBSSxDQUFDLE9BQWU7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTyxTQUFTLENBQUMsT0FBZSxFQUFFLE9BQWdDO1FBQ2xFLE9BQU8sT0FBTztZQUNiLENBQUMsQ0FBQyw0QkFBNEIsT0FBTyxLQUFLLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ2xGLENBQUMsQ0FBQyw0QkFBNEIsT0FBTyxFQUFFLENBQUE7SUFDekMsQ0FBQztDQUNEIn0=