/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ListProjection } from '../../../browser/explorerProjections/listProjection.js';
import { TestId } from '../../../common/testId.js';
import { TestTreeTestHarness } from '../testObjectTree.js';
import { TestTestItem } from '../../common/testStubs.js';
suite('Workbench - Testing Explorer Hierarchal by Name Projection', () => {
    let harness;
    let onTestChanged;
    let resultsService;
    teardown(() => {
        harness.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        onTestChanged = new Emitter();
        resultsService = {
            onResultsChanged: () => undefined,
            onTestChanged: onTestChanged.event,
            getStateById: () => ({ state: { state: 0 }, computedState: 0 }),
        };
        harness = new TestTreeTestHarness((l) => new ListProjection({}, l, resultsService));
    });
    test('renders initial tree', () => {
        harness.flush();
        assert.deepStrictEqual(harness.tree.getRendered(), [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }]);
    });
    test('updates render if second test provider appears', async () => {
        harness.flush();
        harness.pushDiff({
            op: 0 /* TestDiffOpType.Add */,
            item: {
                controllerId: 'ctrl2',
                expand: 3 /* TestItemExpandState.Expanded */,
                item: new TestTestItem(new TestId(['ctrl2']), 'root2').toTestItem(),
            },
        }, {
            op: 0 /* TestDiffOpType.Add */,
            item: {
                controllerId: 'ctrl2',
                expand: 0 /* TestItemExpandState.NotExpandable */,
                item: new TestTestItem(new TestId(['ctrl2', 'id-c']), 'c', undefined).toTestItem(),
            },
        });
        assert.deepStrictEqual(harness.flush(), [
            { e: 'root', children: [{ e: 'aa' }, { e: 'ab' }, { e: 'b' }] },
            { e: 'root2', children: [{ e: 'c' }] },
        ]);
    });
    test('updates nodes if they add children', async () => {
        harness.flush();
        harness.c.root.children
            .get('id-a')
            .children.add(new TestTestItem(new TestId(['ctrlId', 'id-a', 'id-ac']), 'ac'));
        assert.deepStrictEqual(harness.flush(), [{ e: 'aa' }, { e: 'ab' }, { e: 'ac' }, { e: 'b' }]);
    });
    test('updates nodes if they remove children', async () => {
        harness.flush();
        harness.c.root.children.get('id-a').children.delete('id-ab');
        assert.deepStrictEqual(harness.flush(), [{ e: 'aa' }, { e: 'b' }]);
    });
    test('swaps when node is no longer leaf', async () => {
        harness.flush();
        harness.c.root.children
            .get('id-b')
            .children.add(new TestTestItem(new TestId(['ctrlId', 'id-b', 'id-ba']), 'ba'));
        assert.deepStrictEqual(harness.flush(), [{ e: 'aa' }, { e: 'ab' }, { e: 'ba' }]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFtZVByb2plY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2Jyb3dzZXIvZXhwbG9yZXJQcm9qZWN0aW9ucy9uYW1lUHJvamVjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUdsRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFeEQsS0FBSyxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtJQUN4RSxJQUFJLE9BQTRDLENBQUE7SUFDaEQsSUFBSSxhQUE0QyxDQUFBO0lBQ2hELElBQUksY0FBbUIsQ0FBQTtJQUV2QixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsYUFBYSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFDN0IsY0FBYyxHQUFHO1lBQ2hCLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7WUFDakMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLO1lBQ2xDLFlBQVks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