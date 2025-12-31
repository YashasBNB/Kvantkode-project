/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, LogLevel, NullLogger, } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestProductService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { McpServerConnection } from '../../common/mcpServerConnection.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
class TestMcpHostDelegate extends Disposable {
    constructor() {
        super();
        this._canStartValue = true;
        this.priority = 0;
        this._transport = this._register(new TestMcpMessageTransport());
    }
    canStart() {
        return this._canStartValue;
    }
    start() {
        if (!this._canStartValue) {
            throw new Error('Cannot start server');
        }
        return this._transport;
    }
    getTransport() {
        return this._transport;
    }
    setCanStart(value) {
        this._canStartValue = value;
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
suite('Workbench - MCP - ServerConnection', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let delegate;
    let transport;
    let collection;
    let serverDefinition;
    setup(() => {
        delegate = store.add(new TestMcpHostDelegate());
        transport = delegate.getTransport();
        // Setup test services
        const services = new ServiceCollection([ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IStorageService, store.add(new TestStorageService())], [IProductService, TestProductService]);
        instantiationService = store.add(new TestInstantiationService(services));
        // Create test collection
        collection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            isTrustedByDefault: true,
            scope: -1 /* StorageScope.APPLICATION */,
        };
        // Create server definition
        serverDefinition = {
            id: 'test-server',
            label: 'Test Server',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: URI.parse('file:///test'),
            },
        };
    });
    function waitForHandler(cnx) {
        const handler = cnx.handler.get();
        if (handler) {
            return Promise.resolve(handler);
        }
        return new Promise((resolve) => {
            const disposable = autorun((reader) => {
                const handler = cnx.handler.read(reader);
                if (handler) {
                    disposable.dispose();
                    resolve(handler);
                }
            });
        });
    }
    test('should start and set state to Running when transport succeeds', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state = await startPromise;
        assert.strictEqual(state.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
    });
    test('should handle errors during start', async () => {
        // Setup delegate to fail on start
        delegate.setCanStart(false);
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const state = await connection.start();
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.ok(state.message);
    });
    test('should handle transport errors', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate error in transport
        transport.setConnectionState({
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Test error message',
        });
        const state = await startPromise;
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.strictEqual(state.message, 'Test error message');
    });
    test('should stop and set state to Stopped', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Stop the connection
        const stopPromise = connection.stop();
        await stopPromise;
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should not restart if already starting', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise1 = connection.start();
        // Try to start again while starting
        const startPromise2 = connection.start();
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state1 = await startPromise1;
        const state2 = await startPromise2;
        // Both promises should resolve to the same state
        assert.strictEqual(state1.state, 2 /* McpConnectionState.Kind.Running */);
        assert.strictEqual(state2.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
        connection.dispose();
    });
    test('should clean up when disposed', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        // Start the connection
        const startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Dispose the connection
        connection.dispose();
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should log transport messages', async () => {
        // Track logged messages
        const loggedMessages = [];
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, {
            getLevel: () => LogLevel.Debug,
            info: (message) => {
                loggedMessages.push(message);
            },
            error: () => { },
            dispose: () => { },
        });
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Simulate log message from transport
        transport.simulateLog('Test log message');
        // Set connection to running
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Check that the message was logged
        assert.ok(loggedMessages.some((msg) => msg === 'Test log message'));
        connection.dispose();
        await timeout(10);
    });
    test('should correctly handle transitions to and from error state', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // Start the connection
        const startPromise = connection.start();
        // Transition to error state
        const errorState = {
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Temporary error',
        };
        transport.setConnectionState(errorState);
        let state = await startPromise;
        assert.equal(state, errorState);
        transport.setConnectionState({ state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Transition back to running state
        const startPromise2 = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        state = await startPromise2;
        assert.deepStrictEqual(state, { state: 2 /* McpConnectionState.Kind.Running */ });
        connection.dispose();
        await timeout(10);
    });
    test('should handle multiple start/stop cycles', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger());
        store.add(connection);
        // First cycle
        let startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Second cycle
        startPromise = connection.start();
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        assert.deepStrictEqual(connection.state.get(), { state: 2 /* McpConnectionState.Kind.Running */ });
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        connection.dispose();
        await timeout(10);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFNlcnZlckNvbm5lY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBRU4sY0FBYyxFQUNkLFFBQVEsRUFDUixVQUFVLEdBQ1YsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0sa0RBQWtELENBQUE7QUFFekQsT0FBTyxF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