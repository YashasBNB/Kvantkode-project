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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdElkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdElkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixlQUdqQjtBQUhELFdBQWtCLGVBQWU7SUFDaEMsMkNBQTJDO0lBQzNDLG1DQUFnQixDQUFBO0FBQ2pCLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBa0IsWUFTakI7QUFURCxXQUFrQixZQUFZO0lBQzdCLGNBQWM7SUFDZCxtREFBTSxDQUFBO0lBQ04sMEZBQTBGO0lBQzFGLCtEQUFZLENBQUE7SUFDWix3QkFBd0I7SUFDeEIscURBQU8sQ0FBQTtJQUNQLHlCQUF5QjtJQUN6Qix1REFBUSxDQUFBO0FBQ1QsQ0FBQyxFQVRpQixZQUFZLEtBQVosWUFBWSxRQVM3QjtBQUlEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLE1BQU07SUFHbEI7O09BRUc7SUFDSSxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBa0IsRUFBRSxNQUFjLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO1FBQ3pGLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0QixLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMs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