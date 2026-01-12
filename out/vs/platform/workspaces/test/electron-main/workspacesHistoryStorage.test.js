/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { tmpdir } from 'os';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { isRecentFolder, restoreRecentlyOpened, toStoreData, } from '../../common/workspaces.js';
suite('History Storage', () => {
    function toWorkspace(uri) {
        return {
            id: '1234',
            configPath: uri,
        };
    }
    function assertEqualURI(u1, u2, message) {
        assert.strictEqual(u1 && u1.toString(), u2 && u2.toString(), message);
    }
    function assertEqualWorkspace(w1, w2, message) {
        if (!w1 || !w2) {
            assert.strictEqual(w1, w2, message);
            return;
        }
        assert.strictEqual(w1.id, w2.id, message);
        assertEqualURI(w1.configPath, w2.configPath, message);
    }
    function assertEqualRecentlyOpened(actual, expected, message) {
        assert.strictEqual(actual.files.length, expected.files.length, message);
        for (let i = 0; i < actual.files.length; i++) {
            assertEqualURI(actual.files[i].fileUri, expected.files[i].fileUri, message);
            assert.strictEqual(actual.files[i].label, expected.files[i].label);
            assert.strictEqual(actual.files[i].remoteAuthority, expected.files[i].remoteAuthority);
        }
        assert.strictEqual(actual.workspaces.length, expected.workspaces.length, message);
        for (let i = 0; i < actual.workspaces.length; i++) {
            const expectedRecent = expected.workspaces[i];
            const actualRecent = actual.workspaces[i];
            if (isRecentFolder(actualRecent)) {
                assertEqualURI(actualRecent.folderUri, expectedRecent.folderUri, message);
            }
            else {
                assertEqualWorkspace(actualRecent.workspace, expectedRecent.workspace, message);
            }
            assert.strictEqual(actualRecent.label, expectedRecent.label);
            assert.strictEqual(actualRecent.remoteAuthority, actualRecent.remoteAuthority);
        }
    }
    function assertRestoring(state, message) {
        const stored = toStoreData(state);
        const restored = restoreRecentlyOpened(stored, new NullLogService());
        assertEqualRecentlyOpened(state, restored, message);
    }
    const testWSPath = URI.file(join(tmpdir(), 'windowStateTest', 'test.code-workspace'));
    const testFileURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFile.txt'));
    const testFolderURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFolder'));
    const testRemoteFolderURI = URI.parse('foo://bar/c/e');
    const testRemoteFileURI = URI.parse('foo://bar/c/d.txt');
    const testRemoteWSURI = URI.parse('foo://bar/c/test.code-workspace');
    test('storing and restoring', () => {
        let ro;
        ro = {
            files: [],
            workspaces: [],
        };
        assertRestoring(ro, 'empty');
        ro = {
            files: [{ fileUri: testFileURI }],
            workspaces: [],
        };
        assertRestoring(ro, 'file');
        ro = {
            files: [],
            workspaces: [{ folderUri: testFolderURI }],
        };
        assertRestoring(ro, 'folder');
        ro = {
            files: [],
            workspaces: [{ workspace: toWorkspace(testWSPath) }, { folderUri: testFolderURI }],
        };
        assertRestoring(ro, 'workspaces and folders');
        ro = {
            files: [{ fileUri: testRemoteFileURI }],
            workspaces: [{ workspace: toWorkspace(testRemoteWSURI) }, { folderUri: testRemoteFolderURI }],
        };
        assertRestoring(ro, 'remote workspaces and folders');
        ro = {
            files: [{ label: 'abc', fileUri: testFileURI }],
            workspaces: [
                { label: 'def', workspace: toWorkspace(testWSPath) },
                { folderUri: testRemoteFolderURI },
            ],
        };
        assertRestoring(ro, 'labels');
        ro = {
            files: [{ label: 'abc', remoteAuthority: 'test', fileUri: testRemoteFileURI }],
            workspaces: [
                { label: 'def', remoteAuthority: 'test', workspace: toWorkspace(testWSPath) },
                { folderUri: testRemoteFolderURI, remoteAuthority: 'test' },
            ],
        };
        assertRestoring(ro, 'authority');
    });
    test('open 1_55', () => {
        const v1_55 = `{
			"entries": [
				{
					"folderUri": "foo://bar/23/43",
					"remoteAuthority": "test+test"
				},
				{
					"workspace": {
						"id": "53b714b46ef1a2d4346568b4f591028c",
						"configPath": "file:///home/user/workspaces/testing/custom.code-workspace"
					}
				},
				{
					"folderUri": "file:///home/user/workspaces/testing/folding",
					"label": "abc"
				},
				{
					"fileUri": "file:///home/user/.config/code-oss-dev/storage.json",
					"label": "def"
				}
			]
		}`;
        const windowsState = restoreRecentlyOpened(JSON.parse(v1_55), new NullLogService());
        const expected = {
            files: [
                { label: 'def', fileUri: URI.parse('file:///home/user/.config/code-oss-dev/storage.json') },
            ],
            workspaces: [
                { folderUri: URI.parse('foo://bar/23/43'), remoteAuthority: 'test+test' },
                {
                    workspace: {
                        id: '53b714b46ef1a2d4346568b4f591028c',
                        configPath: URI.parse('file:///home/user/workspaces/testing/custom.code-workspace'),
                    },
                },
                { label: 'abc', folderUri: URI.parse('file:///home/user/workspaces/testing/folding') },
            ],
        };
        assertEqualRecentlyOpened(windowsState, expected, 'v1_33');
    });
    test('toStoreData drops label if it matches path', () => {
        const actual = toStoreData({
            workspaces: [],
            files: [
                {
                    fileUri: URI.parse('file:///foo/bar/test.txt'),
                    label: '/foo/bar/test.txt',
                    remoteAuthority: undefined,
                },
            ],
        });
        assert.deepStrictEqual(actual, {
            entries: [
                {
                    fileUri: 'file:///foo/bar/test.txt',
                    label: undefined,
                    remoteAuthority: undefined,
                },
            ],
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc0hpc3RvcnlTdG9yYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvdGVzdC9lbGVjdHJvbi1tYWluL3dvcmtzcGFjZXNIaXN0b3J5U3RvcmFnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTNELE9BQU8sRUFJTixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLFdBQVcsR0FDWCxNQUFNLDRCQUE0QixDQUFBO0FBRW5DLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsU0FBUyxXQUFXLENBQUMsR0FBUTtRQUM1QixPQUFPO1lBQ04sRUFBRSxFQUFFLE1BQU07WUFDVixVQUFVLEVBQUUsR0FBRztTQUNmLENBQUE7SUFDRixDQUFDO0lBQ0QsU0FBUyxjQUFjLENBQUMsRUFBbUIsRUFBRSxFQUFtQixFQUFFLE9BQWdCO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUM1QixFQUFvQyxFQUNwQyxF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