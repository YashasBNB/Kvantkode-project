/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { reviveIdentifier, hasWorkspaceFileExtension, isWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier, isEmptyWorkspaceIdentifier, } from '../../../workspace/common/workspace.js';
suite('Workspaces', () => {
    test('reviveIdentifier', () => {
        const serializedWorkspaceIdentifier = {
            id: 'id',
            configPath: URI.file('foo').toJSON(),
        };
        assert.strictEqual(isWorkspaceIdentifier(reviveIdentifier(serializedWorkspaceIdentifier)), true);
        const serializedSingleFolderWorkspaceIdentifier = {
            id: 'id',
            uri: URI.file('foo').toJSON(),
        };
        assert.strictEqual(isSingleFolderWorkspaceIdentifier(reviveIdentifier(serializedSingleFolderWorkspaceIdentifier)), true);
        const serializedEmptyWorkspaceIdentifier = { id: 'id' };
        assert.strictEqual(reviveIdentifier(serializedEmptyWorkspaceIdentifier).id, serializedEmptyWorkspaceIdentifier.id);
        assert.strictEqual(isWorkspaceIdentifier(serializedEmptyWorkspaceIdentifier), false);
        assert.strictEqual(isSingleFolderWorkspaceIdentifier(serializedEmptyWorkspaceIdentifier), false);
        assert.strictEqual(reviveIdentifier(undefined), undefined);
    });
    test('hasWorkspaceFileExtension', () => {
        assert.strictEqual(hasWorkspaceFileExtension('something'), false);
        assert.strictEqual(hasWorkspaceFileExtension('something.code-workspace'), true);
    });
    test('toWorkspaceIdentifier', () => {
        let identifier = toWorkspaceIdentifier({ id: 'id', folders: [] });
        assert.ok(identifier);
        assert.ok(isEmptyWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        identifier = toWorkspaceIdentifier({
            id: 'id',
            folders: [
                { index: 0, name: 'test', toResource: () => URI.file('test'), uri: URI.file('test') },
            ],
        });
        assert.ok(identifier);
        assert.ok(isSingleFolderWorkspaceIdentifier(identifier));
        assert.ok(!isWorkspaceIdentifier(identifier));
        identifier = toWorkspaceIdentifier({
            id: 'id',
            configuration: URI.file('test.code-workspace'),
            folders: [],
        });
        assert.ok(identifier);
        assert.ok(!isSingleFolderWorkspaceIdentifier(identifier));
        assert.ok(isWorkspaceIdentifier(identifier));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy90ZXN0L2NvbW1vbi93b3Jrc3BhY2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBR04sZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixxQkFBcUIsRUFDckIsaUNBQWlDLEVBRWpDLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUvQyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sNkJBQTZCLEdBQW1DO1lBQ3JFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFO1NBQ3BDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoRyxNQUFNLHlDQUF5QyxHQUErQztZQUM3RixFQUFFLEVBQUUsSUFBSTtZQUNSLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRTtTQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsaUNBQWlDLENBQ2hDLGdCQUFnQixDQUFDLHlDQUF5QyxDQUFDLENBQzNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLGtDQUFrQyxHQUE4QixFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUNqQixnQkFBZ0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEVBQUUsRUFDdkQsa0NBQWtDLENBQUMsRUFBRSxDQUNyQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUNBQWlDLENBQUMsa0NBQWtDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsMEJBQTBCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNoRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsSUFBSSxVQUFVLEdBQUcscUJBQXFCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRTdDLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQztZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRTtnQkFDUixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTthQUNyRjtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQ0FBaUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRTdDLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQztZQUNsQyxFQUFFLEVBQUUsSUFBSTtZQUNSLGFBQWEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1lBQzlDLE9BQU8sRUFBRSxFQUFFO1NBQ1gsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsaUNBQWlDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=