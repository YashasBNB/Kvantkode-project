/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Barrier, isThenable, RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { assertNever } from '../../../../base/common/assert.js';
import { applyTestItemUpdate, namespaceTestTag, } from './testTypes.js';
import { TestId } from './testId.js';
export var TestItemEventOp;
(function (TestItemEventOp) {
    TestItemEventOp[TestItemEventOp["Upsert"] = 0] = "Upsert";
    TestItemEventOp[TestItemEventOp["SetTags"] = 1] = "SetTags";
    TestItemEventOp[TestItemEventOp["UpdateCanResolveChildren"] = 2] = "UpdateCanResolveChildren";
    TestItemEventOp[TestItemEventOp["RemoveChild"] = 3] = "RemoveChild";
    TestItemEventOp[TestItemEventOp["SetProp"] = 4] = "SetProp";
    TestItemEventOp[TestItemEventOp["Bulk"] = 5] = "Bulk";
    TestItemEventOp[TestItemEventOp["DocumentSynced"] = 6] = "DocumentSynced";
})(TestItemEventOp || (TestItemEventOp = {}));
const strictEqualComparator = (a, b) => a === b;
const diffableProps = {
    range: (a, b) => {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.equalsRange(b);
    },
    busy: strictEqualComparator,
    label: strictEqualComparator,
    description: strictEqualComparator,
    error: strictEqualComparator,
    sortText: strictEqualComparator,
    tags: (a, b) => {
        if (a.length !== b.length) {
            return false;
        }
        if (a.some((t1) => !b.includes(t1))) {
            return false;
        }
        return true;
    },
};
const diffableEntries = Object.entries(diffableProps);
const diffTestItems = (a, b) => {
    let output;
    for (const [key, cmp] of diffableEntries) {
        if (!cmp(a[key], b[key])) {
            if (output) {
                output[key] = b[key];
            }
            else {
                output = { [key]: b[key] };
            }
        }
    }
    return output;
};
/**
 * Maintains a collection of test items for a single controller.
 */
