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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vY29uZmlndXJhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sVUFBVSxHQUdWLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFDN0QsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUE7SUFFM0YsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDcEIsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFFdkIsU0FBUyxLQUFLO1FBQ2IscUJBQXFCLENBQUMsd0JBQXdCLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLHFCQUFxQixDQUFDLCtC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