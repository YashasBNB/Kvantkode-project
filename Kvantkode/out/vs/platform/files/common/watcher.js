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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL3dhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBb0IsS0FBSyxFQUFpQixNQUFNLDhCQUE4QixDQUFBO0FBQy9GLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBaUQsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBOENwRixNQUFNLFVBQVUsNkJBQTZCLENBQzVDLE9BQXNCO0lBRXRCLE9BQU8sT0FBTyxPQUFPLENBQUMsYUFBYSxLQUFLLFFBQVEsQ0FBQTtBQUNqRCxDQUFDO0FBc0JELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxPQUFzQjtJQUM3RCxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFBO0FBQ2xDLENBQUM7QUErRkQsTUFBTSxPQUFnQixxQkFBc0IsU0FBUSxVQUFVO2FBQ3JDLGlCQUFZLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFTeEMsWUFDa0IsYUFBK0MsRUFDL0MsWUFBd0MsRUFDakQsY0FBdUIsRUFDdkIsT0FHUDtRQUVELEtBQUssRUFBRSxDQUFBO1FBUlUsa0JBQWEsR0FBYixhQUFhLENBQWtDO1FBQy9DLGlCQUFZLEdBQVosWUFBWSxDQUE0QjtRQUNqRCxtQkFBYyxHQUFkLGNBQWMsQ0FBUztRQUN2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