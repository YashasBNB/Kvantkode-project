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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFNlcnZlclJlcXVlc3RIYW5kbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsa0JBQWtCLEVBQ2xCLGtCQUFrQixHQUNsQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFB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