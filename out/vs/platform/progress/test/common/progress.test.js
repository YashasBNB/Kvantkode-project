/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AsyncProgress } from '../../common/progress.js';
suite('Progress', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('multiple report calls are processed in sequence', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const executionOrder = [];
            const timeout = (time) => {
                return new Promise((resolve) => setTimeout(resolve, time));
            };
            const executor = async (value) => {
                executionOrder.push(`start ${value}`);
                if (value === 1) {
                    // 1 is slowest
                    await timeout(100);
                }
                else if (value === 2) {
                    // 2 is also slow
                    await timeout(50);
                }
                else {
                    // 3 is fast
                    await timeout(10);
                }
                executionOrder.push(`end ${value}`);
            };
            const progress = new AsyncProgress(executor);
            progress.report(1);
            progress.report(2);
            progress.report(3);
            await timeout(1000);
            assert.deepStrictEqual(executionOrder, [
                'start 1',
                'end 1',
                'start 2',
                'end 2',
                'start 3',
                'end 3',
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2dyZXNzL3Rlc3QvY29tbW9uL3Byb2dyZXNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV4RCxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxNQUFNLGtCQUFrQixDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0UsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFBO1lBQ25DLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7Z0JBQ2hDLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNqRSxDQUFDLENBQUE7WUFDRCxNQUFNLFFBQVEsR0FBRyxLQUFLLEVBQUUsS0FBYSxFQUFFLEVBQUU7Z0JBQ3hDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDakIsZUFBZTtvQkFDZixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQztxQkFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsaUJBQWlCO29CQUNqQixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFlBQVk7b0JBQ1osTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ2xCLENBQUM7Z0JBQ0QsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDcEMsQ0FBQyxDQUFBO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxhQUFhLENBQVMsUUFBUSxDQUFDLENBQUE7WUFFcEQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsQixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xCLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEIsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFbkIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUU7Z0JBQ3RDLFNBQVM7Z0JBQ1QsT0FBTztnQkFDUCxTQUFTO2dCQUNULE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxPQUFPO2FBQ1AsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=