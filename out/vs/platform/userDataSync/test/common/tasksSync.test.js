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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdGFza3NTeW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSw4QkFBOEIsRUFBcUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUM3RixPQUFPLEVBRU4seUJBQXlCLEdBSXpCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEYsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQzNDLElBQUksTUFBMEIsQ0FBQTtJQUU5QixJQUFJLFVBQTZCLENBQUE7SUFFakMsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0sTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3pFLENBQUMsQ0FBQyxDQUFB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