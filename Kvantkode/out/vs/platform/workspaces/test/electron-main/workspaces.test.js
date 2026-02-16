/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as pfs from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier, } from '../../node/workspaces.js';
flakySuite('Workspaces', () => {
    let testDir;
    const tmpDir = os.tmpdir();
    setup(async () => {
        testDir = getRandomTestPath(tmpDir, 'vsctests', 'workspacesmanagementmainservice');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        return pfs.Promises.rm(testDir);
    });
    test('getSingleWorkspaceIdentifier', async function () {
        const nonLocalUri = URI.parse('myscheme://server/work/p/f1');
        const nonLocalUriId = getSingleFolderWorkspaceIdentifier(nonLocalUri);
        assert.ok(nonLocalUriId?.id);
        const localNonExistingUri = URI.file(path.join(testDir, 'f1'));
        const localNonExistingUriId = getSingleFolderWorkspaceIdentifier(localNonExistingUri);
        assert.ok(!localNonExistingUriId);
        fs.mkdirSync(path.join(testDir, 'f1'));
        const localExistingUri = URI.file(path.join(testDir, 'f1'));
        const localExistingUriId = getSingleFolderWorkspaceIdentifier(localExistingUri, fs.statSync(localExistingUri.fsPath));
        assert.ok(localExistingUriId?.id);
    });
    test('workspace identifiers are stable', function () {
        // workspace identifier (local)
        assert.strictEqual(getWorkspaceIdentifier(URI.file('/hello/test')).id, isWindows /* slash vs backslash */
            ? '9f3efb614e2cd7924e4b8076e6c72233'
            : 'e36736311be12ff6d695feefe415b3e8');
        // single folder identifier (local)
        const fakeStat = {
            ino: 1611312115129,
            birthtimeMs: 1611312115129,
            birthtime: new Date(1611312115129),
        };
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.file('/hello/test'), fakeStat)?.id, isWindows /* slash vs backslash */
            ? '9a8441e897e5174fa388bc7ef8f7a710'
            : '1d726b3d516dc2a6d343abf4797eaaef');
        // workspace identifier (remote)
        assert.strictEqual(getWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test')).id, '786de4f224d57691f218dc7f31ee2ee3');
        // single folder identifier (remote)
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test'))?.id, '786de4f224d57691f218dc7f31ee2ee3');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL3Rlc3QvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLHNCQUFzQixHQUN0QixNQUFNLDBCQUEwQixDQUFBO0FBRWpDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQzdCLElBQUksT0FBZSxDQUFBO0lBRW5CLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUUxQixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsaUNBQWlDLENBQUMsQ0FBQTtRQUVsRixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFD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