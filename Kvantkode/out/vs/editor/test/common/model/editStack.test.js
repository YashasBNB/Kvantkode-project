/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Selection } from '../../../common/core/selection.js';
import { TextChange } from '../../../common/core/textChange.js';
import { SingleModelEditStackData } from '../../../common/model/editStack.js';
suite('EditStack', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #118041: unicode character undo bug', () => {
        const stackData = new SingleModelEditStackData(1, 2, 0 /* EndOfLineSequence.LF */, 0 /* EndOfLineSequence.LF */, [new Selection(10, 2, 10, 2)], [new Selection(10, 1, 10, 1)], [new TextChange(428, '﻿', 428, '')]);
        const buff = stackData.serialize();
        const actual = SingleModelEditStackData.deserialize(buff);
        assert.deepStrictEqual(actual, stackData);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9lZGl0U3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RSxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSx3QkFBd0IsQ0FDN0MsQ0FBQyxFQUNELENBQUMsOERBR0QsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUM3QixDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzdCLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDbkMsQ0FBQTtRQUVELE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9