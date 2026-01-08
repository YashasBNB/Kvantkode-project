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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwU2VydmVyQ29ubmVjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFFTixjQUFjLEVBQ2QsUUFBUSxFQUNSLFVBQVUsR0FDVixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixrQkFBa0IsR0FDbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxP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