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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RSZXN1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFdEYsT0FBTyxFQUEwQixvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXBGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDcEMsT0FBTyxFQUNOLGVBQWUsRUFDZixXQUFXLEVBQ1gsYUFBYSxFQUNiLHVCQUF1QixHQUV2QixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFDTixTQUFTLEVBV1QsY0FBYyxHQUVkLE1BQU0sZ0JBQWdCLENBQUE7QUF3RnZCLE1BQU0sY0FBYyxHQUFtQjtJQUN0QyxPQUFPLEVBQUUsRUFBRTtJQUNYLE1BQU0sRUFBRSxDQUFDO0lBQ1QsY0FBYyxFQUFF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