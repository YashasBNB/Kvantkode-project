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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlZ2lzdHJ5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL3Rlc3QvY29tbW9uL2NvbmZpZ3VyYXRpb25SZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7SUFFRCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNwQixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUV2QixTQUFTLEtBQUs7UUFDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDekYscUJBQXFCLENBQUMsK0JBQStCLENBQ3BELHFCQUFxQixDQUFDLGtDQUFrQyxFQUFFLENBQzFELENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxlQUFlO1lBQ25CLElBQUks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