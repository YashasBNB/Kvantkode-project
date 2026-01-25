/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ListAstNode } from './ast.js';
/**
 * Concatenates a list of (2,3) AstNode's into a single (2,3) AstNode.
 * This mutates the items of the input array!
 * If all items have the same height, this method has runtime O(items.length).
 * Otherwise, it has runtime O(items.length * max(log(items.length), items.max(i => i.height))).
 */
export function concat23Trees(items) {
    if (items.length === 0) {
        return null;
    }
    if (items.length === 1) {
        return items[0];
    }
    let i = 0;
    /**
     * Reads nodes of same height and concatenates them to a single node.
     */
    function readNode() {
        if (i >= items.length) {
            return null;
        }
        const start = i;
        const height = items[start].listHeight;
        i++;
        while (i < items.length && items[i].listHeight === height) {
            i++;
        }
        if (i - start >= 2) {
            return concat23TreesOfSameHeight(start === 0 && i === items.length ? items : items.slice(start, i), false);
        }
        else {
            return items[start];
        }
    }
    // The items might not have the same height.
    // We merge all items by using a binary concat operator.
    let first = readNode(); // There must be a first item
    let second = readNode();
    if (!second) {
        return first;
    }
    for (let item = readNode(); item; item = readNode()) {
        // Prefer concatenating smaller trees, as the runtime of concat depends on the tree height.
        if (heightDiff(first, second) <= heightDiff(second, item)) {
            first = concat(first, second);
            second = item;
        }
        else {
            second = concat(second, item);
        }
    }
    const result = concat(first, second);
    return result;
}
export function concat23TreesOfSameHeight(items, createImmutableLists = false) {
    if (items.length === 0) {
        return null;
    }
    if (items.length === 1) {
        return items[0];
    }
    let length = items.length;
    // All trees have same height, just create parent nodes.
    while (length > 3) {
        const newLength = length >> 1;
        for (let i = 0; i < newLength; i++) {
            const j = i << 1;
            items[i] = ListAstNode.create23(items[j], items[j + 1], j + 3 === length ? items[j + 2] : null, createImmutableLists);
        }
        length = newLength;
    }
    return ListAstNode.create23(items[0], items[1], length >= 3 ? items[2] : null, createImmutableLists);
}
function heightDiff(node1, node2) {
    return Math.abs(node1.listHeight - node2.listHeight);
}
function concat(node1, node2) {
    if (node1.listHeight === node2.listHeight) {
        return ListAstNode.create23(node1, node2, null, false);
    }
    else if (node1.listHeight > node2.listHeight) {
        // node1 is the tree we want to insert into
        return append(node1, node2);
    }
    else {
        return prepend(node2, node1);
    }
}
/**
 * Appends the given node to the end of this (2,3) tree.
 * Returns the new root.
 */
function append(list, nodeToAppend) {
    list = list.toMutable();
    let curNode = list;
    const parents = [];
    let nodeToAppendOfCorrectHeight;
    while (true) {
        // assert nodeToInsert.listHeight <= curNode.listHeight
        if (nodeToAppend.listHeight === curNode.listHeight) {
            nodeToAppendOfCorrectHeight = nodeToAppend;
            break;
        }
        // assert 0 <= nodeToInsert.listHeight < curNode.listHeight
        if (curNode.kind !== 4 /* AstNodeKind.List */) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenLength <= 3
        curNode = curNode.makeLastElementMutable();
    }
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToAppendOfCorrectHeight) {
            // Can we take the element?
            if (parent.childrenLength >= 3) {
                // assert parent.childrenLength === 3 && parent.listHeight === nodeToAppendOfCorrectHeight.listHeight + 1
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToAppendOfCorrectHeight = ListAstNode.create23(parent.unappendChild(), nodeToAppendOfCorrectHeight, null, false);
            }
            else {
                parent.appendChildOfSameHeight(nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = undefined;
            }
        }
        else {
            parent.handleChildrenChanged();
        }
    }
    if (nodeToAppendOfCorrectHeight) {
        return ListAstNode.create23(list, nodeToAppendOfCorrectHeight, null, false);
    }
    else {
        return list;
    }
}
/**
 * Prepends the given node to the end of this (2,3) tree.
 * Returns the new root.
 */
function prepend(list, nodeToAppend) {
    list = list.toMutable();
    let curNode = list;
    const parents = [];
    // assert nodeToInsert.listHeight <= curNode.listHeight
    while (nodeToAppend.listHeight !== curNode.listHeight) {
        // assert 0 <= nodeToInsert.listHeight < curNode.listHeight
        if (curNode.kind !== 4 /* AstNodeKind.List */) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenFast.length <= 3
        curNode = curNode.makeFirstElementMutable();
    }
    let nodeToPrependOfCorrectHeight = nodeToAppend;
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToPrependOfCorrectHeight) {
            // Can we take the element?
            if (parent.childrenLength >= 3) {
                // assert parent.childrenLength === 3 && parent.listHeight === nodeToAppendOfCorrectHeight.listHeight + 1
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToPrependOfCorrectHeight = ListAstNode.create23(nodeToPrependOfCorrectHeight, parent.unprependChild(), null, false);
            }
            else {
                parent.prependChildOfSameHeight(nodeToPrependOfCorrectHeight);
                nodeToPrependOfCorrectHeight = undefined;
            }
        }
        else {
            parent.handleChildrenChanged();
        }
    }
    if (nodeToPrependOfCorrectHeight) {
        return ListAstNode.create23(nodeToPrependOfCorrectHeight, list, null, false);
    }
    else {
        return list;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uY2F0MjNUcmVlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvY29uY2F0MjNUcmVlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXdCLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUU1RDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQUMsS0FBZ0I7SUFDN0MsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoQixDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCxTQUFTLFFBQVE7UUFDaEIsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNmLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUE7UUFFdEMsQ0FBQyxFQUFFLENBQUE7UUFDSCxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDM0QsQ0FBQyxFQUFFLENBQUE7UUFDSixDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFD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