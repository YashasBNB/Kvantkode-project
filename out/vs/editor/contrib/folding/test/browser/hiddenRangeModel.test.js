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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZGVuUmFuZ2VNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy90ZXN0L2Jyb3dzZXIvaGlkZGVuUmFuZ2VNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQU9sRyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxDQUFDLENBQUMsZUFBdUIsRUFBRSxhQUFxQjtRQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxNQUFnQixFQUFFLGVBQWdDLEVBQUUsT0FBZ0I7UUFDekYsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUMzRixlQUFlLEVBQ2YsT0FBTyxDQUNQLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsTUFBTSxLQUFLLEdBQUc7WUFDYixNQUFNLENBQUMsS0FBSztZQUNaLE1BQU0sQ0FBQyxZQUFZO1lBQ25CLE1BQU0sQ0FBQyxLQUFLO1lBQ1osTUFBTSxDQUFDLFdBQVc7WUFDbEIsTUFBTSxDQUFDLGdCQUFnQjtZQUN2QixNQUFNLENBQUMsaUJBQWlCO1lBQ3hCLE1BQU0sQ0FBQyxlQUFlO1lBQ3RCLE1BQU0sQ0FBQyxPQUFPO1lBQ2QsTUFBTSxDQUFDLEtBQUs7WUFDWixPQUFPLENBQUMsR0FBRztTQUNYLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQztZQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFdkQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekQsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUUzQixZQUFZLENBQUMsbUJBQW1CLENBQUM7Z0JBQ2hDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFO2dCQUNoQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRTthQUNoQyxDQUFDLENBQUE7WUFDRixZQUFZLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRXhELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BFLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFeEQsWUFBWSxDQUFDLG1CQUFtQixDQUFDO2dCQUNoQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRTtnQkFDaEMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUU7Z0JBQ2hDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFO2FBQ2hDLENBQUMsQ0FBQTtZQUNGLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6RCxDQUFDO2dCQUFTLENBQUM7WUFDVixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==