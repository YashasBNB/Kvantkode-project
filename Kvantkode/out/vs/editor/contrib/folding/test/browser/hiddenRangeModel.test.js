/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FoldingModel } from '../../browser/foldingModel.js';
import { HiddenRangeModel } from '../../browser/hiddenRangeModel.js';
import { computeRanges } from '../../browser/indentRangeProvider.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { TestDecorationProvider } from './foldingModel.test.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Hidden Range Model', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function r(startLineNumber, endLineNumber) {
        return { startLineNumber, endLineNumber };
    }
    function assertRanges(actual, expectedRegions, message) {
        assert.deepStrictEqual(actual.map((r) => ({ startLineNumber: r.startLineNumber, endLineNumber: r.endLineNumber })), expectedRegions, message);
    }
    test('hasRanges', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    if (true) {',
            /* 7*/ '      //hello',
            /* 8*/ '    }',
            /* 9*/ '  }',
            /* 10*/ '}',
        ];
        const textModel = createTextModel(lines.join('\n'));
        const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
        const hiddenRangeModel = new HiddenRangeModel(foldingModel);
        try {
            assert.strictEqual(hiddenRangeModel.hasRanges(), false);
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            foldingModel.toggleCollapseState([
                foldingModel.getRegionAtLine(1),
                foldingModel.getRegionAtLine(6),
            ]);
            assertRanges(hiddenRangeModel.hiddenRanges, [r(2, 3), r(7, 7)]);
            assert.strictEqual(hiddenRangeModel.hasRanges(), true);
            assert.strictEqual(hiddenRangeModel.isHidden(1), false);
            assert.strictEqual(hiddenRangeModel.isHidden(2), true);
            assert.strictEqual(hiddenRangeModel.isHidden(3), true);
            assert.strictEqual(hiddenRangeModel.isHidden(4), false);
            assert.strictEqual(hiddenRangeModel.isHidden(5), false);
            assert.strictEqual(hiddenRangeModel.isHidden(6), false);
            assert.strictEqual(hiddenRangeModel.isHidden(7), true);
            assert.strictEqual(hiddenRangeModel.isHidden(8), false);
            assert.strictEqual(hiddenRangeModel.isHidden(9), false);
            assert.strictEqual(hiddenRangeModel.isHidden(10), false);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(4)]);
            assertRanges(hiddenRangeModel.hiddenRanges, [r(2, 3), r(5, 9)]);
            assert.strictEqual(hiddenRangeModel.hasRanges(), true);
            assert.strictEqual(hiddenRangeModel.isHidden(1), false);
            assert.strictEqual(hiddenRangeModel.isHidden(2), true);
            assert.strictEqual(hiddenRangeModel.isHidden(3), true);
            assert.strictEqual(hiddenRangeModel.isHidden(4), false);
            assert.strictEqual(hiddenRangeModel.isHidden(5), true);
            assert.strictEqual(hiddenRangeModel.isHidden(6), true);
            assert.strictEqual(hiddenRangeModel.isHidden(7), true);
            assert.strictEqual(hiddenRangeModel.isHidden(8), true);
            assert.strictEqual(hiddenRangeModel.isHidden(9), true);
            assert.strictEqual(hiddenRangeModel.isHidden(10), false);
            foldingModel.toggleCollapseState([
                foldingModel.getRegionAtLine(1),
                foldingModel.getRegionAtLine(6),
                foldingModel.getRegionAtLine(4),
            ]);
            assertRanges(hiddenRangeModel.hiddenRanges, []);
            assert.strictEqual(hiddenRangeModel.hasRanges(), false);
            assert.strictEqual(hiddenRangeModel.isHidden(1), false);
            assert.strictEqual(hiddenRangeModel.isHidden(2), false);
            assert.strictEqual(hiddenRangeModel.isHidden(3), false);
            assert.strictEqual(hiddenRangeModel.isHidden(4), false);
            assert.strictEqual(hiddenRangeModel.isHidden(5), false);
            assert.strictEqual(hiddenRangeModel.isHidden(6), false);
            assert.strictEqual(hiddenRangeModel.isHidden(7), false);
            assert.strictEqual(hiddenRangeModel.isHidden(8), false);
            assert.strictEqual(hiddenRangeModel.isHidden(9), false);
            assert.strictEqual(hiddenRangeModel.isHidden(10), false);
        }
        finally {
            textModel.dispose();
            hiddenRangeModel.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZGVuUmFuZ2VNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL3Rlc3QvYnJvd3Nlci9oaWRkZW5SYW5nZU1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBT2xHLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLENBQUMsQ0FBQyxlQUF1QixFQUFFLGFBQXFCO1FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLE1BQWdCLEVBQUUsZUFBZ0MsRUFBRSxPQUFnQjtRQUN6RixNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQzNGLGVBQWUsRUFDZixPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixNQUFNLEtBQUssR0FBRztZQUNiLE1BQU0sQ0FBQyxLQUFLO1lBQ1osTUFBTSxDQUFDLFlBQVk7WUFDbkIsTUFBTSxDQUFDLEtBQUs7WUFDWixNQUFNLENBQUMsV0FBVztZQUNsQixNQUFNLENBQUMsZ0JBQWdCO1lBQ3ZCLE1BQU0sQ0FBQyxpQkFBaUI7WUFDeEIsTUFBTSxDQUFDLGVBQWU7WUFDdEIsTUFBTSxDQUFDLE9BQU87WUFDZCxNQUFNLENBQUMsS0FBSztZQUNaLE9BQU8sQ0FBQyxHQUFHO1NBQ1gsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUN2RixNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUV2RCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6RCxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTNCLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQztnQkFDaEMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUU7Z0JBQ2hDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFO2FBQ2hDLENBQUMsQ0FBQTtZQUNGLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFeEQsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUV4RCxZQUFZLENBQUMsbUJBQW1CLENBQUM7Z0JBQ2hDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFO2dCQUNoQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRTtnQkFDaEMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUU7YUFDaEMsQ0FBQyxDQUFBO1lBQ0YsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pELENBQUM7Z0JBQVMsQ0FBQztZQUNWLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9