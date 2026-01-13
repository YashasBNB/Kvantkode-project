/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Registry } from '../../../platform/registry/common/platform.js';
import { PaneCompositeDescriptor, Extensions, PaneComposite, } from '../../browser/panecomposite.js';
import { isFunction } from '../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('Viewlets', () => {
    class TestViewlet extends PaneComposite {
        constructor() {
            super('id', null, null, null, null, null, null, null);
        }
        layout(dimension) {
            throw new Error('Method not implemented.');
        }
        setBoundarySashes(sashes) {
            throw new Error('Method not implemented.');
        }
        createViewPaneContainer() {
            return null;
        }
    }
    test('ViewletDescriptor API', function () {
        const d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
        assert.strictEqual(d.cssClass, 'class');
        assert.strictEqual(d.order, 5);
    });
    test('Editor Aware ViewletDescriptor API', function () {
        let d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
        d = PaneCompositeDescriptor.create(TestViewlet, 'id', 'name', 'class', 5);
        assert.strictEqual(d.id, 'id');
        assert.strictEqual(d.name, 'name');
    });
    test('Viewlet extension point and registration', function () {
        assert(isFunction(Registry.as(Extensions.Viewlets).registerPaneComposite));
        assert(isFunction(Registry.as(Extensions.Viewlets).getPaneComposite));
        assert(isFunction(Registry.as(Extensions.Viewlets).getPaneComposites));
        const oldCount = Registry.as(Extensions.Viewlets).getPaneComposites()
            .length;
        const d = PaneCompositeDescriptor.create(TestViewlet, 'reg-test-id', 'name');
        Registry.as(Extensions.Viewlets).registerPaneComposite(d);
        assert(d === Registry.as(Extensions.Viewlets).getPaneComposite('reg-test-id'));
        assert.strictEqual(oldCount + 1, Registry.as(Extensions.Viewlets).getPaneComposites().length);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3ZpZXdsZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsVUFBVSxFQUVWLGFBQWEsR0FDYixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RixLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0QixNQUFNLFdBQVksU0FBUSxhQUFhO1FBQ3RDO1lBQ0MsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFLLEVBQUUsSUFBSyxFQUFFLElBQUssRUFBRSxJQUFLLEVBQUUsSUFBSyxFQUFFLElBQUssRUFBRSxJQUFLLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRVEsTUFBTSxDQUFDLFNBQWM7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFUSxpQkFBaUIsQ0FBQyxNQUF1QjtZQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUVrQix1QkFBdUI7WUFDekMsT0FBTyxJQUFLLENBQUE7UUFDYixDQUFDO0tBQ0Q7SUFFRCxJQUFJLENBQUMsdUJBQXVCLEVBQUU7UUFDN0IsTUFBTSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFB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