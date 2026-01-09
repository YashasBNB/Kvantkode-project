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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlblN0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sUUFBUTtJQUdiLElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBR0QsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxZQUE0QixNQUFjO1FBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQVZ6QixjQUFTLEdBQVcsRUFBRSxDQUFBO1FBSy9CLFlBQU8sR0FBVyxDQUFDLENBQUE7SUFLa0IsQ0FBQztJQUU5QyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQVcsRUFBRSxLQUFXO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQVU7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQTtRQUNwRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFekIsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsS0FBYTtRQUN4QyxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzlCLE9BQU8sWUFBWSxFQUFFLENBQUM7WUFDckIsWUFBWSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUE7WUFDN0IsWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhO1FBQ1osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUcsQ0FBQTtRQUNuQyxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFVO1FBQ3RCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFBO1FBQ3JFLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUU1QixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjO1FBQ2IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUcsQ0FBQTtRQUNyQyxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQU4sSUFBWSxZQUtYO0FBTEQsV0FBWSxZQUFZO0lBQ3ZCLCtDQUFRLENBQUE7SUFDUixpRUFBaUIsQ0FBQTtJQUNqQix5REFBYSxDQUFBO0lBQ2IsdURBQVksQ0FBQTtBQUNiLENBQUMsRUFMVyxZQUFZLEtBQVosWUFBWSxRQUt2QjtBQWlCRCxTQUFTLE1BQU0sQ0FBQyxJQUFVO0lBQ3pCLE9BQVEsSUFBaUIsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFBO0FBQzlDLENBQUM7QUFFRCx5TUFBeU07QUFDek0sU0FBUyxNQUFNLENBQUMsSUFBVSxFQUFFLFlBQWtCO0lBQzdDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNsQixNQUFNLE9BQU8sR0FBZSxFQUFFLENBQUE7SUFDOUIsSUFBSSwyQkFBNkMsQ0FBQTtJQUNqRCxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2IsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QywyQkFBMkIsR0FBRyxZQUFZLENBQUE7WUFDMUMsTUFBSztRQUNOLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLElBQUksMkJBQTJCLEVBQUUsQ0FBQztZQUNqQywyQkFBMkI7WUFDM0IsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsb0RBQW9EO2dCQUNwRCwwREFBMEQ7Z0JBQzFELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRyxFQUFFLDJCQUEyQixDQUFDLENBQUE7Z0JBQ3JGLDJCQUEyQixHQUFHLE9BQU8sQ0FBQTtZQUN0QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2dCQUMvQywyQkFBMkIsR0FBRyxTQUFTLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sT0FBTyxHQUFHLElBQUksUUFBUSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pCLE9BQU8sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUNoRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQVUsRUFBRSxZQUFrQjtJQUM5QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUE7SUFDbEIsTUFBTSxPQUFPLEdBQWUsRUFBRSxDQUFBO0lBQzlCLE9BQU8sWUFBWSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDL0MsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JCLCtDQUErQztRQUMvQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQWEsQ0FBQTtJQUMxQyxDQUFDO0lBQ0QsSUFBSSw0QkFBNEIsR0FBcUIsWUFBWSxDQUFBO0lBQ2pFLHdFQUF3RTtJQUN4RSxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM5QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekIsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO1lBQ2xDLDJCQUEyQjtZQUMzQixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxvREFBb0Q7Z0JBQ3BELDBEQUEwRDtnQkFDMUQsNEJBQTRCLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FDN0MsNEJBQTRCLEVBQzVCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FDdkIsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsWUFBWSxDQUFDLDRCQUE0QixDQUFDLENBQUE7Z0JBQ2pELDRCQUE0QixHQUFHLFNBQVMsQ0FBQTtZQUN6QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLDRCQUE0QixFQUFFLENBQUM7UUFDbEMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzNELENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLEtBQVcsRUFBRSxLQUFXO0lBQ3ZDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNyQyxDQUFDO1NBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN4QywyQ0FBMkM7UUFDM0MsT0FBTyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzVCLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFFdEIsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxZQUE2QixVQUFzQjtRQUF0QixlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ2xELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE9BQU87WUFDTixNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7WUFDeEMsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsQ0FBQztZQUNULFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSTtTQUMvQixDQUFBO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNILFVBQVUsQ0FBQyxNQUFxQixFQUFFLFlBQTBCO1FBQzNELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBcUIsRUFBRSxZQUEwQjtRQUMxRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDOUIsQ0FBQztRQUNELElBQUksT0FBTyxHQUFTO1lBQ25CLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUN4QixLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7WUFDdEIsTUFBTSxFQUFFLENBQUM7WUFDVCxZQUFZO1NBQ1osQ0FBQTtRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDeEIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2dCQUN0QixNQUFNLEVBQUUsQ0FBQztnQkFDVCxZQUFZO2FBQ1osQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVEOzs7T0FHRztJQUNILE1BQU0sQ0FBQyxNQUFjLEVBQUUsTUFBcUIsRUFBRSxZQUEwQjtRQUN2RSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBYyxFQUFFLFdBQW1CO1FBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRDs7O09BR0c7SUFDSyxPQUFPLENBQ2QsTUFBYyxFQUNkLGlCQUF5QixFQUN6QixNQUFxQixFQUNyQixZQUEwQjtRQUUxQixNQUFNLCtCQUErQixHQUFHLGlCQUFpQixHQUFHLE1BQU0sQ0FBQTtRQUNsRSxvREFBb0Q7UUFDcEQsTUFBTSxjQUFjLEdBQVcsRUFBRSxDQUFBO1FBQ2pDLGlEQUFpRDtRQUNqRCxNQUFNLGVBQWUsR0FBVyxFQUFFLENBQUE7UUFDbEMsTUFBTSxLQUFLLEdBQXFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVqRixPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRyxDQUFBO1lBQ3pCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7WUFFakMsSUFDQyxhQUFhLEdBQUcsaUJBQWlCO2dCQUNqQyxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksaUJBQWlCLEVBQ3BELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO2dCQUM3QixDQUFDO2dCQUNELGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5QixTQUFRO1lBQ1QsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxHQUFHLGlCQUFpQixFQUFFLENBQUM7Z0JBQ25FLG1DQUFtQztnQkFDbkMsY0FBYyxDQUFDLElBQUksQ0FBQztvQkFDbkIsTUFBTSxFQUFFLGlCQUFpQixHQUFHLGFBQWE7b0JBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7b0JBQ3RCLE1BQU0sRUFBRSxDQUFDO29CQUNULFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVk7aUJBQ3BDLENBQUMsQ0FBQTtnQkFDRixvREFBb0Q7WUFDckQsQ0FBQztZQUVELElBQ0MsaUJBQWlCLElBQUksYUFBYTtnQkFDbEMsYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLCtCQUErQixFQUNsRSxDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxhQUFhLElBQUksK0JBQStCLEVBQUUsQ0FBQztnQkFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO2dCQUM3QixDQUFDO2dCQUNELGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMvQixTQUFRO1lBQ1QsQ0FBQztpQkFBTSxJQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNqQixhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsK0JBQStCLEVBQ2pFLENBQUM7Z0JBQ0YscUNBQXFDO2dCQUNyQyxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNwQixNQUFNLEVBQUUsYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLCtCQUErQjtvQkFDMUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSztvQkFDdEIsTUFBTSxFQUFFLENBQUM7b0JBQ1QsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWTtpQkFDcEMsQ0FBQyxDQUFBO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsNEVBQTRFO2dCQUM1RSxJQUFJLFdBQVcsR0FBRyxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUE7Z0JBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3pELFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7b0JBQzNDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksUUFBZ0IsQ0FBQTtRQUNwQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsUUFBUSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQzVDLGVBQWUsQ0FDZixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBQ0QsSUFBSSxPQUFPLEdBQVMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUMvQyxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ssc0JBQXNCLENBQzdCLG9CQUE0QixFQUM1QixrQkFBMEIsRUFDMUIsT0FBZ0Q7UUFFaEQsTUFBTSxLQUFLLEdBQXFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVqRixPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUE7WUFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7WUFFcEMsMkRBQTJEO1lBQzNELElBQUksT0FBTyxJQUFJLG9CQUFvQixJQUFJLE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUNyRSxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMzQixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsNEVBQTRFO2dCQUM1RSxJQUFJLFdBQVcsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtnQkFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNwRCxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7b0JBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtnQkFDNUQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxNQUFjO1FBQ3hCLElBQUksTUFBK0IsQ0FBQTtRQUNuQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3ZFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUNqRixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsb0JBQTRCLEVBQUUsa0JBQTBCO1FBQ3hFLE1BQU0sTUFBTSxHQUFzRSxFQUFFLENBQUE7UUFDcEYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RGLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7Z0JBQy9CLElBQUksYUFBYSxHQUFHLE1BQU0sQ0FBQTtnQkFDMUIsSUFBSSxNQUFNLEdBQUcsb0JBQW9CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztvQkFDaEYsYUFBYSxHQUFHLG9CQUFvQixDQUFBO29CQUNwQyxhQUFhLEdBQUcsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUE7Z0JBQzFELENBQUM7cUJBQU0sSUFBSSxNQUFNLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQztvQkFDMUMsYUFBYSxJQUFJLG9CQUFvQixHQUFHLE1BQU0sQ0FBQTtvQkFDOUMsYUFBYSxHQUFHLG9CQUFvQixDQUFBO2dCQUNyQyxDQUFDO3FCQUFNLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztvQkFDdEQsYUFBYSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLGtCQUFrQixDQUFBO2dCQUMzRCxDQUFDO2dCQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNqQixvQkFBb0IsRUFBRSxhQUFhO29CQUNuQyxNQUFNLEVBQUUsYUFBYTtpQkFDckIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxjQUFjLENBQUMsb0JBQTRCLEVBQUUsa0JBQTBCO1FBQ3RFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzlFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtZQUN0QyxDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxjQUFjLENBQ2Isb0JBQTRCLEVBQzVCLGtCQUEwQixFQUMxQixtQkFBaUM7UUFFakMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzlFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztnQkFDN0QsTUFBTSxHQUFHLEtBQUssQ0FBQTtZQUNmLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsb0JBQTRCLEVBQUUsa0JBQTBCO1FBQ3pFLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUM5RSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDakUsWUFBWSxHQUFHLElBQUksQ0FBQTtZQUNwQixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxlQUFlO1FBQ2QsTUFBTSxNQUFNLEdBQWlELEVBQUUsQ0FBQTtRQUUvRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDakYsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUN6RSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQTtnQkFDbkQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7Z0JBQ3RFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLFFBQVE7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEQsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxJQUFVO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDM0IsQ0FBQyxDQUFDO2dCQUNBLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7Z0JBQy9CLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTthQUNuQjtZQUNGLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUIsTUFBTSxLQUFLLEdBQXdCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVwRCxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUE7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDdEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQzt3QkFDOUIsQ0FBQyxDQUFDOzRCQUNBLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTs0QkFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLOzRCQUNsQixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7NEJBQ2hDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTt5QkFDcEI7d0JBQ0YsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FFNUI7b0JBQUMsVUFBdUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ2hELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLENBQUMsT0FBYSxJQUFJLENBQUMsS0FBSztRQUNoQyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsTUFBTSxLQUFLLEdBQTBCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVoRCxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUE7WUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVqQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUNWLEdBQUcsTUFBTSxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sWUFBWSxJQUFJLENBQUMsS0FBSyxjQUFjLElBQUksQ0FBQyxZQUFZLEtBQUssQ0FDOUYsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUE7Z0JBQ3RELHFFQUFxRTtnQkFDckUsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNwRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxLQUFLLEdBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDM0QsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRyxDQUFBO1lBQ3BDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLHlDQUF5QztZQUMxQyxDQUFDO2lCQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDckIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUN4QixLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3BELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNkLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFVLENBQUE7SUFDeEIsQ0FBQztDQUNEIn0=