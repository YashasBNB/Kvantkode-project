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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy90ZXN0L2VsZWN0cm9uLW1haW4vd29ya3NwYWNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxzQkFBc0IsR0FDdEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxVQUFVLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUM3QixJQUFJLE9BQWUsQ0FBQTtJQUVuQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7SUFFMUIsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLGlDQUFpQyxDQUFDLENBQUE7UUFFbEYsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVB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