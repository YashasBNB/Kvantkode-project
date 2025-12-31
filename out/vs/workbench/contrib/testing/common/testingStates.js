/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mapValues } from '../../../../base/common/objects.js';
/**
 * List of display priorities for different run states. When tests update,
 * the highest-priority state from any of their children will be the state
 * reflected in the parent node.
 */
export const statePriority = {
    [2 /* TestResultState.Running */]: 6,
    [6 /* TestResultState.Errored */]: 5,
    [4 /* TestResultState.Failed */]: 4,
    [1 /* TestResultState.Queued */]: 3,
    [3 /* TestResultState.Passed */]: 2,
    [0 /* TestResultState.Unset */]: 0,
    [5 /* TestResultState.Skipped */]: 1,
};
export const isFailedState = (s) => s === 6 /* TestResultState.Errored */ || s === 4 /* TestResultState.Failed */;
export const isStateWithResult = (s) => s === 6 /* TestResultState.Errored */ || s === 4 /* TestResultState.Failed */ || s === 3 /* TestResultState.Passed */;
export const stateNodes = mapValues(statePriority, (priority, stateStr) => {
    const state = Number(stateStr);
    return { statusNode: true, state, priority };
});
export const cmpPriority = (a, b) => statePriority[b] - statePriority[a];
export const maxPriority = (...states) => {
    switch (states.length) {
        case 0:
            return 0 /* TestResultState.Unset */;
        case 1:
            return states[0];
        case 2:
            return statePriority[states[0]] > statePriority[states[1]] ? states[0] : states[1];
        default: {
            let max = states[0];
            for (let i = 1; i < states.length; i++) {
                if (statePriority[max] < statePriority[states[i]]) {
                    max = states[i];
                }
            }
            return max;
        }
    }
};
export const statesInOrder = Object.keys(statePriority)
    .map((s) => Number(s))
    .sort(cmpPriority);
/**
 * Some states are considered terminal; once these are set for a given test run, they
 * are not reset back to a non-terminal state, or to a terminal state with lower
 * priority.
 */
export const terminalStatePriorities = {
    [3 /* TestResultState.Passed */]: 0,
    [5 /* TestResultState.Skipped */]: 1,
    [4 /* TestResultState.Failed */]: 2,
    [6 /* TestResultState.Errored */]: 3,
};
export const makeEmptyCounts = () => {
    // shh! don't tell anyone this is actually an array!
    return new Uint32Array(statesInOrder.length);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1N0YXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RpbmdTdGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBSzlEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQXVDO0lBQ2hFLGlDQUF5QixFQUFFLENBQUM7SUFDNUIsaUNBQXlCLEVBQUUsQ0FBQztJQUM1QixnQ0FBd0IsRUFBRSxDQUFDO0lBQzNCLGdDQUF3QixFQUFFLENBQUM7SUFDM0IsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQiwrQkFBdUIsRUFBRSxDQUFDO0lBQzFCLGlDQUF5QixFQUFFLENBQUM7Q0FDNUIsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQWtCLEVBQUUsRUFBRSxDQUNuRCxDQUFDLG9DQUE0QixJQUFJLENBQUMsbUNBQTJCLENBQUE7QUFDOUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFrQixFQUFFLEVBQUUsQ0FDdkQsQ0FBQyxvQ0FBNEIsSUFBSSxDQUFDLG1DQUEyQixJQUFJLENBQUMsbUNBQTJCLENBQUE7QUFFOUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUE4QyxTQUFTLENBQzdFLGFBQWEsRUFDYixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQWlCLEVBQUU7SUFDckMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBb0IsQ0FBQTtJQUNqRCxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUE7QUFDN0MsQ0FBQyxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFrQixFQUFFLENBQWtCLEVBQUUsRUFBRSxDQUNyRSxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBRXBDLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsTUFBeUIsRUFBRSxFQUFFO0lBQzNELFFBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQztZQUNMLHFDQUE0QjtRQUM3QixLQUFLLENBQUM7WUFDTCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQixLQUFLLENBQUM7WUFDTCxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25GLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDVCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ25ELEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hCLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztLQUNyRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQW9CLENBQUM7S0FDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBRW5COzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBMEM7SUFDN0UsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQixpQ0FBeUIsRUFBRSxDQUFDO0lBQzVCLGdDQUF3QixFQUFFLENBQUM7SUFDM0IsaUNBQXlCLEVBQUUsQ0FBQztDQUM1QixDQUFBO0FBT0QsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLEdBQW1CLEVBQUU7SUFDbkQsb0RBQW9EO0lBQ3BELE9BQU8sSUFBSSxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBOEMsQ0FBQTtBQUMxRixDQUFDLENBQUEifQ==