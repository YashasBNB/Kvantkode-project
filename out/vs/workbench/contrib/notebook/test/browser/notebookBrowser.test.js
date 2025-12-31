/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellKind } from '../../common/notebookCommon.js';
/**
 * Return a set of ranges for the cells matching the given predicate
 */
function getRanges(cells, included) {
    const ranges = [];
    let currentRange;
    cells.forEach((cell, idx) => {
        if (included(cell)) {
            if (!currentRange) {
                currentRange = { start: idx, end: idx + 1 };
                ranges.push(currentRange);
            }
            else {
                currentRange.end = idx + 1;
            }
        }
        else {
            currentRange = undefined;
        }
    });
    return ranges;
}
suite('notebookBrowser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getRanges', function () {
        const predicate = (cell) => cell.cellKind === CellKind.Code;
        test('all code', function () {
            const cells = [{ cellKind: CellKind.Code }, { cellKind: CellKind.Code }];
            assert.deepStrictEqual(getRanges(cells, predicate), [
                { start: 0, end: 2 },
            ]);
        });
        test('none code', function () {
            const cells = [{ cellKind: CellKind.Markup }, { cellKind: CellKind.Markup }];
            assert.deepStrictEqual(getRanges(cells, predicate), []);
        });
        test('start code', function () {
            const cells = [{ cellKind: CellKind.Code }, { cellKind: CellKind.Markup }];
            assert.deepStrictEqual(getRanges(cells, predicate), [
                { start: 0, end: 1 },
            ]);
        });
        test('random', function () {
            const cells = [
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Code },
            ];
            assert.deepStrictEqual(getRanges(cells, predicate), [
                { start: 0, end: 2 },
                { start: 3, end: 4 },
                { start: 6, end: 7 },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcm93c2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tCcm93c2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUd6RDs7R0FFRztBQUNILFNBQVMsU0FBUyxDQUNqQixLQUF1QixFQUN2QixRQUEyQztJQUUzQyxNQUFNLE1BQU0sR0FBaUIsRUFBRSxDQUFBO0lBQy9CLElBQUksWUFBb0MsQ0FBQTtJQUV4QyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQzNCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQixZQUFZLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUE7Z0JBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDMUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZLEdBQUcsU0FBUyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELEtBQUssQ0FBQyxpQkFB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