/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { joinPath } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { UserDataAutoSyncService } from '../../common/userDataAutoSyncService.js';
import { IUserDataSyncService, UserDataAutoSyncError, UserDataSyncStoreError, } from '../../common/userDataSync.js';
import { IUserDataSyncMachinesService } from '../../common/userDataSyncMachines.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
class TestUserDataAutoSyncService extends UserDataAutoSyncService {
    startAutoSync() {
        return false;
    }
    getSyncTriggerDelayTime() {
        return 50;
    }
    sync() {
        return this.triggerSync(['sync']);
    }
}
suite('UserDataAutoSyncService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test auto sync with sync resource change triggers sync', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with settings change
            await testObject.triggerSync(["settings" /* SyncResource.Settings */]);
            // Filter out machine requests
            const actual = target.requests.filter((request) => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            ]);
        });
    });
    test('test auto sync with sync resource change triggers sync for every change', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with settings change multiple times
            for (let counter = 0; counter < 2; counter++) {
                await testObject.triggerSync(["settings" /* SyncResource.Settings */]);
            }
            // Filter out machine requests
            const actual = target.requests.filter((request) => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            assert.deepStrictEqual(actual, [
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
            ]);
        });
    });
    test('test auto sync with non sync resource change triggers sync', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with window focus once
            await testObject.triggerSync(['windowFocus']);
            // Filter out machine requests
            const actual = target.requests.filter((request) => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            ]);
        });
    });
    test('test auto sync with non sync resource change does not trigger continuous syncs', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            // Sync once and reset requests
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            target.reset();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Trigger auto sync with window focus multiple times
            for (let counter = 0; counter < 2; counter++) {
                await testObject.triggerSync(['windowFocus'], { skipIfSyncedRecently: true });
            }
            // Filter out machine requests
            const actual = target.requests.filter((request) => !request.url.startsWith(`${target.url}/v1/resource/machines`));
            // Make sure only one manifest request is made
            assert.deepStrictEqual(actual, [
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            ]);
        });
    });
    test('test first auto sync requests', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                // Machines
                { type: 'GET', url: `${target.url}/v1/resource/machines/latest`, headers: {} },
                // Settings
                { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
                { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
                // Keybindings
                { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
                {
                    type: 'POST',
                    url: `${target.url}/v1/resource/keybindings`,
                    headers: { 'If-Match': '0' },
                },
                // Snippets
                { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
                { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
                // Tasks
                { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
                { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
                // Global state
                { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
                {
                    type: 'POST',
                    url: `${target.url}/v1/resource/globalState`,
                    headers: { 'If-Match': '0' },
                },
                // Extensions
                { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
                // Prompts
                { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
                { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
                // Profiles
                { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
                // Machines
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '0' } },
            ]);
        });
    });
    test('test further auto sync requests without changes', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
            ]);
        });
    });
    test('test further auto sync requests with changes', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            // Do changes in the client
            const fileService = client.instantiationService.get(IFileService);
            const environmentService = client.instantiationService.get(IEnvironmentService);
            const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
            await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
            await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'h1.prompt.md'), VSBuffer.fromString(' '));
            await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Settings
                { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
                // Keybindings
                {
                    type: 'POST',
                    url: `${target.url}/v1/resource/keybindings`,
                    headers: { 'If-Match': '1' },
                },
                // Snippets
                { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
                // Global state
                {
                    type: 'POST',
                    url: `${target.url}/v1/resource/globalState`,
                    headers: { 'If-Match': '1' },
                },
                // Prompts
                { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            ]);
        });
    });
    test('test auto sync send execution id header', async () => {
        await runWithFakedTimers({}, async () => {
            // Setup the client
            const target = new UserDataSyncTestServer();
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestUserDataAutoSyncService));
            // Sync once and reset requests
            await testObject.sync();
            target.reset();
            await testObject.sync();
            for (const request of target.requestsWithAllHeaders) {
                const hasExecutionIdHeader = request.headers &&
                    request.headers['X-Execution-Id'] &&
                    request.headers['X-Execution-Id'].length > 0;
                if (request.url.startsWith(`${target.url}/v1/resource/machines`)) {
                    assert.ok(!hasExecutionIdHeader, `Should not have execution header: ${request.url}`);
                }
                else {
                    assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
                }
            }
        });
    });
    test('test delete on one client throws turned off error on other client while syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the client
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Reset from the first client
            await client.instantiationService.get(IUserDataSyncService).reset();
            // Sync from the test client
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                {
                    type: 'GET',
                    url: `${target.url}/v1/resource/machines/latest`,
                    headers: { 'If-None-Match': '1' },
                },
            ]);
        });
    });
    test('test disabling the machine turns off sync', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Disable current machine
            const userDataSyncMachinesService = testClient.instantiationService.get(IUserDataSyncMachinesService);
            const machines = await userDataSyncMachinesService.getMachines();
            const currentMachine = machines.find((m) => m.isCurrent);
            await userDataSyncMachinesService.setEnablements([[currentMachine.id, false]]);
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                {
                    type: 'GET',
                    url: `${target.url}/v1/resource/machines/latest`,
                    headers: { 'If-None-Match': '2' },
                },
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '2' } },
            ]);
        });
    });
    test('test removing the machine adds machine back', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Remove current machine
            await testClient.instantiationService.get(IUserDataSyncMachinesService).removeCurrentMachine();
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                { type: 'POST', url: `${target.url}/v1/resource/machines`, headers: { 'If-Match': '2' } },
            ]);
        });
    });
    test('test creating new session from one client throws session expired error on another client while syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer();
            // Set up and sync from the client
            const client = disposableStore.add(new UserDataSyncClient(target));
            await client.setUp();
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.sync();
            // Reset from the first client
            await client.instantiationService.get(IUserDataSyncService).reset();
            // Sync again from the first client to create new session
            await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
            // Sync from the test client
            target.reset();
            const errorPromise = Event.toPromise(testObject.onError);
            await testObject.sync();
            const e = await errorPromise;
            assert.ok(e instanceof UserDataAutoSyncError);
            assert.deepStrictEqual(e.code, "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */);
            assert.deepStrictEqual(target.requests, [
                // Manifest
                { type: 'GET', url: `${target.url}/v1/manifest`, headers: { 'If-None-Match': '1' } },
                // Machine
                {
                    type: 'GET',
                    url: `${target.url}/v1/resource/machines/latest`,
                    headers: { 'If-None-Match': '1' },
                },
            ]);
        });
    });
    test('test rate limit on server', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            const errorPromise = Event.toPromise(testObject.onError);
            while (target.requests.length < 5) {
                await testObject.sync();
            }
            const e = await errorPromise;
            assert.ok(e instanceof UserDataSyncStoreError);
            assert.deepStrictEqual(e.code, "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */);
        });
    });
    test('test auto sync is suspended when server donot accepts requests', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            while (target.requests.length < 5) {
                await testObject.sync();
            }
            target.reset();
            await testObject.sync();
            assert.deepStrictEqual(target.requests, []);
        });
    });
    test('test cache control header with no cache is sent when triggered with disable cache option', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.triggerSync(['some reason'], { disableCache: true });
            assert.strictEqual(target.requestsWithAllHeaders[0].headers['Cache-Control'], 'no-cache');
        });
    });
    test('test cache control header is not sent when triggered without disable cache option', async () => {
        await runWithFakedTimers({}, async () => {
            const target = new UserDataSyncTestServer(5, 1);
            // Set up and sync from the test client
            const testClient = disposableStore.add(new UserDataSyncClient(target));
            await testClient.setUp();
            const testObject = disposableStore.add(testClient.instantiationService.createInstance(TestUserDataAutoSyncService));
            await testObject.triggerSync(['some reason']);
            assert.strictEqual(target.requestsWithAllHeaders[0].headers['Cache-Control'], undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3VzZXJEYXRhQXV0b1N5bmNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sb0JBQW9CLEVBRXBCLHFCQUFxQixFQUVyQixzQkFBc0IsR0FDdEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVwRixNQUFNLDJCQUE0QixTQUFRLHVCQUF1QjtJQUM3QyxhQUFh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