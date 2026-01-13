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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaXNpYmxlQ2VsbE9ic2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2VsbFN0YXR1c0Jhci9ub3RlYm9va1Zpc2libGVDZWxsT2JzZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU90RSxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsVUFBVTtJQVUxRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELFlBQTZCLGVBQWdDO1FBQzVELEtBQUssRUFBRSxDQUFBO1FBRHFCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWI1Qyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6RCxJQUFJLE9BQU8sRUFBOEIsQ0FDekMsQ0FBQTtRQUNRLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7UUFFckQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFFdEUsa0JBQWEsR0FBcUIsRUFBRSxDQUFBO1FBUzNDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxD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