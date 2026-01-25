/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TreeVisibility;
(function (TreeVisibility) {
    /**
     * The tree node should be hidden.
     */
    TreeVisibility[TreeVisibility["Hidden"] = 0] = "Hidden";
    /**
     * The tree node should be visible.
     */
    TreeVisibility[TreeVisibility["Visible"] = 1] = "Visible";
    /**
     * The tree node should be visible if any of its descendants is visible.
     */
    TreeVisibility[TreeVisibility["Recurse"] = 2] = "Recurse";
})(TreeVisibility || (TreeVisibility = {}));
export var ObjectTreeElementCollapseState;
(function (ObjectTreeElementCollapseState) {
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["Expanded"] = 0] = "Expanded";
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["Collapsed"] = 1] = "Collapsed";
    /**
     * If the element is already in the tree, preserve its current state. Else, expand it.
     */
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["PreserveOrExpanded"] = 2] = "PreserveOrExpanded";
    /**
     * If the element is already in the tree, preserve its current state. Else, collapse it.
     */
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["PreserveOrCollapsed"] = 3] = "PreserveOrCollapsed";
})(ObjectTreeElementCollapseState || (ObjectTreeElementCollapseState = {}));
export var TreeMouseEventTarget;
(function (TreeMouseEventTarget) {
    TreeMouseEventTarget[TreeMouseEventTarget["Unknown"] = 0] = "Unknown";
    TreeMouseEventTarget[TreeMouseEventTarget["Twistie"] = 1] = "Twistie";
    TreeMouseEventTarget[TreeMouseEventTarget["Element"] = 2] = "Element";
    TreeMouseEventTarget[TreeMouseEventTarget["Filter"] = 3] = "Filter";
})(TreeMouseEventTarget || (TreeMouseEventTarget = {}));
export var TreeDragOverBubble;
(function (TreeDragOverBubble) {
    TreeDragOverBubble[TreeDragOverBubble["Down"] = 0] = "Down";
    TreeDragOverBubble[TreeDragOverBubble["Up"] = 1] = "Up";
})(TreeDragOverBubble || (TreeDragOverBubble = {}));
export const TreeDragOverReactions = {
    acceptBubbleUp() {
        return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */ };
    },
    acceptBubbleDown(autoExpand = false) {
        return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, autoExpand };
    },
    acceptCopyBubbleUp() {
        return {
            accept: true,
            bubble: 1 /* TreeDragOverBubble.Up */,
            effect: { type: 0 /* ListDragOverEffectType.Copy */, position: "drop-target" /* ListDragOverEffectPosition.Over */ },
        };
    },
    acceptCopyBubbleDown(autoExpand = false) {
        return {
            accept: true,
            bubble: 0 /* TreeDragOverBubble.Down */,
            effect: { type: 0 /* ListDragOverEffectType.Copy */, position: "drop-target" /* ListDragOverEffectPosition.Over */ },
            autoExpand,
        };
    },
};
export class TreeError extends Error {
    constructor(user, message) {
        super(`TreeError [${user}] ${message}`);
    }
}
export class WeakMapper {
    constructor(fn) {
        this.fn = fn;
        this._map = new WeakMap();
    }
    map(key) {
        let result = this._map.get(key);
        if (!result) {
            result = this.fn(key);
            this._map.set(key, result);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWNoRyxNQUFNLENBQU4sSUFBa0IsY0FlakI7QUFmRCxXQUFrQixjQUFjO0lBQy9COztPQUVHO0lBQ0gsdURBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gseURBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gseURBQU8sQ0FBQTtBQUNSLENBQUMsRUFmaUIsY0FBYyxLQUFkLGNBQWMsUUFlL0I7QUF3REQsTUFBTSxDQUFOLElBQVksOEJBYVg7QUFiRCxXQUFZLDhCQUE4QjtJQUN6QywyRkFBUSxDQUFBO0lBQ1IsNkZBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsK0dBQWtCLENBQUE7SUFFbEI7O09BRUc7SUFDSCxpSEFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBYlcsOEJBQThCLEtBQTlCLDhCQUE4QixRQWF6QztBQTZFRCxNQUFNLENBQU4sSUFBWSxvQkFLWDtBQUxELFdBQVksb0JBQW9CO0lBQy9CLHFFQUFPLENBQUE7SUFDUCxxRUFBTyxDQUFBO0lBQ1AscUVBQU8sQ0FBQTtJQUNQLG1FQUFNLENBQUE7QUFDUCxDQUFDLEVBTFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUsvQjtBQWtDRCxNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLDJEQUFJLENBQUE7SUFDSix1REFBRSxDQUFBO0FBQ0gsQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBT0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUc7SUFDcEMsY0FBYztRQUNiLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0JBQXVCLEVBQUUsQ0FBQTtJQUN2RCxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsVUFBVSxHQUFHLEtBQUs7UUFDbEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBeUIsRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUNyRSxDQUFDO0lBQ0Qsa0JBQWtCO1FBQ2pCLE9BQU87WUFDTixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0sK0JBQXVCO1lBQzdCLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsUUFBUSxxREFBaUMsRUFBRTtTQUN4RixDQUFBO0lBQ0YsQ0FBQztJQUNELG9CQUFvQixDQUFDLFVBQVUsR0FBRyxLQUFLO1FBQ3RDLE9BQU87WUFDTixNQUFNLEVBQUUsSUFBSTtZQUNaLE1BQU0saUNBQXlCO1lBQy9CLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsUUFBUSxxREFBaUMsRUFBRTtZQUN4RixVQUFVO1NBQ1YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBWUQsTUFBTSxPQUFPLFNBQVUsU0FBUSxLQUFLO0lBQ25DLFlBQVksSUFBWSxFQUFFLE9BQWU7UUFDeEMsS0FBSyxDQUFDLGNBQWMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDeEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFDdEIsWUFBb0IsRUFBZTtRQUFmLE9BQUUsR0FBRixFQUFFLENBQWE7UUFFM0IsU0FBSSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7SUFGSSxDQUFDO0lBSXZDLEdBQUcsQ0FBQyxHQUFNO1FBQ1QsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFL0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9