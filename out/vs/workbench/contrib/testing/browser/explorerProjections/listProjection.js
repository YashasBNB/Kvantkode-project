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
import { flatTestItemDelimiter } from './display.js';
import { TestItemTreeElement, TestTreeErrorMessage, getChildrenForParent, testIdentityProvider, } from './index.js';
import { isCollapsedInSerializedTestTree, } from './testingViewState.js';
import { TestId } from '../../common/testId.js';
import { ITestResultService } from '../../common/testResultService.js';
import { ITestService } from '../../common/testService.js';
import { applyTestItemUpdate, } from '../../common/testTypes.js';
/**
 * Test tree element element that groups be hierarchy.
 */
class ListTestItemElement extends TestItemTreeElement {
    get description() {
        return this.chain.map((c) => c.item.label).join(flatTestItemDelimiter);
    }
    constructor(test, parent, chain) {
        super({ ...test, item: { ...test.item } }, parent);
        this.chain = chain;
        this.descriptionParts = [];
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
            this.children.delete(this.errorChild);
            this.errorChild = undefined;
        }
        if (this.test.item.error && !this.errorChild) {
            this.errorChild = new TestTreeErrorMessage(this.test.item.error, this);
            this.children.add(this.errorChild);
        }
    }
}
/**
 * Projection that lists tests in their traditional tree view.
 */
let ListProjection = class ListProjection extends Disposable {
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
            for (const inTree of this.items.values()) {
                // Simple logic here, because we know in this projection states
                // are never inherited.
                const lookup = this.results.getStateById(inTree.test.item.extId)?.[1];
                inTree.duration = lookup?.ownDuration;
                inTree.state = lookup?.ownComputedState || 0 /* TestResultState.Unset */;
                inTree.fireChange();
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
            item.retired = !!result.retired;
            item.state = result.computedState;
            item.duration = result.ownDuration;
            item.fireChange();
        }));
        for (const test of testService.collection.all) {
            this.storeItem(test);
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
                    this.storeItem(op.item);
                    break;
                }
                case 1 /* TestDiffOpType.Update */: {
                    this.items.get(op.item.extId)?.update(op.item);
                    break;
                }
                case 3 /* TestDiffOpType.Remove */: {
                    for (const [id, item] of this.items) {
                        if (id === op.itemId || TestId.isChild(op.itemId, id)) {
                            this.unstoreItem(item);
                        }
                    }
                    break;
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
        // We don't bother doing a very specific update like we do in the TreeProjection.
        // It's a flat list, so chances are we need to render everything anyway.
        // Let the diffIdentityProvider handle that.
        tree.setChildren(null, getChildrenForParent(this.lastState, this.rootsWithChildren, null), {
            diffIdentityProvider: testIdentityProvider,
            diffDepth: Infinity,
        });
    }
    /**
     * @inheritdoc
     */
    expandElement(element, depth) {
        if (!(element instanceof ListTestItemElement)) {
            return;
        }
        if (element.test.expand === 0 /* TestItemExpandState.NotExpandable */) {
            return;
        }
        this.testService.collection.expand(element.test.item.extId, depth);
    }
    unstoreItem(treeElement) {
        this.items.delete(treeElement.test.item.extId);
        treeElement.parent?.children.delete(treeElement);
        const parentId = TestId.fromString(treeElement.test.item.extId).parentId;
        if (!parentId) {
            return;
        }
        // create the parent if it's now its own leaf
        for (const id of parentId.idsToRoot()) {
            const parentTest = this.testService.collection.getNodeById(id.toString());
            if (parentTest) {
                if (parentTest.children.size === 0 && !this.items.has(id.toString())) {
                    this._storeItem(parentId, parentTest);
                }
                break;
            }
        }
    }
    _storeItem(testId, item) {
        const displayedParent = testId.isRoot ? null : this.items.get(item.controllerId);
        const chain = [...testId.idsFromRoot()]
            .slice(1, -1)
            .map((id) => this.testService.collection.getNodeById(id.toString()));
        const treeElement = new ListTestItemElement(item, displayedParent, chain);
        displayedParent?.children.add(treeElement);
        this.items.set(treeElement.test.item.extId, treeElement);
        if (treeElement.depth === 0 ||
            isCollapsedInSerializedTestTree(this.lastState, treeElement.test.item.extId) === false) {
            this.expandElement(treeElement, Infinity);
        }
        const prevState = this.results.getStateById(treeElement.test.item.extId)?.[1];
        if (prevState) {
            treeElement.retired = !!prevState.retired;
            treeElement.state = prevState.computedState;
            treeElement.duration = prevState.ownDuration;
        }
    }
    storeItem(item) {
        const testId = TestId.fromString(item.item.extId);
        // Remove any non-root parent of this item which is no longer a leaf.
        for (const parentId of testId.idsToRoot()) {
            if (!parentId.isRoot) {
                const prevParent = this.items.get(parentId.toString());
                if (prevParent) {
                    this.unstoreItem(prevParent);
                    break;
                }
            }
        }
        this._storeItem(testId, item);
    }
};
ListProjection = __decorate([
    __param(1, ITestService),
    __param(2, ITestResultService)
], ListProjection);
export { ListProjection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFByb2plY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL2xpc3RQcm9qZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNwRCxPQUFPLEVBR04sbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFFTiwrQkFBK0IsR0FDL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFPTixtQkFBbUIsR0FDbkIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQzs7R0FFRztBQUNILE1BQU0sbUJBQW9CLFNBQVEsbUJBQW1CO0lBS3BELElBQW9CLFdBQVc7UUFDOUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMs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