/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ArrayEdit, MonotonousIndexTransformer, SingleArrayEdit, } from '../../browser/arrayOperation.js';
suite('array operation', () => {
    function seq(start, end) {
        const result = [];
        for (let i = start; i < end; i++) {
            result.push(i);
        }
        return result;
    }
    test('simple', () => {
        const edit = new ArrayEdit([
            new SingleArrayEdit(4, 3, 2),
            new SingleArrayEdit(8, 0, 2),
            new SingleArrayEdit(9, 2, 0),
        ]);
        const arr = seq(0, 15).map((x) => `item${x}`);
        const newArr = arr.slice();
        edit.applyToArray(newArr);
        assert.deepStrictEqual(newArr, [
            'item0',
            'item1',
            'item2',
            'item3',
            undefined,
            undefined,
            'item7',
            undefined,
            undefined,
            'item8',
            'item11',
            'item12',
            'item13',
            'item14',
        ]);
        const transformer = new MonotonousIndexTransformer(edit);
        assert.deepStrictEqual(seq(0, 15).map((x) => {
            const t = transformer.transform(x);
            let r = `arr[${x}]: ${arr[x]} -> `;
            if (t !== undefined) {
                r += `newArr[${t}]: ${newArr[t]}`;
            }
            else {
                r += 'undefined';
            }
            return r;
        }), [
            'arr[0]: item0 -> newArr[0]: item0',
            'arr[1]: item1 -> newArr[1]: item1',
            'arr[2]: item2 -> newArr[2]: item2',
            'arr[3]: item3 -> newArr[3]: item3',
            'arr[4]: item4 -> undefined',
            'arr[5]: item5 -> undefined',
            'arr[6]: item6 -> undefined',
            'arr[7]: item7 -> newArr[6]: item7',
            'arr[8]: item8 -> newArr[9]: item8',
            'arr[9]: item9 -> undefined',
            'arr[10]: item10 -> undefined',
            'arr[11]: item11 -> newArr[10]: item11',
            'arr[12]: item12 -> newArr[11]: item12',
            'arr[13]: item13 -> newArr[12]: item13',
            'arr[14]: item14 -> newArr[13]: item14',
        ]);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlPcGVyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS90ZXN0L2Jyb3dzZXIvYXJyYXlPcGVyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUNOLFNBQVMsRUFDVCwwQkFBMEIsRUFDMUIsZUFBZSxHQUNmLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixTQUFTLEdBQUcsQ0FBQyxLQUFhLEVBQUUsR0FBVztRQUN0QyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUM7WUFDMUIsSUFBSSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUIsSUFBSSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUIsSUFBSSxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDNUIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtZQUM5QixPQUFPO1lBQ1AsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsU0FBUztZQUNULFNBQVM7WUFDVCxPQUFPO1lBQ1AsU0FBUztZQUNULFNBQVM7WUFDVCxPQUFPO1lBQ1AsUUFBUTtZQUNSLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtTQUNSLENBQUMsQ0FBQTtRQUVGLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNyQixDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLENBQUMsSUFBSSxXQUFXLENBQUE7WUFDakIsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQyxDQUFDLEVBQ0Y7WUFDQyxtQ0FBbUM7WUFDbkMsbUNBQW1DO1lBQ25DLG1DQUFtQztZQUNuQyxtQ0FBbUM7WUFDbkMsNEJBQTRCO1lBQzVCLDRCQUE0QjtZQUM1Qiw0QkFBNEI7WUFDNUIsbUNBQW1DO1lBQ25DLG1DQUFtQztZQUNuQyw0QkFBNEI7WUFDNUIsOEJBQThCO1lBQzlCLHVDQUF1QztZQUN2Qyx1Q0FBdUM7WUFDdkMsdUNBQXVDO1lBQ3ZDLHVDQUF1QztTQUN2QyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==