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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvbm90ZWJvb2tUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsT0FBTyxFQUdOLGdCQUFnQixHQUloQixNQUFNLHFEQUFxRCxDQUFB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