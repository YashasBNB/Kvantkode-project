/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { IFileService } from '../../../../files/common/files.js';
import { assertDefined } from '../../../../../base/common/types.js';
import { dirname, joinPath } from '../../../../../base/common/resources.js';
import { IEnvironmentService } from '../../../../environment/common/environment.js';
import { UserDataSyncClient, UserDataSyncTestServer } from '../userDataSyncClient.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUserDataProfilesService, } from '../../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService, PREVIEW_DIR_NAME, } from '../../../common/userDataSync.js';
const PROMPT1_TEXT = 'Write a poem about a programmer who falls in love with their code.';
const PROMPT2_TEXT = 'Explain quantum physics using only emojis and cat memes.';
const PROMPT3_TEXT = 'Create a dialogue between a toaster and a refrigerator about their daily routines.';
const PROMPT4_TEXT = 'Describe a day in the life of a rubber duck debugging session.';
const PROMPT5_TEXT = 'Write a short story where a bug in the code becomes a superhero.';
const PROMPT6_TEXT = 'Imagine a world where all software bugs are sentient.\nWhat do they talk about?';
suite('PromptsSync', () => {
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
        const maybeSynchronizer = testClient.getSynchronizer("prompts" /* SyncResource.Prompts */);
        assertDefined(maybeSynchronizer, 'Prompts synchronizer object must be defined.');
        testObject = maybeSynchronizer;
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('• when prompts does not exist', async () => {
        const fileService = testClient.instantiationService.get(IFileService);
        const promptsResource = testClient.instantiationService.get(IUserDataProfilesService).defaultProfile.promptsHome;
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
        ]);
        assert.ok(!(await fileService.exists(promptsResource)));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        assertDefined(lastSyncUserData, 'Last sync user data must be defined.');
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
    test('• when prompt is created after first sync', async () => {
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
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
        assertDefined(lastSyncUserData, 'Last sync user data must be defined.');
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assertDefined(lastSyncUserData.syncData, 'Last sync user sync data must be defined.');
        assert.deepStrictEqual(lastSyncUserData.syncData.content, JSON.stringify({ 'prompt3.prompt.md': PROMPT3_TEXT }));
    });
    test('• first time sync - outgoing to server (no prompts)', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT3_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• first time sync - incoming from server (no prompts)', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
    });
    test('• first time sync when prompts exists', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT3_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• first time sync when prompts exists - has conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt3.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• first time sync when prompts exists - has conflicts and accept conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT3_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'prompt3.prompt.md': PROMPT3_TEXT });
    });
    test('• first time sync when prompts exists - has multiple conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local1 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt3.prompt.md');
        const local2 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt1.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local1, local2]);
    });
    test('• first time sync when prompts exists - has multiple conflicts and accept one conflict', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        let conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        conflicts = testObject.conflicts.conflicts;
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'prompt1.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• first time sync when prompts exists - has multiple conflicts and accept all conflicts', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('prompt1.prompt.md', PROMPT2_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.accept(conflicts[1].previewResource, PROMPT1_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT4_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• sync adding a prompt', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'prompt3.prompt.md': PROMPT3_TEXT,
            'prompt1.prompt.md': PROMPT1_TEXT,
        });
    });
    test('• sync adding a prompt - accept', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('prompt1.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('prompt1.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT1_TEXT);
    });
    test('• sync updating a prompt', async () => {
        await updatePrompt('default.prompt.md', PROMPT3_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('default.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('default.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'default.prompt.md': PROMPT4_TEXT });
    });
    test('• sync updating a prompt - accept', async () => {
        await updatePrompt('my.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('my.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('my.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
    });
    test('• sync updating a prompt - conflict', async () => {
        await updatePrompt('some.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('some.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await updatePrompt('some.prompt.md', PROMPT5_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'some.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• sync updating a prompt - resolve conflict', async () => {
        await updatePrompt('advanced.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('advanced.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await updatePrompt('advanced.prompt.md', PROMPT5_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('advanced.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT4_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'advanced.prompt.md': PROMPT4_TEXT });
    });
    test('• sync removing a prompt', async () => {
        await updatePrompt('another.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('chat.prompt.md', PROMPT1_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('another.prompt.md', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('chat.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('another.prompt.md', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'chat.prompt.md': PROMPT1_TEXT });
    });
    test('• sync removing a prompt - accept', async () => {
        await updatePrompt('my-query.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('summarize.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('my-query.prompt.md', client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('summarize.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('my-query.prompt.md', testClient);
        assert.strictEqual(actual2, null);
    });
    test('• sync removing a prompt locally and updating it remotely', async () => {
        await updatePrompt('some.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('important.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updatePrompt('some.prompt.md', PROMPT4_TEXT, client2);
        await client2.sync();
        await removePrompt('some.prompt.md', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('important.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('some.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT4_TEXT);
    });
    test('• sync removing a prompt - conflict', async () => {
        await updatePrompt('common.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('rare.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('common.prompt.md', client2);
        await client2.sync();
        await updatePrompt('common.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'common.prompt.md');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('• sync removing a prompt - resolve conflict', async () => {
        await updatePrompt('uncommon.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('hot.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('uncommon.prompt.md', client2);
        await client2.sync();
        await updatePrompt('uncommon.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, PROMPT5_TEXT);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('hot.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('uncommon.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT5_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'hot.prompt.md': PROMPT1_TEXT,
            'uncommon.prompt.md': PROMPT5_TEXT,
        });
    });
    test('• sync removing a prompt - resolve conflict by removing', async () => {
        await updatePrompt('prompt3.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('refactor.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removePrompt('prompt3.prompt.md', client2);
        await client2.sync();
        await updatePrompt('prompt3.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('refactor.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('prompt3.prompt.md', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, { 'refactor.prompt.md': PROMPT1_TEXT });
    });
    test('• sync prompts', async () => {
        await updatePrompt('first.prompt.md', PROMPT6_TEXT, client2);
        await updatePrompt('roaming.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('roaming.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT3_TEXT);
        const actual2 = await readPrompt('first.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT6_TEXT);
        const { content } = await testClient.read(testObject.resource);
        assertDefined(content, 'Test object content must be defined.');
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'roaming.prompt.md': PROMPT3_TEXT,
            'first.prompt.md': PROMPT6_TEXT,
        });
    });
    test('• sync should ignore non prompts', async () => {
        await updatePrompt('my.prompt.md', PROMPT6_TEXT, client2);
        await updatePrompt('html.html', PROMPT3_TEXT, client2);
        await updatePrompt('shared.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readPrompt('shared.prompt.md', testClient);
        assert.strictEqual(actual1, PROMPT1_TEXT);
        const actual2 = await readPrompt('my.prompt.md', testClient);
        assert.strictEqual(actual2, PROMPT6_TEXT);
        const actual3 = await readPrompt('html.html', testClient);
        assert.strictEqual(actual3, null);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parsePrompts(content);
        assert.deepStrictEqual(actual, {
            'shared.prompt.md': PROMPT1_TEXT,
            'my.prompt.md': PROMPT6_TEXT,
        });
    });
    test('• previews are reset after all conflicts resolved', async () => {
        await updatePrompt('html.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('css.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('html.prompt.md', PROMPT4_TEXT, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, PROMPT4_TEXT);
        await testObject.apply(false);
        const fileService = testClient.instantiationService.get(IFileService);
        assert.ok(!(await fileService.exists(dirname(conflicts[0].previewResource))));
    });
    test('• merge when there are multiple prompts and all prompts are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('sublime.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('tests.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'sublime.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'tests.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and all prompts are merged and applied', async () => {
        await updatePrompt('short.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('long.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and one prompt has no changes and one prompt is merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('coding.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('coding.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('exploring.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'exploring.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'coding.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts and one prompt has no changes and prompts is merged and applied', async () => {
        await updatePrompt('quick.prompt.md', PROMPT3_TEXT, client2);
        await client2.sync();
        await updatePrompt('quick.prompt.md', PROMPT3_TEXT, testClient);
        await updatePrompt('databases.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• merge when there are multiple prompts with conflicts and all prompts are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('reverse.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('recycle.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('reverse.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('recycle.prompt.md', PROMPT2_TEXT, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'reverse.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'recycle.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'reverse.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'recycle.prompt.md'),
        ]);
    });
    test('• accept when there are multiple prompts with conflicts and only one prompt is accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('current.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('future.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('current.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('future.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'current.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'future.prompt.md'),
        ]);
    });
    test('• accept when there are multiple prompts with conflicts and all prompts are accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('dynamic.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('static.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('dynamic.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('static.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, PROMPT2_TEXT);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'dynamic.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'static.prompt.md'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• accept when there are multiple prompts with conflicts and all prompts are accepted and applied', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updatePrompt('edicational.prompt.md', PROMPT3_TEXT, client2);
        await updatePrompt('unknown.prompt.md', PROMPT1_TEXT, client2);
        await client2.sync();
        await updatePrompt('edicational.prompt.md', PROMPT4_TEXT, testClient);
        await updatePrompt('unknown.prompt.md', PROMPT2_TEXT, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assertDefined(preview, 'Preview must be defined.');
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'edicational.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'unknown.prompt.md'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'edicational.prompt.md'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'unknown.prompt.md'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, PROMPT4_TEXT);
        assertDefined(preview, 'Preview must be defined after accept.');
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, PROMPT2_TEXT);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null, 'Preview after the last apply must be `null`.');
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('• sync profile prompts', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService
            .get(IUserDataProfilesService)
            .createNamedProfile('profile1');
        await updatePrompt('my.prompt.md', PROMPT3_TEXT, client2, profile);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService
            .get(IUserDataProfilesService)
            .profiles.find((p) => p.id === profile.id);
        const content = await readPrompt('my.prompt.md', testClient, syncedProfile);
        assert.strictEqual(content, PROMPT3_TEXT);
    });
    function parsePrompts(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updatePrompt(name, content, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).promptsHome, name);
        await fileService.writeFile(promptsResource, VSBuffer.fromString(content));
    }
    async function removePrompt(name, client) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath(userDataProfilesService.defaultProfile.promptsHome, name);
        await fileService.del(promptsResource);
    }
    async function readPrompt(name, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const promptsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).promptsHome, name);
        if (await fileService.exists(promptsResource)) {
            const content = await fileService.readFile(promptsResource);
            return content.value.toString();
        }
        return null;
    }
    function assertPreviews(actual, expected) {
        assert.deepStrictEqual(actual.map(({ previewResource }) => previewResource.toString()), expected.map((uri) => uri.toString()));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1N5bmMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3Byb21wdHNTeW5jL3Byb21wdHNTeW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFHTix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBR2hCLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsTUFBTSxZQUFZLEdBQUcsb0VBQW9FLENBQUE7QUFDekYsTUFBTSxZQUFZLEdBQUcsMERBQTBELENBQUE7QUFDL0UsTUFBTSxZQUFZLEdBQ2pCLG9GQUFvRixDQUFBO0FBQ3JGLE1BQU0sWUFBWSxHQUFHLGdFQUFnRSxDQUFBO0FBQ3JGLE1BQU0sWUFBWSxHQUFHLGtFQUFrRSxDQUFBO0FBQ3ZGLE1BQU0sWUFBWSxHQUNqQixpRkFBaUYsQ0FBQTtBQUVsRixL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