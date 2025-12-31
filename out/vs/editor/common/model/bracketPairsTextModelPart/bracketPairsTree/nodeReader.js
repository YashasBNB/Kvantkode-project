/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { lengthAdd, lengthZero, lengthLessThan } from './length.js';
/**
 * Allows to efficiently find a longest child at a given offset in a fixed node.
 * The requested offsets must increase monotonously.
 */
export class NodeReader {
    constructor(node) {
        this.lastOffset = lengthZero;
        this.nextNodes = [node];
        this.offsets = [lengthZero];
        this.idxs = [];
    }
    /**
     * Returns the longest node at `offset` that satisfies the predicate.
     * @param offset must be greater than or equal to the last offset this method has been called with!
     */
    readLongestNodeAt(offset, predicate) {
        if (lengthLessThan(offset, this.lastOffset)) {
            throw new Error('Invalid offset');
        }
        this.lastOffset = offset;
        // Find the longest node of all those that are closest to the current offset.
        while (true) {
            const curNode = lastOrUndefined(this.nextNodes);
            if (!curNode) {
                return undefined;
            }
            const curNodeOffset = lastOrUndefined(this.offsets);
            if (lengthLessThan(offset, curNodeOffset)) {
                // The next best node is not here yet.
                // The reader must advance before a cached node is hit.
                return undefined;
            }
            if (lengthLessThan(curNodeOffset, offset)) {
                // The reader is ahead of the current node.
                if (lengthAdd(curNodeOffset, curNode.length) <= offset) {
                    // The reader is after the end of the current node.
                    this.nextNodeAfterCurrent();
                }
                else {
                    // The reader is somewhere in the current node.
                    const nextChildIdx = getNextChildIdx(curNode);
                    if (nextChildIdx !== -1) {
                        // Go to the first child and repeat.
                        this.nextNodes.push(curNode.getChild(nextChildIdx));
                        this.offsets.push(curNodeOffset);
                        this.idxs.push(nextChildIdx);
                    }
                    else {
                        // We don't have children
                        this.nextNodeAfterCurrent();
                    }
                }
            }
            else {
                // readerOffsetBeforeChange === curNodeOffset
                if (predicate(curNode)) {
                    this.nextNodeAfterCurrent();
                    return curNode;
                }
                else {
                    const nextChildIdx = getNextChildIdx(curNode);
                    // look for shorter node
                    if (nextChildIdx === -1) {
                        // There is no shorter node.
                        this.nextNodeAfterCurrent();
                        return undefined;
                    }
                    else {
                        // Descend into first child & repeat.
                        this.nextNodes.push(curNode.getChild(nextChildIdx));
                        this.offsets.push(curNodeOffset);
                        this.idxs.push(nextChildIdx);
                    }
                }
            }
        }
    }
    // Navigates to the longest node that continues after the current node.
    nextNodeAfterCurrent() {
        while (true) {
            const currentOffset = lastOrUndefined(this.offsets);
            const currentNode = lastOrUndefined(this.nextNodes);
            this.nextNodes.pop();
            this.offsets.pop();
            if (this.idxs.length === 0) {
                // We just popped the root node, there is no next node.
                break;
            }
            // Parent is not undefined, because idxs is not empty
            const parent = lastOrUndefined(this.nextNodes);
            const nextChildIdx = getNextChildIdx(parent, this.idxs[this.idxs.length - 1]);
            if (nextChildIdx !== -1) {
                this.nextNodes.push(parent.getChild(nextChildIdx));
                this.offsets.push(lengthAdd(currentOffset, currentNode.length));
                this.idxs[this.idxs.length - 1] = nextChildIdx;
                break;
            }
            else {
                this.idxs.pop();
            }
            // We fully consumed the parent.
            // Current node is now parent, so call nextNodeAfterCurrent again
        }
    }
}
function getNextChildIdx(node, curIdx = -1) {
    while (true) {
        curIdx++;
        if (curIdx >= node.childrenLength) {
            return -1;
        }
        if (node.getChild(curIdx)) {
            return curIdx;
        }
    }
}
function lastOrUndefined(arr) {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVJlYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL25vZGVSZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQVUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRTNFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxVQUFVO0lBTXRCLFlBQVksSUFBYTtRQUZqQixlQUFVLEdBQVcsVUFBVSxDQUFBO1FBR3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsaUJBQWlCLENBQUMsTUFBYyxFQUFFLFNBQXFDO1FBQ3RFLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFBO1FBRXhCLDZFQUE2RTtRQUM3RSxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUUvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxD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