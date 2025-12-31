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
import { Emitter } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { TestItemTreeElement, TestTreeErrorMessage, getChildrenForParent, testIdentityProvider, } from './index.js';
import { isCollapsedInSerializedTestTree, } from './testingViewState.js';
import { refreshComputedState, } from '../../common/getComputedState.js';
import { TestId } from '../../common/testId.js';
import { ITestResultService } from '../../common/testResultService.js';
import { ITestService } from '../../common/testService.js';
import { applyTestItemUpdate, } from '../../common/testTypes.js';
const computedStateAccessor = {
    getOwnState: (i) => (i instanceof TestItemTreeElement ? i.ownState : 0 /* TestResultState.Unset */),
    getCurrentComputedState: (i) => i.state,
    setComputedState: (i, s) => (i.state = s),
    getCurrentComputedDuration: (i) => i.duration,
    getOwnDuration: (i) => (i instanceof TestItemTreeElement ? i.ownDuration : undefined),
    setComputedDuration: (i, d) => (i.duration = d),
    getChildren: (i) => Iterable.filter(i.children.values(), (t) => t instanceof TreeTestItemElement),
    *getParents(i) {
        for (let parent = i.parent; parent; parent = parent.parent) {
            yield parent;
        }
    },
};
/**
 * Test tree element element that groups be hierarchy.
 */
class TreeTestItemElement extends TestItemTreeElement {
    get description() {
        return this.test.item.description;
    }
    constructor(test, parent, addedOrRemoved) {
        super({ ...test, item: { ...test.item } }, parent);
        this.addedOrRemoved = addedOrRemoved;
        /**
         * Own, non-computed state.
         * @internal
         */
        this.ownState = 0 /* TestResultState.Unset */;
        this.updateErrorVisibility();
    }
    update(patch) {
        applyTestItemUpdate(this.test, patch);
        this.updateErrorVisibility(patch);
        this.fireChange();
    }
    fireChange() {
        this.changeEmitter.fire();
    }
    updateErrorVisibility(patch) {
        if (this.errorChild && (!this.test.item.error || patch?.item?.error)) {
            this.addedOrRemoved(this);
            this.children.delete(this.errorChild);
            this.errorChild = undefined;
        }
        if (this.test.item.error && !this.errorChild) {
            this.errorChild = new TestTreeErrorMessage(this.test.item.error, this);
            this.children.add(this.errorChild);
            this.addedOrRemoved(this);
        }
    }
}
/**
 * Projection that lists tests in their traditional tree view.
 */
