/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getInstanceFromResource, getTerminalResourcesFromDragEvent, getTerminalUri, } from '../../browser/terminalUri.js';
function fakeDragEvent(data) {
    return {
        dataTransfer: {
            getData: () => {
                return data;
            },
        },
    };
}
suite('terminalUri', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getTerminalResourcesFromDragEvent', () => {
        test('should give undefined when no terminal resources is in event', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent(''))?.map((e) => e.toString()), undefined);
        });
        test('should give undefined when an empty terminal resources array is in event', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('[]'))?.map((e) => e.toString()), undefined);
        });
        test('should return terminal resource when event contains one', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('["vscode-terminal:/1626874386474/3"]'))?.map((e) => e.toString()), ['vscode-terminal:/1626874386474/3']);
        });
        test('should return multiple terminal resources when event contains multiple', () => {
            deepStrictEqual(getTerminalResourcesFromDragEvent(fakeDragEvent('["vscode-terminal:/foo/1","vscode-terminal:/bar/2"]'))?.map((e) => e.toString()), ['vscode-terminal:/foo/1', 'vscode-terminal:/bar/2']);
        });
    });
    suite('getInstanceFromResource', () => {
        test('should return undefined if there is no match', () => {
            strictEqual(getInstanceFromResource([{ resource: getTerminalUri('workspace', 2, 'title') }], getTerminalUri('workspace', 1)), undefined);
        });
        test('should return a result if there is a match', () => {
            const instance = { resource: getTerminalUri('workspace', 2, 'title') };
            strictEqual(getInstanceFromResource([
                { resource: getTerminalUri('workspace', 1, 'title') },
                instance,
                { resource: getTerminalUri('workspace', 3, 'title') },
            ], getTerminalUri('workspace', 2)), instance);
        });
        test('should ignore the fragment', () => {
            const instance = { resource: getTerminalUri('workspace', 2, 'title') };
            strictEqual(getInstanceFromResource([
                { resource: getTerminalUri('workspace', 1, 'title') },
                instance,
                { resource: getTerminalUri('workspace', 3, 'title') },
            ], getTerminalUri('workspace', 2, 'does not match!')), instance);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFVyaS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsaUNBQWlDLEVBQ2pDLGNBQWMsR0FFZCxNQUFNLDhCQUE4QixDQUFBO0FBRXJDLFNBQVMsYUFBYSxDQUFDLElBQVk7SUFDbEMsT0FBTztRQUNOLFlBQVksRUFBRTtZQUNiLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0Q7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1lBQ3pFLGVBQWUsQ0FDZCxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUM5RSxTQUFTLENBQ1QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtZQUNyRixlQUFlLENBQ2QsaUNBQWlDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLEVB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