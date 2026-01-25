/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { BufferDirtyTracker } from '../../../browser/gpu/bufferDirtyTracker.js';
suite('BufferDirtyTracker', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let bdt;
    function assertState(dataOffset, dirtySize) {
        strictEqual(bdt.dataOffset, dataOffset);
        strictEqual(bdt.dirtySize, dirtySize);
        strictEqual(bdt.isDirty, dataOffset !== undefined);
    }
    setup(() => {
        bdt = new BufferDirtyTracker();
    });
    test('flag(index)', () => {
        strictEqual(bdt.flag(0), 0);
        assertState(0, 1);
        strictEqual(bdt.flag(31), 31);
        assertState(0, 32);
        bdt.clear();
        assertState(undefined, undefined);
        strictEqual(bdt.flag(10), 10);
        assertState(10, 1);
        strictEqual(bdt.flag(15), 15);
        assertState(10, 6);
    });
    test('flag(index, length)', () => {
        bdt.flag(0, 32);
        assertState(0, 32);
        bdt.clear();
        assertState(undefined, undefined);
        bdt.flag(10, 6);
        assertState(10, 6);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyRGlydHlUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZ3B1L2J1ZmZlckRpcnR5VHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFL0UsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksR0FBdUIsQ0FBQTtJQUUzQixTQUFTLFdBQVcsQ0FBQyxVQUE4QixFQUFFLFNBQTZCO1FBQ2pGLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLEdBQUcsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEIsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ1gsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3QixXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2YsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsQixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDWCxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2YsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=