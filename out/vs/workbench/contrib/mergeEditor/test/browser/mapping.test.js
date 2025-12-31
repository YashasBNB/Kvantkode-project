/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TextLength } from '../../../../../editor/common/core/textLength.js';
import { DocumentRangeMap, RangeMapping } from '../../browser/model/mapping.js';
suite('merge editor mapping', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('DocumentRangeMap', () => {
        const documentMap = createDocumentRangeMap([
            '1:3',
            ['0:2', '0:3'],
            '1:1',
            ['1:2', '3:3'],
            '0:2',
            ['0:2', '0:3'],
        ]);
        test('map', () => assert.deepStrictEqual(documentMap.rangeMappings.map((m) => m.toString()), ['[2:4, 2:6) -> [2:4, 2:7)', '[3:2, 4:3) -> [3:2, 6:4)', '[4:5, 4:7) -> [6:6, 6:9)']));
        function f() {
            return documentMap.project(parsePos(this.test.title)).toString();
        }
        test('1:1', function () {
            assert.deepStrictEqual(f.apply(this), '[1:1, 1:1) -> [1:1, 1:1)');
        });
        test('2:3', function () {
            assert.deepStrictEqual(f.apply(this), '[2:3, 2:3) -> [2:3, 2:3)');
        });
        test('2:4', function () {
            assert.deepStrictEqual(f.apply(this), '[2:4, 2:6) -> [2:4, 2:7)');
        });
        test('2:5', function () {
            assert.deepStrictEqual(f.apply(this), '[2:4, 2:6) -> [2:4, 2:7)');
        });
        test('2:6', function () {
            assert.deepStrictEqual(f.apply(this), '[2:6, 2:6) -> [2:7, 2:7)');
        });
        test('2:7', function () {
            assert.deepStrictEqual(f.apply(this), '[2:7, 2:7) -> [2:8, 2:8)');
        });
        test('3:1', function () {
            assert.deepStrictEqual(f.apply(this), '[3:1, 3:1) -> [3:1, 3:1)');
        });
        test('3:2', function () {
            assert.deepStrictEqual(f.apply(this), '[3:2, 4:3) -> [3:2, 6:4)');
        });
        test('4:2', function () {
            assert.deepStrictEqual(f.apply(this), '[3:2, 4:3) -> [3:2, 6:4)');
        });
        test('4:3', function () {
            assert.deepStrictEqual(f.apply(this), '[4:3, 4:3) -> [6:4, 6:4)');
        });
        test('4:4', function () {
            assert.deepStrictEqual(f.apply(this), '[4:4, 4:4) -> [6:5, 6:5)');
        });
        test('4:5', function () {
            assert.deepStrictEqual(f.apply(this), '[4:5, 4:7) -> [6:6, 6:9)');
        });
    });
});
function parsePos(str) {
    const [lineCount, columnCount] = str.split(':');
    return new Position(parseInt(lineCount, 10), parseInt(columnCount, 10));
}
function parseLengthObj(str) {
    const [lineCount, columnCount] = str.split(':');
    return new TextLength(parseInt(lineCount, 10), parseInt(columnCount, 10));
}
function toPosition(length) {
    return new Position(length.lineCount + 1, length.columnCount + 1);
}
function createDocumentRangeMap(items) {
    const mappings = [];
    let lastLen1 = new TextLength(0, 0);
    let lastLen2 = new TextLength(0, 0);
    for (const item of items) {
        if (typeof item === 'string') {
            const len = parseLengthObj(item);
            lastLen1 = lastLen1.add(len);
            lastLen2 = lastLen2.add(len);
        }
        else {
            const len1 = parseLengthObj(item[0]);
            const len2 = parseLengthObj(item[1]);
            mappings.push(new RangeMapping(Range.fromPositions(toPosition(lastLen1), toPosition(lastLen1.add(len1))), Range.fromPositions(toPosition(lastLen2), toPosition(lastLen2.add(len2)))));
            lastLen1 = lastLen1.add(len1);
            lastLen2 = lastLen2.add(len2);
        }
    }
    return new DocumentRangeMap(mappings, lastLen1.lineCount);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvdGVzdC9icm93c2VyL21hcHBpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRS9FLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sV0FBVyxHQUFHLHNCQUFzQixDQUFDO1lBQzFDLEtBQUs7WUFDTCxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7WUFDZCxLQUFLO1lBQ0wsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO1lBQ2QsS0FBSztZQUNMLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztTQUNkLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFdBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDbEQsQ0FBQywwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsQ0FBQyxDQUNwRixDQUFDLENBQUE7UUFFSCxTQUFTLENBQUM7WUFDVCxPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNsRSxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLFNBQVMsUUFBUSxDQUFDLEdBQVc7SUFDNUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9DLE9BQU8sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDeEUsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBQVc7SUFDbEMsTUFBTSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQy9DLE9BQU8sSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDMUUsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE1BQWtCO0lBQ3JDLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNsRSxDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxLQUFvQztJQUNuRSxNQUFNLFFBQVEsR0FBbUIsRUFBRSxDQUFBO0lBQ25DLElBQUksUUFBUSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuQyxJQUFJLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNoQyxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1QixRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQyxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEMsUUFBUSxDQUFDLElBQUksQ0FDWixJQUFJLFlBQVksQ0FDZixLQUFLLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ3pFLEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDekUsQ0FDRCxDQUFBO1lBQ0QsUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMxRCxDQUFDIn0=