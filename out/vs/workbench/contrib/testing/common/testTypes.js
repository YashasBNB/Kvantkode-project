/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize } from '../../../../nls.js';
import { TestId } from './testId.js';
export var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["Unset"] = 0] = "Unset";
    TestResultState[TestResultState["Queued"] = 1] = "Queued";
    TestResultState[TestResultState["Running"] = 2] = "Running";
    TestResultState[TestResultState["Passed"] = 3] = "Passed";
    TestResultState[TestResultState["Failed"] = 4] = "Failed";
    TestResultState[TestResultState["Skipped"] = 5] = "Skipped";
    TestResultState[TestResultState["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
export const testResultStateToContextValues = {
    [0 /* TestResultState.Unset */]: 'unset',
    [1 /* TestResultState.Queued */]: 'queued',
    [2 /* TestResultState.Running */]: 'running',
    [3 /* TestResultState.Passed */]: 'passed',
    [4 /* TestResultState.Failed */]: 'failed',
    [5 /* TestResultState.Skipped */]: 'skipped',
    [6 /* TestResultState.Errored */]: 'errored',
};
/** note: keep in sync with TestRunProfileKind in vscode.d.ts */
export var ExtTestRunProfileKind;
(function (ExtTestRunProfileKind) {
    ExtTestRunProfileKind[ExtTestRunProfileKind["Run"] = 1] = "Run";
    ExtTestRunProfileKind[ExtTestRunProfileKind["Debug"] = 2] = "Debug";
    ExtTestRunProfileKind[ExtTestRunProfileKind["Coverage"] = 3] = "Coverage";
})(ExtTestRunProfileKind || (ExtTestRunProfileKind = {}));
export var TestControllerCapability;
(function (TestControllerCapability) {
    TestControllerCapability[TestControllerCapability["Refresh"] = 2] = "Refresh";
    TestControllerCapability[TestControllerCapability["CodeRelatedToTest"] = 4] = "CodeRelatedToTest";
    TestControllerCapability[TestControllerCapability["TestRelatedToCode"] = 8] = "TestRelatedToCode";
})(TestControllerCapability || (TestControllerCapability = {}));
export var TestRunProfileBitset;
(function (TestRunProfileBitset) {
    TestRunProfileBitset[TestRunProfileBitset["Run"] = 2] = "Run";
    TestRunProfileBitset[TestRunProfileBitset["Debug"] = 4] = "Debug";
    TestRunProfileBitset[TestRunProfileBitset["Coverage"] = 8] = "Coverage";
    TestRunProfileBitset[TestRunProfileBitset["HasNonDefaultProfile"] = 16] = "HasNonDefaultProfile";
    TestRunProfileBitset[TestRunProfileBitset["HasConfigurable"] = 32] = "HasConfigurable";
    TestRunProfileBitset[TestRunProfileBitset["SupportsContinuousRun"] = 64] = "SupportsContinuousRun";
})(TestRunProfileBitset || (TestRunProfileBitset = {}));
export const testProfileBitset = {
    [2 /* TestRunProfileBitset.Run */]: localize('testing.runProfileBitset.run', 'Run'),
    [4 /* TestRunProfileBitset.Debug */]: localize('testing.runProfileBitset.debug', 'Debug'),
    [8 /* TestRunProfileBitset.Coverage */]: localize('testing.runProfileBitset.coverage', 'Coverage'),
};
/**
 * List of all test run profile bitset values.
 */
export const testRunProfileBitsetList = [
    2 /* TestRunProfileBitset.Run */,
    4 /* TestRunProfileBitset.Debug */,
    8 /* TestRunProfileBitset.Coverage */,
    16 /* TestRunProfileBitset.HasNonDefaultProfile */,
    32 /* TestRunProfileBitset.HasConfigurable */,
    64 /* TestRunProfileBitset.SupportsContinuousRun */,
];
export const isStartControllerTests = (t) => 'runId' in t;
export var IRichLocation;
(function (IRichLocation) {
    IRichLocation.serialize = (location) => ({
        range: location.range.toJSON(),
        uri: location.uri.toJSON(),
    });
    IRichLocation.deserialize = (uriIdentity, location) => ({
        range: Range.lift(location.range),
        uri: uriIdentity.asCanonicalUri(URI.revive(location.uri)),
    });
})(IRichLocation || (IRichLocation = {}));
export var TestMessageType;
(function (TestMessageType) {
    TestMessageType[TestMessageType["Error"] = 0] = "Error";
    TestMessageType[TestMessageType["Output"] = 1] = "Output";
})(TestMessageType || (TestMessageType = {}));
export var ITestMessageStackFrame;
(function (ITestMessageStackFrame) {
    ITestMessageStackFrame.serialize = (stack) => ({
        label: stack.label,
        uri: stack.uri?.toJSON(),
        position: stack.position?.toJSON(),
    });
    ITestMessageStackFrame.deserialize = (uriIdentity, stack) => ({
        label: stack.label,
        uri: stack.uri ? uriIdentity.asCanonicalUri(URI.revive(stack.uri)) : undefined,
        position: stack.position ? Position.lift(stack.position) : undefined,
    });
})(ITestMessageStackFrame || (ITestMessageStackFrame = {}));
export var ITestErrorMessage;
(function (ITestErrorMessage) {
    ITestErrorMessage.serialize = (message) => ({
        message: message.message,
        type: 0 /* TestMessageType.Error */,
        expected: message.expected,
        actual: message.actual,
        contextValue: message.contextValue,
        location: message.location && IRichLocation.serialize(message.location),
        stackTrace: message.stackTrace?.map(ITestMessageStackFrame.serialize),
    });
    ITestErrorMessage.deserialize = (uriIdentity, message) => ({
        message: message.message,
        type: 0 /* TestMessageType.Error */,
        expected: message.expected,
        actual: message.actual,
        contextValue: message.contextValue,
        location: message.location && IRichLocation.deserialize(uriIdentity, message.location),
        stackTrace: message.stackTrace &&
            message.stackTrace.map((s) => ITestMessageStackFrame.deserialize(uriIdentity, s)),
    });
})(ITestErrorMessage || (ITestErrorMessage = {}));
/**
 * Gets the TTY marker ID for either starting or ending
 * an ITestOutputMessage.marker of the given ID.
 */
export const getMarkId = (marker, start) => `${start ? 's' : 'e'}${marker}`;
export var ITestOutputMessage;
(function (ITestOutputMessage) {
    ITestOutputMessage.serialize = (message) => ({
        message: message.message,
        type: 1 /* TestMessageType.Output */,
        offset: message.offset,
        length: message.length,
        location: message.location && IRichLocation.serialize(message.location),
    });
    ITestOutputMessage.deserialize = (uriIdentity, message) => ({
        message: message.message,
        type: 1 /* TestMessageType.Output */,
        offset: message.offset,
        length: message.length,
        location: message.location && IRichLocation.deserialize(uriIdentity, message.location),
    });
})(ITestOutputMessage || (ITestOutputMessage = {}));
export var ITestMessage;
(function (ITestMessage) {
    ITestMessage.serialize = (message) => message.type === 0 /* TestMessageType.Error */
        ? ITestErrorMessage.serialize(message)
        : ITestOutputMessage.serialize(message);
    ITestMessage.deserialize = (uriIdentity, message) => message.type === 0 /* TestMessageType.Error */
        ? ITestErrorMessage.deserialize(uriIdentity, message)
        : ITestOutputMessage.deserialize(uriIdentity, message);
    ITestMessage.isDiffable = (message) => message.type === 0 /* TestMessageType.Error */ &&
        message.actual !== undefined &&
        message.expected !== undefined;
})(ITestMessage || (ITestMessage = {}));
export var ITestTaskState;
(function (ITestTaskState) {
    ITestTaskState.serializeWithoutMessages = (state) => ({
        state: state.state,
        duration: state.duration,
        messages: [],
    });
    ITestTaskState.serialize = (state) => ({
        state: state.state,
        duration: state.duration,
        messages: state.messages.map(ITestMessage.serialize),
    });
    ITestTaskState.deserialize = (uriIdentity, state) => ({
        state: state.state,
        duration: state.duration,
        messages: state.messages.map((m) => ITestMessage.deserialize(uriIdentity, m)),
    });
})(ITestTaskState || (ITestTaskState = {}));
const testTagDelimiter = '\0';
export const namespaceTestTag = (ctrlId, tagId) => ctrlId + testTagDelimiter + tagId;
export const denamespaceTestTag = (namespaced) => {
    const index = namespaced.indexOf(testTagDelimiter);
    return { ctrlId: namespaced.slice(0, index), tagId: namespaced.slice(index + 1) };
};
export var ITestItem;
(function (ITestItem) {
    ITestItem.serialize = (item) => ({
        extId: item.extId,
        label: item.label,
        tags: item.tags,
        busy: item.busy,
        children: undefined,
        uri: item.uri?.toJSON(),
        range: item.range?.toJSON() || null,
        description: item.description,
        error: item.error,
        sortText: item.sortText,
    });
    ITestItem.deserialize = (uriIdentity, serialized) => ({
        extId: serialized.extId,
        label: serialized.label,
        tags: serialized.tags,
        busy: serialized.busy,
        children: undefined,
        uri: serialized.uri ? uriIdentity.asCanonicalUri(URI.revive(serialized.uri)) : undefined,
        range: serialized.range ? Range.lift(serialized.range) : null,
        description: serialized.description,
        error: serialized.error,
        sortText: serialized.sortText,
    });
})(ITestItem || (ITestItem = {}));
export var TestItemExpandState;
(function (TestItemExpandState) {
    TestItemExpandState[TestItemExpandState["NotExpandable"] = 0] = "NotExpandable";
    TestItemExpandState[TestItemExpandState["Expandable"] = 1] = "Expandable";
    TestItemExpandState[TestItemExpandState["BusyExpanding"] = 2] = "BusyExpanding";
    TestItemExpandState[TestItemExpandState["Expanded"] = 3] = "Expanded";
})(TestItemExpandState || (TestItemExpandState = {}));
export var InternalTestItem;
(function (InternalTestItem) {
    InternalTestItem.serialize = (item) => ({
        expand: item.expand,
        item: ITestItem.serialize(item.item),
    });
    InternalTestItem.deserialize = (uriIdentity, serialized) => ({
        // the `controllerId` is derived from the test.item.extId. It's redundant
        // in the non-serialized InternalTestItem too, but there just because it's
        // checked against in many hot paths.
        controllerId: TestId.root(serialized.item.extId),
        expand: serialized.expand,
        item: ITestItem.deserialize(uriIdentity, serialized.item),
    });
})(InternalTestItem || (InternalTestItem = {}));
export var ITestItemUpdate;
(function (ITestItemUpdate) {
    ITestItemUpdate.serialize = (u) => {
        let item;
        if (u.item) {
            item = {};
            if (u.item.label !== undefined) {
                item.label = u.item.label;
            }
            if (u.item.tags !== undefined) {
                item.tags = u.item.tags;
            }
            if (u.item.busy !== undefined) {
                item.busy = u.item.busy;
            }
            if (u.item.uri !== undefined) {
                item.uri = u.item.uri?.toJSON();
            }
            if (u.item.range !== undefined) {
                item.range = u.item.range?.toJSON();
            }
            if (u.item.description !== undefined) {
                item.description = u.item.description;
            }
            if (u.item.error !== undefined) {
                item.error = u.item.error;
            }
            if (u.item.sortText !== undefined) {
                item.sortText = u.item.sortText;
            }
        }
        return { extId: u.extId, expand: u.expand, item };
    };
    ITestItemUpdate.deserialize = (u) => {
        let item;
        if (u.item) {
            item = {};
            if (u.item.label !== undefined) {
                item.label = u.item.label;
            }
            if (u.item.tags !== undefined) {
                item.tags = u.item.tags;
            }
            if (u.item.busy !== undefined) {
                item.busy = u.item.busy;
            }
            if (u.item.range !== undefined) {
                item.range = u.item.range ? Range.lift(u.item.range) : null;
            }
            if (u.item.description !== undefined) {
                item.description = u.item.description;
            }
            if (u.item.error !== undefined) {
                item.error = u.item.error;
            }
            if (u.item.sortText !== undefined) {
                item.sortText = u.item.sortText;
            }
        }
        return { extId: u.extId, expand: u.expand, item };
    };
})(ITestItemUpdate || (ITestItemUpdate = {}));
export const applyTestItemUpdate = (internal, patch) => {
    if (patch.expand !== undefined) {
        internal.expand = patch.expand;
    }
    if (patch.item !== undefined) {
        internal.item = internal.item ? Object.assign(internal.item, patch.item) : patch.item;
    }
};
export var TestResultItem;
(function (TestResultItem) {
    TestResultItem.serializeWithoutMessages = (original) => ({
        ...InternalTestItem.serialize(original),
        ownComputedState: original.ownComputedState,
        computedState: original.computedState,
        tasks: original.tasks.map(ITestTaskState.serializeWithoutMessages),
    });
    TestResultItem.serialize = (original) => ({
        ...InternalTestItem.serialize(original),
        ownComputedState: original.ownComputedState,
        computedState: original.computedState,
        tasks: original.tasks.map(ITestTaskState.serialize),
    });
    TestResultItem.deserialize = (uriIdentity, serialized) => ({
        ...InternalTestItem.deserialize(uriIdentity, serialized),
        ownComputedState: serialized.ownComputedState,
        computedState: serialized.computedState,
        tasks: serialized.tasks.map((m) => ITestTaskState.deserialize(uriIdentity, m)),
        retired: true,
    });
})(TestResultItem || (TestResultItem = {}));
export var ICoverageCount;
(function (ICoverageCount) {
    ICoverageCount.empty = () => ({ covered: 0, total: 0 });
    ICoverageCount.sum = (target, src) => {
        target.covered += src.covered;
        target.total += src.total;
    };
})(ICoverageCount || (ICoverageCount = {}));
export var IFileCoverage;
(function (IFileCoverage) {
    IFileCoverage.serialize = (original) => ({
        id: original.id,
        statement: original.statement,
        branch: original.branch,
        declaration: original.declaration,
        testIds: original.testIds,
        uri: original.uri.toJSON(),
    });
    IFileCoverage.deserialize = (uriIdentity, serialized) => ({
        id: serialized.id,
        statement: serialized.statement,
        branch: serialized.branch,
        declaration: serialized.declaration,
        testIds: serialized.testIds,
        uri: uriIdentity.asCanonicalUri(URI.revive(serialized.uri)),
    });
    IFileCoverage.empty = (id, uri) => ({
        id,
        uri,
        statement: ICoverageCount.empty(),
    });
})(IFileCoverage || (IFileCoverage = {}));
function serializeThingWithLocation(serialized) {
    return {
        ...serialized,
        location: serialized.location?.toJSON(),
    };
}
function deserializeThingWithLocation(serialized) {
    serialized.location = serialized.location
        ? Position.isIPosition(serialized.location)
            ? Position.lift(serialized.location)
            : Range.lift(serialized.location)
        : undefined;
    return serialized;
}
/** Number of recent runs in which coverage reports should be retained. */
export const KEEP_N_LAST_COVERAGE_REPORTS = 3;
export var DetailType;
(function (DetailType) {
    DetailType[DetailType["Declaration"] = 0] = "Declaration";
    DetailType[DetailType["Statement"] = 1] = "Statement";
    DetailType[DetailType["Branch"] = 2] = "Branch";
})(DetailType || (DetailType = {}));
export var CoverageDetails;
(function (CoverageDetails) {
    CoverageDetails.serialize = (original) => original.type === 0 /* DetailType.Declaration */
        ? IDeclarationCoverage.serialize(original)
        : IStatementCoverage.serialize(original);
    CoverageDetails.deserialize = (serialized) => serialized.type === 0 /* DetailType.Declaration */
        ? IDeclarationCoverage.deserialize(serialized)
        : IStatementCoverage.deserialize(serialized);
})(CoverageDetails || (CoverageDetails = {}));
export var IBranchCoverage;
(function (IBranchCoverage) {
    IBranchCoverage.serialize = serializeThingWithLocation;
    IBranchCoverage.deserialize = deserializeThingWithLocation;
})(IBranchCoverage || (IBranchCoverage = {}));
export var IDeclarationCoverage;
(function (IDeclarationCoverage) {
    IDeclarationCoverage.serialize = serializeThingWithLocation;
    IDeclarationCoverage.deserialize = deserializeThingWithLocation;
})(IDeclarationCoverage || (IDeclarationCoverage = {}));
export var IStatementCoverage;
(function (IStatementCoverage) {
    IStatementCoverage.serialize = (original) => ({
        ...serializeThingWithLocation(original),
        branches: original.branches?.map(IBranchCoverage.serialize),
    });
    IStatementCoverage.deserialize = (serialized) => ({
        ...deserializeThingWithLocation(serialized),
        branches: serialized.branches?.map(IBranchCoverage.deserialize),
    });
})(IStatementCoverage || (IStatementCoverage = {}));
export var TestDiffOpType;
(function (TestDiffOpType) {
    /** Adds a new test (with children) */
    TestDiffOpType[TestDiffOpType["Add"] = 0] = "Add";
    /** Shallow-updates an existing test */
    TestDiffOpType[TestDiffOpType["Update"] = 1] = "Update";
    /** Ranges of some tests in a document were synced, so it should be considered up-to-date */
    TestDiffOpType[TestDiffOpType["DocumentSynced"] = 2] = "DocumentSynced";
    /** Removes a test (and all its children) */
    TestDiffOpType[TestDiffOpType["Remove"] = 3] = "Remove";
    /** Changes the number of controllers who are yet to publish their collection roots. */
    TestDiffOpType[TestDiffOpType["IncrementPendingExtHosts"] = 4] = "IncrementPendingExtHosts";
    /** Retires a test/result */
    TestDiffOpType[TestDiffOpType["Retire"] = 5] = "Retire";
    /** Add a new test tag */
    TestDiffOpType[TestDiffOpType["AddTag"] = 6] = "AddTag";
    /** Remove a test tag */
    TestDiffOpType[TestDiffOpType["RemoveTag"] = 7] = "RemoveTag";
})(TestDiffOpType || (TestDiffOpType = {}));
export var TestsDiffOp;
(function (TestsDiffOp) {
    TestsDiffOp.deserialize = (uriIdentity, u) => {
        if (u.op === 0 /* TestDiffOpType.Add */) {
            return { op: u.op, item: InternalTestItem.deserialize(uriIdentity, u.item) };
        }
        else if (u.op === 1 /* TestDiffOpType.Update */) {
            return { op: u.op, item: ITestItemUpdate.deserialize(u.item) };
        }
        else if (u.op === 2 /* TestDiffOpType.DocumentSynced */) {
            return { op: u.op, uri: uriIdentity.asCanonicalUri(URI.revive(u.uri)), docv: u.docv };
        }
        else {
            return u;
        }
    };
    TestsDiffOp.serialize = (u) => {
        if (u.op === 0 /* TestDiffOpType.Add */) {
            return { op: u.op, item: InternalTestItem.serialize(u.item) };
        }
        else if (u.op === 1 /* TestDiffOpType.Update */) {
            return { op: u.op, item: ITestItemUpdate.serialize(u.item) };
        }
        else {
            return u;
        }
    };
})(TestsDiffOp || (TestsDiffOp = {}));
/**
 * Maintains tests in this extension host sent from the main thread.
 */
export class AbstractIncrementalTestCollection {
    constructor(uriIdentity) {
        this.uriIdentity = uriIdentity;
        this._tags = new Map();
        /**
         * Map of item IDs to test item objects.
         */
        this.items = new Map();
        /**
         * ID of test root items.
         */
        this.roots = new Set();
        /**
         * Number of 'busy' controllers.
         */
        this.busyControllerCount = 0;
        /**
         * Number of pending roots.
         */
        this.pendingRootCount = 0;
        /**
         * Known test tags.
         */
        this.tags = this._tags;
    }
    /**
     * Applies the diff to the collection.
     */
    apply(diff) {
        const changes = this.createChangeCollector();
        for (const op of diff) {
            switch (op.op) {
                case 0 /* TestDiffOpType.Add */:
                    this.add(InternalTestItem.deserialize(this.uriIdentity, op.item), changes);
                    break;
                case 1 /* TestDiffOpType.Update */:
                    this.update(ITestItemUpdate.deserialize(op.item), changes);
                    break;
                case 3 /* TestDiffOpType.Remove */:
                    this.remove(op.itemId, changes);
                    break;
                case 5 /* TestDiffOpType.Retire */:
                    this.retireTest(op.itemId);
                    break;
                case 4 /* TestDiffOpType.IncrementPendingExtHosts */:
                    this.updatePendingRoots(op.amount);
                    break;
                case 6 /* TestDiffOpType.AddTag */:
                    this._tags.set(op.tag.id, op.tag);
                    break;
                case 7 /* TestDiffOpType.RemoveTag */:
                    this._tags.delete(op.id);
                    break;
            }
        }
        changes.complete?.();
    }
    add(item, changes) {
        const parentId = TestId.parentId(item.item.extId)?.toString();
        let created;
        if (!parentId) {
            created = this.createItem(item);
            this.roots.add(created);
            this.items.set(item.item.extId, created);
        }
        else if (this.items.has(parentId)) {
            const parent = this.items.get(parentId);
            parent.children.add(item.item.extId);
            created = this.createItem(item, parent);
            this.items.set(item.item.extId, created);
        }
        else {
            console.error(`Test with unknown parent ID: ${JSON.stringify(item)}`);
            return;
        }
        changes.add?.(created);
        if (item.expand === 2 /* TestItemExpandState.BusyExpanding */) {
            this.busyControllerCount++;
        }
        return created;
    }
    update(patch, changes) {
        const existing = this.items.get(patch.extId);
        if (!existing) {
            return;
        }
        if (patch.expand !== undefined) {
            if (existing.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                this.busyControllerCount--;
            }
            if (patch.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                this.busyControllerCount++;
            }
        }
        applyTestItemUpdate(existing, patch);
        changes.update?.(existing);
        return existing;
    }
    remove(itemId, changes) {
        const toRemove = this.items.get(itemId);
        if (!toRemove) {
            return;
        }
        const parentId = TestId.parentId(toRemove.item.extId)?.toString();
        if (parentId) {
            const parent = this.items.get(parentId);
            parent.children.delete(toRemove.item.extId);
        }
        else {
            this.roots.delete(toRemove);
        }
        const queue = [[itemId]];
        while (queue.length) {
            for (const itemId of queue.pop()) {
                const existing = this.items.get(itemId);
                if (existing) {
                    queue.push(existing.children);
                    this.items.delete(itemId);
                    changes.remove?.(existing, existing !== toRemove);
                    if (existing.expand === 2 /* TestItemExpandState.BusyExpanding */) {
                        this.busyControllerCount--;
                    }
                }
            }
        }
    }
    /**
     * Called when the extension signals a test result should be retired.
     */
    retireTest(testId) {
        // no-op
    }
    /**
     * Updates the number of test root sources who are yet to report. When
     * the total pending test roots reaches 0, the roots for all controllers
     * will exist in the collection.
     */
    updatePendingRoots(delta) {
        this.pendingRootCount += delta;
    }
    /**
     * Called before a diff is applied to create a new change collector.
     */
    createChangeCollector() {
        return {};
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVwQyxNQUFNLENBQU4sSUFBa0IsZUFRakI7QUFSRCxXQUFrQixlQUFlO0lBQ2hDLHVEQUFTLENBQUE7SUFDVCx5REFBVSxDQUFBO0lBQ1YsMkRBQVcsQ0FBQTtJQUNYLHlEQUFVLENBQUE7SUFDVix5REFBVSxDQUFBO0lBQ1YsMkRBQVcsQ0FBQTtJQUNYLDJEQUFXLENBQUE7QUFDWixDQUFDLEVBUmlCLGVBQWUsS0FBZixlQUFlLFFBUWhDO0FBRUQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQXVDO0lBQ2pGLCtCQUF1QixFQUFFLE9BQU87SUFDaEMsZ0NBQXdCLEVBQUUsUUFBUTtJQUNsQyxpQ0FBeUIsRUFBRSxTQUFTO0lBQ3BDLGdDQUF3QixFQUFFLFFBQVE7SUFDbEMsZ0NBQXdCLEVBQUUsUUFBUTtJQUNsQyxpQ0FBeUIsRUFBRSxTQUFTO0lBQ3BDLGlDQUF5QixFQUFFLFNBQVM7Q0FDcEMsQ0FBQTtBQUVELGdFQUFnRTtBQUNoRSxNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLCtEQUFPLENBQUE7SUFDUCxtRUFBUyxDQUFB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SyxDQUFBO1lBQzFCLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3hCLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3hCLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFBO1lBQ2hDLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFBO1lBQ3BDLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFBO1lBQ3RDLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBO1lBQzFCLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFBO1lB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