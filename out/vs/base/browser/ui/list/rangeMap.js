/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/range.js';
/**
 * Returns the intersection between a ranged group and a range.
 * Returns `[]` if the intersection is empty.
 */
export function groupIntersect(range, groups) {
    const result = [];
    for (const r of groups) {
        if (range.start >= r.range.end) {
            continue;
        }
        if (range.end < r.range.start) {
            break;
        }
        const intersection = Range.intersect(range, r.range);
        if (Range.isEmpty(intersection)) {
            continue;
        }
        result.push({
            range: intersection,
            size: r.size,
        });
    }
    return result;
}
/**
 * Shifts a range by that `much`.
 */
export function shift({ start, end }, much) {
    return { start: start + much, end: end + much };
}
/**
 * Consolidates a collection of ranged groups.
 *
 * Consolidation is the process of merging consecutive ranged groups
 * that share the same `size`.
 */
export function consolidate(groups) {
    const result = [];
    let previousGroup = null;
    for (const group of groups) {
        const start = group.range.start;
        const end = group.range.end;
        const size = group.size;
        if (previousGroup && size === previousGroup.size) {
            previousGroup.range.end = end;
            continue;
        }
        previousGroup = { range: { start, end }, size };
        result.push(previousGroup);
    }
    return result;
}
/**
 * Concatenates several collections of ranged groups into a single
 * collection.
 */
function concat(...groups) {
    return consolidate(groups.reduce((r, g) => r.concat(g), []));
}
export class RangeMap {
    get paddingTop() {
        return this._paddingTop;
    }
    set paddingTop(paddingTop) {
        this._size = this._size + paddingTop - this._paddingTop;
        this._paddingTop = paddingTop;
    }
    constructor(topPadding) {
        this.groups = [];
        this._size = 0;
        this._paddingTop = 0;
        this._paddingTop = topPadding ?? 0;
        this._size = this._paddingTop;
    }
    splice(index, deleteCount, items = []) {
        const diff = items.length - deleteCount;
        const before = groupIntersect({ start: 0, end: index }, this.groups);
        const after = groupIntersect({ start: index + deleteCount, end: Number.POSITIVE_INFINITY }, this.groups).map((g) => ({ range: shift(g.range, diff), size: g.size }));
        const middle = items.map((item, i) => ({
            range: { start: index + i, end: index + i + 1 },
            size: item.size,
        }));
        this.groups = concat(before, middle, after);
        this._size =
            this._paddingTop + this.groups.reduce((t, g) => t + g.size * (g.range.end - g.range.start), 0);
    }
    /**
     * Returns the number of items in the range map.
     */
    get count() {
        const len = this.groups.length;
        if (!len) {
            return 0;
        }
        return this.groups[len - 1].range.end;
    }
    /**
     * Returns the sum of the sizes of all items in the range map.
     */
    get size() {
        return this._size;
    }
    /**
     * Returns the index of the item at the given position.
     */
    indexAt(position) {
        if (position < 0) {
            return -1;
        }
        if (position < this._paddingTop) {
            return 0;
        }
        let index = 0;
        let size = this._paddingTop;
        for (const group of this.groups) {
            const count = group.range.end - group.range.start;
            const newSize = size + count * group.size;
            if (position < newSize) {
                return index + Math.floor((position - size) / group.size);
            }
            index += count;
            size = newSize;
        }
        return index;
    }
    /**
     * Returns the index of the item right after the item at the
     * index of the given position.
     */
    indexAfter(position) {
        return Math.min(this.indexAt(position) + 1, this.count);
    }
    /**
     * Returns the start position of the item at the given index.
     */
    positionAt(index) {
        if (index < 0) {
            return -1;
        }
        let position = 0;
        let count = 0;
        for (const group of this.groups) {
            const groupCount = group.range.end - group.range.start;
            const newCount = count + groupCount;
            if (index < newCount) {
                return this._paddingTop + position + (index - count) * group.size;
            }
            position += groupCount * group.size;
            count = newCount;
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbGlzdC9yYW5nZU1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFXeEQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxLQUFhLEVBQUUsTUFBc0I7SUFDbkUsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQTtJQUVqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2hDLFNBQVE7UUFDVCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsTUFBSztRQUNOLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFcEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDakMsU0FBUTtRQUNULENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO1NBQ1osQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQVUsRUFBRSxJQUFZO0lBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFBO0FBQ2hELENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsTUFBc0I7SUFDakQsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQTtJQUNqQyxJQUFJLGFBQWEsR0FBd0IsSUFBSSxDQUFBO0lBRTdDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7UUFDNUIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDL0IsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7UUFDM0IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUV2QixJQUFJLGFBQWEsSUFBSSxJQUFJLEtBQUssYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xELGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQTtZQUM3QixTQUFRO1FBQ1QsQ0FBQztRQUVELGFBQWEsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLE1BQU0sQ0FBQyxHQUFHLE1BQXdCO0lBQzFDLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDN0QsQ0FBQztBQVlELE1BQU0sT0FBTyxRQUFRO0lBS3BCLElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsVUFBa0I7UUFDaEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO0lBQzlCLENBQUM7SUFFRCxZQUFZLFVBQW1CO1FBYnZCLFdBQU0sR0FBbUIsRUFBRSxDQUFBO1FBQzNCLFVBQUssR0FBRyxDQUFDLENBQUE7UUFDVCxnQkFBVyxHQUFHLENBQUMsQ0FBQTtRQVl0QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUE7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYSxFQUFFLFdBQW1CLEVBQUUsUUFBaUIsRUFBRTtRQUM3RCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEUsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUMzQixFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsV0FBVyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsRUFDN0QsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDLEdBQUcsQ0FBZSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUzRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNwRCxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ2YsQ0FBQyxDQUFDLENBQUE7UUFFSCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxLQUFLO1lBQ1QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLEtBQUs7UUFDUixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtRQUU5QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7SUFDdEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU8sQ0FBQyxRQUFnQjtRQUN2QixJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUVELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDYixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBRTNCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO1lBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUV6QyxJQUFJLFFBQVEsR0FBRyxPQUFPLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUQsQ0FBQztZQUVELEtBQUssSUFBSSxLQUFLLENBQUE7WUFDZCxJQUFJLEdBQUcsT0FBTyxDQUFBO1FBQ2YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVEOzs7T0FHRztJQUNILFVBQVUsQ0FBQyxRQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxLQUFhO1FBQ3ZCLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBRWIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7WUFDdEQsTUFBTSxRQUFRLEdBQUcsS0FBSyxHQUFHLFVBQVUsQ0FBQTtZQUVuQyxJQUFJLEtBQUssR0FBRyxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsR0FBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1lBQ2xFLENBQUM7WUFFRCxRQUFRLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFDbkMsS0FBSyxHQUFHLFFBQVEsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNWLENBQUM7Q0FDRCJ9