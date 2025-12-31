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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybmFyeVNlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90ZXJuYXJ5U2VhcmNoVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXJDLE9BQU8sRUFDTixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQiwwQkFBMEIsR0FDMUIsTUFBTSxjQUFjLENBQUE7QUFZckIsTUFBTSxPQUFPLGNBQWM7SUFBM0I7UUFDUyxXQUFNLEdBQVcsRUFBRSxDQUFBO1FBQ25CLFNBQUksR0FBVyxDQUFDLENBQUE7SUEwQnpCLENBQUM7SUF4QkEsS0FBSyxDQUFDLEdBQVc7UUFDaEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUE7UUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7UUFDYixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUE7UUFDZCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsR0FBRyxDQUFDLENBQVM7UUFDWixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRCxPQUFPLEtBQUssR0FBRyxRQUFRLENBQUE7SUFDeEIsQ0FBQztJQUVELEtBQUs7UUFDSixP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