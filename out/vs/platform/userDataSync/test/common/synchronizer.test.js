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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY2hyb25pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vc3luY2hyb25pemVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLG9DQUFvQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixvQkFBb0IsR0FLcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBTU4seUJBQXlCLEVBSXpCLHFCQUFxQixHQUNyQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBTXBGLE1BQU0sZ0JBQWlCLFNBQVEsb0JBQW9CO0lBQW5EOztRQUNDLGdCQUFXLEdBQVksSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUNwQyxl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