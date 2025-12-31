/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffSets } from '../../../../../../base/common/collections.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../../../base/common/types.js';
import { cellRangesToIndexes } from '../../../common/notebookRange.js';
export class NotebookVisibleCellObserver extends Disposable {
    get visibleCells() {
        return this._visibleCells;
    }
    constructor(_notebookEditor) {
        super();
        this._notebookEditor = _notebookEditor;
        this._onDidChangeVisibleCells = this._register(new Emitter());
        this.onDidChangeVisibleCells = this._onDidChangeVisibleCells.event;
        this._viewModelDisposables = this._register(new DisposableStore());
        this._visibleCells = [];
        this._register(this._notebookEditor.onDidChangeVisibleRanges(this._updateVisibleCells, this));
        this._register(this._notebookEditor.onDidChangeModel(this._onModelChange, this));
        this._updateVisibleCells();
    }
    _onModelChange() {
        this._viewModelDisposables.clear();
        if (this._notebookEditor.hasModel()) {
            this._viewModelDisposables.add(this._notebookEditor.onDidChangeViewCells(() => this.updateEverything()));
        }
        this.updateEverything();
    }
    updateEverything() {
        this._onDidChangeVisibleCells.fire({ added: [], removed: Array.from(this._visibleCells) });
        this._visibleCells = [];
        this._updateVisibleCells();
    }
    _updateVisibleCells() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const newVisibleCells = cellRangesToIndexes(this._notebookEditor.visibleRanges)
            .map((index) => this._notebookEditor.cellAt(index))
            .filter(isDefined);
        const newVisibleHandles = new Set(newVisibleCells.map((cell) => cell.handle));
        const oldVisibleHandles = new Set(this._visibleCells.map((cell) => cell.handle));
        const diff = diffSets(oldVisibleHandles, newVisibleHandles);
        const added = diff.added
            .map((handle) => this._notebookEditor.getCellByHandle(handle))
            .filter(isDefined);
        const removed = diff.removed
            .map((handle) => this._notebookEditor.getCellByHandle(handle))
            .filter(isDefined);
        this._visibleCells = newVisibleCells;
        this._onDidChangeVisibleCells.fire({
            added,
            removed,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaXNpYmxlQ2VsbE9ic2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxTdGF0dXNCYXIvbm90ZWJvb2tWaXNpYmxlQ2VsbE9ic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPdEUsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFVMUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxZQUE2QixlQUFnQztRQUM1RCxLQUFLLEVBQUUsQ0FBQTtRQURxQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFiNUMsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekQsSUFBSSxPQUFPLEVBQThCLENBQ3pDLENBQUE7UUFDUSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBRXJELDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRXRFLGtCQUFhLEdBQXFCLEVBQUUsQ0FBQTtRQVMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENB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