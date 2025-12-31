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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFjaEcsTUFBTSxDQUFOLElBQWtCLGNBZWpCO0FBZkQsV0FBa0IsY0FBYztJQUMvQjs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILHlEQUFPLENBQUE7SUFFUDs7T0FFRztJQUNILHlEQUFPLENBQUE7QUFDUixDQUFDLEVBZmlCLGNBQWMsS0FBZCxjQUFjLFFBZS9CO0FBd0RELE1BQU0sQ0FBTixJQUFZLDhCQWFYO0FBYkQsV0FBWSw4QkFBOEI7SUFDekMsMkZBQVEsQ0FBQTtJQUNSLDZGQUFTLENBQUE7SUFFVDs7T0FFRztJQUNILCtHQUFrQixDQUFBO0lBRWxCOztPQUVHO0lBQ0gsaUhBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQWJXLDhCQUE4QixLQUE5Qiw4QkFBOEIsUUFhekM7QUE2RUQsTUFBTSxDQUFOLElBQVksb0JBS1g7QUFMRCxXQUFZLG9CQUFvQjtJQUMvQixxRUFBTyxDQUFBO0lBQ1AscUVBQU8sQ0FBQTtJQUNQLHFFQUFPLENBQUE7SUFDUCxtRUFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUxXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFLL0I7QUFrQ0QsTUFBTSxDQUFOLElBQWtCLGtCQUdqQjtBQUhELFdBQWtCLGtCQUFrQjtJQUNuQywyREFBSSxDQUFBO0lBQ0osdURBQUUsQ0FBQTtBQUNILENBQUMsRUFIaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUduQztBQU9ELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLGNBQWM7UUFDYixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUF1QixFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUNELGdCQUFnQixDQUFDLFVBQVUsR0FBRyxLQUFLO1FBQ2xDLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQXlCLEVBQUUsVUFBVSxFQUFFLENBQUE7SUFDckUsQ0FBQztJQUNELGtCQUFrQjtRQUNqQixPQUFPO1lBQ04sTUFBTSxFQUFFLElBQUk7WUFDWixNQUFNLCtCQUF1QjtZQUM3QixNQUFNLEVBQUUsRUFBRSxJQUFJLHFDQUE2QixFQUFFLFFBQVEscURBQWlDLEVBQUU7U0FDeEYsQ0FBQTtJQUNGLENBQUM7SUFDRCxvQkFBb0IsQ0FBQyxVQUFVLEdBQUcsS0FBSztRQUN0QyxPQUFPO1lBQ04sTUFBTSxFQUFFLElBQUk7WUFDWixNQUFNLGlDQUF5QjtZQUMvQixNQUFNLEVBQUUsRUFBRSxJQUFJLHFDQUE2QixFQUFFLFFBQVEscURBQWlDLEVBQUU7WUFDeEYsVUFBVTtTQUNWLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQVlELE1BQU0sT0FBTyxTQUFVLFNBQVEsS0FBSztJQUNuQyxZQUFZLElBQVksRUFBRSxPQUFlO1FBQ3hDLEtBQUssQ0FBQyxjQUFjLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFVO0lBQ3RCLFlBQW9CLEVBQWU7UUFBZixPQUFFLEdBQUYsRUFBRSxDQUFhO1FBRTNCLFNBQUksR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO0lBRkksQ0FBQztJQUl2QyxHQUFHLENBQUMsR0FBTTtRQUNULElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRS9CLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QifQ==