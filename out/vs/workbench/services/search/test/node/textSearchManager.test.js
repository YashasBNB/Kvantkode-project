/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NativeTextSearchManager } from '../../node/textSearchManager.js';
suite('NativeTextSearchManager', () => {
    test('fixes encoding', async () => {
        let correctEncoding = false;
        const provider = {
            provideTextSearchResults(query, options, progress, token) {
                correctEncoding = options.folderOptions[0].encoding === 'windows-1252';
                return null;
            },
        };
        const query = {
            type: 2 /* QueryType.Text */,
            contentPattern: {
                pattern: 'a',
            },
            folderQueries: [
                {
                    folder: URI.file('/some/folder'),
                    fileEncoding: 'windows1252',
                },
            ],
        };
        const m = new NativeTextSearchManager(query, provider);
        await m.search(() => { }, CancellationToken.None);
        assert.ok(correctEncoding);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3RleHRTZWFyY2hNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVdsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RSxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqQyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUE7UUFDM0IsTUFBTSxRQUFRLEdBQXdCO1lBQ3JDLHdCQUF3QixDQUN2QixLQUF1QixFQUN2QixPQUFrQyxFQUNsQyxRQUFxQyxFQUNyQyxLQUF3QjtnQkFFeEIsZUFBZSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQTtnQkFFdEUsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFlO1lBQ3pCLElBQUksd0JBQWdCO1lBQ3BCLGNBQWMsRUFBRTtnQkFDZixPQUFPLEVBQUUsR0FBRzthQUNaO1lBQ0QsYUFBYSxFQUFFO2dCQUNkO29CQUNDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztvQkFDaEMsWUFBWSxFQUFFLGFBQWE7aUJBQzNCO2FBQ0Q7U0FDRCxDQUFBO1FBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVoRCxNQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQzNCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9