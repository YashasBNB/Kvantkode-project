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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0Q29tcHV0ZWRTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vZ2V0Q29tcHV0ZWRTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFtQmhGLE1BQU0sa0JBQWtCLEdBQUcsQ0FDMUIsUUFBbUMsRUFDZ0IsRUFBRSxDQUFDLGdCQUFnQixJQUFJLFFBQVEsQ0FBQTtBQUVuRjs7OztHQUlHO0FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxDQUN4QixRQUFtQyxFQUNuQyxJQUFPLEVBQ1AsS0FBSyxHQUFHLEtBQUssRUFDWixFQUFFO0lBQ0gsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3JELElBQUksUUFBUSxLQUFLLFNBQVMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNyQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQXlCLENBQUE7UUFFOUQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sUUFBUSxHQUFHLGVBQWUsRUFBRSxDQUFBO1FBRWxDLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxhQUFhLEVBQUUsQ0FBQTtZQUNmLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFBO1lBRXpCLHFG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