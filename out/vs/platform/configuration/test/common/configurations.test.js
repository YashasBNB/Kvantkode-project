/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { equals } from '../../../../base/common/objects.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Extensions, } from '../../common/configurationRegistry.js';
import { DefaultConfiguration } from '../../common/configurations.js';
import { NullLogService } from '../../../log/common/log.js';
import { Registry } from '../../../registry/common/platform.js';
suite('DefaultConfiguration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationRegistry = Registry.as(Extensions.Configuration);
    setup(() => reset());
    teardown(() => reset());
    function reset() {
        configurationRegistry.deregisterConfigurations(configurationRegistry.getConfigurations());
        configurationRegistry.deregisterDefaultConfigurations(configurationRegistry.getRegisteredDefaultConfigurations());
    }
    test('Test registering a property before initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                a: {
                    description: 'a',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        const actual = await testObject.initialize();
        assert.strictEqual(actual.getValue('a'), false);
    });
    test('Test registering a property and do not initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                a: {
                    description: 'a',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        assert.strictEqual(testObject.configurationModel.getValue('a'), undefined);
    });
    test('Test registering a property after initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                'defaultConfiguration.testSetting1': {
                    description: 'a',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        const { defaults: actual, properties } = await promise;
        assert.strictEqual(actual.getValue('defaultConfiguration.testSetting1'), false);
        assert.deepStrictEqual(properties, ['defaultConfiguration.testSetting1']);
    });
    test('Test registering nested properties', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                'a.b': {
                    description: '1',
                    type: 'object',
                    default: {},
                },
                'a.b.c': {
                    description: '2',
                    type: 'object',
                    default: '2',
                },
            },
        });
        const actual = await testObject.initialize();
        assert.ok(equals(actual.getValue('a'), { b: { c: '2' } }));
        assert.ok(equals(actual.contents, { a: { b: { c: '2' } } }));
        assert.deepStrictEqual(actual.keys.sort(), ['a.b', 'a.b.c']);
    });
    test('Test registering the same property again', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                a: {
                    description: 'a',
                    type: 'boolean',
                    default: true,
                },
            },
        });
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                a: {
                    description: 'a',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        const actual = await testObject.initialize();
        assert.strictEqual(true, actual.getValue('a'));
    });
    test('Test registering an override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[a]': {
                        b: true,
                    },
                },
            },
        ]);
        const actual = await testObject.initialize();
        assert.ok(equals(actual.getValue('[a]'), { b: true }));
        assert.ok(equals(actual.contents, { '[a]': { b: true } }));
        assert.ok(equals(actual.overrides, [{ contents: { b: true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test registering a normal property and override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[a]': {
                        b: true,
                    },
                },
            },
        ]);
        const actual = await testObject.initialize();
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { b: true }));
        assert.ok(equals(actual.contents, { b: false, '[a]': { b: true } }));
        assert.ok(equals(actual.overrides, [{ contents: { b: true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test normal property is registered after override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[a]': {
                        b: true,
                    },
                },
            },
        ]);
        await testObject.initialize();
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        const { defaults: actual, properties } = await promise;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { b: true }));
        assert.ok(equals(actual.contents, { b: false, '[a]': { b: true } }));
        assert.ok(equals(actual.overrides, [{ contents: { b: true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
        assert.deepStrictEqual(properties, ['b']);
    });
    test('Test override identifier is registered after property', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        await testObject.initialize();
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[a]': {
                        b: true,
                    },
                },
            },
        ]);
        const { defaults: actual, properties } = await promise;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { b: true }));
        assert.ok(equals(actual.contents, { b: false, '[a]': { b: true } }));
        assert.ok(equals(actual.overrides, [{ contents: { b: true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
        assert.deepStrictEqual(properties, ['[a]']);
    });
    test('Test register override identifier and property after initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        await testObject.initialize();
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[a]': {
                        b: true,
                    },
                },
            },
        ]);
        const actual = testObject.configurationModel;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { b: true }));
        assert.ok(equals(actual.contents, { b: false, '[a]': { b: true } }));
        assert.ok(equals(actual.overrides, [{ contents: { b: true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test deregistering a property', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        const node = {
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                a: {
                    description: 'a',
                    type: 'boolean',
                    default: false,
                },
            },
        };
        configurationRegistry.registerConfiguration(node);
        await testObject.initialize();
        configurationRegistry.deregisterConfigurations([node]);
        const { defaults: actual, properties } = await promise;
        assert.strictEqual(actual.getValue('a'), undefined);
        assert.ok(equals(actual.contents, {}));
        assert.deepStrictEqual(actual.keys, []);
        assert.deepStrictEqual(properties, ['a']);
    });
    test('Test deregistering an override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'a',
            order: 1,
            title: 'a',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'boolean',
                    default: false,
                },
            },
        });
        const node = {
            overrides: {
                '[a]': {
                    b: true,
                },
            },
        };
        configurationRegistry.registerDefaultConfigurations([node]);
        await testObject.initialize();
        configurationRegistry.deregisterDefaultConfigurations([node]);
        assert.deepStrictEqual(testObject.configurationModel.getValue('[a]'), undefined);
        assert.ok(equals(testObject.configurationModel.contents, { b: false }));
        assert.ok(equals(testObject.configurationModel.overrides, []));
        assert.deepStrictEqual(testObject.configurationModel.keys, ['b']);
        assert.strictEqual(testObject.configurationModel.getOverrideValue('b', 'a'), undefined);
    });
    test('Test deregistering a merged language object setting', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            id: 'b',
            order: 1,
            title: 'b',
            type: 'object',
            properties: {
                b: {
                    description: 'b',
                    type: 'object',
                    default: {},
                },
            },
        });
        const node1 = {
            overrides: {
                '[a]': {
                    b: {
                        aa: '1',
                        bb: '2',
                    },
                },
            },
            source: { id: 'source1', displayName: 'source1' },
        };
        const node2 = {
            overrides: {
                '[a]': {
                    b: {
                        bb: '20',
                        cc: '30',
                    },
                },
            },
            source: { id: 'source2', displayName: 'source2' },
        };
        configurationRegistry.registerDefaultConfigurations([node1]);
        configurationRegistry.registerDefaultConfigurations([node2]);
        await testObject.initialize();
        configurationRegistry.deregisterDefaultConfigurations([node1]);
        assert.ok(equals(testObject.configurationModel.getValue('[a]'), { b: { bb: '20', cc: '30' } }));
        assert.ok(equals(testObject.configurationModel.contents, {
            '[a]': { b: { bb: '20', cc: '30' } },
            b: {},
        }));
        assert.ok(equals(testObject.configurationModel.overrides, [
            { contents: { b: { bb: '20', cc: '30' } }, identifiers: ['a'], keys: ['b'] },
        ]));
        assert.deepStrictEqual(testObject.configurationModel.keys.sort(), ['[a]', 'b']);
        assert.ok(equals(testObject.configurationModel.getOverrideValue('b', 'a'), { bb: '20', cc: '30' }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi90ZXN0L2NvbW1vbi9jb25maWd1cmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixVQUFVLEdBR1YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9ELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUM3RCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUUzRixLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNwQixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUV2QixTQUFTLEtBQUs7UUFDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDekYscUJBQXFCLENB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QUFDLENBQUE7UUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxFQUFFLENBQ1IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdFLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRixxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsR0FBRztZQUNQLEtBQUssRUFBRSxDQUFDO1lBQ1IsS0FBSyxFQUFFLEdBQUc7WUFDVixJQUFJLEVB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