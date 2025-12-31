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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3VzZXJEYXRhU3luY1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsb0JBQW9CLEdBR3BCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEYsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRWpFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QyxtQkFBbUI7UUFDbkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO1FBQzNDLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFB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