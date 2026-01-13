/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { CoverageDetailsModel } from '../../browser/codeCoverageDecorations.js';
suite('Code Coverage Decorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const textModel = { getValueInRange: () => '' };
    const assertRanges = async (model) => await assertSnapshot(model.ranges.map((r) => ({
        range: r.range.toString(),
        count: r.metadata.detail.type === 2 /* DetailType.Branch */
            ? r.metadata.detail.detail.branches[r.metadata.detail.branch].count
            : r.metadata.detail.count,
    })));
    test('CoverageDetailsModel#1', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            {
                location: new Range(4, 0, 6, 0),
                type: 1 /* DetailType.Statement */,
                branches: [{ location: new Range(3, 0, 7, 0), count: 3 }],
                count: 4,
            },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#2', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 4, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(3, 0, 3, 5), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#3', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#4', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Position(2, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
            { location: new Position(4, 3), type: 1 /* DetailType.Statement */, count: 4 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2Jyb3dzZXIvY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcvRSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxTQUFTLEdBQUcsRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUF1QixDQUFBO0lBQ3BFLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFFLEVBQUUsQ0FDMUQsTUFBTSxjQUFjLENBQ25CLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUN6QixLQUFLLEVBQ0osQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSw4QkFBc0I7WUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxR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