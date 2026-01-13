/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//
// The red-black tree is based on the "Introduction to Algorithms" by Cormen, Leiserson and Rivest.
//
export var ClassName;
(function (ClassName) {
    ClassName["EditorHintDecoration"] = "squiggly-hint";
    ClassName["EditorInfoDecoration"] = "squiggly-info";
    ClassName["EditorWarningDecoration"] = "squiggly-warning";
    ClassName["EditorErrorDecoration"] = "squiggly-error";
    ClassName["EditorUnnecessaryDecoration"] = "squiggly-unnecessary";
    ClassName["EditorUnnecessaryInlineDecoration"] = "squiggly-inline-unnecessary";
    ClassName["EditorDeprecatedInlineDecoration"] = "squiggly-inline-deprecated";
})(ClassName || (ClassName = {}));
export var NodeColor;
(function (NodeColor) {
    NodeColor[NodeColor["Black"] = 0] = "Black";
    NodeColor[NodeColor["Red"] = 1] = "Red";
})(NodeColor || (NodeColor = {}));
var Constants;
(function (Constants) {
    Constants[Constants["ColorMask"] = 1] = "ColorMask";
    Constants[Constants["ColorMaskInverse"] = 254] = "ColorMaskInverse";
    Constants[Constants["ColorOffset"] = 0] = "ColorOffset";
    Constants[Constants["IsVisitedMask"] = 2] = "IsVisitedMask";
    Constants[Constants["IsVisitedMaskInverse"] = 253] = "IsVisitedMaskInverse";
    Constants[Constants["IsVisitedOffset"] = 1] = "IsVisitedOffset";
    Constants[Constants["IsForValidationMask"] = 4] = "IsForValidationMask";
    Constants[Constants["IsForValidationMaskInverse"] = 251] = "IsForValidationMaskInverse";
    Constants[Constants["IsForValidationOffset"] = 2] = "IsForValidationOffset";
    Constants[Constants["StickinessMask"] = 24] = "StickinessMask";
    Constants[Constants["StickinessMaskInverse"] = 231] = "StickinessMaskInverse";
    Constants[Constants["StickinessOffset"] = 3] = "StickinessOffset";
    Constants[Constants["CollapseOnReplaceEditMask"] = 32] = "CollapseOnReplaceEditMask";
    Constants[Constants["CollapseOnReplaceEditMaskInverse"] = 223] = "CollapseOnReplaceEditMaskInverse";
    Constants[Constants["CollapseOnReplaceEditOffset"] = 5] = "CollapseOnReplaceEditOffset";
    Constants[Constants["IsMarginMask"] = 64] = "IsMarginMask";
    Constants[Constants["IsMarginMaskInverse"] = 191] = "IsMarginMaskInverse";
    Constants[Constants["IsMarginOffset"] = 6] = "IsMarginOffset";
    /**
     * Due to how deletion works (in order to avoid always walking the right subtree of the deleted node),
     * the deltas for nodes can grow and shrink dramatically. It has been observed, in practice, that unless
     * the deltas are corrected, integer overflow will occur.
     *
     * The integer overflow occurs when 53 bits are used in the numbers, but we will try to avoid it as
     * a node's delta gets below a negative 30 bits number.
     *
     * MIN SMI (SMall Integer) as defined in v8.
     * one bit is lost for boxing/unboxing flag.
     * one bit is lost for sign flag.
     * See https://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
     */
    Constants[Constants["MIN_SAFE_DELTA"] = -1073741824] = "MIN_SAFE_DELTA";
    /**
     * MAX SMI (SMall Integer) as defined in v8.
     * one bit is lost for boxing/unboxing flag.
     * one bit is lost for sign flag.
     * See https://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
     */
    Constants[Constants["MAX_SAFE_DELTA"] = 1073741824] = "MAX_SAFE_DELTA";
})(Constants || (Constants = {}));
export function getNodeColor(node) {
    return (node.metadata & 1 /* Constants.ColorMask */) >>> 0 /* Constants.ColorOffset */;
}
function setNodeColor(node, color) {
    node.metadata = (node.metadata & 254 /* Constants.ColorMaskInverse */) | (color << 0 /* Constants.ColorOffset */);
}
function getNodeIsVisited(node) {
    return (node.metadata & 2 /* Constants.IsVisitedMask */) >>> 1 /* Constants.IsVisitedOffset */ === 1;
}
function setNodeIsVisited(node, value) {
    node.metadata =
        (node.metadata & 253 /* Constants.IsVisitedMaskInverse */) |
            ((value ? 1 : 0) << 1 /* Constants.IsVisitedOffset */);
}
function getNodeIsForValidation(node) {
    return (node.metadata & 4 /* Constants.IsForValidationMask */) >>> 2 /* Constants.IsForValidationOffset */ === 1;
}
function setNodeIsForValidation(node, value) {
    node.metadata =
        (node.metadata & 251 /* Constants.IsForValidationMaskInverse */) |
            ((value ? 1 : 0) << 2 /* Constants.IsForValidationOffset */);
}
function getNodeIsInGlyphMargin(node) {
    return (node.metadata & 64 /* Constants.IsMarginMask */) >>> 6 /* Constants.IsMarginOffset */ === 1;
}
function setNodeIsInGlyphMargin(node, value) {
    node.metadata =
        (node.metadata & 191 /* Constants.IsMarginMaskInverse */) | ((value ? 1 : 0) << 6 /* Constants.IsMarginOffset */);
}
function getNodeStickiness(node) {
    return (node.metadata & 24 /* Constants.StickinessMask */) >>> 3 /* Constants.StickinessOffset */;
}
function _setNodeStickiness(node, stickiness) {
    node.metadata =
        (node.metadata & 231 /* Constants.StickinessMaskInverse */) | (stickiness << 3 /* Constants.StickinessOffset */);
}
function getCollapseOnReplaceEdit(node) {
    return ((node.metadata & 32 /* Constants.CollapseOnReplaceEditMask */) >>>
        5 /* Constants.CollapseOnReplaceEditOffset */ ===
        1);
}
function setCollapseOnReplaceEdit(node, value) {
    node.metadata =
        (node.metadata & 223 /* Constants.CollapseOnReplaceEditMaskInverse */) |
            ((value ? 1 : 0) << 5 /* Constants.CollapseOnReplaceEditOffset */);
}
export function setNodeStickiness(node, stickiness) {
    _setNodeStickiness(node, stickiness);
}
export class IntervalNode {
    constructor(id, start, end) {
        this.metadata = 0;
        this.parent = this;
        this.left = this;
        this.right = this;
        setNodeColor(this, 1 /* NodeColor.Red */);
        this.start = start;
        this.end = end;
        // FORCE_OVERFLOWING_TEST: this.delta = start;
        this.delta = 0;
        this.maxEnd = end;
        this.id = id;
        this.ownerId = 0;
        this.options = null;
        setNodeIsForValidation(this, false);
        setNodeIsInGlyphMargin(this, false);
        _setNodeStickiness(this, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        setCollapseOnReplaceEdit(this, false);
        this.cachedVersionId = 0;
        this.cachedAbsoluteStart = start;
        this.cachedAbsoluteEnd = end;
        this.range = null;
        setNodeIsVisited(this, false);
    }
    reset(versionId, start, end, range) {
        this.start = start;
        this.end = end;
        this.maxEnd = end;
        this.cachedVersionId = versionId;
        this.cachedAbsoluteStart = start;
        this.cachedAbsoluteEnd = end;
        this.range = range;
    }
    setOptions(options) {
        this.options = options;
        const className = this.options.className;
        setNodeIsForValidation(this, className === "squiggly-error" /* ClassName.EditorErrorDecoration */ ||
            className === "squiggly-warning" /* ClassName.EditorWarningDecoration */ ||
            className === "squiggly-info" /* ClassName.EditorInfoDecoration */);
        setNodeIsInGlyphMargin(this, this.options.glyphMarginClassName !== null);
        _setNodeStickiness(this, this.options.stickiness);
        setCollapseOnReplaceEdit(this, this.options.collapseOnReplaceEdit);
    }
    setCachedOffsets(absoluteStart, absoluteEnd, cachedVersionId) {
        if (this.cachedVersionId !== cachedVersionId) {
            this.range = null;
        }
        this.cachedVersionId = cachedVersionId;
        this.cachedAbsoluteStart = absoluteStart;
        this.cachedAbsoluteEnd = absoluteEnd;
    }
    detach() {
        this.parent = null;
        this.left = null;
        this.right = null;
    }
}
export const SENTINEL = new IntervalNode(null, 0, 0);
SENTINEL.parent = SENTINEL;
SENTINEL.left = SENTINEL;
SENTINEL.right = SENTINEL;
setNodeColor(SENTINEL, 0 /* NodeColor.Black */);
export class IntervalTree {
    constructor() {
        this.root = SENTINEL;
        this.requestNormalizeDelta = false;
    }
    intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations) {
        if (this.root === SENTINEL) {
            return [];
        }
        return intervalSearch(this, start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
    }
    search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations) {
        if (this.root === SENTINEL) {
            return [];
        }
        return search(this, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
    }
    /**
     * Will not set `cachedAbsoluteStart` nor `cachedAbsoluteEnd` on the returned nodes!
     */
    collectNodesFromOwner(ownerId) {
        return collectNodesFromOwner(this, ownerId);
    }
    /**
     * Will not set `cachedAbsoluteStart` nor `cachedAbsoluteEnd` on the returned nodes!
     */
    collectNodesPostOrder() {
        return collectNodesPostOrder(this);
    }
    insert(node) {
        rbTreeInsert(this, node);
        this._normalizeDeltaIfNecessary();
    }
    delete(node) {
        rbTreeDelete(this, node);
        this._normalizeDeltaIfNecessary();
    }
    resolveNode(node, cachedVersionId) {
        const initialNode = node;
        let delta = 0;
        while (node !== this.root) {
            if (node === node.parent.right) {
                delta += node.parent.delta;
            }
            node = node.parent;
        }
        const nodeStart = initialNode.start + delta;
        const nodeEnd = initialNode.end + delta;
        initialNode.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);
    }
    acceptReplace(offset, length, textLength, forceMoveMarkers) {
        // Our strategy is to remove all directly impacted nodes, and then add them back to the tree.
        // (1) collect all nodes that are intersecting this edit as nodes of interest
        const nodesOfInterest = searchForEditing(this, offset, offset + length);
        // (2) remove all nodes that are intersecting this edit
        for (let i = 0, len = nodesOfInterest.length; i < len; i++) {
            const node = nodesOfInterest[i];
            rbTreeDelete(this, node);
        }
        this._normalizeDeltaIfNecessary();
        // (3) edit all tree nodes except the nodes of interest
        noOverlapReplace(this, offset, offset + length, textLength);
        this._normalizeDeltaIfNecessary();
        // (4) edit the nodes of interest and insert them back in the tree
        for (let i = 0, len = nodesOfInterest.length; i < len; i++) {
            const node = nodesOfInterest[i];
            node.start = node.cachedAbsoluteStart;
            node.end = node.cachedAbsoluteEnd;
            nodeAcceptEdit(node, offset, offset + length, textLength, forceMoveMarkers);
            node.maxEnd = node.end;
            rbTreeInsert(this, node);
        }
        this._normalizeDeltaIfNecessary();
    }
    getAllInOrder() {
        return search(this, 0, false, 0, false);
    }
    _normalizeDeltaIfNecessary() {
        if (!this.requestNormalizeDelta) {
            return;
        }
        this.requestNormalizeDelta = false;
        normalizeDelta(this);
    }
}
//#region Delta Normalization
function normalizeDelta(T) {
    let node = T.root;
    let delta = 0;
    while (node !== SENTINEL) {
        if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
            // go left
            node = node.left;
            continue;
        }
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            delta += node.delta;
            node = node.right;
            continue;
        }
        // handle current node
        node.start = delta + node.start;
        node.end = delta + node.end;
        node.delta = 0;
        recomputeMaxEnd(node);
        setNodeIsVisited(node, true);
        // going up from this node
        setNodeIsVisited(node.left, false);
        setNodeIsVisited(node.right, false);
        if (node === node.parent.right) {
            delta -= node.parent.delta;
        }
        node = node.parent;
    }
    setNodeIsVisited(T.root, false);
}
//#endregion
//#region Editing
var MarkerMoveSemantics;
(function (MarkerMoveSemantics) {
    MarkerMoveSemantics[MarkerMoveSemantics["MarkerDefined"] = 0] = "MarkerDefined";
    MarkerMoveSemantics[MarkerMoveSemantics["ForceMove"] = 1] = "ForceMove";
    MarkerMoveSemantics[MarkerMoveSemantics["ForceStay"] = 2] = "ForceStay";
})(MarkerMoveSemantics || (MarkerMoveSemantics = {}));
function adjustMarkerBeforeColumn(markerOffset, markerStickToPreviousCharacter, checkOffset, moveSemantics) {
    if (markerOffset < checkOffset) {
        return true;
    }
    if (markerOffset > checkOffset) {
        return false;
    }
    if (moveSemantics === 1 /* MarkerMoveSemantics.ForceMove */) {
        return false;
    }
    if (moveSemantics === 2 /* MarkerMoveSemantics.ForceStay */) {
        return true;
    }
    return markerStickToPreviousCharacter;
}
/**
 * This is a lot more complicated than strictly necessary to maintain the same behaviour
 * as when decorations were implemented using two markers.
 */
