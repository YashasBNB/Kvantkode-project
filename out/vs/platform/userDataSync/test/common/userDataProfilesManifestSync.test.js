/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataProfilesManifestSync', () => {
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
        testObject = testClient.getSynchronizer("profiles" /* SyncResource.Profiles */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when profiles does not exist', async () => {
        await runWithFakedTimers({}, async () => {
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
        });
    });
    test('when profile is created after first sync', async () => {
        await runWithFakedTimers({}, async () => {
            await testObject.sync(await testClient.getResourceManifest());
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', '1');
            let lastSyncUserData = await testObject.getLastSyncUserData();
            const manifest = await testClient.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                { type: 'POST', url: `${server.url}/v1/collection`, headers: {} },
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
            assert.deepStrictEqual(JSON.parse(lastSyncUserData.syncData.content), [
                { name: '1', id: '1', collection: '1' },
            ]);
        });
    });
    test('first time sync - outgoing to server (no state)', async () => {
        await runWithFakedTimers({}, async () => {
            await testClient.instantiationService.get(IUserDataProfilesService).createProfile('1', '1');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            assert.deepStrictEqual(JSON.parse(JSON.parse(content).content), [
                { name: '1', id: '1', collection: '1' },
            ]);
        });
    });
    test('first time sync - incoming from server (no state)', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [{ id: '1', name: 'name 1', useDefaultFlags: undefined }]);
        });
    });
    test('first time sync when profiles exists', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [
                { id: '1', name: 'name 1', useDefaultFlags: undefined },
                { id: '2', name: 'name 2', useDefaultFlags: undefined },
            ]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [
                { id: '1', name: 'name 1', collection: '1' },
                { id: '2', name: 'name 2', collection: '2' },
            ]);
        });
    });
    test('first time sync when storage exists - has conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const profiles = getLocalProfiles(testClient);
            assert.deepStrictEqual(profiles, [{ id: '1', name: 'name 1', useDefaultFlags: undefined }]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 1', collection: '1' }]);
        });
    });
    test('sync adding a profile', async () => {
        await runWithFakedTimers({}, async () => {
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 1');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '1', name: 'name 1', useDefaultFlags: undefined },
                { id: '2', name: 'name 2', useDefaultFlags: undefined },
            ]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [
                { id: '1', name: 'name 1', useDefaultFlags: undefined },
                { id: '2', name: 'name 2', useDefaultFlags: undefined },
            ]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [
                { id: '1', name: 'name 1', collection: '1' },
                { id: '2', name: 'name 2', collection: '2' },
            ]);
        });
    });
    test('sync updating a profile', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 1');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .updateProfile(profile, { name: 'name 2' });
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '1', name: 'name 2', useDefaultFlags: undefined },
            ]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [
                { id: '1', name: 'name 2', useDefaultFlags: undefined },
            ]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '1', name: 'name 2', collection: '1' }]);
        });
    });
    test('sync removing a profile', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 1');
            await testClient.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('2', 'name 2');
            await testObject.sync(await testClient.getResourceManifest());
            await client2.sync();
            testClient.instantiationService.get(IUserDataProfilesService).removeProfile(profile);
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '2', name: 'name 2', useDefaultFlags: undefined },
            ]);
            await client2.sync();
            assert.deepStrictEqual(getLocalProfiles(client2), [
                { id: '2', name: 'name 2', useDefaultFlags: undefined },
            ]);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [{ id: '2', name: 'name 2', collection: '2' }]);
        });
    });
    test('sync profile that uses default profile', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 1', { useDefaultFlags: { keybindings: true } });
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [
                { id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } },
            ]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } },
            ]);
        });
    });
    test('sync profile when the profile is updated to use default profile locally', async () => {
        await runWithFakedTimers({}, async () => {
            await client2.instantiationService.get(IUserDataProfilesService).createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            const profile = testClient.instantiationService
                .get(IUserDataProfilesService)
                .profiles.find((p) => p.id === '1');
            testClient.instantiationService
                .get(IUserDataProfilesService)
                .updateProfile(profile, { useDefaultFlags: { keybindings: true } });
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [
                { id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } },
            ]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } },
            ]);
        });
    });
    test('sync profile when the profile is updated to use default profile remotely', async () => {
        await runWithFakedTimers({}, async () => {
            const profile = await client2.instantiationService
                .get(IUserDataProfilesService)
                .createProfile('1', 'name 1');
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            client2.instantiationService
                .get(IUserDataProfilesService)
                .updateProfile(profile, { useDefaultFlags: { keybindings: true } });
            await client2.sync();
            await testObject.sync(await testClient.getResourceManifest());
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
            const { content } = await testClient.read(testObject.resource);
            assert.ok(content !== null);
            const actual = parseRemoteProfiles(content);
            assert.deepStrictEqual(actual, [
                { id: '1', name: 'name 1', collection: '1', useDefaultFlags: { keybindings: true } },
            ]);
            assert.deepStrictEqual(getLocalProfiles(testClient), [
                { id: '1', name: 'name 1', useDefaultFlags: { keybindings: true } },
            ]);
        });
    });
    function parseRemoteProfiles(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    function getLocalProfiles(client) {
        return client.instantiationService
            .get(IUserDataProfilesService)
            .profiles.slice(1)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((profile) => ({
            id: profile.id,
            name: profile.name,
            useDefaultFlags: profile.useDefaultFlags,
        }));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0U3luYy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3VzZXJEYXRhUHJvZmlsZXNNYW5pZmVzdFN5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFN0YsT0FBTyxFQUdOLHlCQUF5QixHQUd6QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXBGLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQzNDLElBQUksVUFBOEIsQ0FBQTtJQUNsQyxJQUFJLE9BQTJCLENBQUE7SUFFL0IsSUFBSSxVQUFnRCxDQUFBO0lBRXBELFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixNQUFNLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM3RSxDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sZUFBZSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFakUsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLFVBQVUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksa0JB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