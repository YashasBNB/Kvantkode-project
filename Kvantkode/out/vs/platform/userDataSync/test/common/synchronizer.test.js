/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { AbstractSynchroniser, } from '../../common/abstractSynchronizer.js';
import { IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
class TestSynchroniser extends AbstractSynchroniser {
    constructor() {
        super(...arguments);
        this.syncBarrier = new Barrier();
        this.syncResult = {
            hasConflicts: false,
            hasError: false,
        };
        this.onDoSyncCall = this._register(new Emitter());
        this.failWhenGettingLatestRemoteUserData = false;
        this.version = 1;
        this.cancelled = false;
        this.localResource = joinPath(this.environmentService.userRoamingDataHome, 'testResource.json');
        this.onDidTriggerLocalChangeCall = this._register(new Emitter());
    }
    getMachineId() {
        return this.currentMachineIdPromise;
    }
    getLastSyncResource() {
        return this.lastSyncResource;
    }
    getLatestRemoteUserData(manifest, lastSyncUserData) {
        if (this.failWhenGettingLatestRemoteUserData) {
            throw new Error();
        }
        return super.getLatestRemoteUserData(manifest, lastSyncUserData);
    }
    async doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        this.cancelled = false;
        this.onDoSyncCall.fire();
        await this.syncBarrier.wait();
        if (this.cancelled) {
            return "idle" /* SyncStatus.Idle */;
        }
        return super.doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
    }
    async generateSyncPreview(remoteUserData) {
        if (this.syncResult.hasError) {
            throw new Error('failed');
        }
        let fileContent = null;
        try {
            fileContent = await this.fileService.readFile(this.localResource);
        }
        catch (error) { }
        return [
            {
                baseResource: this.localResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: null,
                localResource: this.localResource,
                localContent: fileContent ? fileContent.value.toString() : null,
                remoteResource: this.localResource.with({
                    scheme: USER_DATA_SYNC_SCHEME,
                    authority: 'remote',
                }),
                remoteContent: remoteUserData.syncData ? remoteUserData.syncData.content : null,
                previewResource: this.localResource.with({
                    scheme: USER_DATA_SYNC_SCHEME,
                    authority: 'preview',
                }),
                ref: remoteUserData.ref,
                localChange: 2 /* Change.Modified */,
                remoteChange: 2 /* Change.Modified */,
                acceptedResource: this.localResource.with({
                    scheme: USER_DATA_SYNC_SCHEME,
                    authority: 'accepted',
                }),
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        return true;
    }
    async getMergeResult(resourcePreview, token) {
        return {
            content: resourcePreview.ref,
            localChange: 2 /* Change.Modified */,
            remoteChange: 2 /* Change.Modified */,
            hasConflicts: this.syncResult.hasConflicts,
        };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        if (isEqual(resource, resourcePreview.localResource)) {
            return {
                content: resourcePreview.localContent,
                localChange: 0 /* Change.None */,
                remoteChange: resourcePreview.localContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
            };
        }
        if (isEqual(resource, resourcePreview.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
                localChange: resourcePreview.remoteContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        if (isEqual(resource, resourcePreview.previewResource)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.ref,
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
            else {
                return {
                    content,
                    localChange: content === null
                        ? resourcePreview.localContent !== null
                            ? 3 /* Change.Deleted */
                            : 0 /* Change.None */
                        : 2 /* Change.Modified */,
                    remoteChange: content === null
                        ? resourcePreview.remoteContent !== null
                            ? 3 /* Change.Deleted */
                            : 0 /* Change.None */
                        : 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        if (resourcePreviews[0][1].localChange === 3 /* Change.Deleted */) {
            await this.fileService.del(this.localResource);
        }
        if (resourcePreviews[0][1].localChange === 1 /* Change.Added */ ||
            resourcePreviews[0][1].localChange === 2 /* Change.Modified */) {
            await this.fileService.writeFile(this.localResource, VSBuffer.fromString(resourcePreviews[0][1].content));
        }
        if (resourcePreviews[0][1].remoteChange === 3 /* Change.Deleted */) {
            await this.applyRef(null, remoteUserData.ref);
        }
        if (resourcePreviews[0][1].remoteChange === 1 /* Change.Added */ ||
            resourcePreviews[0][1].remoteChange === 2 /* Change.Modified */) {
            await this.applyRef(resourcePreviews[0][1].content, remoteUserData.ref);
        }
    }
    async applyRef(content, ref) {
        const remoteUserData = await this.updateRemoteUserData(content === null ? '' : content, ref);
        await this.updateLastSyncUserData(remoteUserData);
    }
    async stop() {
        this.cancelled = true;
        this.syncBarrier.open();
        super.stop();
    }
    testTriggerLocalChange() {
        this.triggerLocalChange();
    }
    async doTriggerLocalChange() {
        await super.doTriggerLocalChange();
        this.onDidTriggerLocalChangeCall.fire();
    }
    hasLocalData() {
        throw new Error('not implemented');
    }
    async resolveContent(uri) {
        return null;
    }
}
suite('TestSynchronizer - Auto Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('status is syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus((status) => actual.push(status)));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getResourceManifest());
            await promise;
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */]);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            testObject.stop();
        });
    });
    test('status is set correctly when sync is finished', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus((status) => actual.push(status)));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
    test('status is set correctly when sync has errors', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasError: true, hasConflicts: false };
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus((status) => actual.push(status)));
            try {
                await testObject.sync(await client.getResourceManifest());
                assert.fail('Should fail');
            }
            catch (e) {
                assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
                assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            }
        });
    });
    test('status is set to hasConflicts when asked to sync if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertConflicts(testObject.conflicts.conflicts, [testObject.localResource]);
        });
    });
    test('sync should not run if syncing already', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getResourceManifest());
            await promise;
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus((status) => actual.push(status)));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            await testObject.stop();
        });
    });
    test('sync should not run if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus((status) => actual.push(status)));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        });
    });
    test('accept preview during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const fileService = client.instantiationService.get(IFileService);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, (await fileService.readFile(testObject.localResource)).value.toString());
        });
    });
    test('accept remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const fileService = client.instantiationService.get(IFileService);
            const currentRemoteContent = (await testObject.getRemoteUserData(null)).syncData?.content;
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, currentRemoteContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), currentRemoteContent);
        });
    });
    test('accept local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, newLocalContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), newLocalContent);
        });
    });
    test('accept new content during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            const mergeContent = 'newContent';
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, mergeContent);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, mergeContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), mergeContent);
        });
    });
    test('accept delete during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const fileService = client.instantiationService.get(IFileService);
            await fileService.del(testObject.localResource);
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            const fileService = client.instantiationService.get(IFileService);
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString('some content'));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData, null);
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('request latest data on precondition failure', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            // Sync once
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            testObject.syncBarrier = new Barrier();
            // update remote data before syncing so that 412 is thrown by server
            const disposable = testObject.onDoSyncCall.event(async () => {
                disposable.dispose();
                await testObject.applyRef(ref, ref);
                server.reset();
                testObject.syncBarrier.open();
            });
            // Start sycing
            const manifest = await client.getResourceManifest();
            const ref = manifest[testObject.resource];
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(server.requests, [
                {
                    type: 'POST',
                    url: `${server.url}/v1/resource/${testObject.resource}`,
                    headers: { 'If-Match': ref },
                },
                {
                    type: 'GET',
                    url: `${server.url}/v1/resource/${testObject.resource}/latest`,
                    headers: {},
                },
                {
                    type: 'POST',
                    url: `${server.url}/v1/resource/${testObject.resource}`,
                    headers: { 'If-Match': `${parseInt(ref) + 1}` },
                },
            ]);
        });
    });
    test('no requests are made to server when local change is triggered', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            server.reset();
            const promise = Event.toPromise(testObject.onDidTriggerLocalChangeCall.event);
            testObject.testTriggerLocalChange();
            await promise;
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('status is reset when getting latest remote data fails', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.failWhenGettingLatestRemoteUserData = true;
            try {
                await testObject.sync(await client.getResourceManifest());
                assert.fail('Should throw an error');
            }
            catch (error) { }
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
});
suite('TestSynchronizer - Manual Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getResourceManifest(), true);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> merge -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const manifest = await client.getResourceManifest();
            let preview = await testObject.sync(manifest, true);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            const expectedContent = manifest[testObject.resource];
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const manifest = await client.getResourceManifest();
            const expectedContent = manifest[testObject.resource];
            let preview = await testObject.sync(manifest, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getResourceManifest(), true);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "conflict" /* MergeState.Conflict */);
            assertConflicts(testObject.conflicts.conflicts, [preview.resourcePreviews[0].localResource]);
        });
    });
    test('conflicts: preview -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getResourceManifest(), true);
            await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept 2', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            testObject.syncResult = { hasConflicts: true, hasError: false };
            const manifest = await client.getResourceManifest();
            const expectedContent = manifest[testObject.resource];
            let preview = await testObject.sync(manifest, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getResourceManifest(), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('remote is accepted if last sync state does not exists in server', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp();
            const synchronizer2 = disposableStore.add(client2.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client2.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            synchronizer2.syncBarrier.open();
            const manifest = await client2.getResourceManifest();
            const expectedContent = manifest[testObject.resource];
            await synchronizer2.sync(manifest);
            await fileService.del(testObject.getLastSyncResource());
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
});
suite('TestSynchronizer - Last Sync Data', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('last sync data is null when not synced before', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is set after sync', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const machineId = await testObject.getMachineId();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(JSON.parse((await fileService.readFile(testObject.getLastSyncResource())).value.toString()), { ref: '1', syncData: { version: 1, machineId, content: '0' } });
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1,
                },
            });
        });
    });
    test('last sync data is read from server after sync if last sync resource is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const machineId = await testObject.getMachineId();
            await fileService.del(testObject.getLastSyncResource());
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1,
                },
            });
        });
    });
    test('last sync data is read from server after sync and sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1,
                }),
                additionalData: {
                    foo: 'bar',
                },
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1,
                },
            });
            assert.deepStrictEqual(server.requests, [
                { headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' },
            ]);
        });
    });
    test('last sync data is read from server after sync and stored sync data is tampered', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '2',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1,
                },
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1,
                },
            });
            assert.deepStrictEqual(server.requests, [
                { headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' },
            ]);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1,
                }),
                additionalData: {
                    foo: 'bar',
                },
            })));
            await testObject.getLastSyncUserData();
            server.reset();
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is null', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            server.reset();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                syncData: null,
            })));
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('last sync data is null after sync if last sync state is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            storageService.remove('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */);
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is null after sync if last sync content is deleted everywhere', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const userDataSyncStoreService = client.instantiationService.get(IUserDataSyncStoreService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, {
                syncResource: "settings" /* SyncResource.Settings */,
                profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile,
            }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getResourceManifest());
            await fileService.del(testObject.getLastSyncResource());
            await userDataSyncStoreService.deleteResource(testObject.syncResource.syncResource, null);
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.strictEqual(actual, null);
        });
    });
});
function assertConflicts(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map((uri) => uri.toString()));
}
function assertPreviews(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map((uri) => uri.toString()));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY2hyb25pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9zeW5jaHJvbml6ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUNOLG9CQUFvQixHQUtwQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFNTix5QkFBeUIsRUFJekIscUJBQXFCLEdBQ3JCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFNcEYsTUFBTSxnQkFBaUIsU0FBUSxvQkFBb0I7SUFBbkQ7O1FBQ0MsZ0JBQVcsR0FBWSxJQUFJ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