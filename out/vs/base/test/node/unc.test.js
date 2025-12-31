/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { getUNCHost } from '../../node/unc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('UNC', () => {
    test('getUNCHost', () => {
        strictEqual(getUNCHost(undefined), undefined);
        strictEqual(getUNCHost(null), undefined);
        strictEqual(getUNCHost('/'), undefined);
        strictEqual(getUNCHost('/foo'), undefined);
        strictEqual(getUNCHost('c:'), undefined);
        strictEqual(getUNCHost('c:\\'), undefined);
        strictEqual(getUNCHost('c:\\foo'), undefined);
        strictEqual(getUNCHost('c:\\foo\\\\server\\path'), undefined);
        strictEqual(getUNCHost('\\'), undefined);
        strictEqual(getUNCHost('\\\\'), undefined);
        strictEqual(getUNCHost('\\\\localhost'), undefined);
        strictEqual(getUNCHost('\\\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\.'), undefined);
        strictEqual(getUNCHost('\\\\?'), undefined);
        strictEqual(getUNCHost('\\\\.\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\a'), 'localhost');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS91bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUNqQixJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFeEMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2QyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDeEMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdDLFdBQVcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU3RCxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3hDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVuRCxXQUFXLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDdkQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRXhELFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0MsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUzQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRWhELFdBQVcsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyRCxXQUFXLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFckQsV0FBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9ELFdBQVcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUUvRCxXQUFXLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ2pFLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9