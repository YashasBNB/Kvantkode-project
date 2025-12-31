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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBVyxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEVB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