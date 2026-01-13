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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxJQUFJLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUNOLFFBQVEsRUFDUixtQkFBbUIsRUFDbkIsT0FBTyxFQUNQLE1BQU0sRUFDTixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFNMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8s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