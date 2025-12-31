/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { watch, promises } from 'fs';
import { RunOnceWorker, ThrottledWorker } from '../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { isEqual, isEqualOrParent } from '../../../../../base/common/extpath.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { normalizeNFC } from '../../../../../base/common/normalization.js';
import { basename, dirname, join } from '../../../../../base/common/path.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { realpath } from '../../../../../base/node/extpath.js';
import { Promises } from '../../../../../base/node/pfs.js';
import { coalesceEvents, parseWatcherPatterns, isFiltered, isWatchRequestWithCorrelation, } from '../../../common/watcher.js';
import { Lazy } from '../../../../../base/common/lazy.js';
export class NodeJSFileWatcherLibrary extends Disposable {
    // A delay in reacting to file deletes to support
    // atomic save operations where a tool may chose
    // to delete a file before creating it again for
    // an update.
    static { this.FILE_DELETE_HANDLER_DELAY = 100; }
    // A delay for collecting file changes from node.js
    // before collecting them for coalescing and emitting
    // Same delay as used for the recursive watcher.
    static { this.FILE_CHANGES_HANDLER_DELAY = 75; }
    get isReusingRecursiveWatcher() {
        return this._isReusingRecursiveWatcher;
    }
    get failed() {
        return this.didFail;
    }
    constructor(request, recursiveWatcher, onDidFilesChange, onDidWatchFail, onLogMessage, verboseLogging) {
        super();
        this.request = request;
        this.recursiveWatcher = recursiveWatcher;
        this.onDidFilesChange = onDidFilesChange;
        this.onDidWatchFail = onDidWatchFail;
        this.onLogMessage = onLogMessage;
        this.verboseLogging = verboseLogging;
        // Reduce likelyhood of spam from file events via throttling.
        // These numbers are a bit more aggressive compared to the
        // recursive watcher because we can have many individual
        // node.js watchers per request.
        // (https://github.com/microsoft/vscode/issues/124723)
        this.throttledFileChangesEmitter = this._register(new ThrottledWorker({
            maxWorkChunkSize: 100, // only process up to 100 changes at once before...
            throttleDelay: 200, // ...resting for 200ms until we process events again...
            maxBufferedWork: 10000, // ...but never buffering more than 10000 events in memory
        }, (events) => this.onDidFilesChange(events)));
        // Aggregate file changes over FILE_CHANGES_HANDLER_DELAY
        // to coalesce events and reduce spam.
        this.fileChangesAggregator = this._register(new RunOnceWorker((events) => this.handleFileChanges(events), NodeJSFileWatcherLibrary.FILE_CHANGES_HANDLER_DELAY));
        this.cts = new CancellationTokenSource();
        this.realPath = new Lazy(async () => {
            // This property is intentionally `Lazy` and not using `realcase()` as the counterpart
            // in the recursive watcher because of the amount of paths this watcher is dealing with.
            // We try as much as possible to avoid even needing `realpath()` if we can because even
            // that method does an `lstat()` per segment of the path.
            let result = this.request.path;
            try {
                result = await realpath(this.request.path);
                if (this.request.path !== result) {
                    this.trace(`correcting a path to watch that seems to be a symbolic link (original: ${this.request.path}, real: ${result})`);
                }
            }
            catch (error) {
                // ignore
            }
            return result;
        });
        this._isReusingRecursiveWatcher = false;
        this.didFail = false;
        this.excludes = parseWatcherPatterns(this.request.path, this.request.excludes);
        this.includes = this.request.includes
            ? parseWatcherPatterns(this.request.path, this.request.includes)
            : undefined;
        this.filter = isWatchRequestWithCorrelation(this.request) ? this.request.filter : undefined; // filtering is only enabled when correlating because watchers are otherwise potentially reused
        this.ready = this.watch();
    }
    async watch() {
        try {
            const stat = await promises.stat(this.request.path);
            if (this.cts.token.isCancellationRequested) {
                return;
            }
            this._register(await this.doWatch(stat.isDirectory()));
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.error(error);
            }
            else {
                this.trace(`ignoring a path for watching who's stat info failed to resolve: ${this.request.path} (error: ${error})`);
            }
            this.notifyWatchFailed();
        }
    }
    notifyWatchFailed() {
        this.didFail = true;
        this.onDidWatchFail?.();
    }
    async doWatch(isDirectory) {
        const disposables = new DisposableStore();
        if (this.doWatchWithExistingWatcher(isDirectory, disposables)) {
            this.trace(`reusing an existing recursive watcher for ${this.request.path}`);
            this._isReusingRecursiveWatcher = true;
        }
        else {
            this._isReusingRecursiveWatcher = false;
            await this.doWatchWithNodeJS(isDirectory, disposables);
        }
        return disposables;
    }
    doWatchWithExistingWatcher(isDirectory, disposables) {
        if (isDirectory) {
            // Recursive watcher re-use is currently not enabled for when
            // folders are watched. this is because the dispatching in the
            // recursive watcher for non-recurive requests is optimized for
            // file changes  where we really only match on the exact path
            // and not child paths.
            return false;
        }
        const resource = URI.file(this.request.path);
        const subscription = this.recursiveWatcher?.subscribe(this.request.path, async (error, change) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            if (error) {
                const watchDisposable = await this.doWatch(isDirectory);
                if (!disposables.isDisposed) {
                    disposables.add(watchDisposable);
                }
                else {
                    watchDisposable.dispose();
                }
            }
            else if (change) {
                if (typeof change.cId === 'number' || typeof this.request.correlationId === 'number') {
                    // Re-emit this change with the correlation id of the request
                    // so that the client can correlate the event with the request
                    // properly. Without correlation, we do not have to do that
                    // because the event will appear on the global listener already.
                    this.onFileChange({ resource, type: change.type, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
                }
            }
        });
        if (subscription) {
            disposables.add(subscription);
            return true;
        }
        return false;
    }
    async doWatchWithNodeJS(isDirectory, disposables) {
        const realPath = await this.realPath.value;
        // macOS: watching samba shares can crash VSCode so we do
        // a simple check for the file path pointing to /Volumes
        // (https://github.com/microsoft/vscode/issues/106879)
        // TODO@electron this needs a revisit when the crash is
        // fixed or mitigated upstream.
        if (isMacintosh && isEqualOrParent(realPath, '/Volumes/', true)) {
            this.error(`Refusing to watch ${realPath} for changes using fs.watch() for possibly being a network share where watching is unreliable and unstable.`);
            return;
        }
        const cts = new CancellationTokenSource(this.cts.token);
        disposables.add(toDisposable(() => cts.dispose(true)));
        const watcherDisposables = new DisposableStore(); // we need a separate disposable store because we re-create the watcher from within in some cases
        disposables.add(watcherDisposables);
        try {
            const requestResource = URI.file(this.request.path);
            const pathBasename = basename(realPath);
            // Creating watcher can fail with an exception
            const watcher = watch(realPath);
            watcherDisposables.add(toDisposable(() => {
                watcher.removeAllListeners();
                watcher.close();
            }));
            this.trace(`Started watching: '${realPath}'`);
            // Folder: resolve children to emit proper events
            const folderChildren = new Set();
            if (isDirectory) {
                try {
                    for (const child of await Promises.readdir(realPath)) {
                        folderChildren.add(child);
                    }
                }
                catch (error) {
                    this.error(error);
                }
            }
            if (cts.token.isCancellationRequested) {
                return;
            }
            const mapPathToStatDisposable = new Map();
            watcherDisposables.add(toDisposable(() => {
                for (const [, disposable] of mapPathToStatDisposable) {
                    disposable.dispose();
                }
                mapPathToStatDisposable.clear();
            }));
            watcher.on('error', (code, signal) => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.error(`Failed to watch ${realPath} for changes using fs.watch() (${code}, ${signal})`);
                this.notifyWatchFailed();
            });
            watcher.on('change', (type, raw) => {
                if (cts.token.isCancellationRequested) {
                    return; // ignore if already disposed
                }
                if (this.verboseLogging) {
                    this.traceWithCorrelation(`[raw] ["${type}"] ${raw}`);
                }
                // Normalize file name
                let changedFileName = '';
                if (raw) {
                    // https://github.com/microsoft/vscode/issues/38191
                    changedFileName = raw.toString();
                    if (isMacintosh) {
                        // Mac: uses NFD unicode form on disk, but we want NFC
                        // See also https://github.com/nodejs/node/issues/2165
                        changedFileName = normalizeNFC(changedFileName);
                    }
                }
                if (!changedFileName || (type !== 'change' && type !== 'rename')) {
                    return; // ignore unexpected events
                }
                // Folder
                if (isDirectory) {
                    // Folder child added/deleted
                    if (type === 'rename') {
                        // Cancel any previous stats for this file if existing
                        mapPathToStatDisposable.get(changedFileName)?.dispose();
                        // Wait a bit and try see if the file still exists on disk
                        // to decide on the resulting event
                        const timeoutHandle = setTimeout(async () => {
                            mapPathToStatDisposable.delete(changedFileName);
                            // Depending on the OS the watcher runs on, there
                            // is different behaviour for when the watched
                            // folder path is being deleted:
                            //
                            // -   macOS: not reported but events continue to
                            //            work even when the folder is brought
                            //            back, though it seems every change
                            //            to a file is reported as "rename"
                            // -   Linux: "rename" event is reported with the
                            //            name of the folder and events stop
                            //            working
                            // - Windows: an EPERM error is thrown that we
                            //            handle from the `on('error')` event
                            //
                            // We do not re-attach the watcher after timeout
                            // though as we do for file watches because for
                            // file watching specifically we want to handle
                            // the atomic-write cases where the file is being
                            // deleted and recreated with different contents.
                            if (isEqual(changedFileName, pathBasename, !isLinux) &&
                                !(await Promises.exists(realPath))) {
                                this.onWatchedPathDeleted(requestResource);
                                return;
                            }
                            if (cts.token.isCancellationRequested) {
                                return;
                            }
                            // In order to properly detect renames on a case-insensitive
                            // file system, we need to use `existsChildStrictCase` helper
                            // because otherwise we would wrongly assume a file exists
                            // when it was renamed to same name but different case.
                            const fileExists = await this.existsChildStrictCase(join(realPath, changedFileName));
                            if (cts.token.isCancellationRequested) {
                                return; // ignore if disposed by now
                            }
                            // Figure out the correct event type:
                            // File Exists: either 'added' or 'updated' if known before
                            // File Does not Exist: always 'deleted'
                            let type;
                            if (fileExists) {
                                if (folderChildren.has(changedFileName)) {
                                    type = 0 /* FileChangeType.UPDATED */;
                                }
                                else {
                                    type = 1 /* FileChangeType.ADDED */;
                                    folderChildren.add(changedFileName);
                                }
                            }
                            else {
                                folderChildren.delete(changedFileName);
                                type = 2 /* FileChangeType.DELETED */;
                            }
                            this.onFileChange({
                                resource: joinPath(requestResource, changedFileName),
                                type,
                                cId: this.request.correlationId,
                            });
                        }, NodeJSFileWatcherLibrary.FILE_DELETE_HANDLER_DELAY);
                        mapPathToStatDisposable.set(changedFileName, toDisposable(() => clearTimeout(timeoutHandle)));
                    }
                    // Folder child changed
                    else {
                        // Figure out the correct event type: if this is the
                        // first time we see this child, it can only be added
                        let type;
                        if (folderChildren.has(changedFileName)) {
                            type = 0 /* FileChangeType.UPDATED */;
                        }
                        else {
                            type = 1 /* FileChangeType.ADDED */;
                            folderChildren.add(changedFileName);
                        }
                        this.onFileChange({
                            resource: joinPath(requestResource, changedFileName),
                            type,
                            cId: this.request.correlationId,
                        });
                    }
                }
                // File
                else {
                    // File added/deleted
                    if (type === 'rename' || !isEqual(changedFileName, pathBasename, !isLinux)) {
                        // Depending on the OS the watcher runs on, there
                        // is different behaviour for when the watched
                        // file path is being deleted:
                        //
                        // -   macOS: "rename" event is reported and events
                        //            stop working
                        // -   Linux: "rename" event is reported and events
                        //            stop working
                        // - Windows: "rename" event is reported and events
                        //            continue to work when file is restored
                        //
                        // As opposed to folder watching, we re-attach the
                        // watcher after brief timeout to support "atomic save"
                        // operations where a tool may decide to delete a file
                        // and then create it with the updated contents.
                        //
                        // Different to folder watching, we emit a delete event
                        // though we never detect when the file is brought back
                        // because the watcher is disposed then.
                        const timeoutHandle = setTimeout(async () => {
                            const fileExists = await Promises.exists(realPath);
                            if (cts.token.isCancellationRequested) {
                                return; // ignore if disposed by now
                            }
                            // File still exists, so emit as change event and reapply the watcher
                            if (fileExists) {
                                this.onFileChange({
                                    resource: requestResource,
                                    type: 0 /* FileChangeType.UPDATED */,
                                    cId: this.request.correlationId,
                                }, true /* skip excludes/includes (file is explicitly watched) */);
                                watcherDisposables.add(await this.doWatch(false));
                            }
                            // File seems to be really gone, so emit a deleted and failed event
                            else {
                                this.onWatchedPathDeleted(requestResource);
                            }
                        }, NodeJSFileWatcherLibrary.FILE_DELETE_HANDLER_DELAY);
                        // Very important to dispose the watcher which now points to a stale inode
                        // and wire in a new disposable that tracks our timeout that is installed
                        watcherDisposables.clear();
                        watcherDisposables.add(toDisposable(() => clearTimeout(timeoutHandle)));
                    }
                    // File changed
                    else {
                        this.onFileChange({
                            resource: requestResource,
                            type: 0 /* FileChangeType.UPDATED */,
                            cId: this.request.correlationId,
                        }, true /* skip excludes/includes (file is explicitly watched) */);
                    }
                }
            });
        }
        catch (error) {
            if (!cts.token.isCancellationRequested) {
                this.error(`Failed to watch ${realPath} for changes using fs.watch() (${error.toString()})`);
            }
            this.notifyWatchFailed();
        }
    }
    onWatchedPathDeleted(resource) {
        this.warn('Watcher shutdown because watched path got deleted');
        // Emit events and flush in case the watcher gets disposed
        this.onFileChange({ resource, type: 2 /* FileChangeType.DELETED */, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
        this.fileChangesAggregator.flush();
        this.notifyWatchFailed();
    }
    onFileChange(event, skipIncludeExcludeChecks = false) {
        if (this.cts.token.isCancellationRequested) {
            return;
        }
        // Logging
        if (this.verboseLogging) {
            this.traceWithCorrelation(`${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`);
        }
        // Add to aggregator unless excluded or not included (not if explicitly disabled)
        if (!skipIncludeExcludeChecks &&
            this.excludes.some((exclude) => exclude(event.resource.fsPath))) {
            if (this.verboseLogging) {
                this.traceWithCorrelation(` >> ignored (excluded) ${event.resource.fsPath}`);
            }
        }
        else if (!skipIncludeExcludeChecks &&
            this.includes &&
            this.includes.length > 0 &&
            !this.includes.some((include) => include(event.resource.fsPath))) {
            if (this.verboseLogging) {
                this.traceWithCorrelation(` >> ignored (not included) ${event.resource.fsPath}`);
            }
        }
        else {
            this.fileChangesAggregator.work(event);
        }
    }
    handleFileChanges(fileChanges) {
        // Coalesce events: merge events of same kind
        const coalescedFileChanges = coalesceEvents(fileChanges);
        // Filter events: based on request filter property
        const filteredEvents = [];
        for (const event of coalescedFileChanges) {
            if (isFiltered(event, this.filter)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (filtered) ${event.resource.fsPath}`);
                }
                continue;
            }
            filteredEvents.push(event);
        }
        if (filteredEvents.length === 0) {
            return;
        }
        // Logging
        if (this.verboseLogging) {
            for (const event of filteredEvents) {
                this.traceWithCorrelation(` >> normalized ${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`);
            }
        }
        // Broadcast to clients via throttled emitter
        const worked = this.throttledFileChangesEmitter.work(filteredEvents);
        // Logging
        if (!worked) {
            this.warn(`started ignoring events due to too many file change events at once (incoming: ${filteredEvents.length}, most recent change: ${filteredEvents[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
        }
        else {
            if (this.throttledFileChangesEmitter.pending > 0) {
                this.trace(`started throttling events due to large amount of file change events at once (pending: ${this.throttledFileChangesEmitter.pending}, most recent change: ${filteredEvents[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
            }
        }
    }
    async existsChildStrictCase(path) {
        if (isLinux) {
            return Promises.exists(path);
        }
        try {
            const pathBasename = basename(path);
            const children = await Promises.readdir(dirname(path));
            return children.some((child) => child === pathBasename);
        }
        catch (error) {
            this.trace(error);
            return false;
        }
    }
    setVerboseLogging(verboseLogging) {
        this.verboseLogging = verboseLogging;
    }
    error(error) {
        if (!this.cts.token.isCancellationRequested) {
            this.onLogMessage?.({ type: 'error', message: `[File Watcher (node.js)] ${error}` });
        }
    }
    warn(message) {
        if (!this.cts.token.isCancellationRequested) {
            this.onLogMessage?.({ type: 'warn', message: `[File Watcher (node.js)] ${message}` });
        }
    }
    trace(message) {
        if (!this.cts.token.isCancellationRequested && this.verboseLogging) {
            this.onLogMessage?.({ type: 'trace', message: `[File Watcher (node.js)] ${message}` });
        }
    }
    traceWithCorrelation(message) {
        if (!this.cts.token.isCancellationRequested && this.verboseLogging) {
            this.trace(`${message}${typeof this.request.correlationId === 'number' ? ` <${this.request.correlationId}> ` : ``}`);
        }
    }
    dispose() {
        this.cts.dispose(true);
        super.dispose();
    }
}
/**
 * Watch the provided `path` for changes and return
 * the data in chunks of `Uint8Array` for further use.
 */
export async function watchFileContents(path, onData, onReady, token, bufferSize = 512) {
    const handle = await Promises.open(path, 'r');
    const buffer = Buffer.allocUnsafe(bufferSize);
    const cts = new CancellationTokenSource(token);
    let error = undefined;
    let isReading = false;
    const request = { path, excludes: [], recursive: false };
    const watcher = new NodeJSFileWatcherLibrary(request, undefined, (changes) => {
        ;
        (async () => {
            for (const { type } of changes) {
                if (type === 0 /* FileChangeType.UPDATED */) {
                    if (isReading) {
                        return; // return early if we are already reading the output
                    }
                    isReading = true;
                    try {
                        // Consume the new contents of the file until finished
                        // everytime there is a change event signalling a change
                        while (!cts.token.isCancellationRequested) {
                            const { bytesRead } = await Promises.read(handle, buffer, 0, bufferSize, null);
                            if (!bytesRead || cts.token.isCancellationRequested) {
                                break;
                            }
                            onData(buffer.slice(0, bytesRead));
                        }
                    }
                    catch (err) {
                        error = new Error(err);
                        cts.dispose(true);
                    }
                    finally {
                        isReading = false;
                    }
                }
            }
        })();
    });
    await watcher.ready;
    onReady();
    return new Promise((resolve, reject) => {
        cts.token.onCancellationRequested(async () => {
            watcher.dispose();
            try {
                await Promises.close(handle);
            }
            catch (err) {
                error = new Error(err);
            }
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlckxpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvd2F0Y2hlci9ub2RlanMvbm9kZWpzV2F0Y2hlckxpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUNwQyxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BGLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEVBRU4sY0FBYyxFQUVkLG9CQUFvQixFQUVwQixVQUFVLEVBQ1YsNkJBQTZCLEdBQzdCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxF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