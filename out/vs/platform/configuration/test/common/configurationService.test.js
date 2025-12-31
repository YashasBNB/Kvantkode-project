/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { isConfigured } from '../../common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../common/configurationRegistry.js';
import { ConfigurationService } from '../../common/configurationService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import { FilePolicyService } from '../../../policy/common/filePolicyService.js';
import { NullPolicyService } from '../../../policy/common/policy.js';
import { Registry } from '../../../registry/common/platform.js';
suite('ConfigurationService.test.ts', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileService;
    let settingsResource;
    setup(async () => {
        fileService = disposables.add(new FileService(new NullLogService()));
        const diskFileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, diskFileSystemProvider));
        settingsResource = URI.file('settings.json');
    });
    test('simple', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "bar" }'));
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        const config = testObject.getValue();
        assert.ok(config);
        assert.strictEqual(config.foo, 'bar');
    }));
    test('config gets flattened', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        const config = testObject.getValue();
        assert.ok(config);
        assert.ok(config.testworkbench);
        assert.ok(config.testworkbench.editor);
        assert.strictEqual(config.testworkbench.editor.tabs, true);
    }));
    test('error case does not explode', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(settingsResource, VSBuffer.fromString(',,,,'));
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        const config = testObject.getValue();
        assert.ok(config);
    }));
    test('missing file does not explode', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const testObject = disposables.add(new ConfigurationService(URI.file('__testFile'), fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        const config = testObject.getValue();
        assert.ok(config);
    }));
    test('trigger configuration change event when file does not exist', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        return new Promise((c, e) => {
            disposables.add(Event.filter(testObject.onDidChangeConfiguration, (e) => e.source === 2 /* ConfigurationTarget.USER */)(() => {
                assert.strictEqual(testObject.getValue('foo'), 'bar');
                c();
            }));
            fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "bar" }')).catch(e);
        });
    }));
    test('trigger configuration change event when file exists', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "bar" }'));
        await testObject.initialize();
        return new Promise((c) => {
            disposables.add(Event.filter(testObject.onDidChangeConfiguration, (e) => e.source === 2 /* ConfigurationTarget.USER */)(async (e) => {
                assert.strictEqual(testObject.getValue('foo'), 'barz');
                c();
            }));
            fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "barz" }'));
        });
    }));
    test('reloadConfiguration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "bar" }'));
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        let config = testObject.getValue();
        assert.ok(config);
        assert.strictEqual(config.foo, 'bar');
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "foo": "changed" }'));
        // force a reload to get latest
        await testObject.reloadConfiguration();
        config = testObject.getValue();
        assert.ok(config);
        assert.strictEqual(config.foo, 'changed');
    }));
    test('model defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configuration.service.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        let testObject = disposables.add(new ConfigurationService(URI.file('__testFile'), fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        let setting = testObject.getValue();
        assert.ok(setting);
        assert.strictEqual(setting.configuration.service.testSetting, 'isSet');
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        setting = testObject.getValue();
        assert.ok(setting);
        assert.strictEqual(setting.configuration.service.testSetting, 'isSet');
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "configuration.service.testSetting": "isChanged" }'));
        await testObject.reloadConfiguration();
        setting = testObject.getValue();
        assert.ok(setting);
        assert.strictEqual(setting.configuration.service.testSetting, 'isChanged');
    }));
    test('lookup', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'lookup.service.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        let res = testObject.inspect('something.missing');
        assert.strictEqual(res.value, undefined);
        assert.strictEqual(res.defaultValue, undefined);
        assert.strictEqual(res.userValue, undefined);
        assert.strictEqual(isConfigured(res), false);
        res = testObject.inspect('lookup.service.testSetting');
        assert.strictEqual(res.defaultValue, 'isSet');
        assert.strictEqual(res.value, 'isSet');
        assert.strictEqual(res.userValue, undefined);
        assert.strictEqual(isConfigured(res), false);
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "lookup.service.testSetting": "bar" }'));
        await testObject.reloadConfiguration();
        res = testObject.inspect('lookup.service.testSetting');
        assert.strictEqual(res.defaultValue, 'isSet');
        assert.strictEqual(res.userValue, 'bar');
        assert.strictEqual(res.value, 'bar');
        assert.strictEqual(isConfigured(res), true);
    }));
    test('lookup with null', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_testNull',
            type: 'object',
            properties: {
                'lookup.service.testNullSetting': {
                    type: 'null',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        let res = testObject.inspect('lookup.service.testNullSetting');
        assert.strictEqual(res.defaultValue, null);
        assert.strictEqual(res.value, null);
        assert.strictEqual(res.userValue, undefined);
        await fileService.writeFile(settingsResource, VSBuffer.fromString('{ "lookup.service.testNullSetting": null }'));
        await testObject.reloadConfiguration();
        res = testObject.inspect('lookup.service.testNullSetting');
        assert.strictEqual(res.defaultValue, null);
        assert.strictEqual(res.value, null);
        assert.strictEqual(res.userValue, null);
    }));
    test('update configuration', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        await testObject.updateValue('configurationService.testSetting', 'value');
        assert.strictEqual(testObject.getValue('configurationService.testSetting'), 'value');
    });
    test('update configuration when exist', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        await testObject.updateValue('configurationService.testSetting', 'value');
        await testObject.updateValue('configurationService.testSetting', 'updatedValue');
        assert.strictEqual(testObject.getValue('configurationService.testSetting'), 'updatedValue');
    });
    test('update configuration to default value should remove', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        await testObject.updateValue('configurationService.testSetting', 'value');
        await testObject.updateValue('configurationService.testSetting', 'isSet');
        const inspect = testObject.inspect('configurationService.testSetting');
        assert.strictEqual(inspect.userValue, undefined);
    });
    test('update configuration should remove when undefined is passed', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        await testObject.updateValue('configurationService.testSetting', 'value');
        await testObject.updateValue('configurationService.testSetting', undefined);
        const inspect = testObject.inspect('configurationService.testSetting');
        assert.strictEqual(inspect.userValue, undefined);
    });
    test('update unknown configuration', async () => {
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        await testObject.updateValue('configurationService.unknownSetting', 'value');
        assert.strictEqual(testObject.getValue('configurationService.unknownSetting'), 'value');
    });
    test('update configuration in non user target throws error', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, new NullPolicyService(), new NullLogService()));
        await testObject.initialize();
        try {
            await testObject.updateValue('configurationService.testSetting', 'value', 5 /* ConfigurationTarget.WORKSPACE */);
            assert.fail('Should fail with error');
        }
        catch (e) {
            // succeess
        }
    });
    test('update configuration throws error for policy setting', async () => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.policySetting': {
                    type: 'string',
                    default: 'isSet',
                    policy: {
                        name: 'configurationService.policySetting',
                        minimumVersion: '1.0.0',
                    },
                },
            },
        });
        const logService = new NullLogService();
        const policyFile = URI.file('policies.json');
        await fileService.writeFile(policyFile, VSBuffer.fromString('{ "configurationService.policySetting": "policyValue" }'));
        const policyService = disposables.add(new FilePolicyService(policyFile, fileService, logService));
        const testObject = disposables.add(new ConfigurationService(settingsResource, fileService, policyService, logService));
        await testObject.initialize();
        try {
            await testObject.updateValue('configurationService.policySetting', 'value');
            assert.fail('Should throw error');
        }
        catch (error) {
            // succeess
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vY29uZmlndXJhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBdUIsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8s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