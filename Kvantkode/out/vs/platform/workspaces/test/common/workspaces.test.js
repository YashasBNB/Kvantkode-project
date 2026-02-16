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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL3Rlc3QvY29tbW9uL3dvcmtzcGFjZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIseUJBQXlCLEVBQ3pCLHFCQUFxQixFQUNyQixpQ0FBaUMsRUFFakMscUJBQXFCLEVBQ3JCLDBCQUEwQixHQUMxQixNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSw2QkFBNkIsR0FBbUM7WUFDckUsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7U0FDcEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhHLE1BQU0seUNBQXlDLEdBQStDO1lBQzdGLEVBQUUsRUFBRSxJQUFJO1lBQ1IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFO1NBQzdCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixpQ0FBaUMsQ0FDaEMsZ0JBQWdCLENB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