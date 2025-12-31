/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../base/common/iterator.js';
import { makeEmptyCounts, maxPriority, statePriority } from './testingStates.js';
const isDurationAccessor = (accessor) => 'getOwnDuration' in accessor;
/**
 * Gets the computed state for the node.
 * @param force whether to refresh the computed state for this node, even
 * if it was previously set.
 */
const getComputedState = (accessor, node, force = false) => {
    let computed = accessor.getCurrentComputedState(node);
    if (computed === undefined || force) {
        computed = accessor.getOwnState(node) ?? 0 /* TestResultState.Unset */;
        let childrenCount = 0;
        const stateMap = makeEmptyCounts();
        for (const child of accessor.getChildren(node)) {
            const childComputed = getComputedState(accessor, child);
            childrenCount++;
            stateMap[childComputed]++;
            // If all children are skipped, make the current state skipped too if unset (#131537)
            computed =
                childComputed === 5 /* TestResultState.Skipped */ && computed === 0 /* TestResultState.Unset */
                    ? 5 /* TestResultState.Skipped */
                    : maxPriority(computed, childComputed);
        }
        if (childrenCount > LARGE_NODE_THRESHOLD) {
            largeNodeChildrenStates.set(node, stateMap);
        }
        accessor.setComputedState(node, computed);
    }
    return computed;
};
const getComputedDuration = (accessor, node, force = false) => {
    let computed = accessor.getCurrentComputedDuration(node);
    if (computed === undefined || force) {
        const own = accessor.getOwnDuration(node);
        if (own !== undefined) {
            computed = own;
        }
        else {
            computed = undefined;
            for (const child of accessor.getChildren(node)) {
                const d = getComputedDuration(accessor, child);
                if (d !== undefined) {
                    computed = (computed || 0) + d;
                }
            }
        }
        accessor.setComputedDuration(node, computed);
    }
    return computed;
};
const LARGE_NODE_THRESHOLD = 64;
/**
 * Map of how many nodes have in each state. This is used to optimize state
 * computation in large nodes with children above the `LARGE_NODE_THRESHOLD`.
 */
const largeNodeChildrenStates = new WeakMap();
/**
 * Refreshes the computed state for the node and its parents. Any changes
 * elements cause `addUpdated` to be called.
 */
export const refreshComputedState = (accessor, node, explicitNewComputedState, refreshDuration = true) => {
    const oldState = accessor.getCurrentComputedState(node);
    const oldPriority = statePriority[oldState];
    const newState = explicitNewComputedState ?? getComputedState(accessor, node, true);
    const newPriority = statePriority[newState];
    const toUpdate = new Set();
    if (newPriority !== oldPriority) {
        accessor.setComputedState(node, newState);
        toUpdate.add(node);
        let moveFromState = oldState;
        let moveToState = newState;
        for (const parent of accessor.getParents(node)) {
            const lnm = largeNodeChildrenStates.get(parent);
            if (lnm) {
                lnm[moveFromState]--;
                lnm[moveToState]++;
            }
            const prev = accessor.getCurrentComputedState(parent);
            if (newPriority > oldPriority) {
                // Update all parents to ensure they're at least this priority.
                if (prev !== undefined && statePriority[prev] >= newPriority) {
                    break;
                }
                if (lnm && lnm[moveToState] > 1) {
                    break;
                }
                // moveToState remains the same, the new higher priority node state
                accessor.setComputedState(parent, newState);
                toUpdate.add(parent);
            } /* newProirity < oldPriority */
            else {
                // Update all parts whose statese might have been based on this one
                if (prev === undefined || statePriority[prev] > oldPriority) {
                    break;
                }
                if (lnm && lnm[moveFromState] > 0) {
                    break;
                }
                moveToState = getComputedState(accessor, parent, true);
                accessor.setComputedState(parent, moveToState);
                toUpdate.add(parent);
            }
            moveFromState = prev;
        }
    }
    if (isDurationAccessor(accessor) && refreshDuration) {
        for (const parent of Iterable.concat(Iterable.single(node), accessor.getParents(node))) {
            const oldDuration = accessor.getCurrentComputedDuration(parent);
            const newDuration = getComputedDuration(accessor, parent, true);
            if (oldDuration === newDuration) {
                break;
            }
            accessor.setComputedDuration(parent, newDuration);
            toUpdate.add(parent);
        }
    }
    return toUpdate;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0Q29tcHV0ZWRTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL2dldENvbXB1dGVkU3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBbUJoRixNQUFNLGtCQUFrQixHQUFHLENBQzFCLFFBQW1DLEVBQ2dCLEVBQUUsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUE7QUFFbkY7Ozs7R0FJRztBQUVILE1BQU0sZ0JBQWdCLEdBQUcsQ0FDeEIsUUFBbUMsRUFDbkMsSUFBTyxFQUNQLEtBQUssR0FBRyxLQUFLLEVBQ1osRUFBRTtJQUNILElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyRCxJQUFJLFFBQVEsS0FBSyxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7UUFDckMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGlDQUF5QixDQUFBO1FBRTlELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNyQixNQUFNLFFBQVEsR0FBRyxlQUFlLEVBQUUsQ0FBQTtRQUVsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsYUFBYSxFQUFFLENBQUE7WUFDZixRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQTtZQUV6QixxRkFBcUY7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