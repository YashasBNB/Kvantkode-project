/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { DiffElementPlaceholderViewModel, NotebookDocumentMetadataViewModel, SideBySideDiffElementViewModel, SingleSideDiffElementViewModel, } from './diffElementViewModel.js';
import { NOTEBOOK_DIFF_ITEM_DIFF_STATE, NOTEBOOK_DIFF_ITEM_KIND, } from './notebookDiffEditorBrowser.js';
import { CellUri } from '../../common/notebookCommon.js';
import { raceCancellation } from '../../../../../base/common/async.js';
import { computeDiff } from '../../common/notebookDiff.js';
export class NotebookDiffViewModel extends Disposable {
    get items() {
        return this._items;
    }
    get value() {
        return this.diffEditorItems
            .filter((item) => item.type !== 'placeholder')
            .filter((item) => {
            if (this._includeUnchanged) {
                return true;
            }
            if (item instanceof NotebookMultiDiffEditorCellItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            if (item instanceof NotebookMultiDiffEditorMetadataItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            if (item instanceof NotebookMultiDiffEditorOutputItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            return true;
        })
            .filter((item) => item instanceof NotebookMultiDiffEditorOutputItem ? !this.hideOutput : true)
            .filter((item) => item instanceof NotebookMultiDiffEditorMetadataItem ? !this.ignoreMetadata : true);
    }
    get hasUnchangedCells() {
        return this._hasUnchangedCells === true;
    }
    get includeUnchanged() {
        return this._includeUnchanged === true;
    }
    set includeUnchanged(value) {
        this._includeUnchanged = value;
        this._onDidChange.fire();
    }
    constructor(model, notebookEditorWorkerService, configurationService, eventDispatcher, notebookService, diffEditorHeightCalculator, fontInfo, excludeUnchangedPlaceholder) {
        super();
        this.model = model;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.eventDispatcher = eventDispatcher;
        this.notebookService = notebookService;
        this.diffEditorHeightCalculator = diffEditorHeightCalculator;
        this.fontInfo = fontInfo;
        this.excludeUnchangedPlaceholder = excludeUnchangedPlaceholder;
        this.placeholderAndRelatedCells = new Map();
        this._items = [];
        this._onDidChangeItems = this._register(new Emitter());
        this.onDidChangeItems = this._onDidChangeItems.event;
        this.disposables = this._register(new DisposableStore());
        this._onDidChange = this._register(new Emitter());
        this.diffEditorItems = [];
        this.onDidChange = this._onDidChange.event;
        this.originalCellViewModels = [];
        this.hideOutput =
            this.model.modified.notebook.transientOptions.transientOutputs ||
                this.configurationService.getValue('notebook.diff.ignoreOutputs');
        this.ignoreMetadata = this.configurationService.getValue('notebook.diff.ignoreMetadata');
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            let triggerChange = false;
            let metadataChanged = false;
            if (e.affectsConfiguration('notebook.diff.ignoreMetadata')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreMetadata');
                if (newValue !== undefined && this.ignoreMetadata !== newValue) {
                    this.ignoreMetadata = newValue;
                    triggerChange = true;
                    metadataChanged = true;
                }
            }
            if (e.affectsConfiguration('notebook.diff.ignoreOutputs')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreOutputs');
                if (newValue !== undefined &&
                    this.hideOutput !==
                        (newValue || this.model.modified.notebook.transientOptions.transientOutputs)) {
                    this.hideOutput =
                        newValue || !!this.model.modified.notebook.transientOptions.transientOutputs;
                    triggerChange = true;
                }
            }
            if (metadataChanged) {
                this.toggleNotebookMetadata();
            }
            if (triggerChange) {
                this._onDidChange.fire();
            }
        }));
    }
    dispose() {
        this.clear();
        super.dispose();
    }
    clear() {
        this.disposables.clear();
        dispose(Array.from(this.placeholderAndRelatedCells.keys()));
        this.placeholderAndRelatedCells.clear();
        dispose(this.originalCellViewModels);
        this.originalCellViewModels = [];
        dispose(this._items);
        this._items.splice(0, this._items.length);
    }
    async computeDiff(token) {
        const diffResult = await raceCancellation(this.notebookEditorWorkerService.computeDiff(this.model.original.resource, this.model.modified.resource), token);
        if (!diffResult || token.isCancellationRequested) {
            // after await the editor might be disposed.
            return;
        }
        prettyChanges(this.model.original.notebook, this.model.modified.notebook, diffResult.cellsDiff);
        const { cellDiffInfo, firstChangeIndex } = computeDiff(this.model.original.notebook, this.model.modified.notebook, diffResult);
        if (isEqual(cellDiffInfo, this.originalCellViewModels, this.model)) {
            return;
        }
        else {
            await raceCancellation(this.updateViewModels(cellDiffInfo, diffResult.metadataChanged, firstChangeIndex), token);
            if (token.isCancellationRequested) {
                return;
            }
            this.updateDiffEditorItems();
        }
    }
    toggleNotebookMetadata() {
        if (!this.notebookMetadataViewModel) {
            return;
        }
        if (this.ignoreMetadata) {
            if (this._items.length && this._items[0] === this.notebookMetadataViewModel) {
                this._items.splice(0, 1);
                this._onDidChangeItems.fire({ start: 0, deleteCount: 1, elements: [] });
            }
        }
        else {
            if (!this._items.length || this._items[0] !== this.notebookMetadataViewModel) {
                this._items.splice(0, 0, this.notebookMetadataViewModel);
                this._onDidChangeItems.fire({
                    start: 0,
                    deleteCount: 0,
                    elements: [this.notebookMetadataViewModel],
                });
            }
        }
    }
    updateDiffEditorItems() {
        this.diffEditorItems = [];
        const originalSourceUri = this.model.original.resource;
        const modifiedSourceUri = this.model.modified.resource;
        this._hasUnchangedCells = false;
        this.items.forEach((item) => {
            switch (item.type) {
                case 'delete': {
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, undefined, item.type, item.type));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, undefined, item.type, item.type));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, undefined, item.type, item.type));
                    break;
                }
                case 'insert': {
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(undefined, item.modified.uri, item.type, item.type));
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(undefined, modifiedMetadata, item.type, item.type));
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(undefined, modifiedOutput, item.type, item.type));
                    break;
                }
                case 'modified': {
                    const cellType = item.checkIfInputModified() ? item.type : 'unchanged';
                    const containerChanged = item.checkIfInputModified() ||
                        item.checkMetadataIfModified() ||
                        item.checkIfOutputsModified()
                        ? item.type
                        : 'unchanged';
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, item.modified.uri, cellType, containerChanged));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, modifiedMetadata, item.checkMetadataIfModified() ? item.type : 'unchanged', containerChanged));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, modifiedOutput, item.checkIfOutputsModified() ? item.type : 'unchanged', containerChanged));
                    break;
                }
                case 'unchanged': {
                    this._hasUnchangedCells = true;
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, item.modified.uri, item.type, item.type));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, modifiedMetadata, item.type, item.type));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, modifiedOutput, item.type, item.type));
                    break;
                }
            }
        });
        this._onDidChange.fire();
    }
    async updateViewModels(cellDiffInfo, metadataChanged, firstChangeIndex) {
        const cellViewModels = await this.createDiffViewModels(cellDiffInfo, metadataChanged);
        const oldLength = this._items.length;
        this.clear();
        this._items.splice(0, oldLength);
        let placeholder = undefined;
        this.originalCellViewModels = cellViewModels;
        cellViewModels.forEach((vm, index) => {
            if (vm.type === 'unchanged' && !this.excludeUnchangedPlaceholder) {
                if (!placeholder) {
                    vm.displayIconToHideUnmodifiedCells = true;
                    placeholder = new DiffElementPlaceholderViewModel(vm.mainDocumentTextModel, vm.editorEventDispatcher, vm.initData);
                    this._items.push(placeholder);
                    const placeholderItem = placeholder;
                    this.disposables.add(placeholderItem.onUnfoldHiddenCells(() => {
                        const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholderItem);
                        if (!Array.isArray(hiddenCellViewModels)) {
                            return;
                        }
                        const start = this._items.indexOf(placeholderItem);
                        this._items.splice(start, 1, ...hiddenCellViewModels);
                        this._onDidChangeItems.fire({ start, deleteCount: 1, elements: hiddenCellViewModels });
                    }));
                    this.disposables.add(vm.onHideUnchangedCells(() => {
                        const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholderItem);
                        if (!Array.isArray(hiddenCellViewModels)) {
                            return;
                        }
                        const start = this._items.indexOf(vm);
                        this._items.splice(start, hiddenCellViewModels.length, placeholderItem);
                        this._onDidChangeItems.fire({
                            start,
                            deleteCount: hiddenCellViewModels.length,
                            elements: [placeholderItem],
                        });
                    }));
                }
                const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholder) || [];
                hiddenCellViewModels.push(vm);
                this.placeholderAndRelatedCells.set(placeholder, hiddenCellViewModels);
                placeholder.hiddenCells.push(vm);
            }
            else {
                placeholder = undefined;
                this._items.push(vm);
            }
        });
        // Note, ensure all of the height calculations are done before firing the event.
        // This is to ensure that the diff editor is not resized multiple times, thereby avoiding flickering.
        this._onDidChangeItems.fire({
            start: 0,
            deleteCount: oldLength,
            elements: this._items,
            firstChangeIndex,
        });
    }
    async createDiffViewModels(computedCellDiffs, metadataChanged) {
        const originalModel = this.model.original.notebook;
        const modifiedModel = this.model.modified.notebook;
        const initData = {
            metadataStatusHeight: this.configurationService.getValue('notebook.diff.ignoreMetadata')
                ? 0
                : 25,
            outputStatusHeight: this.configurationService.getValue('notebook.diff.ignoreOutputs') ||
                !!modifiedModel.transientOptions.transientOutputs
                ? 0
                : 25,
            fontInfo: this.fontInfo,
        };
        const viewModels = [];
        this.notebookMetadataViewModel = this._register(new NotebookDocumentMetadataViewModel(this.model.original.notebook, this.model.modified.notebook, metadataChanged ? 'modifiedMetadata' : 'unchangedMetadata', this.eventDispatcher, initData, this.notebookService, this.diffEditorHeightCalculator));
        if (!this.ignoreMetadata) {
            if (metadataChanged) {
                await this.notebookMetadataViewModel.computeHeights();
            }
            viewModels.push(this.notebookMetadataViewModel);
        }
        const cellViewModels = await Promise.all(computedCellDiffs.map(async (diff) => {
            switch (diff.type) {
                case 'delete': {
                    return new SingleSideDiffElementViewModel(originalModel, modifiedModel, originalModel.cells[diff.originalCellIndex], undefined, 'delete', this.eventDispatcher, initData, this.notebookService, this.configurationService, this.diffEditorHeightCalculator, diff.originalCellIndex);
                }
                case 'insert': {
                    return new SingleSideDiffElementViewModel(modifiedModel, originalModel, undefined, modifiedModel.cells[diff.modifiedCellIndex], 'insert', this.eventDispatcher, initData, this.notebookService, this.configurationService, this.diffEditorHeightCalculator, diff.modifiedCellIndex);
                }
                case 'modified': {
                    const viewModel = new SideBySideDiffElementViewModel(this.model.modified.notebook, this.model.original.notebook, originalModel.cells[diff.originalCellIndex], modifiedModel.cells[diff.modifiedCellIndex], 'modified', this.eventDispatcher, initData, this.notebookService, this.configurationService, diff.originalCellIndex, this.diffEditorHeightCalculator);
                    // Reduces flicker (compute this before setting the model)
                    // Else when the model is set, the height of the editor will be x, after diff is computed, then height will be y.
                    // & that results in flicker.
                    await viewModel.computeEditorHeights();
                    return viewModel;
                }
                case 'unchanged': {
                    return new SideBySideDiffElementViewModel(this.model.modified.notebook, this.model.original.notebook, originalModel.cells[diff.originalCellIndex], modifiedModel.cells[diff.modifiedCellIndex], 'unchanged', this.eventDispatcher, initData, this.notebookService, this.configurationService, diff.originalCellIndex, this.diffEditorHeightCalculator);
                }
            }
        }));
        cellViewModels.forEach((vm) => viewModels.push(vm));
        return viewModels;
    }
}
/**
 * making sure that swapping cells are always translated to `insert+delete`.
 */
