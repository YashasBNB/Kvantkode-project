/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Iterable } from '../../common/iterator.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Iterable', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const customIterable = new (class {
        *[Symbol.iterator]() {
            yield 'one';
            yield 'two';
            yield 'three';
        }
    })();
    test('first', function () {
        assert.strictEqual(Iterable.first([]), undefined);
        assert.strictEqual(Iterable.first([1]), 1);
        assert.strictEqual(Iterable.first(customIterable), 'one');
        assert.strictEqual(Iterable.first(customIterable), 'one'); // fresh
    });
    test('wrap', function () {
        assert.deepStrictEqual([...Iterable.wrap(1)], [1]);
        assert.deepStrictEqual([...Iterable.wrap([1, 2, 3])], [1, 2, 3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vaXRlcmF0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsVUFBVSxFQUFFO0lBQ2pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzNCLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1lBQ2pCLE1BQU0sS0FBSyxDQUFBO1lBQ1gsTUFBTSxLQUFLLENBQUE7WUFDWCxNQUFNLE9BQU8sQ0FBQTtRQUNkLENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBLENBQUMsUUFBUTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=