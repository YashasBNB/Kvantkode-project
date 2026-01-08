/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { ILogService } from '../../../log/common/log.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { getTasksContentFromSyncContent } from '../../common/tasksSync.js';
import { IUserDataSyncStoreService, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('TasksSync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    let testObject;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp(true);
        testObject = client.getSynchronizer("tasks" /* SyncResource.Tasks */);
    });
    test('when tasks file does not exist', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
            let manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, [
                {
                    type: 'GET',
                    url: `${server.url}/v1/resource/${testObject.resource}/latest`,
                    headers: {},
                },
            ]);
            assert.ok(!(await fileService.exists(tasksResource)));
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
            assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
            assert.strictEqual(lastSyncUserData.syncData, null);
            manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
            manifest = await client.getResourceManifest();
            server.reset();
            await testObject.sync(manifest);
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('when tasks file does not exist and remote has changes', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.instantiationService
                .get(IFileService)
                .writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file exists locally and remote has no tasks', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('first time sync: when tasks file exists locally with same content as remote', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.instantiationService
                .get(IFileService)
                .writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file locally has moved forward', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('when tasks file remotely has moved forward', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely with same changes', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept preview', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                    },
                ],
            })));
            await client2.sync();
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            const previewContent = (await fileService.readFile(testObject.conflicts.conflicts[0].previewResource)).value.toString();
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assert.deepStrictEqual(testObject.conflicts.conflicts.length, 1);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].mergeState, "conflict" /* MergeState.Conflict */);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].localChange, 2 /* Change.Modified */);
            assert.deepStrictEqual(testObject.conflicts.conflicts[0].remoteChange, 2 /* Change.Modified */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), previewContent);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), previewContent);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), previewContent);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept modified preview', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                    },
                ],
            })));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            })));
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch 2',
                    },
                ],
            });
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, content);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept remote', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                    },
                ],
            });
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(content));
            await client2.sync();
            fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            })));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file has moved forward locally and remotely - accept local', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            await fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            fileService2.writeFile(tasksResource2, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                    },
                ],
            })));
            await client2.sync();
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            fileService.writeFile(tasksResource, VSBuffer.fromString(content));
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), content);
            assert.strictEqual((await fileService.readFile(tasksResource)).value.toString(), content);
        });
    });
    test('when tasks file was removed in one client', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await fileService.writeFile(tasksResource, VSBuffer.fromString(JSON.stringify({
                version: '2.0.0',
                tasks: [],
            })));
            await testObject.sync(await client.getResourceManifest());
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            await client2.sync();
            const tasksResource2 = client2.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            const fileService2 = client2.instantiationService.get(IFileService);
            fileService2.del(tasksResource2);
            await client2.sync();
            await testObject.sync(await client.getResourceManifest());
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const lastSyncUserData = await testObject.getLastSyncUserData();
            const remoteUserData = await testObject.getRemoteUserData(null);
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), null);
            assert.strictEqual(getTasksContentFromSyncContent(remoteUserData.syncData.content, client.instantiationService.get(ILogService)), null);
            assert.strictEqual(await fileService.exists(tasksResource), false);
        });
    });
    test('when tasks file is created after first sync', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            await testObject.sync(await client.getResourceManifest());
            const content = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            await fileService.createFile(tasksResource, VSBuffer.fromString(content));
            let lastSyncUserData = await testObject.getLastSyncUserData();
            const manifest = await client.getResourceManifest();
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
            assert.strictEqual(getTasksContentFromSyncContent(lastSyncUserData.syncData.content, client.instantiationService.get(ILogService)), content);
        });
    });
    test('apply remote when tasks file does not exist', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const tasksResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.tasksResource;
            if (await fileService.exists(tasksResource)) {
                await fileService.del(tasksResource);
            }
            const preview = (await testObject.sync(await client.getResourceManifest(), true));
            server.reset();
            const content = await testObject.resolveContent(preview.resourcePreviews[0].remoteResource);
            await testObject.accept(preview.resourcePreviews[0].remoteResource, content);
            await testObject.apply(false);
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('sync profile tasks', async () => {
        await runWithFakedTimers({}, async () => {
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp(true);
            const profile = await client2.instantiationService
                .get(IUserDataProfilesService)
                .createNamedProfile('profile1');
            const expected = JSON.stringify({
                version: '2.0.0',
                tasks: [
                    {
                        type: 'npm',
                        script: 'watch',
                        label: 'Watch',
                    },
                ],
            });
            await client2.instantiationService
                .get(IFileService)
                .createFile(profile.tasksResource, VSBuffer.fromString(expected));
            await client2.sync();
            await client.sync();
            const syncedProfile = client.instantiationService
                .get(IUserDataProfilesService)
                .profiles.find((p) => p.id === profile.id);
            const actual = (await client.instantiationService.get(IFileService).readFile(syncedProfile.tasksResource)).value.toString();
            assert.strictEqual(actual, expected);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi90YXNrc1N5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLDhCQUE4QixFQUFxQixNQUFNLDJCQUEyQixDQUFBO0FBQzdGLE9BQU8sRUFFTix5QkFBeUIsR0FJekIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVwRixLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUE7SUFDM0MsSUFBSSxNQUEwQixDQUFBO0lBRTlCLElBQUksVUFBNkIsQ0FBQTtJQUVqQyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsTUFBTSxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDekUsQ0FBQyxDQUFD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