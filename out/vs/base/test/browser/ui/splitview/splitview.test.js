/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Sizing, SplitView, } from '../../../../browser/ui/splitview/splitview.js';
import { Emitter } from '../../../../common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../common/utils.js';
class TestView {
    get minimumSize() {
        return this._minimumSize;
    }
    set minimumSize(size) {
        this._minimumSize = size;
        this._onDidChange.fire(undefined);
    }
    get maximumSize() {
        return this._maximumSize;
    }
    set maximumSize(size) {
        this._maximumSize = size;
        this._onDidChange.fire(undefined);
    }
    get element() {
        this._onDidGetElement.fire();
        return this._element;
    }
    get size() {
        return this._size;
    }
    get orthogonalSize() {
        return this._orthogonalSize;
    }
    constructor(_minimumSize, _maximumSize, priority = 0 /* LayoutPriority.Normal */) {
        this._minimumSize = _minimumSize;
        this._maximumSize = _maximumSize;
        this.priority = priority;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._element = document.createElement('div');
        this._onDidGetElement = new Emitter();
        this.onDidGetElement = this._onDidGetElement.event;
        this._size = 0;
        this._orthogonalSize = 0;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this._onDidFocus = new Emitter();
        this.onDidFocus = this._onDidFocus.event;
        assert(_minimumSize <= _maximumSize, 'splitview view minimum size must be <= maximum size');
    }
    layout(size, _offset, orthogonalSize) {
        this._size = size;
        this._orthogonalSize = orthogonalSize;
        this._onDidLayout.fire({ size, orthogonalSize });
    }
    focus() {
        this._onDidFocus.fire();
    }
    dispose() {
        this._onDidChange.dispose();
        this._onDidGetElement.dispose();
        this._onDidLayout.dispose();
        this._onDidFocus.dispose();
    }
}
function getSashes(splitview) {
    return splitview.sashItems.map((i) => i.sash);
}
suite('Splitview', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let container;
    setup(() => {
        container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.width = `${200}px`;
        container.style.height = `${200}px`;
    });
    test('empty splitview has empty DOM', () => {
        store.add(new SplitView(container));
        assert.strictEqual(container.firstElementChild.firstElementChild.childElementCount, 0, 'split view should be empty');
    });
    test('has views and sashes as children', () => {
        const view1 = store.add(new TestView(20, 20));
        const view2 = store.add(new TestView(20, 20));
        const view3 = store.add(new TestView(20, 20));
        const splitview = store.add(new SplitView(container));
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        let viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 3, 'split view should have 3 views');
        let sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 2, 'split view should have 2 sashes');
        splitview.removeView(2);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 2, 'split view should have 2 views');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 1, 'split view should have 1 sash');
        splitview.removeView(0);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 1, 'split view should have 1 view');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 0, 'split view should have no sashes');
        splitview.removeView(0);
        viewQuery = container.querySelectorAll('.monaco-split-view2 > .monaco-scrollable-element > .split-view-container > .split-view-view');
        assert.strictEqual(viewQuery.length, 0, 'split view should have no views');
        sashQuery = container.querySelectorAll('.monaco-split-view2 > .sash-container > .monaco-sash');
        assert.strictEqual(sashQuery.length, 0, 'split view should have no sashes');
    });
    test('calls view methods on addView and removeView', () => {
        const view = store.add(new TestView(20, 20));
        const splitview = store.add(new SplitView(container));
        let didLayout = false;
        store.add(view.onDidLayout(() => (didLayout = true)));
        store.add(view.onDidGetElement(() => undefined));
        splitview.addView(view, 20);
        assert.strictEqual(view.size, 20, 'view has right size');
        assert(didLayout, 'layout is called');
        assert(didLayout, 'render is called');
    });
    test('stretches view to viewport', () => {
        const view = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view, 20);
        assert.strictEqual(view.size, 200, 'view is stretched');
        splitview.layout(200);
        assert.strictEqual(view.size, 200, 'view stayed the same');
        splitview.layout(100);
        assert.strictEqual(view.size, 100, 'view is collapsed');
        splitview.layout(20);
        assert.strictEqual(view.size, 20, 'view is collapsed');
        splitview.layout(10);
        assert.strictEqual(view.size, 20, 'view is clamped');
        splitview.layout(200);
        assert.strictEqual(view.size, 200, 'view is stretched');
    });
    test('can resize views', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        assert.strictEqual(view1.size, 160, 'view1 is stretched');
        assert.strictEqual(view2.size, 20, 'view2 size is 20');
        assert.strictEqual(view3.size, 20, 'view3 size is 20');
        splitview.resizeView(1, 40);
        assert.strictEqual(view1.size, 140, 'view1 is collapsed');
        assert.strictEqual(view2.size, 40, 'view2 is stretched');
        assert.strictEqual(view3.size, 20, 'view3 stays the same');
        splitview.resizeView(0, 70);
        assert.strictEqual(view1.size, 70, 'view1 is collapsed');
        assert.strictEqual(view2.size, 40, 'view2 stays the same');
        assert.strictEqual(view3.size, 90, 'view3 is stretched');
        splitview.resizeView(2, 40);
        assert.strictEqual(view1.size, 70, 'view1 stays the same');
        assert.strictEqual(view2.size, 90, 'view2 is collapsed');
        assert.strictEqual(view3.size, 40, 'view3 is stretched');
    });
    test('reacts to view changes', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, 20);
        splitview.addView(view2, 20);
        splitview.addView(view3, 20);
        assert.strictEqual(view1.size, 160, 'view1 is stretched');
        assert.strictEqual(view2.size, 20, 'view2 size is 20');
        assert.strictEqual(view3.size, 20, 'view3 size is 20');
        view1.maximumSize = 20;
        assert.strictEqual(view1.size, 20, 'view1 is collapsed');
        assert.strictEqual(view2.size, 20, 'view2 stays the same');
        assert.strictEqual(view3.size, 160, 'view3 is stretched');
        view3.maximumSize = 40;
        assert.strictEqual(view1.size, 20, 'view1 stays the same');
        assert.strictEqual(view2.size, 140, 'view2 is stretched');
        assert.strictEqual(view3.size, 40, 'view3 is collapsed');
        view2.maximumSize = 200;
        assert.strictEqual(view1.size, 20, 'view1 stays the same');
        assert.strictEqual(view2.size, 140, 'view2 stays the same');
        assert.strictEqual(view3.size, 40, 'view3 stays the same');
        view3.maximumSize = Number.POSITIVE_INFINITY;
        view3.minimumSize = 100;
        assert.strictEqual(view1.size, 20, 'view1 is collapsed');
        assert.strictEqual(view2.size, 80, 'view2 is collapsed');
        assert.strictEqual(view3.size, 100, 'view3 is stretched');
    });
    test('sashes are properly enabled/disabled', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        const sashes = getSashes(splitview);
        assert.strictEqual(sashes.length, 2, 'there are two sashes');
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        splitview.layout(60);
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        splitview.layout(20);
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        splitview.layout(200);
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        view1.maximumSize = 20;
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
        view2.maximumSize = 20;
        assert.strictEqual(sashes[0].state, 0 /* SashState.Disabled */, 'first sash is disabled');
        assert.strictEqual(sashes[1].state, 0 /* SashState.Disabled */, 'second sash is disabled');
        view1.maximumSize = 300;
        assert.strictEqual(sashes[0].state, 1 /* SashState.AtMinimum */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 1 /* SashState.AtMinimum */, 'second sash is enabled');
        view2.maximumSize = 200;
        assert.strictEqual(sashes[0].state, 1 /* SashState.AtMinimum */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 1 /* SashState.AtMinimum */, 'second sash is enabled');
        splitview.resizeView(0, 40);
        assert.strictEqual(sashes[0].state, 3 /* SashState.Enabled */, 'first sash is enabled');
        assert.strictEqual(sashes[1].state, 3 /* SashState.Enabled */, 'second sash is enabled');
    });
    test('issue #35497', () => {
        const view1 = store.add(new TestView(160, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(66, 66));
        const splitview = store.add(new SplitView(container));
        splitview.layout(986);
        splitview.addView(view1, 142, 0);
        assert.strictEqual(view1.size, 986, 'first view is stretched');
        store.add(view2.onDidGetElement(() => {
            assert.throws(() => splitview.resizeView(1, 922));
            assert.throws(() => splitview.resizeView(1, 922));
        }));
        splitview.addView(view2, 66, 0);
        assert.strictEqual(view2.size, 66, 'second view is fixed');
        assert.strictEqual(view1.size, 986 - 66, 'first view is collapsed');
        const viewContainers = container.querySelectorAll('.split-view-view');
        assert.strictEqual(viewContainers.length, 2, 'there are two view containers');
        assert.strictEqual(viewContainers.item(0).style.height, '66px', 'second view container is 66px');
        assert.strictEqual(viewContainers.item(1).style.height, `${986 - 66}px`, 'first view container is 66px');
    });
    test('automatic size distribution', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, 50);
        assert.deepStrictEqual([view1.size, view2.size], [150, 50]);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 66, 68]);
        splitview.removeView(1, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view3.size], [100, 100]);
    });
    test('add views before layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.addView(view1, 100);
        splitview.addView(view2, 75);
        splitview.addView(view3, 25);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [67, 67, 66]);
    });
    test('split sizing', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.addView(view3, Sizing.Split(1));
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [100, 50, 50]);
    });
    test('split sizing 2', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        assert.strictEqual(view1.size, 200);
        splitview.addView(view2, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.addView(view3, Sizing.Split(0));
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [50, 100, 50]);
    });
    test('proportional layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.layout(100);
        assert.deepStrictEqual([view1.size, view2.size], [50, 50]);
    });
    test('disable proportional layout', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size], [100, 100]);
        splitview.layout(100);
        assert.deepStrictEqual([view1.size, view2.size], [80, 20]);
    });
    test('high layout priority', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 2 /* LayoutPriority.High */));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 68, 66]);
        splitview.layout(180);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 48, 66]);
        splitview.layout(124);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 20, 38]);
        splitview.layout(60);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 20, 20]);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 160, 20]);
    });
    test('low layout priority', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 1 /* LayoutPriority.Low */));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 68, 66]);
        splitview.layout(180);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [66, 48, 66]);
        splitview.layout(132);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [46, 20, 66]);
        splitview.layout(60);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 20, 20]);
        splitview.layout(200);
        assert.deepStrictEqual([view1.size, view2.size, view3.size], [20, 160, 20]);
    });
    test('context propagates to views', () => {
        const view1 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view2 = store.add(new TestView(20, Number.POSITIVE_INFINITY));
        const view3 = store.add(new TestView(20, Number.POSITIVE_INFINITY, 1 /* LayoutPriority.Low */));
        const splitview = store.add(new SplitView(container, { proportionalLayout: false }));
        splitview.layout(200);
        splitview.addView(view1, Sizing.Distribute);
        splitview.addView(view2, Sizing.Distribute);
        splitview.addView(view3, Sizing.Distribute);
        splitview.layout(200, 100);
        assert.deepStrictEqual([view1.orthogonalSize, view2.orthogonalSize, view3.orthogonalSize], [100, 100, 100]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXR2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvYnJvd3Nlci91aS9zcGxpdHZpZXcvc3BsaXR2aWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFHTixNQUFNLEVBQ04sU0FBUyxHQUNULE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWxGLE1BQU0sUUFBUTtJQUliLElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBQ0QsSUFBSSxXQUFXLENBQUMsSUFBWTtRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxJQUFZO1FBQzNCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFHRCxJQUFJLE9BQU87UUFDVixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFNRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIs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LElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxRSxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFB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