/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastMonotonous } from '../../../base/common/arraysFind.js';
import { Range } from './range.js';
import { TextLength } from './textLength.js';
/**
 * Represents a list of mappings of ranges from one document to another.
 */
export class RangeMapping {
    constructor(mappings) {
        this.mappings = mappings;
    }
    mapPosition(position) {
        const mapping = findLastMonotonous(this.mappings, (m) => m.original.getStartPosition().isBeforeOrEqual(position));
        if (!mapping) {
            return PositionOrRange.position(position);
        }
        if (mapping.original.containsPosition(position)) {
            return PositionOrRange.range(mapping.modified);
        }
        const l = TextLength.betweenPositions(mapping.original.getEndPosition(), position);
        return PositionOrRange.position(l.addToPosition(mapping.modified.getEndPosition()));
    }
    mapRange(range) {
        const start = this.mapPosition(range.getStartPosition());
        const end = this.mapPosition(range.getEndPosition());
        return Range.fromPositions(start.range?.getStartPosition() ?? start.position, end.range?.getEndPosition() ?? end.position);
    }
    reverse() {
        return new RangeMapping(this.mappings.map((mapping) => mapping.reverse()));
    }
}
export class SingleRangeMapping {
    constructor(original, modified) {
        this.original = original;
        this.modified = modified;
    }
    reverse() {
        return new SingleRangeMapping(this.modified, this.original);
    }
    toString() {
        return `${this.original.toString()} -> ${this.modified.toString()}`;
    }
}
export class PositionOrRange {
    static position(position) {
        return new PositionOrRange(position, undefined);
    }
    static range(range) {
        return new PositionOrRange(undefined, range);
    }
    constructor(position, range) {
        this.position = position;
        this.range = range;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3JhbmdlTWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU1Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3hCLFlBQTRCLFFBQXVDO1FBQXZDLGFBQVEsR0FBUixRQUFRLENBQStCO0lBQUcsQ0FBQztJQUV2RSxXQUFXLENBQUMsUUFBa0I7UUFDN0IsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3ZELENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQ3ZELENBQUE7UUFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2xGLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBWTtRQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDeEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUNwRCxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQ3pCLEtBQUssQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUyxFQUNsRCxHQUFHLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxRQUFTLENBQzVDLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0UsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixZQUNpQixRQUFlLEVBQ2YsUUFBZTtRQURmLGFBQVEsR0FBUixRQUFRLENBQU87UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFPO0lBQzdCLENBQUM7SUFFSixPQUFPO1FBQ04sT0FBTyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFBO0lBQ3BFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBQ3BCLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBa0I7UUFDeEMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBWTtRQUMvQixPQUFPLElBQUksZUFBZSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsWUFDaUIsUUFBOEIsRUFDOUIsS0FBd0I7UUFEeEIsYUFBUSxHQUFSLFFBQVEsQ0FBc0I7UUFDOUIsVUFBSyxHQUFMLEtBQUssQ0FBbUI7SUFDdEMsQ0FBQztDQUNKIn0=