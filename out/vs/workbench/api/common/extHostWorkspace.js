/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { delta as arrayDelta, mapArrayOrNot } from '../../../base/common/arrays.js';
import { AsyncIterableObject, Barrier } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { AsyncEmitter, Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { Schemas } from '../../../base/common/network.js';
import { Counter } from '../../../base/common/numbers.js';
import { basename, basenameOrAuthority, dirname, ExtUri, relativePath, } from '../../../base/common/resources.js';
import { compare } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Severity } from '../../../platform/notification/common/notification.js';
import { Workspace, WorkspaceFolder } from '../../../platform/workspace/common/workspace.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { GlobPattern } from './extHostTypeConverters.js';
import { Range } from './extHostTypes.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { resultIsMatch, } from '../../services/search/common/search.js';
import { MainContext, } from './extHost.protocol.js';
import { revive } from '../../../base/common/marshalling.js';
import { ExcludeSettingOptions, TextSearchContext2, TextSearchMatch2, } from '../../services/search/common/searchExtTypes.js';
import { VSBuffer } from '../../../base/common/buffer.js';
function isFolderEqual(folderA, folderB, extHostFileSystemInfo) {
    return new ExtUri((uri) => ignorePathCasing(uri, extHostFileSystemInfo)).isEqual(folderA, folderB);
}
function compareWorkspaceFolderByUri(a, b, extHostFileSystemInfo) {
    return isFolderEqual(a.uri, b.uri, extHostFileSystemInfo)
        ? 0
        : compare(a.uri.toString(), b.uri.toString());
}
function compareWorkspaceFolderByUriAndNameAndIndex(a, b, extHostFileSystemInfo) {
    if (a.index !== b.index) {
        return a.index < b.index ? -1 : 1;
    }
    return isFolderEqual(a.uri, b.uri, extHostFileSystemInfo)
        ? compare(a.name, b.name)
        : compare(a.uri.toString(), b.uri.toString());
}
function delta(oldFolders, newFolders, compare, extHostFileSystemInfo) {
    const oldSortedFolders = oldFolders.slice(0).sort((a, b) => compare(a, b, extHostFileSystemInfo));
    const newSortedFolders = newFolders.slice(0).sort((a, b) => compare(a, b, extHostFileSystemInfo));
    return arrayDelta(oldSortedFolders, newSortedFolders, (a, b) => compare(a, b, extHostFileSystemInfo));
}
function ignorePathCasing(uri, extHostFileSystemInfo) {
    const capabilities = extHostFileSystemInfo.getCapabilities(uri.scheme);
    return !(capabilities && capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
}
class ExtHostWorkspaceImpl extends Workspace {
    static toExtHostWorkspace(data, previousConfirmedWorkspace, previousUnconfirmedWorkspace, extHostFileSystemInfo) {
        if (!data) {
            return { workspace: null, added: [], removed: [] };
        }
        const { id, name, folders, configuration, transient, isUntitled } = data;
        const newWorkspaceFolders = [];
        // If we have an existing workspace, we try to find the folders that match our
        // data and update their properties. It could be that an extension stored them
        // for later use and we want to keep them "live" if they are still present.
        const oldWorkspace = previousConfirmedWorkspace;
        if (previousConfirmedWorkspace) {
            folders.forEach((folderData, index) => {
                const folderUri = URI.revive(folderData.uri);
                const existingFolder = ExtHostWorkspaceImpl._findFolder(previousUnconfirmedWorkspace || previousConfirmedWorkspace, folderUri, extHostFileSystemInfo);
                if (existingFolder) {
                    existingFolder.name = folderData.name;
                    existingFolder.index = folderData.index;
                    newWorkspaceFolders.push(existingFolder);
                }
                else {
                    newWorkspaceFolders.push({ uri: folderUri, name: folderData.name, index });
                }
            });
        }
        else {
            newWorkspaceFolders.push(...folders.map(({ uri, name, index }) => ({ uri: URI.revive(uri), name, index })));
        }
        // make sure to restore sort order based on index
        newWorkspaceFolders.sort((f1, f2) => (f1.index < f2.index ? -1 : 1));
        const workspace = new ExtHostWorkspaceImpl(id, name, newWorkspaceFolders, !!transient, configuration ? URI.revive(configuration) : null, !!isUntitled, (uri) => ignorePathCasing(uri, extHostFileSystemInfo));
        const { added, removed } = delta(oldWorkspace ? oldWorkspace.workspaceFolders : [], workspace.workspaceFolders, compareWorkspaceFolderByUri, extHostFileSystemInfo);
        return { workspace, added, removed };
    }
    static _findFolder(workspace, folderUriToFind, extHostFileSystemInfo) {
        for (let i = 0; i < workspace.folders.length; i++) {
            const folder = workspace.workspaceFolders[i];
            if (isFolderEqual(folder.uri, folderUriToFind, extHostFileSystemInfo)) {
                return folder;
            }
        }
        return undefined;
    }
    constructor(id, _name, folders, transient, configuration, _isUntitled, ignorePathCasing) {
        super(id, folders.map((f) => new WorkspaceFolder(f)), transient, configuration, ignorePathCasing);
        this._name = _name;
        this._isUntitled = _isUntitled;
        this._workspaceFolders = [];
        this._structure = TernarySearchTree.forUris(ignorePathCasing, () => true);
        // setup the workspace folder data structure
        folders.forEach((folder) => {
            this._workspaceFolders.push(folder);
            this._structure.set(folder.uri, folder);
        });
    }
    get name() {
        return this._name;
    }
    get isUntitled() {
        return this._isUntitled;
    }
    get workspaceFolders() {
        return this._workspaceFolders.slice(0);
    }
    getWorkspaceFolder(uri, resolveParent) {
        if (resolveParent && this._structure.get(uri)) {
            // `uri` is a workspace folder so we check for its parent
            uri = dirname(uri);
        }
        return this._structure.findSubstr(uri);
    }
    resolveWorkspaceFolder(uri) {
        return this._structure.get(uri);
    }
}
let ExtHostWorkspace = class ExtHostWorkspace {
    constructor(extHostRpc, initData, extHostFileSystemInfo, logService, uriTransformerService) {
        this._onDidChangeWorkspace = new Emitter();
        this.onDidChangeWorkspace = this._onDidChangeWorkspace.event;
        this._onDidGrantWorkspaceTrust = new Emitter();
        this.onDidGrantWorkspaceTrust = this._onDidGrantWorkspaceTrust.event;
        this._activeSearchCallbacks = [];
        this._trusted = false;
        this._editSessionIdentityProviders = new Map();
        // --- edit sessions ---
        this._providerHandlePool = 0;
        this._onWillCreateEditSessionIdentityEvent = new AsyncEmitter();
        // --- canonical uri identity ---
        this._canonicalUriProviders = new Map();
        this._logService = logService;
        this._extHostFileSystemInfo = extHostFileSystemInfo;
        this._uriTransformerService = uriTransformerService;
        this._requestIdProvider = new Counter();
        this._barrier = new Barrier();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadWorkspace);
        this._messageService = extHostRpc.getProxy(MainContext.MainThreadMessageService);
        const data = initData.workspace;
        this._confirmedWorkspace = data
            ? new ExtHostWorkspaceImpl(data.id, data.name, [], !!data.transient, data.configuration ? URI.revive(data.configuration) : null, !!data.isUntitled, (uri) => ignorePathCasing(uri, extHostFileSystemInfo))
            : undefined;
    }
    $initializeWorkspace(data, trusted) {
        this._trusted = trusted;
        this.$acceptWorkspaceData(data);
        this._barrier.open();
    }
    waitForInitializeCall() {
        return this._barrier.wait();
    }
    // --- workspace ---
    get workspace() {
        return this._actualWorkspace;
    }
    get name() {
        return this._actualWorkspace ? this._actualWorkspace.name : undefined;
    }
    get workspaceFile() {
        if (this._actualWorkspace) {
            if (this._actualWorkspace.configuration) {
                if (this._actualWorkspace.isUntitled) {
                    return URI.from({
                        scheme: Schemas.untitled,
                        path: basename(dirname(this._actualWorkspace.configuration)),
                    }); // Untitled Workspace: return untitled URI
                }
                return this._actualWorkspace.configuration; // Workspace: return the configuration location
            }
        }
        return undefined;
    }
    get _actualWorkspace() {
        return this._unconfirmedWorkspace || this._confirmedWorkspace;
    }
    getWorkspaceFolders() {
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.workspaceFolders.slice(0);
    }
    async getWorkspaceFolders2() {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.workspaceFolders.slice(0);
    }
    updateWorkspaceFolders(extension, index, deleteCount, ...workspaceFoldersToAdd) {
        const validatedDistinctWorkspaceFoldersToAdd = [];
        if (Array.isArray(workspaceFoldersToAdd)) {
            workspaceFoldersToAdd.forEach((folderToAdd) => {
                if (URI.isUri(folderToAdd.uri) &&
                    !validatedDistinctWorkspaceFoldersToAdd.some((f) => isFolderEqual(f.uri, folderToAdd.uri, this._extHostFileSystemInfo))) {
                    validatedDistinctWorkspaceFoldersToAdd.push({
                        uri: folderToAdd.uri,
                        name: folderToAdd.name || basenameOrAuthority(folderToAdd.uri),
                    });
                }
            });
        }
        if (!!this._unconfirmedWorkspace) {
            return false; // prevent accumulated calls without a confirmed workspace
        }
        if ([index, deleteCount].some((i) => typeof i !== 'number' || i < 0)) {
            return false; // validate numbers
        }
        if (deleteCount === 0 && validatedDistinctWorkspaceFoldersToAdd.length === 0) {
            return false; // nothing to delete or add
        }
        const currentWorkspaceFolders = this._actualWorkspace
            ? this._actualWorkspace.workspaceFolders
            : [];
        if (index + deleteCount > currentWorkspaceFolders.length) {
            return false; // cannot delete more than we have
        }
        // Simulate the updateWorkspaceFolders method on our data to do more validation
        const newWorkspaceFolders = currentWorkspaceFolders.slice(0);
        newWorkspaceFolders.splice(index, deleteCount, ...validatedDistinctWorkspaceFoldersToAdd.map((f) => ({
            uri: f.uri,
            name: f.name || basenameOrAuthority(f.uri),
            index: undefined /* fixed later */,
        })));
        for (let i = 0; i < newWorkspaceFolders.length; i++) {
            const folder = newWorkspaceFolders[i];
            if (newWorkspaceFolders.some((otherFolder, index) => index !== i && isFolderEqual(folder.uri, otherFolder.uri, this._extHostFileSystemInfo))) {
                return false; // cannot add the same folder multiple times
            }
        }
        newWorkspaceFolders.forEach((f, index) => (f.index = index)); // fix index
        const { added, removed } = delta(currentWorkspaceFolders, newWorkspaceFolders, compareWorkspaceFolderByUriAndNameAndIndex, this._extHostFileSystemInfo);
        if (added.length === 0 && removed.length === 0) {
            return false; // nothing actually changed
        }
        // Trigger on main side
        if (this._proxy) {
            const extName = extension.displayName || extension.name;
            this._proxy
                .$updateWorkspaceFolders(extName, index, deleteCount, validatedDistinctWorkspaceFoldersToAdd)
                .then(undefined, (error) => {
                // in case of an error, make sure to clear out the unconfirmed workspace
                // because we cannot expect the acknowledgement from the main side for this
                this._unconfirmedWorkspace = undefined;
                // show error to user
                const options = {
                    source: {
                        identifier: extension.identifier,
                        label: extension.displayName || extension.name,
                    },
                };
                this._messageService.$showMessage(Severity.Error, localize('updateerror', "Extension '{0}' failed to update workspace folders: {1}", extName, error.toString()), options, []);
            });
        }
        // Try to accept directly
        this.trySetWorkspaceFolders(newWorkspaceFolders);
        return true;
    }
    getWorkspaceFolder(uri, resolveParent) {
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
    }
    async getWorkspaceFolder2(uri, resolveParent) {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
    }
    async resolveWorkspaceFolder(uri) {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.resolveWorkspaceFolder(uri);
    }
    getPath() {
        // this is legacy from the days before having
        // multi-root and we keep it only alive if there
        // is just one workspace folder.
        if (!this._actualWorkspace) {
            return undefined;
        }
        const { folders } = this._actualWorkspace;
        if (folders.length === 0) {
            return undefined;
        }
        // #54483 @Joh Why are we still using fsPath?
        return folders[0].uri.fsPath;
    }
    getRelativePath(pathOrUri, includeWorkspace) {
        let resource;
        let path = '';
        if (typeof pathOrUri === 'string') {
            resource = URI.file(pathOrUri);
            path = pathOrUri;
        }
        else if (typeof pathOrUri !== 'undefined') {
            resource = pathOrUri;
            path = pathOrUri.fsPath;
        }
        if (!resource) {
            return path;
        }
        const folder = this.getWorkspaceFolder(resource, true);
        if (!folder) {
            return path;
        }
        if (typeof includeWorkspace === 'undefined' && this._actualWorkspace) {
            includeWorkspace = this._actualWorkspace.folders.length > 1;
        }
        let result = relativePath(folder.uri, resource);
        if (includeWorkspace && folder.name) {
            result = `${folder.name}/${result}`;
        }
        return result;
    }
    trySetWorkspaceFolders(folders) {
        // Update directly here. The workspace is unconfirmed as long as we did not get an
        // acknowledgement from the main side (via $acceptWorkspaceData)
        if (this._actualWorkspace) {
            this._unconfirmedWorkspace =
                ExtHostWorkspaceImpl.toExtHostWorkspace({
                    id: this._actualWorkspace.id,
                    name: this._actualWorkspace.name,
                    configuration: this._actualWorkspace.configuration,
                    folders,
                    isUntitled: this._actualWorkspace.isUntitled,
                }, this._actualWorkspace, undefined, this._extHostFileSystemInfo).workspace || undefined;
        }
    }
    $acceptWorkspaceData(data) {
        const { workspace, added, removed } = ExtHostWorkspaceImpl.toExtHostWorkspace(data, this._confirmedWorkspace, this._unconfirmedWorkspace, this._extHostFileSystemInfo);
        // Update our workspace object. We have a confirmed workspace, so we drop our
        // unconfirmed workspace.
        this._confirmedWorkspace = workspace || undefined;
        this._unconfirmedWorkspace = undefined;
        // Events
        this._onDidChangeWorkspace.fire(Object.freeze({
            added,
            removed,
        }));
    }
    // --- search ---
    /**
     * Note, null/undefined have different and important meanings for "exclude"
     */
    findFiles(include, exclude, maxResults, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findFiles: fileSearch, extension: ${extensionId.value}, entryPoint: findFiles`);
        let excludeString = '';
        let useFileExcludes = true;
        if (exclude === null) {
            useFileExcludes = false;
        }
        else if (exclude !== undefined) {
            if (typeof exclude === 'string') {
                excludeString = exclude;
            }
            else {
                excludeString = exclude.pattern;
            }
        }
        // todo: consider exclude baseURI if available
        return this._findFilesImpl({ type: 'include', value: include }, {
            exclude: [excludeString],
            maxResults,
            useExcludeSettings: useFileExcludes
                ? ExcludeSettingOptions.FilesExclude
                : ExcludeSettingOptions.None,
            useIgnoreFiles: {
                local: false,
            },
        }, token);
    }
    findFiles2(filePatterns, options = {}, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findFiles2New: fileSearch, extension: ${extensionId.value}, entryPoint: findFiles2New`);
        return this._findFilesImpl({ type: 'filePatterns', value: filePatterns }, options, token);
    }
    async _findFilesImpl(
    // the old `findFiles` used `include` to query, but the new `findFiles2` uses `filePattern` to query.
    // `filePattern` is the proper way to handle this, since it takes less precedence than the ignore files.
    query, options, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve([]);
        }
        const filePatternsToUse = query.type === 'include' ? [query.value] : (query.value ?? []);
        if (!Array.isArray(filePatternsToUse)) {
            console.error('Invalid file pattern provided', filePatternsToUse);
            throw new Error(`Invalid file pattern provided ${JSON.stringify(filePatternsToUse)}`);
        }
        const queryOptions = filePatternsToUse.map((filePattern) => {
            const excludePatterns = globsToISearchPatternBuilder(options.exclude);
            const fileQueries = {
                ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
                disregardIgnoreFiles: typeof options.useIgnoreFiles?.local === 'boolean'
                    ? !options.useIgnoreFiles.local
                    : undefined,
                disregardGlobalIgnoreFiles: typeof options.useIgnoreFiles?.global === 'boolean'
                    ? !options.useIgnoreFiles.global
                    : undefined,
                disregardParentIgnoreFiles: typeof options.useIgnoreFiles?.parent === 'boolean'
                    ? !options.useIgnoreFiles.parent
                    : undefined,
                disregardExcludeSettings: options.useExcludeSettings !== undefined &&
                    options.useExcludeSettings === ExcludeSettingOptions.None,
                disregardSearchExcludeSettings: options.useExcludeSettings !== undefined &&
                    options.useExcludeSettings !== ExcludeSettingOptions.SearchAndFilesExclude,
                maxResults: options.maxResults,
                excludePattern: excludePatterns.length > 0 ? excludePatterns : undefined,
                _reason: 'startFileSearch',
                shouldGlobSearch: query.type === 'include' ? undefined : true,
            };
            const parseInclude = parseSearchExcludeInclude(GlobPattern.from(filePattern));
            const folderToUse = parseInclude?.folder;
            if (query.type === 'include') {
                fileQueries.includePattern = parseInclude?.pattern;
            }
            else {
                fileQueries.filePattern = parseInclude?.pattern;
            }
            return {
                folder: folderToUse,
                options: fileQueries,
            };
        });
        return this._findFilesBase(queryOptions, token);
    }
    async _findFilesBase(queryOptions, token) {
        const result = await Promise.all(queryOptions?.map((option) => this._proxy
            .$startFileSearch(option.folder ?? null, option.options, token)
            .then((data) => (Array.isArray(data) ? data.map((d) => URI.revive(d)) : []))) ?? []);
        return result.flat();
    }
    findTextInFiles2(query, options, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findTextInFiles2: textSearch, extension: ${extensionId.value}, entryPoint: findTextInFiles2`);
        const getOptions = (include) => {
            if (!options) {
                return {
                    folder: undefined,
                    options: {},
                };
            }
            const parsedInclude = include
                ? parseSearchExcludeInclude(GlobPattern.from(include))
                : undefined;
            const excludePatterns = options.exclude
                ? globsToISearchPatternBuilder(options.exclude)
                : undefined;
            return {
                options: {
                    ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
                    disregardIgnoreFiles: typeof options.useIgnoreFiles === 'boolean' ? !options.useIgnoreFiles : undefined,
                    disregardGlobalIgnoreFiles: typeof options.useIgnoreFiles?.global === 'boolean'
                        ? !options.useIgnoreFiles?.global
                        : undefined,
                    disregardParentIgnoreFiles: typeof options.useIgnoreFiles?.parent === 'boolean'
                        ? !options.useIgnoreFiles?.parent
                        : undefined,
                    disregardExcludeSettings: options.useExcludeSettings !== undefined &&
                        options.useExcludeSettings === ExcludeSettingOptions.None,
                    disregardSearchExcludeSettings: options.useExcludeSettings !== undefined &&
                        options.useExcludeSettings !== ExcludeSettingOptions.SearchAndFilesExclude,
                    fileEncoding: options.encoding,
                    maxResults: options.maxResults,
                    previewOptions: options.previewOptions
                        ? {
                            matchLines: options.previewOptions?.numMatchLines ?? 100,
                            charsPerLine: options.previewOptions?.charsPerLine ?? 10000,
                        }
                        : undefined,
                    surroundingContext: options.surroundingContext,
                    includePattern: parsedInclude?.pattern,
                    excludePattern: excludePatterns,
                },
                folder: parsedInclude?.folder,
            };
        };
        const queryOptionsRaw = options?.include?.map((include) => getOptions(include)) ?? [getOptions(undefined)];
        const queryOptions = queryOptionsRaw.filter((queryOps) => !!queryOps);
        const disposables = new DisposableStore();
        const progressEmitter = disposables.add(new Emitter());
        const complete = this.findTextInFilesBase(query, queryOptions, (result, uri) => progressEmitter.fire({ result, uri }), token);
        const asyncIterable = new AsyncIterableObject(async (emitter) => {
            disposables.add(progressEmitter.event((e) => {
                const result = e.result;
                const uri = e.uri;
                if (resultIsMatch(result)) {
                    emitter.emitOne(new TextSearchMatch2(uri, result.rangeLocations.map((range) => ({
                        previewRange: new Range(range.preview.startLineNumber, range.preview.startColumn, range.preview.endLineNumber, range.preview.endColumn),
                        sourceRange: new Range(range.source.startLineNumber, range.source.startColumn, range.source.endLineNumber, range.source.endColumn),
                    })), result.previewText));
                }
                else {
                    emitter.emitOne(new TextSearchContext2(uri, result.text, result.lineNumber));
                }
            }));
            await complete;
        });
        return {
            results: asyncIterable,
            complete: complete.then((e) => {
                disposables.dispose();
                return {
                    limitHit: e?.limitHit ?? false,
                };
            }),
        };
    }
    async findTextInFilesBase(query, queryOptions, callback, token = CancellationToken.None) {
        const requestId = this._requestIdProvider.getNext();
        let isCanceled = false;
        token.onCancellationRequested((_) => {
            isCanceled = true;
        });
        this._activeSearchCallbacks[requestId] = (p) => {
            if (isCanceled) {
                return;
            }
            const uri = URI.revive(p.resource);
            p.results.forEach((rawResult) => {
                const result = revive(rawResult);
                callback(result, uri);
            });
        };
        if (token.isCancellationRequested) {
            return {};
        }
        try {
            const result = await Promise.all(queryOptions?.map((option) => this._proxy.$startTextSearch(query, option.folder ?? null, option.options, requestId, token) || {}) ?? []);
            delete this._activeSearchCallbacks[requestId];
            return (result.reduce((acc, val) => {
                return {
                    limitHit: acc?.limitHit || (val?.limitHit ?? false),
                    message: [acc?.message ?? [], val?.message ?? []].flat(),
                };
            }, {}) ?? { limitHit: false });
        }
        catch (err) {
            delete this._activeSearchCallbacks[requestId];
            throw err;
        }
    }
    async findTextInFiles(query, options, callback, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findTextInFiles: textSearch, extension: ${extensionId.value}, entryPoint: findTextInFiles`);
        const previewOptions = typeof options.previewOptions === 'undefined'
            ? {
                matchLines: 100,
                charsPerLine: 10000,
            }
            : options.previewOptions;
        const parsedInclude = parseSearchExcludeInclude(GlobPattern.from(options.include));
        const excludePattern = typeof options.exclude === 'string'
            ? options.exclude
            : options.exclude
                ? options.exclude.pattern
                : undefined;
        const queryOptions = {
            ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
            disregardIgnoreFiles: typeof options.useIgnoreFiles === 'boolean' ? !options.useIgnoreFiles : undefined,
            disregardGlobalIgnoreFiles: typeof options.useGlobalIgnoreFiles === 'boolean'
                ? !options.useGlobalIgnoreFiles
                : undefined,
            disregardParentIgnoreFiles: typeof options.useParentIgnoreFiles === 'boolean'
                ? !options.useParentIgnoreFiles
                : undefined,
            disregardExcludeSettings: typeof options.useDefaultExcludes === 'boolean' ? !options.useDefaultExcludes : true,
            disregardSearchExcludeSettings: typeof options.useSearchExclude === 'boolean' ? !options.useSearchExclude : true,
            fileEncoding: options.encoding,
            maxResults: options.maxResults,
            previewOptions,
            surroundingContext: options.afterContext, // TODO: remove ability to have before/after context separately
            includePattern: parsedInclude?.pattern,
            excludePattern: excludePattern ? [{ pattern: excludePattern }] : undefined,
        };
        const progress = (result, uri) => {
            if (resultIsMatch(result)) {
                callback({
                    uri,
                    preview: {
                        text: result.previewText,
                        matches: mapArrayOrNot(result.rangeLocations, (m) => new Range(m.preview.startLineNumber, m.preview.startColumn, m.preview.endLineNumber, m.preview.endColumn)),
                    },
                    ranges: mapArrayOrNot(result.rangeLocations, (r) => new Range(r.source.startLineNumber, r.source.startColumn, r.source.endLineNumber, r.source.endColumn)),
                });
            }
            else {
                callback({
                    uri,
                    text: result.text,
                    lineNumber: result.lineNumber,
                });
            }
        };
        return this.findTextInFilesBase(query, [{ options: queryOptions, folder: parsedInclude?.folder }], progress, token);
    }
    $handleTextSearchResult(result, requestId) {
        this._activeSearchCallbacks[requestId]?.(result);
    }
    async save(uri) {
        const result = await this._proxy.$save(uri, { saveAs: false });
        return URI.revive(result);
    }
    async saveAs(uri) {
        const result = await this._proxy.$save(uri, { saveAs: true });
        return URI.revive(result);
    }
    saveAll(includeUntitled) {
        return this._proxy.$saveAll(includeUntitled);
    }
    resolveProxy(url) {
        return this._proxy.$resolveProxy(url);
    }
    lookupAuthorization(authInfo) {
        return this._proxy.$lookupAuthorization(authInfo);
    }
    lookupKerberosAuthorization(url) {
        return this._proxy.$lookupKerberosAuthorization(url);
    }
    loadCertificates() {
        return this._proxy.$loadCertificates();
    }
    // --- trust ---
    get trusted() {
        return this._trusted;
    }
    requestWorkspaceTrust(options) {
        return this._proxy.$requestWorkspaceTrust(options);
    }
    $onDidGrantWorkspaceTrust() {
        if (!this._trusted) {
            this._trusted = true;
            this._onDidGrantWorkspaceTrust.fire();
        }
    }
    // called by ext host
    registerEditSessionIdentityProvider(scheme, provider) {
        if (this._editSessionIdentityProviders.has(scheme)) {
            throw new Error(`A provider has already been registered for scheme ${scheme}`);
        }
        this._editSessionIdentityProviders.set(scheme, provider);
        const outgoingScheme = this._uriTransformerService.transformOutgoingScheme(scheme);
        const handle = this._providerHandlePool++;
        this._proxy.$registerEditSessionIdentityProvider(handle, outgoingScheme);
        return toDisposable(() => {
            this._editSessionIdentityProviders.delete(scheme);
            this._proxy.$unregisterEditSessionIdentityProvider(handle);
        });
    }
    // called by main thread
    async $getEditSessionIdentifier(workspaceFolder, cancellationToken) {
        this._logService.info('Getting edit session identifier for workspaceFolder', workspaceFolder);
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (!folder) {
            this._logService.warn('Unable to resolve workspace folder');
            return undefined;
        }
        this._logService.info('Invoking #provideEditSessionIdentity for workspaceFolder', folder);
        const provider = this._editSessionIdentityProviders.get(folder.uri.scheme);
        this._logService.info(`Provider for scheme ${folder.uri.scheme} is defined: `, !!provider);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideEditSessionIdentity(folder, cancellationToken);
        this._logService.info('Provider returned edit session identifier: ', result);
        if (!result) {
            return undefined;
        }
        return result;
    }
    async $provideEditSessionIdentityMatch(workspaceFolder, identity1, identity2, cancellationToken) {
        this._logService.info('Getting edit session identifier for workspaceFolder', workspaceFolder);
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (!folder) {
            this._logService.warn('Unable to resolve workspace folder');
            return undefined;
        }
        this._logService.info('Invoking #provideEditSessionIdentity for workspaceFolder', folder);
        const provider = this._editSessionIdentityProviders.get(folder.uri.scheme);
        this._logService.info(`Provider for scheme ${folder.uri.scheme} is defined: `, !!provider);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideEditSessionIdentityMatch?.(identity1, identity2, cancellationToken);
        this._logService.info('Provider returned edit session identifier match result: ', result);
        if (!result) {
            return undefined;
        }
        return result;
    }
    getOnWillCreateEditSessionIdentityEvent(extension) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) {
                listener.call(thisArg, e);
            };
            wrappedListener.extension = extension;
            return this._onWillCreateEditSessionIdentityEvent.event(wrappedListener, undefined, disposables);
        };
    }
    // main thread calls this to trigger participants
    async $onWillCreateEditSessionIdentity(workspaceFolder, token, timeout) {
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (folder === undefined) {
            throw new Error('Unable to resolve workspace folder');
        }
        await this._onWillCreateEditSessionIdentityEvent.fireAsync({ workspaceFolder: folder }, token, async (thenable, listener) => {
            const now = Date.now();
            await Promise.resolve(thenable);
            if (Date.now() - now > timeout) {
                this._logService.warn('SLOW edit session create-participant', listener.extension
                    .identifier);
            }
        });
        if (token.isCancellationRequested) {
            return undefined;
        }
    }
    // called by ext host
    registerCanonicalUriProvider(scheme, provider) {
        if (this._canonicalUriProviders.has(scheme)) {
            throw new Error(`A provider has already been registered for scheme ${scheme}`);
        }
        this._canonicalUriProviders.set(scheme, provider);
        const outgoingScheme = this._uriTransformerService.transformOutgoingScheme(scheme);
        const handle = this._providerHandlePool++;
        this._proxy.$registerCanonicalUriProvider(handle, outgoingScheme);
        return toDisposable(() => {
            this._canonicalUriProviders.delete(scheme);
            this._proxy.$unregisterCanonicalUriProvider(handle);
        });
    }
    async provideCanonicalUri(uri, options, cancellationToken) {
        const provider = this._canonicalUriProviders.get(uri.scheme);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideCanonicalUri?.(URI.revive(uri), options, cancellationToken);
        if (!result) {
            return undefined;
        }
        return result;
    }
    // called by main thread
    async $provideCanonicalUri(uri, targetScheme, cancellationToken) {
        return this.provideCanonicalUri(URI.revive(uri), { targetScheme }, cancellationToken);
    }
    // --- encodings ---
    decode(content, uri, options) {
        return this._proxy.$decode(VSBuffer.wrap(content), uri, options);
    }
    async encode(content, uri, options) {
        const buff = await this._proxy.$encode(content, uri, options);
        return buff.buffer;
    }
};
ExtHostWorkspace = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostFileSystemInfo),
    __param(3, ILogService),
    __param(4, IURITransformerService)
], ExtHostWorkspace);
export { ExtHostWorkspace };
export const IExtHostWorkspace = createDecorator('IExtHostWorkspace');
function parseSearchExcludeInclude(include) {
    let pattern;
    let includeFolder;
    if (include) {
        if (typeof include === 'string') {
            pattern = include;
        }
        else {
            pattern = include.pattern;
            includeFolder = URI.revive(include.baseUri);
        }
        return {
            pattern,
            folder: includeFolder,
        };
    }
    return undefined;
}
function globsToISearchPatternBuilder(excludes) {
    return (excludes?.map((exclude) => {
        if (typeof exclude === 'string') {
            if (exclude === '') {
                return undefined;
            }
            return {
                pattern: exclude,
                uri: undefined,
            };
        }
        else {
            const parsedExclude = parseSearchExcludeInclude(exclude);
            if (!parsedExclude) {
                return undefined;
            }
            return {
                pattern: parsedExclude.pattern,
                uri: parsedExclude.folder,
            };
        }
    }) ?? []).filter((e) => !!e);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXb3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFDTixRQUFRLEVBQ1IsbUJBQW1CLEVBQ25CLE9BQU8sRUFDUCxNQUFNLEVBQ04sWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBTTFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNB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