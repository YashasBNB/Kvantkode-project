/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../base/common/async.js';
import { newWriteableBufferStream } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { isWeb } from '../../../../base/common/platform.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { IUserDataSyncStoreService, UserDataSyncStoreError, } from '../../common/userDataSync.js';
import { RequestsSession, UserDataSyncStoreService } from '../../common/userDataSyncStoreService.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataSyncStoreService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test read manifest for the first time', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        const productService = client.instantiationService.get(IProductService);
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Client-Name'], `${productService.applicationName}${isWeb ? '-web' : ''}`);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Client-Version'], productService.version);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test read manifest for the second time when session is not yet created', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test session id header is not set in the first manifest request after session is created', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test session id header is set from the second manifest request after session is created', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test headers are send for write request', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        await testObject.manifest(null);
        target.reset();
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test headers are send for read request', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        await testObject.manifest(null);
        target.reset();
        await testObject.readResource("settings" /* SyncResource.Settings */, null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test headers are reset after session is cleared ', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        await testObject.manifest(null);
        await testObject.clear();
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test old headers are sent after session is changed on server ', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        const userSessionId = target.requestsWithAllHeaders[0].headers['X-User-Session-Id'];
        await target.clear();
        // client 2
        const client2 = disposableStore.add(new UserDataSyncClient(target));
        await client2.setUp();
        const testObject2 = client2.instantiationService.get(IUserDataSyncStoreService);
        await testObject2.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], userSessionId);
    });
    test('test old headers are reset from second request after session is changed on server ', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        const userSessionId = target.requestsWithAllHeaders[0].headers['X-User-Session-Id'];
        await target.clear();
        // client 2
        const client2 = disposableStore.add(new UserDataSyncClient(target));
        await client2.setUp();
        const testObject2 = client2.instantiationService.get(IUserDataSyncStoreService);
        await testObject2.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], userSessionId);
    });
    test('test old headers are sent after session is cleared from another server ', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        const userSessionId = target.requestsWithAllHeaders[0].headers['X-User-Session-Id'];
        // client 2
        const client2 = disposableStore.add(new UserDataSyncClient(target));
        await client2.setUp();
        const testObject2 = client2.instantiationService.get(IUserDataSyncStoreService);
        await testObject2.clear();
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], userSessionId);
    });
    test('test headers are reset after session is cleared from another server ', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        // client 2
        const client2 = disposableStore.add(new UserDataSyncClient(target));
        await client2.setUp();
        const testObject2 = client2.instantiationService.get(IUserDataSyncStoreService);
        await testObject2.clear();
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.strictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test headers are reset after session is cleared from another server - started syncing again', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        const machineSessionId = target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'];
        const userSessionId = target.requestsWithAllHeaders[0].headers['X-User-Session-Id'];
        // client 2
        const client2 = disposableStore.add(new UserDataSyncClient(target));
        await client2.setUp();
        const testObject2 = client2.instantiationService.get(IUserDataSyncStoreService);
        await testObject2.clear();
        await testObject.manifest(null);
        await testObject.writeResource("settings" /* SyncResource.Settings */, 'some content', null);
        await testObject.manifest(null);
        target.reset();
        await testObject.manifest(null);
        assert.strictEqual(target.requestsWithAllHeaders.length, 1);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], undefined);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-Machine-Session-Id'], machineSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], userSessionId);
        assert.notStrictEqual(target.requestsWithAllHeaders[0].headers['X-User-Session-Id'], undefined);
    });
    test('test rate limit on server with retry after', async () => {
        const target = new UserDataSyncTestServer(1, 1);
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        const promise = Event.toPromise(testObject.onDidChangeDonotMakeRequestsUntil);
        try {
            await testObject.manifest(null);
            assert.fail('should fail');
        }
        catch (e) {
            assert.ok(e instanceof UserDataSyncStoreError);
            assert.deepStrictEqual(e.code, "TooManyRequestsAndRetryAfter" /* UserDataSyncErrorCode.TooManyRequestsAndRetryAfter */);
            await promise;
            assert.ok(!!testObject.donotMakeRequestsUntil);
        }
    });
    test('test donotMakeRequestsUntil is reset after retry time is finished', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const client = disposableStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 0.25)));
            await client.setUp();
            const testObject = client.instantiationService.get(IUserDataSyncStoreService);
            await testObject.manifest(null);
            try {
                await testObject.manifest(null);
                assert.fail('should fail');
            }
            catch (e) { }
            const promise = Event.toPromise(testObject.onDidChangeDonotMakeRequestsUntil);
            await timeout(300);
            await promise;
            assert.ok(!testObject.donotMakeRequestsUntil);
        });
    });
    test('test donotMakeRequestsUntil is retrieved', async () => {
        const client = disposableStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 1)));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        await testObject.manifest(null);
        try {
            await testObject.manifest(null);
        }
        catch (e) { }
        const target = disposableStore.add(client.instantiationService.createInstance(UserDataSyncStoreService));
        assert.strictEqual(target.donotMakeRequestsUntil?.getTime(), testObject.donotMakeRequestsUntil?.getTime());
    });
    test('test donotMakeRequestsUntil is checked and reset after retreived', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const client = disposableStore.add(new UserDataSyncClient(new UserDataSyncTestServer(1, 0.25)));
            await client.setUp();
            const testObject = client.instantiationService.get(IUserDataSyncStoreService);
            await testObject.manifest(null);
            try {
                await testObject.manifest(null);
                assert.fail('should fail');
            }
            catch (e) { }
            await timeout(300);
            const target = disposableStore.add(client.instantiationService.createInstance(UserDataSyncStoreService));
            assert.ok(!target.donotMakeRequestsUntil);
        });
    });
    test('test read resource request handles 304', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await client.sync();
        const testObject = client.instantiationService.get(IUserDataSyncStoreService);
        const expected = await testObject.readResource("settings" /* SyncResource.Settings */, null);
        const actual = await testObject.readResource("settings" /* SyncResource.Settings */, expected);
        assert.strictEqual(actual, expected);
    });
});
suite('UserDataSyncRequestsSession', () => {
    const requestService = {
        _serviceBrand: undefined,
        async request() {
            return { res: { headers: {} }, stream: newWriteableBufferStream() };
        },
        async resolveProxy() {
            return undefined;
        },
        async lookupAuthorization() {
            return undefined;
        },
        async lookupKerberosAuthorization() {
            return undefined;
        },
        async loadCertificates() {
            return [];
        },
    };
    ensureNoDisposablesAreLeakedInTestSuite();
    test('too many requests are thrown when limit exceeded', async () => {
        const testObject = new RequestsSession(1, 500, requestService, new NullLogService());
        await testObject.request('url', {}, CancellationToken.None);
        try {
            await testObject.request('url', {}, CancellationToken.None);
        }
        catch (error) {
            assert.ok(error instanceof UserDataSyncStoreError);
            assert.strictEqual(error.code, "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */);
            return;
        }
        assert.fail('Should fail with limit exceeded');
    });
    test('requests are handled after session is expired', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const testObject = new RequestsSession(1, 100, requestService, new NullLogService());
        await testObject.request('url', {}, CancellationToken.None);
        await timeout(125);
        await testObject.request('url', {}, CancellationToken.None);
    }));
    test('too many requests are thrown after session is expired', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const testObject = new RequestsSession(1, 100, requestService, new NullLogService());
        await testObject.request('url', {}, CancellationToken.None);
        await timeout(125);
        await testObject.request('url', {}, CancellationToken.None);
        try {
            await testObject.request('url', {}, CancellationToken.None);
        }
        catch (error) {
            assert.ok(error instanceof UserDataSyncStoreError);
            assert.strictEqual(error.code, "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */);
            return;
        }
        assert.fail('Should fail with limit exceeded');
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU3RvcmVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdXNlckRhdGFTeW5jU3RvcmVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFM0UsT0FBTyxFQUNOLHlCQUF5QixFQUd6QixzQkFBc0IsR0FDdEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsZUFBZSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEYsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0QyxNQUFNLGVBQWUsR0FBRyx1Q0FBdUMs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