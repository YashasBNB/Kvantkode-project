/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { tmpdir } from 'os';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getWindowsStateStoreData, restoreWindowsState, } from '../../electron-main/windowsStateHandler.js';
suite('Windows State Storing', () => {
    function getUIState() {
        return {
            x: 0,
            y: 10,
            width: 100,
            height: 200,
            mode: 0,
        };
    }
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
    function assertEqualWindowState(expected, actual, message) {
        if (!expected || !actual) {
            assert.deepStrictEqual(expected, actual, message);
            return;
        }
        assert.strictEqual(expected.backupPath, actual.backupPath, message);
        assertEqualURI(expected.folderUri, actual.folderUri, message);
        assert.strictEqual(expected.remoteAuthority, actual.remoteAuthority, message);
        assertEqualWorkspace(expected.workspace, actual.workspace, message);
        assert.deepStrictEqual(expected.uiState, actual.uiState, message);
    }
    function assertEqualWindowsState(expected, actual, message) {
        assertEqualWindowState(expected.lastPluginDevelopmentHostWindow, actual.lastPluginDevelopmentHostWindow, message);
        assertEqualWindowState(expected.lastActiveWindow, actual.lastActiveWindow, message);
        assert.strictEqual(expected.openedWindows.length, actual.openedWindows.length, message);
        for (let i = 0; i < expected.openedWindows.length; i++) {
            assertEqualWindowState(expected.openedWindows[i], actual.openedWindows[i], message);
        }
    }
    function assertRestoring(state, message) {
        const stored = getWindowsStateStoreData(state);
        const restored = restoreWindowsState(stored);
        assertEqualWindowsState(state, restored, message);
    }
    const testBackupPath1 = join(tmpdir(), 'windowStateTest', 'backupFolder1');
    const testBackupPath2 = join(tmpdir(), 'windowStateTest', 'backupFolder2');
    const testWSPath = URI.file(join(tmpdir(), 'windowStateTest', 'test.code-workspace'));
    const testFolderURI = URI.file(join(tmpdir(), 'windowStateTest', 'testFolder'));
    const testRemoteFolderURI = URI.parse('foo://bar/c/d');
    test('storing and restoring', () => {
        let windowState;
        windowState = {
            openedWindows: [],
        };
        assertRestoring(windowState, 'no windows');
        windowState = {
            openedWindows: [{ backupPath: testBackupPath1, uiState: getUIState() }],
        };
        assertRestoring(windowState, 'empty workspace');
        windowState = {
            openedWindows: [
                { backupPath: testBackupPath1, uiState: getUIState(), workspace: toWorkspace(testWSPath) },
            ],
        };
        assertRestoring(windowState, 'workspace');
        windowState = {
            openedWindows: [
                { backupPath: testBackupPath2, uiState: getUIState(), folderUri: testFolderURI },
            ],
        };
        assertRestoring(windowState, 'folder');
        windowState = {
            openedWindows: [
                { backupPath: testBackupPath1, uiState: getUIState(), folderUri: testFolderURI },
                {
                    backupPath: testBackupPath1,
                    uiState: getUIState(),
                    folderUri: testRemoteFolderURI,
                    remoteAuthority: 'bar',
                },
            ],
        };
        assertRestoring(windowState, 'multiple windows');
        windowState = {
            lastActiveWindow: {
                backupPath: testBackupPath2,
                uiState: getUIState(),
                folderUri: testFolderURI,
            },
            openedWindows: [],
        };
        assertRestoring(windowState, 'lastActiveWindow');
        windowState = {
            lastPluginDevelopmentHostWindow: {
                backupPath: testBackupPath2,
                uiState: getUIState(),
                folderUri: testFolderURI,
            },
            openedWindows: [],
        };
        assertRestoring(windowState, 'lastPluginDevelopmentHostWindow');
    });
    test('open 1_32', () => {
        const v1_32_workspace = `{
			"openedWindows": [],
			"lastActiveWindow": {
				"workspaceIdentifier": {
					"id": "53b714b46ef1a2d4346568b4f591028c",
					"configURIPath": "file:///home/user/workspaces/testing/custom.code-workspace"
				},
				"backupPath": "/home/user/.config/code-oss-dev/Backups/53b714b46ef1a2d4346568b4f591028c",
				"uiState": {
					"mode": 0,
					"x": 0,
					"y": 27,
					"width": 2560,
					"height": 1364
				}
			}
		}`;
        let windowsState = restoreWindowsState(JSON.parse(v1_32_workspace));
        let expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/53b714b46ef1a2d4346568b4f591028c',
                uiState: { mode: 0 /* WindowMode.Maximized */, x: 0, y: 27, width: 2560, height: 1364 },
                workspace: {
                    id: '53b714b46ef1a2d4346568b4f591028c',
                    configPath: URI.parse('file:///home/user/workspaces/testing/custom.code-workspace'),
                },
            },
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_workspace');
        const v1_32_folder = `{
			"openedWindows": [],
			"lastActiveWindow": {
				"folder": "file:///home/user/workspaces/testing/folding",
				"backupPath": "/home/user/.config/code-oss-dev/Backups/1daac1621c6c06f9e916ac8062e5a1b5",
				"uiState": {
					"mode": 1,
					"x": 625,
					"y": 263,
					"width": 1718,
					"height": 953
				}
			}
		}`;
        windowsState = restoreWindowsState(JSON.parse(v1_32_folder));
        expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/1daac1621c6c06f9e916ac8062e5a1b5',
                uiState: { mode: 1 /* WindowMode.Normal */, x: 625, y: 263, width: 1718, height: 953 },
                folderUri: URI.parse('file:///home/user/workspaces/testing/folding'),
            },
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_folder');
        const v1_32_empty_window = ` {
			"openedWindows": [
			],
			"lastActiveWindow": {
				"backupPath": "/home/user/.config/code-oss-dev/Backups/1549539668998",
				"uiState": {
					"mode": 1,
					"x": 768,
					"y": 336,
					"width": 1200,
					"height": 800
				}
			}
		}`;
        windowsState = restoreWindowsState(JSON.parse(v1_32_empty_window));
        expected = {
            openedWindows: [],
            lastActiveWindow: {
                backupPath: '/home/user/.config/code-oss-dev/Backups/1549539668998',
                uiState: { mode: 1 /* WindowMode.Normal */, x: 768, y: 336, width: 1200, height: 800 },
            },
        };
        assertEqualWindowsState(expected, windowsState, 'v1_32_empty_window');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL3Rlc3QvZWxlY3Ryb24tbWFpbi93aW5kb3dzU3RhdGVIYW5kbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQ04sd0JBQXdCLEVBR3hCLG1CQUFtQixHQUNuQixNQUFNLDRDQUE0QyxDQUFBO0FBR25ELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsU0FBUyxVQUFVO1FBQ2xCLE9BQU87WUFDTixDQUFDLEVBQUUsQ0FBQztZQUNKLENBQUMsRUFBRSxFQUFFO1lBQ0wsS0FBSyxFQUFFLEdBQUc7WUFDVixNQUFNLEVBQUUsR0FBRztZQUNYLElBQUksRUFBRSxDQUFDO1NBQ1AsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxHQUFRO1FBQzVCLE9BQU87WUFDTixFQUFFLEVBQUUsTUFBTTtZQUNWLFVBQVUsRUFBRSxHQUFHO1NBQ2YsQ0FBQTtJQUNGLENBQUM7SUFDRCxTQUFTLGNBQWMsQ0FBQyxFQUFtQixFQUFFLEVBQW1CLEVBQUUsT0FBZ0I7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxF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