/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import parcelWatcher from '@parcel/watcher';
import { promises } from 'fs';
import { tmpdir, homedir } from 'os';
import { URI } from '../../../../../base/common/uri.js';
import { DeferredPromise, RunOnceScheduler, RunOnceWorker, ThrottledWorker, } from '../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { randomPath, isEqual, isEqualOrParent } from '../../../../../base/common/extpath.js';
import { GLOBSTAR, patternsEquals } from '../../../../../base/common/glob.js';
import { BaseWatcher } from '../baseWatcher.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { normalizeNFC } from '../../../../../base/common/normalization.js';
import { normalize, join } from '../../../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { realcase, realpath } from '../../../../../base/node/extpath.js';
import { coalesceEvents, parseWatcherPatterns, isFiltered, } from '../../../common/watcher.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
export class ParcelWatcherInstance extends Disposable {
    get failed() {
        return this.didFail;
    }
    get stopped() {
        return this.didStop;
    }
    constructor(
    /**
     * Signals when the watcher is ready to watch.
     */
    ready, request, 
    /**
     * How often this watcher has been restarted in case of an unexpected
     * shutdown.
     */
    restarts, 
    /**
     * The cancellation token associated with the lifecycle of the watcher.
     */
    token, 
    /**
     * An event aggregator to coalesce events and reduce duplicates.
     */
    worker, stopFn) {
        super();
        this.ready = ready;
        this.request = request;
        this.restarts = restarts;
        this.token = token;
        this.worker = worker;
        this.stopFn = stopFn;
        this._onDidStop = this._register(new Emitter());
        this.onDidStop = this._onDidStop.event;
        this._onDidFail = this._register(new Emitter());
        this.onDidFail = this._onDidFail.event;
        this.didFail = false;
        this.didStop = false;
        this.subscriptions = new Map();
        this.includes = this.request.includes
            ? parseWatcherPatterns(this.request.path, this.request.includes)
            : undefined;
        this.excludes = this.request.excludes
            ? parseWatcherPatterns(this.request.path, this.request.excludes)
            : undefined;
        this._register(toDisposable(() => this.subscriptions.clear()));
    }
    subscribe(path, callback) {
        path = URI.file(path).fsPath; // make sure to store the path in `fsPath` form to match it with events later
        let subscriptions = this.subscriptions.get(path);
        if (!subscriptions) {
            subscriptions = new Set();
            this.subscriptions.set(path, subscriptions);
        }
        subscriptions.add(callback);
        return toDisposable(() => {
            const subscriptions = this.subscriptions.get(path);
            if (subscriptions) {
                subscriptions.delete(callback);
                if (subscriptions.size === 0) {
                    this.subscriptions.delete(path);
                }
            }
        });
    }
    get subscriptionsCount() {
        return this.subscriptions.size;
    }
    notifyFileChange(path, change) {
        const subscriptions = this.subscriptions.get(path);
        if (subscriptions) {
            for (const subscription of subscriptions) {
                subscription(change);
            }
        }
    }
    notifyWatchFailed() {
        this.didFail = true;
        this._onDidFail.fire();
    }
    include(path) {
        if (!this.includes || this.includes.length === 0) {
            return true; // no specific includes defined, include all
        }
        return this.includes.some((include) => include(path));
    }
    exclude(path) {
        return Boolean(this.excludes?.some((exclude) => exclude(path)));
    }
    async stop(joinRestart) {
        this.didStop = true;
        try {
            await this.stopFn();
        }
        finally {
            this._onDidStop.fire({ joinRestart });
            this.dispose();
        }
    }
}
export class ParcelWatcher extends BaseWatcher {
    static { this.MAP_PARCEL_WATCHER_ACTION_TO_FILE_CHANGE = new Map([
        ['create', 1 /* FileChangeType.ADDED */],
        ['update', 0 /* FileChangeType.UPDATED */],
        ['delete', 2 /* FileChangeType.DELETED */],
    ]); }
    static { this.PREDEFINED_EXCLUDES = {
        win32: [],
        darwin: [
            join(homedir(), 'Library', 'Containers'), // Triggers access dialog from macOS 14 (https://github.com/microsoft/vscode/issues/208105)
        ],
        linux: [],
    }; }
    static { this.PARCEL_WATCHER_BACKEND = isWindows
        ? 'windows'
        : isLinux
            ? 'inotify'
            : 'fs-events'; }
    get watchers() {
        return this._watchers.values();
    }
    // A delay for collecting file changes from Parcel
    // before collecting them for coalescing and emitting.
    // Parcel internally uses 50ms as delay, so we use 75ms,
    // to schedule sufficiently after Parcel.
    //
    // Note: since Parcel 2.0.7, the very first event is
    // emitted without delay if no events occured over a
    // duration of 500ms. But we always want to aggregate
    // events to apply our coleasing logic.
    //
    static { this.FILE_CHANGES_HANDLER_DELAY = 75; }
    constructor() {
        super();
        this._onDidError = this._register(new Emitter());
        this.onDidError = this._onDidError.event;
        this._watchers = new Map();
        // Reduce likelyhood of spam from file events via throttling.
        // (https://github.com/microsoft/vscode/issues/124723)
        this.throttledFileChangesEmitter = this._register(new ThrottledWorker({
            maxWorkChunkSize: 500, // only process up to 500 changes at once before...
            throttleDelay: 200, // ...resting for 200ms until we process events again...
            maxBufferedWork: 30000, // ...but never buffering more than 30000 events in memory
        }, (events) => this._onDidChangeFile.fire(events)));
        this.enospcErrorLogged = false;
        this.registerListeners();
    }
    registerListeners() {
        const onUncaughtException = (error) => this.onUnexpectedError(error);
        const onUnhandledRejection = (error) => this.onUnexpectedError(error);
        process.on('uncaughtException', onUncaughtException);
        process.on('unhandledRejection', onUnhandledRejection);
        this._register(toDisposable(() => {
            process.off('uncaughtException', onUncaughtException);
            process.off('unhandledRejection', onUnhandledRejection);
        }));
    }
    async doWatch(requests) {
        // Figure out duplicates to remove from the requests
        requests = await this.removeDuplicateRequests(requests);
        // Figure out which watchers to start and which to stop
        const requestsToStart = [];
        const watchersToStop = new Set(Array.from(this.watchers));
        for (const request of requests) {
            const watcher = this._watchers.get(this.requestToWatcherKey(request));
            if (watcher &&
                patternsEquals(watcher.request.excludes, request.excludes) &&
                patternsEquals(watcher.request.includes, request.includes) &&
                watcher.request.pollingInterval === request.pollingInterval) {
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
            await this.stopWatching(watcher);
        }
        // Start watching as instructed
        for (const request of requestsToStart) {
            if (request.pollingInterval) {
                await this.startPolling(request, request.pollingInterval);
            }
            else {
                await this.startWatching(request);
            }
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
    async startPolling(request, pollingInterval, restarts = 0) {
        const cts = new CancellationTokenSource();
        const instance = new DeferredPromise();
        const snapshotFile = randomPath(tmpdir(), 'vscode-watcher-snapshot');
        // Remember as watcher instance
        const watcher = new ParcelWatcherInstance(instance.p, request, restarts, cts.token, new RunOnceWorker((events) => this.handleParcelEvents(events, watcher), ParcelWatcher.FILE_CHANGES_HANDLER_DELAY), async () => {
            cts.dispose(true);
            watcher.worker.flush();
            watcher.worker.dispose();
            pollingWatcher.dispose();
            await promises.unlink(snapshotFile);
        });
        this._watchers.set(this.requestToWatcherKey(request), watcher);
        // Path checks for symbolic links / wrong casing
        const { realPath, realPathDiffers, realPathLength } = await this.normalizePath(request);
        this.trace(`Started watching: '${realPath}' with polling interval '${pollingInterval}'`);
        let counter = 0;
        const pollingWatcher = new RunOnceScheduler(async () => {
            counter++;
            if (cts.token.isCancellationRequested) {
                return;
            }
            // We already ran before, check for events since
            const parcelWatcherLib = parcelWatcher;
            try {
                if (counter > 1) {
                    const parcelEvents = await parcelWatcherLib.getEventsSince(realPath, snapshotFile, {
                        ignore: this.addPredefinedExcludes(request.excludes),
                        backend: ParcelWatcher.PARCEL_WATCHER_BACKEND,
                    });
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                    // Handle & emit events
                    this.onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength);
                }
                // Store a snapshot of files to the snapshot file
                await parcelWatcherLib.writeSnapshot(realPath, snapshotFile, {
                    ignore: this.addPredefinedExcludes(request.excludes),
                    backend: ParcelWatcher.PARCEL_WATCHER_BACKEND,
                });
            }
            catch (error) {
                this.onUnexpectedError(error, request);
            }
            // Signal we are ready now when the first snapshot was written
            if (counter === 1) {
                instance.complete();
            }
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Schedule again at the next interval
            pollingWatcher.schedule();
        }, pollingInterval);
        pollingWatcher.schedule(0);
    }
    async startWatching(request, restarts = 0) {
        const cts = new CancellationTokenSource();
        const instance = new DeferredPromise();
        // Remember as watcher instance
        const watcher = new ParcelWatcherInstance(instance.p, request, restarts, cts.token, new RunOnceWorker((events) => this.handleParcelEvents(events, watcher), ParcelWatcher.FILE_CHANGES_HANDLER_DELAY), async () => {
            cts.dispose(true);
            watcher.worker.flush();
            watcher.worker.dispose();
            const watcherInstance = await instance.p;
            await watcherInstance?.unsubscribe();
        });
        this._watchers.set(this.requestToWatcherKey(request), watcher);
        // Path checks for symbolic links / wrong casing
        const { realPath, realPathDiffers, realPathLength } = await this.normalizePath(request);
        try {
            const parcelWatcherLib = parcelWatcher;
            const parcelWatcherInstance = await parcelWatcherLib.subscribe(realPath, (error, parcelEvents) => {
                if (watcher.token.isCancellationRequested) {
                    return; // return early when disposed
                }
                // In any case of an error, treat this like a unhandled exception
                // that might require the watcher to restart. We do not really know
                // the state of parcel at this point and as such will try to restart
                // up to our maximum of restarts.
                if (error) {
                    this.onUnexpectedError(error, request);
                }
                // Handle & emit events
                this.onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength);
            }, {
                backend: ParcelWatcher.PARCEL_WATCHER_BACKEND,
                ignore: this.addPredefinedExcludes(watcher.request.excludes),
            });
            this.trace(`Started watching: '${realPath}' with backend '${ParcelWatcher.PARCEL_WATCHER_BACKEND}'`);
            instance.complete(parcelWatcherInstance);
        }
        catch (error) {
            this.onUnexpectedError(error, request);
            instance.complete(undefined);
            watcher.notifyWatchFailed();
            this._onDidWatchFail.fire(request);
        }
    }
    addPredefinedExcludes(initialExcludes) {
        const excludes = [...initialExcludes];
        const predefinedExcludes = ParcelWatcher.PREDEFINED_EXCLUDES[process.platform];
        if (Array.isArray(predefinedExcludes)) {
            for (const exclude of predefinedExcludes) {
                if (!excludes.includes(exclude)) {
                    excludes.push(exclude);
                }
            }
        }
        return excludes;
    }
    onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength) {
        if (parcelEvents.length === 0) {
            return;
        }
        // Normalize events: handle NFC normalization and symlinks
        // It is important to do this before checking for includes
        // to check on the original path.
        this.normalizeEvents(parcelEvents, watcher.request, realPathDiffers, realPathLength);
        // Check for includes
        const includedEvents = this.handleIncludes(watcher, parcelEvents);
        // Add to event aggregator for later processing
        for (const includedEvent of includedEvents) {
            watcher.worker.work(includedEvent);
        }
    }
    handleIncludes(watcher, parcelEvents) {
        const events = [];
        for (const { path, type: parcelEventType } of parcelEvents) {
            const type = ParcelWatcher.MAP_PARCEL_WATCHER_ACTION_TO_FILE_CHANGE.get(parcelEventType);
            if (this.verboseLogging) {
                this.traceWithCorrelation(`${type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${path}`, watcher.request);
            }
            // Apply include filter if any
            if (!watcher.include(path)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (not included) ${path}`, watcher.request);
                }
            }
            else {
                events.push({ type, resource: URI.file(path), cId: watcher.request.correlationId });
            }
        }
        return events;
    }
    handleParcelEvents(parcelEvents, watcher) {
        // Coalesce events: merge events of same kind
        const coalescedEvents = coalesceEvents(parcelEvents);
        // Filter events: check for specific events we want to exclude
        const { events: filteredEvents, rootDeleted } = this.filterEvents(coalescedEvents, watcher);
        // Broadcast to clients
        this.emitEvents(filteredEvents, watcher);
        // Handle root path deletes
        if (rootDeleted) {
            this.onWatchedPathDeleted(watcher);
        }
    }
    emitEvents(events, watcher) {
        if (events.length === 0) {
            return;
        }
        // Broadcast to clients via throttler
        const worked = this.throttledFileChangesEmitter.work(events);
        // Logging
        if (!worked) {
            this.warn(`started ignoring events due to too many file change events at once (incoming: ${events.length}, most recent change: ${events[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
        }
        else {
            if (this.throttledFileChangesEmitter.pending > 0) {
                this.trace(`started throttling events due to large amount of file change events at once (pending: ${this.throttledFileChangesEmitter.pending}, most recent change: ${events[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`, watcher);
            }
        }
    }
    async normalizePath(request) {
        let realPath = request.path;
        let realPathDiffers = false;
        let realPathLength = request.path.length;
        try {
            // First check for symbolic link
            realPath = await realpath(request.path);
            // Second check for casing difference
            // Note: this will be a no-op on Linux platforms
            if (request.path === realPath) {
                realPath = (await realcase(request.path)) ?? request.path;
            }
            // Correct watch path as needed
            if (request.path !== realPath) {
                realPathLength = realPath.length;
                realPathDiffers = true;
                this.trace(`correcting a path to watch that seems to be a symbolic link or wrong casing (original: ${request.path}, real: ${realPath})`);
            }
        }
        catch (error) {
            // ignore
        }
        return { realPath, realPathDiffers, realPathLength };
    }
    normalizeEvents(events, request, realPathDiffers, realPathLength) {
        for (const event of events) {
            // Mac uses NFD unicode form on disk, but we want NFC
            if (isMacintosh) {
                event.path = normalizeNFC(event.path);
            }
            // Workaround for https://github.com/parcel-bundler/watcher/issues/68
            // where watching root drive letter adds extra backslashes.
            if (isWindows) {
                if (request.path.length <= 3) {
                    // for ex. c:, C:\
                    event.path = normalize(event.path);
                }
            }
            // Convert paths back to original form in case it differs
            if (realPathDiffers) {
                event.path = request.path + event.path.substr(realPathLength);
            }
        }
    }
    filterEvents(events, watcher) {
        const filteredEvents = [];
        let rootDeleted = false;
        const filter = this.isCorrelated(watcher.request) ? watcher.request.filter : undefined; // filtering is only enabled when correlating because watchers are otherwise potentially reused
        for (const event of events) {
            // Emit to instance subscriptions if any before filtering
            if (watcher.subscriptionsCount > 0) {
                watcher.notifyFileChange(event.resource.fsPath, event);
            }
            // Filtering
            rootDeleted =
                event.type === 2 /* FileChangeType.DELETED */ &&
                    isEqual(event.resource.fsPath, watcher.request.path, !isLinux);
            if (isFiltered(event, filter)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (filtered) ${event.resource.fsPath}`, watcher.request);
                }
                continue;
            }
            // Logging
            this.traceEvent(event, watcher.request);
            filteredEvents.push(event);
        }
        return { events: filteredEvents, rootDeleted };
    }
    onWatchedPathDeleted(watcher) {
        this.warn('Watcher shutdown because watched path got deleted', watcher);
        watcher.notifyWatchFailed();
        this._onDidWatchFail.fire(watcher.request);
    }
    onUnexpectedError(error, request) {
        const msg = toErrorMessage(error);
        // Specially handle ENOSPC errors that can happen when
        // the watcher consumes so many file descriptors that
        // we are running into a limit. We only want to warn
        // once in this case to avoid log spam.
        // See https://github.com/microsoft/vscode/issues/7950
        if (msg.indexOf('No space left on device') !== -1) {
            if (!this.enospcErrorLogged) {
                this.error('Inotify limit reached (ENOSPC)', request);
                this.enospcErrorLogged = true;
            }
        }
        // Version 2.5.1 introduces 3 new errors on macOS
        // via https://github.dev/parcel-bundler/watcher/pull/196
        else if (msg.indexOf('File system must be re-scanned') !== -1) {
            this.error(msg, request);
        }
        // Any other error is unexpected and we should try to
        // restart the watcher as a result to get into healthy
        // state again if possible and if not attempted too much
        else {
            this.error(`Unexpected error: ${msg} (EUNKNOWN)`, request);
            this._onDidError.fire({ request, error: msg });
        }
    }
    async stop() {
        await super.stop();
        for (const watcher of this.watchers) {
            await this.stopWatching(watcher);
        }
    }
    restartWatching(watcher, delay = 800) {
        // Restart watcher delayed to accomodate for
        // changes on disk that have triggered the
        // need for a restart in the first place.
        const scheduler = new RunOnceScheduler(async () => {
            if (watcher.token.isCancellationRequested) {
                return; // return early when disposed
            }
            const restartPromise = new DeferredPromise();
            try {
                // Await the watcher having stopped, as this is
                // needed to properly re-watch the same path
                await this.stopWatching(watcher, restartPromise.p);
                // Start watcher again counting the restarts
                if (watcher.request.pollingInterval) {
                    await this.startPolling(watcher.request, watcher.request.pollingInterval, watcher.restarts + 1);
                }
                else {
                    await this.startWatching(watcher.request, watcher.restarts + 1);
                }
            }
            finally {
                restartPromise.complete();
            }
        }, delay);
        scheduler.schedule();
        watcher.token.onCancellationRequested(() => scheduler.dispose());
    }
    async stopWatching(watcher, joinRestart) {
        this.trace(`stopping file watcher`, watcher);
        this._watchers.delete(this.requestToWatcherKey(watcher.request));
        try {
            await watcher.stop(joinRestart);
        }
        catch (error) {
            this.error(`Unexpected error stopping watcher: ${toErrorMessage(error)}`, watcher.request);
        }
    }
    async removeDuplicateRequests(requests, validatePaths = true) {
        // Sort requests by path length to have shortest first
        // to have a way to prevent children to be watched if
        // parents exist.
        requests.sort((requestA, requestB) => requestA.path.length - requestB.path.length);
        // Ignore requests for the same paths that have the same correlation
        const mapCorrelationtoRequests = new Map();
        for (const request of requests) {
            if (request.excludes.includes(GLOBSTAR)) {
                continue; // path is ignored entirely (via `**` glob exclude)
            }
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
        const normalizedRequests = [];
        for (const requestsForCorrelation of mapCorrelationtoRequests.values()) {
            // Only consider requests for watching that are not
            // a child of an existing request path to prevent
            // duplication. In addition, drop any request where
            // everything is excluded (via `**` glob).
            //
            // However, allow explicit requests to watch folders
            // that are symbolic links because the Parcel watcher
            // does not allow to recursively watch symbolic links.
            const requestTrie = TernarySearchTree.forPaths(!isLinux);
            for (const request of requestsForCorrelation.values()) {
                // Check for overlapping request paths (but preserve symbolic links)
                if (requestTrie.findSubstr(request.path)) {
                    if (requestTrie.has(request.path)) {
                        this.trace(`ignoring a request for watching who's path is already watched: ${this.requestToString(request)}`);
                    }
                    else {
                        try {
                            if (!(await promises.lstat(request.path)).isSymbolicLink()) {
                                this.trace(`ignoring a request for watching who's parent is already watched: ${this.requestToString(request)}`);
                                continue;
                            }
                        }
                        catch (error) {
                            this.trace(`ignoring a request for watching who's lstat failed to resolve: ${this.requestToString(request)} (error: ${error})`);
                            this._onDidWatchFail.fire(request);
                            continue;
                        }
                    }
                }
                // Check for invalid paths
                if (validatePaths && !(await this.isPathValid(request.path))) {
                    this._onDidWatchFail.fire(request);
                    continue;
                }
                requestTrie.set(request.path, request);
            }
            normalizedRequests.push(...Array.from(requestTrie).map(([, request]) => request));
        }
        return normalizedRequests;
    }
    async isPathValid(path) {
        try {
            const stat = await promises.stat(path);
            if (!stat.isDirectory()) {
                this.trace(`ignoring a path for watching that is a file and not a folder: ${path}`);
                return false;
            }
        }
        catch (error) {
            this.trace(`ignoring a path for watching who's stat info failed to resolve: ${path} (error: ${error})`);
            return false;
        }
        return true;
    }
    subscribe(path, callback) {
        for (const watcher of this.watchers) {
            if (watcher.failed) {
                continue; // watcher has already failed
            }
            if (!isEqualOrParent(path, watcher.request.path, !isLinux)) {
                continue; // watcher does not consider this path
            }
            if (watcher.exclude(path) || !watcher.include(path)) {
                continue; // parcel instance does not consider this path
            }
            const disposables = new DisposableStore();
            disposables.add(Event.once(watcher.onDidStop)(async (e) => {
                await e.joinRestart; // if we are restarting, await that so that we can possibly reuse this watcher again
                if (disposables.isDisposed) {
                    return;
                }
                callback(true /* error */);
            }));
            disposables.add(Event.once(watcher.onDidFail)(() => callback(true /* error */)));
            disposables.add(watcher.subscribe(path, (change) => callback(null, change)));
            return disposables;
        }
        return undefined;
    }
    trace(message, watcher) {
        if (this.verboseLogging) {
            this._onDidLogMessage.fire({
                type: 'trace',
                message: this.toMessage(message, watcher?.request),
            });
        }
    }
    warn(message, watcher) {
        this._onDidLogMessage.fire({ type: 'warn', message: this.toMessage(message, watcher?.request) });
    }
    error(message, request) {
        this._onDidLogMessage.fire({ type: 'error', message: this.toMessage(message, request) });
    }
    toMessage(message, request) {
        return request
            ? `[File Watcher] ${message} (path: ${request.path})`
            : `[File Watcher ('parcel')] ${message}`;
    }
    get recursiveWatcher() {
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyY2VsV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvd2F0Y2hlci9wYXJjZWwvcGFyY2VsV2F0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGFBQWEsTUFBTSxpQkFBaUIsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzdCLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZUFBZSxFQUNmLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsZUFBZSxHQUNmLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQWlCLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxP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