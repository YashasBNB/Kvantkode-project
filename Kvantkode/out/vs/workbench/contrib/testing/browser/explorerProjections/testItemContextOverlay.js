/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { capabilityContextKeys } from '../../common/testProfileService.js';
import { TestId } from '../../common/testId.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
export const getTestItemContextOverlay = (test, capabilities) => {
    if (!test) {
        return [];
    }
    const testId = TestId.fromString(test.item.extId);
    return [
        [TestingContextKeys.testItemExtId.key, testId.localId],
        [TestingContextKeys.controllerId.key, test.controllerId],
        [TestingContextKeys.testItemHasUri.key, !!test.item.uri],
        ...capabilityContextKeys(capabilities),
    ];
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEl0ZW1Db250ZXh0T3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvdGVzdEl0ZW1Db250ZXh0T3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFdkUsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsQ0FDeEMsSUFBa0MsRUFDbEMsWUFBb0IsRUFDRSxFQUFFO0lBQ3hCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVqRCxPQUFPO1FBQ04sQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDdEQsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDeEQsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUN4RCxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQztLQUN0QyxDQUFBO0FBQ0YsQ0FBQyxDQUFBIn0=