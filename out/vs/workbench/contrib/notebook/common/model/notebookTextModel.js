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
var NotebookTextModel_1;
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { Emitter, PauseableEmitter } from '../../../../../base/common/event.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { filter } from '../../../../../base/common/objects.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IUndoRedoService, } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { CellKind, CellUri, diff, NotebookCellExecutionState, NotebookCellsChangeType, } from '../notebookCommon.js';
import { INotebookExecutionStateService } from '../notebookExecutionStateService.js';
import { CellMetadataEdit, MoveCellEdit, SpliceCellsEdit } from './cellEdit.js';
import { NotebookCellOutputTextModel } from './notebookCellOutputTextModel.js';
import { NotebookCellTextModel } from './notebookCellTextModel.js';
class StackOperation {
    get code() {
        return this._operations.length === 1
            ? this._operations[0].code
            : 'undoredo.notebooks.stackOperation';
    }
    get label() {
        return this._operations.length === 1 ? this._operations[0].label : 'edit';
    }
    constructor(textModel, undoRedoGroup, _pauseableEmitter, _postUndoRedo, selectionState, beginAlternativeVersionId) {
        this.textModel = textModel;
        this.undoRedoGroup = undoRedoGroup;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this.tag = 'notebookUndoRedoElement';
        this._operations = [];
        this._beginSelectionState = undefined;
        this._resultSelectionState = undefined;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this._beginSelectionState = selectionState;
        this._beginAlternativeVersionId = beginAlternativeVersionId;
        this._resultAlternativeVersionId = beginAlternativeVersionId;
    }
    get resources() {
        return [this.textModel.uri];
    }
    get isEmpty() {
        return this._operations.length === 0;
    }
    pushEndState(alternativeVersionId, selectionState) {
        // https://github.com/microsoft/vscode/issues/207523
        this._resultAlternativeVersionId = alternativeVersionId;
        this._resultSelectionState = selectionState || this._resultSelectionState;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId) {
        if (this._operations.length === 0) {
            this._beginSelectionState = this._beginSelectionState ?? beginSelectionState;
        }
        this._operations.push(element);
        this._resultSelectionState = resultSelectionState;
        this._resultAlternativeVersionId = alternativeVersionId;
    }
    async undo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = this._operations.length - 1; i >= 0; i--) {
                await this._operations[i].undo();
            }
            this._postUndoRedo(this._beginAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._beginSelectionState,
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
    async redo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = 0; i < this._operations.length; i++) {
                await this._operations[i].redo();
            }
            this._postUndoRedo(this._resultAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._resultSelectionState,
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
}
class NotebookOperationManager {
    constructor(_textModel, _undoService, _pauseableEmitter, _postUndoRedo) {
        this._textModel = _textModel;
        this._undoService = _undoService;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this._pendingStackOperation = null;
        this._isAppending = false;
    }
    isUndoStackEmpty() {
        return this._pendingStackOperation === null || this._pendingStackOperation.isEmpty;
    }
    pushStackElement(alternativeVersionId, selectionState) {
        if (this._pendingStackOperation && !this._pendingStackOperation.isEmpty) {
            this._pendingStackOperation.pushEndState(alternativeVersionId, selectionState);
            if (!this._isAppending) {
                this._undoService.pushElement(this._pendingStackOperation, this._pendingStackOperation.undoRedoGroup);
            }
        }
        this._isAppending = false;
        this._pendingStackOperation = null;
    }
    _getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId) {
        return (this._pendingStackOperation ??= new StackOperation(this._textModel, undoRedoGroup, this._pauseableEmitter, this._postUndoRedo, beginSelectionState, alternativeVersionId || ''));
    }
    appendPreviousOperation() {
        const previous = this._undoService.getLastElement(this._textModel.uri);
        if (previous && previous.tag === 'notebookUndoRedoElement') {
            this._pendingStackOperation = previous;
            this._isAppending = true;
            return true;
        }
        return false;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId, undoRedoGroup) {
        const pendingStackOperation = this._getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId);
        pendingStackOperation.pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId);
    }
}
class NotebookEventEmitter extends PauseableEmitter {
    get isEmpty() {
        return this._eventQueue.isEmpty();
    }
    isDirtyEvent() {
        for (const e of this._eventQueue) {
            for (let i = 0; i < e.rawEvents.length; i++) {
                if (!e.rawEvents[i].transient) {
                    return true;
                }
            }
        }
        return false;
    }
}
let NotebookTextModel = NotebookTextModel_1 = class NotebookTextModel extends Disposable {
    get length() {
        return this._cells.length;
    }
    get cells() {
        return this._cells;
    }
    get versionId() {
        return this._versionId;
    }
    get alternativeVersionId() {
        return this._alternativeVersionId;
    }
    get notebookType() {
        return this.viewType;
    }
    constructor(viewType, uri, cells, metadata, options, _undoService, _modelService, _languageService, _languageDetectionService, _notebookExecutionStateService) {
        super();
        this.viewType = viewType;
        this.uri = uri;
        this._undoService = _undoService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._languageDetectionService = _languageDetectionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._isDisposed = false;
        this._onWillDispose = this._register(new Emitter());
        this._onWillAddRemoveCells = this._register(new Emitter());
        this._onDidChangeContent = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.onWillAddRemoveCells = this._onWillAddRemoveCells.event;
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._cellhandlePool = 0;
        this._cellListeners = new Map();
        this._cells = [];
        this.metadata = {};
        this.transientOptions = {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            transientOutputs: false,
            cellContentMetadata: {},
        };
        this._versionId = 0;
        /**
         * This alternative id is only for non-cell-content changes.
         */
        this._notebookSpecificAlternativeId = 0;
        /**
         * Unlike, versionId, this can go down (via undo) or go to previous values (via redo)
         */
        this._alternativeVersionId = '1';
        this.newCellsFromLastEdit = new Set();
        this.transientOptions = options;
        this.metadata = metadata;
        this._initialize(cells);
        const maybeUpdateCellTextModel = (textModel) => {
            if (textModel.uri.scheme === Schemas.vscodeNotebookCell && textModel instanceof TextModel) {
                const cellUri = CellUri.parse(textModel.uri);
                if (cellUri && isEqual(cellUri.notebook, this.uri)) {
                    const cellIdx = this._getCellIndexByHandle(cellUri.handle);
                    if (cellIdx >= 0) {
                        const cell = this.cells[cellIdx];
                        if (cell) {
                            cell.textModel = textModel;
                        }
                    }
                }
            }
        };
        this._register(_modelService.onModelAdded((e) => maybeUpdateCellTextModel(e)));
        this._pauseableEmitter = new NotebookEventEmitter({
            merge: (events) => {
                const first = events[0];
                const rawEvents = first.rawEvents;
                let versionId = first.versionId;
                let endSelectionState = first.endSelectionState;
                let synchronous = first.synchronous;
                for (let i = 1; i < events.length; i++) {
                    rawEvents.push(...events[i].rawEvents);
                    versionId = events[i].versionId;
                    endSelectionState =
                        events[i].endSelectionState !== undefined
                            ? events[i].endSelectionState
                            : endSelectionState;
                    synchronous = events[i].synchronous !== undefined ? events[i].synchronous : synchronous;
                }
                return { rawEvents, versionId, endSelectionState, synchronous };
            },
        });
        this._register(this._pauseableEmitter.event((e) => {
            if (e.rawEvents.length) {
                this._onDidChangeContent.fire(e);
            }
        }));
        this._operationManager = new NotebookOperationManager(this, this._undoService, this._pauseableEmitter, (alternativeVersionId) => {
            this._increaseVersionId(true);
            this._overwriteAlternativeVersionId(alternativeVersionId);
        });
    }
    setCellCollapseDefault(collapseConfig) {
        this._defaultCollapseConfig = collapseConfig;
    }
    _initialize(cells, triggerDirty) {
        this._cells = [];
        this._versionId = 0;
        this._notebookSpecificAlternativeId = 0;
        const mainCells = cells.map((cell) => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            const collapseState = this._getDefaultCollapseState(cell);
            return new NotebookCellTextModel(cellUri, cellHandle, cell.source, cell.language, cell.mime, cell.cellKind, cell.outputs, cell.metadata, cell.internalMetadata, collapseState, this.transientOptions, this._languageService, this._languageDetectionService);
        });
        for (let i = 0; i < mainCells.length; i++) {
            const dirtyStateListener = mainCells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(mainCells[i], e);
            });
            this._cellListeners.set(mainCells[i].handle, dirtyStateListener);
            this._register(mainCells[i]);
        }
        this._cells.splice(0, 0, ...mainCells);
        this._alternativeVersionId = this._generateAlternativeId();
        if (triggerDirty) {
            this._pauseableEmitter.fire({
                rawEvents: [{ kind: NotebookCellsChangeType.Unknown, transient: false }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined,
            });
        }
    }
    _bindCellContentHandler(cell, e) {
        this._increaseVersionId(e === 'content' || (typeof e === 'object' && e.type === 'model'));
        switch (e) {
            case 'content':
                this._pauseableEmitter.fire({
                    rawEvents: [
                        {
                            kind: NotebookCellsChangeType.ChangeCellContent,
                            index: this._getCellIndexByHandle(cell.handle),
                            transient: false,
                        },
                    ],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined,
                });
                break;
            case 'language':
                this._pauseableEmitter.fire({
                    rawEvents: [
                        {
                            kind: NotebookCellsChangeType.ChangeCellLanguage,
                            index: this._getCellIndexByHandle(cell.handle),
                            language: cell.language,
                            transient: false,
                        },
                    ],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined,
                });
                break;
            case 'mime':
                this._pauseableEmitter.fire({
                    rawEvents: [
                        {
                            kind: NotebookCellsChangeType.ChangeCellMime,
                            index: this._getCellIndexByHandle(cell.handle),
                            mime: cell.mime,
                            transient: false,
                        },
                    ],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined,
                });
                break;
            default:
                if (typeof e === 'object' && e.type === 'model') {
                    this._pauseableEmitter.fire({
                        rawEvents: [
                            {
                                kind: NotebookCellsChangeType.ChangeCellContent,
                                index: this._getCellIndexByHandle(cell.handle),
                                transient: false,
                            },
                        ],
                        versionId: this.versionId,
                        synchronous: true,
                        endSelectionState: undefined,
                    });
                }
                break;
        }
    }
    _generateAlternativeId() {
        return (`${this._notebookSpecificAlternativeId}_` +
            this.cells.map((cell) => cell.handle + ',' + cell.alternativeId).join(';'));
    }
    dispose() {
        if (this._isDisposed) {
            // NotebookEditorModel can be disposed twice, don't fire onWillDispose again
            return;
        }
        this._isDisposed = true;
        this._onWillDispose.fire();
        this._undoService.removeElements(this.uri);
        dispose(this._cellListeners.values());
        this._cellListeners.clear();
        dispose(this._cells);
        this._cells = [];
        super.dispose();
    }
    pushStackElement() {
        // https://github.com/microsoft/vscode/issues/207523
    }
    _getCellIndexByHandle(handle) {
        return this.cells.findIndex((c) => c.handle === handle);
    }
    _getCellIndexWithOutputIdHandleFromEdits(outputId, rawEdits) {
        const edit = rawEdits.find((e) => 'outputs' in e && e.outputs.some((o) => o.outputId === outputId));
        if (edit) {
            if ('index' in edit) {
                return edit.index;
            }
            else if ('handle' in edit) {
                const cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
                return cellIndex;
            }
        }
        return -1;
    }
    _getCellIndexWithOutputIdHandle(outputId) {
        return this.cells.findIndex((c) => !!c.outputs.find((o) => o.outputId === outputId));
    }
    reset(cells, metadata, transientOptions) {
        this.transientOptions = transientOptions;
        const executions = this._notebookExecutionStateService.getCellExecutionsForNotebook(this.uri);
        const executingCellHandles = executions
            .filter((exe) => exe.state === NotebookCellExecutionState.Executing)
            .map((exe) => exe.cellHandle);
        const edits = NotebookTextModel_1.computeEdits(this, cells, executingCellHandles);
        this.applyEdits([...edits, { editType: 5 /* CellEditType.DocumentMetadata */, metadata }], true, undefined, () => undefined, undefined, false);
    }
    createSnapshot(options) {
        const transientOptions = options.transientOptions ?? this.transientOptions;
        const data = {
            metadata: filter(this.metadata, (key) => !transientOptions.transientDocumentMetadata[key]),
            cells: [],
        };
        let outputSize = 0;
        for (const cell of this.cells) {
            const cellData = {
                cellKind: cell.cellKind,
                language: cell.language,
                mime: cell.mime,
                source: cell.getValue(),
                outputs: [],
                internalMetadata: cell.internalMetadata,
            };
            if (options.context === 2 /* SnapshotContext.Backup */ && options.outputSizeLimit > 0) {
                cell.outputs.forEach((output) => {
                    output.outputs.forEach((item) => {
                        outputSize += item.data.byteLength;
                    });
                });
                if (outputSize > options.outputSizeLimit) {
                    throw new Error('Notebook too large to backup');
                }
            }
            cellData.outputs = !transientOptions.transientOutputs ? cell.outputs : [];
            cellData.metadata = filter(cell.metadata, (key) => !transientOptions.transientCellMetadata[key]);
            data.cells.push(cellData);
        }
        return data;
    }
    restoreSnapshot(snapshot, transientOptions) {
        this.reset(snapshot.cells, snapshot.metadata, transientOptions ?? this.transientOptions);
    }
    static computeEdits(model, cells, executingHandles = []) {
        const edits = [];
        const isExecuting = (cell) => executingHandles.includes(cell.handle);
        const commonPrefix = this._commonPrefix(model.cells, model.cells.length, 0, cells, cells.length, 0, isExecuting);
        if (commonPrefix > 0) {
            for (let i = 0; i < commonPrefix; i++) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: i,
                    metadata: cells[i].metadata ?? {},
                }, ...this._computeOutputEdit(i, model.cells[i].outputs, cells[i].outputs));
            }
        }
        if (model.cells.length === cells.length && commonPrefix === model.cells.length) {
            return edits;
        }
        const commonSuffix = this._commonSuffix(model.cells, model.cells.length - commonPrefix, commonPrefix, cells, cells.length - commonPrefix, commonPrefix, isExecuting);
        if (commonSuffix > 0) {
            edits.push({
                editType: 1 /* CellEditType.Replace */,
                index: commonPrefix,
                count: model.cells.length - commonPrefix - commonSuffix,
                cells: cells.slice(commonPrefix, cells.length - commonSuffix),
            });
        }
        else if (commonPrefix > 0) {
            edits.push({
                editType: 1 /* CellEditType.Replace */,
                index: commonPrefix,
                count: model.cells.length - commonPrefix,
                cells: cells.slice(commonPrefix),
            });
        }
        else {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: 0, count: model.cells.length, cells });
        }
        if (commonSuffix > 0) {
            // has same suffix
            for (let i = commonSuffix; i > 0; i--) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: model.cells.length - i,
                    metadata: cells[cells.length - i].metadata ?? {},
                }, ...this._computeOutputEdit(model.cells.length - i, model.cells[model.cells.length - i].outputs, cells[cells.length - i].outputs));
            }
        }
        return edits;
    }
    static _computeOutputEdit(index, a, b) {
        if (a.length !== b.length) {
            return [
                {
                    editType: 2 /* CellEditType.Output */,
                    index: index,
                    outputs: b,
                    append: false,
                },
            ];
        }
        if (a.length === 0) {
            // no output
            return [];
        }
        // same length
        return b.map((output, i) => {
            return {
                editType: 7 /* CellEditType.OutputItems */,
                outputId: a[i].outputId,
                items: output.outputs,
                append: false,
            };
        });
    }
    static _commonPrefix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a[aDelta + i].fastEqual(b[bDelta + i], isExecuting(a[aDelta + i])); i++) {
            result++;
        }
        return result;
    }
    static _commonSuffix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult &&
            a[aDelta + aLen - i - 1].fastEqual(b[bDelta + bLen - i - 1], isExecuting(a[aDelta + aLen - i - 1])); i++) {
            result++;
        }
        return result;
    }
    isOnlyEditingMetadataOnNewCells(rawEdits) {
        for (const edit of rawEdits) {
            if (edit.editType === 9 /* CellEditType.PartialInternalMetadata */) {
                continue;
            }
            if (edit.editType !== 3 /* CellEditType.Metadata */ &&
                edit.editType !== 8 /* CellEditType.PartialMetadata */) {
                return false;
            }
            if ('index' in edit && !this.newCellsFromLastEdit.has(this.cells[edit.index].handle)) {
                return false;
            }
            if ('handle' in edit && !this.newCellsFromLastEdit.has(edit.handle)) {
                return false;
            }
        }
        return true;
    }
    applyEdits(rawEdits, synchronous, beginSelectionState, endSelectionsComputer, undoRedoGroup, computeUndoRedo) {
        this._pauseableEmitter.pause();
        this._operationManager.pushStackElement(this._alternativeVersionId, undefined);
        if (computeUndoRedo && this.isOnlyEditingMetadataOnNewCells(rawEdits)) {
            if (!this._operationManager.appendPreviousOperation()) {
                // we can't append the previous operation, so just don't compute undo/redo
                computeUndoRedo = false;
            }
        }
        else if (computeUndoRedo) {
            this.newCellsFromLastEdit.clear();
        }
        try {
            this._doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
            return true;
        }
        finally {
            if (!this._pauseableEmitter.isEmpty) {
                // Update selection and versionId after applying edits.
                const endSelections = endSelectionsComputer();
                this._increaseVersionId(this._operationManager.isUndoStackEmpty() && !this._pauseableEmitter.isDirtyEvent());
                // Finalize undo element
                this._operationManager.pushStackElement(this._alternativeVersionId, endSelections);
                // Broadcast changes
                this._pauseableEmitter.fire({
                    rawEvents: [],
                    versionId: this.versionId,
                    synchronous: synchronous,
                    endSelectionState: endSelections,
                });
            }
            this._pauseableEmitter.resume();
        }
    }
    _doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const editsWithDetails = rawEdits
            .map((edit, index) => {
            let cellIndex = -1;
            if ('index' in edit) {
                cellIndex = edit.index;
            }
            else if ('handle' in edit) {
                cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
            }
            else if ('outputId' in edit) {
                cellIndex = this._getCellIndexWithOutputIdHandle(edit.outputId);
                if (this._indexIsInvalid(cellIndex)) {
                    // The referenced output may have been created in this batch of edits
                    cellIndex = this._getCellIndexWithOutputIdHandleFromEdits(edit.outputId, rawEdits.slice(0, index));
                }
                if (this._indexIsInvalid(cellIndex)) {
                    // It's possible for an edit to refer to an output which was just cleared, ignore it without throwing
                    return null;
                }
            }
            else if (edit.editType !== 5 /* CellEditType.DocumentMetadata */) {
                throw new Error('Invalid cell edit');
            }
            return {
                edit,
                cellIndex,
                end: edit.editType === 5 /* CellEditType.DocumentMetadata */
                    ? undefined
                    : edit.editType === 1 /* CellEditType.Replace */
                        ? edit.index + edit.count
                        : cellIndex,
                originalIndex: index,
            };
        })
            .filter(isDefined);
        // compress all edits which have no side effects on cell index
        const edits = this._mergeCellEdits(editsWithDetails)
            .sort((a, b) => {
            if (a.end === undefined) {
                return -1;
            }
            if (b.end === undefined) {
                return -1;
            }
            return b.end - a.end || b.originalIndex - a.originalIndex;
        })
            .reduce((prev, curr) => {
            if (!prev.length) {
                // empty
                prev.push([curr]);
            }
            else {
                const last = prev[prev.length - 1];
                const index = last[0].cellIndex;
                if (curr.cellIndex === index) {
                    last.push(curr);
                }
                else {
                    prev.push([curr]);
                }
            }
            return prev;
        }, [])
            .map((editsOnSameIndex) => {
            const replaceEdits = [];
            const otherEdits = [];
            editsOnSameIndex.forEach((edit) => {
                if (edit.edit.editType === 1 /* CellEditType.Replace */) {
                    replaceEdits.push(edit);
                }
                else {
                    otherEdits.push(edit);
                }
            });
            return [...otherEdits.reverse(), ...replaceEdits];
        });
        const flattenEdits = edits.flat();
        for (const { edit, cellIndex } of flattenEdits) {
            switch (edit.editType) {
                case 1 /* CellEditType.Replace */:
                    this._replaceCells(edit.index, edit.count, edit.cells, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 2 /* CellEditType.Output */: {
                    this._assertIndex(cellIndex);
                    const cell = this._cells[cellIndex];
                    if (edit.append) {
                        this._spliceNotebookCellOutputs(cell, {
                            start: cell.outputs.length,
                            deleteCount: 0,
                            newOutputs: edit.outputs.map((op) => new NotebookCellOutputTextModel(op)),
                        }, true, computeUndoRedo);
                    }
                    else {
                        this._spliceNotebookCellOutputs2(cell, edit.outputs, computeUndoRedo);
                    }
                    break;
                }
                case 7 /* CellEditType.OutputItems */:
                    {
                        this._assertIndex(cellIndex);
                        const cell = this._cells[cellIndex];
                        if (edit.append) {
                            this._appendNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                        else {
                            this._replaceNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                    }
                    break;
                case 3 /* CellEditType.Metadata */:
                    this._assertIndex(edit.index);
                    this._changeCellMetadata(this._cells[edit.index], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 8 /* CellEditType.PartialMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellMetadataPartial(this._cells[cellIndex], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 9 /* CellEditType.PartialInternalMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellInternalMetadataPartial(this._cells[cellIndex], edit.internalMetadata);
                    break;
                case 4 /* CellEditType.CellLanguage */:
                    this._assertIndex(edit.index);
                    this._changeCellLanguage(this._cells[edit.index], edit.language, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 5 /* CellEditType.DocumentMetadata */:
                    this._updateNotebookCellMetadata(edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 6 /* CellEditType.Move */:
                    this._moveCellToIdx(edit.index, edit.length, edit.newIdx, synchronous, computeUndoRedo, beginSelectionState, undefined, undoRedoGroup);
                    break;
            }
        }
    }
    _mergeCellEdits(rawEdits) {
        const mergedEdits = [];
        rawEdits.forEach((edit) => {
            if (mergedEdits.length) {
                const last = mergedEdits[mergedEdits.length - 1];
                if (last.edit.editType === 2 /* CellEditType.Output */ &&
                    last.edit.append &&
                    edit.edit.editType === 2 /* CellEditType.Output */ &&
                    edit.edit.append &&
                    last.cellIndex === edit.cellIndex) {
                    last.edit.outputs = [...last.edit.outputs, ...edit.edit.outputs];
                }
                else if (last.edit.editType === 2 /* CellEditType.Output */ &&
                    !last.edit.append && // last cell is not append
                    last.edit.outputs.length === 0 && // last cell is clear outputs
                    edit.edit.editType === 2 /* CellEditType.Output */ &&
                    edit.edit.append &&
                    last.cellIndex === edit.cellIndex) {
                    last.edit.append = false;
                    last.edit.outputs = edit.edit.outputs;
                }
                else {
                    mergedEdits.push(edit);
                }
            }
            else {
                mergedEdits.push(edit);
            }
        });
        return mergedEdits;
    }
    _getDefaultCollapseState(cellDto) {
        const defaultConfig = cellDto.cellKind === CellKind.Code
            ? this._defaultCollapseConfig?.codeCell
            : this._defaultCollapseConfig?.markupCell;
        return cellDto.collapseState ?? defaultConfig ?? undefined;
    }
    _replaceCells(index, count, cellDtos, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (count === 0 && cellDtos.length === 0) {
            return;
        }
        const oldViewCells = this._cells.slice(0);
        const oldSet = new Set();
        oldViewCells.forEach((cell) => {
            oldSet.add(cell.handle);
        });
        // prepare remove
        for (let i = index; i < Math.min(index + count, this._cells.length); i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        // prepare add
        const cells = cellDtos.map((cellDto) => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            const collapseState = this._getDefaultCollapseState(cellDto);
            const cell = new NotebookCellTextModel(cellUri, cellHandle, cellDto.source, cellDto.language, cellDto.mime, cellDto.cellKind, cellDto.outputs || [], cellDto.metadata, cellDto.internalMetadata, collapseState, this.transientOptions, this._languageService, this._languageDetectionService);
            const textModel = this._modelService.getModel(cellUri);
            if (textModel && textModel instanceof TextModel) {
                cell.textModel = textModel;
                cell.language = cellDto.language;
                cell.textModel.setValue(cellDto.source);
                cell.resetTextBuffer(cell.textModel.getTextBuffer());
            }
            const dirtyStateListener = cell.onDidChangeContent((e) => {
                this._bindCellContentHandler(cell, e);
            });
            this.newCellsFromLastEdit.add(cell.handle);
            this._cellListeners.set(cell.handle, dirtyStateListener);
            this._register(cell);
            return cell;
        });
        // compute change
        const cellsCopy = this._cells.slice(0);
        cellsCopy.splice(index, count, ...cells);
        const diffs = diff(this._cells, cellsCopy, (cell) => {
            return oldSet.has(cell.handle);
        }).map((diff) => {
            return [diff.start, diff.deleteCount, diff.toInsert];
        });
        this._onWillAddRemoveCells.fire({
            rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes: diffs },
        });
        // make change
        this._cells = cellsCopy;
        const undoDiff = diffs.map((diff) => {
            const deletedCells = oldViewCells.slice(diff[0], diff[0] + diff[1]);
            return [diff[0], deletedCells, diff[2]];
        });
        if (computeUndoRedo) {
            this._operationManager.pushEditOperation(new SpliceCellsEdit(this.uri, undoDiff, {
                insertCell: (index, cell, endSelections) => {
                    this._insertNewCell(index, [cell], true, endSelections);
                },
                deleteCell: (index, endSelections) => {
                    this._removeCell(index, 1, true, endSelections);
                },
                replaceCell: (index, count, cells, endSelections) => {
                    this._replaceNewCells(index, count, cells, true, endSelections);
                },
            }, undefined, undefined), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        // should be deferred
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes: diffs, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: undefined,
        });
    }
    _increaseVersionId(transient) {
        this._versionId = this._versionId + 1;
        if (!transient) {
            this._notebookSpecificAlternativeId = this._versionId;
        }
        this._alternativeVersionId = this._generateAlternativeId();
    }
    _overwriteAlternativeVersionId(newAlternativeVersionId) {
        this._alternativeVersionId = newAlternativeVersionId;
        this._notebookSpecificAlternativeId = Number(newAlternativeVersionId.substring(0, newAlternativeVersionId.indexOf('_')));
    }
    _updateNotebookCellMetadata(metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const oldMetadata = this.metadata;
        const triggerDirtyChange = this._isDocumentMetadataChanged(this.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const that = this;
                this._operationManager.pushEditOperation(new (class {
                    constructor() {
                        this.type = 0 /* UndoRedoElementType.Resource */;
                        this.label = 'Update Cell Metadata';
                        this.code = 'undoredo.textBufferEdit';
                    }
                    get resource() {
                        return that.uri;
                    }
                    undo() {
                        that._updateNotebookCellMetadata(oldMetadata, false, beginSelectionState, undoRedoGroup);
                    }
                    redo() {
                        that._updateNotebookCellMetadata(metadata, false, beginSelectionState, undoRedoGroup);
                    }
                })(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        this.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeDocumentMetadata,
                    metadata: this.metadata,
                    transient: !triggerDirtyChange,
                },
            ],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined,
        });
    }
    _insertNewCell(index, cells, synchronous, endSelections) {
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, 0, cells]];
        this._onWillAddRemoveCells.fire({
            rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes },
        });
        this._cells.splice(index, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections,
        });
        return;
    }
    _removeCell(index, count, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        const changes = [[index, count, []]];
        this._onWillAddRemoveCells.fire({
            rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes },
        });
        this._cells.splice(index, count);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections,
        });
    }
    _replaceNewCells(index, count, cells, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, count, cells]];
        this._onWillAddRemoveCells.fire({
            rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes },
        });
        this._cells.splice(index, count, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections,
        });
    }
    _isDocumentMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if (key === 'custom') {
                if (!this._customMetadataEqual(a[key], b[key]) &&
                    !this.transientOptions.transientDocumentMetadata[key]) {
                    return true;
                }
            }
            else if (a[key] !== b[key] &&
                !this.transientOptions.transientDocumentMetadata[key]) {
                return true;
            }
        }
        return false;
    }
    _isCellMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if (a[key] !== b[key] &&
                !this.transientOptions.transientCellMetadata[key]) {
                return true;
            }
        }
        return false;
    }
    _customMetadataEqual(a, b) {
        if (!a && !b) {
            // both of them are nullish or undefined
            return true;
        }
        if (!a || !b) {
            return false;
        }
        const aProps = Object.getOwnPropertyNames(a);
        const bProps = Object.getOwnPropertyNames(b);
        if (aProps.length !== bProps.length) {
            return false;
        }
        for (let i = 0; i < aProps.length; i++) {
            const propName = aProps[i];
            if (a[propName] !== b[propName]) {
                return false;
            }
        }
        return true;
    }
    _changeCellMetadataPartial(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const newMetadata = {
            ...cell.metadata,
        };
        let k;
        for (k in metadata) {
            const value = metadata[k] ?? undefined;
            newMetadata[k] = value;
        }
        return this._changeCellMetadata(cell, newMetadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
    }
    _changeCellMetadata(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const triggerDirtyChange = this._isCellMetadataChanged(cell.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const index = this._cells.indexOf(cell);
                this._operationManager.pushEditOperation(new CellMetadataEdit(this.uri, index, Object.freeze(cell.metadata), Object.freeze(metadata), {
                    updateCellMetadata: (index, newMetadata) => {
                        const cell = this._cells[index];
                        if (!cell) {
                            return;
                        }
                        this._changeCellMetadata(cell, newMetadata, false, beginSelectionState, undoRedoGroup);
                    },
                }), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        // should be deferred
        cell.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellMetadata,
                    index: this._cells.indexOf(cell),
                    metadata: cell.metadata,
                    transient: !triggerDirtyChange,
                },
            ],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined,
        });
    }
    _changeCellInternalMetadataPartial(cell, internalMetadata) {
        const newInternalMetadata = {
            ...cell.internalMetadata,
        };
        let k;
        for (k in internalMetadata) {
            const value = internalMetadata[k] ?? undefined;
            newInternalMetadata[k] = value;
        }
        cell.internalMetadata = newInternalMetadata;
        this._pauseableEmitter.fire({
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellInternalMetadata,
                    index: this._cells.indexOf(cell),
                    internalMetadata: cell.internalMetadata,
                    transient: true,
                },
            ],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined,
        });
    }
    _changeCellLanguage(cell, languageId, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (cell.language === languageId) {
            return;
        }
        const oldLanguage = cell.language;
        cell.language = languageId;
        if (computeUndoRedo) {
            const that = this;
            this._operationManager.pushEditOperation(new (class {
                constructor() {
                    this.type = 0 /* UndoRedoElementType.Resource */;
                    this.label = 'Update Cell Language';
                    this.code = 'undoredo.textBufferEdit';
                }
                get resource() {
                    return that.uri;
                }
                undo() {
                    that._changeCellLanguage(cell, oldLanguage, false, beginSelectionState, undoRedoGroup);
                }
                redo() {
                    that._changeCellLanguage(cell, languageId, false, beginSelectionState, undoRedoGroup);
                }
            })(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        this._pauseableEmitter.fire({
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.ChangeCellLanguage,
                    index: this._cells.indexOf(cell),
                    language: languageId,
                    transient: false,
                },
            ],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined,
        });
    }
    _spliceNotebookCellOutputs2(cell, outputs, computeUndoRedo) {
        if (outputs.length === 0 && cell.outputs.length === 0) {
            return;
        }
        if (outputs.length <= 1) {
            this._spliceNotebookCellOutputs(cell, {
                start: 0,
                deleteCount: cell.outputs.length,
                newOutputs: outputs.map((op) => new NotebookCellOutputTextModel(op)),
            }, false, computeUndoRedo);
            return;
        }
        const diff = new LcsDiff(new OutputSequence(cell.outputs), new OutputSequence(outputs));
        const diffResult = diff.ComputeDiff(false);
        const splices = diffResult.changes.map((change) => ({
            start: change.originalStart,
            deleteCount: change.originalLength,
            // create cell output text model only when it's inserted into the notebook document
            newOutputs: outputs
                .slice(change.modifiedStart, change.modifiedStart + change.modifiedLength)
                .map((op) => new NotebookCellOutputTextModel(op)),
        }));
        splices.reverse().forEach((splice) => {
            this._spliceNotebookCellOutputs(cell, splice, false, computeUndoRedo);
        });
    }
    _spliceNotebookCellOutputs(cell, splice, append, computeUndoRedo) {
        cell.spliceNotebookCellOutputs(splice);
        this._pauseableEmitter.fire({
            rawEvents: [
                {
                    kind: NotebookCellsChangeType.Output,
                    index: this._cells.indexOf(cell),
                    outputs: cell.outputs.map((output) => output.asDto()) ?? [],
                    append,
                    transient: this.transientOptions.transientOutputs,
                },
            ],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined,
        });
    }
    _appendNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, true, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [
                    {
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: true,
                        transient: this.transientOptions.transientOutputs,
                    },
                ],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined,
            });
        }
    }
    _replaceNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, false, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [
                    {
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: false,
                        transient: this.transientOptions.transientOutputs,
                    },
                ],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined,
            });
        }
    }
    _moveCellToIdx(index, length, newIdx, synchronous, pushedToUndoStack, beforeSelections, endSelections, undoRedoGroup) {
        if (pushedToUndoStack) {
            this._operationManager.pushEditOperation(new MoveCellEdit(this.uri, index, length, newIdx, {
                moveCell: (fromIndex, length, toIndex, beforeSelections, endSelections) => {
                    this._moveCellToIdx(fromIndex, length, toIndex, true, false, beforeSelections, endSelections, undoRedoGroup);
                },
            }, beforeSelections, endSelections), beforeSelections, endSelections, this._alternativeVersionId, undoRedoGroup);
        }
        this._assertIndex(index);
        this._assertIndex(newIdx);
        const cells = this._cells.splice(index, length);
        this._cells.splice(newIdx, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [
                { kind: NotebookCellsChangeType.Move, index, length, newIdx, cells, transient: false },
            ],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections,
        });
        return true;
    }
    _assertIndex(index) {
        if (this._indexIsInvalid(index)) {
            throw new Error(`model index out of range ${index}`);
        }
    }
    _indexIsInvalid(index) {
        return index < 0 || index >= this._cells.length;
    }
    //#region Find
    findNextMatch(searchString, searchStart, isRegex, matchCase, wordSeparators, searchEnd) {
        // check if search cell index is valid
        this._assertIndex(searchStart.cellIndex);
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        let cellIndex = searchStart.cellIndex;
        let searchStartPosition = searchStart.position;
        let searchEndCell = this._cells.length;
        while (cellIndex < searchEndCell) {
            const cell = this._cells[cellIndex];
            // if we have wrapped back to the point of the initial search cell, we search from beginning to the provided searchEnd position
            const wrapFlag = searchEnd &&
                cellIndex === searchEnd.cellIndex &&
                searchStartPosition.isBefore(searchEnd.position);
            const searchRange = new Range(searchStartPosition.lineNumber, searchStartPosition.column, wrapFlag ? searchEnd.position.lineNumber : cell.textBuffer.getLineCount(), wrapFlag
                ? searchEnd.position.column
                : cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const result = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1);
            if (result.length > 0) {
                return { cell, match: result[0] };
            }
            else if (wrapFlag) {
                // this means there are no more valid matches in the notebook
                break;
            }
            // Move to the next cell
            cellIndex++;
            // wrap if a searchEnd is provided and we are past the end of the notebook
            if (searchEnd && cellIndex >= this._cells.length) {
                cellIndex = 0;
                searchEndCell = searchEnd.cellIndex + 1;
            }
            searchStartPosition = new Position(1, 1); // Reset position to start of the next cell
        }
        return null;
    }
    findMatches(searchString, isRegex, matchCase, wordSeparators) {
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        const results = [];
        for (const cell of this._cells) {
            const searchRange = new Range(1, 1, cell.textBuffer.getLineCount(), cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const matches = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1000);
            if (matches.length > 0) {
                results.push({ cell, matches: matches });
            }
        }
        return results;
    }
};
NotebookTextModel = NotebookTextModel_1 = __decorate([
    __param(5, IUndoRedoService),
    __param(6, IModelService),
    __param(7, ILanguageService),
    __param(8, ILanguageDetectionService),
    __param(9, INotebookExecutionStateService)
], NotebookTextModel);
export { NotebookTextModel };
class OutputSequence {
    constructor(outputs) {
        this.outputs = outputs;
    }
    getElements() {
        return this.outputs.map((output) => {
            return hash(output.outputs.map((output) => ({
                mime: output.mime,
                data: output.data,
            })));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9tb2RlbC9ub3RlYm9va1RleHRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFhLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxPQUFPLEVBR04sZ0JBQWdCLEdBSWhCLE1BQU0scURBQXFE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