export function nodeAcceptEdit(node, start, end, textLength, forceMoveMarkers) {
    const nodeStickiness = getNodeStickiness(node);
    const startStickToPreviousCharacter = nodeStickiness === 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */ ||
        nodeStickiness === 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
    const endStickToPreviousCharacter = nodeStickiness === 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */ ||
        nodeStickiness === 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
    const deletingCnt = end - start;
    const insertingCnt = textLength;
    const commonLength = Math.min(deletingCnt, insertingCnt);
    const nodeStart = node.start;
    let startDone = false;
    const nodeEnd = node.end;
    let endDone = false;
    if (start <= nodeStart && nodeEnd <= end && getCollapseOnReplaceEdit(node)) {
        // This edit encompasses the entire decoration range
        // and the decoration has asked to become collapsed
        node.start = start;
        startDone = true;
        node.end = start;
        endDone = true;
    }
    {
        const moveSemantics = forceMoveMarkers
            ? 1 /* MarkerMoveSemantics.ForceMove */
            : deletingCnt > 0
                ? 2 /* MarkerMoveSemantics.ForceStay */
                : 0 /* MarkerMoveSemantics.MarkerDefined */;
        if (!startDone &&
            adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, start, moveSemantics)) {
            startDone = true;
        }
        if (!endDone &&
            adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, start, moveSemantics)) {
            endDone = true;
        }
    }
    if (commonLength > 0 && !forceMoveMarkers) {
        const moveSemantics = deletingCnt > insertingCnt ? 2 /* MarkerMoveSemantics.ForceStay */ : 0 /* MarkerMoveSemantics.MarkerDefined */;
        if (!startDone &&
            adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, start + commonLength, moveSemantics)) {
            startDone = true;
        }
        if (!endDone &&
            adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, start + commonLength, moveSemantics)) {
            endDone = true;
        }
    }
    {
        const moveSemantics = forceMoveMarkers
            ? 1 /* MarkerMoveSemantics.ForceMove */
            : 0 /* MarkerMoveSemantics.MarkerDefined */;
        if (!startDone &&
            adjustMarkerBeforeColumn(nodeStart, startStickToPreviousCharacter, end, moveSemantics)) {
            node.start = start + insertingCnt;
            startDone = true;
        }
        if (!endDone &&
            adjustMarkerBeforeColumn(nodeEnd, endStickToPreviousCharacter, end, moveSemantics)) {
            node.end = start + insertingCnt;
            endDone = true;
        }
    }
    // Finish
    const deltaColumn = insertingCnt - deletingCnt;
    if (!startDone) {
        node.start = Math.max(0, nodeStart + deltaColumn);
    }
    if (!endDone) {
        node.end = Math.max(0, nodeEnd + deltaColumn);
    }
    if (node.start > node.end) {
        node.end = node.start;
    }
}
function searchForEditing(T, start, end) {
    // https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
    // Now, it is known that two intervals A and B overlap only when both
    // A.low <= B.high and A.high >= B.low. When searching the trees for
    // nodes overlapping with a given interval, you can immediately skip:
    //  a) all nodes to the right of nodes whose low value is past the end of the given interval.
    //  b) all nodes that have their maximum 'high' value below the start of the given interval.
    let node = T.root;
    let delta = 0;
    let nodeMaxEnd = 0;
    let nodeStart = 0;
    let nodeEnd = 0;
    const result = [];
    let resultLen = 0;
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            if (node === node.parent.right) {
                delta -= node.parent.delta;
            }
            node = node.parent;
            continue;
        }
        if (!getNodeIsVisited(node.left)) {
            // first time seeing this node
            nodeMaxEnd = delta + node.maxEnd;
            if (nodeMaxEnd < start) {
                // cover case b) from above
                // there is no need to search this node or its children
                setNodeIsVisited(node, true);
                continue;
            }
            if (node.left !== SENTINEL) {
                // go left
                node = node.left;
                continue;
            }
        }
        // handle current node
        nodeStart = delta + node.start;
        if (nodeStart > end) {
            // cover case a) from above
            // there is no need to search this node or its right subtree
            setNodeIsVisited(node, true);
            continue;
        }
        nodeEnd = delta + node.end;
        if (nodeEnd >= start) {
            node.setCachedOffsets(nodeStart, nodeEnd, 0);
            result[resultLen++] = node;
        }
        setNodeIsVisited(node, true);
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            delta += node.delta;
            node = node.right;
            continue;
        }
    }
    setNodeIsVisited(T.root, false);
    return result;
}
function noOverlapReplace(T, start, end, textLength) {
    // https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
    // Now, it is known that two intervals A and B overlap only when both
    // A.low <= B.high and A.high >= B.low. When searching the trees for
    // nodes overlapping with a given interval, you can immediately skip:
    //  a) all nodes to the right of nodes whose low value is past the end of the given interval.
    //  b) all nodes that have their maximum 'high' value below the start of the given interval.
    let node = T.root;
    let delta = 0;
    let nodeMaxEnd = 0;
    let nodeStart = 0;
    const editDelta = textLength - (end - start);
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            if (node === node.parent.right) {
                delta -= node.parent.delta;
            }
            recomputeMaxEnd(node);
            node = node.parent;
            continue;
        }
        if (!getNodeIsVisited(node.left)) {
            // first time seeing this node
            nodeMaxEnd = delta + node.maxEnd;
            if (nodeMaxEnd < start) {
                // cover case b) from above
                // there is no need to search this node or its children
                setNodeIsVisited(node, true);
                continue;
            }
            if (node.left !== SENTINEL) {
                // go left
                node = node.left;
                continue;
            }
        }
        // handle current node
        nodeStart = delta + node.start;
        if (nodeStart > end) {
            node.start += editDelta;
            node.end += editDelta;
            node.delta += editDelta;
            if (node.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || node.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
                T.requestNormalizeDelta = true;
            }
            // cover case a) from above
            // there is no need to search this node or its right subtree
            setNodeIsVisited(node, true);
            continue;
        }
        setNodeIsVisited(node, true);
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            delta += node.delta;
            node = node.right;
            continue;
        }
    }
    setNodeIsVisited(T.root, false);
}
//#endregion
//#region Searching
function collectNodesFromOwner(T, ownerId) {
    let node = T.root;
    const result = [];
    let resultLen = 0;
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            node = node.parent;
            continue;
        }
        if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
            // go left
            node = node.left;
            continue;
        }
        // handle current node
        if (node.ownerId === ownerId) {
            result[resultLen++] = node;
        }
        setNodeIsVisited(node, true);
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            node = node.right;
            continue;
        }
    }
    setNodeIsVisited(T.root, false);
    return result;
}
function collectNodesPostOrder(T) {
    let node = T.root;
    const result = [];
    let resultLen = 0;
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            node = node.parent;
            continue;
        }
        if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
            // go left
            node = node.left;
            continue;
        }
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            node = node.right;
            continue;
        }
        // handle current node
        result[resultLen++] = node;
        setNodeIsVisited(node, true);
    }
    setNodeIsVisited(T.root, false);
    return result;
}
function search(T, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations) {
    let node = T.root;
    let delta = 0;
    let nodeStart = 0;
    let nodeEnd = 0;
    const result = [];
    let resultLen = 0;
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            if (node === node.parent.right) {
                delta -= node.parent.delta;
            }
            node = node.parent;
            continue;
        }
        if (node.left !== SENTINEL && !getNodeIsVisited(node.left)) {
            // go left
            node = node.left;
            continue;
        }
        // handle current node
        nodeStart = delta + node.start;
        nodeEnd = delta + node.end;
        node.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);
        let include = true;
        if (filterOwnerId && node.ownerId && node.ownerId !== filterOwnerId) {
            include = false;
        }
        if (filterOutValidation && getNodeIsForValidation(node)) {
            include = false;
        }
        if (onlyMarginDecorations && !getNodeIsInGlyphMargin(node)) {
            include = false;
        }
        if (include) {
            result[resultLen++] = node;
        }
        setNodeIsVisited(node, true);
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            delta += node.delta;
            node = node.right;
            continue;
        }
    }
    setNodeIsVisited(T.root, false);
    return result;
}
function intervalSearch(T, intervalStart, intervalEnd, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations) {
    // https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
    // Now, it is known that two intervals A and B overlap only when both
    // A.low <= B.high and A.high >= B.low. When searching the trees for
    // nodes overlapping with a given interval, you can immediately skip:
    //  a) all nodes to the right of nodes whose low value is past the end of the given interval.
    //  b) all nodes that have their maximum 'high' value below the start of the given interval.
    let node = T.root;
    let delta = 0;
    let nodeMaxEnd = 0;
    let nodeStart = 0;
    let nodeEnd = 0;
    const result = [];
    let resultLen = 0;
    while (node !== SENTINEL) {
        if (getNodeIsVisited(node)) {
            // going up from this node
            setNodeIsVisited(node.left, false);
            setNodeIsVisited(node.right, false);
            if (node === node.parent.right) {
                delta -= node.parent.delta;
            }
            node = node.parent;
            continue;
        }
        if (!getNodeIsVisited(node.left)) {
            // first time seeing this node
            nodeMaxEnd = delta + node.maxEnd;
            if (nodeMaxEnd < intervalStart) {
                // cover case b) from above
                // there is no need to search this node or its children
                setNodeIsVisited(node, true);
                continue;
            }
            if (node.left !== SENTINEL) {
                // go left
                node = node.left;
                continue;
            }
        }
        // handle current node
        nodeStart = delta + node.start;
        if (nodeStart > intervalEnd) {
            // cover case a) from above
            // there is no need to search this node or its right subtree
            setNodeIsVisited(node, true);
            continue;
        }
        nodeEnd = delta + node.end;
        if (nodeEnd >= intervalStart) {
            // There is overlap
            node.setCachedOffsets(nodeStart, nodeEnd, cachedVersionId);
            let include = true;
            if (filterOwnerId && node.ownerId && node.ownerId !== filterOwnerId) {
                include = false;
            }
            if (filterOutValidation && getNodeIsForValidation(node)) {
                include = false;
            }
            if (onlyMarginDecorations && !getNodeIsInGlyphMargin(node)) {
                include = false;
            }
            if (include) {
                result[resultLen++] = node;
            }
        }
        setNodeIsVisited(node, true);
        if (node.right !== SENTINEL && !getNodeIsVisited(node.right)) {
            // go right
            delta += node.delta;
            node = node.right;
            continue;
        }
    }
    setNodeIsVisited(T.root, false);
    return result;
}
//#endregion
//#region Insertion
function rbTreeInsert(T, newNode) {
    if (T.root === SENTINEL) {
        newNode.parent = SENTINEL;
        newNode.left = SENTINEL;
        newNode.right = SENTINEL;
        setNodeColor(newNode, 0 /* NodeColor.Black */);
        T.root = newNode;
        return T.root;
    }
    treeInsert(T, newNode);
    recomputeMaxEndWalkToRoot(newNode.parent);
    // repair tree
    let x = newNode;
    while (x !== T.root && getNodeColor(x.parent) === 1 /* NodeColor.Red */) {
        if (x.parent === x.parent.parent.left) {
            const y = x.parent.parent.right;
            if (getNodeColor(y) === 1 /* NodeColor.Red */) {
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(y, 0 /* NodeColor.Black */);
                setNodeColor(x.parent.parent, 1 /* NodeColor.Red */);
                x = x.parent.parent;
            }
            else {
                if (x === x.parent.right) {
                    x = x.parent;
                    leftRotate(T, x);
                }
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(x.parent.parent, 1 /* NodeColor.Red */);
                rightRotate(T, x.parent.parent);
            }
        }
        else {
            const y = x.parent.parent.left;
            if (getNodeColor(y) === 1 /* NodeColor.Red */) {
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(y, 0 /* NodeColor.Black */);
                setNodeColor(x.parent.parent, 1 /* NodeColor.Red */);
                x = x.parent.parent;
            }
            else {
                if (x === x.parent.left) {
                    x = x.parent;
                    rightRotate(T, x);
                }
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(x.parent.parent, 1 /* NodeColor.Red */);
                leftRotate(T, x.parent.parent);
            }
        }
    }
    setNodeColor(T.root, 0 /* NodeColor.Black */);
    return newNode;
}
function treeInsert(T, z) {
    let delta = 0;
    let x = T.root;
    const zAbsoluteStart = z.start;
    const zAbsoluteEnd = z.end;
    while (true) {
        const cmp = intervalCompare(zAbsoluteStart, zAbsoluteEnd, x.start + delta, x.end + delta);
        if (cmp < 0) {
            // this node should be inserted to the left
            // => it is not affected by the node's delta
            if (x.left === SENTINEL) {
                z.start -= delta;
                z.end -= delta;
                z.maxEnd -= delta;
                x.left = z;
                break;
            }
            else {
                x = x.left;
            }
        }
        else {
            // this node should be inserted to the right
            // => it is not affected by the node's delta
            if (x.right === SENTINEL) {
                z.start -= delta + x.delta;
                z.end -= delta + x.delta;
                z.maxEnd -= delta + x.delta;
                x.right = z;
                break;
            }
            else {
                delta += x.delta;
                x = x.right;
            }
        }
    }
    z.parent = x;
    z.left = SENTINEL;
    z.right = SENTINEL;
    setNodeColor(z, 1 /* NodeColor.Red */);
}
//#endregion
//#region Deletion
function rbTreeDelete(T, z) {
    let x;
    let y;
    // RB-DELETE except we don't swap z and y in case c)
    // i.e. we always delete what's pointed at by z.
    if (z.left === SENTINEL) {
        x = z.right;
        y = z;
        // x's delta is no longer influenced by z's delta
        x.delta += z.delta;
        if (x.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || x.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
            T.requestNormalizeDelta = true;
        }
        x.start += z.delta;
        x.end += z.delta;
    }
    else if (z.right === SENTINEL) {
        x = z.left;
        y = z;
    }
    else {
        y = leftest(z.right);
        x = y.right;
        // y's delta is no longer influenced by z's delta,
        // but we don't want to walk the entire right-hand-side subtree of x.
        // we therefore maintain z's delta in y, and adjust only x
        x.start += y.delta;
        x.end += y.delta;
        x.delta += y.delta;
        if (x.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || x.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
            T.requestNormalizeDelta = true;
        }
        y.start += z.delta;
        y.end += z.delta;
        y.delta = z.delta;
        if (y.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || y.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
            T.requestNormalizeDelta = true;
        }
    }
    if (y === T.root) {
        T.root = x;
        setNodeColor(x, 0 /* NodeColor.Black */);
        z.detach();
        resetSentinel();
        recomputeMaxEnd(x);
        T.root.parent = SENTINEL;
        return;
    }
    const yWasRed = getNodeColor(y) === 1 /* NodeColor.Red */;
    if (y === y.parent.left) {
        y.parent.left = x;
    }
    else {
        y.parent.right = x;
    }
    if (y === z) {
        x.parent = y.parent;
    }
    else {
        if (y.parent === z) {
            x.parent = y;
        }
        else {
            x.parent = y.parent;
        }
        y.left = z.left;
        y.right = z.right;
        y.parent = z.parent;
        setNodeColor(y, getNodeColor(z));
        if (z === T.root) {
            T.root = y;
        }
        else {
            if (z === z.parent.left) {
                z.parent.left = y;
            }
            else {
                z.parent.right = y;
            }
        }
        if (y.left !== SENTINEL) {
            y.left.parent = y;
        }
        if (y.right !== SENTINEL) {
            y.right.parent = y;
        }
    }
    z.detach();
    if (yWasRed) {
        recomputeMaxEndWalkToRoot(x.parent);
        if (y !== z) {
            recomputeMaxEndWalkToRoot(y);
            recomputeMaxEndWalkToRoot(y.parent);
        }
        resetSentinel();
        return;
    }
    recomputeMaxEndWalkToRoot(x);
    recomputeMaxEndWalkToRoot(x.parent);
    if (y !== z) {
        recomputeMaxEndWalkToRoot(y);
        recomputeMaxEndWalkToRoot(y.parent);
    }
    // RB-DELETE-FIXUP
    let w;
    while (x !== T.root && getNodeColor(x) === 0 /* NodeColor.Black */) {
        if (x === x.parent.left) {
            w = x.parent.right;
            if (getNodeColor(w) === 1 /* NodeColor.Red */) {
                setNodeColor(w, 0 /* NodeColor.Black */);
                setNodeColor(x.parent, 1 /* NodeColor.Red */);
                leftRotate(T, x.parent);
                w = x.parent.right;
            }
            if (getNodeColor(w.left) === 0 /* NodeColor.Black */ && getNodeColor(w.right) === 0 /* NodeColor.Black */) {
                setNodeColor(w, 1 /* NodeColor.Red */);
                x = x.parent;
            }
            else {
                if (getNodeColor(w.right) === 0 /* NodeColor.Black */) {
                    setNodeColor(w.left, 0 /* NodeColor.Black */);
                    setNodeColor(w, 1 /* NodeColor.Red */);
                    rightRotate(T, w);
                    w = x.parent.right;
                }
                setNodeColor(w, getNodeColor(x.parent));
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(w.right, 0 /* NodeColor.Black */);
                leftRotate(T, x.parent);
                x = T.root;
            }
        }
        else {
            w = x.parent.left;
            if (getNodeColor(w) === 1 /* NodeColor.Red */) {
                setNodeColor(w, 0 /* NodeColor.Black */);
                setNodeColor(x.parent, 1 /* NodeColor.Red */);
                rightRotate(T, x.parent);
                w = x.parent.left;
            }
            if (getNodeColor(w.left) === 0 /* NodeColor.Black */ && getNodeColor(w.right) === 0 /* NodeColor.Black */) {
                setNodeColor(w, 1 /* NodeColor.Red */);
                x = x.parent;
            }
            else {
                if (getNodeColor(w.left) === 0 /* NodeColor.Black */) {
                    setNodeColor(w.right, 0 /* NodeColor.Black */);
                    setNodeColor(w, 1 /* NodeColor.Red */);
                    leftRotate(T, w);
                    w = x.parent.left;
                }
                setNodeColor(w, getNodeColor(x.parent));
                setNodeColor(x.parent, 0 /* NodeColor.Black */);
                setNodeColor(w.left, 0 /* NodeColor.Black */);
                rightRotate(T, x.parent);
                x = T.root;
            }
        }
    }
    setNodeColor(x, 0 /* NodeColor.Black */);
    resetSentinel();
}
function leftest(node) {
    while (node.left !== SENTINEL) {
        node = node.left;
    }
    return node;
}
function resetSentinel() {
    SENTINEL.parent = SENTINEL;
    SENTINEL.delta = 0; // optional
    SENTINEL.start = 0; // optional
    SENTINEL.end = 0; // optional
}
//#endregion
//#region Rotations
function leftRotate(T, x) {
    const y = x.right; // set y.
    y.delta += x.delta; // y's delta is no longer influenced by x's delta
    if (y.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || y.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
        T.requestNormalizeDelta = true;
    }
    y.start += x.delta;
    y.end += x.delta;
    x.right = y.left; // turn y's left subtree into x's right subtree.
    if (y.left !== SENTINEL) {
        y.left.parent = x;
    }
    y.parent = x.parent; // link x's parent to y.
    if (x.parent === SENTINEL) {
        T.root = y;
    }
    else if (x === x.parent.left) {
        x.parent.left = y;
    }
    else {
        x.parent.right = y;
    }
    y.left = x; // put x on y's left.
    x.parent = y;
    recomputeMaxEnd(x);
    recomputeMaxEnd(y);
}
function rightRotate(T, y) {
    const x = y.left;
    y.delta -= x.delta;
    if (y.delta < -1073741824 /* Constants.MIN_SAFE_DELTA */ || y.delta > 1073741824 /* Constants.MAX_SAFE_DELTA */) {
        T.requestNormalizeDelta = true;
    }
    y.start -= x.delta;
    y.end -= x.delta;
    y.left = x.right;
    if (x.right !== SENTINEL) {
        x.right.parent = y;
    }
    x.parent = y.parent;
    if (y.parent === SENTINEL) {
        T.root = x;
    }
    else if (y === y.parent.right) {
        y.parent.right = x;
    }
    else {
        y.parent.left = x;
    }
    x.right = y;
    y.parent = x;
    recomputeMaxEnd(y);
    recomputeMaxEnd(x);
}
//#endregion
//#region max end computation
function computeMaxEnd(node) {
    let maxEnd = node.end;
    if (node.left !== SENTINEL) {
        const leftMaxEnd = node.left.maxEnd;
        if (leftMaxEnd > maxEnd) {
            maxEnd = leftMaxEnd;
        }
    }
    if (node.right !== SENTINEL) {
        const rightMaxEnd = node.right.maxEnd + node.delta;
        if (rightMaxEnd > maxEnd) {
            maxEnd = rightMaxEnd;
        }
    }
    return maxEnd;
}
export function recomputeMaxEnd(node) {
    node.maxEnd = computeMaxEnd(node);
}
function recomputeMaxEndWalkToRoot(node) {
    while (node !== SENTINEL) {
        const maxEnd = computeMaxEnd(node);
        if (node.maxEnd === maxEnd) {
            // no need to go further
            return;
        }
        node.maxEnd = maxEnd;
        node = node.parent;
    }
}
//#endregion
//#region utils
export function intervalCompare(aStart, aEnd, bStart, bEnd) {
    if (aStart === bStart) {
        return aEnd - bEnd;
    }
    return aStart - bStart;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWxUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2ludGVydmFsVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxFQUFFO0FBQ0YsbUdBQW1HO0FBQ25HLEVBQUU7QUFFRixNQUFNLENBQU4sSUFBa0IsU0FRakI7QUFSRCxXQUFrQixTQUFTO0lBQzFCLG1EQUFzQyxDQUFBO0lBQ3RDLG1EQUFzQyxDQUFBO0lBQ3RDLHlEQUE0QyxDQUFBO0lBQzVDLHFEQUF3QyxDQUFBO0lBQ3hDLGlFQUFvRCxDQUFBO0lBQ3BELDhFQUFpRSxDQUFBO0lBQ2pFLDRFQUErRCxDQUFBO0FBQ2hFLENBQUMsRUFSaUIsU0FBUyxLQUFULFNBQVMsUUFRMUI7QUFFRCxNQUFNLENBQU4sSUFBa0IsU0FHakI7QUFIRCxXQUFrQixTQUFTO0lBQzFCLDJDQUFTLENBQUE7SUFDVCx1Q0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQUhpQixTQUFTLEtBQVQsU0FBUyxRQUcxQjtBQUVELElBQVcsU0E4Q1Y7QUE5Q0QsV0FBVyxTQUFTO0lBQ25CLG1EQUFzQixDQUFBO0lBQ3RCLG1FQUE2QixDQUFBO0lBQzdCLHVEQUFlLENBQUE7SUFFZiwyREFBMEIsQ0FBQTtJQUMxQiwyRUFBaUMsQ0FBQTtJQUNqQywrREFBbUIsQ0FBQTtJQUVuQix1RUFBZ0MsQ0FBQTtJQUNoQyx1RkFBdUMsQ0FBQTtJQUN2QywyRUFBeUIsQ0FBQTtJQUV6Qiw4REFBMkIsQ0FBQTtJQUMzQiw2RUFBa0MsQ0FBQTtJQUNsQyxpRUFBb0IsQ0FBQTtJQUVwQixvRkFBc0MsQ0FBQTtJQUN0QyxtR0FBNkMsQ0FBQTtJQUM3Qyx1RkFBK0IsQ0FBQTtJQUUvQiwwREFBeUIsQ0FBQTtJQUN6Qix5RUFBZ0MsQ0FB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