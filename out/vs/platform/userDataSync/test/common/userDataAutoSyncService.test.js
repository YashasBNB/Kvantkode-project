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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi91c2VyRGF0YUF1dG9TeW5jU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUNOLG9CQUFvQixFQUVwQixxQkFBcUIsRUFFckIsc0JBQXNCLEdBQ3RCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEYsTUFBTSwyQkFBNEIsU0FBUSx1QkFBdUI7SUFDN0MsYUFBYTtRQUMvQixPQUFPLEtBQUssQ0FBQTtJ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