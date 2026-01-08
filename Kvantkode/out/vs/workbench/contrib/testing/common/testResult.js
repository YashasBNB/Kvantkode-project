/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DeferredPromise } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { language } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { refreshComputedState } from './getComputedState.js';
import { TestId } from './testId.js';
import { makeEmptyCounts, maxPriority, statesInOrder, terminalStatePriorities, } from './testingStates.js';
import { getMarkId, TestResultItem, } from './testTypes.js';
const emptyRawOutput = {
    buffers: [],
    length: 0,
    onDidWriteData: Event.None,
    endPromise: Promise.resolve(),
    getRange: () => VSBuffer.alloc(0),
    getRangeIter: () => [],
};
export class TaskRawOutput {
    constructor() {
        this.writeDataEmitter = new Emitter();
        this.endDeferred = new DeferredPromise();
        this.offset = 0;
        /** @inheritdoc */
        this.onDidWriteData = this.writeDataEmitter.event;
        /** @inheritdoc */
        this.endPromise = this.endDeferred.p;
        /** @inheritdoc */
        this.buffers = [];
    }
    /** @inheritdoc */
    get length() {
        return this.offset;
    }
    /** @inheritdoc */
    getRange(start, length) {
        const buf = VSBuffer.alloc(length);
        let bufLastWrite = 0;
        for (const chunk of this.getRangeIter(start, length)) {
            buf.buffer.set(chunk.buffer, bufLastWrite);
            bufLastWrite += chunk.byteLength;
        }
        return bufLastWrite < length ? buf.slice(0, bufLastWrite) : buf;
    }
    /** @inheritdoc */
    *getRangeIter(start, length) {
        let soFar = 0;
        let internalLastRead = 0;
        for (const b of this.buffers) {
            if (internalLastRead + b.byteLength <= start) {
                internalLastRead += b.byteLength;
                continue;
            }
            const bstart = Math.max(0, start - internalLastRead);
            const bend = Math.min(b.byteLength, bstart + length - soFar);
            yield b.slice(bstart, bend);
            soFar += bend - bstart;
            internalLastRead += b.byteLength;
            if (soFar === length) {
                break;
            }
        }
    }
    /**
     * Appends data to the output, returning the byte range where the data can be found.
     */
    append(data, marker) {
        const offset = this.offset;
        let length = data.byteLength;
        if (marker === undefined) {
            this.push(data);
            return { offset, length };
        }
        // Bytes that should be 'trimmed' off the end of data. This is done because
        // selections in the terminal are based on the entire line, and commonly
        // the interesting marked range has a trailing new line. We don't want to
        // select the trailing line (which might have other data)
        // so we place the marker before all trailing trimbytes.
        let TrimBytes;
        (function (TrimBytes) {
            TrimBytes[TrimBytes["CR"] = 13] = "CR";
            TrimBytes[TrimBytes["LF"] = 10] = "LF";
        })(TrimBytes || (TrimBytes = {}));
        const start = VSBuffer.fromString(getMarkCode(marker, true));
        const end = VSBuffer.fromString(getMarkCode(marker, false));
        length += start.byteLength + end.byteLength;
        this.push(start);
        let trimLen = data.byteLength;
        for (; trimLen > 0; trimLen--) {
            const last = data.buffer[trimLen - 1];
            if (last !== 13 /* TrimBytes.CR */ && last !== 10 /* TrimBytes.LF */) {
                break;
            }
        }
        this.push(data.slice(0, trimLen));
        this.push(end);
        this.push(data.slice(trimLen));
        return { offset, length };
    }
    push(data) {
        if (data.byteLength === 0) {
            return;
        }
        this.buffers.push(data);
        this.writeDataEmitter.fire(data);
        this.offset += data.byteLength;
    }
    /** Signals the output has ended. */
    end() {
        this.endDeferred.complete();
    }
}
export const resultItemParents = function* (results, item) {
    for (const id of TestId.fromString(item.item.extId).idsToRoot()) {
        yield results.getStateById(id.toString());
    }
};
export const maxCountPriority = (counts) => {
    for (const state of statesInOrder) {
        if (counts[state] > 0) {
            return state;
        }
    }
    return 0 /* TestResultState.Unset */;
};
const getMarkCode = (marker, start) => `\x1b]633;SetMark;Id=${getMarkId(marker, start)};Hidden\x07`;
const itemToNode = (controllerId, item, parent) => ({
    controllerId,
    expand: 0 /* TestItemExpandState.NotExpandable */,
    item: { ...item },
    children: [],
    tasks: [],
    ownComputedState: 0 /* TestResultState.Unset */,
    computedState: 0 /* TestResultState.Unset */,
});
export var TestResultItemChangeReason;
(function (TestResultItemChangeReason) {
    TestResultItemChangeReason[TestResultItemChangeReason["ComputedStateChange"] = 0] = "ComputedStateChange";
    TestResultItemChangeReason[TestResultItemChangeReason["OwnStateChange"] = 1] = "OwnStateChange";
    TestResultItemChangeReason[TestResultItemChangeReason["NewMessage"] = 2] = "NewMessage";
})(TestResultItemChangeReason || (TestResultItemChangeReason = {}));
/**
 * Results of a test. These are created when the test initially started running
 * and marked as "complete" when the run finishes.
 */
