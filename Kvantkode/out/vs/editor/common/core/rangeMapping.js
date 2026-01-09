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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvcmFuZ2VNYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDbEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTVDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDeEIsWUFBNEIsUUFBdUM7UUFBdkMsYUFBUSxHQUFSLFFBQVEsQ0FBK0I7SUFBRyxDQUFDO0lBRXZFLFdBQVcsQ0FBQyxRQUFrQjtRQUM3QixNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDdkQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FDdkQsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakQsT0FBTyxlQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbEYsT0FBTyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFZO1FBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUN4RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FDekIsS0FBSyxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFTLEVBQ2xELEdBQUcsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksR0FBRyxDQUFDLFFBQVMsQ0FDNUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQ2lCLFFBQWUsRUFDZixRQUFlO1FBRGYsYUFBUSxHQUFSLFFBQVEsQ0FBTztRQUNmLGFBQVEsR0FBUixRQUFRLENBQU87SUFDN0IsQ0FBQztJQUVKLE9BQU87UUFDTixPQUFPLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUE7SUFDcEUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFDcEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFrQjtRQUN4QyxPQUFPLElBQUksZUFBZSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFZO1FBQy9CLE9BQU8sSUFBSSxlQUFlLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxZQUNpQixRQUE4QixFQUM5QixLQUF3QjtRQUR4QixhQUFRLEdBQVIsUUFBUSxDQUFzQjtRQUM5QixVQUFLLEdBQUwsS0FBSyxDQUFtQjtJQUN0QyxDQUFDO0NBQ0oifQ==