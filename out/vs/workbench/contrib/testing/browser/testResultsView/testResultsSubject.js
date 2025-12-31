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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNTdWJqZWN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RSZXN1bHRzVmlldy90ZXN0UmVzdWx0c1N1YmplY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvQyxPQUFPLEVBR04sWUFBWSxFQUlaLGdCQUFnQixHQUdoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FDN0IsSUFBb0IsRUFDcEIsT0FBcUIsRUFDRSxFQUFFLENBQUMsQ0FBQztJQUMzQixJQUFJLDJDQUFrQztJQUN0QyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUN0QyxPQUFPLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7Q0FDeEMsQ0FBQyxDQUFBO0FBTUYsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxPQUFtQyxFQUFFLEVBQUUsQ0FDN0UsT0FBTyxZQUFZLGNBQWMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUE7QUFFN0QsTUFBTSxPQUFPLGNBQWM7SUFTMUIsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElB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