let LiveTestResult = class LiveTestResult extends Disposable {
    /**
     * @inheritdoc
     */
    get completedAt() {
        return this._completedAt;
    }
    /**
     * @inheritdoc
     */
    get tests() {
        return this.testById.values();
    }
    /** Gets an included test item by ID. */
    getTestById(id) {
        return this.testById.get(id)?.item;
    }
    constructor(id, persist, request, insertOrder, telemetry) {
        super();
        this.id = id;
        this.persist = persist;
        this.request = request;
        this.insertOrder = insertOrder;
        this.telemetry = telemetry;
        this.completeEmitter = this._register(new Emitter());
        this.newTaskEmitter = this._register(new Emitter());
        this.endTaskEmitter = this._register(new Emitter());
        this.changeEmitter = this._register(new Emitter());
        /** todo@connor4312: convert to a WellDefinedPrefixTree */
        this.testById = new Map();
        this.testMarkerCounter = 0;
        this.startedAt = Date.now();
        this.onChange = this.changeEmitter.event;
        this.onComplete = this.completeEmitter.event;
        this.onNewTask = this.newTaskEmitter.event;
        this.onEndTask = this.endTaskEmitter.event;
        this.tasks = [];
        this.name = localize('runFinished', 'Test run at {0}', new Date().toLocaleString(language));
        /**
         * @inheritdoc
         */
        this.counts = makeEmptyCounts();
        this.computedStateAccessor = {
            getOwnState: (i) => i.ownComputedState,
            getCurrentComputedState: (i) => i.computedState,
            setComputedState: (i, s) => (i.computedState = s),
            getChildren: (i) => i.children,
            getParents: (i) => {
                const { testById: testByExtId } = this;
                return (function* () {
                    const parentId = TestId.fromString(i.item.extId).parentId;
                    if (parentId) {
                        for (const id of parentId.idsToRoot()) {
                            yield testByExtId.get(id.toString());
                        }
                    }
                })();
            },
        };
        this.doSerialize = new Lazy(() => ({
            id: this.id,
            completedAt: this.completedAt,
            tasks: this.tasks.map((t) => ({
                id: t.id,
                name: t.name,
                ctrlId: t.ctrlId,
                hasCoverage: !!t.coverage.get(),
            })),
            name: this.name,
            request: this.request,
            items: [...this.testById.values()].map(TestResultItem.serializeWithoutMessages),
        }));
        this.doSerializeWithMessages = new Lazy(() => ({
            id: this.id,
            completedAt: this.completedAt,
            tasks: this.tasks.map((t) => ({
                id: t.id,
                name: t.name,
                ctrlId: t.ctrlId,
                hasCoverage: !!t.coverage.get(),
            })),
            name: this.name,
            request: this.request,
            items: [...this.testById.values()].map(TestResultItem.serialize),
        }));
    }
    /**
     * @inheritdoc
     */
    getStateById(extTestId) {
        return this.testById.get(extTestId);
    }
    /**
     * Appends output that occurred during the test run.
     */
    appendOutput(output, taskId, location, testId) {
        const preview = output.byteLength > 100 ? output.slice(0, 100).toString() + '…' : output.toString();
        let marker;
        // currently, the UI only exposes jump-to-message from tests or locations,
        // so no need to mark outputs that don't come from either of those.
        if (testId || location) {
            marker = this.testMarkerCounter++;
        }
        const index = this.mustGetTaskIndex(taskId);
        const task = this.tasks[index];
        const { offset, length } = task.output.append(output, marker);
        const message = {
            location,
            message: preview,
            offset,
            length,
            marker,
            type: 1 /* TestMessageType.Output */,
        };
        const test = testId && this.testById.get(testId);
        if (test) {
            test.tasks[index].messages.push(message);
            this.changeEmitter.fire({
                item: test,
                result: this,
                reason: 2 /* TestResultItemChangeReason.NewMessage */,
                message,
            });
        }
        else {
            task.otherMessages.push(message);
        }
    }
    /**
     * Adds a new run task to the results.
     */
    addTask(task) {
        this.tasks.push({
            ...task,
            coverage: observableValue(this, undefined),
            otherMessages: [],
            output: new TaskRawOutput(),
        });
        for (const test of this.tests) {
            test.tasks.push({ duration: undefined, messages: [], state: 0 /* TestResultState.Unset */ });
        }
        this.newTaskEmitter.fire(this.tasks.length - 1);
    }
    /**
     * Add the chain of tests to the run. The first test in the chain should
     * be either a test root, or a previously-known test.
     */
    addTestChainToRun(controllerId, chain) {
        let parent = this.testById.get(chain[0].extId);
        if (!parent) {
            // must be a test root
            parent = this.addTestToRun(controllerId, chain[0], null);
        }
        for (let i = 1; i < chain.length; i++) {
            parent = this.addTestToRun(controllerId, chain[i], parent.item.extId);
        }
        return undefined;
    }
    /**
     * Updates the state of the test by its internal ID.
     */
    updateState(testId, taskId, state, duration) {
        const entry = this.testById.get(testId);
        if (!entry) {
            return;
        }
        const index = this.mustGetTaskIndex(taskId);
        const oldTerminalStatePrio = terminalStatePriorities[entry.tasks[index].state];
        const newTerminalStatePrio = terminalStatePriorities[state];
        // Ignore requests to set the state from one terminal state back to a
        // "lower" one, e.g. from failed back to passed:
        if (oldTerminalStatePrio !== undefined &&
            (newTerminalStatePrio === undefined || newTerminalStatePrio < oldTerminalStatePrio)) {
            return;
        }
        this.fireUpdateAndRefresh(entry, index, state, duration);
    }
    /**
     * Appends a message for the test in the run.
     */
    appendMessage(testId, taskId, message) {
        const entry = this.testById.get(testId);
        if (!entry) {
            return;
        }
        entry.tasks[this.mustGetTaskIndex(taskId)].messages.push(message);
        this.changeEmitter.fire({
            item: entry,
            result: this,
            reason: 2 /* TestResultItemChangeReason.NewMessage */,
            message,
        });
    }
    /**
     * Marks the task in the test run complete.
     */
    markTaskComplete(taskId) {
        const index = this.mustGetTaskIndex(taskId);
        const task = this.tasks[index];
        task.running = false;
        task.output.end();
        this.setAllToState(0 /* TestResultState.Unset */, taskId, (t) => t.state === 1 /* TestResultState.Queued */ || t.state === 2 /* TestResultState.Running */);
        this.endTaskEmitter.fire(index);
    }
    /**
     * Notifies the service that all tests are complete.
     */
    markComplete() {
        if (this._completedAt !== undefined) {
            throw new Error('cannot complete a test result multiple times');
        }
        for (const task of this.tasks) {
            if (task.running) {
                this.markTaskComplete(task.id);
            }
        }
        this._completedAt = Date.now();
        this.completeEmitter.fire();
        this.telemetry.publicLog2('test.outcomes', {
            failures: this.counts[6 /* TestResultState.Errored */] + this.counts[4 /* TestResultState.Failed */],
            passes: this.counts[3 /* TestResultState.Passed */],
            controller: this.request.targets.map((t) => t.controllerId).join(','),
        });
    }
    /**
     * Marks the test and all of its children in the run as retired.
     */
    markRetired(testIds) {
        for (const [id, test] of this.testById) {
            if (!test.retired && (!testIds || testIds.hasKeyOrParent(TestId.fromString(id).path))) {
                test.retired = true;
                this.changeEmitter.fire({
                    reason: 0 /* TestResultItemChangeReason.ComputedStateChange */,
                    item: test,
                    result: this,
                });
            }
        }
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return this.completedAt && this.persist ? this.doSerialize.value : undefined;
    }
    toJSONWithMessages() {
        return this.completedAt && this.persist ? this.doSerializeWithMessages.value : undefined;
    }
    /**
     * Updates all tests in the collection to the given state.
     */
    setAllToState(state, taskId, when) {
        const index = this.mustGetTaskIndex(taskId);
        for (const test of this.testById.values()) {
            if (when(test.tasks[index], test)) {
                this.fireUpdateAndRefresh(test, index, state);
            }
        }
    }
    fireUpdateAndRefresh(entry, taskIndex, newState, newOwnDuration) {
        const previousOwnComputed = entry.ownComputedState;
        const previousOwnDuration = entry.ownDuration;
        const changeEvent = {
            item: entry,
            result: this,
            reason: 1 /* TestResultItemChangeReason.OwnStateChange */,
            previousState: previousOwnComputed,
            previousOwnDuration: previousOwnDuration,
        };
        entry.tasks[taskIndex].state = newState;
        if (newOwnDuration !== undefined) {
            entry.tasks[taskIndex].duration = newOwnDuration;
            entry.ownDuration = Math.max(entry.ownDuration || 0, newOwnDuration);
        }
        const newOwnComputed = maxPriority(...entry.tasks.map((t) => t.state));
        if (newOwnComputed === previousOwnComputed) {
            if (newOwnDuration !== previousOwnDuration) {
                this.changeEmitter.fire(changeEvent); // fire manually since state change won't do it
            }
            return;
        }
        entry.ownComputedState = newOwnComputed;
        this.counts[previousOwnComputed]--;
        this.counts[newOwnComputed]++;
        refreshComputedState(this.computedStateAccessor, entry).forEach((t) => this.changeEmitter.fire(t === entry
            ? changeEvent
            : {
                item: t,
                result: this,
                reason: 0 /* TestResultItemChangeReason.ComputedStateChange */,
            }));
    }
    addTestToRun(controllerId, item, parent) {
        const node = itemToNode(controllerId, item, parent);
        this.testById.set(item.extId, node);
        this.counts[0 /* TestResultState.Unset */]++;
        if (parent) {
            this.testById.get(parent)?.children.push(node);
        }
        if (this.tasks.length) {
            for (let i = 0; i < this.tasks.length; i++) {
                node.tasks.push({ duration: undefined, messages: [], state: 0 /* TestResultState.Unset */ });
            }
        }
        return node;
    }
    mustGetTaskIndex(taskId) {
        const index = this.tasks.findIndex((t) => t.id === taskId);
        if (index === -1) {
            throw new Error(`Unknown task ${taskId} in updateState`);
        }
        return index;
    }
};
LiveTestResult = __decorate([
    __param(4, ITelemetryService)
], LiveTestResult);
export { LiveTestResult };
/**
 * Test results hydrated from a previously-serialized test run.
 */
