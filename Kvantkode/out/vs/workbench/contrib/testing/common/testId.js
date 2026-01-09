/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TestIdPathParts;
(function (TestIdPathParts) {
    /** Delimiter for path parts in test IDs */
    TestIdPathParts["Delimiter"] = "\0";
})(TestIdPathParts || (TestIdPathParts = {}));
/**
 * Enum for describing relative positions of tests. Similar to
 * `node.compareDocumentPosition` in the DOM.
 */
export var TestPosition;
(function (TestPosition) {
    /** a === b */
    TestPosition[TestPosition["IsSame"] = 0] = "IsSame";
    /** Neither a nor b are a child of one another. They may share a common parent, though. */
    TestPosition[TestPosition["Disconnected"] = 1] = "Disconnected";
    /** b is a child of a */
    TestPosition[TestPosition["IsChild"] = 2] = "IsChild";
    /** b is a parent of a */
    TestPosition[TestPosition["IsParent"] = 3] = "IsParent";
})(TestPosition || (TestPosition = {}));
/**
 * The test ID is a stringifiable client that
 */
export class TestId {
    /**
     * Creates a test ID from an ext host test item.
     */
    static fromExtHostTestItem(item, rootId, parent = item.parent) {
        if (item._isRoot) {
            return new TestId([rootId]);
        }
        const path = [item.id];
        for (let i = parent; i && i.id !== rootId; i = i.parent) {
            path.push(i.id);
        }
        path.push(rootId);
        return new TestId(path.reverse());
    }
    /**
     * Cheaply ets whether the ID refers to the root .
     */
    static isRoot(idString) {
        return !idString.includes("\0" /* TestIdPathParts.Delimiter */);
    }
    /**
     * Cheaply gets whether the ID refers to the root .
     */
    static root(idString) {
        const idx = idString.indexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? idString : idString.slice(0, idx);
    }
    /**
     * Creates a test ID from a serialized TestId instance.
     */
    static fromString(idString) {
        return new TestId(idString.split("\0" /* TestIdPathParts.Delimiter */));
    }
    /**
     * Gets the ID resulting from adding b to the base ID.
     */
    static join(base, b) {
        return new TestId([...base.path, b]);
    }
    /**
     * Splits a test ID into its parts.
     */
    static split(idString) {
        return idString.split("\0" /* TestIdPathParts.Delimiter */);
    }
    /**
     * Gets the string ID resulting from adding b to the base ID.
     */
    static joinToString(base, b) {
        return base.toString() + "\0" /* TestIdPathParts.Delimiter */ + b;
    }
    /**
     * Cheaply gets the parent ID of a test identified with the string.
     */
    static parentId(idString) {
        const idx = idString.lastIndexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? undefined : idString.slice(0, idx);
    }
    /**
     * Cheaply gets the local ID of a test identified with the string.
     */
    static localId(idString) {
        const idx = idString.lastIndexOf("\0" /* TestIdPathParts.Delimiter */);
        return idx === -1 ? idString : idString.slice(idx + "\0" /* TestIdPathParts.Delimiter */.length);
    }
    /**
     * Gets whether maybeChild is a child of maybeParent.
     * todo@connor4312: review usages of this to see if using the WellDefinedPrefixTree is better
     */
    static isChild(maybeParent, maybeChild) {
        return (maybeChild[maybeParent.length] === "\0" /* TestIdPathParts.Delimiter */ &&
            maybeChild.startsWith(maybeParent));
    }
    /**
     * Compares the position of the two ID strings.
     * todo@connor4312: review usages of this to see if using the WellDefinedPrefixTree is better
     */
    static compare(a, b) {
        if (a === b) {
            return 0 /* TestPosition.IsSame */;
        }
        if (TestId.isChild(a, b)) {
            return 2 /* TestPosition.IsChild */;
        }
        if (TestId.isChild(b, a)) {
            return 3 /* TestPosition.IsParent */;
        }
        return 1 /* TestPosition.Disconnected */;
    }
    static getLengthOfCommonPrefix(length, getId) {
        if (length === 0) {
            return 0;
        }
        let commonPrefix = 0;
        while (commonPrefix < length - 1) {
            for (let i = 1; i < length; i++) {
                const a = getId(i - 1);
                const b = getId(i);
                if (a.path[commonPrefix] !== b.path[commonPrefix]) {
                    return commonPrefix;
                }
            }
            commonPrefix++;
        }
        return commonPrefix;
    }
    constructor(path, viewEnd = path.length) {
        this.path = path;
        this.viewEnd = viewEnd;
        if (path.length === 0 || viewEnd < 1) {
            throw new Error('cannot create test with empty path');
        }
    }
    /**
     * Gets the ID of the parent test.
     */
    get rootId() {
        return new TestId(this.path, 1);
    }
    /**
     * Gets the ID of the parent test.
     */
    get parentId() {
        return this.viewEnd > 1 ? new TestId(this.path, this.viewEnd - 1) : undefined;
    }
    /**
     * Gets the local ID of the current full test ID.
     */
    get localId() {
        return this.path[this.viewEnd - 1];
    }
    /**
     * Gets whether this ID refers to the root.
     */
    get controllerId() {
        return this.path[0];
    }
    /**
     * Gets whether this ID refers to the root.
     */
    get isRoot() {
        return this.viewEnd === 1;
    }
    /**
     * Returns an iterable that yields IDs of all parent items down to and
     * including the current item.
     */
    *idsFromRoot() {
        for (let i = 1; i <= this.viewEnd; i++) {
            yield new TestId(this.path, i);
        }
    }
    /**
     * Returns an iterable that yields IDs of the current item up to the root
     * item.
     */
    *idsToRoot() {
        for (let i = this.viewEnd; i > 0; i--) {
            yield new TestId(this.path, i);
        }
    }
    /**
     * Compares the other test ID with this one.
     */
    compare(other) {
        if (typeof other === 'string') {
            return TestId.compare(this.toString(), other);
        }
        for (let i = 0; i < other.viewEnd && i < this.viewEnd; i++) {
            if (other.path[i] !== this.path[i]) {
                return 1 /* TestPosition.Disconnected */;
            }
        }
        if (other.viewEnd > this.viewEnd) {
            return 2 /* TestPosition.IsChild */;
        }
        if (other.viewEnd < this.viewEnd) {
            return 3 /* TestPosition.IsParent */;
        }
        return 0 /* TestPosition.IsSame */;
    }
    /**
     * Serializes the ID.
     */
    toJSON() {
        return this.toString();
    }
    /**
     * Serializes the ID to a string.
     */
    toString() {
        if (!this.stringifed) {
            this.stringifed = this.path[0];
            for (let i = 1; i < this.viewEnd; i++) {
                this.stringifed += "\0" /* TestIdPathParts.Delimiter */;
                this.stringifed += this.path[i];
            }
        }
        return this.stringifed;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdElkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0SWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQywyQ0FBMkM7SUFDM0MsbUNBQWdCLENBQUE7QUFDakIsQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQztBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFrQixZQVNqQjtBQVRELFdBQWtCLFlBQVk7SUFDN0IsY0FBYztJQUNkLG1EQUFNLENBQUE7SUFDTiwwRkFBMEY7SUFDMUYsK0RBQVksQ0FBQTtJQUNaLHdCQUF3QjtJQUN4QixxREFBTyxDQUFBO0lBQ1AseUJBQXlCO0lBQ3pCLHVEQUFRLENBQUE7QUFDVCxDQUFDLEVBVGlCLFlBQVksS0FBWixZQUFZLFFBUzdCO0FBSUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sTUFBTTtJQUdsQjs7T0FFRztJQUNJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFrQixFQUFFLE1BQWMsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07UUFDekYsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RCLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFB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