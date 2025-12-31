/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { TestExtensionService, TestHistoryService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { EnvironmentVariableService } from '../../common/environmentVariableService.js';
import { EnvironmentVariableMutatorType, } from '../../../../../platform/terminal/common/environmentVariable.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class TestEnvironmentVariableService extends EnvironmentVariableService {
    persistCollections() {
        this._persistCollections();
    }
    notifyCollectionUpdates() {
        this._notifyCollectionUpdates();
    }
}
suite('EnvironmentVariable - EnvironmentVariableService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let environmentVariableService;
    let changeExtensionsEvent;
    setup(() => {
        changeExtensionsEvent = store.add(new Emitter());
        instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(IExtensionService, TestExtensionService);
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(IHistoryService, new TestHistoryService());
        instantiationService.stub(IExtensionService, TestExtensionService);
        instantiationService.stub(IExtensionService, 'onDidChangeExtensions', changeExtensionsEvent.event);
        instantiationService.stub(IExtensionService, 'extensions', [
            { identifier: { value: 'ext1' } },
            { identifier: { value: 'ext2' } },
            { identifier: { value: 'ext3' } },
        ]);
        environmentVariableService = store.add(instantiationService.createInstance(TestEnvironmentVariableService));
    });
    test('should persist collections to the storage service and be able to restore from them', () => {
        const collection = new Map();
        collection.set('A-key', {
            value: 'a',
            type: EnvironmentVariableMutatorType.Replace,
            variable: 'A',
        });
        collection.set('B-key', {
            value: 'b',
            type: EnvironmentVariableMutatorType.Append,
            variable: 'B',
        });
        collection.set('C-key', {
            value: 'c',
            type: EnvironmentVariableMutatorType.Prepend,
            variable: 'C',
            options: { applyAtProcessCreation: true, applyAtShellIntegration: true },
        });
        environmentVariableService.set('ext1', { map: collection, persistent: true });
        deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
            [
                'A',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Replace,
                        value: 'a',
                        variable: 'A',
                        options: undefined,
                    },
                ],
            ],
            [
                'B',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Append,
                        value: 'b',
                        variable: 'B',
                        options: undefined,
                    },
                ],
            ],
            [
                'C',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Prepend,
                        value: 'c',
                        variable: 'C',
                        options: { applyAtProcessCreation: true, applyAtShellIntegration: true },
                    },
                ],
            ],
        ]);
        // Persist with old service, create a new service with the same storage service to verify restore
        environmentVariableService.persistCollections();
        const service2 = store.add(instantiationService.createInstance(TestEnvironmentVariableService));
        deepStrictEqual([...service2.mergedCollection.getVariableMap(undefined).entries()], [
            [
                'A',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Replace,
                        value: 'a',
                        variable: 'A',
                        options: undefined,
                    },
                ],
            ],
            [
                'B',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Append,
                        value: 'b',
                        variable: 'B',
                        options: undefined,
                    },
                ],
            ],
            [
                'C',
                [
                    {
                        extensionIdentifier: 'ext1',
                        type: EnvironmentVariableMutatorType.Prepend,
                        value: 'c',
                        variable: 'C',
                        options: { applyAtProcessCreation: true, applyAtShellIntegration: true },
                    },
                ],
            ],
        ]);
    });
    suite('mergedCollection', () => {
        test('should overwrite any other variable with the first extension that replaces', () => {
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', {
                value: 'a1',
                type: EnvironmentVariableMutatorType.Append,
                variable: 'A',
            });
            collection1.set('B-key', {
                value: 'b1',
                type: EnvironmentVariableMutatorType.Replace,
                variable: 'B',
            });
            collection2.set('A-key', {
                value: 'a2',
                type: EnvironmentVariableMutatorType.Replace,
                variable: 'A',
            });
            collection2.set('B-key', {
                value: 'b2',
                type: EnvironmentVariableMutatorType.Append,
                variable: 'B',
            });
            collection3.set('A-key', {
                value: 'a3',
                type: EnvironmentVariableMutatorType.Prepend,
                variable: 'A',
            });
            collection3.set('B-key', {
                value: 'b3',
                type: EnvironmentVariableMutatorType.Replace,
                variable: 'B',
            });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Replace,
                            value: 'a2',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Append,
                            value: 'a1',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
                [
                    'B',
                    [
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Replace,
                            value: 'b1',
                            variable: 'B',
                            options: undefined,
                        },
                    ],
                ],
            ]);
        });
        test('should correctly apply the environment values from multiple extension contributions in the correct order', async () => {
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', {
                value: ':a1',
                type: EnvironmentVariableMutatorType.Append,
                variable: 'A',
            });
            collection2.set('A-key', {
                value: 'a2:',
                type: EnvironmentVariableMutatorType.Prepend,
                variable: 'A',
            });
            collection3.set('A-key', {
                value: 'a3',
                type: EnvironmentVariableMutatorType.Replace,
                variable: 'A',
            });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            // The entries should be ordered in the order they are applied
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext3',
                            type: EnvironmentVariableMutatorType.Replace,
                            value: 'a3',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a2:',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Append,
                            value: ':a1',
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            // Verify the entries get applied to the environment as expected
            const env = { A: 'foo' };
            await environmentVariableService.mergedCollection.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, { A: 'a2:a3:a1' });
        });
        test('should correctly apply the workspace specific environment values from multiple extension contributions in the correct order', async () => {
            const scope1 = {
                workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 },
            };
            const scope2 = {
                workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 },
            };
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', {
                value: ':a1',
                type: EnvironmentVariableMutatorType.Append,
                scope: scope1,
                variable: 'A',
            });
            collection2.set('A-key', {
                value: 'a2:',
                type: EnvironmentVariableMutatorType.Prepend,
                variable: 'A',
            });
            collection3.set('A-key', {
                value: 'a3',
                type: EnvironmentVariableMutatorType.Replace,
                scope: scope2,
                variable: 'A',
            });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            // The entries should be ordered in the order they are applied
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(scope1).entries()], [
                [
                    'A',
                    [
                        {
                            extensionIdentifier: 'ext2',
                            type: EnvironmentVariableMutatorType.Prepend,
                            value: 'a2:',
                            variable: 'A',
                            options: undefined,
                        },
                        {
                            extensionIdentifier: 'ext1',
                            type: EnvironmentVariableMutatorType.Append,
                            value: ':a1',
                            scope: scope1,
                            variable: 'A',
                            options: undefined,
                        },
                    ],
                ],
            ]);
            // Verify the entries get applied to the environment as expected
            const env = { A: 'foo' };
            await environmentVariableService.mergedCollection.applyToProcessEnvironment(env, scope1);
            deepStrictEqual(env, { A: 'a2:foo:a1' });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL2Vudmlyb25tZW50VmFyaWFibGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixrQkFBa0IsR0FDbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sOEJBQThCLEdBRTlCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE1BQU0sOEJBQStCLFNBQVEsMEJBQTBCO0lBQ3RFLGtCQUFrQjtRQUNqQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBQ0QsdUJBQXVCO1FBQ3RCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2hDLENBQUM7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