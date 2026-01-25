/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock, mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { RawDebugSession } from '../../browser/rawDebugSession.js';
import { MockDebugAdapter } from '../common/mockDebug.js';
suite('RawDebugSession', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    function createTestObjects() {
        const debugAdapter = new MockDebugAdapter();
        const dbgr = mockObject()({
            type: 'mock-debug',
        });
        const session = new RawDebugSession(debugAdapter, dbgr, 'sessionId', 'name', new (mock())(), new (mock())(), new (mock())(), new (mock())());
        disposables.add(session);
        disposables.add(debugAdapter);
        return { debugAdapter, dbgr };
    }
    test('handles startDebugging request success', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(true));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type',
            },
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, true);
    });
    test('handles startDebugging request failure', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(false));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type',
            },
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9yYXdEZWJ1Z1Nlc3Npb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUtsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFekQsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELFNBQVMsaUJBQWlCO1FBQ3pCLE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLElBQUksR0FBRyxVQUFVLEVBQWEsQ0FBQztZQUNwQyxJQUFJLEVBQUUsWUFBWTtTQUNsQixDQUFDLENBQUE7UUFFRixNQUFNLE9BQU8sR0FBRyxJQUFJLGVBQWUsQ0FDbEMsWUFBWSxFQUNaLElBQXdCLEVBQ3hCLFdBQVcsRUFDWCxNQUFNLEVBQ04sSUFBSSxDQUFDLElBQUksRUFBOEIsQ0FBQyxFQUFFLEVBQzFDLElBQUksQ0FBQyxJQUFJLEVBQWtCLENBQUMsRUFBRSxFQUM5QixJQUFJLENBQUMsSUFBSSxFQUF3QixDQUFDLEVBQUUsRUFDcEMsSUFBSSxDQUFDLElBQUksRUFBa0IsQ0FBQyxFQUFFLENBQzlCLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hCLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFN0IsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUM5QyxPQUFPLEVBQUUsUUFBUTtZQUNqQixhQUFhLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLGlCQUFpQjthQUN2QjtTQUMrQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUVuRCxZQUFZLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLGFBQWEsRUFBRTtnQkFDZCxJQUFJLEVBQUUsaUJBQWlCO2FBQ3ZCO1NBQytDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=