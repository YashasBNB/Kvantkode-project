/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class ListNode {
    get children() {
        return this._children;
    }
    get length() {
        return this._length;
    }
    constructor(height) {
        this.height = height;
        this._children = [];
        this._length = 0;
    }
    static create(node1, node2) {
        const list = new ListNode(node1.height + 1);
        list.appendChild(node1);
        list.appendChild(node2);
        return list;
    }
    canAppendChild() {
        return this._children.length < 3;
    }
    appendChild(node) {
        if (!this.canAppendChild()) {
            throw new Error('Cannot insert more than 3 children in a ListNode');
        }
        this._children.push(node);
        this._length += node.length;
        this._updateParentLength(node.length);
        if (!isLeaf(node)) {
            node.parent = this;
        }
    }
    _updateParentLength(delta) {
        let updateParent = this.parent;
        while (updateParent) {
            updateParent._length += delta;
            updateParent = updateParent.parent;
        }
    }
    unappendChild() {
        const child = this._children.pop();
        this._length -= child.length;
        this._updateParentLength(-child.length);
        return child;
    }
    prependChild(node) {
        if (this._children.length >= 3) {
            throw new Error('Cannot prepend more than 3 children in a ListNode');
        }
        this._children.unshift(node);
        this._length += node.length;
        this._updateParentLength(node.length);
        if (!isLeaf(node)) {
            node.parent = this;
        }
    }
    unprependChild() {
        const child = this._children.shift();
        this._length -= child.length;
        this._updateParentLength(-child.length);
        return child;
    }
    lastChild() {
        return this._children[this._children.length - 1];
    }
    dispose() {
        this._children.splice(0, this._children.length);
    }
}
export var TokenQuality;
(function (TokenQuality) {
    TokenQuality[TokenQuality["None"] = 0] = "None";
    TokenQuality[TokenQuality["ViewportGuess"] = 1] = "ViewportGuess";
    TokenQuality[TokenQuality["EditGuess"] = 2] = "EditGuess";
    TokenQuality[TokenQuality["Accurate"] = 3] = "Accurate";
})(TokenQuality || (TokenQuality = {}));
function isLeaf(node) {
    return node.token !== undefined;
}
// Heavily inspired by https://github.com/microsoft/vscode/blob/4eb2658d592cb6114a7a393655574176cc790c5b/src/vs/editor/common/model/bracketPairsTextModelPart/bracketPairsTree/concat23Trees.ts#L108-L109
function append(node, nodeToAppend) {
    let curNode = node;
    const parents = [];
    let nodeToAppendOfCorrectHeight;
    while (true) {
        if (nodeToAppend.height === curNode.height) {
            nodeToAppendOfCorrectHeight = nodeToAppend;
            break;
        }
        if (isLeaf(curNode)) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        curNode = curNode.lastChild();
    }
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToAppendOfCorrectHeight) {
            // Can we take the element?
            if (parent.children.length >= 3) {
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                const newList = ListNode.create(parent.unappendChild(), nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = newList;
            }
            else {
                parent.appendChild(nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = undefined;
            }
        }
    }
    if (nodeToAppendOfCorrectHeight) {
        const newList = new ListNode(nodeToAppendOfCorrectHeight.height + 1);
        newList.appendChild(node);
        newList.appendChild(nodeToAppendOfCorrectHeight);
        return newList;
    }
    else {
        return node;
    }
}
function prepend(list, nodeToAppend) {
    let curNode = list;
    const parents = [];
    while (nodeToAppend.height !== curNode.height) {
        if (isLeaf(curNode)) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenFast.length <= 3
        curNode = curNode.children[0];
    }
    let nodeToPrependOfCorrectHeight = nodeToAppend;
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToPrependOfCorrectHeight) {
            // Can we take the element?
            if (parent.children.length >= 3) {
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToPrependOfCorrectHeight = ListNode.create(nodeToPrependOfCorrectHeight, parent.unprependChild());
            }
            else {
                parent.prependChild(nodeToPrependOfCorrectHeight);
                nodeToPrependOfCorrectHeight = undefined;
            }
        }
    }
    if (nodeToPrependOfCorrectHeight) {
        return ListNode.create(nodeToPrependOfCorrectHeight, list);
    }
    else {
        return list;
    }
}
function concat(node1, node2) {
    if (node1.height === node2.height) {
        return ListNode.create(node1, node2);
    }
    else if (node1.height > node2.height) {
        // node1 is the tree we want to insert into
        return append(node1, node2);
    }
    else {
        return prepend(node2, node1);
    }
}
export class TokenStore {
    get root() {
        return this._root;
    }
    constructor(_textModel) {
        this._textModel = _textModel;
        this._root = this.createEmptyRoot();
    }
    createEmptyRoot() {
        return {
            length: this._textModel.getValueLength(),
            token: 0,
            height: 0,
            tokenQuality: TokenQuality.None,
        };
    }
    /**
     *
     * @param update all the tokens for the document in sequence
     */
    buildStore(tokens, tokenQuality) {
        this._root = this.createFromUpdates(tokens, tokenQuality);
    }
    createFromUpdates(tokens, tokenQuality) {
        if (tokens.length === 0) {
            return this.createEmptyRoot();
        }
        let newRoot = {
            length: tokens[0].length,
            token: tokens[0].token,
            height: 0,
            tokenQuality,
        };
        for (let j = 1; j < tokens.length; j++) {
            newRoot = append(newRoot, {
                length: tokens[j].length,
                token: tokens[j].token,
                height: 0,
                tokenQuality,
            });
        }
        return newRoot;
    }
    /**
     *
     * @param tokens tokens are in sequence in the document.
     */
    update(length, tokens, tokenQuality) {
        if (tokens.length === 0) {
            return;
        }
        this.replace(length, tokens[0].startOffsetInclusive, tokens, tokenQuality);
    }
    delete(length, startOffset) {
        this.replace(length, startOffset, [], TokenQuality.EditGuess);
    }
    /**
     *
     * @param tokens tokens are in sequence in the document.
     */
    replace(length, updateOffsetStart, tokens, tokenQuality) {
        const firstUnchangedOffsetAfterUpdate = updateOffsetStart + length;
        // Find the last unchanged node preceding the update
        const precedingNodes = [];
        // Find the first unchanged node after the update
        const postcedingNodes = [];
        const stack = [{ node: this._root, offset: 0 }];
        while (stack.length > 0) {
            const node = stack.pop();
            const currentOffset = node.offset;
            if (currentOffset < updateOffsetStart &&
                currentOffset + node.node.length <= updateOffsetStart) {
                if (!isLeaf(node.node)) {
                    node.node.parent = undefined;
                }
                precedingNodes.push(node.node);
                continue;
            }
            else if (isLeaf(node.node) && currentOffset < updateOffsetStart) {
                // We have a partial preceding node
                precedingNodes.push({
                    length: updateOffsetStart - currentOffset,
                    token: node.node.token,
                    height: 0,
                    tokenQuality: node.node.tokenQuality,
                });
                // Node could also be postceeding, so don't continue
            }
            if (updateOffsetStart <= currentOffset &&
                currentOffset + node.node.length <= firstUnchangedOffsetAfterUpdate) {
                continue;
            }
            if (currentOffset >= firstUnchangedOffsetAfterUpdate) {
                if (!isLeaf(node.node)) {
                    node.node.parent = undefined;
                }
                postcedingNodes.push(node.node);
                continue;
            }
            else if (isLeaf(node.node) &&
                currentOffset + node.node.length > firstUnchangedOffsetAfterUpdate) {
                // we have a partial postceeding node
                postcedingNodes.push({
                    length: currentOffset + node.node.length - firstUnchangedOffsetAfterUpdate,
                    token: node.node.token,
                    height: 0,
                    tokenQuality: node.node.tokenQuality,
                });
                continue;
            }
            if (!isLeaf(node.node)) {
                // Push children in reverse order to process them left-to-right when popping
                let childOffset = currentOffset + node.node.length;
                for (let i = node.node.children.length - 1; i >= 0; i--) {
                    childOffset -= node.node.children[i].length;
                    stack.push({ node: node.node.children[i], offset: childOffset });
                }
            }
        }
        let allNodes;
        if (tokens.length > 0) {
            allNodes = precedingNodes.concat(this.createFromUpdates(tokens, tokenQuality), postcedingNodes);
        }
        else {
            allNodes = precedingNodes.concat(postcedingNodes);
        }
        let newRoot = allNodes[0];
        for (let i = 1; i < allNodes.length; i++) {
            newRoot = concat(newRoot, allNodes[i]);
        }
        this._root = newRoot ?? this.createEmptyRoot();
    }
    /**
     *
     * @param startOffsetInclusive
     * @param endOffsetExclusive
     * @param visitor Return true from visitor to exit early
     * @returns
     */
    traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, visitor) {
        const stack = [{ node: this._root, offset: 0 }];
        while (stack.length > 0) {
            const { node, offset } = stack.pop();
            const nodeEnd = offset + node.length;
            // Skip nodes that are completely before or after the range
            if (nodeEnd <= startOffsetInclusive || offset >= endOffsetExclusive) {
                continue;
            }
            if (visitor(node, offset)) {
                return;
            }
            if (!isLeaf(node)) {
                // Push children in reverse order to process them left-to-right when popping
                let childOffset = offset + node.length;
                for (let i = node.children.length - 1; i >= 0; i--) {
                    childOffset -= node.children[i].length;
                    stack.push({ node: node.children[i], offset: childOffset });
                }
            }
        }
    }
    getTokenAt(offset) {
        let result;
        this.traverseInOrderInRange(offset, this._root.length, (node, offset) => {
            if (isLeaf(node)) {
                result = { token: node.token, startOffsetInclusive: offset, length: node.length };
                return true;
            }
            return false;
        });
        return result;
    }
    getTokensInRange(startOffsetInclusive, endOffsetExclusive) {
        const result = [];
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node, offset) => {
            if (isLeaf(node)) {
                let clippedLength = node.length;
                let clippedOffset = offset;
                if (offset < startOffsetInclusive && offset + node.length > endOffsetExclusive) {
                    clippedOffset = startOffsetInclusive;
                    clippedLength = endOffsetExclusive - startOffsetInclusive;
                }
                else if (offset < startOffsetInclusive) {
                    clippedLength -= startOffsetInclusive - offset;
                    clippedOffset = startOffsetInclusive;
                }
                else if (offset + node.length > endOffsetExclusive) {
                    clippedLength -= offset + node.length - endOffsetExclusive;
                }
                result.push({
                    token: node.token,
                    startOffsetInclusive: clippedOffset,
                    length: clippedLength,
                });
            }
            return false;
        });
        return result;
    }
    markForRefresh(startOffsetInclusive, endOffsetExclusive) {
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node)) {
                node.tokenQuality = TokenQuality.None;
            }
            return false;
        });
    }
    rangeHasTokens(startOffsetInclusive, endOffsetExclusive, minimumTokenQuality) {
        let hasAny = true;
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node) && node.tokenQuality < minimumTokenQuality) {
                hasAny = false;
            }
            return false;
        });
        return hasAny;
    }
    rangeNeedsRefresh(startOffsetInclusive, endOffsetExclusive) {
        let needsRefresh = false;
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node) && node.tokenQuality !== TokenQuality.Accurate) {
                needsRefresh = true;
            }
            return false;
        });
        return needsRefresh;
    }
    getNeedsRefresh() {
        const result = [];
        this.traverseInOrderInRange(0, this._textModel.getValueLength(), (node, offset) => {
            if (isLeaf(node) && node.tokenQuality !== TokenQuality.Accurate) {
                if (result.length > 0 && result[result.length - 1].endOffset === offset) {
                    result[result.length - 1].endOffset += node.length;
                }
                else {
                    result.push({ startOffset: offset, endOffset: offset + node.length });
                }
            }
            return false;
        });
        return result;
    }
    deepCopy() {
        const newStore = new TokenStore(this._textModel);
        newStore._root = this._copyNodeIterative(this._root);
        return newStore;
    }
    _copyNodeIterative(root) {
        const newRoot = isLeaf(root)
            ? {
                length: root.length,
                token: root.token,
                tokenQuality: root.tokenQuality,
                height: root.height,
            }
            : new ListNode(root.height);
        const stack = [[root, newRoot]];
        while (stack.length > 0) {
            const [oldNode, clonedNode] = stack.pop();
            if (!isLeaf(oldNode)) {
                for (const child of oldNode.children) {
                    const childCopy = isLeaf(child)
                        ? {
                            length: child.length,
                            token: child.token,
                            tokenQuality: child.tokenQuality,
                            height: child.height,
                        }
                        : new ListNode(child.height);
                    clonedNode.appendChild(childCopy);
                    stack.push([child, childCopy]);
                }
            }
        }
        return newRoot;
    }
    /**
     * Returns a string representation of the token tree using an iterative approach
     */
    printTree(root = this._root) {
        const result = [];
        const stack = [[root, 0]];
        while (stack.length > 0) {
            const [node, depth] = stack.pop();
            const indent = '  '.repeat(depth);
            if (isLeaf(node)) {
                result.push(`${indent}Leaf(length: ${node.length}, token: ${node.token}, refresh: ${node.tokenQuality})\n`);
            }
            else {
                result.push(`${indent}List(length: ${node.length})\n`);
                // Push children in reverse order so they get processed left-to-right
                for (let i = node.children.length - 1; i >= 0; i--) {
                    stack.push([node.children[i], depth + 1]);
                }
            }
        }
        return result.join('');
    }
    dispose() {
        const stack = [[this._root, false]];
        while (stack.length > 0) {
            const [node, visited] = stack.pop();
            if (isLeaf(node)) {
                // leaf node does not need to be disposed
            }
            else if (!visited) {
                stack.push([node, true]);
                for (let i = node.children.length - 1; i >= 0; i--) {
                    stack.push([node.children[i], false]);
                }
            }
            else {
                node.dispose();
                node.parent = undefined;
            }
        }
        this._root = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5TdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLFFBQVE7SUFHYixJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUdELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQsWUFBNEIsTUFBYztRQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFWekIsY0FBUyxHQUFXLEVBQUUsQ0FBQTtRQUsvQixZQUFPLEdBQVcsQ0FBQyxDQUFBO0lBS2tCLENBQUM7SUFFOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFXLEVBQUUsS0FBVztRQUNyQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFVO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXpCLElBQUksQ0FBQyxP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