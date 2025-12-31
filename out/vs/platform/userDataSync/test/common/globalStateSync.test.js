/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService, } from '../../common/userDataSync.js';
import { IUserDataProfileStorageService } from '../../../userDataProfile/common/userDataProfileStorageService.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('GlobalStateSync', () => {
    const server = new UserDataSyncTestServer();
    let testClient;
    let client2;
    let testObject;
    teardown(async () => {
        await testClient.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        testClient = disposableStore.add(new UserDataSyncClient(server));
        await testClient.setUp(true);
        testObject = testClient.getSynchronizer("globalState" /* SyncResource.GlobalState */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when global state does not exist', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            {
                type: 'GET',
                url: `${server.url}/v1/resource/${testObject.resource}/latest`,
                headers: {},
            },
        ]);
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(lastSyncUserData.syncData, null);
        manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
    }));
    test('when global state is created after first sync', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.sync(await testClient.getResourceManifest());
        updateUserStorage('a', 'value1', testClient);
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            {
                type: 'POST',
                url: `${server.url}/v1/resource/${testObject.resource}`,
                headers: { 'If-Match': lastSyncUserData?.ref },
            },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.deepStrictEqual(JSON.parse(lastSyncUserData.syncData.content).storage, {
            a: { version: 1, value: 'value1' },
        });
    }));
    test('first time sync - outgoing to server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateMachineStorage('b', 'value1', testClient);
        await updateLocale(testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, {
            'globalState.argv.locale': { version: 1, value: 'en' },
            a: { version: 1, value: 'value1' },
        });
    }));
    test('first time sync - incoming from server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await updateLocale(client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
    }));
    test('first time sync when storage exists', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, {
            a: { version: 1, value: 'value1' },
            b: { version: 1, value: 'value2' },
        });
    }));
    test('first time sync when storage exists - has conflicts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('a', 'value2', client2);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { a: { version: 1, value: 'value1' } });
    }));
    test('sync adding a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, {
            a: { version: 1, value: 'value1' },
            b: { version: 1, value: 'value2' },
        });
    }));
    test('sync updating a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        updateUserStorage('a', 'value2', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { a: { version: 1, value: 'value2' } });
    }));
    test('sync removing a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        removeStorage('b', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), undefined);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { a: { version: 1, value: 'value1' } });
    }));
    test('sync profile state', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService
            .get(IUserDataProfilesService)
            .createNamedProfile('profile1');
        await updateLocale(client2);
        await updateUserStorageForProfile('a', 'value1', profile, testClient);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService
            .get(IUserDataProfilesService)
            .profiles.find((p) => p.id === profile.id);
        const profileStorage = await testClient.instantiationService
            .get(IUserDataProfileStorageService)
            .readStorageData(syncedProfile);
        assert.strictEqual(profileStorage.get('a')?.value, 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
        const { content } = await testClient.read(testObject.resource, '1');
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { a: { version: 1, value: 'value1' } });
    }));
    function parseGlobalState(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updateLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'en' })));
    }
    function updateUserStorage(key, value, client, profile) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async function updateUserStorageForProfile(key, value, profile, client) {
        const storageService = client.instantiationService.get(IUserDataProfileStorageService);
        const data = new Map();
        data.set(key, value);
        await storageService.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
    }
    function updateMachineStorage(key, value, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    function removeStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.remove(key, 0 /* StorageScope.PROFILE */);
    }
    function readStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        return storageService.get(key, 0 /* StorageScope.PROFILE */);
    }
    async function readLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const content = await fileService.readFile(environmentService.argvResource);
        return JSON.parse(content.value.toString()).locale;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vZ2xvYmFsU3RhdGVTeW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRyxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxFQUdOLHlCQUF5QixHQUd6QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ2pILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQzNDLElBQUksVUFBOEIsQ0FBQTtJQUNsQyxJQUFJLE9BQTJCLENBQUE7SUFFL0IsSUFBSSxVQUFtQyxDQUFBO0lBRXZDLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixNQUFNLFVB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