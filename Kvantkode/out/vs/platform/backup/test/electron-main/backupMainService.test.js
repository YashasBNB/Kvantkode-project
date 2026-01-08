/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { Promises } from '../../../../base/node/pfs.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { BackupMainService } from '../../electron-main/backupMainService.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { EnvironmentMainService } from '../../../environment/electron-main/environmentMainService.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { HotExitConfiguration } from '../../../files/common/files.js';
import { ConsoleMainLogger } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { isFolderBackupInfo } from '../../common/backup.js';
import { InMemoryTestStateMainService } from '../../../test/electron-main/workbenchTestServices.js';
import { LogService } from '../../../log/common/logService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
flakySuite('BackupMainService', () => {
    function assertEqualFolderInfos(actual, expected) {
        const withUriAsString = (f) => ({
            folderUri: f.folderUri.toString(),
            remoteAuthority: f.remoteAuthority,
        });
        assert.deepStrictEqual(actual.map(withUriAsString), expected.map(withUriAsString));
    }
    function toWorkspace(path) {
        return {
            id: createHash('md5').update(sanitizePath(path)).digest('hex'), // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
            configPath: URI.file(path),
        };
    }
    function toWorkspaceBackupInfo(path, remoteAuthority) {
        return {
            workspace: {
                id: createHash('md5').update(sanitizePath(path)).digest('hex'), // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
                configPath: URI.file(path),
            },
            remoteAuthority,
        };
    }
    function toFolderBackupInfo(uri, remoteAuthority) {
        return { folderUri: uri, remoteAuthority };
    }
    function toSerializedWorkspace(ws) {
        return {
            id: ws.id,
            configURIPath: ws.configPath.toString(),
        };
    }
    function ensureFolderExists(uri) {
        if (!fs.existsSync(uri.fsPath)) {
            fs.mkdirSync(uri.fsPath);
        }
        const backupFolder = service.toBackupPath(uri);
        return createBackupFolder(backupFolder);
    }
    async function ensureWorkspaceExists(workspace) {
        if (!fs.existsSync(workspace.configPath.fsPath)) {
            await Promises.writeFile(workspace.configPath.fsPath, 'Hello');
        }
        const backupFolder = service.toBackupPath(workspace.id);
        await createBackupFolder(backupFolder);
        return workspace;
    }
    async function createBackupFolder(backupFolder) {
        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder);
            fs.mkdirSync(path.join(backupFolder, Schemas.file));
            await Promises.writeFile(path.join(backupFolder, Schemas.file, 'foo.txt'), 'Hello');
        }
    }
    function readWorkspacesMetadata() {
        return stateMainService.getItem('backupWorkspaces');
    }
    function writeWorkspacesMetadata(data) {
        if (!data) {
            stateMainService.removeItem('backupWorkspaces');
        }
        else {
            stateMainService.setItem('backupWorkspaces', JSON.parse(data));
        }
    }
    function sanitizePath(p) {
        return platform.isLinux ? p : p.toLowerCase();
    }
    const fooFile = URI.file(platform.isWindows ? 'C:\\foo' : '/foo');
    const barFile = URI.file(platform.isWindows ? 'C:\\bar' : '/bar');
    let service;
    let configService;
    let stateMainService;
    let environmentService;
    let testDir;
    let backupHome;
    let existingTestFolder1;
    setup(async () => {
        testDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'backupmainservice');
        backupHome = path.join(testDir, 'Backups');
        existingTestFolder1 = URI.file(path.join(testDir, 'folder1'));
        environmentService = new EnvironmentMainService(parseArgs(process.argv, OPTIONS), {
            _serviceBrand: undefined,
            ...product,
        });
        await fs.promises.mkdir(backupHome, { recursive: true });
        configService = new TestConfigurationService();
        stateMainService = new InMemoryTestStateMainService();
        service = new (class TestBackupMainService extends BackupMainService {
            constructor() {
                super(environmentService, configService, new LogService(new ConsoleMainLogger()), stateMainService);
                this.backupHome = backupHome;
            }
            toBackupPath(arg) {
                const id = arg instanceof URI ? super.getFolderHash({ folderUri: arg }) : arg;
                return path.join(this.backupHome, id);
            }
            testGetFolderHash(folder) {
                return super.getFolderHash(folder);
            }
            testGetWorkspaceBackups() {
                return super.getWorkspaceBackups();
            }
            testGetFolderBackups() {
                return super.getFolderBackups();
            }
        })();
        return service.initialize();
    });
    teardown(() => {
        return Promises.rm(testDir);
    });
    test('service validates backup workspaces on startup and cleans up (folder workspaces)', async function () {
        // 1) backup workspace path does not exist
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        // 2) backup workspace path exists with empty contents within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 3) backup workspace path exists with empty folders within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(path.join(service.toBackupPath(fooFile), Schemas.file));
        fs.mkdirSync(path.join(service.toBackupPath(barFile), Schemas.untitled));
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        service.registerFolderBackup(toFolderBackupInfo(barFile));
        await service.initialize();
        assertEqualFolderInfos(service.testGetFolderBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 4) backup workspace path points to a workspace that no longer exists
        // so it should convert the backup worspace to an empty workspace backup
        const fileBackups = path.join(service.toBackupPath(fooFile), Schemas.file);
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(fileBackups);
        service.registerFolderBackup(toFolderBackupInfo(fooFile));
        assert.strictEqual(service.testGetFolderBackups().length, 1);
        assert.strictEqual(service.getEmptyWindowBackups().length, 0);
        fs.writeFileSync(path.join(fileBackups, 'backup.txt'), '');
        await service.initialize();
        assert.strictEqual(service.testGetFolderBackups().length, 0);
        assert.strictEqual(service.getEmptyWindowBackups().length, 1);
    });
    test('service validates backup workspaces on startup and cleans up (root workspaces)', async function () {
        // 1) backup workspace path does not exist
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        // 2) backup workspace path exists with empty contents within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 3) backup workspace path exists with empty folders within
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(path.join(service.toBackupPath(fooFile), Schemas.file));
        fs.mkdirSync(path.join(service.toBackupPath(barFile), Schemas.untitled));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath));
        await service.initialize();
        assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        assert.ok(!fs.existsSync(service.toBackupPath(fooFile)));
        assert.ok(!fs.existsSync(service.toBackupPath(barFile)));
        // 4) backup workspace path points to a workspace that no longer exists
        // so it should convert the backup worspace to an empty workspace backup
        const fileBackups = path.join(service.toBackupPath(fooFile), Schemas.file);
        fs.mkdirSync(service.toBackupPath(fooFile));
        fs.mkdirSync(service.toBackupPath(barFile));
        fs.mkdirSync(fileBackups);
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
        assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
        assert.strictEqual(service.getEmptyWindowBackups().length, 0);
        fs.writeFileSync(path.join(fileBackups, 'backup.txt'), '');
        await service.initialize();
        assert.strictEqual(service.testGetWorkspaceBackups().length, 0);
        assert.strictEqual(service.getEmptyWindowBackups().length, 1);
    });
    test('service supports to migrate backup data from another location', async () => {
        const backupPathToMigrate = service.toBackupPath(fooFile);
        fs.mkdirSync(backupPathToMigrate);
        fs.writeFileSync(path.join(backupPathToMigrate, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToMigrate)));
        const workspaceBackupPath = await service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath), backupPathToMigrate);
        assert.ok(fs.existsSync(workspaceBackupPath));
        assert.ok(fs.existsSync(path.join(workspaceBackupPath, 'backup.txt')));
        assert.ok(!fs.existsSync(backupPathToMigrate));
        const emptyBackups = service.getEmptyWindowBackups();
        assert.strictEqual(0, emptyBackups.length);
    });
    test('service backup migration makes sure to preserve existing backups', async () => {
        const backupPathToMigrate = service.toBackupPath(fooFile);
        fs.mkdirSync(backupPathToMigrate);
        fs.writeFileSync(path.join(backupPathToMigrate, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToMigrate)));
        const backupPathToPreserve = service.toBackupPath(barFile);
        fs.mkdirSync(backupPathToPreserve);
        fs.writeFileSync(path.join(backupPathToPreserve, 'backup.txt'), 'Some Data');
        service.registerFolderBackup(toFolderBackupInfo(URI.file(backupPathToPreserve)));
        const workspaceBackupPath = await service.registerWorkspaceBackup(toWorkspaceBackupInfo(barFile.fsPath), backupPathToMigrate);
        assert.ok(fs.existsSync(workspaceBackupPath));
        assert.ok(fs.existsSync(path.join(workspaceBackupPath, 'backup.txt')));
        assert.ok(!fs.existsSync(backupPathToMigrate));
        const emptyBackups = service.getEmptyWindowBackups();
        assert.strictEqual(1, emptyBackups.length);
        assert.strictEqual(1, fs.readdirSync(path.join(backupHome, emptyBackups[0].backupFolder)).length);
    });
    suite('loadSync', () => {
        test("getFolderBackupPaths() should return [] when workspaces.json doesn't exist", () => {
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when folders in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when folders in workspaces.json is not a string array', async () => {
            writeWorkspacesMetadata('{"folders":{}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": ["bar"]}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": []}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":{"foo": "bar"}}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":"foo"}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
            writeWorkspacesMetadata('{"folders":1}');
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test('getFolderBackupPaths() should return [] when files.hotExit = "onExitAndWindowClose"', async () => {
            const fi = toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase()));
            service.registerFolderBackup(fi);
            assertEqualFolderInfos(service.testGetFolderBackups(), [fi]);
            configService.setUserConfiguration('files.hotExit', HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE);
            await service.initialize();
            assertEqualFolderInfos(service.testGetFolderBackups(), []);
        });
        test("getWorkspaceBackups() should return [] when workspaces.json doesn't exist", () => {
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when folderWorkspaces in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when rootWorkspaces in workspaces.json is not a object array', async () => {
            writeWorkspacesMetadata('{"rootWorkspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"rootWorkspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when workspaces in workspaces.json is not a object array', async () => {
            writeWorkspacesMetadata('{"workspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
            writeWorkspacesMetadata('{"workspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test('getWorkspaceBackups() should return [] when files.hotExit = "onExitAndWindowClose"', async () => {
            const upperFooPath = fooFile.fsPath.toUpperCase();
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(upperFooPath));
            assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
            assert.deepStrictEqual(service.testGetWorkspaceBackups().map((r) => r.workspace.configPath.toString()), [URI.file(upperFooPath).toString()]);
            configService.setUserConfiguration('files.hotExit', HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE);
            await service.initialize();
            assert.deepStrictEqual(service.testGetWorkspaceBackups(), []);
        });
        test("getEmptyWorkspaceBackupPaths() should return [] when workspaces.json doesn't exist", () => {
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
        test('getEmptyWorkspaceBackupPaths() should return [] when folderWorkspaces in workspaces.json is absent', async () => {
            writeWorkspacesMetadata('{}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
        test('getEmptyWorkspaceBackupPaths() should return [] when folderWorkspaces in workspaces.json is not a string array', async function () {
            writeWorkspacesMetadata('{"emptyWorkspaces":{}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": ["bar"]}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": []}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":{"foo": "bar"}}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":"foo"}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
            writeWorkspacesMetadata('{"emptyWorkspaces":1}');
            await service.initialize();
            assert.deepStrictEqual(service.getEmptyWindowBackups(), []);
        });
    });
    suite('dedupeFolderWorkspaces', () => {
        test('should ignore duplicates (folder workspace)', async () => {
            await ensureFolderExists(existingTestFolder1);
            const workspacesJson = {
                workspaces: [],
                folders: [
                    { folderUri: existingTestFolder1.toString() },
                    { folderUri: existingTestFolder1.toString() },
                ],
                emptyWindows: [],
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [{ folderUri: existingTestFolder1.toString() }]);
        });
        test('should ignore duplicates on Windows and Mac (folder workspace)', async () => {
            await ensureFolderExists(existingTestFolder1);
            const workspacesJson = {
                workspaces: [],
                folders: [
                    { folderUri: existingTestFolder1.toString() },
                    { folderUri: existingTestFolder1.toString().toLowerCase() },
                ],
                emptyWindows: [],
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [{ folderUri: existingTestFolder1.toString() }]);
        });
        test('should ignore duplicates on Windows and Mac (root workspace)', async () => {
            const workspacePath = path.join(testDir, 'Foo.code-workspace');
            const workspacePath1 = path.join(testDir, 'FOO.code-workspace');
            const workspacePath2 = path.join(testDir, 'foo.code-workspace');
            const workspace1 = await ensureWorkspaceExists(toWorkspace(workspacePath));
            const workspace2 = await ensureWorkspaceExists(toWorkspace(workspacePath1));
            const workspace3 = await ensureWorkspaceExists(toWorkspace(workspacePath2));
            const workspacesJson = {
                workspaces: [workspace1, workspace2, workspace3].map(toSerializedWorkspace),
                folders: [],
                emptyWindows: [],
            };
            writeWorkspacesMetadata(JSON.stringify(workspacesJson));
            await service.initialize();
            const json = readWorkspacesMetadata();
            assert.strictEqual(json.workspaces.length, platform.isLinux ? 3 : 1);
            if (platform.isLinux) {
                assert.deepStrictEqual(json.workspaces.map((r) => r.configURIPath), [
                    URI.file(workspacePath).toString(),
                    URI.file(workspacePath1).toString(),
                    URI.file(workspacePath2).toString(),
                ]);
            }
            else {
                assert.deepStrictEqual(json.workspaces.map((r) => r.configURIPath), [URI.file(workspacePath).toString()], 'should return the first duplicated entry');
            }
        });
    });
    suite('registerWindowForBackups', () => {
        test('should persist paths to workspaces.json (folder workspace)', async () => {
            service.registerFolderBackup(toFolderBackupInfo(fooFile));
            service.registerFolderBackup(toFolderBackupInfo(barFile));
            assertEqualFolderInfos(service.testGetFolderBackups(), [
                toFolderBackupInfo(fooFile),
                toFolderBackupInfo(barFile),
            ]);
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.folders, [
                { folderUri: fooFile.toString() },
                { folderUri: barFile.toString() },
            ]);
        });
        test('should persist paths to workspaces.json (root workspace)', async () => {
            const ws1 = toWorkspaceBackupInfo(fooFile.fsPath);
            service.registerWorkspaceBackup(ws1);
            const ws2 = toWorkspaceBackupInfo(barFile.fsPath);
            service.registerWorkspaceBackup(ws2);
            assert.deepStrictEqual(service.testGetWorkspaceBackups().map((b) => b.workspace.configPath.toString()), [fooFile.toString(), barFile.toString()]);
            assert.strictEqual(ws1.workspace.id, service.testGetWorkspaceBackups()[0].workspace.id);
            assert.strictEqual(ws2.workspace.id, service.testGetWorkspaceBackups()[1].workspace.id);
            const json = readWorkspacesMetadata();
            assert.deepStrictEqual(json.workspaces.map((b) => b.configURIPath), [fooFile.toString(), barFile.toString()]);
            assert.strictEqual(ws1.workspace.id, json.workspaces[0].id);
            assert.strictEqual(ws2.workspace.id, json.workspaces[1].id);
        });
    });
    test('should always store the workspace path in workspaces.json using the case given, regardless of whether the file system is case-sensitive (folder workspace)', async () => {
        service.registerFolderBackup(toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase())));
        assertEqualFolderInfos(service.testGetFolderBackups(), [
            toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase())),
        ]);
        const json = readWorkspacesMetadata();
        assert.deepStrictEqual(json.folders, [
            { folderUri: URI.file(fooFile.fsPath.toUpperCase()).toString() },
        ]);
    });
    test('should always store the workspace path in workspaces.json using the case given, regardless of whether the file system is case-sensitive (root workspace)', async () => {
        const upperFooPath = fooFile.fsPath.toUpperCase();
        service.registerWorkspaceBackup(toWorkspaceBackupInfo(upperFooPath));
        assert.deepStrictEqual(service.testGetWorkspaceBackups().map((b) => b.workspace.configPath.toString()), [URI.file(upperFooPath).toString()]);
        const json = readWorkspacesMetadata();
        assert.deepStrictEqual(json.workspaces.map((b) => b.configURIPath), [URI.file(upperFooPath).toString()]);
    });
    suite('getWorkspaceHash', () => {
        ;
        (platform.isLinux ? test.skip : test)('should ignore case on Windows and Mac', () => {
            const assertFolderHash = (uri1, uri2) => {
                assert.strictEqual(service.testGetFolderHash(toFolderBackupInfo(uri1)), service.testGetFolderHash(toFolderBackupInfo(uri2)));
            };
            if (platform.isMacintosh) {
                assertFolderHash(URI.file('/foo'), URI.file('/FOO'));
            }
            if (platform.isWindows) {
                assertFolderHash(URI.file('c:\\foo'), URI.file('C:\\FOO'));
            }
        });
    });
    suite('mixed path casing', () => {
        test('should handle case insensitive paths properly (registerWindowForBackupsSync) (folder workspace)', () => {
            service.registerFolderBackup(toFolderBackupInfo(fooFile));
            service.registerFolderBackup(toFolderBackupInfo(URI.file(fooFile.fsPath.toUpperCase())));
            if (platform.isLinux) {
                assert.strictEqual(service.testGetFolderBackups().length, 2);
            }
            else {
                assert.strictEqual(service.testGetFolderBackups().length, 1);
            }
        });
        test('should handle case insensitive paths properly (registerWindowForBackupsSync) (root workspace)', () => {
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath));
            service.registerWorkspaceBackup(toWorkspaceBackupInfo(fooFile.fsPath.toUpperCase()));
            if (platform.isLinux) {
                assert.strictEqual(service.testGetWorkspaceBackups().length, 2);
            }
            else {
                assert.strictEqual(service.testGetWorkspaceBackups().length, 1);
            }
        });
    });
    suite('getDirtyWorkspaces', () => {
        test('should report if a workspace or folder has backups', async () => {
            const folderBackupPath = service.registerFolderBackup(toFolderBackupInfo(fooFile));
            const backupWorkspaceInfo = toWorkspaceBackupInfo(fooFile.fsPath);
            const workspaceBackupPath = service.registerWorkspaceBackup(backupWorkspaceInfo);
            assert.strictEqual((await service.getDirtyWorkspaces()).length, 0);
            try {
                await fs.promises.mkdir(path.join(folderBackupPath, Schemas.file), { recursive: true });
                await fs.promises.mkdir(path.join(workspaceBackupPath, Schemas.untitled), {
                    recursive: true,
                });
            }
            catch (error) {
                // ignore - folder might exist already
            }
            assert.strictEqual((await service.getDirtyWorkspaces()).length, 0);
            fs.writeFileSync(path.join(folderBackupPath, Schemas.file, '594a4a9d82a277a899d4713a5b08f504'), '');
            fs.writeFileSync(path.join(workspaceBackupPath, Schemas.untitled, '594a4a9d82a277a899d4713a5b08f504'), '');
            const dirtyWorkspaces = await service.getDirtyWorkspaces();
            assert.strictEqual(dirtyWorkspaces.length, 2);
            let found = 0;
            for (const dirtyWorkpspace of dirtyWorkspaces) {
                if (isFolderBackupInfo(dirtyWorkpspace)) {
                    if (isEqual(fooFile, dirtyWorkpspace.folderUri)) {
                        found++;
                    }
                }
                else {
                    if (isEqual(backupWorkspaceInfo.workspace.configPath, dirtyWorkpspace.workspace.configPath)) {
                        found++;
                    }
                }
            }
            assert.strictEqual(found, 2);
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwTWFpblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYmFja3VwL3Rlc3QvZWxlY3Ryb24tbWFpbi9iYWNrdXBNYWluU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ25DLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDOUQsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFxQixrQkFBa0IsRUFBd0IsTUFBTSx3QkFBd0IsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsVUFBVSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNwQyxTQUFTLHNCQUFzQixDQUFDLE1BQTJCLEVBQUUsUUFBNkI7UUFDekYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtZQUNqQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLGVBQWU7U0FDbEMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsSUFBWTtRQUNoQyxPQUFPO1lBQ04sRUFBRSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLHNFQUFzRTtZQUN0SSxVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDMUIsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLElBQVksRUFBRSxlQUF3QjtRQUNwRSxPQUFPO1lBQ04sU0FBUyxFQUFFO2dCQUNWLEVBQUUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxzRUFBc0U7Z0JBQ3RJLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUMxQjtZQUNELGVBQWU7U0FDZixDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBUSxFQUFFLGVBQXdCO1FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFBO0lBQzNDLENBQUM7SUFFRCxTQUFTLHFCQUFxQixDQUFDLEVBQXdCO1FBQ3RELE9BQU87WUFDTixFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDVCxhQUFhLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7U0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVE7UUFDbkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDaEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDOUMsT0FBTyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsS0FBSyxVQUFVLHFCQUFxQixDQUNuQyxTQUErQjtRQUUvQixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXRDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxLQUFLLFVBQVUsa0JBQWtCLENBQUMsWUFBb0I7UUFDckQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzFCLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDbkQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDcEYsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLHNCQUFzQjtRQUM5QixPQUFPLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBZ0MsQ0FBQTtJQUNuRixDQUFDO0lBRUQsU0FBUyx1QkFBdUIsQ0FBQyxJQUFZO1FBQzVDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2hELENBQUM7YUFBTSxDQUFDO1lBQ1AsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLENBQVM7UUFDOUIsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2pFLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUVqRSxJQUFJLE9BS0gsQ0FBQTtJQUNELElBQUksYUFBdUMsQ0FBQTtJQUMzQyxJQUFJLGdCQUE4QyxDQUFBO0lBRWxELElBQUksa0JBQTBDLENBQUE7SUFDOUMsSUFBSSxPQUFlLENBQUE7SUFDbkIsSUFBSSxVQUFrQixDQUFBO0lBQ3RCLElBQUksbUJBQXdCLENBQUE7SUFFNUIsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDekUsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUU3RCxrQkFBa0IsR0FBRyxJQUFJLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1lBQ2pGLGFBQWEsRUFBRSxTQUFTO1lBQ3hCLEdBQUcsT0FBTztTQUNWLENBQUMsQ0FBQTtRQUVGLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFeEQsYUFBYSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUM5QyxnQkFBZ0IsR0FBRyxJQUFJLDRCQUE0QixFQUFFLENBQUE7UUFFckQsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLHFCQUFzQixTQUFRLGlCQUFpQjtZQUNuRTtnQkFDQyxLQUFLLENBQ0osa0JBQWtCLEVBQ2xCLGFBQWEsRUFDYixJQUFJLFVBQVUsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsRUFDdkMsZ0JBQWdCLENBQ2hCLENBQUE7Z0JBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7WUFDN0IsQ0FBQztZQUVELFlBQVksQ0FBQyxHQUFpQjtnQkFDN0IsTUFBTSxFQUFFLEdBQUcsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7Z0JBQzdFLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RDLENBQUM7WUFFRCxpQkFBaUIsQ0FBQyxNQUF5QjtnQkFDMUMsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFFRCx1QkFBdUI7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFDbkMsQ0FBQztZQUVELG9CQUFvQjtnQkFDbkIsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7UUFFSixPQUFPLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUM1QixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0ZBQWtGLEVBQUUsS0FBSztRQUM3RiwwQ0FBMEM7UUFDMUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekQsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDMUIsc0JBQXNCLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFMUQsNkRBQTZEO1FBQzdELEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzNDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzFCLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXhELDREQUE0RDtRQUM1RCxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN4RSxPQUFPLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxPQUFPLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUMxQixzQkFBc0IsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV4RCx1RUFBdUU7UUFDdkUsd0VBQXdFO1FBQ3hFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDM0MsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDM0MsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN6QixPQUFPLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdGQUFnRixFQUFFLEtBQUs7UUFDM0YsMENBQTBDO1FBQzFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN0RSxPQUFPLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDdEUsTUFBTSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU3RCw2REFBNkQ7UUFDN0QsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDM0MsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDM0MsT0FBTyxDQUFDLHVCQUF1QixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN0RSxNQUFNLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUMxQixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXhELDREQUE0RDtRQUM1RCxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUN4RSxPQUFPLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDdEUsT0FBTyxDQUFDLHVCQUF1QixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFeEQsdUVBQXVFO1FBQ3ZFLHdFQUF3RTtRQUN4RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzNDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzNDLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDekIsT0FBTyxDQUFDLHVCQUF1QixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FB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