export class TestItemCollection extends Disposable {
    get root() {
        return this.options.root;
    }
    constructor(options) {
        super();
        this.options = options;
        this.debounceSendDiff = this._register(new RunOnceScheduler(() => this.flushDiff(), 200));
        this.diffOpEmitter = this._register(new Emitter());
        this.tree = new Map();
        this.tags = new Map();
        this.diff = [];
        /**
         * Fires when an operation happens that should result in a diff.
         */
        this.onDidGenerateDiff = this.diffOpEmitter.event;
        this.root.canResolveChildren = true;
        this.upsertItem(this.root, undefined);
    }
    /**
     * Handler used for expanding test items.
     */
    set resolveHandler(handler) {
        this._resolveHandler = handler;
        for (const test of this.tree.values()) {
            this.updateExpandability(test);
        }
    }
    get resolveHandler() {
        return this._resolveHandler;
    }
    /**
     * Gets a diff of all changes that have been made, and clears the diff queue.
     */
    collectDiff() {
        const diff = this.diff;
        this.diff = [];
        return diff;
    }
    /**
     * Pushes a new diff entry onto the collected diff list.
     */
    pushDiff(diff) {
        switch (diff.op) {
            case 2 /* TestDiffOpType.DocumentSynced */: {
                for (const existing of this.diff) {
                    if (existing.op === 2 /* TestDiffOpType.DocumentSynced */ && existing.uri === diff.uri) {
                        existing.docv = diff.docv;
                        return;
                    }
                }
                break;
            }
            case 1 /* TestDiffOpType.Update */: {
                // Try to merge updates, since they're invoked per-property
                const last = this.diff[this.diff.length - 1];
                if (last) {
                    if (last.op === 1 /* TestDiffOpType.Update */ && last.item.extId === diff.item.extId) {
                        applyTestItemUpdate(last.item, diff.item);
                        return;
                    }
                    if (last.op === 0 /* TestDiffOpType.Add */ && last.item.item.extId === diff.item.extId) {
                        applyTestItemUpdate(last.item, diff.item);
                        return;
                    }
                }
                break;
            }
        }
        this.diff.push(diff);
        if (!this.debounceSendDiff.isScheduled()) {
            this.debounceSendDiff.schedule();
        }
    }
    /**
     * Expands the test and the given number of `levels` of children. If levels
     * is < 0, then all children will be expanded. If it's 0, then only this
     * item will be expanded.
     */
    expand(testId, levels) {
        const internal = this.tree.get(testId);
        if (!internal) {
            return;
        }
        if (internal.expandLevels === undefined || levels > internal.expandLevels) {
            internal.expandLevels = levels;
        }
        // try to avoid awaiting things if the provider returns synchronously in
        // order to keep everything in a single diff and DOM update.
        if (internal.expand === 1 /* TestItemExpandState.Expandable */) {
            const r = this.resolveChildren(internal);
            return !r.isOpen()
                ? r.wait().then(() => this.expandChildren(internal, levels - 1))
                : this.expandChildren(internal, levels - 1);
        }
        else if (internal.expand === 3 /* TestItemExpandState.Expanded */) {
            return internal.resolveBarrier?.isOpen() === false
                ? internal.resolveBarrier.wait().then(() => this.expandChildren(internal, levels - 1))
                : this.expandChildren(internal, levels - 1);
        }
    }
    dispose() {
        for (const item of this.tree.values()) {
            this.options.getApiFor(item.actual).listener = undefined;
        }
        this.tree.clear();
        this.diff = [];
        super.dispose();
    }
    onTestItemEvent(internal, evt) {
        switch (evt.op) {
            case 3 /* TestItemEventOp.RemoveChild */:
                this.removeItem(TestId.joinToString(internal.fullId, evt.id));
                break;
            case 0 /* TestItemEventOp.Upsert */:
                this.upsertItem(evt.item, internal);
                break;
            case 5 /* TestItemEventOp.Bulk */:
                for (const op of evt.ops) {
                    this.onTestItemEvent(internal, op);
                }
                break;
            case 1 /* TestItemEventOp.SetTags */:
                this.diffTagRefs(evt.new, evt.old, internal.fullId.toString());
                break;
            case 2 /* TestItemEventOp.UpdateCanResolveChildren */:
                this.updateExpandability(internal);
                break;
            case 4 /* TestItemEventOp.SetProp */:
                this.pushDiff({
                    op: 1 /* TestDiffOpType.Update */,
                    item: {
                        extId: internal.fullId.toString(),
                        item: evt.update,
                    },
                });
                break;
            case 6 /* TestItemEventOp.DocumentSynced */:
                this.documentSynced(internal.actual.uri);
                break;
            default:
                assertNever(evt);
        }
    }
    documentSynced(uri) {
        if (uri) {
            this.pushDiff({
                op: 2 /* TestDiffOpType.DocumentSynced */,
                uri,
                docv: this.options.getDocumentVersion(uri),
            });
        }
    }
    upsertItem(actual, parent) {
        const fullId = TestId.fromExtHostTestItem(actual, this.root.id, parent?.actual);
        // If this test item exists elsewhere in the tree already (exists at an
        // old ID with an existing parent), remove that old item.
        const privateApi = this.options.getApiFor(actual);
        if (privateApi.parent && privateApi.parent !== parent?.actual) {
            this.options.getChildren(privateApi.parent).delete(actual.id);
        }
        let internal = this.tree.get(fullId.toString());
        // Case 1: a brand new item
        if (!internal) {
            internal = {
                fullId,
                actual,
                expandLevels: parent?.expandLevels /* intentionally undefined or 0 */
                    ? parent.expandLevels - 1
                    : undefined,
                expand: 0 /* TestItemExpandState.NotExpandable */, // updated by `connectItemAndChildren`
            };
            actual.tags.forEach(this.incrementTagRefs, this);
            this.tree.set(internal.fullId.toString(), internal);
            this.setItemParent(actual, parent);
            this.pushDiff({
                op: 0 /* TestDiffOpType.Add */,
                item: {
                    controllerId: this.options.controllerId,
                    expand: internal.expand,
                    item: this.options.toITestItem(actual),
                },
            });
            this.connectItemAndChildren(actual, internal, parent);
            return;
        }
        // Case 2: re-insertion of an existing item, no-op
        if (internal.actual === actual) {
            this.connectItem(actual, internal, parent); // re-connect in case the parent changed
            return; // no-op
        }
        // Case 3: upsert of an existing item by ID, with a new instance
        if (internal.actual.uri?.toString() !== actual.uri?.toString()) {
            // If the item has a new URI, re-insert it; we don't support updating
            // URIs on existing test items.
            this.removeItem(fullId.toString());
            return this.upsertItem(actual, parent);
        }
        const oldChildren = this.options.getChildren(internal.actual);
        const oldActual = internal.actual;
        const update = diffTestItems(this.options.toITestItem(oldActual), this.options.toITestItem(actual));
        this.options.getApiFor(oldActual).listener = undefined;
        internal.actual = actual;
        internal.resolveBarrier = undefined;
        internal.expand = 0 /* TestItemExpandState.NotExpandable */; // updated by `connectItemAndChildren`
        if (update) {
            // tags are handled in a special way
            if (update.hasOwnProperty('tags')) {
                this.diffTagRefs(actual.tags, oldActual.tags, fullId.toString());
                delete update.tags;
            }
            this.onTestItemEvent(internal, { op: 4 /* TestItemEventOp.SetProp */, update });
        }
        this.connectItemAndChildren(actual, internal, parent);
        // Remove any orphaned children.
        for (const [_, child] of oldChildren) {
            if (!this.options.getChildren(actual).get(child.id)) {
                this.removeItem(TestId.joinToString(fullId, child.id));
            }
        }
        // Re-expand the element if it was previous expanded (#207574)
        const expandLevels = internal.expandLevels;
        if (expandLevels !== undefined) {
            // Wait until a microtask to allow the extension to finish setting up
            // properties of the element and children before we ask it to expand.
            queueMicrotask(() => {
                if (internal.expand === 1 /* TestItemExpandState.Expandable */) {
                    internal.expandLevels = undefined;
                    this.expand(fullId.toString(), expandLevels);
                }
            });
        }
        // Mark ranges in the document as synced (#161320)
        this.documentSynced(internal.actual.uri);
    }
    diffTagRefs(newTags, oldTags, extId) {
        const toDelete = new Set(oldTags.map((t) => t.id));
        for (const tag of newTags) {
            if (!toDelete.delete(tag.id)) {
                this.incrementTagRefs(tag);
            }
        }
        this.pushDiff({
            op: 1 /* TestDiffOpType.Update */,
            item: {
                extId,
                item: { tags: newTags.map((v) => namespaceTestTag(this.options.controllerId, v.id)) },
            },
        });
        toDelete.forEach(this.decrementTagRefs, this);
    }
    incrementTagRefs(tag) {
        const existing = this.tags.get(tag.id);
        if (existing) {
            existing.refCount++;
        }
        else {
            this.tags.set(tag.id, { refCount: 1 });
            this.pushDiff({
                op: 6 /* TestDiffOpType.AddTag */,
                tag: {
                    id: namespaceTestTag(this.options.controllerId, tag.id),
                },
            });
        }
    }
    decrementTagRefs(tagId) {
        const existing = this.tags.get(tagId);
        if (existing && !--existing.refCount) {
            this.tags.delete(tagId);
            this.pushDiff({
                op: 7 /* TestDiffOpType.RemoveTag */,
                id: namespaceTestTag(this.options.controllerId, tagId),
            });
        }
    }
    setItemParent(actual, parent) {
        this.options.getApiFor(actual).parent =
            parent && parent.actual !== this.root ? parent.actual : undefined;
    }
    connectItem(actual, internal, parent) {
        this.setItemParent(actual, parent);
        const api = this.options.getApiFor(actual);
        api.parent = parent?.actual;
        api.listener = (evt) => this.onTestItemEvent(internal, evt);
        this.updateExpandability(internal);
    }
    connectItemAndChildren(actual, internal, parent) {
        this.connectItem(actual, internal, parent);
        // Discover any existing children that might have already been added
        for (const [_, child] of this.options.getChildren(actual)) {
            this.upsertItem(child, internal);
        }
    }
    /**
     * Updates the `expand` state of the item. Should be called whenever the
     * resolved state of the item changes. Can automatically expand the item
     * if requested by a consumer.
     */
    updateExpandability(internal) {
        let newState;
        if (!this._resolveHandler) {
            newState = 0 /* TestItemExpandState.NotExpandable */;
        }
        else if (internal.resolveBarrier) {
            newState = internal.resolveBarrier.isOpen()
                ? 3 /* TestItemExpandState.Expanded */
                : 2 /* TestItemExpandState.BusyExpanding */;
        }
        else {
            newState = internal.actual.canResolveChildren
                ? 1 /* TestItemExpandState.Expandable */
                : 0 /* TestItemExpandState.NotExpandable */;
        }
        if (newState === internal.expand) {
            return;
        }
        internal.expand = newState;
        this.pushDiff({
            op: 1 /* TestDiffOpType.Update */,
            item: { extId: internal.fullId.toString(), expand: newState },
        });
        if (newState === 1 /* TestItemExpandState.Expandable */ && internal.expandLevels !== undefined) {
            this.resolveChildren(internal);
        }
    }
    /**
     * Expands all children of the item, "levels" deep. If levels is 0, only
     * the children will be expanded. If it's 1, the children and their children
     * will be expanded. If it's <0, it's a no-op.
     */
    expandChildren(internal, levels) {
        if (levels < 0) {
            return;
        }
        const expandRequests = [];
        for (const [_, child] of this.options.getChildren(internal.actual)) {
            const promise = this.expand(TestId.joinToString(internal.fullId, child.id), levels);
            if (isThenable(promise)) {
                expandRequests.push(promise);
            }
        }
        if (expandRequests.length) {
            return Promise.all(expandRequests).then(() => { });
        }
    }
    /**
     * Calls `discoverChildren` on the item, refreshing all its tests.
     */
    resolveChildren(internal) {
        if (internal.resolveBarrier) {
            return internal.resolveBarrier;
        }
        if (!this._resolveHandler) {
            const b = new Barrier();
            b.open();
            return b;
        }
        internal.expand = 2 /* TestItemExpandState.BusyExpanding */;
        this.pushExpandStateUpdate(internal);
        const barrier = (internal.resolveBarrier = new Barrier());
        const applyError = (err) => {
            console.error(`Unhandled error in resolveHandler of test controller "${this.options.controllerId}"`, err);
        };
        let r;
        try {
            r = this._resolveHandler(internal.actual === this.root ? undefined : internal.actual);
        }
        catch (err) {
            applyError(err);
        }
        if (isThenable(r)) {
            r.catch(applyError).then(() => {
                barrier.open();
                this.updateExpandability(internal);
            });
        }
        else {
            barrier.open();
            this.updateExpandability(internal);
        }
        return internal.resolveBarrier;
    }
    pushExpandStateUpdate(internal) {
        this.pushDiff({
            op: 1 /* TestDiffOpType.Update */,
            item: { extId: internal.fullId.toString(), expand: internal.expand },
        });
    }
    removeItem(childId) {
        const childItem = this.tree.get(childId);
        if (!childItem) {
            throw new Error('attempting to remove non-existent child');
        }
        this.pushDiff({ op: 3 /* TestDiffOpType.Remove */, itemId: childId });
        const queue = [childItem];
        while (queue.length) {
            const item = queue.pop();
            if (!item) {
                continue;
            }
            this.options.getApiFor(item.actual).listener = undefined;
            for (const tag of item.actual.tags) {
                this.decrementTagRefs(tag.id);
            }
            this.tree.delete(item.fullId.toString());
            for (const [_, child] of this.options.getChildren(item.actual)) {
                queue.push(this.tree.get(TestId.joinToString(item.fullId, child.id)));
            }
        }
    }
    /**
     * Immediately emits any pending diffs on the collection.
     */
    flushDiff() {
        const diff = this.collectDiff();
        if (diff.length) {
            this.diffOpEmitter.fire(diff);
        }
    }
}
export class DuplicateTestItemError extends Error {
    constructor(id) {
        super(`Attempted to insert a duplicate test item ID ${id}`);
    }
}
export class InvalidTestItemError extends Error {
    constructor(id) {
        super(`TestItem with ID "${id}" is invalid. Make sure to create it from the createTestItem method.`);
    }
}
export class MixedTestItemController extends Error {
    constructor(id, ctrlA, ctrlB) {
        super(`TestItem with ID "${id}" is from controller "${ctrlA}" and cannot be added as a child of an item from controller "${ctrlB}".`);
    }
}
export const createTestItemChildren = (api, getApi, checkCtor) => {
    let mapped = new Map();
    return {
        /** @inheritdoc */
        get size() {
            return mapped.size;
        },
        /** @inheritdoc */
        forEach(callback, thisArg) {
            for (const item of mapped.values()) {
                callback.call(thisArg, item, this);
            }
        },
        /** @inheritdoc */
        [Symbol.iterator]() {
            return mapped.entries();
        },
        /** @inheritdoc */
        replace(items) {
            const newMapped = new Map();
            const toDelete = new Set(mapped.keys());
            const bulk = { op: 5 /* TestItemEventOp.Bulk */, ops: [] };
            for (const item of items) {
                if (!(item instanceof checkCtor)) {
                    throw new InvalidTestItemError(item.id);
                }
                const itemController = getApi(item).controllerId;
                if (itemController !== api.controllerId) {
                    throw new MixedTestItemController(item.id, itemController, api.controllerId);
                }
                if (newMapped.has(item.id)) {
                    throw new DuplicateTestItemError(item.id);
                }
                newMapped.set(item.id, item);
                toDelete.delete(item.id);
                bulk.ops.push({ op: 0 /* TestItemEventOp.Upsert */, item });
            }
            for (const id of toDelete.keys()) {
                bulk.ops.push({ op: 3 /* TestItemEventOp.RemoveChild */, id });
            }
            api.listener?.(bulk);
            // important mutations come after firing, so if an error happens no
            // changes will be "saved":
            mapped = newMapped;
        },
        /** @inheritdoc */
        add(item) {
            if (!(item instanceof checkCtor)) {
                throw new InvalidTestItemError(item.id);
            }
            mapped.set(item.id, item);
            api.listener?.({ op: 0 /* TestItemEventOp.Upsert */, item });
        },
        /** @inheritdoc */
        delete(id) {
            if (mapped.delete(id)) {
                api.listener?.({ op: 3 /* TestItemEventOp.RemoveChild */, id });
            }
        },
        /** @inheritdoc */
        get(itemId) {
            return mapped.get(itemId);
        },
        /** JSON serialization function. */
        toJSON() {
            return Array.from(mapped.values());
        },
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEl0ZW1Db2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdEl0ZW1Db2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUNOLG1CQUFtQixFQUduQixnQkFBZ0IsR0FLaEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBaUJwQyxNQUFNLENBQU4sSUFBa0IsZUFRakI7QUFSRCxXQUFrQixlQUFlO0lBQ2hDLHlEQUFNLENBQUE7SUFDTiwyREFBTyxDQUFBO0lBQ1AsNkZBQXdCLENBQUE7SUFDeEIsbUVBQVcsQ0FBQTtJQUNYLDJEQUFPLENBQUE7SUFDUCxxREFBSSxDQUFBO0lBQ0oseUVBQWMsQ0FBQTtBQUNmLENBQUMsRUFSaUIsZUFBZSxLQUFmLGVBQWUsUUFRaEM7QUF1RUQsTUFBTSxxQkFBcUIsR0FBRyxDQUFJLENBQUksRUFBRSxDQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDeEQsTUFBTSxhQUFhLEdBQStFO0lBQ2pHLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2IsT0FBTyxJQUFJ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