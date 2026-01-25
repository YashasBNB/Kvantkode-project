/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, NullLogger } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistry } from '../../common/mcpRegistry.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
class TestConfigurationResolverService {
    constructor() {
        this.interactiveCounter = 0;
        // Used to simulate stored/resolved variables
        this.resolvedVariables = new Map();
        // Add some test variables
        this.resolvedVariables.set('workspaceFolder', '/test/workspace');
        this.resolvedVariables.set('fileBasename', 'test.txt');
    }
    resolveAsync(folder, value) {
        const parsed = ConfigurationResolverExpression.parse(value);
        for (const variable of parsed.unresolved()) {
            const resolved = this.resolvedVariables.get(variable.inner);
            if (resolved) {
                parsed.resolve(variable, resolved);
            }
        }
        return Promise.resolve(parsed.toObject());
    }
    resolveWithInteraction(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        // For testing, we simulate interaction by returning a map with some variables
        const result = new Map();
        result.set('input:testInteractive', `interactiveValue${this.interactiveCounter++}`);
        result.set('command:testCommand', `commandOutput${this.interactiveCounter++}}`);
        // If variables are provided, include those too
        for (const [k, v] of result.entries()) {
            parsed.resolve({ id: '${' + k + '}' }, v);
        }
        return Promise.resolve(result);
    }
}
class TestMcpHostDelegate {
    constructor() {
        this.priority = 0;
    }
    canStart() {
        return true;
    }
    start() {
        return new TestMcpMessageTransport();
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
class TestDialogService {
    constructor() {
        this._promptSpy = sinon.stub();
        this._promptSpy.callsFake(() => {
            return Promise.resolve({ result: this._promptResult });
        });
    }
    setPromptResult(result) {
        this._promptResult = result;
    }
    get promptSpy() {
        return this._promptSpy;
    }
    prompt(options) {
        return this._promptSpy(options);
    }
}
suite('Workbench - MCP - Registry', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    let testStorageService;
    let testConfigResolverService;
    let testDialogService;
    let testCollection;
    let baseDefinition;
    let logger;
    setup(() => {
        testConfigResolverService = new TestConfigurationResolverService();
        testStorageService = store.add(new TestStorageService());
        testDialogService = new TestDialogService();
        const services = new ServiceCollection([IConfigurationResolverService, testConfigResolverService], [IStorageService, testStorageService], [ISecretStorageService, new TestSecretStorageService()], [ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IDialogService, testDialogService], [IProductService, {}]);
        logger = new NullLogger();
        const instaService = store.add(new TestInstantiationService(services));
        registry = store.add(instaService.createInstance(McpRegistry));
        // Create test collection that can be reused
        testCollection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            isTrustedByDefault: true,
            scope: -1 /* StorageScope.APPLICATION */,
        };
        // Create base definition that can be reused
        baseDefinition = {
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
    test('registerCollection adds collection to registry', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        assert.strictEqual(registry.collections.get()[0], testCollection);
        disposable.dispose();
        assert.strictEqual(registry.collections.get().length, 0);
    });
    test('registerDelegate adds delegate to registry', () => {
        const delegate = new TestMcpHostDelegate();
        const disposable = registry.registerDelegate(delegate);
        store.add(disposable);
        assert.strictEqual(registry.delegates.length, 1);
        assert.strictEqual(registry.delegates[0], delegate);
        disposable.dispose();
        assert.strictEqual(registry.delegates.length, 0);
    });
    test('resolveConnection creates connection with resolved variables and memorizes them until cleared', async () => {
        const definition = {
            ...baseDefinition,
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: '${workspaceFolder}/cmd',
                args: ['--file', '${fileBasename}'],
                env: {
                    PATH: '${input:testInteractive}',
                },
                envFile: undefined,
                cwd: URI.parse('file:///test'),
            },
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            },
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(testCollection));
        const connection = (await registry.resolveConnection({
            collectionRef: testCollection,
            definitionRef: definition,
            logger,
        }));
        assert.ok(connection);
        assert.strictEqual(connection.definition, definition);
        assert.strictEqual(connection.launchDefinition.command, '/test/workspace/cmd');
        assert.strictEqual(connection.launchDefinition.env.PATH, 'interactiveValue0');
        connection.dispose();
        const connection2 = (await registry.resolveConnection({
            collectionRef: testCollection,
            definitionRef: definition,
            logger,
        }));
        assert.ok(connection2);
        assert.strictEqual(connection2.launchDefinition.env.PATH, 'interactiveValue0');
        connection2.dispose();
        registry.clearSavedInputs(1 /* StorageScope.WORKSPACE */);
        const connection3 = (await registry.resolveConnection({
            collectionRef: testCollection,
            definitionRef: definition,
            logger,
        }));
        assert.ok(connection3);
        assert.strictEqual(connection3.launchDefinition.env.PATH, 'interactiveValue4');
        connection3.dispose();
    });
    suite('Trust Management', () => {
        setup(() => {
            const delegate = new TestMcpHostDelegate();
            store.add(registry.registerDelegate(delegate));
        });
        test('resolveConnection connects to server when trusted by default', async () => {
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(testCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            const connection = await registry.resolveConnection({
                collectionRef: testCollection,
                definitionRef: definition,
                logger,
            });
            assert.ok(connection);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection?.dispose();
        });
        test('resolveConnection prompts for confirmation when not trusted by default', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false,
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(true);
            const connection = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.ok(connection);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            connection?.dispose();
            testDialogService.promptSpy.resetHistory();
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.ok(connection2);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection2?.dispose();
        });
        test('resolveConnection returns undefined when user does not trust the server', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false,
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(false);
            const connection = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.strictEqual(connection, undefined);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            testDialogService.promptSpy.resetHistory();
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.strictEqual(connection2, undefined);
            assert.strictEqual(testDialogService.promptSpy.called, false);
        });
        test('resolveConnection honors forceTrust parameter', async () => {
            const untrustedCollection = {
                ...testCollection,
                isTrustedByDefault: false,
            };
            const definition = { ...baseDefinition };
            store.add(registry.registerCollection(untrustedCollection));
            testCollection.serverDefinitions.set([definition], undefined);
            testDialogService.setPromptResult(false);
            const connection1 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.strictEqual(connection1, undefined);
            testDialogService.promptSpy.resetHistory();
            testDialogService.setPromptResult(true);
            const connection2 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
                forceTrust: true,
            });
            assert.ok(connection2);
            assert.strictEqual(testDialogService.promptSpy.called, true);
            connection2?.dispose();
            testDialogService.promptSpy.resetHistory();
            const connection3 = await registry.resolveConnection({
                logger,
                collectionRef: untrustedCollection,
                definitionRef: definition,
            });
            assert.ok(connection3);
            assert.strictEqual(testDialogService.promptSpy.called, false);
            connection3?.dispose();
        });
    });
    suite('Lazy Collections', () => {
        let lazyCollection;
        let normalCollection;
        let removedCalled;
        setup(() => {
            removedCalled = false;
            lazyCollection = {
                ...testCollection,
                id: 'lazy-collection',
                lazy: {
                    isCached: false,
                    load: () => Promise.resolve(),
                    removed: () => {
                        removedCalled = true;
                    },
                },
            };
            normalCollection = {
                ...testCollection,
                id: 'lazy-collection',
                serverDefinitions: observableValue('serverDefs', [baseDefinition]),
            };
        });
        test('registers lazy collection', () => {
            const disposable = registry.registerCollection(lazyCollection);
            store.add(disposable);
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.collections.get()[0], lazyCollection);
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
        });
        test('lazy collection is replaced by normal collection', () => {
            store.add(registry.registerCollection(lazyCollection));
            store.add(registry.registerCollection(normalCollection));
            const collections = registry.collections.get();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0], normalCollection);
            assert.strictEqual(collections[0].lazy, undefined);
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
        });
        test('lazyCollectionState updates correctly during loading', async () => {
            lazyCollection = {
                ...lazyCollection,
                lazy: {
                    ...lazyCollection.lazy,
                    load: async () => {
                        await timeout(0);
                        store.add(registry.registerCollection(normalCollection));
                        return Promise.resolve();
                    },
                },
            };
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
            const loadingPromise = registry.discoverCollections();
            assert.strictEqual(registry.lazyCollectionState.get(), 1 /* LazyCollectionState.LoadingUnknown */);
            await loadingPromise;
            // The collection wasn't replaced, so it should be removed
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
            assert.strictEqual(removedCalled, false);
        });
        test('removed callback is called when lazy collection is not replaced', async () => {
            store.add(registry.registerCollection(lazyCollection));
            await registry.discoverCollections();
            assert.strictEqual(removedCalled, true);
        });
        test('cached lazy collections are tracked correctly', () => {
            lazyCollection.lazy.isCached = true;
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get(), 2 /* LazyCollectionState.AllKnown */);
            // Adding an uncached lazy collection changes the state
            const uncachedLazy = {
                ...lazyCollection,
                id: 'uncached-lazy',
                lazy: {
                    ...lazyCollection.lazy,
                    isCached: false,
                },
            };
            store.add(registry.registerCollection(uncachedLazy));
            assert.strictEqual(registry.lazyCollectionState.get(), 0 /* LazyCollectionState.HasUnknown */);
        });
    });
    suite('Collection Tool Prefixes', () => {
        test('assigns unique prefixes to collections', () => {
            const collection1 = {
                id: 'collection1',
                label: 'Collection 1',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            };
            const collection2 = {
                id: 'collection2',
                label: 'Collection 2',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            };
            store.add(registry.registerCollection(collection1));
            store.add(registry.registerCollection(collection2));
            const prefix1 = registry.collectionToolPrefix(collection1).get();
            const prefix2 = registry.collectionToolPrefix(collection2).get();
            assert.notStrictEqual(prefix1, prefix2);
            assert.ok(/^[a-f0-9]{3}\.$/.test(prefix1));
            assert.ok(/^[a-f0-9]{3}\.$/.test(prefix2));
        });
        test('handles hash collisions by incrementing view', () => {
            // These strings are known to have SHA1 hash collisions in their first 3 characters
            const collection1 = {
                id: 'potato',
                label: 'Collection 1',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            };
            const collection2 = {
                id: 'candidate_83048',
                label: 'Collection 2',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            };
            store.add(registry.registerCollection(collection1));
            store.add(registry.registerCollection(collection2));
            const prefix1 = registry.collectionToolPrefix(collection1).get();
            const prefix2 = registry.collectionToolPrefix(collection2).get();
            assert.notStrictEqual(prefix1, prefix2);
            assert.ok(/^[a-f0-9]{3}\.$/.test(prefix1));
            assert.ok(/^[a-f0-9]{3}\.$/.test(prefix2));
        });
        test('prefix changes when collections change', () => {
            const collection1 = {
                id: 'collection1',
                label: 'Collection 1',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            };
            const disposable = registry.registerCollection(collection1);
            store.add(disposable);
            const prefix1 = registry.collectionToolPrefix(collection1).get();
            assert.ok(!!prefix1);
            disposable.dispose();
            const prefix2 = registry.collectionToolPrefix(collection1).get();
            assert.strictEqual(prefix2, '');
        });
        test('prefix is empty for unknown collections', () => {
            const unknownCollection = {
                id: 'unknown',
                label: 'Unknown',
            };
            const prefix = registry.collectionToolPrefix(unknownCollection).get();
            assert.strictEqual(prefix, '');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBdUIsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFXLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFB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