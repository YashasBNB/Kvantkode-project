/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { basename } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { MainContext, } from '../../common/extHost.protocol.js';
import { RelativePattern } from '../../common/extHostTypes.js';
import { ExtHostWorkspace } from '../../common/extHostWorkspace.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { ExtHostRpcService } from '../../common/extHostRpcService.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { nullExtensionDescription as extensionDescriptor } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExcludeSettingOptions } from '../../../services/search/common/searchExtTypes.js';
function createExtHostWorkspace(mainContext, data, logService) {
    const result = new ExtHostWorkspace(new ExtHostRpcService(mainContext), new (class extends mock() {
        constructor() {
            super(...arguments);
            this.workspace = data;
        }
    })(), new (class extends mock() {
        getCapabilities() {
            return isLinux ? 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ : undefined;
        }
    })(), logService, new (class extends mock() {
    })());
    result.$initializeWorkspace(data, true);
    return result;
}
suite('ExtHostWorkspace', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertAsRelativePath(workspace, input, expected, includeWorkspace) {
        const actual = workspace.getRelativePath(input, includeWorkspace);
        assert.strictEqual(actual, expected);
    }
    test('asRelativePath', () => {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            folders: [aWorkspaceFolderData(URI.file('/Coding/Applications/NewsWoWBot'), 0)],
            name: 'Test',
        }, new NullLogService());
        assertAsRelativePath(ws, '/Coding/Applications/NewsWoWBot/bernd/das/brot', 'bernd/das/brot');
        assertAsRelativePath(ws, '/Apps/DartPubCache/hosted/pub.dartlang.org/convert-2.0.1/lib/src/hex.dart', '/Apps/DartPubCache/hosted/pub.dartlang.org/convert-2.0.1/lib/src/hex.dart');
        assertAsRelativePath(ws, '', '');
        assertAsRelativePath(ws, '/foo/bar', '/foo/bar');
        assertAsRelativePath(ws, 'in/out', 'in/out');
    });
    test('asRelativePath, same paths, #11402', function () {
        const root = '/home/aeschli/workspaces/samples/docker';
        const input = '/home/aeschli/workspaces/samples/docker';
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(ws, input, input);
        const input2 = '/home/aeschli/workspaces/samples/docker/a.file';
        assertAsRelativePath(ws, input2, 'a.file');
    });
    test('asRelativePath, no workspace', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), null, new NullLogService());
        assertAsRelativePath(ws, '', '');
        assertAsRelativePath(ws, '/foo/bar', '/foo/bar');
    });
    test('asRelativePath, multiple folders', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            folders: [
                aWorkspaceFolderData(URI.file('/Coding/One'), 0),
                aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
            ],
            name: 'Test',
        }, new NullLogService());
        assertAsRelativePath(ws, '/Coding/One/file.txt', 'One/file.txt');
        assertAsRelativePath(ws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
        assertAsRelativePath(ws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
    });
    test('slightly inconsistent behaviour of asRelativePath and getWorkspaceFolder, #31553', function () {
        const mrws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            folders: [
                aWorkspaceFolderData(URI.file('/Coding/One'), 0),
                aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
            ],
            name: 'Test',
        }, new NullLogService());
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt');
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'One/file.txt', true);
        assertAsRelativePath(mrws, '/Coding/One/file.txt', 'file.txt', false);
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt');
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'Two/files/out.txt', true);
        assertAsRelativePath(mrws, '/Coding/Two/files/out.txt', 'files/out.txt', false);
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
        assertAsRelativePath(mrws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);
        const srws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', folders: [aWorkspaceFolderData(URI.file('/Coding/One'), 0)], name: 'Test' }, new NullLogService());
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt');
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'file.txt', false);
        assertAsRelativePath(srws, '/Coding/One/file.txt', 'One/file.txt', true);
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt');
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', true);
        assertAsRelativePath(srws, '/Coding/Two2/files/out.txt', '/Coding/Two2/files/out.txt', false);
    });
    test('getPath, legacy', function () {
        let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), null, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), undefined, new NullLogService());
        assert.strictEqual(ws.getPath(), undefined);
        ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.file('Folder'), 0),
                aWorkspaceFolderData(URI.file('Another/Folder'), 1),
            ],
        }, new NullLogService());
        assert.strictEqual(ws.getPath().replace(/\\/g, '/'), '/Folder');
        ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.file('/Folder'), 0)] }, new NullLogService());
        assert.strictEqual(ws.getPath().replace(/\\/g, '/'), '/Folder');
    });
    test('WorkspaceFolder has name and index', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            folders: [
                aWorkspaceFolderData(URI.file('/Coding/One'), 0),
                aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
            ],
            name: 'Test',
        }, new NullLogService());
        const [one, two] = ws.getWorkspaceFolders();
        assert.strictEqual(one.name, 'One');
        assert.strictEqual(one.index, 0);
        assert.strictEqual(two.name, 'Two');
        assert.strictEqual(two.index, 1);
    });
    test('getContainingWorkspaceFolder', () => {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), {
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.file('/Coding/One'), 0),
                aWorkspaceFolderData(URI.file('/Coding/Two'), 1),
                aWorkspaceFolderData(URI.file('/Coding/Two/Nested'), 2),
            ],
        }, new NullLogService());
        let folder = ws.getWorkspaceFolder(URI.file('/foo/bar'));
        assert.strictEqual(folder, undefined);
        folder = ws.getWorkspaceFolder(URI.file('/Coding/One/file/path.txt'));
        assert.strictEqual(folder.name, 'One');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/file/path.txt'));
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nest'));
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/file'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/f'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'), true);
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'), true);
        assert.strictEqual(folder.name, 'Two');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two/Nested/'));
        assert.strictEqual(folder.name, 'Nested');
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), true);
        assert.strictEqual(folder, undefined);
        folder = ws.getWorkspaceFolder(URI.file('/Coding/Two'), false);
        assert.strictEqual(folder.name, 'Two');
    });
    test('Multiroot change event should have a delta, #29641', function (done) {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        let sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.deepStrictEqual(e.removed, []);
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
        sub.dispose();
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)],
        });
        sub.dispose();
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar2');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar2'), 1),
            ],
        });
        sub.dispose();
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.strictEqual(e.removed.length, 2);
                assert.strictEqual(e.removed[0].uri.toString(), 'foo:bar');
                assert.strictEqual(e.removed[1].uri.toString(), 'foo:bar2');
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar3');
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0)],
        });
        sub.dispose();
        finish();
    });
    test('Multiroot change keeps existing workspaces live', function () {
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] }, new NullLogService());
        const firstFolder = ws.getWorkspaceFolders()[0];
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar2'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar'), 1, 'renamed'),
            ],
        });
        assert.strictEqual(ws.getWorkspaceFolders()[1], firstFolder);
        assert.strictEqual(firstFolder.index, 1);
        assert.strictEqual(firstFolder.name, 'renamed');
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar3'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar2'), 1),
                aWorkspaceFolderData(URI.parse('foo:bar'), 2),
            ],
        });
        assert.strictEqual(ws.getWorkspaceFolders()[2], firstFolder);
        assert.strictEqual(firstFolder.index, 2);
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [aWorkspaceFolderData(URI.parse('foo:bar3'), 0)],
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar3'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar'), 1),
            ],
        });
        assert.notStrictEqual(firstFolder, ws.workspace.folders[0]);
    });
    test('updateWorkspaceFolders - invalid arguments', function () {
        let ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, null, null));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, 0));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, -1, -1));
        ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)] }, new NullLogService());
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 1, 1));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2));
        assert.strictEqual(false, ws.updateWorkspaceFolders(extensionDescriptor, 0, 1, asUpdateWorkspaceFolderData(URI.parse('foo:bar'))));
    });
    test('updateWorkspaceFolders - valid arguments', function (done) {
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        const protocol = {
            getProxy: () => {
                return undefined;
            },
            set: () => {
                return undefined;
            },
            dispose: () => { },
            assertRegistered: () => { },
            drain: () => {
                return undefined;
            },
        };
        const ws = createExtHostWorkspace(protocol, { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        //
        // Add one folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar'))));
        assert.strictEqual(1, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        const firstAddedFolder = ws.getWorkspaceFolders()[0];
        let gotEvent = false;
        let sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar');
                assert.strictEqual(e.added[0], firstAddedFolder); // verify object is still live
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [aWorkspaceFolderData(URI.parse('foo:bar'), 0)],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        //
        // Add two more folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 1, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar1')), asUpdateWorkspaceFolderData(URI.parse('foo:bar2'))));
        assert.strictEqual(3, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        assert.strictEqual(ws.workspace.folders[2].uri.toString(), URI.parse('foo:bar2').toString());
        const secondAddedFolder = ws.getWorkspaceFolders()[1];
        const thirdAddedFolder = ws.getWorkspaceFolders()[2];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.removed, []);
                assert.strictEqual(e.added.length, 2);
                assert.strictEqual(e.added[0].uri.toString(), 'foo:bar1');
                assert.strictEqual(e.added[1].uri.toString(), 'foo:bar2');
                assert.strictEqual(e.added[0], secondAddedFolder);
                assert.strictEqual(e.added[1], thirdAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar1'), 1),
                aWorkspaceFolderData(URI.parse('foo:bar2'), 2),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[2], thirdAddedFolder); // verify object is still live
        //
        // Remove one folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 1));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.strictEqual(e.removed.length, 1);
                assert.strictEqual(e.removed[0], thirdAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar1'), 1),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        //
        // Rename folder
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar'), 'renamed 1'), asUpdateWorkspaceFolderData(URI.parse('foo:bar1'), 'renamed 2')));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar1').toString());
        assert.strictEqual(ws.workspace.folders[0].name, 'renamed 1');
        assert.strictEqual(ws.workspace.folders[1].name, 'renamed 2');
        assert.strictEqual(ws.getWorkspaceFolders()[0].name, 'renamed 1');
        assert.strictEqual(ws.getWorkspaceFolders()[1].name, 'renamed 2');
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.deepStrictEqual(e.added, []);
                assert.strictEqual(e.removed.length, 0);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar'), 0, 'renamed 1'),
                aWorkspaceFolderData(URI.parse('foo:bar1'), 1, 'renamed 2'),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], firstAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], secondAddedFolder); // verify object is still live
        assert.strictEqual(ws.workspace.folders[0].name, 'renamed 1');
        assert.strictEqual(ws.workspace.folders[1].name, 'renamed 2');
        assert.strictEqual(ws.getWorkspaceFolders()[0].name, 'renamed 1');
        assert.strictEqual(ws.getWorkspaceFolders()[1].name, 'renamed 2');
        //
        // Add and remove folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar3')), asUpdateWorkspaceFolderData(URI.parse('foo:bar4'))));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar4').toString());
        const fourthAddedFolder = ws.getWorkspaceFolders()[0];
        const fifthAddedFolder = ws.getWorkspaceFolders()[1];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.strictEqual(e.added.length, 2);
                assert.strictEqual(e.added[0], fourthAddedFolder);
                assert.strictEqual(e.added[1], fifthAddedFolder);
                assert.strictEqual(e.removed.length, 2);
                assert.strictEqual(e.removed[0], firstAddedFolder);
                assert.strictEqual(e.removed[1], secondAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar3'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar4'), 1),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fourthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fifthAddedFolder); // verify object is still live
        //
        // Swap folders
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 0, 2, asUpdateWorkspaceFolderData(URI.parse('foo:bar4')), asUpdateWorkspaceFolderData(URI.parse('foo:bar3'))));
        assert.strictEqual(2, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar4').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.strictEqual(e.added.length, 0);
                assert.strictEqual(e.removed.length, 0);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar4'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar3'), 1),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        assert.strictEqual(fifthAddedFolder.index, 0);
        assert.strictEqual(fourthAddedFolder.index, 1);
        //
        // Add one folder after the other without waiting for confirmation (not supported currently)
        //
        assert.strictEqual(true, ws.updateWorkspaceFolders(extensionDescriptor, 2, 0, asUpdateWorkspaceFolderData(URI.parse('foo:bar5'))));
        assert.strictEqual(3, ws.workspace.folders.length);
        assert.strictEqual(ws.workspace.folders[0].uri.toString(), URI.parse('foo:bar4').toString());
        assert.strictEqual(ws.workspace.folders[1].uri.toString(), URI.parse('foo:bar3').toString());
        assert.strictEqual(ws.workspace.folders[2].uri.toString(), URI.parse('foo:bar5').toString());
        const sixthAddedFolder = ws.getWorkspaceFolders()[2];
        gotEvent = false;
        sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.strictEqual(e.added.length, 1);
                assert.strictEqual(e.added[0], sixthAddedFolder);
                gotEvent = true;
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({
            id: 'foo',
            name: 'Test',
            folders: [
                aWorkspaceFolderData(URI.parse('foo:bar4'), 0),
                aWorkspaceFolderData(URI.parse('foo:bar3'), 1),
                aWorkspaceFolderData(URI.parse('foo:bar5'), 2),
            ],
        }); // simulate acknowledgement from main side
        assert.strictEqual(gotEvent, true);
        sub.dispose();
        assert.strictEqual(ws.getWorkspaceFolders()[0], fifthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[1], fourthAddedFolder); // verify object is still live
        assert.strictEqual(ws.getWorkspaceFolders()[2], sixthAddedFolder); // verify object is still live
        finish();
    });
    test('Multiroot change event is immutable', function (done) {
        let finished = false;
        const finish = (error) => {
            if (!finished) {
                finished = true;
                done(error);
            }
        };
        const ws = createExtHostWorkspace(new TestRPCProtocol(), { id: 'foo', name: 'Test', folders: [] }, new NullLogService());
        const sub = ws.onDidChangeWorkspace((e) => {
            try {
                assert.throws(() => {
                    ;
                    e.added = [];
                });
                // assert.throws(() => {
                // 	(<any>e.added)[0] = null;
                // });
            }
            catch (error) {
                finish(error);
            }
        });
        ws.$acceptWorkspaceData({ id: 'foo', name: 'Test', folders: [] });
        sub.dispose();
        finish();
    });
    test("`vscode.workspace.getWorkspaceFolder(file)` don't return workspace folder when file open from command line. #36221", function () {
        if (isWindows) {
            const ws = createExtHostWorkspace(new TestRPCProtocol(), {
                id: 'foo',
                name: 'Test',
                folders: [aWorkspaceFolderData(URI.file('c:/Users/marek/Desktop/vsc_test/'), 0)],
            }, new NullLogService());
            assert.ok(ws.getWorkspaceFolder(URI.file('c:/Users/marek/Desktop/vsc_test/a.txt')));
            assert.ok(ws.getWorkspaceFolder(URI.file('C:/Users/marek/Desktop/vsc_test/b.txt')));
        }
    });
    function aWorkspaceFolderData(uri, index, name = '') {
        return {
            uri,
            index,
            name: name || basename(uri.path),
        };
    }
    function asUpdateWorkspaceFolderData(uri, name) {
        return { uri, name };
    }
    suite('findFiles -', function () {
        test('string include', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'foo');
                    assert.strictEqual(_includeFolder, null);
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.maxResults, 10);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles('foo', undefined, 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        function testFindFilesInclude(pattern) {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.deepStrictEqual(_includeFolder ? URI.from(_includeFolder).toJSON() : null, URI.file('/other/folder').toJSON());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws.findFiles(pattern, undefined, 10, new ExtensionIdentifier('test')).then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        }
        test('RelativePattern include (string)', () => {
            return testFindFilesInclude(new RelativePattern('/other/folder', 'glob/**'));
        });
        test('RelativePattern include (URI)', () => {
            return testFindFilesInclude(new RelativePattern(URI.file('/other/folder'), 'glob/**'));
        });
        test('no excludes', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.deepStrictEqual(URI.revive(_includeFolder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, true);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles(new RelativePattern('/other/folder', 'glob/**'), null, 10, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('with cancelled token', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            return ws
                .findFiles(new RelativePattern('/other/folder', 'glob/**'), null, 10, new ExtensionIdentifier('test'), token)
                .then(() => {
                assert(!mainThreadCalled, '!mainThreadCalled');
            });
        });
        test('RelativePattern exclude', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // Note that the base portion is ignored, see #52651
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles('', new RelativePattern(root, 'glob/**'), 10, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
    });
    suite('findFiles2 -', function () {
        test('string include', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'foo');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(_includeFolder, null);
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.maxResults, 10);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2(['foo'], { maxResults: 10, useExcludeSettings: ExcludeSettingOptions.FilesExclude }, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        function testFindFiles2Include(pattern) {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'glob/**');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.deepStrictEqual(_includeFolder ? URI.from(_includeFolder).toJSON() : null, URI.file('/other/folder').toJSON());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2(pattern, { maxResults: 10 }, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        }
        test('RelativePattern include (string)', () => {
            return testFindFiles2Include([new RelativePattern('/other/folder', 'glob/**')]);
        });
        test('RelativePattern include (URI)', () => {
            return testFindFiles2Include([new RelativePattern(URI.file('/other/folder'), 'glob/**')]);
        });
        test('no excludes', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.filePattern, 'glob/**');
                    assert.strictEqual(options.includePattern, undefined);
                    assert.deepStrictEqual(URI.revive(_includeFolder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.excludePattern, undefined);
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2([new RelativePattern('/other/folder', 'glob/**')], {}, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('with cancelled token', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            return ws
                .findFiles2([new RelativePattern('/other/folder', 'glob/**')], {}, new ExtensionIdentifier('test'), token)
                .then(() => {
                assert(!mainThreadCalled, '!mainThreadCalled');
            });
        });
        test('RelativePattern exclude', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // Note that the base portion is ignored, see #52651
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2([''], { exclude: [new RelativePattern(root, 'glob/**')] }, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('useIgnoreFiles', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.disregardExcludeSettings, false);
                    assert.strictEqual(options.disregardIgnoreFiles, false);
                    assert.strictEqual(options.disregardGlobalIgnoreFiles, false);
                    assert.strictEqual(options.disregardParentIgnoreFiles, false);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2([''], { useIgnoreFiles: { local: true, parent: true, global: true } }, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        test('use symlinks', () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                $startFileSearch(_includeFolder, options, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(options.ignoreSymlinks, false);
                    return Promise.resolve(null);
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            return ws
                .findFiles2([''], { followSymlinks: true }, new ExtensionIdentifier('test'))
                .then(() => {
                assert(mainThreadCalled, 'mainThreadCalled');
            });
        });
        // todo: add tests with multiple filePatterns and excludes
    });
    suite('findTextInFiles -', function () {
        test('no include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('string include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, '**/files');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { include: '**/files' }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('RelativePattern include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(URI.revive(folder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { include: new RelativePattern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('with cancelled token', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            await ws.findTextInFiles({ pattern: 'foo' }, {}, () => { }, new ExtensionIdentifier('test'), token);
            assert(!mainThreadCalled, '!mainThreadCalled');
        });
        test('RelativePattern exclude', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // exclude folder is ignored...
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles({ pattern: 'foo' }, { exclude: new RelativePattern('/other/folder', 'glob/**') }, () => { }, new ExtensionIdentifier('test'));
            assert(mainThreadCalled, 'mainThreadCalled');
        });
    });
    suite('findTextInFiles2 -', function () {
        test('no include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles2({ pattern: 'foo' }, {}, new ExtensionIdentifier('test')).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('string include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.strictEqual(folder, null);
                    assert.strictEqual(options.includePattern, '**/files');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles2({ pattern: 'foo' }, { include: ['**/files'] }, new ExtensionIdentifier('test')).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('RelativePattern include', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(URI.revive(folder).toString(), URI.file('/other/folder').toString());
                    assert.strictEqual(options.includePattern, 'glob/**');
                    assert.strictEqual(options.excludePattern, undefined);
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles2({ pattern: 'foo' }, { include: [new RelativePattern('/other/folder', 'glob/**')] }, new ExtensionIdentifier('test')).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        test('with cancelled token', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            const token = CancellationToken.Cancelled;
            await ws.findTextInFiles2({ pattern: 'foo' }, undefined, new ExtensionIdentifier('test'), token).complete;
            assert(!mainThreadCalled, '!mainThreadCalled');
        });
        test('RelativePattern exclude', async () => {
            const root = '/project/foo';
            const rpcProtocol = new TestRPCProtocol();
            let mainThreadCalled = false;
            rpcProtocol.set(MainContext.MainThreadWorkspace, new (class extends mock() {
                async $startTextSearch(query, folder, options, requestId, token) {
                    mainThreadCalled = true;
                    assert.strictEqual(query.pattern, 'foo');
                    assert.deepStrictEqual(folder, null);
                    assert.strictEqual(options.includePattern, undefined);
                    assert.strictEqual(options.excludePattern?.length, 1);
                    assert.strictEqual(options.excludePattern[0].pattern, 'glob/**'); // exclude folder is ignored...
                    return null;
                }
            })());
            const ws = createExtHostWorkspace(rpcProtocol, { id: 'foo', folders: [aWorkspaceFolderData(URI.file(root), 0)], name: 'Test' }, new NullLogService());
            await ws.findTextInFiles2({ pattern: 'foo' }, { exclude: [new RelativePattern('/other/folder', 'glob/**')] }, new ExtensionIdentifier('test')).complete;
            assert(mainThreadCalled, 'mainThreadCalled');
        });
        // TODO: test multiple includes/excludess
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0V29ya3NwYWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdwRixPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFPckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUd4RSxPQUFPLEVBQUUsd0JBQXdCLElBQUksbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVuSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMs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