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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXBDLE1BQU0sQ0FBTixJQUFrQixlQVFqQjtBQVJELFdBQWtCLGVBQWU7SUFDaEMsdURBQVMsQ0FBQTtJQUNULHlEQUFVLENBQUE7SUFDViwyREFBVyxDQUFBO0lBQ1gseURBQVUsQ0FBQTtJQUNWLHlEQUFVLENBQUE7SUFDViwyREFBVyxDQUFBO0lBQ1gsMkRBQVcsQ0FBQTtBQUNaLENBQUMsRUFSaUIsZUFBZSxLQUFmLGVBQWUsUUFRaEM7QUFFRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBdUM7SUFDakYsK0JBQXVCLEVBQUUsT0FBTztJQUNoQyxnQ0FBd0IsRUFBRSxRQUFRO0lBQ2xDLGlDQUF5QixFQUFFLFNBQVM7SUFDcEMsZ0NBQXdCLEVBQUUsUUFBUTtJQUNsQyxnQ0FBd0IsRUFBRSxRQUFRO0lBQ2xDLGlDQUF5QixFQUFFLFNBQVM7SUFDcEMsaUNBQXlCLEVBQUUsU0FBUztDQUNwQyxDQUFBO0FBRUQsZ0VBQWdFO0FBQ2hFLE1BQU0sQ0FBTixJQUFrQixxQkFJakI7QUFKRCxXQUFrQixxQkFBcUI7SUFDdEMsK0RB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Q0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDMUIsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUE7WUFDeEIsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUE7WUFDeEIsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUE7WUFDaEMsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUE7WUFDcEMsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUE7WUFDdEMsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDMUIsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFD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