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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsVXJpLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixpQ0FBaUMsRUFDakMsY0FBYyxHQUVkLE1BQU0sOEJBQThCLENBQUE7QUFFckMsU0FBUyxhQUFhLENBQUMsSUFBWTtJQUNsQyxPQUFPO1FBQ04sWUFBWSxFQUFFO1lBQ2IsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRDtLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDekIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLElBQUksQ0FBQyw4REFBOEQsRUFBRSxHQUFHLEVBQUU7WUFDekUsZUFBZSxDQUNkLGlDQUFpQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQzlFLFNBQVMsQ0FDVCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsMEVBQTBFLEVBQUUsR0FBRyxFQUFFO1lBQ3JGLGVBQWUsQ0FDZCxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENB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