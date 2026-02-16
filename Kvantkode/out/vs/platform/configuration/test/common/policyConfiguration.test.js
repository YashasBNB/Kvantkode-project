/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { DefaultConfiguration, PolicyConfiguration } from '../../common/configurations.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import { Extensions, } from '../../common/configurationRegistry.js';
import { Registry } from '../../../registry/common/platform.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { deepClone } from '../../../../base/common/objects.js';
import { FilePolicyService } from '../../../policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('PolicyConfiguration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let testObject;
    let fileService;
    let policyService;
    const policyFile = URI.file('policyFile').with({ scheme: 'vscode-tests' });
    const policyConfigurationNode = {
        id: 'policyConfiguration',
        order: 1,
        title: 'a',
        type: 'object',
        properties: {
            'policy.settingA': {
                type: 'string',
                default: 'defaultValueA',
                policy: {
                    name: 'PolicySettingA',
                    minimumVersion: '1.0.0',
                },
            },
            'policy.settingB': {
                type: 'string',
                default: 'defaultValueB',
                policy: {
                    name: 'PolicySettingB',
                    minimumVersion: '1.0.0',
                },
            },
            'policy.objectSetting': {
                type: 'object',
                default: {},
                policy: {
                    name: 'PolicyObjectSetting',
                    minimumVersion: '1.0.0',
                },
            },
            'policy.arraySetting': {
                type: 'object',
                default: [],
                policy: {
                    name: 'PolicyArraySetting',
                    minimumVersion: '1.0.0',
                },
            },
            'policy.internalSetting': {
                type: 'string',
                default: 'defaultInternalValue',
                included: false,
                policy: {
                    name: 'PolicyInternalSetting',
                    minimumVersion: '1.0.0',
                },
            },
            'nonPolicy.setting': {
                type: 'boolean',
                default: true,
            },
        },
    };
    suiteSetup(() => Registry.as(Extensions.Configuration).registerConfiguration(policyConfigurationNode));
    suiteTeardown(() => Registry.as(Extensions.Configuration).deregisterConfigurations([
        policyConfigurationNode,
    ]));
    setup(async () => {
        const defaultConfiguration = disposables.add(new DefaultConfiguration(new NullLogService()));
        await defaultConfiguration.initialize();
        fileService = disposables.add(new FileService(new NullLogService()));
        const diskFileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(policyFile.scheme, diskFileSystemProvider));
        policyService = disposables.add(new FilePolicyService(policyFile, fileService, new NullLogService()));
        testObject = disposables.add(new PolicyConfiguration(defaultConfiguration, policyService, new NullLogService()));
    });
    test('initialize: with policies', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueA' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: no policies', async () => {
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
    });
    test('initialize: with policies but not registered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({
            PolicySettingA: 'policyValueA',
            PolicySettingB: 'policyValueB',
            PolicySettingC: 'policyValueC',
        })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), 'policyValueB');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA', 'policy.settingB']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: with object type policy', async () => {
        const expected = {
            microsoft: true,
            github: 'stable',
            other: 1,
            complex: {
                key: 'value',
            },
            array: [1, 2, 3],
        };
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicyObjectSetting: JSON.stringify(expected) })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), expected);
    });
    test('initialize: with array type policy', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicyArraySetting: JSON.stringify([1]) })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.arraySetting'), [1]);
    });
    test('initialize: with object type policy ignores policy if value is not valid', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicyObjectSetting: '{"a": "b", "hello": }' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), undefined);
    });
    test('initialize: with object type policy ignores policy if there are duplicate keys', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicyObjectSetting: '{"microsoft": true, "microsoft": false }' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), undefined);
    });
    test('change: when policy is added', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({
                PolicySettingA: 'policyValueA',
                PolicySettingB: 'policyValueB',
                PolicySettingC: 'policyValueC',
            })));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), 'policyValueB');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA', 'policy.settingB']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy is updated', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueAChanged' })));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueAChanged');
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy is removed', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({})));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy setting is registered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingC: 'policyValueC' })));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        policyConfigurationNode.properties['policy.settingC'] = {
            type: 'string',
            default: 'defaultValueC',
            policy: {
                name: 'PolicySettingC',
                minimumVersion: '1.0.0',
            },
        };
        Registry.as(Extensions.Configuration).registerConfiguration(deepClone(policyConfigurationNode));
        await promise;
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingC'), 'policyValueC');
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingC']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy setting is deregistered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicySettingA: 'policyValueA' })));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        Registry.as(Extensions.Configuration).deregisterConfigurations([
            policyConfigurationNode,
        ]);
        await promise;
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: with internal policies', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ PolicyInternalSetting: 'internalValue' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('policy.internalSetting'), 'internalValue');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.internalSetting']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5Q29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL3Rlc3QvY29tbW9uL3BvbGljeUNvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFDTixVQUFVLEdBR1YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFF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