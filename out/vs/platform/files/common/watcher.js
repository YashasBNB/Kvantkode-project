/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { GLOBSTAR, parse } from '../../../base/common/glob.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { isAbsolute } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { isParent } from './files.js';
export function isWatchRequestWithCorrelation(request) {
    return typeof request.correlationId === 'number';
}
export function isRecursiveWatchRequest(request) {
    return request.recursive === true;
}
export class AbstractWatcherClient extends Disposable {
    static { this.MAX_RESTARTS = 5; }
    constructor(onFileChanges, onLogMessage, verboseLogging, options) {
        super();
        this.onFileChanges = onFileChanges;
        this.onLogMessage = onLogMessage;
        this.verboseLogging = verboseLogging;
        this.options = options;
        this.watcherDisposables = this._register(new MutableDisposable());
        this.requests = undefined;
        this.restartCounter = 0;
    }
    init() {
        // Associate disposables to the watcher
        const disposables = new DisposableStore();
        this.watcherDisposables.value = disposables;
        // Ask implementors to create the watcher
        this.watcher = this.createWatcher(disposables);
        this.watcher.setVerboseLogging(this.verboseLogging);
        // Wire in event handlers
        disposables.add(this.watcher.onDidChangeFile((changes) => this.onFileChanges(changes)));
        disposables.add(this.watcher.onDidLogMessage((msg) => this.onLogMessage(msg)));
        disposables.add(this.watcher.onDidError((e) => this.onError(e.error, e.request)));
    }
    onError(error, failedRequest) {
        // Restart on error (up to N times, if possible)
        if (this.canRestart(error, failedRequest)) {
            if (this.restartCounter < AbstractWatcherClient.MAX_RESTARTS && this.requests) {
                this.error(`restarting watcher after unexpected error: ${error}`);
                this.restart(this.requests);
            }
            else {
                this.error(`gave up attempting to restart watcher after unexpected error: ${error}`);
            }
        }
        // Do not attempt to restart otherwise, report the error
        else {
            this.error(error);
        }
    }
    canRestart(error, failedRequest) {
        if (!this.options.restartOnError) {
            return false; // disabled by options
        }
        if (failedRequest) {
            // do not treat a failing request as a reason to restart the entire
            // watcher. it is possible that from a large amount of watch requests
            // some fail and we would constantly restart all requests only because
            // of that. rather, continue the watcher and leave the failed request
            return false;
        }
        if (error.indexOf('No space left on device') !== -1 || error.indexOf('EMFILE') !== -1) {
            // do not restart when the error indicates that the system is running
            // out of handles for file watching. this is not recoverable anyway
            // and needs changes to the system before continuing
            return false;
        }
        return true;
    }
    restart(requests) {
        this.restartCounter++;
        this.init();
        this.watch(requests);
    }
    async watch(requests) {
        this.requests = requests;
        await this.watcher?.watch(requests);
    }
    async setVerboseLogging(verboseLogging) {
        this.verboseLogging = verboseLogging;
        await this.watcher?.setVerboseLogging(verboseLogging);
    }
    error(message) {
        this.onLogMessage({
            type: 'error',
            message: `[File Watcher (${this.options.type})] ${message}`,
        });
    }
    trace(message) {
        this.onLogMessage({
            type: 'trace',
            message: `[File Watcher (${this.options.type})] ${message}`,
        });
    }
    dispose() {
        // Render the watcher invalid from here
        this.watcher = undefined;
        return super.dispose();
    }
}
export class AbstractNonRecursiveWatcherClient extends AbstractWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging) {
        super(onFileChanges, onLogMessage, verboseLogging, { type: 'node.js', restartOnError: false });
    }
}
export class AbstractUniversalWatcherClient extends AbstractWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging) {
        super(onFileChanges, onLogMessage, verboseLogging, { type: 'universal', restartOnError: true });
    }
}
export function reviveFileChanges(changes) {
    return changes.map((change) => ({
        type: change.type,
        resource: URI.revive(change.resource),
        cId: change.cId,
    }));
}
export function coalesceEvents(changes) {
    // Build deltas
    const coalescer = new EventCoalescer();
    for (const event of changes) {
        coalescer.processEvent(event);
    }
    return coalescer.coalesce();
}
export function normalizeWatcherPattern(path, pattern) {
    // Patterns are always matched on the full absolute path
    // of the event. As such, if the pattern is not absolute
    // and is a string and does not start with a leading
    // `**`, we have to convert it to a relative pattern with
    // the given `base`
    if (typeof pattern === 'string' && !pattern.startsWith(GLOBSTAR) && !isAbsolute(pattern)) {
        return { base: path, pattern };
    }
    return pattern;
}
export function parseWatcherPatterns(path, patterns) {
    const parsedPatterns = [];
    for (const pattern of patterns) {
        parsedPatterns.push(parse(normalizeWatcherPattern(path, pattern)));
    }
    return parsedPatterns;
}
class EventCoalescer {
    constructor() {
        this.coalesced = new Set();
        this.mapPathToChange = new Map();
    }
    toKey(event) {
        if (isLinux) {
            return event.resource.fsPath;
        }
        return event.resource.fsPath.toLowerCase(); // normalise to file system case sensitivity
    }
    processEvent(event) {
        const existingEvent = this.mapPathToChange.get(this.toKey(event));
        let keepEvent = false;
        // Event path already exists
        if (existingEvent) {
            const currentChangeType = existingEvent.type;
            const newChangeType = event.type;
            // macOS/Windows: track renames to different case
            // by keeping both CREATE and DELETE events
            if (existingEvent.resource.fsPath !== event.resource.fsPath &&
                (event.type === 2 /* FileChangeType.DELETED */ || event.type === 1 /* FileChangeType.ADDED */)) {
                keepEvent = true;
            }
            // Ignore CREATE followed by DELETE in one go
            else if (currentChangeType === 1 /* FileChangeType.ADDED */ &&
                newChangeType === 2 /* FileChangeType.DELETED */) {
                this.mapPathToChange.delete(this.toKey(event));
                this.coalesced.delete(existingEvent);
            }
            // Flatten DELETE followed by CREATE into CHANGE
            else if (currentChangeType === 2 /* FileChangeType.DELETED */ &&
                newChangeType === 1 /* FileChangeType.ADDED */) {
                existingEvent.type = 0 /* FileChangeType.UPDATED */;
            }
            // Do nothing. Keep the created event
            else if (currentChangeType === 1 /* FileChangeType.ADDED */ &&
                newChangeType === 0 /* FileChangeType.UPDATED */) {
            }
            // Otherwise apply change type
            else {
                existingEvent.type = newChangeType;
            }
        }
        // Otherwise keep
        else {
            keepEvent = true;
        }
        if (keepEvent) {
            this.coalesced.add(event);
            this.mapPathToChange.set(this.toKey(event), event);
        }
    }
    coalesce() {
        const addOrChangeEvents = [];
        const deletedPaths = [];
        // This algorithm will remove all DELETE events up to the root folder
        // that got deleted if any. This ensures that we are not producing
        // DELETE events for each file inside a folder that gets deleted.
        //
        // 1.) split ADD/CHANGE and DELETED events
        // 2.) sort short deleted paths to the top
        // 3.) for each DELETE, check if there is a deleted parent and ignore the event in that case
        return Array.from(this.coalesced)
            .filter((e) => {
            if (e.type !== 2 /* FileChangeType.DELETED */) {
                addOrChangeEvents.push(e);
                return false; // remove ADD / CHANGE
            }
            return true; // keep DELETE
        })
            .sort((e1, e2) => {
            return e1.resource.fsPath.length - e2.resource.fsPath.length; // shortest path first
        })
            .filter((e) => {
            if (deletedPaths.some((deletedPath) => isParent(e.resource.fsPath, deletedPath, !isLinux /* ignorecase */))) {
                return false; // DELETE is ignored if parent is deleted already
            }
            // otherwise mark as deleted
            deletedPaths.push(e.resource.fsPath);
            return true;
        })
            .concat(addOrChangeEvents);
    }
}
export function isFiltered(event, filter) {
    if (typeof filter === 'number') {
        switch (event.type) {
            case 1 /* FileChangeType.ADDED */:
                return (filter & 4 /* FileChangeFilter.ADDED */) === 0;
            case 2 /* FileChangeType.DELETED */:
                return (filter & 8 /* FileChangeFilter.DELETED */) === 0;
            case 0 /* FileChangeType.UPDATED */:
                return (filter & 2 /* FileChangeFilter.UPDATED */) === 0;
        }
    }
    return false;
}
export function requestFilterToString(filter) {
    if (typeof filter === 'number') {
        const filters = [];
        if (filter & 4 /* FileChangeFilter.ADDED */) {
            filters.push('Added');
        }
        if (filter & 8 /* FileChangeFilter.DELETED */) {
            filters.push('Deleted');
        }
        if (filter & 2 /* FileChangeFilter.UPDATED */) {
            filters.push('Updated');
        }
        if (filters.length === 0) {
            return '<all>';
        }
        return `[${filters.join(', ')}]`;
    }
    return '<none>';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2NvbW1vbi93YXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQW9CLEtBQUssRUFBaUIsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQWlELFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQThDcEYsTUFBTSxVQUFVLDZCQUE2QixDQUM1QyxPQUFzQjtJQUV0QixPQUFPLE9BQU8sT0FBTyxDQUFDLGFBQWEsS0FBSyxRQUFRLENBQUE7QUFDakQsQ0FBQztBQXNCRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsT0FBc0I7SUFDN0QsT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQTtBQUNsQyxDQUFDO0FBK0ZELE1BQU0sT0FBZ0IscUJBQXNCLFNBQVEsVUFBVTthQUNyQyxpQkFBWSxHQUFHLENBQUMsQUFBSixDQUFJO0lBU3hDLFlBQ2tCLGFBQStDLEVBQy9DLFlBQXdDLEVBQ2pELGNBQXVCLEVBQ3ZCLE9BR1A7UUFFRCxLQUFLLEVBQUUsQ0FBQTtRQVJVLGtCQUFhLEdBQWIsYUFBYSxDQUFrQztRQUMvQyxpQkFBWSxHQUFaLFlBQVksQ0FBNEI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQVM7UUFDdkIsWUFBTyxHQUFQLE9BQU8sQ0FHZDtR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