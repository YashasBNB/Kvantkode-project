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
import { IUserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService, PREVIEW_DIR_NAME, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
const tsSnippet1 = `{

	// Place your snippets for TypeScript here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, Placeholders with the
	// same ids are connected.
	"Print to console": {
	// Example:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console",
	}

}`;
const tsSnippet2 = `{

	// Place your snippets for TypeScript here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, Placeholders with the
	// same ids are connected.
	"Print to console": {
	// Example:
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console always",
	}

}`;
const htmlSnippet1 = `{
/*
	// Place your snippets for HTML here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div"
	}
}`;
const htmlSnippet2 = `{
/*
	// Place your snippets for HTML here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div changed"
	}
}`;
const htmlSnippet3 = `{
/*
	// Place your snippets for HTML here. Each snippet is defined under a snippet name and has a prefix, body and
	// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted.
	// Example:
	"Print to console": {
	"prefix": "log",
		"body": [
			"console.log('$1');",
			"$2"
		],
			"description": "Log output to console"
	}
*/
"Div": {
	"prefix": "div",
		"body": [
			"<div>",
			"",
			"</div>"
		],
			"description": "New div changed again"
	}
}`;
const globalSnippet = `{
	// Place your global snippets here. Each snippet is defined under a snippet name and has a scope, prefix, body and
	// description. Add comma separated ids of the languages where the snippet is applicable in the scope field. If scope
	// is left empty or omitted, the snippet gets applied to all languages. The prefix is what is
	// used to trigger the snippet and the body will be expanded and inserted. Possible variables are:
	// $1, $2 for tab stops, $0 for the final cursor position, and {1: label}, { 2: another } for placeholders.
	// Placeholders with the same ids are connected.
	// Example:
	// "Print to console": {
	// 	"scope": "javascript,typescript",
	// 	"prefix": "log",
	// 	"body": [
	// 		"console.log('$1');",
	// 		"$2"
	// 	],
	// 	"description": "Log output to console"
	// }
}`;
suite('SnippetsSync', () => {
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
        testObject = testClient.getSynchronizer("snippets" /* SyncResource.Snippets */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when snippets does not exist', async () => {
        const fileService = testClient.instantiationService.get(IFileService);
        const snippetsResource = testClient.instantiationService.get(IUserDataProfilesService).defaultProfile.snippetsHome;
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
        ]);
        assert.ok(!(await fileService.exists(snippetsResource)));
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
    test('when snippet is created after first sync', async () => {
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet1, testClient);
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
        assert.deepStrictEqual(lastSyncUserData.syncData.content, JSON.stringify({ 'html.json': htmlSnippet1 }));
    });
    test('first time sync - outgoing to server (no snippets)', async () => {
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await updateSnippet('typescript.json', tsSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 });
    });
    test('first time sync - incoming from server (no snippets)', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const actual2 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual2, tsSnippet1);
    });
    test('first time sync when snippets exists', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await updateSnippet('typescript.json', tsSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const actual2 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual2, tsSnippet1);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 });
    });
    test('first time sync when snippets exists - has conflicts', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('first time sync when snippets exists - has conflicts and accept conflicts', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, htmlSnippet1);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet1 });
    });
    test('first time sync when snippets exists - has multiple conflicts', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local1 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json');
        const local2 = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json');
        assertPreviews(testObject.conflicts.conflicts, [local1, local2]);
    });
    test('first time sync when snippets exists - has multiple conflicts and accept one conflict', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        let conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, htmlSnippet2);
        conflicts = testObject.conflicts.conflicts;
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('first time sync when snippets exists - has multiple conflicts and accept all conflicts', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, htmlSnippet2);
        await testObject.accept(conflicts[1].previewResource, tsSnippet1);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet2);
        const actual2 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual2, tsSnippet1);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet2, 'typescript.json': tsSnippet1 });
    });
    test('sync adding a snippet', async () => {
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('typescript.json', tsSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const actual2 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual2, tsSnippet1);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet1, 'typescript.json': tsSnippet1 });
    });
    test('sync adding a snippet - accept', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const actual2 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual2, tsSnippet1);
    });
    test('sync updating a snippet', async () => {
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet2);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet2 });
    });
    test('sync updating a snippet - accept', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet2, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet2);
    });
    test('sync updating a snippet - conflict', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet2, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet3, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('sync updating a snippet - resolve conflict', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet2, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet3, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, htmlSnippet2);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet2);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'html.json': htmlSnippet2 });
    });
    test('sync removing a snippet', async () => {
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await updateSnippet('typescript.json', tsSnippet1, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await removeSnippet('html.json', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'typescript.json': tsSnippet1 });
    });
    test('sync removing a snippet - accept', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removeSnippet('html.json', client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual2, null);
    });
    test('sync removing a snippet locally and updating it remotely', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await updateSnippet('html.json', htmlSnippet2, client2);
        await client2.sync();
        await removeSnippet('html.json', testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual2, htmlSnippet2);
    });
    test('sync removing a snippet - conflict', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removeSnippet('html.json', client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const local = joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json');
        assertPreviews(testObject.conflicts.conflicts, [local]);
    });
    test('sync removing a snippet - resolve conflict', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removeSnippet('html.json', client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, htmlSnippet3);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual2, htmlSnippet3);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'typescript.json': tsSnippet1, 'html.json': htmlSnippet3 });
    });
    test('sync removing a snippet - resolve conflict by removing', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        await removeSnippet('html.json', client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
        await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual2, null);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, { 'typescript.json': tsSnippet1 });
    });
    test('sync global and language snippet', async () => {
        await updateSnippet('global.code-snippets', globalSnippet, client2);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('html.json', testClient);
        assert.strictEqual(actual1, htmlSnippet1);
        const actual2 = await readSnippet('global.code-snippets', testClient);
        assert.strictEqual(actual2, globalSnippet);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, {
            'html.json': htmlSnippet1,
            'global.code-snippets': globalSnippet,
        });
    });
    test('sync should ignore non snippets', async () => {
        await updateSnippet('global.code-snippets', globalSnippet, client2);
        await updateSnippet('html.html', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await testObject.sync(await testClient.getResourceManifest());
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const actual1 = await readSnippet('typescript.json', testClient);
        assert.strictEqual(actual1, tsSnippet1);
        const actual2 = await readSnippet('global.code-snippets', testClient);
        assert.strictEqual(actual2, globalSnippet);
        const actual3 = await readSnippet('html.html', testClient);
        assert.strictEqual(actual3, null);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSnippets(content);
        assert.deepStrictEqual(actual, {
            'typescript.json': tsSnippet1,
            'global.code-snippets': globalSnippet,
        });
    });
    test('previews are reset after all conflicts resolved', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await testObject.sync(await testClient.getResourceManifest());
        const conflicts = testObject.conflicts.conflicts;
        await testObject.accept(conflicts[0].previewResource, htmlSnippet2);
        await testObject.apply(false);
        const fileService = testClient.instantiationService.get(IFileService);
        assert.ok(!(await fileService.exists(dirname(conflicts[0].previewResource))));
    });
    test('merge when there are multiple snippets and all snippets are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('merge when there are multiple snippets and all snippets are merged and applied', async () => {
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('merge when there are multiple snippets and one snippet has no changes and one snippet is merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('merge when there are multiple snippets and one snippet has no changes and snippets is merged and applied', async () => {
        await updateSnippet('html.json', htmlSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet1, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('merge when there are multiple snippets with conflicts and all snippets are merged', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        const preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
    });
    test('accept when there are multiple snippets with conflicts and only one snippet is accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, htmlSnippet2);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
    });
    test('accept when there are multiple snippets with conflicts and all snippets are accepted', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, htmlSnippet2);
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, tsSnippet2);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('accept when there are multiple snippets with conflicts and all snippets are accepted and applied', async () => {
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        await updateSnippet('html.json', htmlSnippet1, client2);
        await updateSnippet('typescript.json', tsSnippet1, client2);
        await client2.sync();
        await updateSnippet('html.json', htmlSnippet2, testClient);
        await updateSnippet('typescript.json', tsSnippet2, testClient);
        let preview = await testObject.sync(await testClient.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assertPreviews(preview.resourcePreviews, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        assertPreviews(testObject.conflicts.conflicts, [
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'html.json'),
            joinPath(environmentService.userDataSyncHome, testObject.resource, PREVIEW_DIR_NAME, 'typescript.json'),
        ]);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource, htmlSnippet2);
        preview = await testObject.accept(preview.resourcePreviews[1].previewResource, tsSnippet2);
        preview = await testObject.apply(false);
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.strictEqual(preview, null);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
    });
    test('sync profile snippets', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService
            .get(IUserDataProfilesService)
            .createNamedProfile('profile1');
        await updateSnippet('html.json', htmlSnippet1, client2, profile);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService
            .get(IUserDataProfilesService)
            .profiles.find((p) => p.id === profile.id);
        const content = await readSnippet('html.json', testClient, syncedProfile);
        assert.strictEqual(content, htmlSnippet1);
    });
    function parseSnippets(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updateSnippet(name, content, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const snippetsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).snippetsHome, name);
        await fileService.writeFile(snippetsResource, VSBuffer.fromString(content));
    }
    async function removeSnippet(name, client) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const snippetsResource = joinPath(userDataProfilesService.defaultProfile.snippetsHome, name);
        await fileService.del(snippetsResource);
    }
    async function readSnippet(name, client, profile) {
        const fileService = client.instantiationService.get(IFileService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        const snippetsResource = joinPath((profile ?? userDataProfilesService.defaultProfile).snippetsHome, name);
        if (await fileService.exists(snippetsResource)) {
            const content = await fileService.readFile(snippetsResource);
            return content.value.toString();
        }
        return null;
    }
    function assertPreviews(actual, expected) {
        assert.deepStrictEqual(actual.map(({ previewResource }) => previewResource.toString()), expected.map((uri) => uri.toString()));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9zbmlwcGV0c1N5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBR04seUJBQXlCLEVBQ3pCLGdCQUFnQixHQUdoQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXBGLE1BQU0sVUFBVSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7O0VBZ0JqQixDQUFBO0FBRUYsTUFBTSxVQUFVLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7RUFnQmpCLENBQUE7QUFFRixNQUFNLFlBQVksR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUF1Qm5CLENBQUE7QUFFRixNQUFNLFlBQVksR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUF1Qm5CLENBQUE7QUFFRixNQUFNLFlBQVksR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUF1Qm5CLENBQUE7QUFF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