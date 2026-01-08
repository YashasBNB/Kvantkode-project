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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZ3Jlc3MvdGVzdC9jb21tb24vcHJvZ3Jlc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXhELEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xFLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvRSxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUE7WUFDbkMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtnQkFDaEMsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pFLENBQUMsQ0FBQTtZQUNELE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxLQUFhLEVBQUUsRUFBRTtnQkFDeEMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQ3JDLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNqQixlQUFlO29CQUNmLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNuQixDQUFDO3FCQUFNLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixpQkFBaUI7b0JBQ2pCLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNsQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsWUFBWTtvQkFDWixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQztnQkFDRCxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNwQyxDQUFDLENBQUE7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQWEsQ0FBUyxRQUFRLENBQUMsQ0FBQTtZQUVwRCxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xCLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsQixNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVuQixNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRTtnQkFDdEMsU0FBUztnQkFDVCxPQUFPO2dCQUNQLFNBQVM7Z0JBQ1QsT0FBTztnQkFDUCxTQUFTO2dCQUNULE9BQU87YUFDUCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==