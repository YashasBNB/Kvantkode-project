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
import { groupBy } from '../../../../../base/common/collections.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../base/common/numbers.js';
import * as strings from '../../../../../base/common/strings.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { MultiModelEditStackElement, SingleModelEditStackElement, } from '../../../../../editor/common/model/editStack.js';
import { IntervalNode, IntervalTree } from '../../../../../editor/common/model/intervalTree.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { CellFindMatchModel } from '../contrib/find/findModel.js';
import { CellEditState, isNotebookCellDecoration, } from '../notebookBrowser.js';
import { NotebookMetadataChangedEvent } from '../notebookViewEvents.js';
import { NotebookCellSelectionCollection } from './cellSelectionCollection.js';
import { CodeCellViewModel } from './codeCellViewModel.js';
import { MarkupCellViewModel } from './markupCellViewModel.js';
import { CellKind, NotebookCellsChangeType, NotebookFindScopeType, SelectionStateType, } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../common/notebookExecutionStateService.js';
import { cellIndexesToRanges, cellRangesToIndexes, reduceCellRanges, } from '../../common/notebookRange.js';
const invalidFunc = () => {
    throw new Error(`Invalid change accessor`);
};
class DecorationsTree {
    constructor() {
        this._decorationsTree = new IntervalTree();
    }
    intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations = false) {
        const r1 = this._decorationsTree.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        return r1;
    }
    search(filterOwnerId, filterOutValidation, overviewRulerOnly, cachedVersionId, onlyMarginDecorations) {
        return this._decorationsTree.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
    }
    collectNodesFromOwner(ownerId) {
        const r1 = this._decorationsTree.collectNodesFromOwner(ownerId);
        return r1;
    }
    collectNodesPostOrder() {
        const r1 = this._decorationsTree.collectNodesPostOrder();
        return r1;
    }
    insert(node) {
        this._decorationsTree.insert(node);
    }
    delete(node) {
        this._decorationsTree.delete(node);
    }
    resolveNode(node, cachedVersionId) {
        this._decorationsTree.resolveNode(node, cachedVersionId);
    }
    acceptReplace(offset, length, textLength, forceMoveMarkers) {
        this._decorationsTree.acceptReplace(offset, length, textLength, forceMoveMarkers);
    }
}
const TRACKED_RANGE_OPTIONS = [
    ModelDecorationOptions.register({
        description: 'notebook-view-model-tracked-range-always-grows-when-typing-at-edges',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
    }),
    ModelDecorationOptions.register({
        description: 'notebook-view-model-tracked-range-never-grows-when-typing-at-edges',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    }),
    ModelDecorationOptions.register({
        description: 'notebook-view-model-tracked-range-grows-only-when-typing-before',
        stickiness: 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */,
    }),
    ModelDecorationOptions.register({
        description: 'notebook-view-model-tracked-range-grows-only-when-typing-after',
        stickiness: 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */,
    }),
];
function _normalizeOptions(options) {
    if (options instanceof ModelDecorationOptions) {
        return options;
    }
    return ModelDecorationOptions.createDynamic(options);
}
let MODEL_ID = 0;
let NotebookViewModel = class NotebookViewModel extends Disposable {
    get options() {
        return this._options;
    }
    get onDidChangeOptions() {
        return this._onDidChangeOptions.event;
    }
    get viewCells() {
        return this._viewCells;
    }
    get length() {
        return this._viewCells.length;
    }
    get notebookDocument() {
        return this._notebook;
    }
    get uri() {
        return this._notebook.uri;
    }
    get metadata() {
        return this._notebook.metadata;
    }
    get isRepl() {
        return this.viewType === 'repl';
    }
    get onDidChangeViewCells() {
        return this._onDidChangeViewCells.event;
    }
    get lastNotebookEditResource() {
        if (this._lastNotebookEditResource.length) {
            return this._lastNotebookEditResource[this._lastNotebookEditResource.length - 1];
        }
        return null;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get onDidChangeSelection() {
        return this._onDidChangeSelection.event;
    }
    get selectionHandles() {
        const handlesSet = new Set();
        const handles = [];
        cellRangesToIndexes(this._selectionCollection.selections)
            .map((index) => (index < this.length ? this.cellAt(index) : undefined))
            .forEach((cell) => {
            if (cell && !handlesSet.has(cell.handle)) {
                handles.push(cell.handle);
            }
        });
        return handles;
    }
    set selectionHandles(selectionHandles) {
        const indexes = selectionHandles.map((handle) => this._viewCells.findIndex((cell) => cell.handle === handle));
        this._selectionCollection.setSelections(cellIndexesToRanges(indexes), true, 'model');
    }
    get focused() {
        return this._focused;
    }
    constructor(viewType, _notebook, _viewContext, _layoutInfo, _options, _instantiationService, _bulkEditService, _undoService, _textModelService, notebookExecutionStateService) {
        super();
        this.viewType = viewType;
        this._notebook = _notebook;
        this._viewContext = _viewContext;
        this._layoutInfo = _layoutInfo;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._bulkEditService = _bulkEditService;
        this._undoService = _undoService;
        this._textModelService = _textModelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this._localStore = this._register(new DisposableStore());
        this._handleToViewCellMapping = new Map();
        this._onDidChangeOptions = this._register(new Emitter());
        this._viewCells = [];
        this._onDidChangeViewCells = this._register(new Emitter());
        this._lastNotebookEditResource = [];
        this._onDidChangeSelection = this._register(new Emitter());
        this._selectionCollection = this._register(new NotebookCellSelectionCollection());
        this._decorationsTree = new DecorationsTree();
        this._decorations = Object.create(null);
        this._lastDecorationId = 0;
        this._foldingRanges = null;
        this._onDidFoldingStateChanged = new Emitter();
        this.onDidFoldingStateChanged = this._onDidFoldingStateChanged.event;
        this._hiddenRanges = [];
        this._focused = true;
        this._decorationIdToCellMap = new Map();
        this._statusBarItemIdToCellMap = new Map();
        this._lastOverviewRulerDecorationId = 0;
        this._overviewRulerDecorations = new Map();
        MODEL_ID++;
        this.id = '$notebookViewModel' + MODEL_ID;
        this._instanceId = strings.singleLetterHash(MODEL_ID);
        const compute = (changes, synchronous) => {
            const diffs = changes.map((splice) => {
                return [
                    splice[0],
                    splice[1],
                    splice[2].map((cell) => {
                        return createCellViewModel(this._instantiationService, this, cell, this._viewContext);
                    }),
                ];
            });
            diffs.reverse().forEach((diff) => {
                const deletedCells = this._viewCells.splice(diff[0], diff[1], ...diff[2]);
                this._decorationsTree.acceptReplace(diff[0], diff[1], diff[2].length, true);
                deletedCells.forEach((cell) => {
                    this._handleToViewCellMapping.delete(cell.handle);
                    // dispose the cell to release ref to the cell text document
                    cell.dispose();
                });
                diff[2].forEach((cell) => {
                    this._handleToViewCellMapping.set(cell.handle, cell);
                    this._localStore.add(cell);
                });
            });
            const selectionHandles = this.selectionHandles;
            this._onDidChangeViewCells.fire({
                synchronous: synchronous,
                splices: diffs,
            });
            let endSelectionHandles = [];
            if (selectionHandles.length) {
                const primaryHandle = selectionHandles[0];
                const primarySelectionIndex = this._viewCells.indexOf(this.getCellByHandle(primaryHandle));
                endSelectionHandles = [primaryHandle];
                let delta = 0;
                for (let i = 0; i < diffs.length; i++) {
                    const diff = diffs[0];
                    if (diff[0] + diff[1] <= primarySelectionIndex) {
                        delta += diff[2].length - diff[1];
                        continue;
                    }
                    if (diff[0] > primarySelectionIndex) {
                        endSelectionHandles = [primaryHandle];
                        break;
                    }
                    if (diff[0] + diff[1] > primarySelectionIndex) {
                        endSelectionHandles = [this._viewCells[diff[0] + delta].handle];
                        break;
                    }
                }
            }
            // TODO@rebornix
            const selectionIndexes = endSelectionHandles.map((handle) => this._viewCells.findIndex((cell) => cell.handle === handle));
            this._selectionCollection.setState(cellIndexesToRanges([selectionIndexes[0]])[0], cellIndexesToRanges(selectionIndexes), true, 'model');
        };
        this._register(this._notebook.onDidChangeContent((e) => {
            for (let i = 0; i < e.rawEvents.length; i++) {
                const change = e.rawEvents[i];
                let changes = [];
                const synchronous = e.synchronous ?? true;
                if (change.kind === NotebookCellsChangeType.ModelChange ||
                    change.kind === NotebookCellsChangeType.Initialize) {
                    changes = change.changes;
                    compute(changes, synchronous);
                    continue;
                }
                else if (change.kind === NotebookCellsChangeType.Move) {
                    compute([[change.index, change.length, []]], synchronous);
                    compute([[change.newIdx, 0, change.cells]], synchronous);
                }
                else {
                    continue;
                }
            }
        }));
        this._register(this._notebook.onDidChangeContent((contentChanges) => {
            contentChanges.rawEvents.forEach((e) => {
                if (e.kind === NotebookCellsChangeType.ChangeDocumentMetadata) {
                    this._viewContext.eventDispatcher.emit([
                        new NotebookMetadataChangedEvent(this._notebook.metadata),
                    ]);
                }
            });
            if (contentChanges.endSelectionState) {
                this.updateSelectionsState(contentChanges.endSelectionState);
            }
        }));
        this._register(this._viewContext.eventDispatcher.onDidChangeLayout((e) => {
            this._layoutInfo = e.value;
            this._viewCells.forEach((cell) => {
                if (cell.cellKind === CellKind.Markup) {
                    if (e.source.width || e.source.fontInfo) {
                        cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
                    }
                }
                else {
                    if (e.source.width !== undefined) {
                        cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
                    }
                }
            });
        }));
        this._register(this._viewContext.notebookOptions.onDidChangeOptions((e) => {
            for (let i = 0; i < this.length; i++) {
                const cell = this._viewCells[i];
                cell.updateOptions(e);
            }
        }));
        this._register(notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type !== NotebookExecutionType.cell) {
                return;
            }
            const cell = this.getCellByHandle(e.cellHandle);
            if (cell instanceof CodeCellViewModel) {
                cell.updateExecutionState(e);
            }
        }));
        this._register(this._selectionCollection.onDidChangeSelection((e) => {
            this._onDidChangeSelection.fire(e);
        }));
        const viewCellCount = this.isRepl
            ? this._notebook.cells.length - 1
            : this._notebook.cells.length;
        for (let i = 0; i < viewCellCount; i++) {
            this._viewCells.push(createCellViewModel(this._instantiationService, this, this._notebook.cells[i], this._viewContext));
        }
        this._viewCells.forEach((cell) => {
            this._handleToViewCellMapping.set(cell.handle, cell);
        });
    }
    updateOptions(newOptions) {
        this._options = { ...this._options, ...newOptions };
        this._viewCells.forEach((cell) => cell.updateOptions({ readonly: this._options.isReadOnly }));
        this._onDidChangeOptions.fire();
    }
    getFocus() {
        return this._selectionCollection.focus;
    }
    getSelections() {
        return this._selectionCollection.selections;
    }
    getMostRecentlyExecutedCell() {
        const handle = this.notebookExecutionStateService.getLastCompletedCellForNotebook(this._notebook.uri);
        return handle !== undefined ? this.getCellByHandle(handle) : undefined;
    }
    setEditorFocus(focused) {
        this._focused = focused;
    }
    validateRange(cellRange) {
        if (!cellRange) {
            return null;
        }
        const start = clamp(cellRange.start, 0, this.length);
        const end = clamp(cellRange.end, 0, this.length);
        if (start <= end) {
            return { start, end };
        }
        else {
            return { start: end, end: start };
        }
    }
    // selection change from list view's `setFocus` and `setSelection` should always use `source: view` to prevent events breaking the list view focus/selection change transaction
    updateSelectionsState(state, source = 'model') {
        if (this._focused || source === 'model') {
            if (state.kind === SelectionStateType.Handle) {
                const primaryIndex = state.primary !== null ? this.getCellIndexByHandle(state.primary) : null;
                const primarySelection = primaryIndex !== null
                    ? this.validateRange({ start: primaryIndex, end: primaryIndex + 1 })
                    : null;
                const selections = cellIndexesToRanges(state.selections.map((sel) => this.getCellIndexByHandle(sel)))
                    .map((range) => this.validateRange(range))
                    .filter((range) => range !== null);
                this._selectionCollection.setState(primarySelection, reduceCellRanges(selections), true, source);
            }
            else {
                const primarySelection = this.validateRange(state.focus);
                const selections = state.selections
                    .map((range) => this.validateRange(range))
                    .filter((range) => range !== null);
                this._selectionCollection.setState(primarySelection, reduceCellRanges(selections), true, source);
            }
        }
    }
    getFoldingStartIndex(index) {
        if (!this._foldingRanges) {
            return -1;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        return startIndex;
    }
    getFoldingState(index) {
        if (!this._foldingRanges) {
            return 0 /* CellFoldingState.None */;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        if (startIndex !== index) {
            return 0 /* CellFoldingState.None */;
        }
        return this._foldingRanges.isCollapsed(range)
            ? 2 /* CellFoldingState.Collapsed */
            : 1 /* CellFoldingState.Expanded */;
    }
    getFoldedLength(index) {
        if (!this._foldingRanges) {
            return 0;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        const endIndex = this._foldingRanges.getEndLineNumber(range) - 1;
        return endIndex - startIndex;
    }
    updateFoldingRanges(ranges) {
        this._foldingRanges = ranges;
        let updateHiddenAreas = false;
        const newHiddenAreas = [];
        let i = 0; // index into hidden
        let k = 0;
        let lastCollapsedStart = Number.MAX_VALUE;
        let lastCollapsedEnd = -1;
        for (; i < ranges.length; i++) {
            if (!ranges.isCollapsed(i)) {
                continue;
            }
            const startLineNumber = ranges.getStartLineNumber(i) + 1; // the first line is not hidden
            const endLineNumber = ranges.getEndLineNumber(i);
            if (lastCollapsedStart <= startLineNumber && endLineNumber <= lastCollapsedEnd) {
                // ignore ranges contained in collapsed regions
                continue;
            }
            if (!updateHiddenAreas &&
                k < this._hiddenRanges.length &&
                this._hiddenRanges[k].start + 1 === startLineNumber &&
                this._hiddenRanges[k].end + 1 === endLineNumber) {
                // reuse the old ranges
                newHiddenAreas.push(this._hiddenRanges[k]);
                k++;
            }
            else {
                updateHiddenAreas = true;
                newHiddenAreas.push({ start: startLineNumber - 1, end: endLineNumber - 1 });
            }
            lastCollapsedStart = startLineNumber;
            lastCollapsedEnd = endLineNumber;
        }
        if (updateHiddenAreas || k < this._hiddenRanges.length) {
            this._hiddenRanges = newHiddenAreas;
            this._onDidFoldingStateChanged.fire();
        }
        this._viewCells.forEach((cell) => {
            if (cell.cellKind === CellKind.Markup) {
                cell.triggerFoldingStateChange();
            }
        });
    }
    getHiddenRanges() {
        return this._hiddenRanges;
    }
    getOverviewRulerDecorations() {
        return Array.from(this._overviewRulerDecorations.values());
    }
    getCellByHandle(handle) {
        return this._handleToViewCellMapping.get(handle);
    }
    getCellIndexByHandle(handle) {
        return this._viewCells.findIndex((cell) => cell.handle === handle);
    }
    getCellIndex(cell) {
        return this._viewCells.indexOf(cell);
    }
    cellAt(index) {
        // if (index < 0 || index >= this.length) {
        // 	throw new Error(`Invalid index ${index}`);
        // }
        return this._viewCells[index];
    }
    getCellsInRange(range) {
        if (!range) {
            return this._viewCells.slice(0);
        }
        const validatedRange = this.validateRange(range);
        if (validatedRange) {
            const result = [];
            for (let i = validatedRange.start; i < validatedRange.end; i++) {
                result.push(this._viewCells[i]);
            }
            return result;
        }
        return [];
    }
    /**
     * If this._viewCells[index] is visible then return index
     */
    getNearestVisibleCellIndexUpwards(index) {
        for (let i = this._hiddenRanges.length - 1; i >= 0; i--) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldStart > index) {
                continue;
            }
            if (foldStart <= index && foldEnd >= index) {
                return index;
            }
            // foldStart <= index, foldEnd < index
            break;
        }
        return index;
    }
    getNextVisibleCellIndex(index) {
        for (let i = 0; i < this._hiddenRanges.length; i++) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldEnd < index) {
                continue;
            }
            // foldEnd >= index
            if (foldStart <= index) {
                return foldEnd + 1;
            }
            break;
        }
        return index + 1;
    }
    getPreviousVisibleCellIndex(index) {
        for (let i = this._hiddenRanges.length - 1; i >= 0; i--) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldEnd < index) {
                return index;
            }
            if (foldStart <= index) {
                return foldStart;
            }
        }
        return index;
    }
    hasCell(cell) {
        return this._handleToViewCellMapping.has(cell.handle);
    }
    getVersionId() {
        return this._notebook.versionId;
    }
    getAlternativeId() {
        return this._notebook.alternativeVersionId;
    }
    getTrackedRange(id) {
        return this._getDecorationRange(id);
    }
    _getDecorationRange(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        const versionId = this.getVersionId();
        if (node.cachedVersionId !== versionId) {
            this._decorationsTree.resolveNode(node, versionId);
        }
        if (node.range === null) {
            return { start: node.cachedAbsoluteStart - 1, end: node.cachedAbsoluteEnd - 1 };
        }
        return { start: node.range.startLineNumber - 1, end: node.range.endLineNumber - 1 };
    }
    setTrackedRange(id, newRange, newStickiness) {
        const node = id ? this._decorations[id] : null;
        if (!node) {
            if (!newRange) {
                return null;
            }
            return this._deltaCellDecorationsImpl(0, [], [
                {
                    range: new Range(newRange.start + 1, 1, newRange.end + 1, 1),
                    options: TRACKED_RANGE_OPTIONS[newStickiness],
                },
            ])[0];
        }
        if (!newRange) {
            // node exists, the request is to delete => delete node
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
            return null;
        }
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), newRange.start, newRange.end + 1, new Range(newRange.start + 1, 1, newRange.end + 1, 1));
        node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
        this._decorationsTree.insert(node);
        return node.id;
    }
    _deltaCellDecorationsImpl(ownerId, oldDecorationsIds, newDecorations) {
        const versionId = this.getVersionId();
        const oldDecorationsLen = oldDecorationsIds.length;
        let oldDecorationIndex = 0;
        const newDecorationsLen = newDecorations.length;
        let newDecorationIndex = 0;
        const result = new Array(newDecorationsLen);
        while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {
            let node = null;
            if (oldDecorationIndex < oldDecorationsLen) {
                // (1) get ourselves an old node
                do {
                    node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
                } while (!node && oldDecorationIndex < oldDecorationsLen);
                // (2) remove the node from the tree (if it exists)
                if (node) {
                    this._decorationsTree.delete(node);
                }
            }
            if (newDecorationIndex < newDecorationsLen) {
                // (3) create a new node if necessary
                if (!node) {
                    const internalDecorationId = ++this._lastDecorationId;
                    const decorationId = `${this._instanceId};${internalDecorationId}`;
                    node = new IntervalNode(decorationId, 0, 0);
                    this._decorations[decorationId] = node;
                }
                // (4) initialize node
                const newDecoration = newDecorations[newDecorationIndex];
                const range = newDecoration.range;
                const options = _normalizeOptions(newDecoration.options);
                node.ownerId = ownerId;
                node.reset(versionId, range.startLineNumber, range.endLineNumber, Range.lift(range));
                node.setOptions(options);
                this._decorationsTree.insert(node);
                result[newDecorationIndex] = node.id;
                newDecorationIndex++;
            }
            else {
                if (node) {
                    delete this._decorations[node.id];
                }
            }
        }
        return result;
    }
    deltaCellDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach((id) => {
            const handle = this._decorationIdToCellMap.get(id);
            if (handle !== undefined) {
                const cell = this.getCellByHandle(handle);
                cell?.deltaCellDecorations([id], []);
                this._decorationIdToCellMap.delete(id);
            }
            if (this._overviewRulerDecorations.has(id)) {
                this._overviewRulerDecorations.delete(id);
            }
        });
        const result = [];
        newDecorations.forEach((decoration) => {
            if (isNotebookCellDecoration(decoration)) {
                const cell = this.getCellByHandle(decoration.handle);
                const ret = cell?.deltaCellDecorations([], [decoration.options]) || [];
                ret.forEach((id) => {
                    this._decorationIdToCellMap.set(id, decoration.handle);
                });
                result.push(...ret);
            }
            else {
                const id = ++this._lastOverviewRulerDecorationId;
                const decorationId = `_overview_${this.id};${id}`;
                this._overviewRulerDecorations.set(decorationId, decoration);
                result.push(decorationId);
            }
        });
        return result;
    }
    deltaCellStatusBarItems(oldItems, newItems) {
        const deletesByHandle = groupBy(oldItems, (id) => this._statusBarItemIdToCellMap.get(id) ?? -1);
        const result = [];
        newItems.forEach((itemDelta) => {
            const cell = this.getCellByHandle(itemDelta.handle);
            const deleted = deletesByHandle[itemDelta.handle] ?? [];
            delete deletesByHandle[itemDelta.handle];
            deleted.forEach((id) => this._statusBarItemIdToCellMap.delete(id));
            const ret = cell?.deltaCellStatusBarItems(deleted, itemDelta.items) || [];
            ret.forEach((id) => {
                this._statusBarItemIdToCellMap.set(id, itemDelta.handle);
            });
            result.push(...ret);
        });
        for (const _handle in deletesByHandle) {
            const handle = parseInt(_handle);
            const ids = deletesByHandle[handle];
            const cell = this.getCellByHandle(handle);
            cell?.deltaCellStatusBarItems(ids, []);
            ids.forEach((id) => this._statusBarItemIdToCellMap.delete(id));
        }
        return result;
    }
    nearestCodeCellIndex(index /* exclusive */) {
        const nearest = this.viewCells
            .slice(0, index)
            .reverse()
            .findIndex((cell) => cell.cellKind === CellKind.Code);
        if (nearest > -1) {
            return index - nearest - 1;
        }
        else {
            const nearestCellTheOtherDirection = this.viewCells
                .slice(index + 1)
                .findIndex((cell) => cell.cellKind === CellKind.Code);
            if (nearestCellTheOtherDirection > -1) {
                return index + 1 + nearestCellTheOtherDirection;
            }
            return -1;
        }
    }
    getEditorViewState() {
        const editingCells = {};
        const collapsedInputCells = {};
        const collapsedOutputCells = {};
        const cellLineNumberStates = {};
        this._viewCells.forEach((cell, i) => {
            if (cell.getEditState() === CellEditState.Editing) {
                editingCells[i] = true;
            }
            if (cell.isInputCollapsed) {
                collapsedInputCells[i] = true;
            }
            if (cell instanceof CodeCellViewModel && cell.isOutputCollapsed) {
                collapsedOutputCells[i] = true;
            }
            if (cell.lineNumbers !== 'inherit') {
                cellLineNumberStates[i] = cell.lineNumbers;
            }
        });
        const editorViewStates = {};
        this._viewCells
            .map((cell) => ({ handle: cell.model.handle, state: cell.saveEditorViewState() }))
            .forEach((viewState, i) => {
            if (viewState.state) {
                editorViewStates[i] = viewState.state;
            }
        });
        return {
            editingCells,
            editorViewStates,
            cellLineNumberStates,
            collapsedInputCells,
            collapsedOutputCells,
        };
    }
    restoreEditorViewState(viewState) {
        if (!viewState) {
            return;
        }
        this._viewCells.forEach((cell, index) => {
            const isEditing = viewState.editingCells && viewState.editingCells[index];
            const editorViewState = viewState.editorViewStates && viewState.editorViewStates[index];
            cell.updateEditState(isEditing ? CellEditState.Editing : CellEditState.Preview, 'viewState');
            const cellHeight = viewState.cellTotalHeights ? viewState.cellTotalHeights[index] : undefined;
            cell.restoreEditorViewState(editorViewState, cellHeight);
            if (viewState.collapsedInputCells && viewState.collapsedInputCells[index]) {
                cell.isInputCollapsed = true;
            }
            if (viewState.collapsedOutputCells &&
                viewState.collapsedOutputCells[index] &&
                cell instanceof CodeCellViewModel) {
                cell.isOutputCollapsed = true;
            }
            if (viewState.cellLineNumberStates && viewState.cellLineNumberStates[index]) {
                cell.lineNumbers = viewState.cellLineNumberStates[index];
            }
        });
    }
    /**
     * Editor decorations across cells. For example, find decorations for multiple code cells
     * The reason that we can't completely delegate this to CodeEditorWidget is most of the time, the editors for cells are not created yet but we already have decorations for them.
     */
    changeModelDecorations(callback) {
        const changeAccessor = {
            deltaDecorations: (oldDecorations, newDecorations) => {
                return this._deltaModelDecorationsImpl(oldDecorations, newDecorations);
            },
        };
        let result = null;
        try {
            result = callback(changeAccessor);
        }
        catch (e) {
            onUnexpectedError(e);
        }
        changeAccessor.deltaDecorations = invalidFunc;
        return result;
    }
    _deltaModelDecorationsImpl(oldDecorations, newDecorations) {
        const mapping = new Map();
        oldDecorations.forEach((oldDecoration) => {
            const ownerId = oldDecoration.ownerId;
            if (!mapping.has(ownerId)) {
                const cell = this._viewCells.find((cell) => cell.handle === ownerId);
                if (cell) {
                    mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
                }
            }
            const data = mapping.get(ownerId);
            if (data) {
                data.oldDecorations = oldDecoration.decorations;
            }
        });
        newDecorations.forEach((newDecoration) => {
            const ownerId = newDecoration.ownerId;
            if (!mapping.has(ownerId)) {
                const cell = this._viewCells.find((cell) => cell.handle === ownerId);
                if (cell) {
                    mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
                }
            }
            const data = mapping.get(ownerId);
            if (data) {
                data.newDecorations = newDecoration.decorations;
            }
        });
        const ret = [];
        mapping.forEach((value, ownerId) => {
            const cellRet = value.cell.deltaModelDecorations(value.oldDecorations, value.newDecorations);
            ret.push({
                ownerId: ownerId,
                decorations: cellRet,
            });
        });
        return ret;
    }
    //#region Find
    find(value, options) {
        const matches = [];
        let findCells = [];
        if (options.findScope &&
            (options.findScope.findScopeType === NotebookFindScopeType.Cells ||
                options.findScope.findScopeType === NotebookFindScopeType.Text)) {
            const selectedRanges = options.findScope.selectedCellRanges
                ?.map((range) => this.validateRange(range))
                .filter((range) => !!range) ?? [];
            const selectedIndexes = cellRangesToIndexes(selectedRanges);
            findCells = selectedIndexes.map((index) => this._viewCells[index]);
        }
        else {
            findCells = this._viewCells;
        }
        findCells.forEach((cell, index) => {
            const cellMatches = cell.startFind(value, options);
            if (cellMatches) {
                matches.push(new CellFindMatchModel(cellMatches.cell, index, cellMatches.contentMatches, []));
            }
        });
        // filter based on options and editing state
        return matches.filter((match) => {
            if (match.cell.cellKind === CellKind.Code) {
                // code cell, we only include its match if include input is enabled
                return options.includeCodeInput;
            }
            // markup cell, it depends on the editing state
            if (match.cell.getEditState() === CellEditState.Editing) {
                // editing, even if we includeMarkupPreview
                return options.includeMarkupInput;
            }
            else {
                // cell in preview mode, we should only include it if includeMarkupPreview is false but includeMarkupInput is true
                // if includeMarkupPreview is true, then we should include the webview match result other than this
                return !options.includeMarkupPreview && options.includeMarkupInput;
            }
        });
    }
    replaceOne(cell, range, text) {
        const viewCell = cell;
        this._lastNotebookEditResource.push(viewCell.uri);
        return viewCell.resolveTextModel().then(() => {
            this._bulkEditService.apply([new ResourceTextEdit(cell.uri, { range, text })], {
                quotableLabel: 'Notebook Replace',
            });
        });
    }
    async replaceAll(matches, texts) {
        if (!matches.length) {
            return;
        }
        const textEdits = [];
        this._lastNotebookEditResource.push(matches[0].cell.uri);
        matches.forEach((match) => {
            match.contentMatches.forEach((singleMatch, index) => {
                textEdits.push({
                    versionId: undefined,
                    textEdit: { range: singleMatch.range, text: texts[index] },
                    resource: match.cell.uri,
                });
            });
        });
        return Promise.all(matches.map((match) => {
            return match.cell.resolveTextModel();
        })).then(async () => {
            this._bulkEditService.apply({ edits: textEdits }, { quotableLabel: 'Notebook Replace All' });
            return;
        });
    }
    //#endregion
    //#region Undo/Redo
    async _withElement(element, callback) {
        const viewCells = this._viewCells.filter((cell) => element.matchesResource(cell.uri));
        const refs = await Promise.all(viewCells.map((cell) => this._textModelService.createModelReference(cell.uri)));
        await callback();
        refs.forEach((ref) => ref.dispose());
    }
    async undo() {
        const editStack = this._undoService.getElements(this.uri);
        const element = editStack.past.length ? editStack.past[editStack.past.length - 1] : undefined;
        if ((element && element instanceof SingleModelEditStackElement) ||
            element instanceof MultiModelEditStackElement) {
            await this._withElement(element, async () => {
                await this._undoService.undo(this.uri);
            });
            return element instanceof SingleModelEditStackElement ? [element.resource] : element.resources;
        }
        await this._undoService.undo(this.uri);
        return [];
    }
    async redo() {
        const editStack = this._undoService.getElements(this.uri);
        const element = editStack.future[0];
        if ((element && element instanceof SingleModelEditStackElement) ||
            element instanceof MultiModelEditStackElement) {
            await this._withElement(element, async () => {
                await this._undoService.redo(this.uri);
            });
            return element instanceof SingleModelEditStackElement ? [element.resource] : element.resources;
        }
        await this._undoService.redo(this.uri);
        return [];
    }
    //#endregion
    equal(notebook) {
        return this._notebook === notebook;
    }
    dispose() {
        this._localStore.clear();
        this._viewCells.forEach((cell) => {
            cell.dispose();
        });
        super.dispose();
    }
};
NotebookViewModel = __decorate([
    __param(5, IInstantiationService),
    __param(6, IBulkEditService),
    __param(7, IUndoRedoService),
    __param(8, ITextModelService),
    __param(9, INotebookExecutionStateService)
], NotebookViewModel);
export { NotebookViewModel };
export function createCellViewModel(instantiationService, notebookViewModel, cell, viewContext) {
    if (cell.cellKind === CellKind.Code) {
        return instantiationService.createInstance(CodeCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.layoutInfo, viewContext);
    }
    else {
        return instantiationService.createInstance(MarkupCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.layoutInfo, notebookViewModel, viewContext);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3TW9kZWxJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvbm90ZWJvb2tWaWV3TW9kZWxJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSx1Q0FBdUMsQ0FBQTtBQUVoRSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQVNsRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLDJCQUEyQixHQUMzQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakUsT0FBTyxFQUNOLGFBQWEsRUFhYix3QkFBd0IsR0FFeEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQXNCLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFJOUQsT0FBTyxFQUNOLFFBQVEsRUFJUix1QkFBdUIsRUFFdkIscUJBQXFCLEVBQ3JCLGtCQUFrQixHQUNsQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsRUFFbkIsZ0JBQWdCLEdBQ2hCLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMzQyxDQUFDLENBQUE7QUFFRCxNQUFNLGVBQWU7SUFHcEI7UUFDQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0lBRU0sY0FBYyxDQUNwQixLQUFhLEVBQ2IsR0FBVyxFQUNYLGFBQXFCLEVBQ3JCLG1CQUE0QixFQUM1QixlQUF1QixFQUN2Qix3QkFBaUMsS0FBSztRQUV0QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUM5QyxLQUFLLEVBQ0wsR0FBRyxFQUNILGFBQWEsRUFDYixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLHFCQUFxQixDQUNyQixDQUFBO1FBQ0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU0sTUFBTSxDQUNaLGFBQXFCLEVBQ3JCLG1CQUE0QixFQUM1QixpQkFBMEIsRUFDMUIsZUFBdUIsRUFDdkIscUJBQThCO1FBRTlCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FDbEMsYUFBYSxFQUNiLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YscUJBQXFCLENBQ3JCLENBQUE7SUFDRixDQUFDO0lBRU0scUJBQXFCLENBQUMsT0FBZTtRQUMzQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRU0scUJBQXFCO1FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBQ3hELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFrQjtRQUMvQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBa0I7UUFDL0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRU0sV0FBVyxDQUFDLElBQWtCLEVBQUUsZUFBdUI7UUFDN0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVNLGFBQWEsQ0FDbkIsTUFBYyxFQUNkLE1BQWMsRUFDZCxVQUFrQixFQUNsQixnQkFBeUI7UUFFekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7Q0FDRDtBQUVELE1BQU0scUJBQXFCLEdBQUc7SUFDN0Isc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQy9CLFdBQVcsRUFBRSxxRUFBcUU7UUFDbEYsVUFBVSw2REFBcUQ7S0FDL0QsQ0FBQztJQUNGLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUMvQixXQUFXLEVBQUUsb0VBQW9FO1FBQ2pGLFVBQVUsNERBQW9EO0tBQzlELENBQUM7SUFDRixzQkFBc0IsQ0FBQyxRQUFRLENBQUM7UUFDL0IsV0FBVyxFQUFFLGlFQUFpRTtRQUM5RSxVQUFVLDBEQUFrRDtLQUM1RCxDQUFDO0lBQ0Ysc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQy9CLFdBQVcsRUFBRSxnRUFBZ0U7UUFDN0UsVUFBVSx5REFBaUQ7S0FDM0QsQ0FBQztDQUNGLENBQUE7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE9BQWdDO0lBQzFELElBQUksT0FBTyxZQUFZLHNCQUFzQixFQUFFLENBQUM7UUFDL0MsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBQ0QsT0FBTyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDckQsQ0FBQztBQUVELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtBQU1ULElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQ1osU0FBUSxVQUFVO0lBS2xCLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO0lBQ3RDLENBQUM7SUFHRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUE7SUFDOUIsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBWSxNQUFNO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUE7SUFDaEMsQ0FBQztJQUtELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtJQUN4QyxDQUFDO0lBSUQsSUFBSSx3QkFBd0I7UUFDM0IsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFHRCxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7SUFDeEMsQ0FBQztJQUlELElBQVksZ0JBQWdCO1FBQzNCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDcEMsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFBO1FBQzVCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUM7YUFDdkQsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN0RSxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNqQixJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVILE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELElBQVksZ0JBQWdCLENBQUMsZ0JBQTBCO1FBQ3RELE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUMzRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDckYsQ0FBQztJQWFELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBUUQsWUFDUSxRQUFnQixFQUNmLFNBQTRCLEVBQzVCLFlBQXlCLEVBQ3pCLFdBQXNDLEVBQ3RDLFFBQWtDLEVBQ25CLHFCQUE2RCxFQUNsRSxnQkFBbUQsRUFDbkQsWUFBK0MsRUFDOUMsaUJBQXFELEVBRXhFLDZCQUE4RTtRQUU5RSxLQUFLLEVBQUUsQ0FBQTtRQVpBLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDZixjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixnQkFBVyxHQUFYLFdBQVcsQ0FBMkI7UUFDdEMsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDRiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDbEMsaUJBQVksR0FBWixZQUFZLENBQWtCO1FBQzdCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFFdkQsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQW5IOUQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUM1RCw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQTtRQUlsRCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUlsRSxlQUFVLEdBQW9CLEVBQUUsQ0FBQTtRQTBCdkIsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEQsSUFBSSxPQUFPLEVBQWlDLENBQzVDLENBQUE7UUFLTyw4QkFBeUIsR0FBVSxFQUFFLENBQUE7UUFhNUIsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUE7UUFLdEUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLCtCQUErQixFQUFFLENBQUMsQ0FBQTtRQXVCNUUscUJBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN4QyxpQkFBWSxHQUE2QyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVFLHNCQUFpQixHQUFXLENBQUMsQ0FBQTtRQUc3QixtQkFBYyxHQUEwQixJQUFJLENBQUE7UUFDNUMsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUN2RCw2QkFBd0IsR0FBZ0IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtRQUNwRSxrQkFBYSxHQUFpQixFQUFFLENBQUE7UUFDaEMsYUFBUSxHQUFZLElBQUksQ0FBQTtRQU14QiwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUNsRCw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUVyRCxtQ0FBOEIsR0FBVyxDQUFDLENBQUE7UUFDMUMsOEJBQXlCLEdBQUcsSUFBSSxHQUFHLEVBQTRDLENBQUE7UUFpQnRGLFFBQVEsRUFBRSxDQUFBO1FBQ1YsSUFBSSxDQUFDLEVBQUUsR0FBRyxvQkFBb0IsR0FBRyxRQUFRLENBQUE7UUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxPQUE2QyxFQUFFLFdBQW9CLEVBQUUsRUFBRTtZQUN2RixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3BDLE9BQU87b0JBQ04sTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDVCxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNULE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTt3QkFDdEIsT0FBTyxtQkFBbUIsQ0FDekIsSUFBSSxDQUFDLHFCQUFxQixFQUMxQixJQUFJLEVBQ0osSUFBNkIsRUFDN0IsSUFBSSxDQUFDLFlBQVksQ0FDakIsQ0FBQTtvQkFDRixDQUFDLENBQUM7aUJBQ21DLENBQUE7WUFDdkMsQ0FBQyxDQUFDLENBQUE7WUFFRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ2hDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFekUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQzNFLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDN0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2pELDREQUE0RDtvQkFDNUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNmLENBQUMsQ0FBQyxDQUFBO2dCQUVGLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDeEIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO29CQUNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtZQUVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFBO1lBRTlDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7Z0JBQy9CLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixPQUFPLEVBQUUsS0FBSzthQUNkLENBQUMsQ0FBQTtZQUVGLElBQUksbUJBQW1CLEdBQWEsRUFBRSxDQUFBO1lBQ3RDLElBQUksZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFFLENBQUMsQ0FBQTtnQkFDM0YsbUJBQW1CLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDckMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUViLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3ZDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDckIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUM7d0JBQ2hELEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDakMsU0FBUTtvQkFDVCxDQUFDO29CQUVELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLHFCQUFxQixFQUFFLENBQUM7d0JBQ3JDLG1CQUFtQixHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7d0JBQ3JDLE1BQUs7b0JBQ04sQ0FBQztvQkFFRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcscUJBQXFCLEVBQUUsQ0FBQzt3QkFDL0MsbUJBQW1CLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTt3QkFDL0QsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsZ0JBQWdCO1lBQ2hCLE1BQU0sZ0JBQWdCLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQzNELENBQUE7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUNqQyxtQkFBbUIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDN0MsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsRUFDckMsSUFBSSxFQUNKLE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzdCLElBQUksT0FBTyxHQUF5QyxFQUFFLENBQUE7Z0JBQ3RELE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFBO2dCQUV6QyxJQUNDLE1BQU0sQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsV0FBVztvQkFDbkQsTUFBTSxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxVQUFVLEVBQ2pELENBQUM7b0JBQ0YsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUE7b0JBQ3hCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7b0JBQzdCLFNBQVE7Z0JBQ1QsQ0FBQztxQkFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3pELE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7b0JBQ3pELE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBQ3pELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxTQUFRO2dCQUNULENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ3BELGNBQWMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7d0JBQ3RDLElBQUksNEJBQTRCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7cUJBQ3pELENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDN0QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDekQsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO1lBRTFCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3ZDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFDekMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO29CQUN6RSxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO3dCQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ3pFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYiw2QkFBNkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDM0MsT0FBTTtZQUNQLENBQUM7WUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUUvQyxJQUFJLElBQUksWUFBWSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNqQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsbUJBQW1CLENBQ2xCLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsSUFBSSxFQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUN2QixJQUFJLENBQUMsWUFBWSxDQUNqQixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQTZDO1FBQzFELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7SUFDdkMsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUE7SUFDNUMsQ0FBQztJQUVELDJCQUEyQjtRQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsK0JBQStCLENBQ2hGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUNsQixDQUFBO1FBQ0QsT0FBTyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDdkUsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFnQjtRQUM5QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtJQUN4QixDQUFDO0lBRUQsYUFBYSxDQUFDLFNBQXdDO1FBQ3JELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3BELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFaEQsSUFBSSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVELCtLQUErSztJQUMvSyxxQkFBcUIsQ0FBQyxLQUFzQixFQUFFLFNBQTJCLE9BQU87UUFDL0UsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE1BQU0sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sWUFBWSxHQUNqQixLQUFLLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUN6RSxNQUFNLGdCQUFnQixHQUNyQixZQUFZLEtBQUssSUFBSTtvQkFDcEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3BFLENBQUMsQ0FBQyxJQUFJLENBQUE7Z0JBQ1IsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQ3JDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDN0Q7cUJBQ0MsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUN6QyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQWlCLENBQUE7Z0JBQ25ELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2pDLGdCQUFnQixFQUNoQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFDNUIsSUFBSSxFQUNKLE1BQU0sQ0FDTixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3hELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVO3FCQUNqQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ3pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBaUIsQ0FBQTtnQkFDbkQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDakMsZ0JBQWdCLEVBQ2hCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUM1QixJQUFJLEVBQ0osTUFBTSxDQUNOLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxLQUFhO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEUsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFhO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIscUNBQTRCO1FBQzdCLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFcEUsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDMUIscUNBQTRCO1FBQzdCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztZQUM1QyxDQUFDO1lBQ0QsQ0FBQyxrQ0FBMEIsQ0FBQTtJQUM3QixDQUFDO0lBRUQsZUFBZSxDQUFDLEtBQWE7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFaEUsT0FBTyxRQUFRLEdBQUcsVUFBVSxDQUFBO0lBQzdCLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxNQUFzQjtRQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQTtRQUM1QixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtRQUM3QixNQUFNLGNBQWMsR0FBaUIsRUFBRSxDQUFBO1FBRXZDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLG9CQUFvQjtRQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFVCxJQUFJLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUE7UUFDekMsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUV6QixPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsK0JBQStCO1lBQ3hGLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoRCxJQUFJLGtCQUFrQixJQUFJLGVBQWUsSUFBSSxhQUFhLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDaEYsK0NBQStDO2dCQUMvQyxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQ0MsQ0FBQyxpQkFBaUI7Z0JBQ2xCLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU07Z0JBQzdCLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxlQUFlO2dCQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssYUFBYSxFQUM5QyxDQUFDO2dCQUNGLHVCQUF1QjtnQkFDdkIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzFDLENBQUMsRUFBRSxDQUFBO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlCQUFpQixHQUFHLElBQUksQ0FBQTtnQkFDeEIsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUM1RSxDQUFDO1lBQ0Qsa0JBQWtCLEdBQUcsZUFBZSxDQUFBO1lBQ3BDLGdCQUFnQixHQUFHLGFBQWEsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQTtZQUNuQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdEMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELDJCQUEyQjtRQUMxQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELGVBQWUsQ0FBQyxNQUFjO1FBQzdCLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsTUFBYztRQUNsQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBb0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFxQixDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFhO1FBQ25CLDJDQUEyQztRQUMzQyw4Q0FBOEM7UUFDOUMsSUFBSTtRQUVKLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsZUFBZSxDQUFDLEtBQWtCO1FBQ2pDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFaEQsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO1lBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQ7O09BRUc7SUFDSCxpQ0FBaUMsQ0FBQyxLQUFhO1FBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUE7WUFFN0IsSUFBSSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxTQUFTLElBQUksS0FBSyxJQUFJLE9BQU8sSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsc0NBQXNDO1lBQ3RDLE1BQUs7UUFDTixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsdUJBQXVCLENBQUMsS0FBYTtRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUE7WUFFN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLFNBQVE7WUFDVCxDQUFDO1lBRUQsbUJBQW1CO1lBQ25CLElBQUksU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixPQUFPLE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDbkIsQ0FBQztZQUVELE1BQUs7UUFDTixDQUFDO1FBRUQsT0FBTyxLQUFLLEdBQUcsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxLQUFhO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUE7WUFFN0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELElBQUksU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFvQjtRQUMzQixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFBO0lBQzNDLENBQUM7SUFFRCxlQUFlLENBQUMsRUFBVTtRQUN6QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsWUFBb0I7UUFDL0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDckMsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDekIsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxFQUFFLENBQUE7UUFDaEYsQ0FBQztRQUVELE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQTtJQUNwRixDQUFDO0lBRUQsZUFBZSxDQUNkLEVBQWlCLEVBQ2pCLFFBQTJCLEVBQzNCLGFBQXFDO1FBRXJDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRTlDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyxFQUNELEVBQUUsRUFDRjtnQkFDQztvQkFDQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDNUQsT0FBTyxFQUFFLHFCQUFxQixDQUFDLGFBQWEsQ0FBQztpQkFDN0M7YUFDRCxDQUNELENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsdURBQXVEO1lBQ3ZELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNqQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxLQUFLLENBQ1QsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUNuQixRQUFRLENBQUMsS0FBSyxFQUNkLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUNoQixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3JELENBQUE7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRU8seUJBQXlCLENBQ2hDLE9BQWUsRUFDZixpQkFBMkIsRUFDM0IsY0FBdUM7UUFFdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRXJDLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFBO1FBQ2xELElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFBO1FBRTFCLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQTtRQUMvQyxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtRQUUxQixNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBUyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ25ELE9BQU8sa0JBQWtCLEdBQUcsaUJBQWlCLElBQUksa0JBQWtCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztZQUN6RixJQUFJLElBQUksR0FBd0IsSUFBSSxDQUFBO1lBRXBDLElBQUksa0JBQWtCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztnQkFDNUMsZ0NBQWdDO2dCQUNoQyxHQUFHLENBQUM7b0JBQ0gsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xFLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxrQkFBa0IsR0FBRyxpQkFBaUIsRUFBQztnQkFFekQsbURBQW1EO2dCQUNuRCxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxrQkFBa0IsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1QyxxQ0FBcUM7Z0JBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFBO29CQUNyRCxNQUFNLFlBQVksR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtvQkFDbEUsSUFBSSxHQUFHLElBQUksWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUN2QyxDQUFDO2dCQUVELHNCQUFzQjtnQkFDdEIsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUE7Z0JBQ3hELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUE7Z0JBQ2pDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFFeEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7Z0JBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3BGLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBRXhCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRWxDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7Z0JBRXBDLGtCQUFrQixFQUFFLENBQUE7WUFDckIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQ25CLGNBQXdCLEVBQ3hCLGNBQTBDO1FBRTFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUM3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRWxELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN6QyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDcEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBRTNCLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNyQyxJQUFJLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUN0RSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7b0JBQ2xCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdkQsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQTtnQkFDaEQsTUFBTSxZQUFZLEdBQUcsYUFBYSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFBO2dCQUNqRCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFDNUQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCx1QkFBdUIsQ0FDdEIsUUFBa0IsRUFDbEIsUUFBNEM7UUFFNUMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRS9GLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDdkQsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVsRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDekUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNsQixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDekQsQ0FBQyxDQUFDLENBQUE7WUFFRixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFFRixLQUFLLE1BQU0sT0FBTyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNoQyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsS0FBYSxDQUFDLGVBQWU7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVM7YUFDNUIsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7YUFDZixPQUFPLEVBQUU7YUFDVCxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVM7aUJBQ2pELEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2lCQUNoQixTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RELElBQUksNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxLQUFLLEdBQUcsQ0FBQyxHQUFHLDRCQUE0QixDQUFBO1lBQ2hELENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztJQUNGLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsTUFBTSxZQUFZLEdBQStCLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLG1CQUFtQixHQUErQixFQUFFLENBQUE7UUFDMUQsTUFBTSxvQkFBb0IsR0FBK0IsRUFBRSxDQUFBO1FBQzNELE1BQU0sb0JBQW9CLEdBQW9DLEVBQUUsQ0FBQTtRQUVoRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25ELFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7WUFDdkIsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzNCLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUM5QixDQUFDO1lBRUQsSUFBSSxJQUFJLFlBQVksaUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ2pFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtZQUMvQixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNwQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1lBQzNDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sZ0JBQWdCLEdBQXlELEVBQUUsQ0FBQTtRQUNqRixJQUFJLENBQUMsVUFBVTthQUNiLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ2pGLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QixJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFSCxPQUFPO1lBQ04sWUFBWTtZQUNaLGdCQUFnQjtZQUNoQixvQkFBb0I7WUFDcEIsbUJBQW1CO1lBQ25CLG9CQUFvQjtTQUNwQixDQUFBO0lBQ0YsQ0FBQztJQUVELHNCQUFzQixDQUFDLFNBQStDO1FBQ3JFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxZQUFZLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6RSxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRXZGLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzVGLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDN0YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUN4RCxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsSUFBSSxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtZQUM3QixDQUFDO1lBQ0QsSUFDQyxTQUFTLENBQUMsb0JBQW9CO2dCQUM5QixTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO2dCQUNyQyxJQUFJLFlBQVksaUJBQWlCLEVBQ2hDLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtZQUM5QixDQUFDO1lBQ0QsSUFBSSxTQUFTLENBQUMsb0JBQW9CLElBQUksU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzdFLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxzQkFBc0IsQ0FDckIsUUFBZ0U7UUFFaEUsTUFBTSxjQUFjLEdBQW9DO1lBQ3ZELGdCQUFnQixFQUFFLENBQ2pCLGNBQXVDLEVBQ3ZDLGNBQTRDLEVBQ2xCLEVBQUU7Z0JBQzVCLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1NBQ0QsQ0FBQTtRQUVELElBQUksTUFBTSxHQUFhLElBQUksQ0FBQTtRQUMzQixJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckIsQ0FBQztRQUVELGNBQWMsQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUE7UUFFN0MsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sMEJBQTBCLENBQ2pDLGNBQXVDLEVBQ3ZDLGNBQTRDO1FBRTVDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQU9wQixDQUFBO1FBQ0gsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ3hDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUE7WUFFckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUE7Z0JBQ3BFLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQzdFLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQTtZQUNsQyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQTtZQUNoRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDeEMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQTtZQUVyQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsQ0FBQTtnQkFFcEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDN0UsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFBO1lBQ2xDLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sR0FBRyxHQUE0QixFQUFFLENBQUE7UUFDdkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNsQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzVGLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLFdBQVcsRUFBRSxPQUFPO2FBQ3BCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsY0FBYztJQUNkLElBQUksQ0FBQyxLQUFhLEVBQUUsT0FBNkI7UUFDaEQsTUFBTSxPQUFPLEdBQTZCLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLFNBQVMsR0FBb0IsRUFBRSxDQUFBO1FBRW5DLElBQ0MsT0FBTyxDQUFDLFNBQVM7WUFDakIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLO2dCQUMvRCxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsS0FBSyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFDL0QsQ0FBQztZQUNGLE1BQU0sY0FBYyxHQUNuQixPQUFPLENBQUMsU0FBUyxDQUFDLGtCQUFrQjtnQkFDbkMsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNuQyxNQUFNLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUMzRCxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ25FLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDNUIsQ0FBQztRQUVELFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDakMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDbEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxDQUFDLElBQUksQ0FDWCxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQy9FLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRiw0Q0FBNEM7UUFFNUMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzNDLG1FQUFtRTtnQkFDbkUsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7WUFDaEMsQ0FBQztZQUVELCtDQUErQztZQUMvQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN6RCwyQ0FBMkM7Z0JBQzNDLE9BQU8sT0FBTyxDQUFDLGtCQUFrQixDQUFBO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxrSEFBa0g7Z0JBQ2xILG1HQUFtRztnQkFDbkcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFvQixFQUFFLEtBQVksRUFBRSxJQUFZO1FBQzFELE1BQU0sUUFBUSxHQUFHLElBQXFCLENBQUE7UUFDdEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakQsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzVDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUM5RSxhQUFhLEVBQUUsa0JBQWtCO2FBQ2pDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBaUMsRUFBRSxLQUFlO1FBQ2xFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBeUIsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUV4RCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDekIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ25ELFNBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQ2QsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRyxXQUF5QixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN6RSxRQUFRLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHO2lCQUN4QixDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDckIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDckMsQ0FBQyxDQUFDLENBQ0YsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUE7WUFDNUYsT0FBTTtRQUNQLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFlBQVk7SUFFWixtQkFBbUI7SUFFWCxLQUFLLENBQUMsWUFBWSxDQUN6QixPQUFpRSxFQUNqRSxRQUE2QjtRQUU3QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQzdCLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDOUUsQ0FBQTtRQUNELE1BQU0sUUFBUSxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFFN0YsSUFDQyxDQUFDLE9BQU8sSUFBSSxPQUFPLFlBQVksMkJBQTJCLENBQUM7WUFDM0QsT0FBTyxZQUFZLDBCQUEwQixFQUM1QyxDQUFDO1lBQ0YsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDM0MsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdkMsQ0FBQyxDQUFDLENBQUE7WUFFRixPQUFPLE9BQU8sWUFBWSwyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDL0YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkMsSUFDQyxDQUFDLE9BQU8sSUFBSSxPQUFPLFlBQVksMkJBQTJCLENBQUM7WUFDM0QsT0FBTyxZQUFZLDBCQUEwQixFQUM1QyxDQUFDO1lBQ0YsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDM0MsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdkMsQ0FBQyxDQUFDLENBQUE7WUFFRixPQUFPLE9BQU8sWUFBWSwyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUE7UUFDL0YsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXRDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELFlBQVk7SUFFWixLQUFLLENBQUMsUUFBMkI7UUFDaEMsT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQTtJQUNuQyxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQW5tQ1ksaUJBQWlCO0lBa0gzQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsOEJBQThCLENBQUE7R0F0SHBCLGlCQUFpQixDQW1tQzdCOztBQUlELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsb0JBQTJDLEVBQzNDLGlCQUFvQyxFQUNwQyxJQUEyQixFQUMzQixXQUF3QjtJQUV4QixJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JDLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUN6QyxpQkFBaUIsRUFDakIsaUJBQWlCLENBQUMsUUFBUSxFQUMxQixJQUFJLEVBQ0osaUJBQWlCLENBQUMsVUFBVSxFQUM1QixXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLG1CQUFtQixFQUNuQixpQkFBaUIsQ0FBQyxRQUFRLEVBQzFCLElBQUksRUFDSixpQkFBaUIsQ0FBQyxVQUFVLEVBQzVCLGlCQUFpQixFQUNqQixXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDIn0=