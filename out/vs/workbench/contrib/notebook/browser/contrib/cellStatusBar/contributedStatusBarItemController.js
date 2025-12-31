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
import { Throttler } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookVisibleCellObserver } from './notebookVisibleCellObserver.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
let ContributedStatusBarItemController = class ContributedStatusBarItemController extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.contributed'; }
    constructor(_notebookEditor, _notebookCellStatusBarService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookCellStatusBarService = _notebookCellStatusBarService;
        this._visibleCells = new Map();
        this._observer = this._register(new NotebookVisibleCellObserver(this._notebookEditor));
        this._register(this._observer.onDidChangeVisibleCells(this._updateVisibleCells, this));
        this._updateEverything();
        this._register(this._notebookCellStatusBarService.onDidChangeProviders(this._updateEverything, this));
        this._register(this._notebookCellStatusBarService.onDidChangeItems(this._updateEverything, this));
    }
    _updateEverything() {
        const newCells = this._observer.visibleCells.filter((cell) => !this._visibleCells.has(cell.handle));
        const visibleCellHandles = new Set(this._observer.visibleCells.map((item) => item.handle));
        const currentCellHandles = Array.from(this._visibleCells.keys());
        const removedCells = currentCellHandles.filter((handle) => !visibleCellHandles.has(handle));
        const itemsToUpdate = currentCellHandles.filter((handle) => visibleCellHandles.has(handle));
        this._updateVisibleCells({
            added: newCells,
            removed: removedCells.map((handle) => ({ handle })),
        });
        itemsToUpdate.forEach((handle) => this._visibleCells.get(handle)?.update());
    }
    _updateVisibleCells(e) {
        const vm = this._notebookEditor.getViewModel();
        if (!vm) {
            return;
        }
        for (const newCell of e.added) {
            const helper = new CellStatusBarHelper(vm, newCell, this._notebookCellStatusBarService);
            this._visibleCells.set(newCell.handle, helper);
        }
        for (const oldCell of e.removed) {
            this._visibleCells.get(oldCell.handle)?.dispose();
            this._visibleCells.delete(oldCell.handle);
        }
    }
    dispose() {
        super.dispose();
        this._visibleCells.forEach((cell) => cell.dispose());
        this._visibleCells.clear();
    }
};
ContributedStatusBarItemController = __decorate([
    __param(1, INotebookCellStatusBarService)
], ContributedStatusBarItemController);
export { ContributedStatusBarItemController };
class CellStatusBarHelper extends Disposable {
    constructor(_notebookViewModel, _cell, _notebookCellStatusBarService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this._cell = _cell;
        this._notebookCellStatusBarService = _notebookCellStatusBarService;
        this._currentItemIds = [];
        this._currentItemLists = [];
        this._isDisposed = false;
        this._updateThrottler = this._register(new Throttler());
        this._register(toDisposable(() => this._activeToken?.dispose(true)));
        this._updateSoon();
        this._register(this._cell.model.onDidChangeContent(() => this._updateSoon()));
        this._register(this._cell.model.onDidChangeLanguage(() => this._updateSoon()));
        this._register(this._cell.model.onDidChangeMetadata(() => this._updateSoon()));
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._updateSoon()));
        this._register(this._cell.model.onDidChangeOutputs(() => this._updateSoon()));
    }
    update() {
        this._updateSoon();
    }
    _updateSoon() {
        // Wait a tick to make sure that the event is fired to the EH before triggering status bar providers
        setTimeout(() => {
            if (!this._isDisposed) {
                this._updateThrottler.queue(() => this._update());
            }
        }, 0);
    }
    async _update() {
        const cellIndex = this._notebookViewModel.getCellIndex(this._cell);
        const docUri = this._notebookViewModel.notebookDocument.uri;
        const viewType = this._notebookViewModel.notebookDocument.viewType;
        this._activeToken?.dispose(true);
        const tokenSource = (this._activeToken = new CancellationTokenSource());
        const itemLists = await this._notebookCellStatusBarService.getStatusBarItemsForCell(docUri, cellIndex, viewType, tokenSource.token);
        if (tokenSource.token.isCancellationRequested) {
            itemLists.forEach((itemList) => itemList.dispose && itemList.dispose());
            return;
        }
        const items = itemLists.map((itemList) => itemList.items).flat();
        const newIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this._cell.handle, items },
        ]);
        this._currentItemLists.forEach((itemList) => itemList.dispose && itemList.dispose());
        this._currentItemLists = itemLists;
        this._currentItemIds = newIds;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
        this._activeToken?.dispose(true);
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this._cell.handle, items: [] },
        ]);
        this._currentItemLists.forEach((itemList) => itemList.dispose && itemList.dispose());
    }
}
registerNotebookContribution(ContributedStatusBarItemController.id, ContributedStatusBarItemController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRTdGF0dXNCYXJJdGVtQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsU3RhdHVzQmFyL2NvbnRyaWJ1dGVkU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPOUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFHeEYsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FDWixTQUFRLFVBQVU7YUFHWCxPQUFFLEdBQVcsMENBQTBDLEFBQXJELENBQXFEO0lBTTlELFlBQ2tCLGVBQWdDLEVBRWpELDZCQUE2RTtRQUU3RSxLQUFLLEVBQUUsQ0FBQTtRQUpVLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUVoQyxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBUDdELGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUE7UUFVdEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksMkJBQTJCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDdEYsSUFBSSxDQUFDLFNBQVMsQ0FB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