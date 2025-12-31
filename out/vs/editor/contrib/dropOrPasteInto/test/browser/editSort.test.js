/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { HierarchicalKind } from '../../../../../base/common/hierarchicalKind.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { sortEditsByYieldTo } from '../../browser/edit.js';
function createTestEdit(kind, args) {
    return {
        title: '',
        insertText: '',
        kind: new HierarchicalKind(kind),
        ...args,
    };
}
suite('sortEditsByYieldTo', () => {
    test('Should noop for empty edits', () => {
        const edits = [];
        assert.deepStrictEqual(sortEditsByYieldTo(edits), []);
    });
    test('Yielded to edit should get sorted after target', () => {
        const edits = [
            createTestEdit('a', { yieldTo: [{ kind: new HierarchicalKind('b') }] }),
            createTestEdit('b'),
        ];
        assert.deepStrictEqual(sortEditsByYieldTo(edits).map((x) => x.kind?.value), ['b', 'a']);
    });
    test('Should handle chain of yield to', () => {
        {
            const edits = [
                createTestEdit('c', { yieldTo: [{ kind: new HierarchicalKind('a') }] }),
                createTestEdit('a', { yieldTo: [{ kind: new HierarchicalKind('b') }] }),
                createTestEdit('b'),
            ];
            assert.deepStrictEqual(sortEditsByYieldTo(edits).map((x) => x.kind?.value), ['b', 'a', 'c']);
        }
        {
            const edits = [
                createTestEdit('a', { yieldTo: [{ kind: new HierarchicalKind('b') }] }),
                createTestEdit('c', { yieldTo: [{ kind: new HierarchicalKind('a') }] }),
                createTestEdit('b'),
            ];
            assert.deepStrictEqual(sortEditsByYieldTo(edits).map((x) => x.kind?.value), ['b', 'a', 'c']);
        }
    });
    test(`Should not reorder when yield to isn't used`, () => {
        const edits = [
            createTestEdit('c', { yieldTo: [{ kind: new HierarchicalKind('x') }] }),
            createTestEdit('a', { yieldTo: [{ kind: new HierarchicalKind('y') }] }),
            createTestEdit('b'),
        ];
        assert.deepStrictEqual(sortEditsByYieldTo(edits).map((x) => x.kind?.value), ['c', 'a', 'b']);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvcnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by90ZXN0L2Jyb3dzZXIvZWRpdFNvcnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFMUQsU0FBUyxjQUFjLENBQUMsSUFBWSxFQUFFLElBQWdDO0lBQ3JFLE9BQU87UUFDTixLQUFLLEVBQUUsRUFBRTtRQUNULFVBQVUsRUFBRSxFQUFFO1FBQ2QsSUFBSSxFQUFFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1FBQ2hDLEdBQUcsSUFBSTtLQUNQLENBQUE7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7UUFFcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN0RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7UUFDM0QsTUFBTSxLQUFLLEdBQXVCO1lBQ2pDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMs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