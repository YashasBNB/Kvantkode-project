/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { join } from '../../../../base/common/path.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { findWindowOnFile } from '../../electron-main/windowsFinder.js';
import { toWorkspaceFolders } from '../../../workspaces/common/workspaces.js';
import { FileAccess } from '../../../../base/common/network.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('WindowsFinder', () => {
    const fixturesFolder = FileAccess.asFileUri('vs/platform/windows/test/electron-main/fixtures').fsPath;
    const testWorkspace = {
        id: Date.now().toString(),
        configPath: URI.file(join(fixturesFolder, 'workspaces.json')),
    };
    const testWorkspaceFolders = toWorkspaceFolders([
        { path: join(fixturesFolder, 'vscode_workspace_1_folder') },
        { path: join(fixturesFolder, 'vscode_workspace_2_folder') },
    ], testWorkspace.configPath, extUriBiasedIgnorePathCase);
    const localWorkspaceResolver = async (workspace) => {
        return workspace === testWorkspace
            ? { id: testWorkspace.id, configPath: workspace.configPath, folders: testWorkspaceFolders }
            : undefined;
    };
    function createTestCodeWindow(options) {
        return new (class {
            constructor() {
                this.onWillLoad = Event.None;
                this.onDidMaximize = Event.None;
                this.onDidUnmaximize = Event.None;
                this.onDidTriggerSystemContextMenu = Event.None;
                this.onDidSignalReady = Event.None;
                this.onDidClose = Event.None;
                this.onDidDestroy = Event.None;
                this.onDidEnterFullScreen = Event.None;
                this.onDidLeaveFullScreen = Event.None;
                this.whenClosedOrLoaded = Promise.resolve();
                this.id = -1;
                this.win = null;
                this.openedWorkspace = options.openedFolderUri
                    ? { id: '', uri: options.openedFolderUri }
                    : options.openedWorkspace;
                this.isExtensionDevelopmentHost = false;
                this.isExtensionTestHost = false;
                this.lastFocusTime = options.lastFocusTime;
                this.isFullScreen = false;
                this.isReady = true;
            }
            ready() {
                throw new Error('Method not implemented.');
            }
            setReady() {
                throw new Error('Method not implemented.');
            }
            addTabbedWindow(window) {
                throw new Error('Method not implemented.');
            }
            load(config, options) {
                throw new Error('Method not implemented.');
            }
            reload(cli) {
                throw new Error('Method not implemented.');
            }
            focus(options) {
                throw new Error('Method not implemented.');
            }
            close() {
                throw new Error('Method not implemented.');
            }
            getBounds() {
                throw new Error('Method not implemented.');
            }
            send(channel, ...args) {
                throw new Error('Method not implemented.');
            }
            sendWhenReady(channel, token, ...args) {
                throw new Error('Method not implemented.');
            }
            toggleFullScreen() {
                throw new Error('Method not implemented.');
            }
            setRepresentedFilename(name) {
                throw new Error('Method not implemented.');
            }
            getRepresentedFilename() {
                throw new Error('Method not implemented.');
            }
            setDocumentEdited(edited) {
                throw new Error('Method not implemented.');
            }
            isDocumentEdited() {
                throw new Error('Method not implemented.');
            }
            updateTouchBar(items) {
                throw new Error('Method not implemented.');
            }
            serializeWindowState() {
                throw new Error('Method not implemented');
            }
            updateWindowControls(options) {
                throw new Error('Method not implemented.');
            }
            notifyZoomLevel(level) {
                throw new Error('Method not implemented.');
            }
            matches(webContents) {
                throw new Error('Method not implemented.');
            }
            dispose() { }
        })();
    }
    const vscodeFolderWindow = createTestCodeWindow({
        lastFocusTime: 1,
        openedFolderUri: URI.file(join(fixturesFolder, 'vscode_folder')),
    });
    const lastActiveWindow = createTestCodeWindow({
        lastFocusTime: 3,
        openedFolderUri: undefined,
    });
    const noVscodeFolderWindow = createTestCodeWindow({
        lastFocusTime: 2,
        openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder')),
    });
    const windows = [vscodeFolderWindow, lastActiveWindow, noVscodeFolderWindow];
    test('New window without folder when no windows exist', async () => {
        assert.strictEqual(await findWindowOnFile([], URI.file('nonexisting'), localWorkspaceResolver), undefined);
        assert.strictEqual(await findWindowOnFile([], URI.file(join(fixturesFolder, 'no_vscode_folder', 'file.txt')), localWorkspaceResolver), undefined);
    });
    test('Existing window with folder', async () => {
        assert.strictEqual(await findWindowOnFile(windows, URI.file(join(fixturesFolder, 'no_vscode_folder', 'file.txt')), localWorkspaceResolver), noVscodeFolderWindow);
        assert.strictEqual(await findWindowOnFile(windows, URI.file(join(fixturesFolder, 'vscode_folder', 'file.txt')), localWorkspaceResolver), vscodeFolderWindow);
        const window = createTestCodeWindow({
            lastFocusTime: 1,
            openedFolderUri: URI.file(join(fixturesFolder, 'vscode_folder', 'nested_folder')),
        });
        assert.strictEqual(await findWindowOnFile([window], URI.file(join(fixturesFolder, 'vscode_folder', 'nested_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), window);
    });
    test('More specific existing window wins', async () => {
        const window = createTestCodeWindow({
            lastFocusTime: 2,
            openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder')),
        });
        const nestedFolderWindow = createTestCodeWindow({
            lastFocusTime: 1,
            openedFolderUri: URI.file(join(fixturesFolder, 'no_vscode_folder', 'nested_folder')),
        });
        assert.strictEqual(await findWindowOnFile([window, nestedFolderWindow], URI.file(join(fixturesFolder, 'no_vscode_folder', 'nested_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), nestedFolderWindow);
    });
    test('Workspace folder wins', async () => {
        const window = createTestCodeWindow({
            lastFocusTime: 1,
            openedWorkspace: testWorkspace,
        });
        assert.strictEqual(await findWindowOnFile([window], URI.file(join(fixturesFolder, 'vscode_workspace_2_folder', 'nested_vscode_folder', 'subfolder', 'file.txt')), localWorkspaceResolver), window);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy90ZXN0L2VsZWN0cm9uLW1haW4vd2luZG93c0ZpbmRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUs1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FDMUMsaURBQWlELENBQ2pELENBQUMsTUFBTSxDQUFBO0lBRVIsTUFBTSxhQUFhLEdBQXlCO1FBQzNDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFO1FBQ3pCLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztLQUM3RCxDQUFBO0lBRUQsTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FDOUM7UUFD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