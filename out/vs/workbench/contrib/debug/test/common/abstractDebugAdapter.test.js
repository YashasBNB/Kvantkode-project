/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockDebugAdapter } from './mockDebug.js';
suite('Debug - AbstractDebugAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('event ordering', () => {
        let adapter;
        let output;
        setup(() => {
            adapter = new MockDebugAdapter();
            output = [];
            adapter.onEvent((ev) => {
                output.push(ev.body.output);
                Promise.resolve().then(() => output.push('--end microtask--'));
            });
        });
        const evaluate = async (expression) => {
            await new Promise((resolve) => adapter.sendRequest('evaluate', { expression }, resolve));
            output.push(`=${expression}`);
            Promise.resolve().then(() => output.push('--end microtask--'));
        };
        test('inserts task boundary before response', async () => {
            await evaluate('before.foo');
            await timeout(0);
            assert.deepStrictEqual(output, [
                'before.foo',
                '--end microtask--',
                '=before.foo',
                '--end microtask--',
            ]);
        });
        test('inserts task boundary after response', async () => {
            await evaluate('after.foo');
            await timeout(0);
            assert.deepStrictEqual(output, [
                '=after.foo',
                '--end microtask--',
                'after.foo',
                '--end microtask--',
            ]);
        });
        test('does not insert boundaries between events', async () => {
            adapter.sendEventBody('output', { output: 'a' });
            adapter.sendEventBody('output', { output: 'b' });
            adapter.sendEventBody('output', { output: 'c' });
            await timeout(0);
            assert.deepStrictEqual(output, [
                'a',
                'b',
                'c',
                '--end microtask--',
                '--end microtask--',
                '--end microtask--',
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3REZWJ1Z0FkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvY29tbW9uL2Fic3RyYWN0RGVidWdBZGFwdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUVqRCxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBQzFDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLE9BQXlCLENBQUE7UUFDN0IsSUFBSSxNQUFnQixDQUFBO1FBQ3BCLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixPQUFPLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO1lBQ2hDLE1BQU0sR0FBRyxFQUFFLENBQUE7WUFDWCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUUsRUFBZ0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzFELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7WUFDL0QsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxVQUFrQixFQUFFLEVBQUU7WUFDN0MsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQzdCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFDL0QsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELE1BQU0sUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzVCLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWhCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO2dCQUM5QixZQUFZO2dCQUNaLG1CQUFtQjtnQkFDbkIsYUFBYTtnQkFDYixtQkFBbUI7YUFDbkIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDM0IsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFaEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLFlBQVk7Z0JBQ1osbUJBQW1CO2dCQUNuQixXQUFXO2dCQUNYLG1CQUFtQjthQUNuQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDaEQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUNoRCxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVoQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtnQkFDOUIsR0FBRztnQkFDSCxHQUFHO2dCQUNILEdBQUc7Z0JBQ0gsbUJBQW1CO2dCQUNuQixtQkFBbUI7Z0JBQ25CLG1CQUFtQjthQUNuQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==