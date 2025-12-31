/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LinesDiff {
    constructor(changes, 
    /**
     * Sorted by original line ranges.
     * The original line ranges and the modified line ranges must be disjoint (but can be touching).
     */
    moves, 
    /**
     * Indicates if the time out was reached.
     * In that case, the diffs might be an approximation and the user should be asked to rerun the diff with more time.
     */
    hitTimeout) {
        this.changes = changes;
        this.moves = moves;
        this.hitTimeout = hitTimeout;
    }
}
export class MovedText {
    constructor(lineRangeMapping, changes) {
        this.lineRangeMapping = lineRangeMapping;
        this.changes = changes;
    }
    flip() {
        return new MovedText(this.lineRangeMapping.flip(), this.changes.map((c) => c.flip()));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEaWZmQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvbGluZXNEaWZmQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFtQmhHLE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQ1UsT0FBNEM7SUFFckQ7OztPQUdHO0lBQ00sS0FBMkI7SUFFcEM7OztPQUdHO0lBQ00sVUFBbUI7UUFabkIsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7UUFNNUMsVUFBSyxHQUFMLEtBQUssQ0FBc0I7UUFNM0IsZUFBVSxHQUFWLFVBQVUsQ0FBUztJQUMxQixDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sU0FBUztJQVVyQixZQUFZLGdCQUFrQyxFQUFFLE9BQTRDO1FBQzNGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtRQUN4QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtJQUN2QixDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sSUFBSSxTQUFTLENBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUNqQyxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=