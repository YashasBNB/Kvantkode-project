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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEl0ZW1Db250ZXh0T3ZlcmxheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL3Rlc3RJdGVtQ29udGV4dE92ZXJsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXZFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLENBQ3hDLElBQWtDLEVBQ2xDLFlBQW9CLEVBQ0UsRUFBRTtJQUN4QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFakQsT0FBTztRQUNOLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ3RELENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQ3hELENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDeEQsR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUM7S0FDdEMsQ0FBQTtBQUNGLENBQUMsQ0FBQSJ9