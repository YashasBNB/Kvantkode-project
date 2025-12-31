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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc0hpc3RvcnlTdG9yYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL3Rlc3QvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzSGlzdG9yeVN0b3JhZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxPQUFPLEVBSU4sY0FBYyxFQUNkLHFCQUFxQixFQUNyQixXQUFXLEdBQ1gsTUFBTSw0QkFBNEIsQ0FBQTtBQUVuQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLFNBQVMsV0FBVyxDQUFDLEdBQVE7UUFDNUIsT0FBTztZQUNOLEVBQUUsRUFBRSxNQUFNO1lBQ1YsVUFBVSxFQUFFLEdBQUc7U0FDZixDQUFBO0lBQ0YsQ0FBQztJQUNELFNBQVMsY0FBYyxDQUFDLEVBQW1CLEVBQUUsRUFBbUIsRUFBRSxPQUFnQjtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FDNUIsRUFBb0MsRUFDcEMsRUFBb0Ms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