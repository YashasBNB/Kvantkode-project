/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestLoggerService, TestProductService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { McpServerRequestHandler } from '../../common/mcpServerRequestHandler.js';
import { MCP } from '../../common/modelContextProtocol.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
class TestMcpHostDelegate extends Disposable {
    constructor() {
        super();
        this.priority = 0;
        this._transport = this._register(new TestMcpMessageTransport());
    }
    canStart() {
        return true;
    }
    start() {
        return this._transport;
    }
    getTransport() {
        return this._transport;
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
suite('Workbench - MCP - ServerRequestHandler', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let delegate;
    let transport;
    let handler;
    let cts;
    setup(async () => {
        delegate = store.add(new TestMcpHostDelegate());
        transport = delegate.getTransport();
        cts = store.add(new CancellationTokenSource());
        // Setup test services
        const services = new ServiceCollection([ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IStorageService, store.add(new TestStorageService())], [IProductService, TestProductService]);
        instantiationService = store.add(new TestInstantiationService(services));
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        // Manually create the handler since we need the transport already set up
        const logger = store.add(instantiationService.get(ILoggerService).createLogger('mcpServerTest', { hidden: true, name: 'MCP Test' }));
        // Start the handler creation
        const handlerPromise = McpServerRequestHandler.create(instantiationService, transport, logger, cts.token);
        // Simulate successful initialization
        // We need to respond to the initialize request that the handler will make
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 1, // The handler uses 1 for the first request
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                serverInfo: {
                    name: 'Test MCP Server',
                    version: '1.0.0',
                },
                capabilities: {
                    resources: {
                        supportedTypes: ['text/plain'],
                    },
                    tools: {
                        supportsCancellation: true,
                    },
                },
            },
        });
        handler = await handlerPromise;
        store.add(handler);
    });
    test('should send and receive JSON-RPC requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the sent message and verify it
        const sentMessages = transport.getSentMessages();
        assert.strictEqual(sentMessages.length, 3); // initialize + listResources
        // Verify listResources request format
        const listResourcesRequest = sentMessages[2];
        assert.strictEqual(listResourcesRequest.method, 'resources/list');
        assert.strictEqual(listResourcesRequest.jsonrpc, MCP.JSONRPC_VERSION);
        assert.ok(typeof listResourcesRequest.id === 'number');
        // Simulate server response with mock resources that match the expected Resource interface
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest.id,
            result: {
                resources: [
                    { uri: 'resource1', type: 'text/plain', name: 'Test Resource 1' },
                    { uri: 'resource2', type: 'text/plain', name: 'Test Resource 2' },
                ],
            },
        });
        // Verify the result
        const resources = await requestPromise;
        assert.strictEqual(resources.length, 2);
        assert.strictEqual(resources[0].uri, 'resource1');
        assert.strictEqual(resources[1].name, 'Test Resource 2');
    });
    test('should handle paginated requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the first request and respond with pagination
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        // Send first page with nextCursor
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest.id,
            result: {
                resources: [{ uri: 'resource1', type: 'text/plain', name: 'Test Resource 1' }],
                nextCursor: 'page2',
            },
        });
        // Clear the sent messages to only capture the next page request
        transport.clearSentMessages();
        // Wait a bit to allow the handler to process and send the next request
        await new Promise((resolve) => setTimeout(resolve, 0));
        // Get the second request and verify cursor is included
        const sentMessages2 = transport.getSentMessages();
        assert.strictEqual(sentMessages2.length, 1);
        const listResourcesRequest2 = sentMessages2[0];
        assert.strictEqual(listResourcesRequest2.method, 'resources/list');
        assert.deepStrictEqual(listResourcesRequest2.params, { cursor: 'page2' });
        // Send final page with no nextCursor
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: listResourcesRequest2.id,
            result: {
                resources: [{ uri: 'resource2', type: 'text/plain', name: 'Test Resource 2' }],
            },
        });
        // Verify the combined result
        const resources = await requestPromise;
        assert.strictEqual(resources.length, 2);
        assert.strictEqual(resources[0].uri, 'resource1');
        assert.strictEqual(resources[1].uri, 'resource2');
    });
    test('should handle error responses', async () => {
        // Setup request
        const requestPromise = handler.readResource({ uri: 'non-existent' });
        // Get the sent message
        const sentMessages = transport.getSentMessages();
        const readResourceRequest = sentMessages[2]; // [0] is initialize
        // Simulate error response
        transport.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: readResourceRequest.id,
            error: {
                code: MCP.METHOD_NOT_FOUND,
                message: 'Resource not found',
            },
        });
        // Verify the error is thrown correctly
        try {
            await requestPromise;
            assert.fail('Expected error was not thrown');
        }
        catch (e) {
            assert.strictEqual(e.message, 'MPC -32601: Resource not found');
            assert.strictEqual(e.code, MCP.METHOD_NOT_FOUND);
        }
    });
    test('should handle server requests', async () => {
        // Simulate ping request from server
        const pingRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 100,
            method: 'ping',
        };
        transport.simulateReceiveMessage(pingRequest);
        // The handler should have sent a response
        const sentMessages = transport.getSentMessages();
        const pingResponse = sentMessages.find((m) => 'id' in m && m.id === pingRequest.id && 'result' in m);
        assert.ok(pingResponse, 'No ping response was sent');
        assert.deepStrictEqual(pingResponse.result, {});
    });
    test('should handle roots list requests', async () => {
        // Set roots
        handler.roots = [
            { uri: 'file:///test/root1', name: 'Root 1' },
            { uri: 'file:///test/root2', name: 'Root 2' },
        ];
        // Simulate roots/list request from server
        const rootsRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 101,
            method: 'roots/list',
        };
        transport.simulateReceiveMessage(rootsRequest);
        // The handler should have sent a response
        const sentMessages = transport.getSentMessages();
        const rootsResponse = sentMessages.find((m) => 'id' in m && m.id === rootsRequest.id && 'result' in m);
        assert.ok(rootsResponse, 'No roots/list response was sent');
        assert.strictEqual(rootsResponse.result.roots.length, 2);
        assert.strictEqual(rootsResponse.result.roots[0].uri, 'file:///test/root1');
    });
    test('should handle server notifications', async () => {
        let progressNotificationReceived = false;
        store.add(handler.onDidReceiveProgressNotification((notification) => {
            progressNotificationReceived = true;
            assert.strictEqual(notification.method, 'notifications/progress');
            assert.strictEqual(notification.params.progressToken, 'token1');
            assert.strictEqual(notification.params.progress, 50);
        }));
        // Simulate progress notification with correct format
        const progressNotification = {
            jsonrpc: MCP.JSONRPC_VERSION,
            method: 'notifications/progress',
            params: {
                progressToken: 'token1',
                progress: 50,
                total: 100,
            },
        };
        transport.simulateReceiveMessage(progressNotification);
        assert.strictEqual(progressNotificationReceived, true);
    });
    test('should handle cancellation', async () => {
        // Setup a new cancellation token source for this specific test
        const testCts = store.add(new CancellationTokenSource());
        const requestPromise = handler.listResources(undefined, testCts.token);
        // Get the request ID
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        const requestId = listResourcesRequest.id;
        // Cancel the request
        testCts.cancel();
        // Check that a cancellation notification was sent
        const cancelNotification = transport
            .getSentMessages()
            .find((m) => !('id' in m) &&
            'method' in m &&
            m.method === 'notifications/cancelled' &&
            'params' in m &&
            m.params &&
            m.params.requestId === requestId);
        assert.ok(cancelNotification, 'No cancellation notification was sent');
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should handle cancelled notification from server', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Get the request ID
        const sentMessages = transport.getSentMessages();
        const listResourcesRequest = sentMessages[2];
        const requestId = listResourcesRequest.id;
        // Simulate cancelled notification from server
        const cancelledNotification = {
            jsonrpc: MCP.JSONRPC_VERSION,
            method: 'notifications/cancelled',
            params: {
                requestId,
            },
        };
        transport.simulateReceiveMessage(cancelledNotification);
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should dispose properly and cancel pending requests', async () => {
        // Setup multiple requests
        const request1 = handler.listResources();
        const request2 = handler.listTools();
        // Dispose the handler
        handler.dispose();
        // Verify all promises were cancelled
        try {
            await request1;
            assert.fail('Promise 1 should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
        try {
            await request2;
            assert.fail('Promise 2 should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
    test('should handle connection error by cancelling requests', async () => {
        // Setup request
        const requestPromise = handler.listResources();
        // Simulate connection error
        transport.setConnectionState({
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Connection lost',
        });
        // Verify the promise was cancelled
        try {
            await requestPromise;
            assert.fail('Promise should have been cancelled');
        }
        catch (e) {
            assert.strictEqual(e.name, 'Canceled');
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BTZXJ2ZXJSZXF1ZXN0SGFuZGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixrQkFBa0IsR0FDbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFB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