/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from './iterator.js';
const unset = Symbol('unset');
/**
 * A simple prefix tree implementation where a value is stored based on
 * well-defined prefix segments.
 */
export class WellDefinedPrefixTree {
    constructor() {
        this.root = new Node();
        this._size = 0;
    }
    /** Tree size, not including the root. */
    get size() {
        return this._size;
    }
    /** Gets the top-level nodes of the tree */
    get nodes() {
        return this.root.children?.values() || Iterable.empty();
    }
    /** Gets the top-level nodes of the tree */
    get entries() {
        return this.root.children?.entries() || Iterable.empty();
    }
    /**
     * Inserts a new value in the prefix tree.
     * @param onNode - called for each node as we descend to the insertion point,
     * including the insertion point itself.
     */
    insert(key, value, onNode) {
        this.opNode(key, (n) => (n._value = value), onNode);
    }
    /** Mutates a value in the prefix tree. */
    mutate(key, mutate) {
        this.opNode(key, (n) => (n._value = mutate(n._value === unset ? undefined : n._value)));
    }
    /** Mutates nodes along the path in the prefix tree. */
    mutatePath(key, mutate) {
        this.opNode(key, () => { }, (n) => mutate(n));
    }
    /** Deletes a node from the prefix tree, returning the value it contained. */
    delete(key) {
        const path = this.getPathToKey(key);
        if (!path) {
            return;
        }
        let i = path.length - 1;
        const value = path[i].node._value;
        if (value === unset) {
            return; // not actually a real node
        }
        this._size--;
        path[i].node._value = unset;
        for (; i > 0; i--) {
            const { node, part } = path[i];
            if (node.children?.size || node._value !== unset) {
                break;
            }
            path[i - 1].node.children.delete(part);
        }
        return value;
    }
    /** Deletes a subtree from the prefix tree, returning the values they contained. */
    *deleteRecursive(key) {
        const path = this.getPathToKey(key);
        if (!path) {
            return;
        }
        const subtree = path[path.length - 1].node;
        // important: run the deletion before we start to yield results, so that
        // it still runs even if the caller doesn't consumer the iterator
        for (let i = path.length - 1; i > 0; i--) {
            const parent = path[i - 1];
            parent.node.children.delete(path[i].part);
            if (parent.node.children.size > 0 || parent.node._value !== unset) {
                break;
            }
        }
        for (const node of bfsIterate(subtree)) {
            if (node._value !== unset) {
                this._size--;
                yield node._value;
            }
        }
        // special case for the root note
        if (subtree === this.root) {
            this.root._value = unset;
            this.root.children = undefined;
        }
    }
    /** Gets a value from the tree. */
    find(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return undefined;
            }
            node = next;
        }
        return node._value === unset ? undefined : node._value;
    }
    /** Gets whether the tree has the key, or a parent of the key, already inserted. */
    hasKeyOrParent(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            if (next._value !== unset) {
                return true;
            }
            node = next;
        }
        return false;
    }
    /** Gets whether the tree has the given key or any children. */
    hasKeyOrChildren(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            node = next;
        }
        return true;
    }
    /** Gets whether the tree has the given key. */
    hasKey(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            node = next;
        }
        return node._value !== unset;
    }
    getPathToKey(key) {
        const path = [{ part: '', node: this.root }];
        let i = 0;
        for (const part of key) {
            const node = path[i].node.children?.get(part);
            if (!node) {
                return; // node not in tree
            }
            path.push({ part, node });
            i++;
        }
        return path;
    }
    opNode(key, fn, onDescend) {
        let node = this.root;
        for (const part of key) {
            if (!node.children) {
                const next = new Node();
                node.children = new Map([[part, next]]);
                node = next;
            }
            else if (!node.children.has(part)) {
                const next = new Node();
                node.children.set(part, next);
                node = next;
            }
            else {
                node = node.children.get(part);
            }
            onDescend?.(node);
        }
        const sizeBefore = node._value === unset ? 0 : 1;
        fn(node);
        const sizeAfter = node._value === unset ? 0 : 1;
        this._size += sizeAfter - sizeBefore;
    }
    /** Returns an iterable of the tree values in no defined order. */
    *values() {
        for (const { _value } of bfsIterate(this.root)) {
            if (_value !== unset) {
                yield _value;
            }
        }
    }
}
function* bfsIterate(root) {
    const stack = [root];
    while (stack.length > 0) {
        const node = stack.pop();
        yield node;
        if (node.children) {
            for (const child of node.children.values()) {
                stack.push(child);
            }
        }
    }
}
class Node {
    constructor() {
        this._value = unset;
    }
    get value() {
        return this._value === unset ? undefined : this._value;
    }
    set value(value) {
        this._value = value === undefined ? unset : value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZml4VHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3ByZWZpeFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV4QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7QUFVN0I7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQUFsQztRQUNpQixTQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUssQ0FBQTtRQUM1QixVQUFLLEdBQUcsQ0FBQyxDQUFBO0lBdU5sQixDQUFDO0lBck5BLHlDQUF5QztJQUN6QyxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELDJDQUEyQztJQUMzQyxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsMkNBQTJDO0lBQzNDLElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN6RCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxHQUFxQixFQUFFLEtBQVEsRUFBRSxNQUF3QztRQUMvRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCwwQ0FBMEM7SUFDMUMsTUFBTSxDQUFDLEdB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