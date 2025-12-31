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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uY2F0MjNUcmVlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2NvbmNhdDIzVHJlZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF3QixXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFFNUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQWdCO0lBQzdDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEIsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNUOztPQUVHO0lBQ0gsU0FBUyxRQUFRO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDZixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBRXRDLENBQUMsRUFBRSxDQUFBO1FBQ0gsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzNELENBQUMsRUFBRSxDQUFBO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNw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