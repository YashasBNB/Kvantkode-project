/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import * as files from '../../../platform/files/common/files.js';
import { Cache } from './cache.js';
import { MainContext, } from './extHost.protocol.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult, } from './extHostCommands.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostCell, ExtHostNotebookDocument } from './extHostNotebookDocument.js';
import { ExtHostNotebookEditor } from './extHostNotebookEditor.js';
import { filter } from '../../../base/common/objects.js';
import { Schemas } from '../../../base/common/network.js';
import { CellSearchModel } from '../../contrib/search/common/cellSearchModel.js';
import { genericCellMatchesToTextSearchMatches, } from '../../contrib/search/common/searchNotebookHelpers.js';
import { globMatchesResource, RegisteredEditorPriority, } from '../../services/editor/common/editorResolverService.js';
export class ExtHostNotebookController {
    static { this._notebookStatusBarItemProviderHandlePool = 0; }
    get activeNotebookEditor() {
        return this._activeNotebookEditor?.apiEditor;
    }
    get visibleNotebookEditors() {
        return this._visibleNotebookEditors.map((editor) => editor.apiEditor);
    }
    constructor(mainContext, commands, _textDocumentsAndEditors, _textDocuments, _extHostFileSystem, _extHostSearch, _logService) {
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._textDocuments = _textDocuments;
        this._extHostFileSystem = _extHostFileSystem;
        this._extHostSearch = _extHostSearch;
        this._logService = _logService;
        this._notebookStatusBarItemProviders = new Map();
        this._documents = new ResourceMap();
        this._editors = new Map();
        this._onDidChangeActiveNotebookEditor = new Emitter();
        this.onDidChangeActiveNotebookEditor = this._onDidChangeActiveNotebookEditor.event;
        this._visibleNotebookEditors = [];
        this._onDidOpenNotebookDocument = new Emitter();
        this.onDidOpenNotebookDocument = this._onDidOpenNotebookDocument.event;
        this._onDidCloseNotebookDocument = new Emitter();
        this.onDidCloseNotebookDocument = this._onDidCloseNotebookDocument.event;
        this._onDidChangeVisibleNotebookEditors = new Emitter();
        this.onDidChangeVisibleNotebookEditors = this._onDidChangeVisibleNotebookEditors.event;
        this._statusBarCache = new Cache('NotebookCellStatusBarCache');
        // --- serialize/deserialize
        this._handlePool = 0;
        this._notebookSerializer = new Map();
        this._notebookProxy = mainContext.getProxy(MainContext.MainThreadNotebook);
        this._notebookDocumentsProxy = mainContext.getProxy(MainContext.MainThreadNotebookDocuments);
        this._notebookEditorsProxy = mainContext.getProxy(MainContext.MainThreadNotebookEditors);
        this._commandsConverter = commands.converter;
        commands.registerArgumentProcessor({
            // Serialized INotebookCellActionContext
            processArgument: (arg) => {
                if (arg && arg.$mid === 13 /* MarshalledId.NotebookCellActionContext */) {
                    const notebookUri = arg.notebookEditor?.notebookUri;
                    const cellHandle = arg.cell.handle;
                    const data = this._documents.get(notebookUri);
                    const cell = data?.getCell(cellHandle);
                    if (cell) {
                        return cell.apiCell;
                    }
                }
                if (arg && arg.$mid === 14 /* MarshalledId.NotebookActionContext */) {
                    const notebookUri = arg.uri;
                    const data = this._documents.get(notebookUri);
                    if (data) {
                        return data.apiNotebook;
                    }
                }
                return arg;
            },
        });
        ExtHostNotebookController._registerApiCommands(commands);
    }
    getEditorById(editorId) {
        const editor = this._editors.get(editorId);
        if (!editor) {
            throw new Error(`unknown text editor: ${editorId}. known editors: ${[...this._editors.keys()]} `);
        }
        return editor;
    }
    getIdByEditor(editor) {
        for (const [id, candidate] of this._editors) {
            if (candidate.apiEditor === editor) {
                return id;
            }
        }
        return undefined;
    }
    get notebookDocuments() {
        return [...this._documents.values()];
    }
    getNotebookDocument(uri, relaxed) {
        const result = this._documents.get(uri);
        if (!result && !relaxed) {
            throw new Error(`NO notebook document for '${uri}'`);
        }
        return result;
    }
    static _convertNotebookRegistrationData(extension, registration) {
        if (!registration) {
            return;
        }
        const viewOptionsFilenamePattern = registration.filenamePattern
            .map((pattern) => typeConverters.NotebookExclusiveDocumentPattern.from(pattern))
            .filter((pattern) => pattern !== undefined);
        if (registration.filenamePattern && !viewOptionsFilenamePattern) {
            console.warn(`Notebook content provider view options file name pattern is invalid ${registration.filenamePattern}`);
            return undefined;
        }
        return {
            extension: extension.identifier,
            providerDisplayName: extension.displayName || extension.name,
            displayName: registration.displayName,
            filenamePattern: viewOptionsFilenamePattern,
            priority: registration.exclusive ? RegisteredEditorPriority.exclusive : undefined,
        };
    }
    registerNotebookCellStatusBarItemProvider(extension, notebookType, provider) {
        const handle = ExtHostNotebookController._notebookStatusBarItemProviderHandlePool++;
        const eventHandle = typeof provider.onDidChangeCellStatusBarItems === 'function'
            ? ExtHostNotebookController._notebookStatusBarItemProviderHandlePool++
            : undefined;
        this._notebookStatusBarItemProviders.set(handle, provider);
        this._notebookProxy.$registerNotebookCellStatusBarItemProvider(handle, eventHandle, notebookType);
        let subscription;
        if (eventHandle !== undefined) {
            subscription = provider.onDidChangeCellStatusBarItems((_) => this._notebookProxy.$emitCellStatusBarEvent(eventHandle));
        }
        return new extHostTypes.Disposable(() => {
            this._notebookStatusBarItemProviders.delete(handle);
            this._notebookProxy.$unregisterNotebookCellStatusBarItemProvider(handle, eventHandle);
            subscription?.dispose();
        });
    }
    async createNotebookDocument(options) {
        const canonicalUri = await this._notebookDocumentsProxy.$tryCreateNotebook({
            viewType: options.viewType,
            content: options.content && typeConverters.NotebookData.from(options.content),
        });
        return URI.revive(canonicalUri);
    }
    async openNotebookDocument(uri) {
        const cached = this._documents.get(uri);
        if (cached) {
            return cached.apiNotebook;
        }
        const canonicalUri = await this._notebookDocumentsProxy.$tryOpenNotebook(uri);
        const document = this._documents.get(URI.revive(canonicalUri));
        return assertIsDefined(document?.apiNotebook);
    }
    async showNotebookDocument(notebook, options) {
        let resolvedOptions;
        if (typeof options === 'object') {
            resolvedOptions = {
                position: typeConverters.ViewColumn.from(options.viewColumn),
                preserveFocus: options.preserveFocus,
                selections: options.selections && options.selections.map(typeConverters.NotebookRange.from),
                pinned: typeof options.preview === 'boolean' ? !options.preview : undefined,
                label: typeof options.asRepl === 'string'
                    ? options.asRepl
                    : typeof options.asRepl === 'object'
                        ? options.asRepl.label
                        : undefined,
            };
        }
        else {
            resolvedOptions = {
                preserveFocus: false,
                pinned: true,
            };
        }
        const viewType = !!options?.asRepl ? 'repl' : notebook.notebookType;
        const editorId = await this._notebookEditorsProxy.$tryShowNotebookDocument(notebook.uri, viewType, resolvedOptions);
        const editor = editorId && this._editors.get(editorId)?.apiEditor;
        if (editor) {
            return editor;
        }
        if (editorId) {
            throw new Error(`Could NOT open editor for "${notebook.uri.toString()}" because another editor opened in the meantime.`);
        }
        else {
            throw new Error(`Could NOT open editor for "${notebook.uri.toString()}".`);
        }
    }
    async $provideNotebookCellStatusBarItems(handle, uri, index, token) {
        const provider = this._notebookStatusBarItemProviders.get(handle);
        const revivedUri = URI.revive(uri);
        const document = this._documents.get(revivedUri);
        if (!document || !provider) {
            return;
        }
        const cell = document.getCellFromIndex(index);
        if (!cell) {
            return;
        }
        const result = await provider.provideCellStatusBarItems(cell.apiCell, token);
        if (!result) {
            return undefined;
        }
        const disposables = new DisposableStore();
        const cacheId = this._statusBarCache.add([disposables]);
        const resultArr = Array.isArray(result) ? result : [result];
        const items = resultArr.map((item) => typeConverters.NotebookStatusBarItem.from(item, this._commandsConverter, disposables));
        return {
            cacheId,
            items,
        };
    }
    $releaseNotebookCellStatusBarItems(cacheId) {
        this._statusBarCache.delete(cacheId);
    }
    registerNotebookSerializer(extension, viewType, serializer, options, registration) {
        if (isFalsyOrWhitespace(viewType)) {
            throw new Error(`viewType cannot be empty or just whitespace`);
        }
        const handle = this._handlePool++;
        this._notebookSerializer.set(handle, { viewType, serializer, options });
        this._notebookProxy.$registerNotebookSerializer(handle, { id: extension.identifier, location: extension.extensionLocation }, viewType, typeConverters.NotebookDocumentContentOptions.from(options), ExtHostNotebookController._convertNotebookRegistrationData(extension, registration));
        return toDisposable(() => {
            this._notebookProxy.$unregisterNotebookSerializer(handle);
        });
    }
    async $dataToNotebook(handle, bytes, token) {
        const serializer = this._notebookSerializer.get(handle);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const data = await serializer.serializer.deserializeNotebook(bytes.buffer, token);
        return new SerializableObjectWithBuffers(typeConverters.NotebookData.from(data));
    }
    async $notebookToData(handle, data, token) {
        const serializer = this._notebookSerializer.get(handle);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const bytes = await serializer.serializer.serializeNotebook(typeConverters.NotebookData.to(data.value), token);
        return VSBuffer.wrap(bytes);
    }
    async $saveNotebook(handle, uriComponents, versionId, options, token) {
        const uri = URI.revive(uriComponents);
        const serializer = this._notebookSerializer.get(handle);
        this.trace(`enter saveNotebook(versionId: ${versionId}, ${uri.toString()})`);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const document = this._documents.get(uri);
        if (!document) {
            throw new Error('Document NOT found');
        }
        if (document.versionId !== versionId) {
            throw new Error('Document version mismatch');
        }
        if (!this._extHostFileSystem.value.isWritableFileSystem(uri.scheme)) {
            throw new files.FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this._resourceForError(uri)), 6 /* files.FileOperationResult.FILE_PERMISSION_DENIED */);
        }
        const data = {
            metadata: filter(document.apiNotebook.metadata, (key) => !(serializer.options?.transientDocumentMetadata ?? {})[key]),
            cells: [],
        };
        // this data must be retrieved before any async calls to ensure the data is for the correct version
        for (const cell of document.apiNotebook.getCells()) {
            const cellData = new extHostTypes.NotebookCellData(cell.kind, cell.document.getText(), cell.document.languageId, cell.mime, !serializer.options?.transientOutputs ? [...cell.outputs] : [], cell.metadata, cell.executionSummary);
            cellData.metadata = filter(cell.metadata, (key) => !(serializer.options?.transientCellMetadata ?? {})[key]);
            data.cells.push(cellData);
        }
        // validate write
        await this._validateWriteFile(uri, options);
        if (token.isCancellationRequested) {
            throw new Error('canceled');
        }
        const bytes = await serializer.serializer.serializeNotebook(data, token);
        if (token.isCancellationRequested) {
            throw new Error('canceled');
        }
        // Don't accept any cancellation beyond this point, we need to report the result of the file write
        this.trace(`serialized versionId: ${versionId} ${uri.toString()}`);
        await this._extHostFileSystem.value.writeFile(uri, bytes);
        this.trace(`Finished write versionId: ${versionId} ${uri.toString()}`);
        const providerExtUri = this._extHostFileSystem.getFileSystemProviderExtUri(uri.scheme);
        const stat = await this._extHostFileSystem.value.stat(uri);
        const fileStats = {
            name: providerExtUri.basename(uri),
            isFile: (stat.type & files.FileType.File) !== 0,
            isDirectory: (stat.type & files.FileType.Directory) !== 0,
            isSymbolicLink: (stat.type & files.FileType.SymbolicLink) !== 0,
            mtime: stat.mtime,
            ctime: stat.ctime,
            size: stat.size,
            readonly: Boolean((stat.permissions ?? 0) & files.FilePermission.Readonly) ||
                !this._extHostFileSystem.value.isWritableFileSystem(uri.scheme),
            locked: Boolean((stat.permissions ?? 0) & files.FilePermission.Locked),
            etag: files.etag({ mtime: stat.mtime, size: stat.size }),
            children: undefined,
        };
        this.trace(`exit saveNotebook(versionId: ${versionId}, ${uri.toString()})`);
        return fileStats;
    }
    /**
     * Search for query in all notebooks that can be deserialized by the serializer fetched by `handle`.
     *
     * @param handle used to get notebook serializer
     * @param textQuery the text query to search using
     * @param viewTypeFileTargets the globs (and associated ranks) that are targetting for opening this type of notebook
     * @param otherViewTypeFileTargets ranked globs for other editors that we should consider when deciding whether it will open as this notebook
     * @param token cancellation token
     * @returns `IRawClosedNotebookFileMatch` for every file. Files without matches will just have a `IRawClosedNotebookFileMatch`
     * 	with no `cellResults`. This allows the caller to know what was searched in already, even if it did not yield results.
     */
    async $searchInNotebooks(handle, textQuery, viewTypeFileTargets, otherViewTypeFileTargets, token) {
        const serializer = this._notebookSerializer.get(handle)?.serializer;
        if (!serializer) {
            return {
                limitHit: false,
                results: [],
            };
        }
        const finalMatchedTargets = new ResourceSet();
        const runFileQueries = async (includes, token, textQuery) => {
            await Promise.all(includes.map(async (include) => await Promise.all(include.filenamePatterns.map((filePattern) => {
                const query = {
                    _reason: textQuery._reason,
                    folderQueries: textQuery.folderQueries,
                    includePattern: textQuery.includePattern,
                    excludePattern: textQuery.excludePattern,
                    maxResults: textQuery.maxResults,
                    type: 1 /* QueryType.File */,
                    filePattern,
                };
                // use priority info to exclude info from other globs
                return this._extHostSearch
                    .doInternalFileSearchWithCustomCallback(query, token, (data) => {
                    data.forEach((uri) => {
                        if (finalMatchedTargets.has(uri)) {
                            return;
                        }
                        const hasOtherMatches = otherViewTypeFileTargets.some((target) => {
                            // use the same strategy that the editor service uses to open editors
                            // https://github.com/microsoft/vscode/blob/ac1631528e67637da65ec994c6dc35d73f6e33cc/src/vs/workbench/services/editor/browser/editorResolverService.ts#L359-L366
                            if (include.isFromSettings && !target.isFromSettings) {
                                // if the include is from the settings and target isn't, even if it matches, it's still overridden.
                                return false;
                            }
                            else {
                                // longer filePatterns are considered more specifc, so they always have precedence the shorter patterns
                                return target.filenamePatterns.some((targetFilePattern) => globMatchesResource(targetFilePattern, uri));
                            }
                        });
                        if (hasOtherMatches) {
                            return;
                        }
                        finalMatchedTargets.add(uri);
                    });
                })
                    .catch((err) => {
                    // temporary fix for https://github.com/microsoft/vscode/issues/205044: don't show notebook results for remotehub repos.
                    if (err.code === 'ENOENT') {
                        console.warn(`Could not find notebook search results, ignoring notebook results.`);
                        return {
                            limitHit: false,
                            messages: [],
                        };
                    }
                    else {
                        throw err;
                    }
                });
            }))));
            return;
        };
        await runFileQueries(viewTypeFileTargets, token, textQuery);
        const results = new ResourceMap();
        let limitHit = false;
        const promises = Array.from(finalMatchedTargets).map(async (uri) => {
            const cellMatches = [];
            try {
                if (token.isCancellationRequested) {
                    return;
                }
                if (textQuery.maxResults &&
                    [...results.values()].reduce((acc, value) => acc + value.cellResults.length, 0) >
                        textQuery.maxResults) {
                    limitHit = true;
                    return;
                }
                const simpleCells = [];
                const notebook = this._documents.get(uri);
                if (notebook) {
                    const cells = notebook.apiNotebook.getCells();
                    cells.forEach((e) => simpleCells.push({
                        input: e.document.getText(),
                        outputs: e.outputs.flatMap((value) => value.items.map((output) => output.data.toString())),
                    }));
                }
                else {
                    const fileContent = await this._extHostFileSystem.value.readFile(uri);
                    const bytes = VSBuffer.fromString(fileContent.toString());
                    const notebook = await serializer.deserializeNotebook(bytes.buffer, token);
                    if (token.isCancellationRequested) {
                        return;
                    }
                    const data = typeConverters.NotebookData.from(notebook);
                    data.cells.forEach((cell) => simpleCells.push({
                        input: cell.source,
                        outputs: cell.outputs.flatMap((value) => value.items.map((output) => output.valueBytes.toString())),
                    }));
                }
                if (token.isCancellationRequested) {
                    return;
                }
                simpleCells.forEach((cell, index) => {
                    const target = textQuery.contentPattern.pattern;
                    const cellModel = new CellSearchModel(cell.input, undefined, cell.outputs);
                    const inputMatches = cellModel.findInInputs(target);
                    const outputMatches = cellModel.findInOutputs(target);
                    const webviewResults = outputMatches
                        .flatMap((outputMatch) => genericCellMatchesToTextSearchMatches(outputMatch.matches, outputMatch.textBuffer))
                        .map((textMatch, index) => {
                        textMatch.webviewIndex = index;
                        return textMatch;
                    });
                    if (inputMatches.length > 0 || outputMatches.length > 0) {
                        const cellMatch = {
                            index: index,
                            contentResults: genericCellMatchesToTextSearchMatches(inputMatches, cellModel.inputTextBuffer),
                            webviewResults,
                        };
                        cellMatches.push(cellMatch);
                    }
                });
                const fileMatch = {
                    resource: uri,
                    cellResults: cellMatches,
                };
                results.set(uri, fileMatch);
                return;
            }
            catch (e) {
                return;
            }
        });
        await Promise.all(promises);
        return {
            limitHit,
            results: [...results.values()],
        };
    }
    async _validateWriteFile(uri, options) {
        const stat = await this._extHostFileSystem.value.stat(uri);
        // Dirty write prevention
        if (typeof options?.mtime === 'number' &&
            typeof options.etag === 'string' &&
            options.etag !== files.ETAG_DISABLED &&
            typeof stat.mtime === 'number' &&
            typeof stat.size === 'number' &&
            options.mtime < stat.mtime &&
            options.etag !==
                files.etag({
                    mtime: options.mtime /* not using stat.mtime for a reason, see above */,
                    size: stat.size,
                })) {
            throw new files.FileOperationError(localize('fileModifiedError', 'File Modified Since'), 3 /* files.FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
        return;
    }
    _resourceForError(uri) {
        return uri.scheme === Schemas.file ? uri.fsPath : uri.toString();
    }
    // --- open, save, saveAs, backup
    _createExtHostEditor(document, editorId, data) {
        if (this._editors.has(editorId)) {
            throw new Error(`editor with id ALREADY EXSIST: ${editorId}`);
        }
        const editor = new ExtHostNotebookEditor(editorId, this._notebookEditorsProxy, document, data.visibleRanges.map(typeConverters.NotebookRange.to), data.selections.map(typeConverters.NotebookRange.to), typeof data.viewColumn === 'number'
            ? typeConverters.ViewColumn.to(data.viewColumn)
            : undefined, data.viewType);
        this._editors.set(editorId, editor);
    }
    $acceptDocumentAndEditorsDelta(delta) {
        if (delta.value.removedDocuments) {
            for (const uri of delta.value.removedDocuments) {
                const revivedUri = URI.revive(uri);
                const document = this._documents.get(revivedUri);
                if (document) {
                    document.dispose();
                    this._documents.delete(revivedUri);
                    this._textDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
                        removedDocuments: document.apiNotebook.getCells().map((cell) => cell.document.uri),
                    });
                    this._onDidCloseNotebookDocument.fire(document.apiNotebook);
                }
                for (const editor of this._editors.values()) {
                    if (editor.notebookData.uri.toString() === revivedUri.toString()) {
                        this._editors.delete(editor.id);
                    }
                }
            }
        }
        if (delta.value.addedDocuments) {
            const addedCellDocuments = [];
            for (const modelData of delta.value.addedDocuments) {
                const uri = URI.revive(modelData.uri);
                if (this._documents.has(uri)) {
                    throw new Error(`adding EXISTING notebook ${uri} `);
                }
                const document = new ExtHostNotebookDocument(this._notebookDocumentsProxy, this._textDocumentsAndEditors, this._textDocuments, uri, modelData);
                // add cell document as vscode.TextDocument
                addedCellDocuments.push(...modelData.cells.map((cell) => ExtHostCell.asModelAddData(cell)));
                this._documents.get(uri)?.dispose();
                this._documents.set(uri, document);
                this._textDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
                    addedDocuments: addedCellDocuments,
                });
                this._onDidOpenNotebookDocument.fire(document.apiNotebook);
            }
        }
        if (delta.value.addedEditors) {
            for (const editorModelData of delta.value.addedEditors) {
                if (this._editors.has(editorModelData.id)) {
                    return;
                }
                const revivedUri = URI.revive(editorModelData.documentUri);
                const document = this._documents.get(revivedUri);
                if (document) {
                    this._createExtHostEditor(document, editorModelData.id, editorModelData);
                }
            }
        }
        const removedEditors = [];
        if (delta.value.removedEditors) {
            for (const editorid of delta.value.removedEditors) {
                const editor = this._editors.get(editorid);
                if (editor) {
                    this._editors.delete(editorid);
                    if (this._activeNotebookEditor?.id === editor.id) {
                        this._activeNotebookEditor = undefined;
                    }
                    removedEditors.push(editor);
                }
            }
        }
        if (delta.value.visibleEditors) {
            this._visibleNotebookEditors = delta.value.visibleEditors
                .map((id) => this._editors.get(id))
                .filter((editor) => !!editor);
            const visibleEditorsSet = new Set();
            this._visibleNotebookEditors.forEach((editor) => visibleEditorsSet.add(editor.id));
            for (const editor of this._editors.values()) {
                const newValue = visibleEditorsSet.has(editor.id);
                editor._acceptVisibility(newValue);
            }
            this._visibleNotebookEditors = [...this._editors.values()]
                .map((e) => e)
                .filter((e) => e.visible);
            this._onDidChangeVisibleNotebookEditors.fire(this.visibleNotebookEditors);
        }
        if (delta.value.newActiveEditor === null) {
            // clear active notebook as current active editor is non-notebook editor
            this._activeNotebookEditor = undefined;
        }
        else if (delta.value.newActiveEditor) {
            const activeEditor = this._editors.get(delta.value.newActiveEditor);
            if (!activeEditor) {
                console.error(`FAILED to find active notebook editor ${delta.value.newActiveEditor}`);
            }
            this._activeNotebookEditor = this._editors.get(delta.value.newActiveEditor);
        }
        if (delta.value.newActiveEditor !== undefined) {
            this._onDidChangeActiveNotebookEditor.fire(this._activeNotebookEditor?.apiEditor);
        }
    }
    static _registerApiCommands(extHostCommands) {
        const notebookTypeArg = ApiCommandArgument.String.with('notebookType', 'A notebook type');
        const commandDataToNotebook = new ApiCommand('vscode.executeDataToNotebook', '_executeDataToNotebook', 'Invoke notebook serializer', [
            notebookTypeArg,
            new ApiCommandArgument('data', 'Bytes to convert to data', (v) => v instanceof Uint8Array, (v) => VSBuffer.wrap(v)),
        ], new ApiCommandResult('Notebook Data', (data) => typeConverters.NotebookData.to(data.value)));
        const commandNotebookToData = new ApiCommand('vscode.executeNotebookToData', '_executeNotebookToData', 'Invoke notebook serializer', [
            notebookTypeArg,
            new ApiCommandArgument('NotebookData', 'Notebook data to convert to bytes', (v) => true, (v) => new SerializableObjectWithBuffers(typeConverters.NotebookData.from(v))),
        ], new ApiCommandResult('Bytes', (dto) => dto.buffer));
        extHostCommands.registerApiCommand(commandDataToNotebook);
        extHostCommands.registerApiCommand(commandNotebookToData);
    }
    trace(msg) {
        this._logService.trace(`[Extension Host Notebook] ${msg}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVoRSxPQUFPLEtBQUssS0FBSyxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDbEMsT0FBTyxFQVNOLFdBQVcsR0FLWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFDTixVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGdCQUFnQixHQUdoQixNQUFNLHNCQUFzQixDQUFBO0FBRzdCLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQTtBQUtqRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsV0FBVyxFQUFF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