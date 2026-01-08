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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcm93c2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0Jyb3dzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3pEOztHQUVHO0FBQ0gsU0FBUyxTQUFTLENBQ2pCLEtBQXVCLEVBQ3ZCLFFBQTJDO0lBRTNDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUE7SUFDL0IsSUFBSSxZQUFvQyxDQUFBO0lBRXhDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLFlBQVksR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQTtnQkFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMxQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxTQUFTLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsS0FBSyxDQUFD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