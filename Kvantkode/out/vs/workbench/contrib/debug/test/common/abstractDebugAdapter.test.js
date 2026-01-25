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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3REZWJ1Z0FkYXB0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9jb21tb24vYWJzdHJhY3REZWJ1Z0FkYXB0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRWpELEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLElBQUksT0FBeUIsQ0FBQTtRQUM3QixJQUFJLE1BQWdCLENBQUE7UUFDcEIsS0FBSyxDQUFDLEdBQUcsRUFBRTtZQUNWLE9BQU8sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7WUFDaEMsTUFBTSxHQUFHLEVBQUUsQ0FBQTtZQUNYLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDdEIsTUFBTSxDQUFDLElBQUksQ0FBRSxFQUFnQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDMUQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtZQUMvRCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLFVBQWtCLEVBQUUsRUFBRTtZQUM3QyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDeEYsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDLENBQUE7WUFDN0IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUMvRCxDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEQsTUFBTSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDNUIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFaEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlCLFlBQVk7Z0JBQ1osbUJBQW1CO2dCQUNuQixhQUFhO2dCQUNiLG1CQUFtQjthQUNuQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RCxNQUFNLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUMzQixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVoQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtnQkFDOUIsWUFBWTtnQkFDWixtQkFBbUI7Z0JBQ25CLFdBQVc7Z0JBQ1gsbUJBQW1CO2FBQ25CLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDaEQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUNoRCxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWhCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO2dCQUM5QixHQUFHO2dCQUNILEdBQUc7Z0JBQ0gsR0FBRztnQkFDSCxtQkFBbUI7Z0JBQ25CLG1CQUFtQjtnQkFDbkIsbUJBQW1CO2FBQ25CLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9