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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1VyaS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RpbmdVcmkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBaUIsWUFBWSxFQUFlLE1BQU0sNEJBQTRCLENBQUE7QUFFbkcsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxHQUFvQjtZQUM3QjtnQkFDQyxJQUFJLHdDQUFnQztnQkFDcEMsU0FBUyxFQUFFLENBQUM7Z0JBQ1osWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLFNBQVMsRUFBRSxHQUFHO2FBQ2Q7WUFDRDtnQkFDQyxJQUFJLDBDQUFrQztnQkFDdEMsU0FBUyxFQUFFLENBQUM7Z0JBQ1osWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLFNBQVMsRUFBRSxHQUFHO2FBQ2Q7WUFDRDtnQkFDQyxJQUFJLG1DQUEyQjtnQkFDL0IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLFFBQVEsRUFBRSxHQUFHO2dCQUNiLFNBQVMsRUFBRSxHQUFHO2FBQ2Q7U0FDRCxDQUFBO1FBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN4QixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDdEQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==