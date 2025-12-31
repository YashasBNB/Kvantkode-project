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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1N5bmMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9wcm9tcHRzU3luYy9wcm9tcHRzU3luYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBR04seUJBQXlCLEVBQ3pCLGdCQUFnQixHQUdoQixNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLE1BQU0sWUFBWSxHQUFHLG9FQUFvRSxDQUFBO0FBQ3pGLE1BQU0sWUFBWSxHQUFHLDBEQUEwRCxDQUFBO0FBQy9FLE1BQU0sWUFBWSxHQUNqQixvRkFBb0YsQ0FBQTtBQUNyRixNQUFNLFlBQVksR0FBRyxnRUFBZ0UsQ0FBQTtBQUNyRixNQUFNLFlBQVksR0FBRyxrRUFBa0UsQ0FBQTtBQUN2RixNQUFNLFlBQVksR0FDakIsaUZBQWlGLENBQUE7QUFFbEYsS0FBSyxD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