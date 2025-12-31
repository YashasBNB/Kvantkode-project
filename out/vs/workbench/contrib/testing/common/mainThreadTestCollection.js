/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { AbstractIncrementalTestCollection, } from './testTypes.js';
export class MainThreadTestCollection extends AbstractIncrementalTestCollection {
    /**
     * @inheritdoc
     */
    get busyProviders() {
        return this.busyControllerCount;
    }
    /**
     * @inheritdoc
     */
    get rootItems() {
        return this.roots;
    }
    /**
     * @inheritdoc
     */
    get all() {
        return this.getIterator();
    }
    get rootIds() {
        return Iterable.map(this.roots.values(), (r) => r.item.extId);
    }
    constructor(uriIdentityService, expandActual) {
        super(uriIdentityService);
        this.expandActual = expandActual;
        this.testsByUrl = new ResourceMap();
        this.busyProvidersChangeEmitter = new Emitter();
        this.expandPromises = new WeakMap();
        this.onBusyProvidersChange = this.busyProvidersChangeEmitter.event;
        this.changeCollector = {
            add: (node) => {
                if (!node.item.uri) {
                    return;
                }
                const s = this.testsByUrl.get(node.item.uri);
                if (!s) {
                    this.testsByUrl.set(node.item.uri, new Set([node]));
                }
                else {
                    s.add(node);
                }
            },
            remove: (node) => {
                if (!node.item.uri) {
                    return;
                }
                const s = this.testsByUrl.get(node.item.uri);
                if (!s) {
                    return;
                }
                s.delete(node);
                if (s.size === 0) {
                    this.testsByUrl.delete(node.item.uri);
                }
            },
        };
    }
    /**
     * @inheritdoc
     */
    expand(testId, levels) {
        const test = this.items.get(testId);
        if (!test) {
            return Promise.resolve();
        }
        // simple cache to avoid duplicate/unnecessary expansion calls
        const existing = this.expandPromises.get(test);
        if (existing && existing.pendingLvl >= levels) {
            return existing.prom;
        }
        const prom = this.expandActual(test.item.extId, levels);
        const record = { doneLvl: existing ? existing.doneLvl : -1, pendingLvl: levels, prom };
        this.expandPromises.set(test, record);
        return prom.then(() => {
            record.doneLvl = levels;
        });
    }
    /**
     * @inheritdoc
     */
    getNodeById(id) {
        return this.items.get(id);
    }
    /**
     * @inheritdoc
     */
    getNodeByUrl(uri) {
        return this.testsByUrl.get(uri) || Iterable.empty();
    }
    /**
     * @inheritdoc
     */
    getReviverDiff() {
        const ops = [
            { op: 4 /* TestDiffOpType.IncrementPendingExtHosts */, amount: this.pendingRootCount },
        ];
        const queue = [this.rootIds];
        while (queue.length) {
            for (const child of queue.pop()) {
                const item = this.items.get(child);
                ops.push({
                    op: 0 /* TestDiffOpType.Add */,
                    item: {
                        controllerId: item.controllerId,
                        expand: item.expand,
                        item: item.item,
                    },
                });
                queue.push(item.children);
            }
        }
        return ops;
    }
    /**
     * Applies the diff to the collection.
     */
    apply(diff) {
        const prevBusy = this.busyControllerCount;
        super.apply(diff);
        if (prevBusy !== this.busyControllerCount) {
            this.busyProvidersChangeEmitter.fire(this.busyControllerCount);
        }
    }
    /**
     * Clears everything from the collection, and returns a diff that applies
     * that action.
     */
    clear() {
        const ops = [];
        for (const root of this.roots) {
            ops.push({ op: 3 /* TestDiffOpType.Remove */, itemId: root.item.extId });
        }
        this.roots.clear();
        this.items.clear();
        return ops;
    }
    /**
     * @override
     */
    createItem(internal) {
        return { ...internal, children: new Set() };
    }
    createChangeCollector() {
        return this.changeCollector;
    }
    *getIterator() {
        const queue = new LinkedList();
        queue.push(this.rootIds);
        while (queue.size > 0) {
            for (const id of queue.pop()) {
                const node = this.getNodeById(id);
                yield node;
                queue.push(node.children);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlc3RDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vbWFpblRocmVhZFRlc3RDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUc1RCxPQUFPLEVBQ04saUNBQWlDLEdBT2pDLE1BQU0sZ0JBQWdCLENBQUE7QUFFdkIsTUFBTSxPQUFPLHdCQUNaLFNBQVEsaUNBQWdFO0lBZXhFOztPQUVHO0lBQ0gsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxHQUFHO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQVcsT0FBTztRQUNqQixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0lBSUQsWUFDQyxrQkFBeUMsRUFDeEIsWUFBMkQ7UUFFNUUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENB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