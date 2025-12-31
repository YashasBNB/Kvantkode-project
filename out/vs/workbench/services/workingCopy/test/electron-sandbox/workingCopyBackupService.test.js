/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { insert } from '../../../../../base/common/arrays.js';
import { hash } from '../../../../../base/common/hash.js';
import { isEqual, joinPath, dirname } from '../../../../../base/common/resources.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { WorkingCopyBackupsModel, hashIdentifier } from '../../common/workingCopyBackupService.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { Schemas } from '../../../../../base/common/network.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { LogLevel, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeWorkbenchEnvironmentService } from '../../../environment/electron-sandbox/environmentService.js';
import { toBufferOrReadable } from '../../../textfile/common/textfiles.js';
import { NativeWorkingCopyBackupService } from '../../electron-sandbox/workingCopyBackupService.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { bufferToReadable, bufferToStream, streamToBuffer, VSBuffer, } from '../../../../../base/common/buffer.js';
import { TestLifecycleService, toTypedWorkingCopyId, toUntypedWorkingCopyId, } from '../../../../test/browser/workbenchTestServices.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { consumeStream } from '../../../../../base/common/stream.js';
import { TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import product from '../../../../../platform/product/common/product.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
const homeDir = URI.file('home').with({ scheme: Schemas.inMemory });
const tmpDir = URI.file('tmp').with({ scheme: Schemas.inMemory });
const NULL_PROFILE = {
    name: '',
    id: '',
    shortName: '',
    isDefault: false,
    location: homeDir,
    settingsResource: joinPath(homeDir, 'settings.json'),
    globalStorageHome: joinPath(homeDir, 'globalStorage'),
    keybindingsResource: joinPath(homeDir, 'keybindings.json'),
    tasksResource: joinPath(homeDir, 'tasks.json'),
    snippetsHome: joinPath(homeDir, 'snippets'),
    promptsHome: joinPath(homeDir, 'prompts'),
    extensionsResource: joinPath(homeDir, 'extensions.json'),
    cacheHome: joinPath(homeDir, 'cache'),
};
const TestNativeWindowConfiguration = {
    windowId: 0,
    machineId: 'testMachineId',
    sqmId: 'testSqmId',
    devDeviceId: 'testdevDeviceId',
    logLevel: LogLevel.Error,
    loggers: [],
    mainPid: 0,
    appRoot: '',
    userEnv: {},
    execPath: process.execPath,
    perfMarks: [],
    colorScheme: { dark: true, highContrast: false },
    os: { release: 'unknown', hostname: 'unknown', arch: 'unknown' },
    product,
    homeDir: homeDir.fsPath,
    tmpDir: tmpDir.fsPath,
    userDataDir: joinPath(homeDir, product.nameShort).fsPath,
    profiles: { profile: NULL_PROFILE, all: [NULL_PROFILE], home: homeDir },
    nls: {
        messages: [],
        language: 'en',
    },
    _: [],
};
export class TestNativeWorkbenchEnvironmentService extends NativeWorkbenchEnvironmentService {
    constructor(testDir, backupPath) {
        super({
            ...TestNativeWindowConfiguration,
            backupPath: backupPath.fsPath,
            'user-data-dir': testDir.fsPath,
        }, TestProductService);
    }
}
export class NodeTestWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor(testDir, workspaceBackupPath) {
        const environmentService = new TestNativeWorkbenchEnvironmentService(testDir, workspaceBackupPath);
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        super(environmentService, fileService, logService, lifecycleService);
        const fsp = new InMemoryFileSystemProvider();
        fileService.registerProvider(Schemas.inMemory, fsp);
        const uriIdentityService = new UriIdentityService(fileService);
        const userDataProfilesService = new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService);
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, fsp, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        this._fileService = fileService;
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise((resolve) => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise((resolve) => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
suite('WorkingCopyBackupService', () => {
    let testDir;
    let backupHome;
    let workspacesJsonPath;
    let workspaceBackupPath;
    let service;
    let fileService;
    const disposables = new DisposableStore();
    const workspaceResource = URI.file(isWindows ? 'c:\\workspace' : '/workspace');
    const fooFile = URI.file(isWindows ? 'c:\\Foo' : '/Foo');
    const customFile = URI.parse('customScheme://some/path');
    const customFileWithFragment = URI.parse('customScheme2://some/path#fragment');
    const barFile = URI.file(isWindows ? 'c:\\Bar' : '/Bar');
    const fooBarFile = URI.file(isWindows ? 'c:\\Foo Bar' : '/Foo Bar');
    const untitledFile = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
    setup(async () => {
        testDir = URI.file(join(generateUuid(), 'vsctests', 'workingcopybackupservice')).with({
            scheme: Schemas.inMemory,
        });
        backupHome = joinPath(testDir, 'Backups');
        workspacesJsonPath = joinPath(backupHome, 'workspaces.json');
        workspaceBackupPath = joinPath(backupHome, hash(workspaceResource.fsPath).toString(16));
        service = disposables.add(new NodeTestWorkingCopyBackupService(testDir, workspaceBackupPath));
        fileService = service._fileService;
        await fileService.createFolder(backupHome);
        return fileService.writeFile(workspacesJsonPath, VSBuffer.fromString(''));
    });
    teardown(() => {
        disposables.clear();
    });
    suite('hashIdentifier', () => {
        test('should correctly hash the identifier for untitled scheme URIs', () => {
            const uri = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-7f9c1a2e');
            assert.strictEqual(untypedBackupHash, hash(uri.fsPath).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            if (isWindows) {
                assert.strictEqual(typedBackupHash, '-17c47cdc');
            }
            else {
                assert.strictEqual(typedBackupHash, '-8ad5f4f');
            }
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should correctly hash the identifier for file scheme URIs', () => {
            const uri = URI.file('/foo');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            if (isWindows) {
                assert.strictEqual(untypedBackupHash, '20ffaa13');
            }
            else {
                assert.strictEqual(untypedBackupHash, '20eb3560');
            }
            assert.strictEqual(untypedBackupHash, hash(uri.fsPath).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            if (isWindows) {
                assert.strictEqual(typedBackupHash, '-55fc55db');
            }
            else {
                assert.strictEqual(typedBackupHash, '51e56bf');
            }
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should correctly hash the identifier for custom scheme URIs', () => {
            const uri = URI.from({
                scheme: 'vscode-custom',
                path: 'somePath',
            });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-44972d98');
            assert.strictEqual(untypedBackupHash, hash(uri.toString()).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            assert.strictEqual(typedBackupHash, '502149c7');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
        test('should not fail for URIs without path', () => {
            const uri = URI.from({
                scheme: 'vscode-fragment',
                fragment: 'frag',
            });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes change people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const untypedBackupHash = hashIdentifier(toUntypedWorkingCopyId(uri));
            assert.strictEqual(untypedBackupHash, '-2f6b2f1b');
            assert.strictEqual(untypedBackupHash, hash(uri.toString()).toString(16));
            const typedBackupHash = hashIdentifier({ typeId: 'hashTest', resource: uri });
            assert.strictEqual(typedBackupHash, '6e82ca57');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // If these hashes collide people will lose their backed up files
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            assert.notStrictEqual(untypedBackupHash, typedBackupHash);
        });
    });
    suite('getBackupResource', () => {
        test('should get the correct backup path for text files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = fooFile;
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, Schemas.file, filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, Schemas.file, filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
        test('should get the correct backup path for untitled files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, Schemas.untitled, filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, Schemas.untitled, filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
        test('should get the correct backup path for custom files', () => {
            // Format should be: <backupHome>/<workspaceHash>/<scheme>/<filePathHash>
            const backupResource = URI.from({ scheme: 'custom', path: 'custom/file.txt' });
            const workspaceHash = hash(workspaceResource.fsPath).toString(16);
            // No Type ID
            let backupId = toUntypedWorkingCopyId(backupResource);
            let filePathHash = hashIdentifier(backupId);
            let expectedPath = joinPath(backupHome, workspaceHash, 'custom', filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
            // With Type ID
            backupId = toTypedWorkingCopyId(backupResource);
            filePathHash = hashIdentifier(backupId);
            expectedPath = joinPath(backupHome, workspaceHash, 'custom', filePathHash)
                .with({ scheme: Schemas.vscodeUserData })
                .toString();
            assert.strictEqual(service.toBackupResource(backupId).toString(), expectedPath);
        });
    });
    suite('backup', () => {
        function toExpectedPreamble(identifier, content = '', meta) {
            return `${identifier.resource.toString()} ${JSON.stringify({ ...meta, typeId: identifier.typeId })}\n${content}`;
        }
        test('joining', async () => {
            let backupJoined = false;
            const joinBackupsPromise = service.joinBackups();
            joinBackupsPromise.then(() => (backupJoined = true));
            await joinBackupsPromise;
            assert.strictEqual(backupJoined, true);
            backupJoined = false;
            service.joinBackups().then(() => (backupJoined = true));
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const backupPromise = service.backup(identifier);
            assert.strictEqual(backupJoined, false);
            await backupPromise;
            assert.strictEqual(backupJoined, true);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('no text', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file (with version)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), 666);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(!service.hasBackupSync(identifier, 555));
            assert.ok(service.hasBackupSync(identifier, 666));
        });
        test('text file (with meta)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file with whitespace in name and type (with meta)', async () => {
            const fileWithSpace = URI.file(isWindows ? 'c:\\Foo \n Bar' : '/Foo \n Bar');
            const identifier = toTypedWorkingCopyId(fileWithSpace, ' test id \n');
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678 \n k', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file with unicode character in name and type (with meta)', async () => {
            const fileWithUnicode = URI.file(isWindows ? 'c:\\so𒀅meࠄ' : '/so𒀅meࠄ');
            const identifier = toTypedWorkingCopyId(fileWithUnicode, ' test so𒀅meࠄ id \n');
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const meta = { etag: '678so𒀅meࠄ', orphaned: true };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')), undefined, meta);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test', meta));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('untitled file', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('text file (readable)', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const model = createTextModel('test');
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            assert.ok(service.hasBackupSync(identifier));
            model.dispose();
        });
        test('untitled file (readable)', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const model = createTextModel('test');
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, 'test'));
            model.dispose();
        });
        test('text file (large file, stream)', () => {
            const largeString = new Array(30 * 1024).join('Large String\n');
            return testLargeTextFile(largeString, bufferToStream(VSBuffer.fromString(largeString)));
        });
        test('text file (large file, readable)', async () => {
            const largeString = new Array(30 * 1024).join('Large String\n');
            const model = createTextModel(largeString);
            await testLargeTextFile(largeString, toBufferOrReadable(model.createSnapshot()));
            model.dispose();
        });
        async function testLargeTextFile(largeString, buffer) {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, buffer, undefined, { largeTest: true });
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, largeString, { largeTest: true }));
            assert.ok(service.hasBackupSync(identifier));
        }
        test('untitled file (large file, readable)', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const largeString = new Array(30 * 1024).join('Large String\n');
            const model = createTextModel(largeString);
            await service.backup(identifier, toBufferOrReadable(model.createSnapshot()));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier, largeString));
            assert.ok(service.hasBackupSync(identifier));
            model.dispose();
        });
        test('cancellation', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const cts = new CancellationTokenSource();
            const promise = service.backup(identifier, undefined, undefined, undefined, cts.token);
            cts.cancel();
            await promise;
            assert.strictEqual(await fileService.exists(backupPath), false);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('multiple', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await Promise.all([
                service.backup(identifier),
                service.backup(identifier),
                service.backup(identifier),
                service.backup(identifier),
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.readFile(backupPath)).value.toString(), toExpectedPreamble(identifier));
            assert.ok(service.hasBackupSync(identifier));
        });
        test('multiple same resource, different type id', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toTypedWorkingCopyId(fooFile, 'type1');
            const backupId3 = toTypedWorkingCopyId(fooFile, 'type2');
            await Promise.all([
                service.backup(backupId1),
                service.backup(backupId2),
                service.backup(backupId3),
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const fooBackupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual(await fileService.exists(fooBackupPath), true);
                assert.strictEqual((await fileService.readFile(fooBackupPath)).value.toString(), toExpectedPreamble(backupId));
                assert.ok(service.hasBackupSync(backupId));
            }
        });
    });
    suite('discardBackup', () => {
        test('joining', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.ok(service.hasBackupSync(identifier));
            let backupJoined = false;
            service.joinBackups().then(() => (backupJoined = true));
            const discardBackupPromise = service.discardBackup(identifier);
            assert.strictEqual(backupJoined, false);
            await discardBackupPromise;
            assert.strictEqual(backupJoined, true);
            assert.strictEqual(await fileService.exists(backupPath), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('text file', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            assert.ok(service.hasBackupSync(identifier));
            await service.discardBackup(identifier);
            assert.strictEqual(await fileService.exists(backupPath), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
            assert.ok(!service.hasBackupSync(identifier));
        });
        test('untitled file', async () => {
            const identifier = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackup(identifier);
            assert.strictEqual(await fileService.exists(backupPath), false);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 0);
        });
        test('multiple same resource, different type id', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toTypedWorkingCopyId(fooFile, 'type1');
            const backupId3 = toTypedWorkingCopyId(fooFile, 'type2');
            await Promise.all([
                service.backup(backupId1),
                service.backup(backupId2),
                service.backup(backupId3),
            ]);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                await service.discardBackup(backupId);
                assert.strictEqual(await fileService.exists(backupPath), false);
            }
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 0);
        });
    });
    suite('discardBackups (all)', () => {
        test('text file', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toUntypedWorkingCopyId(barFile);
            const backupId3 = toTypedWorkingCopyId(barFile);
            await service.backup(backupId1, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            await service.backup(backupId2, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 2);
            await service.backup(backupId3, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            await service.discardBackups();
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual(await fileService.exists(backupPath), false);
            }
            assert.strictEqual(await fileService.exists(joinPath(workspaceBackupPath, 'file')), false);
        });
        test('untitled file', async () => {
            const backupId = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
            await service.backup(backupId, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackups();
            assert.strictEqual(await fileService.exists(backupPath), false);
            assert.strictEqual(await fileService.exists(joinPath(workspaceBackupPath, 'untitled')), false);
        });
        test('can backup after discarding all', async () => {
            await service.discardBackups();
            await service.backup(toUntypedWorkingCopyId(untitledFile), bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual(await fileService.exists(workspaceBackupPath), true);
        });
    });
    suite('discardBackups (except some)', () => {
        test('text file', async () => {
            const backupId1 = toUntypedWorkingCopyId(fooFile);
            const backupId2 = toUntypedWorkingCopyId(barFile);
            const backupId3 = toTypedWorkingCopyId(barFile);
            await service.backup(backupId1, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 1);
            await service.backup(backupId2, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 2);
            await service.backup(backupId3, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'file'))).children?.length, 3);
            await service.discardBackups({ except: [backupId2, backupId3] });
            let backupPath = joinPath(workspaceBackupPath, backupId1.resource.scheme, hashIdentifier(backupId1));
            assert.strictEqual(await fileService.exists(backupPath), false);
            backupPath = joinPath(workspaceBackupPath, backupId2.resource.scheme, hashIdentifier(backupId2));
            assert.strictEqual(await fileService.exists(backupPath), true);
            backupPath = joinPath(workspaceBackupPath, backupId3.resource.scheme, hashIdentifier(backupId3));
            assert.strictEqual(await fileService.exists(backupPath), true);
            await service.discardBackups({ except: [backupId1] });
            for (const backupId of [backupId1, backupId2, backupId3]) {
                const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
                assert.strictEqual(await fileService.exists(backupPath), false);
            }
        });
        test('untitled file', async () => {
            const backupId = toUntypedWorkingCopyId(untitledFile);
            const backupPath = joinPath(workspaceBackupPath, backupId.resource.scheme, hashIdentifier(backupId));
            await service.backup(backupId, bufferToReadable(VSBuffer.fromString('test')));
            assert.strictEqual(await fileService.exists(backupPath), true);
            assert.strictEqual((await fileService.resolve(joinPath(workspaceBackupPath, 'untitled'))).children?.length, 1);
            await service.discardBackups({ except: [backupId] });
            assert.strictEqual(await fileService.exists(backupPath), true);
        });
    });
    suite('getBackups', () => {
        test('text file', async () => {
            await Promise.all([
                service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(fooFile, 'type1'), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(fooFile, 'type2'), bufferToReadable(VSBuffer.fromString('test'))),
            ]);
            let backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            for (const backup of backups) {
                if (backup.typeId === '') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else if (backup.typeId === 'type1') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else if (backup.typeId === 'type2') {
                    assert.strictEqual(backup.resource.toString(), fooFile.toString());
                }
                else {
                    assert.fail('Unexpected backup');
                }
            }
            await service.backup(toUntypedWorkingCopyId(barFile), bufferToReadable(VSBuffer.fromString('test')));
            backups = await service.getBackups();
            assert.strictEqual(backups.length, 4);
        });
        test('untitled file', async () => {
            await Promise.all([
                service.backup(toUntypedWorkingCopyId(untitledFile), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(untitledFile, 'type1'), bufferToReadable(VSBuffer.fromString('test'))),
                service.backup(toTypedWorkingCopyId(untitledFile, 'type2'), bufferToReadable(VSBuffer.fromString('test'))),
            ]);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            for (const backup of backups) {
                if (backup.typeId === '') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else if (backup.typeId === 'type1') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else if (backup.typeId === 'type2') {
                    assert.strictEqual(backup.resource.toString(), untitledFile.toString());
                }
                else {
                    assert.fail('Unexpected backup');
                }
            }
        });
    });
    suite('resolve', () => {
        test('should restore the original contents (untitled file)', async () => {
            const contents = 'test\nand more stuff';
            await testResolveBackup(untitledFile, contents);
        });
        test('should restore the original contents (untitled file with metadata)', async () => {
            const contents = 'test\nand more stuff';
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true,
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (untitled file empty with metadata)', async () => {
            const contents = '';
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true,
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (untitled large file with metadata)', async () => {
            const contents = new Array(30 * 1024).join('Large String\n');
            const meta = {
                etag: 'the Etag',
                size: 666,
                mtime: Date.now(),
                orphaned: true,
            };
            await testResolveBackup(untitledFile, contents, meta);
        });
        test('should restore the original contents (text file)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'consectetur ',
                'adipiscing ßß elit',
            ].join('');
            await testResolveBackup(fooFile, contents);
        });
        test('should restore the original contents (text file - custom scheme)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'consectetur ',
                'adipiscing ßß elit',
            ].join('');
            await testResolveBackup(customFile, contents);
        });
        test('should restore the original contents (text file with metadata)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (empty text file with metadata)', async () => {
            const contents = '';
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (large text file with metadata)', async () => {
            const contents = new Array(30 * 1024).join('Large String\n');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (text file with metadata changed once)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooFile, contents, meta);
            // Change meta and test again
            meta.size = 999;
            await testResolveBackup(fooFile, contents, meta);
        });
        test('should restore the original contents (text file with metadata and fragment URI)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(customFileWithFragment, contents, meta);
        });
        test('should restore the original contents (text file with space in name with metadata)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooBarFile, contents, meta);
        });
        test('should restore the original contents (text file with too large metadata to persist)', async () => {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: new Array(100 * 1024).join('Large String'),
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await testResolveBackup(fooFile, contents, meta, true);
        });
        async function testResolveBackup(resource, contents, meta, expectNoMeta) {
            await doTestResolveBackup(toUntypedWorkingCopyId(resource), contents, meta, expectNoMeta);
            await doTestResolveBackup(toTypedWorkingCopyId(resource), contents, meta, expectNoMeta);
        }
        async function doTestResolveBackup(identifier, contents, meta, expectNoMeta) {
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backup = await service.resolve(identifier);
            assert.ok(backup);
            assert.strictEqual(contents, (await streamToBuffer(backup.value)).toString());
            if (expectNoMeta || !meta) {
                assert.strictEqual(backup.meta, undefined);
            }
            else {
                assert.ok(backup.meta);
                assert.strictEqual(backup.meta.etag, meta.etag);
                assert.strictEqual(backup.meta.size, meta.size);
                assert.strictEqual(backup.meta.mtime, meta.mtime);
                assert.strictEqual(backup.meta.orphaned, meta.orphaned);
                assert.strictEqual(Object.keys(meta).length, Object.keys(backup.meta).length);
            }
        }
        test('should restore the original contents (text file with broken metadata)', async () => {
            await testShouldRestoreOriginalContentsWithBrokenBackup(toUntypedWorkingCopyId(fooFile));
            await testShouldRestoreOriginalContentsWithBrokenBackup(toTypedWorkingCopyId(fooFile));
        });
        async function testShouldRestoreOriginalContentsWithBrokenBackup(identifier) {
            const contents = [
                'Lorem ipsum ',
                'dolor öäü sit amet ',
                'adipiscing ßß elit',
                'consectetur ',
            ].join('');
            const meta = {
                etag: 'theEtag',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            const fileContents = (await fileService.readFile(backupPath)).value.toString();
            assert.strictEqual(fileContents.indexOf(identifier.resource.toString()), 0);
            const metaIndex = fileContents.indexOf('{');
            const newFileContents = fileContents.substring(0, metaIndex) + '{{' + fileContents.substr(metaIndex);
            await fileService.writeFile(backupPath, VSBuffer.fromString(newFileContents));
            const backup = await service.resolve(identifier);
            assert.ok(backup);
            assert.strictEqual(contents, (await streamToBuffer(backup.value)).toString());
            assert.strictEqual(backup.meta, undefined);
        }
        test('should update metadata from file into model when resolving', async () => {
            await testShouldUpdateMetaFromFileWhenResolving(toUntypedWorkingCopyId(fooFile));
            await testShouldUpdateMetaFromFileWhenResolving(toTypedWorkingCopyId(fooFile));
        });
        async function testShouldUpdateMetaFromFileWhenResolving(identifier) {
            const contents = 'Foo Bar';
            const meta = {
                etag: 'theEtagForThisMetadataTest',
                size: 888,
                mtime: Date.now(),
                orphaned: false,
            };
            const updatedMeta = {
                ...meta,
                etag: meta.etag + meta.etag,
            };
            await service.backup(identifier, bufferToReadable(VSBuffer.fromString(contents)), 1, meta);
            const backupPath = joinPath(workspaceBackupPath, identifier.resource.scheme, hashIdentifier(identifier));
            // Simulate the condition of the backups model loading initially without
            // meta data information and then getting the meta data updated on the
            // first call to resolve the backup. We simulate this by explicitly changing
            // the meta data in the file and then verifying that the updated meta data
            // is persisted back into the model (verified via `hasBackupSync`).
            // This is not really something that would happen in real life because any
            // backup that is made via backup service will update the model accordingly.
            const originalFileContents = (await fileService.readFile(backupPath)).value.toString();
            await fileService.writeFile(backupPath, VSBuffer.fromString(originalFileContents.replace(meta.etag, updatedMeta.etag)));
            await service.resolve(identifier);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, meta), false);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, updatedMeta), true);
            await fileService.writeFile(backupPath, VSBuffer.fromString(originalFileContents));
            await service.getBackups();
            assert.strictEqual(service.hasBackupSync(identifier, undefined, meta), true);
            assert.strictEqual(service.hasBackupSync(identifier, undefined, updatedMeta), false);
        }
        test('should ignore invalid backups (empty file)', async () => {
            const contents = 'test\nand more stuff';
            await service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString(contents)), 1);
            let backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            await service
                .testGetFileService()
                .writeFile(service.toBackupResource(toUntypedWorkingCopyId(fooFile)), VSBuffer.fromString(''));
            backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(!backup);
        });
        test('should ignore invalid backups (no preamble)', async () => {
            const contents = 'testand more stuff';
            await service.backup(toUntypedWorkingCopyId(fooFile), bufferToReadable(VSBuffer.fromString(contents)), 1);
            let backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            await service
                .testGetFileService()
                .writeFile(service.toBackupResource(toUntypedWorkingCopyId(fooFile)), VSBuffer.fromString(contents));
            backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(!backup);
        });
        test('file with binary data', async () => {
            const identifier = toUntypedWorkingCopyId(fooFile);
            const buffer = Uint8Array.from([
                137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 73, 0, 0, 0, 67, 8,
                2, 0, 0, 0, 95, 138, 191, 237, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0,
                4, 103, 65, 77, 65, 0, 0, 177, 143, 11, 252, 97, 5, 0, 0, 0, 9, 112, 72, 89, 115, 0, 0, 14,
                195, 0, 0, 14, 195, 1, 199, 111, 168, 100, 0, 0, 0, 71, 116, 69, 88, 116, 83, 111, 117, 114,
                99, 101, 0, 83, 104, 111, 116, 116, 121, 32, 118, 50, 46, 48, 46, 50, 46, 50, 49, 54, 32,
                40, 67, 41, 32, 84, 104, 111, 109, 97, 115, 32, 66, 97, 117, 109, 97, 110, 110, 32, 45, 32,
                104, 116, 116, 112, 58, 47, 47, 115, 104, 111, 116, 116, 121, 46, 100, 101, 118, 115, 45,
                111, 110, 46, 110, 101, 116, 44, 132, 21, 213, 0, 0, 0, 84, 73, 68, 65, 84, 120, 218, 237,
                207, 65, 17, 0, 0, 12, 2, 32, 211, 217, 63, 146, 37, 246, 218, 65, 3, 210, 191, 226, 230,
                230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230,
                230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230,
                230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230,
                118, 100, 169, 4, 173, 8, 44, 248, 184, 40, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
            ]);
            await service.backup(identifier, bufferToReadable(VSBuffer.wrap(buffer)), undefined, {
                binaryTest: 'true',
            });
            const backup = await service.resolve(toUntypedWorkingCopyId(fooFile));
            assert.ok(backup);
            const backupBuffer = await consumeStream(backup.value, (chunks) => VSBuffer.concat(chunks));
            assert.strictEqual(backupBuffer.buffer.byteLength, buffer.byteLength);
        });
    });
    suite('WorkingCopyBackupsModel', () => {
        test('simple', async () => {
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            const resource1 = URI.file('test.html');
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), true);
            assert.strictEqual(model.has(resource1, 1), false);
            assert.strictEqual(model.has(resource1, 1, { foo: 'bar' }), false);
            model.remove(resource1);
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), true);
            assert.strictEqual(model.has(resource1, 1), false);
            model.clear();
            assert.strictEqual(model.has(resource1), false);
            model.add(resource1, 1);
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource1, 0), false);
            assert.strictEqual(model.has(resource1, 1), true);
            const resource2 = URI.file('test1.html');
            const resource3 = URI.file('test2.html');
            const resource4 = URI.file('test3.html');
            model.add(resource2);
            model.add(resource3);
            model.add(resource4, undefined, { foo: 'bar' });
            assert.strictEqual(model.has(resource1), true);
            assert.strictEqual(model.has(resource2), true);
            assert.strictEqual(model.has(resource3), true);
            assert.strictEqual(model.has(resource4), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'bar' }), true);
            assert.strictEqual(model.has(resource4, undefined, { bar: 'foo' }), false);
            model.update(resource4, { foo: 'nothing' });
            assert.strictEqual(model.has(resource4, undefined, { foo: 'nothing' }), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'bar' }), false);
            model.update(resource4);
            assert.strictEqual(model.has(resource4), true);
            assert.strictEqual(model.has(resource4, undefined, { foo: 'nothing' }), false);
        });
        test('create', async () => {
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(toUntypedWorkingCopyId(fooFile)));
            await fileService.createFolder(dirname(fooBackupPath));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString('foo'));
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            assert.strictEqual(model.has(fooBackupPath), true);
        });
        test('get', async () => {
            const model = await WorkingCopyBackupsModel.create(workspaceBackupPath, service.testGetFileService());
            assert.deepStrictEqual(model.get(), []);
            const file1 = URI.file('/root/file/foo.html');
            const file2 = URI.file('/root/file/bar.html');
            const untitled = URI.file('/root/untitled/bar.html');
            model.add(file1);
            model.add(file2);
            model.add(untitled);
            assert.deepStrictEqual(model.get().map((f) => f.fsPath), [file1.fsPath, file2.fsPath, untitled.fsPath]);
        });
    });
    suite('typeId migration', () => {
        test('works (when meta is missing)', async () => {
            const fooBackupId = toUntypedWorkingCopyId(fooFile);
            const untitledBackupId = toUntypedWorkingCopyId(untitledFile);
            const customBackupId = toUntypedWorkingCopyId(customFile);
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(fooBackupId));
            const untitledBackupPath = joinPath(workspaceBackupPath, untitledFile.scheme, hashIdentifier(untitledBackupId));
            const customFileBackupPath = joinPath(workspaceBackupPath, customFile.scheme, hashIdentifier(customBackupId));
            // Prepare backups of the old format without meta
            await fileService.createFolder(joinPath(workspaceBackupPath, fooFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, untitledFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, customFile.scheme));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString(`${fooFile.toString()}\ntest file`));
            await fileService.writeFile(untitledBackupPath, VSBuffer.fromString(`${untitledFile.toString()}\ntest untitled`));
            await fileService.writeFile(customFileBackupPath, VSBuffer.fromString(`${customFile.toString()}\ntest custom`));
            service.reinitialize(workspaceBackupPath);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            assert.ok(backups.some((backup) => isEqual(backup.resource, fooFile)));
            assert.ok(backups.some((backup) => isEqual(backup.resource, untitledFile)));
            assert.ok(backups.some((backup) => isEqual(backup.resource, customFile)));
            assert.ok(backups.every((backup) => backup.typeId === ''));
        });
        test('works (when typeId in meta is missing)', async () => {
            const fooBackupId = toUntypedWorkingCopyId(fooFile);
            const untitledBackupId = toUntypedWorkingCopyId(untitledFile);
            const customBackupId = toUntypedWorkingCopyId(customFile);
            const fooBackupPath = joinPath(workspaceBackupPath, fooFile.scheme, hashIdentifier(fooBackupId));
            const untitledBackupPath = joinPath(workspaceBackupPath, untitledFile.scheme, hashIdentifier(untitledBackupId));
            const customFileBackupPath = joinPath(workspaceBackupPath, customFile.scheme, hashIdentifier(customBackupId));
            // Prepare backups of the old format without meta
            await fileService.createFolder(joinPath(workspaceBackupPath, fooFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, untitledFile.scheme));
            await fileService.createFolder(joinPath(workspaceBackupPath, customFile.scheme));
            await fileService.writeFile(fooBackupPath, VSBuffer.fromString(`${fooFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest file`));
            await fileService.writeFile(untitledBackupPath, VSBuffer.fromString(`${untitledFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest untitled`));
            await fileService.writeFile(customFileBackupPath, VSBuffer.fromString(`${customFile.toString()} ${JSON.stringify({ foo: 'bar' })}\ntest custom`));
            service.reinitialize(workspaceBackupPath);
            const backups = await service.getBackups();
            assert.strictEqual(backups.length, 3);
            assert.ok(backups.some((backup) => isEqual(backup.resource, fooFile)));
            assert.ok(backups.some((backup) => isEqual(backup.resource, untitledFile)));
            assert.ok(backups.some((backup) => isEqual(backup.resource, customFile)));
            assert.ok(backups.every((backup) => backup.typeId === ''));
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTFFLE9B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RUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN6RixDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFGLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQzNGLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDeEYsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUMxRixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUN4RixHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQ3pGLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDeEYsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFF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QUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWxFLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRS9DLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUVsRCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7WUFFYixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFL0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUVqRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3hDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDeEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUV4QyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUUxRSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFB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