/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataSyncService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test first time sync ever', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync ever when a sync resource is disabled', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        client.instantiationService
            .get(IUserDataSyncEnablementService)
            .setResourceEnablement("settings" /* SyncResource.Settings */, false);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync ever with no data', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp(true);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with no changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'mine.prompt.md'), VSBuffer.fromString('text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with changes - merge with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'my.prompt.md'), VSBuffer.fromString('some prompt text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/keybindings/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/globalState/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there are no changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the client again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
        ]);
    });
    test('test sync when there are local changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'shared.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are local changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'default.prompt.md'), VSBuffer.fromString('some prompt file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/keybindings/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/globalState/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there are local changes and sync resource is disabled', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '1.prompt.md'), VSBuffer.fromString('random prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        client.instantiationService
            .get(IUserDataSyncEnablementService)
            .setResourceEnablement("snippets" /* SyncResource.Snippets */, false);
        client.instantiationService
            .get(IUserDataSyncEnablementService)
            .setResourceEnablement("prompts" /* SyncResource.Prompts */, false);
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are remote changes', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'unknown.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/settings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Keybindings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/keybindings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Snippets
            {
                type: 'GET',
                url: `${target.url}/v1/resource/snippets/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Global state
            {
                type: 'GET',
                url: `${target.url}/v1/resource/globalState/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Prompts
            {
                type: 'GET',
                url: `${target.url}/v1/resource/prompts/latest`,
                headers: { 'If-None-Match': '1' },
            },
        ]);
    });
    test('test sync when there are remote changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'global.prompt.md'), VSBuffer.fromString('some text goes here'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/settings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Keybindings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/keybindings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Snippets
            {
                type: 'GET',
                url: `${target.url}/v1/resource/snippets/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Global state
            {
                type: 'GET',
                url: `${target.url}/v1/resource/globalState/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Prompts
            {
                type: 'GET',
                url: `${target.url}/v1/resource/prompts/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Profiles
            {
                type: 'GET',
                url: `${target.url}/v1/resource/profiles/latest`,
                headers: { 'If-None-Match': '0' },
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/keybindings/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/globalState/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test delete', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        target.reset();
        await testObject.reset();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'DELETE', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'DELETE', url: `${target.url}/v1/resource`, headers: {} },
        ]);
    });
    test('test delete and sync', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        await testObject.reset();
        // Sync again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Extensions
            { type: 'GET', url: `${target.url}/v1/resource/extensions/latest`, headers: {} },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: {} },
        ]);
    });
    test('test sync status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // sync from the client
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus((status) => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, [
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
            "syncing" /* SyncStatus.Syncing */,
            "idle" /* SyncStatus.Idle */,
        ]);
    });
    test('test sync conflicts status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(testObject.conflicts.map(({ syncResource }) => syncResource), ["settings" /* SyncResource.Settings */]);
    });
    test('test sync will sync other non conflicted areas', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client and get conflicts in settings
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testFileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await testFileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the first client with changes in keybindings
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // sync from the test client
        target.reset();
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus((status) => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, []);
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/keybindings/latest`,
                headers: { 'If-None-Match': '1' },
            },
        ]);
    });
    test('test stop sync reset status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        const syncTask = await testObject.createSyncTask(null);
        syncTask.run().then(null, () => null /* ignore error */);
        await syncTask.stop();
        assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts, []);
    });
    test('test sync send execution id header', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        for (const request of target.requestsWithAllHeaders) {
            const hasExecutionIdHeader = request.headers &&
                request.headers['X-Execution-Id'] &&
                request.headers['X-Execution-Id'].length > 0;
            assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
        }
    });
    test('test can run sync taks only once', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        const syncTask = await testObject.createSyncTask(null);
        await syncTask.run();
        try {
            await syncTask.run();
            assert.fail('Should fail running the task again');
        }
        catch (error) {
            /* expected */
        }
    });
    test('test sync when there are local profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', { useDefaultFlags: { settings: true } });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '2.prompt.md'), VSBuffer.fromString('file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/keybindings/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/globalState/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test sync when there is a remote profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', {
            useDefaultFlags: { keybindings: true },
        });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ command: 'abcd', key: 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'best.prompt.md'), VSBuffer.fromString('prompt prompt'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/settings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Keybindings
            {
                type: 'GET',
                url: `${target.url}/v1/resource/keybindings/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Snippets
            {
                type: 'GET',
                url: `${target.url}/v1/resource/snippets/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Global state
            {
                type: 'GET',
                url: `${target.url}/v1/resource/globalState/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Prompts
            {
                type: 'GET',
                url: `${target.url}/v1/resource/prompts/latest`,
                headers: { 'If-None-Match': '1' },
            },
            // Profiles
            {
                type: 'GET',
                url: `${target.url}/v1/resource/profiles/latest`,
                headers: { 'If-None-Match': '0' },
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/tasks/latest`, headers: {} },
            {
                type: 'GET',
                url: `${target.url}/v1/collection/1/resource/globalState/latest`,
                headers: {},
            },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/extensions/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/collection/1/resource/prompts/latest`, headers: {} },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdXNlckRhdGFTeW5jU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixvQkFBb0IsR0FHcEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVwRixLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLE1BQU0sZUFBZSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFakUsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLG1CQUFtQjtRQUNuQixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFD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