/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { chunkInput } from '../../common/terminalProcess.js';
suite('platform - terminalProcess', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('chunkInput', () => {
        test('single chunk', () => {
            deepStrictEqual(chunkInput('foo bar'), ['foo bar']);
        });
        test('multi chunk', () => {
            deepStrictEqual(chunkInput('foo'.repeat(50)), [
                'foofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofo',
                'ofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoof',
                'oofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoo',
            ]);
        });
        test('small data with escapes', () => {
            deepStrictEqual(chunkInput('foo \x1b[30mbar'), ['foo ', '\x1b[30mbar']);
        });
        test('large data with escapes', () => {
            deepStrictEqual(chunkInput('foofoofoofoo\x1b[30mbarbarbarbarbar\x1b[0m'.repeat(3)), [
                'foofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0mfoofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0mfoofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0m',
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbFByb2Nlc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU1RCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7WUFDekIsZUFBZSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDN0Msb0RBQW9EO2dCQUNwRCxvREFBb0Q7Z0JBQ3BELG9EQUFvRDthQUNwRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDcEMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDeEUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQ3BDLGVBQWUsQ0FBQyxVQUFVLENBQUMsNENBQTRDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25GLGNBQWM7Z0JBQ2QseUJBQXlCO2dCQUN6QixxQkFBcUI7Z0JBQ3JCLHlCQUF5QjtnQkFDekIscUJBQXFCO2dCQUNyQix5QkFBeUI7Z0JBQ3pCLFNBQVM7YUFDVCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==