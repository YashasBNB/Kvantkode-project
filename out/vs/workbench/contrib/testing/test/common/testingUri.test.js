/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { buildTestUri, parseTestUri } from '../../common/testingUri.js';
suite('Workbench - Testing URIs', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('round trip', () => {
        const uris = [
            {
                type: 3 /* TestUriType.ResultActualOutput */,
                taskIndex: 1,
                messageIndex: 42,
                resultId: 'r',
                testExtId: 't',
            },
            {
                type: 4 /* TestUriType.ResultExpectedOutput */,
                taskIndex: 1,
                messageIndex: 42,
                resultId: 'r',
                testExtId: 't',
            },
            {
                type: 2 /* TestUriType.ResultMessage */,
                taskIndex: 1,
                messageIndex: 42,
                resultId: 'r',
                testExtId: 't',
            },
        ];
        for (const uri of uris) {
            const serialized = buildTestUri(uri);
            assert.deepStrictEqual(uri, parseTestUri(serialized));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1VyaS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2NvbW1vbi90ZXN0aW5nVXJpLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxZQUFZLEVBQWlCLFlBQVksRUFBZSxNQUFNLDRCQUE0QixDQUFBO0FBRW5HLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLElBQUksR0FBb0I7WUFDN0I7Z0JBQ0MsSUFBSSx3Q0FBZ0M7Z0JBQ3BDLFNBQVMsRUFBRSxDQUFDO2dCQUNaLFlBQVksRUFBRSxFQUFFO2dCQUNoQixRQUFRLEVBQUUsR0FBRztnQkFDYixTQUFTLEVBQUUsR0FBRzthQUNkO1lBQ0Q7Z0JBQ0MsSUFBSSwwQ0FBa0M7Z0JBQ3RDLFNBQVMsRUFBRSxDQUFDO2dCQUNaLFlBQVksRUFBRSxFQUFFO2dCQUNoQixRQUFRLEVBQUUsR0FBRztnQkFDYixTQUFTLEVBQUUsR0FBRzthQUNkO1lBQ0Q7Z0JBQ0MsSUFBSSxtQ0FBMkI7Z0JBQy9CLFNBQVMsRUFBRSxDQUFDO2dCQUNaLFlBQVksRUFBRSxFQUFFO2dCQUNoQixRQUFRLEVBQUUsR0FBRztnQkFDYixTQUFTLEVBQUUsR0FBRzthQUNkO1NBQ0QsQ0FBQTtRQUVELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3RELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=