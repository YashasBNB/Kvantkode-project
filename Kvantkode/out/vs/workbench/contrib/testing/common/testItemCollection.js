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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEl0ZW1Db2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0SXRlbUNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sbUJBQW1CLEVBR25CLGdCQUFnQixHQUtoQixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFpQnBDLE1BQU0sQ0FBTixJQUFrQixlQVFqQjtBQVJELFdBQWtCLGVBQWU7SUFDaEMseURBQU0sQ0FBQTtJQUNOLDJEQUFPLENBQUE7SUFDUCw2RkFBd0IsQ0FBQTtJQUN4QixtRUFBVyxDQUFBO0lBQ1gsMkRBQU8sQ0FBQTtJQUNQLHFEQUFJLENBQUE7SUFDSix5RUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQVJpQixlQUFlLEtBQWYsZUFBZSxRQVFoQztBQXVFRCxNQUFNLHFCQUFxQixHQUFHLENBQUksQ0FBSSxFQUFFLENBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN4RCxNQUFNLGFBQWEsR0FBK0U7SUFDakcsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUNELElBQUksRUFBRSxxQkFBcUI7SUFDM0IsS0FBSyxFQUFFLHFCQUFxQjtJQUM1QixXQUFXLEVBQUUscUJBQXFCO0lBQ2xDLEtBQUssRUFBRSxxQkFBcUI7SUFDNUIsUUFBUSxFQUFFLHFCQUFxQjtJQUMvQixJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDZCxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCxDQUFBO0FBRUQsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBR2pELENBQUE7QUFFSCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQVksRUFBRSxDQUFZLEVBQUUsRUFBRTtJQUNwRCxJQUFJLE1BQTJDLENBQUE7SUFDL0MsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sTUFBd0MsQ0FBQTtBQUNoRCxDQUFDLENBQUE7QUFjRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBNEMsU0FBUSxVQUFVO0lBTzFFLElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7SUFDekIsQ0FBQztJQU9ELFlBQTZCLE9BQXNDO1FBQ2xFLEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQStCO1FBZmxELHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pELElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUNqRCxDQUFBO1FBQ2dCLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYSxDQUFDLENBQUE7UUFPekQsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFBO1FBQzdELFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQTtRQUVyRSxTQUFJLEdBQWMsRUFBRSxDQUFBO1FBc0I5Qjs7V0FFRztRQUNhLHNCQUFpQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBckIzRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUNuQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxjQUFjLENBQUMsT0FBb0Q7UUFDN0UsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUE7UUFDOUIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBVyxjQUFjO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBT0Q7O09BRUc7SUFDSSxXQUFXO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUE7UUFDZCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRDs7T0FFRztJQUNJLFFBQVEsQ0FBQyxJQUFpQjtRQUNoQyxRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQiwwQ0FBa0MsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNsQyxJQUFJLFFBQVEsQ0FBQyxFQUFFLDBDQUFrQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNoRixRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7d0JBQ3pCLE9BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO2dCQUVELE1BQUs7WUFDTixDQUFDO1lBQ0Qsa0NBQTBCLENBQUMsQ0FBQyxDQUFDO2dCQUM1QiwyREFBMkQ7Z0JBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsSUFBSSxJQUFJLENBQUMsRUFBRSxrQ0FBMEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUM5RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDekMsT0FBTTtvQkFDUCxDQUFDO29CQUVELElBQUksSUFBSSxDQUFDLEVBQUUsK0JBQXVCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ2hGLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUN6QyxPQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVwQixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxNQUFjLEVBQUUsTUFBYztRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksUUFBUSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMzRSxRQUFRLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQTtRQUMvQixDQUFDO1FBRUQsd0VBQXdFO1FBQ3hFLDREQUE0RDtRQUM1RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLDJDQUFtQyxFQUFFLENBQUM7WUFDeEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4QyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtnQkFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUM7YUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLHlDQUFpQyxFQUFFLENBQUM7WUFDN0QsT0FBTyxRQUFRLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLEtBQUs7Z0JBQ2pELENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RGLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBQ3pELENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxlQUFlLENBQUMsUUFBMkIsRUFBRSxHQUF5QjtRQUM3RSxRQUFRLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoQjtnQkFDQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDN0QsTUFBSztZQUVOO2dCQUNDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDeEMsTUFBSztZQUVOO2dCQUNDLEtBQUssTUFBTSxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDbkMsQ0FBQztnQkFDRCxNQUFLO1lBRU47Z0JBQ0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUM5RCxNQUFLO1lBRU47Z0JBQ0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNsQyxNQUFLO1lBRU47Z0JBQ0MsSUFBSSxDQUFDLFFBQVEsQ0FBQztvQkFDYixFQUFFLCtCQUF1QjtvQkFDekIsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTt3QkFDakMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNO3FCQUNoQjtpQkFDRCxDQUFDLENBQUE7Z0JBQ0YsTUFBSztZQUVOO2dCQUNDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDeEMsTUFBSztZQUVOO2dCQUNDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxHQUFvQjtRQUMxQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDYixFQUFFLHVDQUErQjtnQkFDakMsR0FBRztnQkFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUM7YUFDMUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVLENBQUMsTUFBUyxFQUFFLE1BQXFDO1FBQ2xFLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRS9FLHVFQUF1RTtRQUN2RSx5REFBeUQ7UUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakQsSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQy9ELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUMvQywyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsUUFBUSxHQUFHO2dCQUNWLE1BQU07Z0JBQ04sTUFBTTtnQkFDTixZQUFZLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxrQ0FBa0M7b0JBQ3BFLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxHQUFHLENBQUM7b0JBQ3pCLENBQUMsQ0FBQyxTQUFTO2dCQUNaLE1BQU0sMkNBQW1DLEVBQUUsc0NBQXNDO2FBQ2pGLENBQUE7WUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUNiLEVBQUUsNEJBQW9CO2dCQUN0QixJQUFJLEVBQUU7b0JBQ0wsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTtvQkFDdkMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO29CQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO2lCQUN0QzthQUNELENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3JELE9BQU07UUFDUCxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUEsQ0FBQyx3Q0FBd0M7WUFDbkYsT0FBTSxDQUFDLFFBQVE7UUFDaEIsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNoRSxxRUFBcUU7WUFDckUsK0JBQStCO1lBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDakMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQ2hDLENBQUE7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBRXRELFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3hCLFFBQVEsQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO1FBQ25DLFFBQVEsQ0FBQyxNQUFNLDRDQUFvQyxDQUFBLENBQUMsc0NBQXNDO1FBRTFGLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixvQ0FBb0M7WUFDcEMsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUNoRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUE7WUFDbkIsQ0FBQztZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxpQ0FBeUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVyRCxnQ0FBZ0M7UUFDaEMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkQsQ0FBQztRQUNGLENBQUM7UUFFRCw4REFBOEQ7UUFDOUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQTtRQUMxQyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxxRUFBcUU7WUFDckUscUVBQXFFO1lBQ3JFLGNBQWMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQUksUUFBUSxDQUFDLE1BQU0sMkNBQW1DLEVBQUUsQ0FBQztvQkFDeEQsUUFBUSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7b0JBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQTRCLEVBQUUsT0FBNEIsRUFBRSxLQUFhO1FBQzVGLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUM7WUFDYixFQUFFLCtCQUF1QjtZQUN6QixJQUFJLEVBQUU7Z0JBQ0wsS0FBSztnQkFDTCxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7YUFDckY7U0FDRCxDQUFDLENBQUE7UUFFRixRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsR0FBYTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNwQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUNiLEVBQUUsK0JBQXVCO2dCQUN6QixHQUFHLEVBQUU7b0JBQ0osRUFBRSxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7aUJBQ3ZEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxLQUFhO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLElBQUksUUFBUSxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQztnQkFDYixFQUFFLGtDQUEwQjtnQkFDNUIsRUFBRSxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQzthQUN0RCxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxNQUFTLEVBQUUsTUFBcUM7UUFDckUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTtZQUNwQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDbkUsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsTUFBUyxFQUNULFFBQTJCLEVBQzNCLE1BQXFDO1FBRXJDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFLE1BQU0sQ0FBQTtRQUMzQixHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMzRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixNQUFTLEVBQ1QsUUFBMkIsRUFDM0IsTUFBcUM7UUFFckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRTFDLG9FQUFvRTtRQUNwRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7O09BSUc7SUFDSyxtQkFBbUIsQ0FBQyxRQUEyQjtRQUN0RCxJQUFJLFFBQTZCLENBQUE7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixRQUFRLDRDQUFvQyxDQUFBO1FBQzdDLENBQUM7YUFBTSxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFDLENBQUM7Z0JBQ0QsQ0FBQywwQ0FBa0MsQ0FBQTtRQUNyQyxDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGtCQUFrQjtnQkFDNUMsQ0FBQztnQkFDRCxDQUFDLDBDQUFrQyxDQUFBO1FBQ3JDLENBQUM7UUFFRCxJQUFJLFFBQVEsS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsT0FBTTtRQUNQLENBQUM7UUFFRCxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQTtRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ2IsRUFBRSwrQkFBdUI7WUFDekIsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtTQUM3RCxDQUFDLENBQUE7UUFFRixJQUFJLFFBQVEsMkNBQW1DLElBQUksUUFBUSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4RixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLGNBQWMsQ0FBQyxRQUEyQixFQUFFLE1BQWM7UUFDakUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBb0IsRUFBRSxDQUFBO1FBQzFDLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkYsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxRQUEyQjtRQUNsRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM3QixPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtZQUN2QixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDUixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxRQUFRLENBQUMsTUFBTSw0Q0FBb0MsQ0FBQTtRQUNuRCxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFcEMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN6RCxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQ1oseURBQXlELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLEVBQ3JGLEdBQUcsQ0FDSCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFvQyxDQUFBO1FBQ3hDLElBQUksQ0FBQztZQUNKLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUM3QixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ25DLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDZCxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLGNBQWMsQ0FBQTtJQUMvQixDQUFDO0lBRU8scUJBQXFCLENBQUMsUUFBMkI7UUFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNiLEVBQUUsK0JBQXVCO1lBQ3pCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFO1NBQ3BFLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxVQUFVLENBQUMsT0FBZTtRQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSwrQkFBdUIsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUU3RCxNQUFNLEtBQUssR0FBc0MsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1RCxPQUFPLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDeEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7WUFFeEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzlCLENBQUM7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDeEMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNoRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksU0FBUztRQUNmLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUMvQixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBY0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLEtBQUs7SUFDaEQsWUFBWSxFQUFVO1FBQ3JCLEtBQUssQ0FBQyxnREFBZ0QsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsS0FBSztJQUM5QyxZQUFZLEVBQVU7UUFDckIsS0FBSyxDQUNKLHFCQUFxQixFQUFFLHNFQUFzRSxDQUM3RixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLEtBQUs7SUFDakQsWUFBWSxFQUFVLEVBQUUsS0FBYSxFQUFFLEtBQWE7UUFDbkQsS0FBSyxDQUNKLHFCQUFxQixFQUFFLHlCQUF5QixLQUFLLGdFQUFnRSxLQUFLLElBQUksQ0FDOUgsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLENBQ3JDLEdBQW9CLEVBQ3BCLE1BQW9DLEVBQ3BDLFNBQW1CLEVBQ0ksRUFBRTtJQUN6QixJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFBO0lBRWpDLE9BQU87UUFDTixrQkFBa0I7UUFDbEIsSUFBSSxJQUFJO1lBQ1AsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ25CLENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsT0FBTyxDQUFDLFFBQWdFLEVBQUUsT0FBaUI7WUFDMUYsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUNoQixPQUFPLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN4QixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLE9BQU8sQ0FBQyxLQUFrQjtZQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFBO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sSUFBSSxHQUF5QixFQUFFLEVBQUUsOEJBQXNCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFBO1lBRXhFLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUNsQyxNQUFNLElBQUksb0JBQW9CLENBQUUsSUFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDM0QsQ0FBQztnQkFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFBO2dCQUNoRCxJQUFJLGNBQWMsS0FBSyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3pDLE1BQU0sSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQzdFLENBQUM7Z0JBRUQsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUM1QixNQUFNLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO2dCQUVELFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDNUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxnQ0FBd0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3BELENBQUM7WUFFRCxLQUFLLE1BQU0sRUFBRSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUscUNBQTZCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBRUQsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRXBCLG1FQUFtRTtZQUNuRSwyQkFBMkI7WUFDM0IsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUNuQixDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLEdBQUcsQ0FBQyxJQUFPO1lBQ1YsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sSUFBSSxvQkFBb0IsQ0FBRSxJQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQzNELENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxnQ0FBd0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxDQUFDLEVBQVU7WUFDaEIsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUscUNBQTZCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixHQUFHLENBQUMsTUFBYztZQUNqQixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxNQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ25DLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQyxDQUFBIn0=