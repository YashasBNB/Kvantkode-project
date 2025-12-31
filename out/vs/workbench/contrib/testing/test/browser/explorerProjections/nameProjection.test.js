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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmFtZVByb2plY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9icm93c2VyL2V4cGxvcmVyUHJvamVjdGlvbnMvbmFtZVByb2plY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFHbEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXhELEtBQUssQ0FBQyw0REFBNEQsRUFBRSxHQUFHLEVBQUU7SUFDeEUsSUFBSSxPQUE0QyxDQUFBO0lBQ2hELElBQUksYUFBNEMsQ0FBQTtJQUNoRCxJQUFJLGNBQW1CLENBQUE7SUFFdkIsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzdCLGNBQWMsR0FBRztZQUNoQixnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO1lBQ2pDLGFBQWEsRUFBRSxhQUFhLENBQUMsS0FBSztZQUNsQyxZQUFZLEVBQUUs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