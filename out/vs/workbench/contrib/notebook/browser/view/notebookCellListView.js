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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdFZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvbm90ZWJvb2tDZWxsTGlzdFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTFFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBWXZHLE1BQU0sT0FBTyxtQkFBbUI7SUFTL0IsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFVBQVUsQ0FBQyxVQUFrQjtRQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDdkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7SUFDOUIsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxZQUFZLFVBQW1CO1FBNUJ2QixXQUFNLEdBQVksRUFBRSxDQUFBO1FBQ3BCLGdCQUFXLEdBQWtCLEVBQUUsQ0FBQTtRQUM3Qix1QkFBa0IsR0FBa0MsSUFBSSw2QkFBNkIsQ0FDOUYsRUFBRSxDQUNGLENBQUE7UUFDTyxVQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUF1QnRCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxJQUFJLENBQUMsQ0FBQTtRQUNs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