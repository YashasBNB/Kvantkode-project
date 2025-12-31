/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { testWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { resolveResourcesForSearchIncludes } from '../../common/queryBuilder.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
suite('QueryBuilderCommon', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let context;
    setup(() => {
        const workspace = testWorkspace(URI.file(isWindows ? 'C:\\testWorkspace' : '/testWorkspace'));
        context = new TestContextService(workspace);
    });
    test('resolveResourcesForSearchIncludes passes through paths without special glob characters', () => {
        const actual = resolveResourcesForSearchIncludes([URI.file(isWindows ? 'C:\\testWorkspace\\pages\\blog' : '/testWorkspace/pages/blog')], context);
        assert.deepStrictEqual(actual, ['./pages/blog']);
    });
    test('resolveResourcesForSearchIncludes escapes paths with special characters', () => {
        const actual = resolveResourcesForSearchIncludes([
            URI.file(isWindows
                ? 'C:\\testWorkspace\\pages\\blog\\[postId]'
                : '/testWorkspace/pages/blog/[postId]'),
        ], context);
        assert.deepStrictEqual(actual, ['./pages/blog/[[]postId[]]']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL3F1ZXJ5QnVpbGRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVyRixLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsSUFBSSxPQUFpQyxDQUFBO0lBRXJDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDN0YsT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0ZBQXdGLEVBQUUsR0FBRyxFQUFFO1FBQ25HLE1BQU0sTUFBTSxHQUFHLGlDQUFpQyxDQUMvQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxFQUN0RixPQUFPLENBQ1AsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxHQUFHLEVBQUU7UUFDcEYsTUFBTSxNQUFNLEdBQUcsaUNBQWlDLENBQy9DO1lBQ0MsR0FBRyxDQUFDLElBQUksQ0FDUCxTQUFTO2dCQUNSLENBQUMsQ0FBQywwQ0FBMEM7Z0JBQzVDLENBQUMsQ0FBQyxvQ0FBb0MsQ0FDdkM7U0FDRCxFQUNELE9BQU8sQ0FDUCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7SUFDOUQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9