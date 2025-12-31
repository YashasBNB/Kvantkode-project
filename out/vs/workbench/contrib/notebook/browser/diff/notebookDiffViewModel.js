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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZlZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUE4QixNQUFNLHFDQUFxQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUsvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUN4RyxPQUFPLEVBRU4sK0JBQStCLEVBRS9CLGlDQUFpQyxFQUNqQyw4QkFBOEIsRUFDOUIsOEJBQThCLEdBQzlCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUdOLDZCQUE2QixFQUM3Qix1QkFBdUIsR0FDdkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxPQUFPLEVBQUUsT0FBTyxFQUE0QixNQUFNLGdDQUFnQyxDQUFBO0FBSWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUxRCxNQUFNLE9BQU8scUJBQ1osU0FBUSxVQUFVO0lBUWxCLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBVUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsZUFBZTthQUN6QixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDO2FB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