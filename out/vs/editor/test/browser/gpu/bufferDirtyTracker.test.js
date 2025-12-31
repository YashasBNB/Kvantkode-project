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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyRGlydHlUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2dwdS9idWZmZXJEaXJ0eVRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRS9FLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLEdBQXVCLENBQUE7SUFFM0IsU0FBUyxXQUFXLENBQUMsVUFBOEIsRUFBRSxTQUE2QjtRQUNqRixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN2QyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixHQUFHLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0IsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3QixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNYLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDN0IsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3QixXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNmLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEIsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ1gsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNmLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9