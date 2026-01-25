/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Extensions as ConfigurationExtensions, } from '../../common/configurationRegistry.js';
import { Registry } from '../../../registry/common/platform.js';
suite('ConfigurationRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    setup(() => reset());
    teardown(() => reset());
    function reset() {
        configurationRegistry.deregisterConfigurations(configurationRegistry.getConfigurations());
        configurationRegistry.deregisterDefaultConfigurations(configurationRegistry.getRegisteredDefaultConfigurations());
    }
    test('configuration override', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([{ overrides: { config: { a: 1, b: 2 } } }]);
        configurationRegistry.registerDefaultConfigurations([
            { overrides: { '[lang]': { a: 2, c: 3 } } },
        ]);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 1,
            b: 2,
        });
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['[lang]'].default, {
            a: 2,
            c: 3,
        });
    });
    test('configuration override defaults - prevent overriding default value', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                'config.preventDefaultValueOverride': {
                    type: 'object',
                    default: { a: 0 },
                    disallowConfigurationDefault: true,
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([
            { overrides: { 'config.preventDefaultValueOverride': { a: 1, b: 2 } } },
        ]);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config.preventDefaultValueOverride']
            .default, { a: 0 });
    });
    test('configuration override defaults - merges defaults', async () => {
        configurationRegistry.registerDefaultConfigurations([
            { overrides: { '[lang]': { a: 1, b: 2 } } },
        ]);
        configurationRegistry.registerDefaultConfigurations([
            { overrides: { '[lang]': { a: 2, c: 3 } } },
        ]);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['[lang]'].default, {
            a: 2,
            b: 2,
            c: 3,
        });
    });
    test('configuration defaults - merge object default overrides', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([{ overrides: { config: { a: 1, b: 2 } } }]);
        configurationRegistry.registerDefaultConfigurations([{ overrides: { config: { a: 2, c: 3 } } }]);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 2,
            b: 2,
            c: 3,
        });
    });
    test('registering multiple settings with same policy', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                policy1: {
                    type: 'object',
                    policy: {
                        name: 'policy',
                        minimumVersion: '1.0.0',
                    },
                },
                policy2: {
                    type: 'object',
                    policy: {
                        name: 'policy',
                        minimumVersion: '1.0.0',
                    },
                },
            },
        });
        const actual = configurationRegistry.getConfigurationProperties();
        assert.ok(actual['policy1'] !== undefined);
        assert.ok(actual['policy2'] === undefined);
    });
    test('configuration defaults - deregister merged object default override', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                },
            },
        });
        const overrides1 = [
            { overrides: { config: { a: 1, b: 2 } }, source: { id: 'source1', displayName: 'source1' } },
        ];
        const overrides2 = [
            { overrides: { config: { a: 2, c: 3 } }, source: { id: 'source2', displayName: 'source2' } },
        ];
        configurationRegistry.registerDefaultConfigurations(overrides1);
        configurationRegistry.registerDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 2,
            b: 2,
            c: 3,
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 1,
            b: 2,
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides1);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {});
    });
    test('configuration defaults - deregister merged object default override without source', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                },
            },
        });
        const overrides1 = [{ overrides: { config: { a: 1, b: 2 } } }];
        const overrides2 = [{ overrides: { config: { a: 2, c: 3 } } }];
        configurationRegistry.registerDefaultConfigurations(overrides1);
        configurationRegistry.registerDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 2,
            b: 2,
            c: 3,
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {
            a: 1,
            b: 2,
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides1);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['config'].default, {});
    });
    test('configuration defaults - deregister merged object default language overrides', async () => {
        configurationRegistry.registerConfiguration({
            id: '_test_default',
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                },
            },
        });
        const overrides1 = [
            {
                overrides: { '[lang]': { config: { a: 1, b: 2 } } },
                source: { id: 'source1', displayName: 'source1' },
            },
        ];
        const overrides2 = [
            {
                overrides: { '[lang]': { config: { a: 2, c: 3 } } },
                source: { id: 'source2', displayName: 'source2' },
            },
        ];
        configurationRegistry.registerDefaultConfigurations(overrides1);
        configurationRegistry.registerDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['[lang]'].default, {
            config: { a: 2, b: 2, c: 3 },
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides2);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['[lang]'].default, {
            config: { a: 1, b: 2 },
        });
        configurationRegistry.deregisterDefaultConfigurations(overrides1);
        assert.deepStrictEqual(configurationRegistry.getConfigurationProperties()['[lang]'], undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vY29uZmlndXJhdGlvblJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9ELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3hDLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQTtJQUVELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3BCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBRXZCLFNBQVMsS0FBSztRQUNiLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUN6RixxQkFBcUIsQ0FBQywrQkFBK0IsQ0FDcEQscUJBQXFCLENBQUMsa0NBQWtDLEVBQUUsQ0FDMUQsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLGVBQWU7WUFDbkIs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