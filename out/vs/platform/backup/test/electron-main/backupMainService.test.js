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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwTWFpblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2JhY2t1cC90ZXN0L2VsZWN0cm9uLW1haW4vYmFja3VwTWFpblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNuQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxD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