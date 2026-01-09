/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var Range;
(function (Range) {
    /**
     * Returns the intersection between two ranges as a range itself.
     * Returns `{ start: 0, end: 0 }` if the intersection is empty.
     */
    function intersect(one, other) {
        if (one.start >= other.end || other.start >= one.end) {
            return { start: 0, end: 0 };
        }
        const start = Math.max(one.start, other.start);
        const end = Math.min(one.end, other.end);
        if (end - start <= 0) {
            return { start: 0, end: 0 };
        }
        return { start, end };
    }
    Range.intersect = intersect;
    function isEmpty(range) {
        return range.end - range.start <= 0;
    }
    Range.isEmpty = isEmpty;
    function intersects(one, other) {
        return !isEmpty(intersect(one, other));
    }
    Range.intersects = intersects;
    function relativeComplement(one, other) {
        const result = [];
        const first = { start: one.start, end: Math.min(other.start, one.end) };
        const second = { start: Math.max(other.end, one.start), end: one.end };
        if (!isEmpty(first)) {
            result.push(first);
        }
        if (!isEmpty(second)) {
            result.push(second);
        }
        return result;
    }
    Range.relativeComplement = relativeComplement;
})(Range || (Range = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3JhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBWWhHLE1BQU0sS0FBVyxLQUFLLENBMkNyQjtBQTNDRCxXQUFpQixLQUFLO0lBQ3JCOzs7T0FHRztJQUNILFNBQWdCLFNBQVMsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUNuRCxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUV4QyxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFiZSxlQUFTLFlBYXhCLENBQUE7SUFFRCxTQUFnQixPQUFPLENBQUMsS0FBYTtRQUNwQyxPQUFPLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUZlLGFBQU8sVUFFdEIsQ0FBQTtJQUVELFNBQWdCLFVBQVUsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUNwRCxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRmUsZ0JBQVUsYUFFekIsQ0FBQTtJQUVELFNBQWdCLGtCQUFrQixDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQzVELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixNQUFNLEtBQUssR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUE7UUFDdkUsTUFBTSxNQUFNLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRXRFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25CLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBZGUsd0JBQWtCLHFCQWNqQyxDQUFBO0FBQ0YsQ0FBQyxFQTNDZ0IsS0FBSyxLQUFMLEtBQUssUUEyQ3JCIn0=