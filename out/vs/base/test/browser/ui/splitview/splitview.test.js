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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXR2aWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL3NwbGl0dmlldy9zcGxpdHZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUdOLE1BQU0sRUFDTixTQUFTLEdBQ1QsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbEYsTUFBTSxRQUFRO0lBSWIsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxJQUFZO1FBQzNCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksV0FBVyxDQUFDLElBQVk7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUdELElBQUksT0FBTztRQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQU1ELElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJ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