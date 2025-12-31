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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJ2YWxUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9pbnRlcnZhbFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsRUFBRTtBQUNGLG1HQUFtRztBQUNuRyxFQUFFO0FBRUYsTUFBTSxDQUFOLElBQWtCLFNBUWpCO0FBUkQsV0FBa0IsU0FBUztJQUMxQixtREFBc0MsQ0FBQTtJQUN0QyxtREFBc0MsQ0FBQTtJQUN0Qyx5REFBNEMsQ0FBQTtJQUM1QyxxREFBd0MsQ0FBQTtJQUN4QyxpRUFBb0QsQ0FBQTtJQUNwRCw4RUFBaUUsQ0FBQTtJQUNqRSw0RUFBK0QsQ0FBQTtBQUNoRSxDQUFDLEVBUmlCLFNBQVMsS0FBVCxTQUFTLFFBUTFCO0FBRUQsTUFBTSxDQUFOLElBQWtCLFNBR2pCO0FBSEQsV0FBa0IsU0FBUztJQUMxQiwyQ0FBUyxDQUFBO0lBQ1QsdUNBQU8sQ0FBQTtBQUNSLENBQUMsRUFIaUIsU0FBUyxLQUFULFNBQVMsUUFHMUI7QUFFRCxJQUFXLFNBOENWO0FBOUNELFdBQVcsU0FBUztJQUNuQixtREFBc0IsQ0FBQTtJQUN0QixtRUFBNkIsQ0FBQTtJQUM3Qix1REFBZSxDQUFBO0lBRWYsMkRBQTBCLENBQUE7SUFDMUIsMkVBQWlDLENBQUE7SUFDakMsK0RBQW1CLENBQUE7SUFFbkIsdUVBQWdDLENBQUE7SUFDaEMsdUZBQXVDLENBQUE7SUFDdkMsMkVBQXlCLENBQUE7SUFFekIsOERBQTJCLENBQUE7SUFDM0IsNkVBQWtDLENBQUE7SUFDbEMsaUVBQW9CLENBQUE7SUFFcEIsb0ZBQXNDLENBQUE7SUFDdEMsbUdBQTZDLENBQUE7SUFDN0MsdUZBQStCLENBQUE7SUFFL0IsMERBQXlCLENBQUE7SUFDekIseUVBQWdDLENBQUE7SUFDaEMsNkRBQWtCLENBQUE7SUFF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