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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1N0YXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ1N0YXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFLOUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBdUM7SUFDaEUsaUNBQXlCLEVBQUUsQ0FBQztJQUM1QixpQ0FBeUIsRUFBRSxDQUFDO0lBQzVCLGdDQUF3QixFQUFFLENBQUM7SUFDM0IsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQixnQ0FBd0IsRUFBRSxDQUFDO0lBQzNCLCtCQUF1QixFQUFFLENBQUM7SUFDMUIsaUNBQXlCLEVBQUUsQ0FBQztDQUM1QixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBa0IsRUFBRSxFQUFFLENBQ25ELENBQUMsb0NBQTRCLElBQUksQ0FBQyxtQ0FBMkIsQ0FBQTtBQUM5RCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQWtCLEVBQUUsRUFBRSxDQUN2RCxDQUFDLG9DQUE0QixJQUFJLENBQUMsbUNBQTJCLElBQUksQ0FBQyxtQ0FBMkIsQ0FBQTtBQUU5RixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQThDLFNBQVMsQ0FDN0UsYUFBYSxFQUNiLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBaUIsRUFBRTtJQUNyQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFvQixDQUFBO0lBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQTtBQUM3QyxDQUFDLENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQWtCLEVBQUUsQ0FBa0IsRUFBRSxFQUFFLENBQ3JFLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFFcEMsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsR0FBRyxNQUF5QixFQUFFLEVBQUU7SUFDM0QsUUFBUSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDO1lBQ0wscUNBQTRCO1FBQzdCLEtBQUssQ0FBQztZQUNMLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLEtBQUssQ0FBQztZQUNMLE9BQU8sYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNULElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEIsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO0tBQ3JELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBb0IsQ0FBQztLQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7QUFFbkI7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUEwQztJQUM3RSxnQ0FBd0IsRUFBRSxDQUFDO0lBQzNCLGlDQUF5QixFQUFFLENBQUM7SUFDNUIsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQixpQ0FBeUIsRUFBRSxDQUFDO0NBQzVCLENBQUE7QUFPRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsR0FBbUIsRUFBRTtJQUNuRCxvREFBb0Q7SUFDcEQsT0FBTyxJQUFJLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUE4QyxDQUFBO0FBQzFGLENBQUMsQ0FBQSJ9