/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ListView } from '../../../../../base/browser/ui/list/listView.js';
import { ConstantTimePrefixSumComputer } from '../../../../../editor/common/model/prefixSumComputer.js';
export class NotebookCellsLayout {
    get paddingTop() {
        return this._paddingTop;
    }
    set paddingTop(paddingTop) {
        this._size = this._size + paddingTop - this._paddingTop;
        this._paddingTop = paddingTop;
    }
    get count() {
        return this._items.length;
    }
    /**
     * Returns the sum of the sizes of all items in the range map.
     */
    get size() {
        return this._size;
    }
    constructor(topPadding) {
        this._items = [];
        this._whitespace = [];
        this._prefixSumComputer = new ConstantTimePrefixSumComputer([]);
        this._size = 0;
        this._paddingTop = 0;
        this._paddingTop = topPadding ?? 0;
        this._size = this._paddingTop;
    }
    getWhitespaces() {
        return this._whitespace;
    }
    restoreWhitespace(items) {
        this._whitespace = items;
        this._size =
            this._paddingTop +
                this._items.reduce((total, item) => total + item.size, 0) +
                this._whitespace.reduce((total, ws) => total + ws.size, 0);
    }
    /**
     */
    splice(index, deleteCount, items) {
        const inserts = items ?? [];
        // Perform the splice operation on the items array.
        this._items.splice(index, deleteCount, ...inserts);
        this._size =
            this._paddingTop +
                this._items.reduce((total, item) => total + item.size, 0) +
                this._whitespace.reduce((total, ws) => total + ws.size, 0);
        this._prefixSumComputer.removeValues(index, deleteCount);
        // inserts should also include whitespaces
        const newSizes = [];
        for (let i = 0; i < inserts.length; i++) {
            const insertIndex = i + index;
            const existingWhitespaces = this._whitespace.filter((ws) => ws.afterPosition === insertIndex + 1);
            if (existingWhitespaces.length > 0) {
                newSizes.push(inserts[i].size + existingWhitespaces.reduce((acc, ws) => acc + ws.size, 0));
            }
            else {
                newSizes.push(inserts[i].size);
            }
        }
        this._prefixSumComputer.insertValues(index, newSizes);
        // Now that the items array has been updated, and the whitespaces are updated elsewhere, if an item is removed/inserted, the accumlated size of the items are all updated.
        // Loop through all items from the index where the splice started, to the end
        for (let i = index; i < this._items.length; i++) {
            const existingWhitespaces = this._whitespace.filter((ws) => ws.afterPosition === i + 1);
            if (existingWhitespaces.length > 0) {
                this._prefixSumComputer.setValue(i, this._items[i].size + existingWhitespaces.reduce((acc, ws) => acc + ws.size, 0));
            }
            else {
                this._prefixSumComputer.setValue(i, this._items[i].size);
            }
        }
    }
    insertWhitespace(id, afterPosition, size) {
        let priority = 0;
        const existingWhitespaces = this._whitespace.filter((ws) => ws.afterPosition === afterPosition);
        if (existingWhitespaces.length > 0) {
            priority = Math.max(...existingWhitespaces.map((ws) => ws.priority)) + 1;
        }
        this._whitespace.push({ id, afterPosition: afterPosition, size, priority });
        this._size += size; // Update the total size to include the whitespace
        this._whitespace.sort((a, b) => {
            if (a.afterPosition === b.afterPosition) {
                return a.priority - b.priority;
            }
            return a.afterPosition - b.afterPosition;
        });
        // find item size of index
        if (afterPosition > 0) {
            const index = afterPosition - 1;
            const itemSize = this._items[index].size;
            const accSize = itemSize + size;
            this._prefixSumComputer.setValue(index, accSize);
        }
    }
    changeOneWhitespace(id, afterPosition, size) {
        const whitespaceIndex = this._whitespace.findIndex((ws) => ws.id === id);
        if (whitespaceIndex !== -1) {
            const whitespace = this._whitespace[whitespaceIndex];
            const oldAfterPosition = whitespace.afterPosition;
            whitespace.afterPosition = afterPosition;
            const oldSize = whitespace.size;
            const delta = size - oldSize;
            whitespace.size = size;
            this._size += delta;
            if (oldAfterPosition > 0 && oldAfterPosition <= this._items.length) {
                const index = oldAfterPosition - 1;
                const itemSize = this._items[index].size;
                const accSize = itemSize;
                this._prefixSumComputer.setValue(index, accSize);
            }
            if (afterPosition > 0 && afterPosition <= this._items.length) {
                const index = afterPosition - 1;
                const itemSize = this._items[index].size;
                const accSize = itemSize + size;
                this._prefixSumComputer.setValue(index, accSize);
            }
        }
    }
    removeWhitespace(id) {
        const whitespaceIndex = this._whitespace.findIndex((ws) => ws.id === id);
        if (whitespaceIndex !== -1) {
            const whitespace = this._whitespace[whitespaceIndex];
            this._whitespace.splice(whitespaceIndex, 1);
            this._size -= whitespace.size; // Reduce the total size by the size of the removed whitespace
            if (whitespace.afterPosition > 0) {
                const index = whitespace.afterPosition - 1;
                const itemSize = this._items[index].size;
                const remainingWhitespaces = this._whitespace.filter((ws) => ws.afterPosition === whitespace.afterPosition);
                const accSize = itemSize + remainingWhitespaces.reduce((acc, ws) => acc + ws.size, 0);
                this._prefixSumComputer.setValue(index, accSize);
            }
        }
    }
    /**
     * find position of whitespace
     * @param id: id of the whitespace
     * @returns: position in the list view
     */
    getWhitespacePosition(id) {
        const whitespace = this._whitespace.find((ws) => ws.id === id);
        if (!whitespace) {
            throw new Error('Whitespace not found');
        }
        const afterPosition = whitespace.afterPosition;
        if (afterPosition === 0) {
            // find all whitespaces at the same position but with higher priority (smaller number)
            const whitespaces = this._whitespace.filter((ws) => ws.afterPosition === afterPosition && ws.priority < whitespace.priority);
            return whitespaces.reduce((acc, ws) => acc + ws.size, 0) + this.paddingTop;
        }
        const whitespaceBeforeFirstItem = this._whitespace
            .filter((ws) => ws.afterPosition === 0)
            .reduce((acc, ws) => acc + ws.size, 0);
        // previous item index
        const index = afterPosition - 1;
        const previousItemPosition = this._prefixSumComputer.getPrefixSum(index);
        const previousItemSize = this._items[index].size;
        return previousItemPosition + previousItemSize + whitespaceBeforeFirstItem + this.paddingTop;
    }
    indexAt(position) {
        if (position < 0) {
            return -1;
        }
        const whitespaceBeforeFirstItem = this._whitespace
            .filter((ws) => ws.afterPosition === 0)
            .reduce((acc, ws) => acc + ws.size, 0);
        const offset = position - (this._paddingTop + whitespaceBeforeFirstItem);
        if (offset <= 0) {
            return 0;
        }
        if (offset >= this._size - this._paddingTop - whitespaceBeforeFirstItem) {
            return this.count;
        }
        return this._prefixSumComputer.getIndexOf(Math.trunc(offset)).index;
    }
    indexAfter(position) {
        const index = this.indexAt(position);
        return Math.min(index + 1, this._items.length);
    }
    positionAt(index) {
        if (index < 0) {
            return -1;
        }
        if (this.count === 0) {
            return -1;
        }
        // index is zero based, if index+1 > this.count, then it points to the fictitious element after the last element of this array.
        if (index >= this.count) {
            return -1;
        }
        const whitespaceBeforeFirstItem = this._whitespace
            .filter((ws) => ws.afterPosition === 0)
            .reduce((acc, ws) => acc + ws.size, 0);
        return (this._prefixSumComputer.getPrefixSum(index /** count */) +
            this._paddingTop +
            whitespaceBeforeFirstItem);
    }
}
export class NotebookCellListView extends ListView {
    constructor() {
        super(...arguments);
        this._lastWhitespaceId = 0;
        this._renderingStack = 0;
    }
    get inRenderingTransaction() {
        return this._renderingStack > 0;
    }
    get notebookRangeMap() {
        return this.rangeMap;
    }
    render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM) {
        this._renderingStack++;
        super.render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM);
        this._renderingStack--;
    }
    _rerender(renderTop, renderHeight, inSmoothScrolling) {
        this._renderingStack++;
        super._rerender(renderTop, renderHeight, inSmoothScrolling);
        this._renderingStack--;
    }
    createRangeMap(paddingTop) {
        const existingMap = this.rangeMap;
        if (existingMap) {
            const layout = new NotebookCellsLayout(paddingTop);
            layout.restoreWhitespace(existingMap.getWhitespaces());
            return layout;
        }
        else {
            return new NotebookCellsLayout(paddingTop);
        }
    }
    insertWhitespace(afterPosition, size) {
        const scrollTop = this.scrollTop;
        const id = `${++this._lastWhitespaceId}`;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const elementPosition = this.elementTop(afterPosition);
        const aboveScrollTop = scrollTop > elementPosition;
        this.notebookRangeMap.insertWhitespace(id, afterPosition, size);
        const newScrolltop = aboveScrollTop ? scrollTop + size : scrollTop;
        this.render(previousRenderRange, newScrolltop, this.lastRenderHeight, undefined, undefined, false);
        this._rerender(newScrolltop, this.renderHeight, false);
        this.eventuallyUpdateScrollDimensions();
        return id;
    }
    changeOneWhitespace(id, newAfterPosition, newSize) {
        const scrollTop = this.scrollTop;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const currentPosition = this.notebookRangeMap.getWhitespacePosition(id);
        if (currentPosition > scrollTop) {
            this.notebookRangeMap.changeOneWhitespace(id, newAfterPosition, newSize);
            this.render(previousRenderRange, scrollTop, this.lastRenderHeight, undefined, undefined, false);
            this._rerender(scrollTop, this.renderHeight, false);
            this.eventuallyUpdateScrollDimensions();
        }
        else {
            this.notebookRangeMap.changeOneWhitespace(id, newAfterPosition, newSize);
            this.eventuallyUpdateScrollDimensions();
        }
    }
    removeWhitespace(id) {
        const scrollTop = this.scrollTop;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        this.notebookRangeMap.removeWhitespace(id);
        this.render(previousRenderRange, scrollTop, this.lastRenderHeight, undefined, undefined, false);
        this._rerender(scrollTop, this.renderHeight, false);
        this.eventuallyUpdateScrollDimensions();
    }
    getWhitespacePosition(id) {
        return this.notebookRangeMap.getWhitespacePosition(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdFZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9ub3RlYm9va0NlbGxMaXN0Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFMUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFZdkcsTUFBTSxPQUFPLG1CQUFtQjtJQVMvQixJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVELElBQUksVUFBVSxDQUFDLFVBQWtCO1FBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUN2RCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUMxQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELFlBQVksVUFBbUI7UUE1QnZCLFdBQU0sR0FBWSxFQUFFLENBQUE7UUFDcEIsZ0JBQVcsR0FBa0IsRUFBRSxDQUFBO1FBQzdCLHVCQUFrQixHQUFrQyxJQUFJLDZCQUE2QixDQUM5RixFQUFFLENBQ0YsQ0FBQTtRQUNPLFVBQUssR0FBRyxDQUFDLENBQUE7UUFDVCxnQkFBVyxHQUFHLENBQUMsQ0FBQTtRQXVCdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLElBQUksQ0FBQyxDQUFB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