export function prettyChanges(original, modified, diffResult) {
    const changes = diffResult.changes;
    for (let i = 0; i < diffResult.changes.length - 1; i++) {
        // then we know there is another change after current one
        const curr = changes[i];
        const next = changes[i + 1];
        const x = curr.originalStart;
        const y = curr.modifiedStart;
        if (curr.originalLength === 1 &&
            curr.modifiedLength === 0 &&
            next.originalStart === x + 2 &&
            next.originalLength === 0 &&
            next.modifiedStart === y + 1 &&
            next.modifiedLength === 1 &&
            original.cells[x].getHashValue() === modified.cells[y + 1].getHashValue() &&
            original.cells[x + 1].getHashValue() === modified.cells[y].getHashValue()) {
            // this is a swap
            curr.originalStart = x;
            curr.originalLength = 0;
            curr.modifiedStart = y;
            curr.modifiedLength = 1;
            next.originalStart = x + 1;
            next.originalLength = 1;
            next.modifiedStart = y + 2;
            next.modifiedLength = 0;
            i++;
        }
    }
}
function isEqual(cellDiffInfo, viewModels, model) {
    if (cellDiffInfo.length !== viewModels.length) {
        return false;
    }
    const originalModel = model.original.notebook;
    const modifiedModel = model.modified.notebook;
    for (let i = 0; i < viewModels.length; i++) {
        const a = cellDiffInfo[i];
        const b = viewModels[i];
        if (a.type !== b.type) {
            return false;
        }
        switch (a.type) {
            case 'delete': {
                if (originalModel.cells[a.originalCellIndex].handle !== b.original?.handle) {
                    return false;
                }
                continue;
            }
            case 'insert': {
                if (modifiedModel.cells[a.modifiedCellIndex].handle !== b.modified?.handle) {
                    return false;
                }
                continue;
            }
            default: {
                if (originalModel.cells[a.originalCellIndex].handle !== b.original?.handle) {
                    return false;
                }
                if (modifiedModel.cells[a.modifiedCellIndex].handle !== b.modified?.handle) {
                    return false;
                }
                continue;
            }
        }
    }
    return true;
}
export class NotebookMultiDiffEditorItem extends MultiDiffEditorItem {
    constructor(originalUri, modifiedUri, goToFileUri, type, containerType, kind, contextKeys) {
        super(originalUri, modifiedUri, goToFileUri, contextKeys);
        this.type = type;
        this.containerType = containerType;
        this.kind = kind;
    }
}
class NotebookMultiDiffEditorCellItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Cell', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Cell',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type,
        });
    }
}
class NotebookMultiDiffEditorMetadataItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Metadata', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Metadata',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type,
        });
    }
}
class NotebookMultiDiffEditorOutputItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Output', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Output',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQThCLE1BQU0scUNBQXFDLENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBSy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3hHLE9BQU8sRUFFTiwrQkFBK0IsRUFFL0IsaUNBQWlDLEVBQ2pDLDhCQUE4QixFQUM5Qiw4QkFBOEIsR0FDOUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBR04sNkJBQTZCLEVBQzdCLHVCQUF1QixHQUN2QixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE9BQU8sRUFBRSxPQUFPLEVBQTRCLE1BQU0sZ0NBQWdDLENBQUE7QUFJbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTFELE1BQU0sT0FBTyxxQkFDWixTQUFRLFVBQVU7SUFRbEIsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFVRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxlQUFlO2FBQ3pCLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxhQUFhLENB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