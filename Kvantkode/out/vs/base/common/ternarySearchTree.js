/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { shuffle } from './arrays.js';
import { compare, compareIgnoreCase, compareSubstring, compareSubstringIgnoreCase, } from './strings.js';
export class StringIterator {
    constructor() {
        this._value = '';
        this._pos = 0;
    }
    reset(key) {
        this._value = key;
        this._pos = 0;
        return this;
    }
    next() {
        this._pos += 1;
        return this;
    }
    hasNext() {
        return this._pos < this._value.length - 1;
    }
    cmp(a) {
        const aCode = a.charCodeAt(0);
        const thisCode = this._value.charCodeAt(this._pos);
        return aCode - thisCode;
    }
    value() {
        return this._value[this._pos];
    }
}
export class ConfigKeysIterator {
    constructor(_caseSensitive = true) {
        this._caseSensitive = _caseSensitive;
    }
    reset(key) {
        this._value = key;
        this._from = 0;
        this._to = 0;
        return this.next();
    }
    hasNext() {
        return this._to < this._value.length;
    }
    next() {
        // this._data = key.split(/[\\/]/).filter(s => !!s);
        this._from = this._to;
        let justSeps = true;
        for (; this._to < this._value.length; this._to++) {
            const ch = this._value.charCodeAt(this._to);
            if (ch === 46 /* CharCode.Period */) {
                if (justSeps) {
                    this._from++;
                }
                else {
                    break;
                }
            }
            else {
                justSeps = false;
            }
        }
        return this;
    }
    cmp(a) {
        return this._caseSensitive
            ? compareSubstring(a, this._value, 0, a.length, this._from, this._to)
            : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
    }
    value() {
        return this._value.substring(this._from, this._to);
    }
}
export class PathIterator {
    constructor(_splitOnBackslash = true, _caseSensitive = true) {
        this._splitOnBackslash = _splitOnBackslash;
        this._caseSensitive = _caseSensitive;
    }
    reset(key) {
        this._from = 0;
        this._to = 0;
        this._value = key;
        this._valueLen = key.length;
        for (let pos = key.length - 1; pos >= 0; pos--, this._valueLen--) {
            const ch = this._value.charCodeAt(pos);
            if (!(ch === 47 /* CharCode.Slash */ || (this._splitOnBackslash && ch === 92 /* CharCode.Backslash */))) {
                break;
            }
        }
        return this.next();
    }
    hasNext() {
        return this._to < this._valueLen;
    }
    next() {
        // this._data = key.split(/[\\/]/).filter(s => !!s);
        this._from = this._to;
        let justSeps = true;
        for (; this._to < this._valueLen; this._to++) {
            const ch = this._value.charCodeAt(this._to);
            if (ch === 47 /* CharCode.Slash */ || (this._splitOnBackslash && ch === 92 /* CharCode.Backslash */)) {
                if (justSeps) {
                    this._from++;
                }
                else {
                    break;
                }
            }
            else {
                justSeps = false;
            }
        }
        return this;
    }
    cmp(a) {
        return this._caseSensitive
            ? compareSubstring(a, this._value, 0, a.length, this._from, this._to)
            : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
    }
    value() {
        return this._value.substring(this._from, this._to);
    }
}
var UriIteratorState;
(function (UriIteratorState) {
    UriIteratorState[UriIteratorState["Scheme"] = 1] = "Scheme";
    UriIteratorState[UriIteratorState["Authority"] = 2] = "Authority";
    UriIteratorState[UriIteratorState["Path"] = 3] = "Path";
    UriIteratorState[UriIteratorState["Query"] = 4] = "Query";
    UriIteratorState[UriIteratorState["Fragment"] = 5] = "Fragment";
})(UriIteratorState || (UriIteratorState = {}));
export class UriIterator {
    constructor(_ignorePathCasing, _ignoreQueryAndFragment) {
        this._ignorePathCasing = _ignorePathCasing;
        this._ignoreQueryAndFragment = _ignoreQueryAndFragment;
        this._states = [];
        this._stateIdx = 0;
    }
    reset(key) {
        this._value = key;
        this._states = [];
        if (this._value.scheme) {
            this._states.push(1 /* UriIteratorState.Scheme */);
        }
        if (this._value.authority) {
            this._states.push(2 /* UriIteratorState.Authority */);
        }
        if (this._value.path) {
            this._pathIterator = new PathIterator(false, !this._ignorePathCasing(key));
            this._pathIterator.reset(key.path);
            if (this._pathIterator.value()) {
                this._states.push(3 /* UriIteratorState.Path */);
            }
        }
        if (!this._ignoreQueryAndFragment(key)) {
            if (this._value.query) {
                this._states.push(4 /* UriIteratorState.Query */);
            }
            if (this._value.fragment) {
                this._states.push(5 /* UriIteratorState.Fragment */);
            }
        }
        this._stateIdx = 0;
        return this;
    }
    next() {
        if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */ && this._pathIterator.hasNext()) {
            this._pathIterator.next();
        }
        else {
            this._stateIdx += 1;
        }
        return this;
    }
    hasNext() {
        return ((this._states[this._stateIdx] === 3 /* UriIteratorState.Path */ && this._pathIterator.hasNext()) ||
            this._stateIdx < this._states.length - 1);
    }
    cmp(a) {
        if (this._states[this._stateIdx] === 1 /* UriIteratorState.Scheme */) {
            return compareIgnoreCase(a, this._value.scheme);
        }
        else if (this._states[this._stateIdx] === 2 /* UriIteratorState.Authority */) {
            return compareIgnoreCase(a, this._value.authority);
        }
        else if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */) {
            return this._pathIterator.cmp(a);
        }
        else if (this._states[this._stateIdx] === 4 /* UriIteratorState.Query */) {
            return compare(a, this._value.query);
        }
        else if (this._states[this._stateIdx] === 5 /* UriIteratorState.Fragment */) {
            return compare(a, this._value.fragment);
        }
        throw new Error();
    }
    value() {
        if (this._states[this._stateIdx] === 1 /* UriIteratorState.Scheme */) {
            return this._value.scheme;
        }
        else if (this._states[this._stateIdx] === 2 /* UriIteratorState.Authority */) {
            return this._value.authority;
        }
        else if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */) {
            return this._pathIterator.value();
        }
        else if (this._states[this._stateIdx] === 4 /* UriIteratorState.Query */) {
            return this._value.query;
        }
        else if (this._states[this._stateIdx] === 5 /* UriIteratorState.Fragment */) {
            return this._value.fragment;
        }
        throw new Error();
    }
}
class Undef {
    static { this.Val = Symbol('undefined_placeholder'); }
    static wrap(value) {
        return value === undefined ? Undef.Val : value;
    }
    static unwrap(value) {
        return value === Undef.Val ? undefined : value;
    }
}
class TernarySearchTreeNode {
    constructor() {
        this.height = 1;
    }
    isEmpty() {
        return !this.left && !this.mid && !this.right && this.value === undefined;
    }
    rotateLeft() {
        const tmp = this.right;
        this.right = tmp.left;
        tmp.left = this;
        this.updateHeight();
        tmp.updateHeight();
        return tmp;
    }
    rotateRight() {
        const tmp = this.left;
        this.left = tmp.right;
        tmp.right = this;
        this.updateHeight();
        tmp.updateHeight();
        return tmp;
    }
    updateHeight() {
        this.height = 1 + Math.max(this.heightLeft, this.heightRight);
    }
    balanceFactor() {
        return this.heightRight - this.heightLeft;
    }
    get heightLeft() {
        return this.left?.height ?? 0;
    }
    get heightRight() {
        return this.right?.height ?? 0;
    }
}
var Dir;
(function (Dir) {
    Dir[Dir["Left"] = -1] = "Left";
    Dir[Dir["Mid"] = 0] = "Mid";
    Dir[Dir["Right"] = 1] = "Right";
})(Dir || (Dir = {}));
export class TernarySearchTree {
    static forUris(ignorePathCasing = () => false, ignoreQueryAndFragment = () => false) {
        return new TernarySearchTree(new UriIterator(ignorePathCasing, ignoreQueryAndFragment));
    }
    static forPaths(ignorePathCasing = false) {
        return new TernarySearchTree(new PathIterator(undefined, !ignorePathCasing));
    }
    static forStrings() {
        return new TernarySearchTree(new StringIterator());
    }
    static forConfigKeys() {
        return new TernarySearchTree(new ConfigKeysIterator());
    }
    constructor(segments) {
        this._iter = segments;
    }
    clear() {
        this._root = undefined;
    }
    fill(values, keys) {
        if (keys) {
            const arr = keys.slice(0);
            shuffle(arr);
            for (const k of arr) {
                this.set(k, values);
            }
        }
        else {
            const arr = values.slice(0);
            shuffle(arr);
            for (const entry of arr) {
                this.set(entry[0], entry[1]);
            }
        }
    }
    set(key, element) {
        const iter = this._iter.reset(key);
        let node;
        if (!this._root) {
            this._root = new TernarySearchTreeNode();
            this._root.segment = iter.value();
        }
        const stack = [];
        // find insert_node
        node = this._root;
        while (true) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                if (!node.left) {
                    node.left = new TernarySearchTreeNode();
                    node.left.segment = iter.value();
                }
                stack.push([-1 /* Dir.Left */, node]);
                node = node.left;
            }
            else if (val < 0) {
                // right
                if (!node.right) {
                    node.right = new TernarySearchTreeNode();
                    node.right.segment = iter.value();
                }
                stack.push([1 /* Dir.Right */, node]);
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                if (!node.mid) {
                    node.mid = new TernarySearchTreeNode();
                    node.mid.segment = iter.value();
                }
                stack.push([0 /* Dir.Mid */, node]);
                node = node.mid;
            }
            else {
                break;
            }
        }
        // set value
        const oldElement = Undef.unwrap(node.value);
        node.value = Undef.wrap(element);
        node.key = key;
        // balance
        for (let i = stack.length - 1; i >= 0; i--) {
            const node = stack[i][1];
            node.updateHeight();
            const bf = node.balanceFactor();
            if (bf < -1 || bf > 1) {
                // needs rotate
                const d1 = stack[i][0];
                const d2 = stack[i + 1][0];
                if (d1 === 1 /* Dir.Right */ && d2 === 1 /* Dir.Right */) {
                    //right, right -> rotate left
                    stack[i][1] = node.rotateLeft();
                }
                else if (d1 === -1 /* Dir.Left */ && d2 === -1 /* Dir.Left */) {
                    // left, left -> rotate right
                    stack[i][1] = node.rotateRight();
                }
                else if (d1 === 1 /* Dir.Right */ && d2 === -1 /* Dir.Left */) {
                    // right, left -> double rotate right, left
                    node.right = stack[i + 1][1] = stack[i + 1][1].rotateRight();
                    stack[i][1] = node.rotateLeft();
                }
                else if (d1 === -1 /* Dir.Left */ && d2 === 1 /* Dir.Right */) {
                    // left, right -> double rotate left, right
                    node.left = stack[i + 1][1] = stack[i + 1][1].rotateLeft();
                    stack[i][1] = node.rotateRight();
                }
                else {
                    throw new Error();
                }
                // patch path to parent
                if (i > 0) {
                    switch (stack[i - 1][0]) {
                        case -1 /* Dir.Left */:
                            stack[i - 1][1].left = stack[i][1];
                            break;
                        case 1 /* Dir.Right */:
                            stack[i - 1][1].right = stack[i][1];
                            break;
                        case 0 /* Dir.Mid */:
                            stack[i - 1][1].mid = stack[i][1];
                            break;
                    }
                }
                else {
                    this._root = stack[0][1];
                }
            }
        }
        return oldElement;
    }
    get(key) {
        return Undef.unwrap(this._getNode(key)?.value);
    }
    _getNode(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                node = node.mid;
            }
            else {
                break;
            }
        }
        return node;
    }
    has(key) {
        const node = this._getNode(key);
        return !(node?.value === undefined && node?.mid === undefined);
    }
    delete(key) {
        return this._delete(key, false);
    }
    deleteSuperstr(key) {
        return this._delete(key, true);
    }
    _delete(key, superStr) {
        const iter = this._iter.reset(key);
        const stack = [];
        let node = this._root;
        // find node
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                stack.push([-1 /* Dir.Left */, node]);
                node = node.left;
            }
            else if (val < 0) {
                // right
                stack.push([1 /* Dir.Right */, node]);
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                stack.push([0 /* Dir.Mid */, node]);
                node = node.mid;
            }
            else {
                break;
            }
        }
        if (!node) {
            // node not found
            return;
        }
        if (superStr) {
            // removing children, reset height
            node.left = undefined;
            node.mid = undefined;
            node.right = undefined;
            node.height = 1;
        }
        else {
            // removing element
            node.key = undefined;
            node.value = undefined;
        }
        // BST node removal
        if (!node.mid && !node.value) {
            if (node.left && node.right) {
                // full node
                // replace deleted-node with the min-node of the right branch.
                // If there is no true min-node leave things as they are
                const min = this._min(node.right);
                if (min.key) {
                    const { key, value, segment } = min;
                    this._delete(min.key, false);
                    node.key = key;
                    node.value = value;
                    node.segment = segment;
                }
            }
            else {
                // empty or half empty
                const newChild = node.left ?? node.right;
                if (stack.length > 0) {
                    const [dir, parent] = stack[stack.length - 1];
                    switch (dir) {
                        case -1 /* Dir.Left */:
                            parent.left = newChild;
                            break;
                        case 0 /* Dir.Mid */:
                            parent.mid = newChild;
                            break;
                        case 1 /* Dir.Right */:
                            parent.right = newChild;
                            break;
                    }
                }
                else {
                    this._root = newChild;
                }
            }
        }
        // AVL balance
        for (let i = stack.length - 1; i >= 0; i--) {
            const node = stack[i][1];
            node.updateHeight();
            const bf = node.balanceFactor();
            if (bf > 1) {
                // right heavy
                if (node.right.balanceFactor() >= 0) {
                    // right, right -> rotate left
                    stack[i][1] = node.rotateLeft();
                }
                else {
                    // right, left -> double rotate
                    node.right = node.right.rotateRight();
                    stack[i][1] = node.rotateLeft();
                }
            }
            else if (bf < -1) {
                // left heavy
                if (node.left.balanceFactor() <= 0) {
                    // left, left -> rotate right
                    stack[i][1] = node.rotateRight();
                }
                else {
                    // left, right -> double rotate
                    node.left = node.left.rotateLeft();
                    stack[i][1] = node.rotateRight();
                }
            }
            // patch path to parent
            if (i > 0) {
                switch (stack[i - 1][0]) {
                    case -1 /* Dir.Left */:
                        stack[i - 1][1].left = stack[i][1];
                        break;
                    case 1 /* Dir.Right */:
                        stack[i - 1][1].right = stack[i][1];
                        break;
                    case 0 /* Dir.Mid */:
                        stack[i - 1][1].mid = stack[i][1];
                        break;
                }
            }
            else {
                this._root = stack[0][1];
            }
        }
    }
    _min(node) {
        while (node.left) {
            node = node.left;
        }
        return node;
    }
    findSubstr(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        let candidate = undefined;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                candidate = Undef.unwrap(node.value) || candidate;
                node = node.mid;
            }
            else {
                break;
            }
        }
        return (node && Undef.unwrap(node.value)) || candidate;
    }
    findSuperstr(key) {
        return this._findSuperstrOrElement(key, false);
    }
    _findSuperstrOrElement(key, allowValue) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                node = node.mid;
            }
            else {
                // collect
                if (!node.mid) {
                    if (allowValue) {
                        return Undef.unwrap(node.value);
                    }
                    else {
                        return undefined;
                    }
                }
                else {
                    return this._entries(node.mid);
                }
            }
        }
        return undefined;
    }
    hasElementOrSubtree(key) {
        return this._findSuperstrOrElement(key, true) !== undefined;
    }
    forEach(callback) {
        for (const [key, value] of this) {
            callback(value, key);
        }
    }
    *[Symbol.iterator]() {
        yield* this._entries(this._root);
    }
    _entries(node) {
        const result = [];
        this._dfsEntries(node, result);
        return result[Symbol.iterator]();
    }
    _dfsEntries(node, bucket) {
        // DFS
        if (!node) {
            return;
        }
        if (node.left) {
            this._dfsEntries(node.left, bucket);
        }
        if (node.value !== undefined) {
            bucket.push([node.key, Undef.unwrap(node.value)]);
        }
        if (node.mid) {
            this._dfsEntries(node.mid, bucket);
        }
        if (node.right) {
            this._dfsEntries(node.right, bucket);
        }
    }
    // for debug/testing
    _isBalanced() {
        const nodeIsBalanced = (node) => {
            if (!node) {
                return true;
            }
            const bf = node.balanceFactor();
            if (bf < -1 || bf > 1) {
                return false;
            }
            return nodeIsBalanced(node.left) && nodeIsBalanced(node.right);
        };
        return nodeIsBalanced(this._root);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybmFyeVNlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Rlcm5hcnlTZWFyY2hUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFckMsT0FBTyxFQUNOLE9BQU8sRUFDUCxpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixHQUMxQixNQUFNLGNBQWMsQ0FBQTtBQVlyQixNQUFNLE9BQU8sY0FBYztJQUEzQjtRQUNTLFdBQU0sR0FBVyxFQUFFLENBQUE7UUFDbkIsU0FBSSxHQUFXLENBQUMsQ0FBQTtJQTBCekIsQ0FBQztJQXhCQSxLQUFLLENBQUMsR0FBVztRQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQTtRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUNiLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQTtRQUNkLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxHQUFHLENBQUMsQ0FBUztRQUNaLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xELE9BQU8sS0FBSyxHQUFHLFFBQVEsQ0FBQTtJQUN4QixDQUFDO0lBRUQsS0FBSztR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