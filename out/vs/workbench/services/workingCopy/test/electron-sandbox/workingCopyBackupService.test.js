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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2VsZWN0cm9uLXNhbmRib3gvd29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1B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QUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pGLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDMUYsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDM0YsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUN4RixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzFGLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ3hGLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDekYsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO2dCQUN4RixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxF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LE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFbEUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUV2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFL0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUVwQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWxELEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUViLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUUvQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FB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