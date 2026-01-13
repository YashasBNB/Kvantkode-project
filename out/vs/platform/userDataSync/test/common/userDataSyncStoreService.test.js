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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU3RvcmVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi91c2VyRGF0YVN5bmNTdG9yZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLHNCQUFzQixHQUN0QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVwRixLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RD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