export class HydratedTestResult {
    /**
     * @inheritdoc
     */
    get tests() {
        return this.testById.values();
    }
    constructor(identity, serialized, persist = true) {
        this.serialized = serialized;
        this.persist = persist;
        /**
         * @inheritdoc
         */
        this.counts = makeEmptyCounts();
        this.testById = new Map();
        this.id = serialized.id;
        this.completedAt = serialized.completedAt;
        this.tasks = serialized.tasks.map((task, i) => ({
            id: task.id,
            name: task.name || localize('testUnnamedTask', 'Unnamed Task'),
            ctrlId: task.ctrlId,
            running: false,
            coverage: observableValue(this, undefined),
            output: emptyRawOutput,
            otherMessages: [],
        }));
        this.name = serialized.name;
        this.request = serialized.request;
        for (const item of serialized.items) {
            const de = TestResultItem.deserialize(identity, item);
            this.counts[de.ownComputedState]++;
            this.testById.set(item.item.extId, de);
        }
    }
    /**
     * @inheritdoc
     */
    getStateById(extTestId) {
        return this.testById.get(extTestId);
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return this.persist ? this.serialized : undefined;
    }
    /**
     * @inheritdoc
     */
    toJSONWithMessages() {
        return this.toJSON();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdFJlc3VsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV0RixPQUFPLEVBQTBCLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNwQyxPQUFPLEVBQ04sZUFBZSxFQUNmLFdBQVcsRUFDWCxhQUFhLEVBQ2IsdUJBQXVCLEdBRXZCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUNOLFNBQVMsRUFXVCxjQUFjLEdBRWQsTUFBTSxnQkFBZ0IsQ0FBQTtBQXdGdkIsTUFBTSxjQUFjLEdBQW1CO0lBQ3RDLE9BQU8sRUFBRSxFQUFFO0lBQ1gsTUFBTSxFQUFFLENBQUM7SUFDVCxjQUFj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