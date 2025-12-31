/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, AsyncEmitter, } from '../../../base/common/event.js';
import { GLOBSTAR, GLOB_SPLIT, parse } from '../../../base/common/glob.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import * as typeConverter from './extHostTypeConverters.js';
import { Disposable, WorkspaceEdit } from './extHostTypes.js';
import { Lazy } from '../../../base/common/lazy.js';
import { rtrim } from '../../../base/common/strings.js';
import { normalizeWatcherPattern } from '../../../platform/files/common/watcher.js';
class FileSystemWatcher {
    get ignoreCreateEvents() {
        return Boolean(this._config & 0b001);
    }
    get ignoreChangeEvents() {
        return Boolean(this._config & 0b010);
    }
    get ignoreDeleteEvents() {
        return Boolean(this._config & 0b100);
    }
    constructor(mainContext, configuration, workspace, extension, dispatcher, globPattern, options) {
        this.session = Math.random();
        this._onDidCreate = new Emitter();
        this._onDidChange = new Emitter();
        this._onDidDelete = new Emitter();
        this._config = 0;
        if (options.ignoreCreateEvents) {
            this._config += 0b001;
        }
        if (options.ignoreChangeEvents) {
            this._config += 0b010;
        }
        if (options.ignoreDeleteEvents) {
            this._config += 0b100;
        }
        const parsedPattern = parse(globPattern);
        // 1.64.x behaviour change: given the new support to watch any folder
        // we start to ignore events outside the workspace when only a string
        // pattern is provided to avoid sending events to extensions that are
        // unexpected.
        // https://github.com/microsoft/vscode/issues/3025
        const excludeOutOfWorkspaceEvents = typeof globPattern === 'string';
        // 1.84.x introduces new proposed API for a watcher to set exclude
        // rules. In these cases, we turn the file watcher into correlation
        // mode and ignore any event that does not match the correlation ID.
        //
        // Update (Feb 2025): proposal is discontinued, so the previous
        // `options.correlate` is always `false`.
        const excludeUncorrelatedEvents = false;
        const subscription = dispatcher((events) => {
            if (typeof events.session === 'number' && events.session !== this.session) {
                return; // ignore events from other file watchers that are in correlation mode
            }
            if (excludeUncorrelatedEvents && typeof events.session === 'undefined') {
                return; // ignore events from other non-correlating file watcher when we are in correlation mode
            }
            if (!options.ignoreCreateEvents) {
                for (const created of events.created) {
                    const uri = URI.revive(created);
                    if (parsedPattern(uri.fsPath) &&
                        (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidCreate.fire(uri);
                    }
                }
            }
            if (!options.ignoreChangeEvents) {
                for (const changed of events.changed) {
                    const uri = URI.revive(changed);
                    if (parsedPattern(uri.fsPath) &&
                        (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidChange.fire(uri);
                    }
                }
            }
            if (!options.ignoreDeleteEvents) {
                for (const deleted of events.deleted) {
                    const uri = URI.revive(deleted);
                    if (parsedPattern(uri.fsPath) &&
                        (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidDelete.fire(uri);
                    }
                }
            }
        });
        this._disposable = Disposable.from(this.ensureWatching(mainContext, workspace, configuration, extension, globPattern, options, false), this._onDidCreate, this._onDidChange, this._onDidDelete, subscription);
    }
    ensureWatching(mainContext, workspace, configuration, extension, globPattern, options, correlate) {
        const disposable = Disposable.from();
        if (typeof globPattern === 'string') {
            return disposable; // workspace is already watched by default, no need to watch again!
        }
        if (options.ignoreChangeEvents && options.ignoreCreateEvents && options.ignoreDeleteEvents) {
            return disposable; // no need to watch if we ignore all events
        }
        const proxy = mainContext.getProxy(MainContext.MainThreadFileSystemEventService);
        let recursive = false;
        if (globPattern.pattern.includes(GLOBSTAR) || globPattern.pattern.includes(GLOB_SPLIT)) {
            recursive = true; // only watch recursively if pattern indicates the need for it
        }
        const excludes = [];
        let includes = undefined;
        let filter;
        // Correlated: adjust filter based on arguments
        if (correlate) {
            if (options.ignoreChangeEvents || options.ignoreCreateEvents || options.ignoreDeleteEvents) {
                filter = 2 /* FileChangeFilter.UPDATED */ | 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */;
                if (options.ignoreChangeEvents) {
                    filter &= ~2 /* FileChangeFilter.UPDATED */;
                }
                if (options.ignoreCreateEvents) {
                    filter &= ~4 /* FileChangeFilter.ADDED */;
                }
                if (options.ignoreDeleteEvents) {
                    filter &= ~8 /* FileChangeFilter.DELETED */;
                }
            }
        }
        // Uncorrelated: adjust includes and excludes based on settings
        else {
            // Automatically add `files.watcherExclude` patterns when watching
            // recursively to give users a chance to configure exclude rules
            // for reducing the overhead of watching recursively
            if (recursive && excludes.length === 0) {
                const workspaceFolder = workspace.getWorkspaceFolder(URI.revive(globPattern.baseUri));
                const watcherExcludes = configuration
                    .getConfiguration('files', workspaceFolder)
                    .get('watcherExclude');
                if (watcherExcludes) {
                    for (const key in watcherExcludes) {
                        if (key && watcherExcludes[key] === true) {
                            excludes.push(key);
                        }
                    }
                }
            }
            // Non-recursive watching inside the workspace will overlap with
            // our standard workspace watchers. To prevent duplicate events,
            // we only want to include events for files that are otherwise
            // excluded via `files.watcherExclude`. As such, we configure
            // to include each configured exclude pattern so that only those
            // events are reported that are otherwise excluded.
            // However, we cannot just use the pattern as is, because a pattern
            // such as `bar` for a exclude, will work to exclude any of
            // `<workspace path>/bar` but will not work as include for files within
            // `bar` unless a suffix of `/**` if added.
            // (https://github.com/microsoft/vscode/issues/148245)
            else if (!recursive) {
                const workspaceFolder = workspace.getWorkspaceFolder(URI.revive(globPattern.baseUri));
                if (workspaceFolder) {
                    const watcherExcludes = configuration
                        .getConfiguration('files', workspaceFolder)
                        .get('watcherExclude');
                    if (watcherExcludes) {
                        for (const key in watcherExcludes) {
                            if (key && watcherExcludes[key] === true) {
                                const includePattern = `${rtrim(key, '/')}/${GLOBSTAR}`;
                                if (!includes) {
                                    includes = [];
                                }
                                includes.push(normalizeWatcherPattern(workspaceFolder.uri.fsPath, includePattern));
                            }
                        }
                    }
                    // Still ignore watch request if there are actually no configured
                    // exclude rules, because in that case our default recursive watcher
                    // should be able to take care of all events.
                    if (!includes || includes.length === 0) {
                        return disposable;
                    }
                }
            }
        }
        proxy.$watch(extension.identifier.value, this.session, globPattern.baseUri, { recursive, excludes, includes, filter }, Boolean(correlate));
        return Disposable.from({ dispose: () => proxy.$unwatch(this.session) });
    }
    dispose() {
        this._disposable.dispose();
    }
    get onDidCreate() {
        return this._onDidCreate.event;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    get onDidDelete() {
        return this._onDidDelete.event;
    }
}
class LazyRevivedFileSystemEvents {
    get created() {
        return this._created.value;
    }
    get changed() {
        return this._changed.value;
    }
    get deleted() {
        return this._deleted.value;
    }
    constructor(_events) {
        this._events = _events;
        this._created = new Lazy(() => this._events.created.map(URI.revive));
        this._changed = new Lazy(() => this._events.changed.map(URI.revive));
        this._deleted = new Lazy(() => this._events.deleted.map(URI.revive));
        this.session = this._events.session;
    }
}
export class ExtHostFileSystemEventService {
    constructor(_mainContext, _logService, _extHostDocumentsAndEditors) {
        this._mainContext = _mainContext;
        this._logService = _logService;
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._onFileSystemEvent = new Emitter();
        this._onDidRenameFile = new Emitter();
        this._onDidCreateFile = new Emitter();
        this._onDidDeleteFile = new Emitter();
        this._onWillRenameFile = new AsyncEmitter();
        this._onWillCreateFile = new AsyncEmitter();
        this._onWillDeleteFile = new AsyncEmitter();
        this.onDidRenameFile = this._onDidRenameFile.event;
        this.onDidCreateFile = this._onDidCreateFile.event;
        this.onDidDeleteFile = this._onDidDeleteFile.event;
        //
    }
    //--- file events
    createFileSystemWatcher(workspace, configProvider, extension, globPattern, options) {
        return new FileSystemWatcher(this._mainContext, configProvider, workspace, extension, this._onFileSystemEvent.event, typeConverter.GlobPattern.from(globPattern), options);
    }
    $onFileEvent(events) {
        this._onFileSystemEvent.fire(new LazyRevivedFileSystemEvents(events));
    }
    //--- file operations
    $onDidRunFileOperation(operation, files) {
        switch (operation) {
            case 2 /* FileOperation.MOVE */:
                this._onDidRenameFile.fire(Object.freeze({
                    files: files.map((f) => ({
                        oldUri: URI.revive(f.source),
                        newUri: URI.revive(f.target),
                    })),
                }));
                break;
            case 1 /* FileOperation.DELETE */:
                this._onDidDeleteFile.fire(Object.freeze({ files: files.map((f) => URI.revive(f.target)) }));
                break;
            case 0 /* FileOperation.CREATE */:
            case 3 /* FileOperation.COPY */:
                this._onDidCreateFile.fire(Object.freeze({ files: files.map((f) => URI.revive(f.target)) }));
                break;
            default:
            //ignore, dont send
        }
    }
    getOnWillRenameFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillRenameFile);
    }
    getOnWillCreateFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillCreateFile);
    }
    getOnWillDeleteFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillDeleteFile);
    }
    _createWillExecuteEvent(extension, emitter) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) {
                listener.call(thisArg, e);
            };
            wrappedListener.extension = extension;
            return emitter.event(wrappedListener, undefined, disposables);
        };
    }
    async $onWillRunFileOperation(operation, files, timeout, token) {
        switch (operation) {
            case 2 /* FileOperation.MOVE */:
                return await this._fireWillEvent(this._onWillRenameFile, {
                    files: files.map((f) => ({
                        oldUri: URI.revive(f.source),
                        newUri: URI.revive(f.target),
                    })),
                }, timeout, token);
            case 1 /* FileOperation.DELETE */:
                return await this._fireWillEvent(this._onWillDeleteFile, { files: files.map((f) => URI.revive(f.target)) }, timeout, token);
            case 0 /* FileOperation.CREATE */:
            case 3 /* FileOperation.COPY */:
                return await this._fireWillEvent(this._onWillCreateFile, { files: files.map((f) => URI.revive(f.target)) }, timeout, token);
        }
        return undefined;
    }
    async _fireWillEvent(emitter, data, timeout, token) {
        const extensionNames = new Set();
        const edits = [];
        await emitter.fireAsync(data, token, async (thenable, listener) => {
            // ignore all results except for WorkspaceEdits. Those are stored in an array.
            const now = Date.now();
            const result = await Promise.resolve(thenable);
            if (result instanceof WorkspaceEdit) {
                edits.push([listener.extension, result]);
                extensionNames.add(listener.extension.displayName ??
                    listener.extension.identifier.value);
            }
            if (Date.now() - now > timeout) {
                this._logService.warn('SLOW file-participant', listener.extension.identifier);
            }
        });
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (edits.length === 0) {
            return undefined;
        }
        // concat all WorkspaceEdits collected via waitUntil-call and send them over to the renderer
        const dto = { edits: [] };
        for (const [, edit] of edits) {
            const { edits } = typeConverter.WorkspaceEdit.from(edit, {
                getTextDocumentVersion: (uri) => this._extHostDocumentsAndEditors.getDocument(uri)?.version,
                getNotebookDocumentVersion: () => undefined,
            });
            dto.edits = dto.edits.concat(edits);
        }
        return { edit: dto, extensionNames: Array.from(extensionNames) };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RmlsZVN5c3RlbUV2ZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sT0FBTyxFQUVQLFlBQVksR0FHWixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFvQixLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHakQsT0FBTyxFQU9OLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sS0FBSyxhQUFhLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQVU3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBUW5GLE1BQU0saUJBQWlCO0lBVXRCLElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxD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