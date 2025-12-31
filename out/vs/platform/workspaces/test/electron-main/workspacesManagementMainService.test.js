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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy90ZXN0L2VsZWN0cm9uLW1haW4vd29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU12RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0Ms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