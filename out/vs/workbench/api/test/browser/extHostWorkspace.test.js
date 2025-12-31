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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFdvcmtzcGFjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHcEYsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBT3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHeEUsT0FBTyxFQUFFLHdCQUF3QixJQUFJLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFbkgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHFC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