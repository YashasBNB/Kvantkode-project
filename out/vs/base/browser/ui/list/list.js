/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ListDragOverEffectType;
(function (ListDragOverEffectType) {
    ListDragOverEffectType[ListDragOverEffectType["Copy"] = 0] = "Copy";
    ListDragOverEffectType[ListDragOverEffectType["Move"] = 1] = "Move";
})(ListDragOverEffectType || (ListDragOverEffectType = {}));
export var ListDragOverEffectPosition;
(function (ListDragOverEffectPosition) {
    ListDragOverEffectPosition["Over"] = "drop-target";
    ListDragOverEffectPosition["Before"] = "drop-target-before";
    ListDragOverEffectPosition["After"] = "drop-target-after";
})(ListDragOverEffectPosition || (ListDragOverEffectPosition = {}));
export const ListDragOverReactions = {
    reject() {
        return { accept: false };
    },
    accept() {
        return { accept: true };
    },
};
export class ListError extends Error {
    constructor(user, message) {
        super(`ListError [${user}] ${message}`);
    }
}
export class CachedListVirtualDelegate {
    constructor() {
        this.cache = new WeakMap();
    }
    getHeight(element) {
        return this.cache.get(element) ?? this.estimateHeight(element);
    }
    setDynamicHeight(element, height) {
        if (height > 0) {
            this.cache.set(element, height);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9saXN0L2xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnR2hHLE1BQU0sQ0FBTixJQUFrQixzQkFHakI7QUFIRCxXQUFrQixzQkFBc0I7SUFDdkMsbUVBQUksQ0FBQTtJQUNKLG1FQUFJLENBQUE7QUFDTCxDQUFDLEVBSGlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFHdkM7QUFFRCxNQUFNLENBQU4sSUFBa0IsMEJBSWpCO0FBSkQsV0FBa0IsMEJBQTBCO0lBQzNDLGtEQUFvQixDQUFBO0lBQ3BCLDJEQUE2QixDQUFBO0lBQzdCLHlEQUEyQixDQUFBO0FBQzVCLENBQUMsRUFKaUIsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUkzQztBQWFELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLE1BQU07UUFDTCxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxNQUFNO1FBQ0wsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0NBQ0QsQ0FBQTtBQWlDRCxNQUFNLE9BQU8sU0FBVSxTQUFRLEtBQUs7SUFDbkMsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN4QyxLQUFLLENBQUMsY0FBYyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQWdCLHlCQUF5QjtJQUEvQztRQUdTLFVBQUssR0FBRyxJQUFJLE9BQU8sRUFBYSxDQUFBO0lBY3pDLENBQUM7SUFaQSxTQUFTLENBQUMsT0FBVTtRQUNuQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUtELGdCQUFnQixDQUFDLE9BQVUsRUFBRSxNQUFjO1FBQzFDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=