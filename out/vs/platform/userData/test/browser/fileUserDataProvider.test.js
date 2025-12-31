/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { dirname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AbstractNativeEnvironmentService } from '../../../environment/common/environmentService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { FileUserDataProvider } from '../../common/fileUserDataProvider.js';
import { UserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(_appSettingsHome) {
        super(Object.create(null), Object.create(null), { _serviceBrand: undefined, ...product });
        this._appSettingsHome = _appSettingsHome;
    }
    get userRoamingDataHome() {
        return this._appSettingsHome.with({ scheme: Schemas.vscodeUserData });
    }
    get cacheHome() {
        return this.userRoamingDataHome;
    }
}
suite('FileUserDataProvider', () => {
    let testObject;
    let userDataHomeOnDisk;
    let backupWorkspaceHomeOnDisk;
    let environmentService;
    let userDataProfilesService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileUserDataProvider;
    setup(async () => {
        const logService = new NullLogService();
        testObject = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(testObject.registerProvider(ROOT.scheme, fileSystemProvider));
        userDataHomeOnDisk = joinPath(ROOT, 'User');
        const backupHome = joinPath(ROOT, 'Backups');
        backupWorkspaceHomeOnDisk = joinPath(backupHome, 'workspaceId');
        await testObject.createFolder(userDataHomeOnDisk);
        await testObject.createFolder(backupWorkspaceHomeOnDisk);
        environmentService = new TestEnvironmentService(userDataHomeOnDisk);
        const uriIdentityService = disposables.add(new UriIdentityService(testObject));
        userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, testObject, uriIdentityService, logService));
        fileUserDataProvider = disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        disposables.add(fileUserDataProvider);
        disposables.add(testObject.registerProvider(Schemas.vscodeUserData, fileUserDataProvider));
    });
    test('exists return false when file does not exist', async () => {
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.settingsResource);
        assert.strictEqual(exists, false);
    });
    test('read file throws error if not exist', async () => {
        try {
            await testObject.readFile(userDataProfilesService.defaultProfile.settingsResource);
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('read existing file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(userDataProfilesService.defaultProfile.settingsResource);
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('create file', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write file creates the file if not exist', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write to existing file', async () => {
        const resource = userDataProfilesService.defaultProfile.settingsResource;
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{a:1}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{a:1}');
    });
    test('delete file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
        await testObject.del(userDataProfilesService.defaultProfile.settingsResource);
        const result = await testObject.exists(joinPath(userDataHomeOnDisk, 'settings.json'));
        assert.strictEqual(false, result);
    });
    test('resolve file', async () => {
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
        const result = await testObject.resolve(userDataProfilesService.defaultProfile.settingsResource);
        assert.ok(!result.isDirectory);
        assert.ok(result.children === undefined);
    });
    test('exists return false for folder that does not exist', async () => {
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.snippetsHome);
        assert.strictEqual(exists, false);
    });
    test('exists return true for folder that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const exists = await testObject.exists(userDataProfilesService.defaultProfile.snippetsHome);
        assert.strictEqual(exists, true);
    });
    test('read file throws error for folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        try {
            await testObject.readFile(userDataProfilesService.defaultProfile.snippetsHome);
            assert.fail('Should fail since read file is not supported for folders');
        }
        catch (e) { }
    });
    test('read file under folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual = await testObject.readFile(resource);
        assert.strictEqual(actual.resource.toString(), resource.toString());
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('read file under sub folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets', 'java'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'java/settings.json');
        const actual = await testObject.readFile(resource);
        assert.strictEqual(actual.resource.toString(), resource.toString());
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('create file under folder that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('create file under folder that does not exist', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.createFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual2 = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual2.value.toString(), '{}');
    });
    test('write to not existing file under container that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('write to not existing file under container that does not exists', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('write to existing file under container', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{a:1}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{a:1}');
    });
    test('write file under sub container', async () => {
        const resource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'java/settings.json');
        const actual1 = await testObject.writeFile(resource, VSBuffer.fromString('{}'));
        assert.strictEqual(actual1.resource.toString(), resource.toString());
        const actual = await testObject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'));
        assert.strictEqual(actual.value.toString(), '{}');
    });
    test('delete throws error for folder that does not exist', async () => {
        try {
            await testObject.del(userDataProfilesService.defaultProfile.snippetsHome);
            assert.fail('Should fail the folder does not exist');
        }
        catch (e) { }
    });
    test('delete not existing file under container that exists', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        try {
            await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('delete not existing file under container that does not exists', async () => {
        try {
            await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
            assert.fail('Should fail since file does not exist');
        }
        catch (e) { }
    });
    test('delete existing file under folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        await testObject.del(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json'));
        const exists = await testObject.exists(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
        assert.strictEqual(exists, false);
    });
    test('resolve folder', async () => {
        await testObject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
        await testObject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
        const result = await testObject.resolve(userDataProfilesService.defaultProfile.snippetsHome);
        assert.ok(result.isDirectory);
        assert.ok(result.children !== undefined);
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.children[0].resource.toString(), joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'settings.json').toString());
    });
    test('read backup file', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`));
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('create backup file', async () => {
        await testObject.createFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`), VSBuffer.fromString('{}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'));
        assert.strictEqual(result.value.toString(), '{}');
    });
    test('write backup file', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`), VSBuffer.fromString('{a:1}'));
        const result = await testObject.readFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'));
        assert.strictEqual(result.value.toString(), '{a:1}');
    });
    test('resolve backups folder', async () => {
        await testObject.writeFile(joinPath(backupWorkspaceHomeOnDisk, 'backup.json'), VSBuffer.fromString('{}'));
        const result = await testObject.resolve(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }));
        assert.ok(result.isDirectory);
        assert.ok(result.children !== undefined);
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.children[0].resource.toString(), joinPath(backupWorkspaceHomeOnDisk.with({ scheme: environmentService.userRoamingDataHome.scheme }), `backup.json`).toString());
    });
});
class TestFileSystemProvider {
    constructor(onDidChangeFile) {
        this.onDidChangeFile = onDidChangeFile;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
    }
    watch() {
        return Disposable.None;
    }
    stat() {
        throw new Error('Not Supported');
    }
    mkdir(resource) {
        throw new Error('Not Supported');
    }
    rename() {
        throw new Error('Not Supported');
    }
    readFile(resource) {
        throw new Error('Not Supported');
    }
    readdir(resource) {
        throw new Error('Not Supported');
    }
    writeFile() {
        throw new Error('Not Supported');
    }
    delete() {
        throw new Error('Not Supported');
    }
    open(resource, opts) {
        throw new Error('Not Supported');
    }
    close(fd) {
        throw new Error('Not Supported');
    }
    read(fd, pos, data, offset, length) {
        throw new Error('Not Supported');
    }
    write(fd, pos, data, offset, length) {
        throw new Error('Not Supported');
    }
    readFileStream(resource, opts, token) {
        throw new Error('Method not implemented.');
    }
}
suite('FileUserDataProvider - Watching', () => {
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const rootFileResource = joinPath(ROOT, 'User');
    const rootUserDataResource = rootFileResource.with({ scheme: Schemas.vscodeUserData });
    let fileEventEmitter;
    setup(() => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const environmentService = new TestEnvironmentService(rootFileResource);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        fileEventEmitter = disposables.add(new Emitter());
        testObject = disposables.add(new FileUserDataProvider(rootFileResource.scheme, new TestFileSystemProvider(fileEventEmitter.event), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()));
    });
    test('file added change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 1 /* FileChangeType.ADDED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 1 /* FileChangeType.ADDED */,
            },
        ]);
    });
    test('file updated change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 0 /* FileChangeType.UPDATED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 0 /* FileChangeType.UPDATED */,
            },
        ]);
    });
    test('file deleted change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'settings.json');
        const target = joinPath(rootFileResource, 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 2 /* FileChangeType.DELETED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 2 /* FileChangeType.DELETED */,
            },
        ]);
    });
    test('file under folder created change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 1 /* FileChangeType.ADDED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 1 /* FileChangeType.ADDED */,
            },
        ]);
    });
    test('file under folder updated change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 0 /* FileChangeType.UPDATED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 0 /* FileChangeType.UPDATED */,
            },
        ]);
    });
    test('file under folder deleted change event', (done) => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const expected = joinPath(rootUserDataResource, 'snippets', 'settings.json');
        const target = joinPath(rootFileResource, 'snippets', 'settings.json');
        disposables.add(testObject.onDidChangeFile((e) => {
            if (isEqual(e[0].resource, expected) && e[0].type === 2 /* FileChangeType.DELETED */) {
                done();
            }
        }));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 2 /* FileChangeType.DELETED */,
            },
        ]);
    });
    test('event is not triggered if not watched', async () => {
        const target = joinPath(rootFileResource, 'settings.json');
        let triggered = false;
        disposables.add(testObject.onDidChangeFile(() => (triggered = true)));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 2 /* FileChangeType.DELETED */,
            },
        ]);
        if (triggered) {
            assert.fail('event should not be triggered');
        }
    });
    test('event is not triggered if not watched 2', async () => {
        disposables.add(testObject.watch(rootUserDataResource, { excludes: [], recursive: false }));
        const target = joinPath(dirname(rootFileResource), 'settings.json');
        let triggered = false;
        disposables.add(testObject.onDidChangeFile(() => (triggered = true)));
        fileEventEmitter.fire([
            {
                resource: target,
                type: 2 /* FileChangeType.DELETED */,
            },
        ]);
        if (triggered) {
            assert.fail('event should not be triggered');
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVVzZXJEYXRhUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhL3Rlc3QvYnJvd3Nlci9maWxlVXNlckRhdGFQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFjbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8s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