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
var ChatEditingModifiedNotebookEntry_1;
import { streamToBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { observableValue, autorun, transaction, ObservablePromise, } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { assertType } from '../../../../../base/common/types.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { OffsetEdit } from '../../../../../editor/common/core/offsetEdit.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping, RangeMapping, } from '../../../../../editor/common/diff/rangeMapping.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService, } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { NotebookTextDiffEditor } from '../../../notebook/browser/diff/notebookDiffEditor.js';
import { getNotebookEditorFromEditorPane } from '../../../notebook/browser/notebookBrowser.js';
import { NotebookCellsChangeType, NotebookSetting, } from '../../../notebook/common/notebookCommon.js';
import { computeDiff } from '../../../notebook/common/notebookDiff.js';
import { INotebookEditorModelResolverService } from '../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../notebook/common/notebookLoggingService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { INotebookEditorWorkerService } from '../../../notebook/common/services/notebookWorkerService.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry, } from './chatEditingModifiedFileEntry.js';
import { createSnapshot, deserializeSnapshot, getNotebookSnapshotFileURI, restoreSnapshot, SnapshotComparer, } from './notebook/chatEditingModifiedNotebookSnapshot.js';
import { ChatEditingNewNotebookContentEdits } from './notebook/chatEditingNewNotebookContentEdits.js';
import { ChatEditingNotebookCellEntry } from './notebook/chatEditingNotebookCellEntry.js';
import { ChatEditingNotebookDiffEditorIntegration, ChatEditingNotebookEditorIntegration, } from './notebook/chatEditingNotebookEditorIntegration.js';
import { ChatEditingNotebookFileSystemProvider } from './notebook/chatEditingNotebookFileSystemProvider.js';
import { adjustCellDiffAndOriginalModelBasedOnCellAddDelete, adjustCellDiffAndOriginalModelBasedOnCellMovements, adjustCellDiffForKeepingAnInsertedCell, adjustCellDiffForRevertingADeletedCell, adjustCellDiffForRevertingAnInsertedCell, calculateNotebookRewriteRatio, getCorrespondingOriginalCellIndex, isTransientIPyNbExtensionEvent, } from './notebook/helpers.js';
import { countChanges, sortCellChanges } from './notebook/notebookCellChanges.js';
const SnapshotLanguageId = 'VSCodeChatNotebookSnapshotLanguage';
let ChatEditingModifiedNotebookEntry = class ChatEditingModifiedNotebookEntry extends AbstractChatEditingModifiedFileEntry {
    static { ChatEditingModifiedNotebookEntry_1 = this; }
    static { this.NewModelCounter = 0; }
    get isProcessingResponse() {
        return this._isProcessingResponse;
    }
    get cellsDiffInfo() {
        return this._cellsDiffInfo;
    }
    static async create(uri, _multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, instantiationService) {
        return instantiationService.invokeFunction(async (accessor) => {
            const notebookService = accessor.get(INotebookService);
            const resolver = accessor.get(INotebookEditorModelResolverService);
            const configurationServie = accessor.get(IConfigurationService);
            const resourceRef = await resolver.resolve(uri);
            const notebook = resourceRef.object.notebook;
            const originalUri = getNotebookSnapshotFileURI(telemetryInfo.sessionId, telemetryInfo.requestId, generateUuid(), notebook.uri.scheme === Schemas.untitled ? `/${notebook.uri.path}` : notebook.uri.path, notebook.viewType);
            const [options, buffer] = await Promise.all([
                notebookService.withNotebookDataProvider(resourceRef.object.notebook.notebookType),
                notebookService
                    .createNotebookTextDocumentSnapshot(notebook.uri, 2 /* SnapshotContext.Backup */, CancellationToken.None)
                    .then((s) => streamToBuffer(s)),
            ]);
            const disposables = new DisposableStore();
            // Register so that we can load this from file system.
            disposables.add(ChatEditingNotebookFileSystemProvider.registerFile(originalUri, buffer));
            const originalRef = await resolver.resolve(originalUri, notebook.viewType);
            if (initialContent) {
                restoreSnapshot(originalRef.object.notebook, initialContent);
            }
            else {
                initialContent = createSnapshot(notebook, options.serializer.options, configurationServie);
                // Both models are the same, ensure the cell ids are the same, this way we get a perfect diffing.
                // No need to generate edits for this.
                // We want to ensure they are identitcal, possible original notebook was open and got modified.
                // Or something gets changed between serialization & deserialization of the snapshot into the original.
                // E.g. in jupyter notebooks the metadata contains transient data that gets updated after deserialization.
                restoreSnapshot(originalRef.object.notebook, initialContent);
                const edits = [];
                notebook.cells.forEach((cell, index) => {
                    const internalId = generateCellHash(cell.uri);
                    edits.push({
                        editType: 9 /* CellEditType.PartialInternalMetadata */,
                        index,
                        internalMetadata: { internalId },
                    });
                });
                resourceRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                originalRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
            }
            const instance = instantiationService.createInstance(ChatEditingModifiedNotebookEntry_1, resourceRef, originalRef, _multiDiffEntryDelegate, options.serializer.options, telemetryInfo, chatKind, initialContent);
            instance._register(disposables);
            return instance;
        });
    }
    static canHandleSnapshotContent(initialContent) {
        if (!initialContent) {
            return false;
        }
        try {
            deserializeSnapshot(initialContent);
            return true;
        }
        catch (ex) {
            // not a valid snapshot
            return false;
        }
    }
    static canHandleSnapshot(snapshot) {
        if (snapshot.languageId === SnapshotLanguageId &&
            ChatEditingModifiedNotebookEntry_1.canHandleSnapshotContent(snapshot.current)) {
            return true;
        }
        return false;
    }
    constructor(modifiedResourceRef, originalResourceRef, _multiDiffEntryDelegate, transientOptions, telemetryInfo, kind, initialContent, configurationService, fileConfigService, chatService, fileService, instantiationService, textModelService, modelService, undoRedoService, notebookEditorWorkerService, loggingService, notebookResolver) {
        super(modifiedResourceRef.object.notebook.uri, telemetryInfo, kind, configurationService, fileConfigService, chatService, fileService, undoRedoService, instantiationService);
        this.modifiedResourceRef = modifiedResourceRef;
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this.transientOptions = transientOptions;
        this.configurationService = configurationService;
        this.textModelService = textModelService;
        this.modelService = modelService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.loggingService = loggingService;
        this.notebookResolver = notebookResolver;
        /**
         * Whether we're still generating diffs from a response.
         */
        this._isProcessingResponse = observableValue('isProcessingResponse', false);
        this._isEditFromUs = false;
        /**
         * Whether all edits are from us, e.g. is possible a user has made edits, then this will be false.
         */
        this._allEditsAreFromUs = true;
        this._changesCount = observableValue(this, 0);
        this.changesCount = this._changesCount;
        this.cellEntryMap = new ResourceMap();
        this.modifiedToOriginalCell = new ResourceMap();
        this._cellsDiffInfo = observableValue('diffInfo', []);
        /**
         * List of Cell URIs that are edited,
         * Will be cleared once all edits have been accepted.
         * I.e. this will only contain URIS while acceptAgentEdits is being called & before `isLastEdit` is sent.
         * I.e. this is populated only when edits are being streamed.
         */
        this.editedCells = new ResourceSet();
        this.computeRequestId = 0;
        this.cellTextModelMap = new ResourceMap();
        this.initialContentComparer = new SnapshotComparer(initialContent);
        this.modifiedModel = this._register(modifiedResourceRef).object.notebook;
        this.originalModel = this._register(originalResourceRef).object.notebook;
        this.originalURI = this.originalModel.uri;
        this.initialContent = initialContent;
        this.initializeModelsFromDiff();
        this._register(this.modifiedModel.onDidChangeContent(this.mirrorNotebookEdits, this));
    }
    initializeModelsFromDiffImpl(cellsDiffInfo) {
        this.cellEntryMap.forEach((entry) => entry.dispose());
        this.cellEntryMap.clear();
        const diffs = cellsDiffInfo.map((cellDiff, i) => {
            switch (cellDiff.type) {
                case 'delete':
                    return this.createDeleteCellDiffInfo(cellDiff.originalCellIndex);
                case 'insert':
                    return this.createInsertedCellDiffInfo(cellDiff.modifiedCellIndex);
                default:
                    return this.createModifiedCellDiffInfo(cellDiff.modifiedCellIndex, cellDiff.originalCellIndex);
            }
        });
        this._cellsDiffInfo.set(diffs, undefined);
        this._changesCount.set(countChanges(diffs), undefined);
    }
    async initializeModelsFromDiff() {
        const id = ++this.computeRequestId;
        if (this._areOriginalAndModifiedIdenticalImpl()) {
            const cellsDiffInfo = this.modifiedModel.cells.map((_, index) => {
                return {
                    type: 'unchanged',
                    originalCellIndex: index,
                    modifiedCellIndex: index,
                };
            });
            this.initializeModelsFromDiffImpl(cellsDiffInfo);
            return;
        }
        const cellsDiffInfo = [];
        try {
            this._isProcessingResponse.set(true, undefined);
            const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.originalURI, this.modifiedURI);
            if (id !== this.computeRequestId) {
                return;
            }
            const result = computeDiff(this.originalModel, this.modifiedModel, notebookDiff);
            if (result.cellDiffInfo.length) {
                cellsDiffInfo.push(...result.cellDiffInfo);
            }
        }
        catch (ex) {
            this.loggingService.error('Notebook Chat', 'Error computing diff:\n' + ex);
        }
        finally {
            this._isProcessingResponse.set(false, undefined);
        }
        this.initializeModelsFromDiffImpl(cellsDiffInfo);
    }
    updateCellDiffInfo(cellsDiffInfo, transcation) {
        this._cellsDiffInfo.set(sortCellChanges(cellsDiffInfo), transcation);
        this._changesCount.set(countChanges(cellsDiffInfo), transcation);
    }
    mirrorNotebookEdits(e) {
        if (this._isEditFromUs ||
            Array.from(this.cellEntryMap.values()).some((entry) => entry.isEditFromUs)) {
            return;
        }
        // Possible user reverted the changes from SCM or the like.
        // Or user just reverted the changes made via edits (e.g. edit made a change in a cell and user undid that change either by typing over or other).
        // Computing snapshot is too slow, as this event gets triggered for every key stroke in a cell,
        // const didResetToOriginalContent = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService) === this.initialContent;
        let didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        const currentState = this._stateObs.get();
        if (currentState === 2 /* WorkingSetEntryState.Rejected */) {
            return;
        }
        if (currentState === 0 /* WorkingSetEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            return;
        }
        if (!e.rawEvents.length) {
            return;
        }
        if (isTransientIPyNbExtensionEvent(this.modifiedModel.notebookType, e)) {
            return;
        }
        this._allEditsAreFromUs = false;
        // Changes to cell text is sync'ed and handled separately.
        // See ChatEditingNotebookCellEntry._mirrorEdits
        for (const event of e.rawEvents.filter((event) => event.kind !== NotebookCellsChangeType.ChangeCellContent)) {
            switch (event.kind) {
                case NotebookCellsChangeType.ChangeDocumentMetadata: {
                    const edit = {
                        editType: 5 /* CellEditType.DocumentMetadata */,
                        metadata: this.modifiedModel.metadata,
                    };
                    this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    break;
                }
                case NotebookCellsChangeType.ModelChange: {
                    let cellDiffs = sortCellChanges(this._cellsDiffInfo.get());
                    // Ensure the new notebook cells have internalIds
                    this._applyEditsSync(() => {
                        event.changes.forEach((change) => {
                            change[2].forEach((cell, i) => {
                                if (cell.internalMetadata.internalId) {
                                    return;
                                }
                                const index = change[0] + i;
                                const internalId = generateCellHash(cell.uri);
                                const edits = [
                                    {
                                        editType: 9 /* CellEditType.PartialInternalMetadata */,
                                        index,
                                        internalMetadata: { internalId },
                                    },
                                ];
                                this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                                cell.internalMetadata ??= {};
                                cell.internalMetadata.internalId = internalId;
                            });
                        });
                    });
                    event.changes.forEach((change) => {
                        cellDiffs = adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffs, this.modifiedModel.cells.length, this.originalModel.cells.length, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
                    });
                    this.updateCellDiffInfo(cellDiffs, undefined);
                    this.disposeDeletedCellEntries();
                    break;
                }
                case NotebookCellsChangeType.ChangeCellLanguage: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 4 /* CellEditType.CellLanguage */,
                            index,
                            language: event.language,
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMetadata: {
                    // ipynb and other extensions can alter metadata, ensure we update the original model in the corresponding cell.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 3 /* CellEditType.Metadata */,
                            index,
                            metadata: event.metadata,
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMime:
                    break;
                case NotebookCellsChangeType.ChangeCellInternalMetadata: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 9 /* CellEditType.PartialInternalMetadata */,
                            index,
                            internalMetadata: event.internalMetadata,
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Output: {
                    // User can run cells.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 2 /* CellEditType.Output */,
                            index,
                            append: event.append,
                            outputs: event.outputs,
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.OutputItem: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 7 /* CellEditType.OutputItems */,
                            outputId: event.outputId,
                            append: event.append,
                            items: event.outputItems,
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Move: {
                    const result = adjustCellDiffAndOriginalModelBasedOnCellMovements(event, this._cellsDiffInfo.get().slice());
                    if (result) {
                        this.originalModel.applyEdits(result[1], true, undefined, () => undefined, undefined, false);
                        this._cellsDiffInfo.set(result[0], undefined);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
        didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        if (currentState === 0 /* WorkingSetEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            return;
        }
    }
    async _doAccept(tx) {
        this.updateCellDiffInfo([], tx);
        const snapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        restoreSnapshot(this.originalModel, snapshot);
        this.initializeModelsFromDiff();
        await this._collapse(tx);
        const config = this._fileConfigService.getAutoSaveConfiguration(this.modifiedURI);
        if (this.modifiedModel.uri.scheme !== Schemas.untitled &&
            (!config.autoSave || !this.notebookResolver.isDirty(this.modifiedURI))) {
            // SAVE after accept for manual-savers, for auto-savers
            // trigger explict save to get save participants going
            await this._applyEdits(async () => {
                try {
                    await this.modifiedResourceRef.object.save({
                        reason: 1 /* SaveReason.EXPLICIT */,
                        force: true,
                    });
                }
                catch {
                    // ignored
                }
            });
        }
    }
    async _doReject(tx) {
        this.updateCellDiffInfo([], tx);
        if (this.createdInRequestId === this._telemetryInfo.requestId) {
            await this._applyEdits(async () => {
                await this.modifiedResourceRef.object.revert({ soft: true });
                await this._fileService.del(this.modifiedURI);
            });
            this._onDidDelete.fire();
        }
        else {
            await this._applyEdits(async () => {
                const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
                this.restoreSnapshotInModifiedModel(snapshot);
                if (this._allEditsAreFromUs &&
                    Array.from(this.cellEntryMap.values()).every((entry) => entry.allEditsAreFromUs)) {
                    // save the file after discarding so that the dirty indicator goes away
                    // and so that an intermediate saved state gets reverted
                    await this.modifiedResourceRef.object.save({
                        reason: 1 /* SaveReason.EXPLICIT */,
                        skipSaveParticipants: true,
                    });
                }
            });
            this.initializeModelsFromDiff();
            await this._collapse(tx);
        }
    }
    async _collapse(transaction) {
        this._multiDiffEntryDelegate.collapse(transaction);
    }
    _createEditorIntegration(editor) {
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        if (!notebookEditor && editor.getId() === NotebookTextDiffEditor.ID) {
            const diffEditor = editor.getControl();
            return this._instantiationService.createInstance(ChatEditingNotebookDiffEditorIntegration, diffEditor, this._cellsDiffInfo);
        }
        assertType(notebookEditor);
        return this._instantiationService.createInstance(ChatEditingNotebookEditorIntegration, this, editor, this.modifiedModel, this.originalModel, this._cellsDiffInfo);
    }
    _resetEditsState(tx) {
        super._resetEditsState(tx);
        this.cellEntryMap.forEach((entry) => !entry.disposed && entry.clearCurrentEditLineDecoration());
    }
    _createUndoRedoElement(response) {
        const request = response.session.getRequests().find((req) => req.id === response.requestId);
        const label = request?.message.text
            ? localize('chatNotebookEdit1', "Chat Edit: '{0}'", request.message.text)
            : localize('chatNotebookEdit2', 'Chat Edit');
        const transientOptions = this.transientOptions;
        const outputSizeLimit = this.configurationService.getValue(NotebookSetting.outputBackupSizeLimit) * 1024;
        // create a snapshot of the current state of the model, before the next set of edits
        let initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
        let last = '';
        return {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.modifiedURI,
            label,
            code: 'chat.edit',
            confirmBeforeUndo: false,
            undo: async () => {
                last = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                restoreSnapshot(this.modifiedModel, initial);
            },
            redo: async () => {
                initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                restoreSnapshot(this.modifiedModel, last);
            },
        };
    }
    async _areOriginalAndModifiedIdentical() {
        return this._areOriginalAndModifiedIdenticalImpl();
    }
    _areOriginalAndModifiedIdenticalImpl() {
        const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
        return new SnapshotComparer(snapshot).isEqual(this.modifiedModel);
    }
    async acceptAgentEdits(resource, edits, isLastEdits, responseModel) {
        const isCellUri = resource.scheme === Schemas.vscodeNotebookCell;
        const cell = isCellUri && this.modifiedModel.cells.find((cell) => isEqual(cell.uri, resource));
        let cellEntry;
        if (cell) {
            const index = this.modifiedModel.cells.indexOf(cell);
            const entry = this._cellsDiffInfo
                .get()
                .slice()
                .find((entry) => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                console.error('Original cell model not found');
                return;
            }
            cellEntry = this.getOrCreateModifiedTextFileEntryForCell(cell, await entry.modifiedModel.promise, await entry.originalModel.promise);
        }
        // For all cells that were edited, send the `isLastEdits` flag.
        const finishPreviousCells = () => {
            this.editedCells.forEach((uri) => {
                const cell = this.modifiedModel.cells.find((cell) => isEqual(cell.uri, uri));
                const cellEntry = cell && this.cellEntryMap.get(cell.uri);
                cellEntry?.acceptAgentEdits([], true, responseModel);
            });
            this.editedCells.clear();
        };
        this._applyEditsSync(async () => {
            edits.map((edit) => {
                if (TextEdit.isTextEdit(edit)) {
                    // Possible we're getting the raw content for the notebook.
                    if (isEqual(resource, this.modifiedModel.uri)) {
                        this.newNotebookEditGenerator ??= this._instantiationService.createInstance(ChatEditingNewNotebookContentEdits, this.modifiedModel);
                        this.newNotebookEditGenerator.acceptTextEdits([edit]);
                    }
                    else {
                        // If we get cell edits, its impossible to get text edits for the notebook uri.
                        this.newNotebookEditGenerator = undefined;
                        if (!this.editedCells.has(resource)) {
                            finishPreviousCells();
                            this.editedCells.add(resource);
                        }
                        cellEntry?.acceptAgentEdits([edit], isLastEdits, responseModel);
                    }
                }
                else {
                    // If we notebook edits, its impossible to get text edits for the notebook uri.
                    this.newNotebookEditGenerator = undefined;
                    this.acceptNotebookEdit(edit);
                }
            });
        });
        // If the last edit for a cell was sent, then handle it
        if (isLastEdits) {
            finishPreviousCells();
        }
        // isLastEdits can be true for cell Uris, but when its true for Cells edits.
        // It cannot be true for the notebook itself.
        isLastEdits = !isCellUri && isLastEdits;
        // If this is the last edit and & we got regular text edits for generating new notebook content
        // Then generate notebook edits from those text edits & apply those notebook edits.
        if (isLastEdits && this.newNotebookEditGenerator) {
            const notebookEdits = await this.newNotebookEditGenerator.generateEdits();
            this.newNotebookEditGenerator = undefined;
            notebookEdits.forEach((edit) => this.acceptNotebookEdit(edit));
        }
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* WorkingSetEntryState.Modified */, tx);
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                const newRewriteRation = Math.max(this._rewriteRatioObs.get(), calculateNotebookRewriteRatio(this._cellsDiffInfo.get(), this.originalModel, this.modifiedModel));
                this._rewriteRatioObs.set(Math.min(1, newRewriteRation), tx);
            }
            else {
                finishPreviousCells();
                this.editedCells.clear();
                this._resetEditsState(tx);
                this._rewriteRatioObs.set(1, tx);
            }
        });
    }
    disposeDeletedCellEntries() {
        const cellsUris = new ResourceSet(this.modifiedModel.cells.map((cell) => cell.uri));
        Array.from(this.cellEntryMap.keys()).forEach((uri) => {
            if (cellsUris.has(uri)) {
                return;
            }
            this.cellEntryMap.get(uri)?.dispose();
            this.cellEntryMap.delete(uri);
        });
    }
    acceptNotebookEdit(edit) {
        // make the actual edit
        this.modifiedModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        this.disposeDeletedCellEntries();
        if (edit.editType !== 1 /* CellEditType.Replace */) {
            return;
        }
        // Ensure cells have internal Ids.
        edit.cells.forEach((_, i) => {
            const index = edit.index + i;
            const cell = this.modifiedModel.cells[index];
            if (cell.internalMetadata.internalId) {
                return;
            }
            const internalId = generateCellHash(cell.uri);
            const edits = [
                { editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } },
            ];
            this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
        });
        let diff = [];
        if (edit.count === 0) {
            // All existing indexes are shifted by number of cells added.
            diff = sortCellChanges(this._cellsDiffInfo.get());
            diff.forEach((d) => {
                if (d.type !== 'delete' && d.modifiedCellIndex >= edit.index) {
                    d.modifiedCellIndex += edit.cells.length;
                }
            });
            const diffInsert = edit.cells.map((_, i) => this.createInsertedCellDiffInfo(edit.index + i));
            diff.splice(edit.index, 0, ...diffInsert);
        }
        else {
            // All existing indexes are shifted by number of cells removed.
            // And unchanged cells should be converted to deleted cells.
            diff = sortCellChanges(this._cellsDiffInfo.get()).map((d) => {
                if (d.type === 'unchanged' &&
                    d.modifiedCellIndex >= edit.index &&
                    d.modifiedCellIndex <= edit.index + edit.count - 1) {
                    return this.createDeleteCellDiffInfo(d.originalCellIndex);
                }
                if (d.type !== 'delete' && d.modifiedCellIndex >= edit.index + edit.count) {
                    d.modifiedCellIndex -= edit.count;
                    return d;
                }
                return d;
            });
        }
        this.updateCellDiffInfo(diff, undefined);
    }
    computeStateAfterAcceptingRejectingChanges(accepted) {
        const currentSnapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        if (new SnapshotComparer(currentSnapshot).isEqual(this.originalModel)) {
            const state = accepted ? 1 /* WorkingSetEntryState.Accepted */ : 2 /* WorkingSetEntryState.Rejected */;
            this._stateObs.set(state, undefined);
        }
    }
    createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
        const modifiedCell = this.modifiedModel.cells[modifiedCellIndex];
        const originalCell = this.originalModel.cells[originalCellIndex];
        this.modifiedToOriginalCell.set(modifiedCell.uri, originalCell.uri);
        const modifiedCellModelPromise = this.resolveCellModel(modifiedCell.uri);
        const originalCellModelPromise = this.resolveCellModel(originalCell.uri);
        Promise.all([modifiedCellModelPromise, originalCellModelPromise]).then(([modifiedCellModel, originalCellModel]) => {
            this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
        });
        const diff = observableValue('diff', nullDocumentDiff);
        const unchangedCell = {
            type: 'unchanged',
            modifiedCellIndex,
            originalCellIndex,
            keep: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([
                    modifiedCellModelPromise,
                    originalCellModelPromise,
                ]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.keep(changes) : false;
            },
            undo: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([
                    modifiedCellModelPromise,
                    originalCellModelPromise,
                ]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.undo(changes) : false;
            },
            modifiedModel: new ObservablePromise(modifiedCellModelPromise),
            originalModel: new ObservablePromise(originalCellModelPromise),
            diff,
        };
        return unchangedCell;
    }
    createInsertedCellDiffInfo(modifiedCellIndex) {
        const cell = this.modifiedModel.cells[modifiedCellIndex];
        const lines = cell.getValue().split(/\r?\n/);
        const originalRange = new Range(1, 0, 1, 0);
        const modifiedRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const innerChanges = new RangeMapping(originalRange, modifiedRange);
        const changes = [
            new DetailedLineRangeMapping(new LineRange(1, 1), new LineRange(1, lines.length), [
                innerChanges,
            ]),
        ];
        // When a new cell is inserted, we use the ChatEditingCodeEditorIntegration to handle the edits.
        // & to also display undo/redo and decorations.
        // However that needs a modified and original model.
        // For inserted cells there's no original model, so we create a new empty text model and pass that as the original.
        const originalModelUri = this.modifiedModel.uri.with({
            query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(),
            scheme: 'emptyCell',
        });
        const originalModel = this.modelService.getModel(originalModelUri) ||
            this._register(this.modelService.createModel('', null, originalModelUri));
        this.modifiedToOriginalCell.set(cell.uri, originalModelUri);
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        this.resolveCellModel(cell.uri).then((modifiedModel) => {
            // We want decorators for the cell just as we display decorators for modified cells.
            // This way we have the ability to accept/reject the entire cell.
            this.getOrCreateModifiedTextFileEntryForCell(cell, modifiedModel, originalModel);
        });
        return {
            type: 'insert',
            originalCellIndex: undefined,
            modifiedCellIndex: modifiedCellIndex,
            keep,
            undo,
            modifiedModel: new ObservablePromise(this.resolveCellModel(cell.uri)),
            originalModel: new ObservablePromise(Promise.resolve(originalModel)),
            diff: observableValue('deletedCellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            }),
        };
    }
    createDeleteCellDiffInfo(originalCellIndex) {
        const originalCell = this.originalModel.cells[originalCellIndex];
        const lines = new Array(originalCell.textBuffer.getLineCount())
            .fill(0)
            .map((_, i) => originalCell.textBuffer.getLineContent(i + 1));
        const originalRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const modifiedRange = new Range(1, 0, 1, 0);
        const innerChanges = new RangeMapping(modifiedRange, originalRange);
        const changes = [
            new DetailedLineRangeMapping(new LineRange(1, lines.length), new LineRange(1, 1), [
                innerChanges,
            ]),
        ];
        const modifiedModelUri = this.modifiedModel.uri.with({
            query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(),
            scheme: 'emptyCell',
        });
        const modifiedModel = this.modelService.getModel(modifiedModelUri) ||
            this._register(this.modelService.createModel('', null, modifiedModelUri));
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell)));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell), originalCell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        // This will be deleted.
        return {
            type: 'delete',
            modifiedCellIndex: undefined,
            originalCellIndex,
            originalModel: new ObservablePromise(this.resolveCellModel(originalCell.uri)),
            modifiedModel: new ObservablePromise(Promise.resolve(modifiedModel)),
            keep,
            undo,
            diff: observableValue('cellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            }),
        };
    }
    undoPreviouslyInsertedCell(cell) {
        let diffs = [];
        this._applyEditsSync(() => {
            const index = this.modifiedModel.cells.indexOf(cell);
            diffs = adjustCellDiffForRevertingAnInsertedCell(index, this._cellsDiffInfo.get(), this.modifiedModel.applyEdits.bind(this.modifiedModel));
        });
        this.disposeDeletedCellEntries();
        this.updateCellDiffInfo(diffs, undefined);
    }
    keepPreviouslyInsertedCell(cell) {
        const modifiedCellIndex = this.modifiedModel.cells.indexOf(cell);
        if (modifiedCellIndex === -1) {
            // Not possible.
            return;
        }
        const cellToInsert = {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: cell.mime,
            internalMetadata: {
                internalId: cell.internalMetadata.internalId,
            },
        };
        this.cellEntryMap.get(cell.uri)?.dispose();
        this.cellEntryMap.delete(cell.uri);
        const cellDiffs = adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, this._cellsDiffInfo.get().slice(), cellToInsert, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    undoPreviouslyDeletedCell(deletedOriginalIndex, originalCell) {
        const cellToInsert = {
            cellKind: originalCell.cellKind,
            language: originalCell.language,
            metadata: originalCell.metadata,
            outputs: originalCell.outputs,
            source: originalCell.getValue(),
            mime: originalCell.mime,
            internalMetadata: {
                internalId: originalCell.internalMetadata.internalId,
            },
        };
        let cellDiffs = [];
        this._applyEditsSync(() => {
            cellDiffs = adjustCellDiffForRevertingADeletedCell(deletedOriginalIndex, this._cellsDiffInfo.get(), cellToInsert, this.modifiedModel.applyEdits.bind(this.modifiedModel), this.createModifiedCellDiffInfo.bind(this));
        });
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    keepPreviouslyDeletedCell(deletedOriginalIndex) {
        // Delete this cell from original as well.
        const edit = {
            cells: [],
            count: 1,
            editType: 1 /* CellEditType.Replace */,
            index: deletedOriginalIndex,
        };
        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        const diffs = sortCellChanges(this._cellsDiffInfo.get())
            .filter((d) => !(d.type === 'delete' && d.originalCellIndex === deletedOriginalIndex))
            .map((diff) => {
            if (diff.type !== 'insert' && diff.originalCellIndex > deletedOriginalIndex) {
                return {
                    ...diff,
                    originalCellIndex: diff.originalCellIndex - 1,
                };
            }
            return diff;
        });
        this.updateCellDiffInfo(diffs, undefined);
    }
    async _applyEdits(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            await operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    _applyEditsSync(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    createSnapshot(requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: SnapshotLanguageId,
            snapshotUri: getNotebookSnapshotFileURI(this._telemetryInfo.sessionId, requestId, undoStop, this.modifiedURI.path, this.modifiedModel.viewType),
            original: createSnapshot(this.originalModel, this.transientOptions, this.configurationService),
            current: createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService),
            originalToCurrentEdit: OffsetEdit.empty,
            state: this.state.get(),
            telemetryInfo: this.telemetryInfo,
        };
    }
    equalsSnapshot(snapshot) {
        return (!!snapshot &&
            isEqual(this.modifiedURI, snapshot.resource) &&
            this.state.get() === snapshot.state &&
            new SnapshotComparer(snapshot.original).isEqual(this.originalModel) &&
            new SnapshotComparer(snapshot.current).isEqual(this.modifiedModel));
    }
    restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this.updateCellDiffInfo([], undefined);
        this._stateObs.set(snapshot.state, undefined);
        restoreSnapshot(this.originalModel, snapshot.original);
        if (restoreToDisk) {
            this.restoreSnapshotInModifiedModel(snapshot.current);
        }
        this.initializeModelsFromDiff();
    }
    resetToInitialContent() {
        this.updateCellDiffInfo([], undefined);
        this.restoreSnapshotInModifiedModel(this.initialContent);
        this.initializeModelsFromDiff();
    }
    restoreSnapshotInModifiedModel(snapshot) {
        if (snapshot ===
            createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService)) {
            return;
        }
        this._applyEditsSync(() => {
            // See private _setDocValue in chatEditingModifiedDocumentEntry.ts
            this.modifiedModel.pushStackElement();
            restoreSnapshot(this.modifiedModel, snapshot);
            this.modifiedModel.pushStackElement();
        });
    }
    async resolveCellModel(cellURI) {
        const cell = this.originalModel.cells
            .concat(this.modifiedModel.cells)
            .find((cell) => isEqual(cell.uri, cellURI));
        if (!cell) {
            throw new Error('Cell not found');
        }
        const model = this.cellTextModelMap.get(cell.uri) ||
            this._register(await this.textModelService.createModelReference(cell.uri)).object
                .textEditorModel;
        this.cellTextModelMap.set(cell.uri, model);
        return model;
    }
    getOrCreateModifiedTextFileEntryForCell(cell, modifiedCellModel, originalCellModel) {
        let cellEntry = this.cellEntryMap.get(cell.uri);
        if (cellEntry) {
            return cellEntry;
        }
        const disposables = new DisposableStore();
        cellEntry = this._register(this._instantiationService.createInstance(ChatEditingNotebookCellEntry, this.modifiedResourceRef.object.resource, cell, modifiedCellModel, originalCellModel, disposables));
        this.cellEntryMap.set(cell.uri, cellEntry);
        disposables.add(autorun((r) => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const diffs = this.cellsDiffInfo.get().slice();
            const index = this.modifiedModel.cells.indexOf(cell);
            let entry = diffs.find((entry) => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                return;
            }
            const entryIndex = diffs.indexOf(entry);
            entry.diff.set(cellEntry.diffInfo.read(r), undefined);
            if (cellEntry.diffInfo.get().identical && entry.type === 'modified') {
                entry = {
                    ...entry,
                    type: 'unchanged',
                };
            }
            if (!cellEntry.diffInfo.get().identical && entry.type === 'unchanged') {
                entry = {
                    ...entry,
                    type: 'modified',
                };
            }
            diffs.splice(entryIndex, 1, { ...entry });
            transaction((tx) => {
                this.updateCellDiffInfo(diffs, tx);
            });
        }));
        disposables.add(autorun((r) => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const cellState = cellEntry.state.read(r);
            if (cellState === 1 /* WorkingSetEntryState.Accepted */) {
                this.computeStateAfterAcceptingRejectingChanges(true);
            }
            else if (cellState === 2 /* WorkingSetEntryState.Rejected */) {
                this.computeStateAfterAcceptingRejectingChanges(false);
            }
        }));
        return cellEntry;
    }
};
ChatEditingModifiedNotebookEntry = ChatEditingModifiedNotebookEntry_1 = __decorate([
    __param(7, IConfigurationService),
    __param(8, IFilesConfigurationService),
    __param(9, IChatService),
    __param(10, IFileService),
    __param(11, IInstantiationService),
    __param(12, ITextModelService),
    __param(13, IModelService),
    __param(14, IUndoRedoService),
    __param(15, INotebookEditorWorkerService),
    __param(16, INotebookLoggingService),
    __param(17, INotebookEditorModelResolverService)
], ChatEditingModifiedNotebookEntry);
export { ChatEditingModifiedNotebookEntry };
function generateCellHash(cellUri) {
    const hash = new StringSHA1();
    hash.update(cellUri.toString());
    return hash.digest().substring(0, 8);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFHTixlQUFlLEVBQ2YsT0FBTyxFQUNQLFdBQVcsRUFDWCxpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwy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