/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import { isUNC, toSlashes } from '../../../../base/common/extpath.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as path from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import * as pfs from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { EnvironmentMainService } from '../../../environment/electron-main/environmentMainService.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { StateService } from '../../../state/node/stateService.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesMainService } from '../../../userDataProfile/electron-main/userDataProfile.js';
import { WORKSPACE_EXTENSION, } from '../../../workspace/common/workspace.js';
import { rewriteWorkspaceFileForNewLocation, } from '../../common/workspaces.js';
import { WorkspacesManagementMainService } from '../../electron-main/workspacesManagementMainService.js';
flakySuite('WorkspacesManagementMainService', () => {
    class TestDialogMainService {
        pickFileFolder(options, window) {
            throw new Error('Method not implemented.');
        }
        pickFolder(options, window) {
            throw new Error('Method not implemented.');
        }
        pickFile(options, window) {
            throw new Error('Method not implemented.');
        }
        pickWorkspace(options, window) {
            throw new Error('Method not implemented.');
        }
        showMessageBox(options, window) {
            throw new Error('Method not implemented.');
        }
        showSaveDialog(options, window) {
            throw new Error('Method not implemented.');
        }
        showOpenDialog(options, window) {
            throw new Error('Method not implemented.');
        }
    }
    class TestBackupMainService {
        isHotExitEnabled() {
            throw new Error('Method not implemented.');
        }
        getEmptyWindowBackups() {
            throw new Error('Method not implemented.');
        }
        registerWorkspaceBackup(workspaceInfo, migrateFrom) {
            throw new Error('Method not implemented.');
        }
        registerFolderBackup(folder) {
            throw new Error('Method not implemented.');
        }
        registerEmptyWindowBackup(empty) {
            throw new Error('Method not implemented.');
        }
        async getDirtyWorkspaces() {
            return [];
        }
    }
    function createUntitledWorkspace(folders, names) {
        return service.createUntitledWorkspace(folders.map((folder, index) => ({
            uri: URI.file(folder),
            name: names ? names[index] : undefined,
        })));
    }
    function createWorkspace(workspaceConfigPath, folders, names) {
        const ws = {
            folders: [],
        };
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];
            const s = f instanceof URI ? { uri: f.toString() } : { path: f };
            if (names) {
                s.name = names[i];
            }
            ws.folders.push(s);
        }
        fs.writeFileSync(workspaceConfigPath, JSON.stringify(ws));
    }
    let testDir;
    let untitledWorkspacesHomePath;
    let environmentMainService;
    let service;
    const cwd = process.cwd();
    const tmpDir = os.tmpdir();
    setup(async () => {
        testDir = getRandomTestPath(tmpDir, 'vsctests', 'workspacesmanagementmainservice');
        untitledWorkspacesHomePath = path.join(testDir, 'Workspaces');
        const productService = { _serviceBrand: undefined, ...product };
        environmentMainService = new (class TestEnvironmentService extends EnvironmentMainService {
            constructor() {
                super(parseArgs(process.argv, OPTIONS), productService);
            }
            get untitledWorkspacesHome() {
                return URI.file(untitledWorkspacesHomePath);
            }
        })();
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        service = new WorkspacesManagementMainService(environmentMainService, logService, new UserDataProfilesMainService(new StateService(1 /* SaveStrategy.DELAYED */, environmentMainService, logService, fileService), new UriIdentityService(fileService), environmentMainService, fileService, logService), new TestBackupMainService(), new TestDialogMainService());
        return fs.promises.mkdir(untitledWorkspacesHomePath, { recursive: true });
    });
    teardown(() => {
        service.dispose();
        return pfs.Promises.rm(testDir);
    });
    function assertPathEquals(pathInWorkspaceFile, pathOnDisk) {
        if (isWindows) {
            pathInWorkspaceFile = normalizeDriveLetter(pathInWorkspaceFile);
            pathOnDisk = normalizeDriveLetter(pathOnDisk);
            if (!isUNC(pathOnDisk)) {
                pathOnDisk = toSlashes(pathOnDisk); // workspace file is using slashes for all paths except where mandatory
            }
        }
        assert.strictEqual(pathInWorkspaceFile, pathOnDisk);
    }
    function assertEqualURI(u1, u2) {
        assert.strictEqual(u1.toString(), u2.toString());
    }
    test('createWorkspace (folders)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assertPathEquals(ws.folders[0].path, cwd);
        assertPathEquals(ws.folders[1].path, tmpDir);
        assert.ok(!ws.folders[0].name);
        assert.ok(!ws.folders[1].name);
    });
    test('createWorkspace (folders with name)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir], ['currentworkingdirectory', 'tempdir']);
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assertPathEquals(ws.folders[0].path, cwd);
        assertPathEquals(ws.folders[1].path, tmpDir);
        assert.strictEqual(ws.folders[0].name, 'currentworkingdirectory');
        assert.strictEqual(ws.folders[1].name, 'tempdir');
    });
    test('createUntitledWorkspace (folders as other resource URIs)', async () => {
        const folder1URI = URI.parse('myscheme://server/work/p/f1');
        const folder2URI = URI.parse('myscheme://server/work/o/f3');
        const workspace = await service.createUntitledWorkspace([{ uri: folder1URI }, { uri: folder2URI }], 'server');
        assert.ok(workspace);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        assert.ok(service.isUntitledWorkspace(workspace));
        const ws = JSON.parse(fs.readFileSync(workspace.configPath.fsPath).toString());
        assert.strictEqual(ws.folders.length, 2);
        assert.strictEqual(ws.folders[0].uri, folder1URI.toString(true));
        assert.strictEqual(ws.folders[1].uri, folder2URI.toString(true));
        assert.ok(!ws.folders[0].name);
        assert.ok(!ws.folders[1].name);
        assert.strictEqual(ws.remoteAuthority, 'server');
    });
    test('resolveWorkspace', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(await service.resolveLocalWorkspace(workspace.configPath));
        // make it a valid workspace path
        const newPath = path.join(path.dirname(workspace.configPath.fsPath), `workspace.${WORKSPACE_EXTENSION}`);
        fs.renameSync(workspace.configPath.fsPath, newPath);
        workspace.configPath = URI.file(newPath);
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assert.strictEqual(2, resolved.folders.length);
        assertEqualURI(resolved.configPath, workspace.configPath);
        assert.ok(resolved.id);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ something: 'something' })); // invalid workspace
        const resolvedInvalid = await service.resolveLocalWorkspace(workspace.configPath);
        assert.ok(!resolvedInvalid);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ transient: true, folders: [] })); // transient worksapce
        const resolvedTransient = await service.resolveLocalWorkspace(workspace.configPath);
        assert.ok(resolvedTransient?.transient);
    });
    test('resolveWorkspace (support relative paths)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: './ticino-playground/lib' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('resolveWorkspace (support relative paths #2)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: './ticino-playground/lib/../other' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'other')));
    });
    test('resolveWorkspace (support relative paths #3)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, JSON.stringify({ folders: [{ path: 'ticino-playground/lib' }] }));
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('resolveWorkspace (support invalid JSON via fault tolerant parsing)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        fs.writeFileSync(workspace.configPath.fsPath, '{ "folders": [ { "path": "./ticino-playground/lib" } , ] }'); // trailing comma
        const resolved = await service.resolveLocalWorkspace(workspace.configPath);
        assertEqualURI(resolved.folders[0].uri, URI.file(path.join(path.dirname(workspace.configPath.fsPath), 'ticino-playground', 'lib')));
    });
    test('rewriteWorkspaceFileForNewLocation', async () => {
        const folder1 = cwd; // absolute path because outside of tmpDir
        const tmpInsideDir = path.join(tmpDir, 'inside');
        const firstConfigPath = path.join(tmpDir, 'myworkspace0.code-workspace');
        createWorkspace(firstConfigPath, [folder1, 'inside', path.join('inside', 'somefolder')]);
        const origContent = fs.readFileSync(firstConfigPath).toString();
        let origConfigPath = URI.file(firstConfigPath);
        let workspaceConfigPath = URI.file(path.join(tmpDir, 'inside', 'myworkspace1.code-workspace'));
        let newContent = rewriteWorkspaceFileForNewLocation(origContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        let ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1); // absolute path because outside of tmpdir
        assertPathEquals(ws.folders[1].path, '.');
        assertPathEquals(ws.folders[2].path, 'somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.file(path.join(tmpDir, 'myworkspace2.code-workspace'));
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1);
        assertPathEquals(ws.folders[1].path, 'inside');
        assertPathEquals(ws.folders[2].path, 'inside/somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.file(path.join(tmpDir, 'other', 'myworkspace2.code-workspace'));
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assertPathEquals(ws.folders[0].path, folder1);
        assertPathEquals(ws.folders[1].path, '../inside');
        assertPathEquals(ws.folders[2].path, '../inside/somefolder');
        origConfigPath = workspaceConfigPath;
        workspaceConfigPath = URI.parse('foo://foo/bar/myworkspace2.code-workspace');
        newContent = rewriteWorkspaceFileForNewLocation(newContent, origConfigPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        ws = JSON.parse(newContent);
        assert.strictEqual(ws.folders.length, 3);
        assert.strictEqual(ws.folders[0].uri, URI.file(folder1).toString(true));
        assert.strictEqual(ws.folders[1].uri, URI.file(tmpInsideDir).toString(true));
        assert.strictEqual(ws.folders[2].uri, URI.file(path.join(tmpInsideDir, 'somefolder')).toString(true));
        fs.unlinkSync(firstConfigPath);
    });
    test('rewriteWorkspaceFileForNewLocation (preserves comments)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir, path.join(tmpDir, 'somefolder')]);
        const workspaceConfigPath = URI.file(path.join(tmpDir, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        let origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        origContent = `// this is a comment\n${origContent}`;
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        assert.strictEqual(0, newContent.indexOf('// this is a comment'));
        await service.deleteUntitledWorkspace(workspace);
    });
    test('rewriteWorkspaceFileForNewLocation (preserves forward slashes)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir, path.join(tmpDir, 'somefolder')]);
        const workspaceConfigPath = URI.file(path.join(tmpDir, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        let origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        origContent = origContent.replace(/[\\]/g, '/'); // convert backslash to slash
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, false, workspaceConfigPath, extUriBiasedIgnorePathCase);
        const ws = JSON.parse(newContent);
        assert.ok(ws.folders.every((f) => f.path.indexOf('\\') < 0));
        await service.deleteUntitledWorkspace(workspace);
    });
    (!isWindows ? test.skip : test)('rewriteWorkspaceFileForNewLocation (unc paths)', async () => {
        const workspaceLocation = path.join(tmpDir, 'wsloc');
        const folder1Location = 'x:\\foo';
        const folder2Location = '\\\\server\\share2\\some\\path';
        const folder3Location = path.join(workspaceLocation, 'inner', 'more');
        const workspace = await createUntitledWorkspace([
            folder1Location,
            folder2Location,
            folder3Location,
        ]);
        const workspaceConfigPath = URI.file(path.join(workspaceLocation, `myworkspace.${Date.now()}.${WORKSPACE_EXTENSION}`));
        const origContent = fs.readFileSync(workspace.configPath.fsPath).toString();
        const newContent = rewriteWorkspaceFileForNewLocation(origContent, workspace.configPath, true, workspaceConfigPath, extUriBiasedIgnorePathCase);
        const ws = JSON.parse(newContent);
        assertPathEquals(ws.folders[0].path, folder1Location);
        assertPathEquals(ws.folders[1].path, folder2Location);
        assertPathEquals(ws.folders[2].path, 'inner/more');
        await service.deleteUntitledWorkspace(workspace);
    });
    test('deleteUntitledWorkspace (untitled)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(fs.existsSync(workspace.configPath.fsPath));
        await service.deleteUntitledWorkspace(workspace);
        assert.ok(!fs.existsSync(workspace.configPath.fsPath));
    });
    test('deleteUntitledWorkspace (saved)', async () => {
        const workspace = await createUntitledWorkspace([cwd, tmpDir]);
        await service.deleteUntitledWorkspace(workspace);
    });
    test('getUntitledWorkspace', async function () {
        await service.initialize();
        let untitled = service.getUntitledWorkspaces();
        assert.strictEqual(untitled.length, 0);
        const untitledOne = await createUntitledWorkspace([cwd, tmpDir]);
        assert.ok(fs.existsSync(untitledOne.configPath.fsPath));
        await service.initialize();
        untitled = service.getUntitledWorkspaces();
        assert.strictEqual(1, untitled.length);
        assert.strictEqual(untitledOne.id, untitled[0].workspace.id);
        await service.deleteUntitledWorkspace(untitledOne);
        await service.initialize();
        untitled = service.getUntitledWorkspaces();
        assert.strictEqual(0, untitled.length);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL3Rlc3QvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzTWFuYWdlbWVudE1haW5TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBTXZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHND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