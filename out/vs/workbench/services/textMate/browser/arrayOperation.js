/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../base/common/arrays.js';
export class ArrayEdit {
    constructor(
    /**
     * Disjoint edits that are applied in parallel
     */
    edits) {
        this.edits = edits.slice().sort(compareBy((c) => c.offset, numberComparator));
    }
    applyToArray(array) {
        for (let i = this.edits.length - 1; i >= 0; i--) {
            const c = this.edits[i];
            array.splice(c.offset, c.length, ...new Array(c.newLength));
        }
    }
}
export class SingleArrayEdit {
    constructor(offset, length, newLength) {
        this.offset = offset;
        this.length = length;
        this.newLength = newLength;
    }
    toString() {
        return `[${this.offset}, +${this.length}) -> +${this.newLength}}`;
    }
}
/**
 * Can only be called with increasing values of `index`.
 */
export class MonotonousIndexTransformer {
    static fromMany(transformations) {
        // TODO improve performance by combining transformations first
        const transformers = transformations.map((t) => new MonotonousIndexTransformer(t));
        return new CombinedIndexTransformer(transformers);
    }
    constructor(transformation) {
        this.transformation = transformation;
        this.idx = 0;
        this.offset = 0;
    }
    /**
     * Precondition: index >= previous-value-of(index).
     */
    transform(index) {
        let nextChange = this.transformation.edits[this.idx];
        while (nextChange && nextChange.offset + nextChange.length <= index) {
            this.offset += nextChange.newLength - nextChange.length;
            this.idx++;
            nextChange = this.transformation.edits[this.idx];
        }
        // assert nextChange === undefined || index < nextChange.offset + nextChange.length
        if (nextChange && nextChange.offset <= index) {
            // Offset is touched by the change
            return undefined;
        }
        return index + this.offset;
    }
}
export class CombinedIndexTransformer {
    constructor(transformers) {
        this.transformers = transformers;
    }
    transform(index) {
        for (const transformer of this.transformers) {
            const result = transformer.transform(index);
            if (result === undefined) {
                return undefined;
            }
            index = result;
        }
        return index;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9hcnJheU9wZXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFL0UsTUFBTSxPQUFPLFNBQVM7SUFHckI7SUFDQzs7T0FFRztJQUNILEtBQWlDO1FBRWpDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7SUFFRCxZQUFZLENBQUMsS0FBWTtRQUN4QixLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQzVELENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZTtJQUMzQixZQUNpQixNQUFjLEVBQ2QsTUFBYyxFQUNkLFNBQWlCO1FBRmpCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUMvQixDQUFDO0lBRUosUUFBUTtRQUNQLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxNQUFNLElBQUksQ0FBQyxNQUFNLFNBQVMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFBO0lBQ2xFLENBQUM7Q0FDRDtBQU1EOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDBCQUEwQjtJQUMvQixNQUFNLENBQUMsUUFBUSxDQUFDLGVBQTRCO1FBQ2xELDhEQUE4RDtRQUM5RCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsT0FBTyxJQUFJLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFLRCxZQUE2QixjQUF5QjtRQUF6QixtQkFBYyxHQUFkLGNBQWMsQ0FBVztRQUg5QyxRQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ1AsV0FBTSxHQUFHLENBQUMsQ0FBQTtJQUV1QyxDQUFDO0lBRTFEOztPQUVHO0lBQ0gsU0FBUyxDQUFDLEtBQWE7UUFDdEIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBZ0MsQ0FBQTtRQUNuRixPQUFPLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDckUsSUFBSSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUE7WUFDdkQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ1YsVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsbUZBQW1GO1FBRW5GLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDOUMsa0NBQWtDO1lBQ2xDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx3QkFBd0I7SUFDcEMsWUFBNkIsWUFBaUM7UUFBakMsaUJBQVksR0FBWixZQUFZLENBQXFCO0lBQUcsQ0FBQztJQUVsRSxTQUFTLENBQUMsS0FBYTtRQUN0QixLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzNDLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMxQixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsS0FBSyxHQUFHLE1BQU0sQ0FBQTtRQUNmLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9