let TreeProjection = class TreeProjection extends Disposable {
    /**
     * Gets root elements of the tree.
     */
    get rootsWithChildren() {
        const rootsIt = Iterable.map(this.testService.collection.rootItems, (r) => this.items.get(r.item.extId));
        return Iterable.filter(rootsIt, (r) => !!r?.children.size);
    }
    constructor(lastState, testService, results) {
        super();
        this.lastState = lastState;
        this.testService = testService;
        this.results = results;
        this.updateEmitter = new Emitter();
        this.changedParents = new Set();
        this.resortedParents = new Set();
        this.items = new Map();
        /**
         * @inheritdoc
         */
        this.onUpdate = this.updateEmitter.event;
        this._register(testService.onDidProcessDiff((diff) => this.applyDiff(diff)));
        // when test results are cleared, recalculate all state
        this._register(results.onResultsChanged((evt) => {
            if (!('removed' in evt)) {
                return;
            }
            for (const inTree of [...this.items.values()].sort((a, b) => b.depth - a.depth)) {
                const lookup = this.results.getStateById(inTree.test.item.extId)?.[1];
                inTree.ownDuration = lookup?.ownDuration;
                refreshComputedState(computedStateAccessor, inTree, lookup?.ownComputedState ?? 0 /* TestResultState.Unset */).forEach((i) => i.fireChange());
            }
        }));
        // when test states change, reflect in the tree
        this._register(results.onTestChanged((ev) => {
            if (ev.reason === 2 /* TestResultItemChangeReason.NewMessage */) {
                return; // no effect in the tree
            }
            let result = ev.item;
            // if the state is unset, or the latest run is not making the change,
            // double check that it's valid. Retire calls might cause previous
            // emit a state change for a test run that's already long completed.
            if (result.ownComputedState === 0 /* TestResultState.Unset */ || ev.result !== results.results[0]) {
                const fallback = results.getStateById(result.item.extId);
                if (fallback) {
                    result = fallback[1];
                }
            }
            const item = this.items.get(result.item.extId);
            if (!item) {
                return;
            }
            // Skip refreshing the duration if we can trivially tell it didn't change.
            const refreshDuration = ev.reason === 1 /* TestResultItemChangeReason.OwnStateChange */ &&
                ev.previousOwnDuration !== result.ownDuration;
            // For items without children, always use the computed state. They are
            // either leaves (for which it's fine) or nodes where we haven't expanded
            // children and should trust whatever the result service gives us.
            const explicitComputed = item.children.size ? undefined : result.computedState;
            item.retired = !!result.retired;
            item.ownState = result.ownComputedState;
            item.ownDuration = result.ownDuration;
            item.fireChange();
            refreshComputedState(computedStateAccessor, item, explicitComputed, refreshDuration).forEach((i) => i.fireChange());
        }));
        for (const test of testService.collection.all) {
            this.storeItem(this.createItem(test));
        }
    }
    /**
     * @inheritdoc
     */
    getElementByTestId(testId) {
        return this.items.get(testId);
    }
    /**
     * @inheritdoc
     */
    applyDiff(diff) {
        for (const op of diff) {
            switch (op.op) {
                case 0 /* TestDiffOpType.Add */: {
                    const item = this.createItem(op.item);
                    this.storeItem(item);
                    break;
                }
                case 1 /* TestDiffOpType.Update */: {
                    const patch = op.item;
                    const existing = this.items.get(patch.extId);
                    if (!existing) {
                        break;
                    }
                    // parent needs to be re-rendered on an expand update, so that its
                    // children are rewritten.
                    const needsParentUpdate = existing.test.expand === 0 /* TestItemExpandState.NotExpandable */ && patch.expand;
                    existing.update(patch);
                    if (needsParentUpdate) {
                        this.changedParents.add(existing.parent);
                    }
                    else {
                        this.resortedParents.add(existing.parent);
                    }
                    break;
                }
                case 3 /* TestDiffOpType.Remove */: {
                    const toRemove = this.items.get(op.itemId);
                    if (!toRemove) {
                        break;
                    }
                    // Removing the first element will cause the root to be hidden.
                    // Changing first-level elements will need the root to re-render if
                    // there are no other controllers with items.
                    const parent = toRemove.parent;
                    const affectsRootElement = toRemove.depth === 1 &&
                        (parent?.children.size === 1 ||
                            !Iterable.some(this.rootsWithChildren, (_, i) => i === 1));
                    this.changedParents.add(affectsRootElement ? null : parent);
                    const queue = [[toRemove]];
                    while (queue.length) {
                        for (const item of queue.pop()) {
                            if (item instanceof TreeTestItemElement) {
                                queue.push(this.unstoreItem(item));
                            }
                        }
                    }
                    if (parent instanceof TreeTestItemElement) {
                        refreshComputedState(computedStateAccessor, parent, undefined, !!parent.duration).forEach((i) => i.fireChange());
                    }
                }
            }
        }
        if (diff.length !== 0) {
            this.updateEmitter.fire();
        }
    }
    /**
     * @inheritdoc
     */
    applyTo(tree) {
        for (const parent of this.changedParents) {
            if (!parent || tree.hasElement(parent)) {
                tree.setChildren(parent, getChildrenForParent(this.lastState, this.rootsWithChildren, parent), { diffIdentityProvider: testIdentityProvider });
            }
        }
        for (const parent of this.resortedParents) {
            if (!parent || tree.hasElement(parent)) {
                tree.resort(parent, false);
            }
        }
        this.changedParents.clear();
        this.resortedParents.clear();
    }
    /**
     * @inheritdoc
     */
    expandElement(element, depth) {
        if (!(element instanceof TreeTestItemElement)) {
            return;
        }
        if (element.test.expand === 0 /* TestItemExpandState.NotExpandable */) {
            return;
        }
        this.testService.collection.expand(element.test.item.extId, depth);
    }
    createItem(item) {
        const parentId = TestId.parentId(item.item.extId);
        const parent = parentId ? this.items.get(parentId) : null;
        return new TreeTestItemElement(item, parent, (n) => this.changedParents.add(n));
    }
    unstoreItem(treeElement) {
        const parent = treeElement.parent;
        parent?.children.delete(treeElement);
        this.items.delete(treeElement.test.item.extId);
        return treeElement.children;
    }
    storeItem(treeElement) {
        treeElement.parent?.children.add(treeElement);
        this.items.set(treeElement.test.item.extId, treeElement);
        // The first element will cause the root to be shown. The first element of
        // a parent may need to re-render it for #204805.
        const affectsParent = treeElement.parent?.children.size === 1;
        const affectedParent = affectsParent ? treeElement.parent.parent : treeElement.parent;
        this.changedParents.add(affectedParent);
        if (affectedParent?.depth === 0) {
            this.changedParents.add(null);
        }
        if (treeElement.depth === 0 ||
            isCollapsedInSerializedTestTree(this.lastState, treeElement.test.item.extId) === false) {
            this.expandElement(treeElement, 0);
        }
        const prevState = this.results.getStateById(treeElement.test.item.extId)?.[1];
        if (prevState) {
            treeElement.retired = !!prevState.retired;
            treeElement.ownState = prevState.computedState;
            treeElement.ownDuration = prevState.ownDuration;
            refreshComputedState(computedStateAccessor, treeElement, undefined, !!treeElement.ownDuration).forEach((i) => i.fireChange());
        }
    }
};
TreeProjection = __decorate([
    __param(1, ITestService),
    __param(2, ITestResultService)
], TreeProjection);
export { TreeProjection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVByb2plY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvZXhwbG9yZXJQcm9qZWN0aW9ucy90cmVlUHJvamVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBR04sbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFFTiwrQkFBK0IsR0FDL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRS9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBT04sbUJBQW1CLEdBQ25CLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsTUFBTSxxQkFBcUIsR0FBMkQ7SUFDckYsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLDhCQUFzQixDQUFDO0lBQzNGLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxD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