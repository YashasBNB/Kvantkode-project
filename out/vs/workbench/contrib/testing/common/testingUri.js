/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { URI } from '../../../../base/common/uri.js';
export const TEST_DATA_SCHEME = 'vscode-test-data';
export var TestUriType;
(function (TestUriType) {
    /** All console output for a task */
    TestUriType[TestUriType["TaskOutput"] = 0] = "TaskOutput";
    /** All console output for a test in a task */
    TestUriType[TestUriType["TestOutput"] = 1] = "TestOutput";
    /** Specific message in a test */
    TestUriType[TestUriType["ResultMessage"] = 2] = "ResultMessage";
    /** Specific actual output message in a test */
    TestUriType[TestUriType["ResultActualOutput"] = 3] = "ResultActualOutput";
    /** Specific expected output message in a test */
    TestUriType[TestUriType["ResultExpectedOutput"] = 4] = "ResultExpectedOutput";
})(TestUriType || (TestUriType = {}));
var TestUriParts;
(function (TestUriParts) {
    TestUriParts["Results"] = "results";
    TestUriParts["AllOutput"] = "output";
    TestUriParts["Messages"] = "message";
    TestUriParts["Text"] = "TestFailureMessage";
    TestUriParts["ActualOutput"] = "ActualOutput";
    TestUriParts["ExpectedOutput"] = "ExpectedOutput";
})(TestUriParts || (TestUriParts = {}));
export const parseTestUri = (uri) => {
    const type = uri.authority;
    const [resultId, ...request] = uri.path.slice(1).split('/');
    if (request[0] === "message" /* TestUriParts.Messages */) {
        const taskIndex = Number(request[1]);
        const testExtId = uri.query;
        const index = Number(request[2]);
        const part = request[3];
        if (type === "results" /* TestUriParts.Results */) {
            switch (part) {
                case "TestFailureMessage" /* TestUriParts.Text */:
                    return {
                        resultId,
                        taskIndex,
                        testExtId,
                        messageIndex: index,
                        type: 2 /* TestUriType.ResultMessage */,
                    };
                case "ActualOutput" /* TestUriParts.ActualOutput */:
                    return {
                        resultId,
                        taskIndex,
                        testExtId,
                        messageIndex: index,
                        type: 3 /* TestUriType.ResultActualOutput */,
                    };
                case "ExpectedOutput" /* TestUriParts.ExpectedOutput */:
                    return {
                        resultId,
                        taskIndex,
                        testExtId,
                        messageIndex: index,
                        type: 4 /* TestUriType.ResultExpectedOutput */,
                    };
                case "message" /* TestUriParts.Messages */:
            }
        }
    }
    if (request[0] === "output" /* TestUriParts.AllOutput */) {
        const testExtId = uri.query;
        const taskIndex = Number(request[1]);
        return testExtId
            ? { resultId, taskIndex, testExtId, type: 1 /* TestUriType.TestOutput */ }
            : { resultId, taskIndex, type: 0 /* TestUriType.TaskOutput */ };
    }
    return undefined;
};
export const buildTestUri = (parsed) => {
    const uriParts = {
        scheme: TEST_DATA_SCHEME,
        authority: "results" /* TestUriParts.Results */,
    };
    if (parsed.type === 0 /* TestUriType.TaskOutput */) {
        return URI.from({
            ...uriParts,
            path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
        });
    }
    const msgRef = (resultId, ...remaining) => URI.from({
        ...uriParts,
        query: parsed.testExtId,
        path: ['', resultId, "message" /* TestUriParts.Messages */, ...remaining].join('/'),
    });
    switch (parsed.type) {
        case 3 /* TestUriType.ResultActualOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ActualOutput" /* TestUriParts.ActualOutput */);
        case 4 /* TestUriType.ResultExpectedOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ExpectedOutput" /* TestUriParts.ExpectedOutput */);
        case 2 /* TestUriType.ResultMessage */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "TestFailureMessage" /* TestUriParts.Text */);
        case 1 /* TestUriType.TestOutput */:
            return URI.from({
                ...uriParts,
                query: parsed.testExtId,
                path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
            });
        default:
            assertNever(parsed, 'Invalid test uri');
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1VyaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RpbmdVcmkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxrQkFBa0IsQ0FBQTtBQUVsRCxNQUFNLENBQU4sSUFBa0IsV0FXakI7QUFYRCxXQUFrQixXQUFXO0lBQzVCLG9DQUFvQztJQUNwQyx5REFBVSxDQUFBO0lBQ1YsOENBQThDO0lBQzlDLHlEQUFVLENBQUE7SUFDVixpQ0FBaUM7SUFDakMsK0RBQWEsQ0FBQTtJQUNiLCtDQUErQztJQUMvQyx5RUFBa0IsQ0FBQTtJQUNsQixpREFBaUQ7SUFDakQsNkVBQW9CLENBQUE7QUFDckIsQ0FBQyxFQVhpQixXQUFXLEtBQVgsV0FBVyxRQVc1QjtBQWtDRCxJQUFXLFlBUVY7QUFSRCxXQUFXLFlBQVk7SUFDdEIsbUNBQW1CLENBQUE7SUFFbkIsb0NBQW9CLENBQUE7SUFDcEIsb0NBQW9CLENBQUE7SUFDcEIsMkNBQTJCLENBQUE7SUFDM0IsNkNBQTZCLENBQUE7SUFDN0IsaURBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQVJVLFlBQVksS0FBWixZQUFZLFFBUXRCO0FBRUQsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBUSxFQUE2QixFQUFFO0lBQ25FLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUE7SUFDMUIsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxD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