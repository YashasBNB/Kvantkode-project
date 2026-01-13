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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RGaWxlU3lzdGVtRXZlbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixPQUFPLEVBRVAsWUFBWSxHQUdaLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQW9CLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzVGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUdqRCxPQUFPLEVBT04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxLQUFLLGFBQWEsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBVTdELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFRbkYsTUFBTSxpQkFBaUI7SUFVdEIsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxPQUFPLENBQUMsSUFB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