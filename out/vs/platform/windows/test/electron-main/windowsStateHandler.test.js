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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c1N0YXRlSGFuZGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy90ZXN0L2VsZWN0cm9uLW1haW4vd2luZG93c1N0YXRlSGFuZGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUNOLHdCQUF3QixFQUd4QixtQkFBbUIsR0FDbkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUduRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLFNBQVMsVUFBVTtRQUNsQixPQUFPO1lBQ04sQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsRUFBRTtZQUNMLEtBQUssRUFBRSxHQUFHO1lBQ1YsTUFBTSxFQUFFLEdBQUc7WUFDWCxJQUFJLEVBQUUsQ0FBQztTQUNQLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsR0FBUTtRQUM1QixPQUFPO1lBQ04sRUFBRSxFQUFFLE1BQU07WUFDVixVQUFVLEVBQUUsR0FBRztTQUNmLENBQUE7SUFDRixDQUFDO0lBQ0QsU0FBUyxjQUFjLENBQUMsRUFBbUIsRUFBRSxFQUFtQixFQUFFLE9BQWdCO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFD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