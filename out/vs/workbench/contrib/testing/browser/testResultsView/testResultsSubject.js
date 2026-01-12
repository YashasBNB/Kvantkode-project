/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../editor/common/core/range.js';
import { TestId } from '../../common/testId.js';
import { ITestMessage, InternalTestItem, } from '../../common/testTypes.js';
import { buildTestUri } from '../../common/testingUri.js';
export const getMessageArgs = (test, message) => ({
    $mid: 18 /* MarshalledId.TestMessageMenuArgs */,
    test: InternalTestItem.serialize(test),
    message: ITestMessage.serialize(message),
});
export const inspectSubjectHasStack = (subject) => subject instanceof MessageSubject && !!subject.stack?.length;
export class MessageSubject {
    get controllerId() {
        return TestId.root(this.test.extId);
    }
    get isDiffable() {
        return this.message.type === 0 /* TestMessageType.Error */ && ITestMessage.isDiffable(this.message);
    }
    get contextValue() {
        return this.message.type === 0 /* TestMessageType.Error */ ? this.message.contextValue : undefined;
    }
    get stack() {
        return this.message.type === 0 /* TestMessageType.Error */ && this.message.stackTrace?.length
            ? this.message.stackTrace
            : undefined;
    }
    constructor(result, test, taskIndex, messageIndex) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.messageIndex = messageIndex;
        this.test = test.item;
        const messages = test.tasks[taskIndex].messages;
        this.messageIndex = messageIndex;
        const parts = { messageIndex, resultId: result.id, taskIndex, testExtId: test.item.extId };
        this.expectedUri = buildTestUri({ ...parts, type: 4 /* TestUriType.ResultExpectedOutput */ });
        this.actualUri = buildTestUri({ ...parts, type: 3 /* TestUriType.ResultActualOutput */ });
        this.messageUri = buildTestUri({ ...parts, type: 2 /* TestUriType.ResultMessage */ });
        const message = (this.message = messages[this.messageIndex]);
        this.context = getMessageArgs(test, message);
        this.revealLocation =
            message.location ??
                (test.item.uri && test.item.range
                    ? { uri: test.item.uri, range: Range.lift(test.item.range) }
                    : undefined);
    }
}
export class TaskSubject {
    get controllerId() {
        return this.result.tasks[this.taskIndex].ctrlId;
    }
    constructor(result, taskIndex) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.outputUri = buildTestUri({ resultId: result.id, taskIndex, type: 0 /* TestUriType.TaskOutput */ });
    }
}
export class TestOutputSubject {
    get controllerId() {
        return TestId.root(this.test.item.extId);
    }
    constructor(result, taskIndex, test) {
        this.result = result;
        this.taskIndex = taskIndex;
        this.test = test;
        this.outputUri = buildTestUri({
            resultId: this.result.id,
            taskIndex: this.taskIndex,
            testExtId: this.test.item.extId,
            type: 1 /* TestUriType.TestOutput */,
        });
        this.task = result.tasks[this.taskIndex];
    }
}
export const equalsSubject = (a, b) => (a instanceof MessageSubject && b instanceof MessageSubject && a.message === b.message) ||
    (a instanceof TaskSubject &&
        b instanceof TaskSubject &&
        a.result === b.result &&
        a.taskIndex === b.taskIndex) ||
    (a instanceof TestOutputSubject &&
        b instanceof TestOutputSubject &&
        a.test === b.test &&
        a.taskIndex === b.taskIndex);
export const mapFindTestMessage = (test, fn) => {
    for (let taskIndex = 0; taskIndex < test.tasks.length; taskIndex++) {
        const task = test.tasks[taskIndex];
        for (let messageIndex = 0; messageIndex < task.messages.length; messageIndex++) {
            const r = fn(task, task.messages[messageIndex], messageIndex, taskIndex);
            if (r !== undefined) {
                return r;
            }
        }
    }
    return undefined;
};
export const getSubjectTestItem = (subject) => {
    if (subject instanceof MessageSubject) {
        return subject.test;
    }
    if (subject instanceof TaskSubject) {
        return undefined;
    }
    return subject.test.item;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNTdWJqZWN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdFJlc3VsdHNWaWV3L3Rlc3RSZXN1bHRzU3ViamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRS9DLE9BQU8sRUFHTixZQUFZLEVBSVosZ0JBQWdCLEdBR2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXRFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUM3QixJQUFvQixFQUNwQixPQUFxQixFQUNFLEVBQUUsQ0FBQyxDQUFDO0lBQzNCLElBQUksMkNBQWtDO0lBQ3RDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO0lBQ3RDLE9BQU8sRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztDQUN4QyxDQUFDLENBQUE7QUFNRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLE9BQW1DLEVBQUUsRUFBRSxDQUM3RSxPQUFPLFlBQVksY0FBYyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQTtBQUU3RCxNQUFNLE9BQU8sY0FBYztJQVMxQixJQUFXLFlBQVk7UUFDdEIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENB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