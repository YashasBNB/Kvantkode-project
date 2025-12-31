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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci92aWV3bGV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLFVBQVUsRUFFVixhQUFhLEdBQ2IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUYsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDdEIsTUFBTSxXQUFZLFNBQVEsYUFBYTtRQUN0QztZQUNDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSyxFQUFFLElBQUssRUFBRSxJQUFLLEVBQUUsSUFBSyxFQUFFLElBQUssRUFBRSxJQUFLLEVBQUUsSUFBSyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVRLE1BQU0sQ0FBQyxTQUFjO1lBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBRVEsaUJBQWlCLENBQUMsTUFBdUI7WUFDakQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFa0IsdUJBQXVCO1lBQ3pDLE9BQU8sSUFBSyxDQUFBO1FBQ2IsQ0FBQztLQUNEO0lBRUQsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1FBQzdCLE1BQU0sQ0FBQyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxP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