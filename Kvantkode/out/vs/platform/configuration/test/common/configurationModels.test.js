/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ResourceMap } from '../../../../base/common/map.js';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Configuration, ConfigurationChangeEvent, ConfigurationModel, ConfigurationModelParser, mergeChanges, } from '../../common/configurationModels.js';
import { Extensions, } from '../../common/configurationRegistry.js';
import { NullLogService } from '../../../log/common/log.js';
import { Registry } from '../../../registry/common/platform.js';
import { WorkspaceFolder } from '../../../workspace/common/workspace.js';
import { Workspace } from '../../../workspace/test/common/testWorkspace.js';
suite('ConfigurationModelParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        Registry.as(Extensions.Configuration).registerConfiguration({
            id: 'ConfigurationModelParserTest',
            type: 'object',
            properties: {
                'ConfigurationModelParserTest.windowSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
    });
    test('parse configuration model with single override identifier', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ '[x]': { a: 1 } }));
        assert.deepStrictEqual(JSON.stringify(testObject.configurationModel.overrides), JSON.stringify([{ identifiers: ['x'], keys: ['a'], contents: { a: 1 } }]));
    });
    test('parse configuration model with multiple override identifiers', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ '[x][y]': { a: 1 } }));
        assert.deepStrictEqual(JSON.stringify(testObject.configurationModel.overrides), JSON.stringify([{ identifiers: ['x', 'y'], keys: ['a'], contents: { a: 1 } }]));
    });
    test('parse configuration model with multiple duplicate override identifiers', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ '[x][y][x][z]': { a: 1 } }));
        assert.deepStrictEqual(JSON.stringify(testObject.configurationModel.overrides), JSON.stringify([{ identifiers: ['x', 'y', 'z'], keys: ['a'], contents: { a: 1 } }]));
    });
    test('parse configuration model with exclude option', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ a: 1, b: 2 }), { exclude: ['a'] });
        assert.strictEqual(testObject.configurationModel.getValue('a'), undefined);
        assert.strictEqual(testObject.configurationModel.getValue('b'), 2);
    });
    test('parse configuration model with exclude option even included', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ a: 1, b: 2 }), { exclude: ['a'], include: ['a'] });
        assert.strictEqual(testObject.configurationModel.getValue('a'), undefined);
        assert.strictEqual(testObject.configurationModel.getValue('b'), 2);
    });
    test('parse configuration model with scopes filter', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ 'ConfigurationModelParserTest.windowSetting': '1' }), {
            scopes: [1 /* ConfigurationScope.APPLICATION */],
        });
        assert.strictEqual(testObject.configurationModel.getValue('ConfigurationModelParserTest.windowSetting'), undefined);
    });
    test('parse configuration model with include option', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ 'ConfigurationModelParserTest.windowSetting': '1' }), {
            include: ['ConfigurationModelParserTest.windowSetting'],
            scopes: [1 /* ConfigurationScope.APPLICATION */],
        });
        assert.strictEqual(testObject.configurationModel.getValue('ConfigurationModelParserTest.windowSetting'), '1');
    });
    test('parse configuration model with invalid setting key', () => {
        const testObject = new ConfigurationModelParser('', new NullLogService());
        testObject.parse(JSON.stringify({ a: null, 'a.b.c': { c: 1 } }));
        assert.strictEqual(testObject.configurationModel.getValue('a'), null);
        assert.strictEqual(testObject.configurationModel.getValue('a.b'), undefined);
        assert.strictEqual(testObject.configurationModel.getValue('a.b.c'), undefined);
    });
});
suite('ConfigurationModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('setValue for a key that has no sections and not defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 } }, ['a.b'], [], undefined, new NullLogService());
        testObject.setValue('f', 1);
        assert.deepStrictEqual(testObject.contents, { a: { b: 1 }, f: 1 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'f']);
    });
    test('setValue for a key that has no sections and defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, ['a.b', 'f'], [], undefined, new NullLogService());
        testObject.setValue('f', 3);
        assert.deepStrictEqual(testObject.contents, { a: { b: 1 }, f: 3 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'f']);
    });
    test('setValue for a key that has sections and not defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, ['a.b', 'f'], [], undefined, new NullLogService());
        testObject.setValue('b.c', 1);
        const expected = {};
        expected['a'] = { b: 1 };
        expected['f'] = 1;
        expected['b'] = Object.create(null);
        expected['b']['c'] = 1;
        assert.deepStrictEqual(testObject.contents, expected);
        assert.deepStrictEqual(testObject.keys, ['a.b', 'f', 'b.c']);
    });
    test('setValue for a key that has sections and defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, b: { c: 1 }, f: 1 }, ['a.b', 'b.c', 'f'], [], undefined, new NullLogService());
        testObject.setValue('b.c', 3);
        assert.deepStrictEqual(testObject.contents, { a: { b: 1 }, b: { c: 3 }, f: 1 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'b.c', 'f']);
    });
    test('setValue for a key that has sections and sub section not defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, ['a.b', 'f'], [], undefined, new NullLogService());
        testObject.setValue('a.c', 1);
        assert.deepStrictEqual(testObject.contents, { a: { b: 1, c: 1 }, f: 1 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'f', 'a.c']);
    });
    test('setValue for a key that has sections and sub section defined', () => {
        const testObject = new ConfigurationModel({ a: { b: 1, c: 1 }, f: 1 }, ['a.b', 'a.c', 'f'], [], undefined, new NullLogService());
        testObject.setValue('a.c', 3);
        assert.deepStrictEqual(testObject.contents, { a: { b: 1, c: 3 }, f: 1 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'a.c', 'f']);
    });
    test('setValue for a key that has sections and last section is added', () => {
        const testObject = new ConfigurationModel({ a: { b: {} }, f: 1 }, ['a.b', 'f'], [], undefined, new NullLogService());
        testObject.setValue('a.b.c', 1);
        assert.deepStrictEqual(testObject.contents, { a: { b: { c: 1 } }, f: 1 });
        assert.deepStrictEqual(testObject.keys, ['a.b', 'f', 'a.b.c']);
    });
    test('removeValue: remove a non existing key', () => {
        const testObject = new ConfigurationModel({ a: { b: 2 } }, ['a.b'], [], undefined, new NullLogService());
        testObject.removeValue('a.b.c');
        assert.deepStrictEqual(testObject.contents, { a: { b: 2 } });
        assert.deepStrictEqual(testObject.keys, ['a.b']);
    });
    test('removeValue: remove a single segmented key', () => {
        const testObject = new ConfigurationModel({ a: 1 }, ['a'], [], undefined, new NullLogService());
        testObject.removeValue('a');
        assert.deepStrictEqual(testObject.contents, {});
        assert.deepStrictEqual(testObject.keys, []);
    });
    test('removeValue: remove a multi segmented key', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 } }, ['a.b'], [], undefined, new NullLogService());
        testObject.removeValue('a.b');
        assert.deepStrictEqual(testObject.contents, {});
        assert.deepStrictEqual(testObject.keys, []);
    });
    test('get overriding configuration model for an existing identifier', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, [], [{ identifiers: ['c'], contents: { a: { d: 1 } }, keys: ['a'] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1, d: 1 }, f: 1 });
    });
    test('get overriding configuration model for an identifier that does not exist', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, [], [{ identifiers: ['c'], contents: { a: { d: 1 } }, keys: ['a'] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('xyz').contents, { a: { b: 1 }, f: 1 });
    });
    test('get overriding configuration when one of the keys does not exist in base', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, [], [{ identifiers: ['c'], contents: { a: { d: 1 }, g: 1 }, keys: ['a', 'g'] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1, d: 1 }, f: 1, g: 1 });
    });
    test('get overriding configuration when one of the key in base is not of object type', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: 1 }, [], [{ identifiers: ['c'], contents: { a: { d: 1 }, f: { g: 1 } }, keys: ['a', 'f'] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1, d: 1 }, f: { g: 1 } });
    });
    test('get overriding configuration when one of the key in overriding contents is not of object type', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: { g: 1 } }, [], [{ identifiers: ['c'], contents: { a: { d: 1 }, f: 1 }, keys: ['a', 'f'] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1, d: 1 }, f: 1 });
    });
    test('get overriding configuration if the value of overriding identifier is not object', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: { g: 1 } }, [], [{ identifiers: ['c'], contents: 'abc', keys: [] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1 }, f: { g: 1 } });
    });
    test('get overriding configuration if the value of overriding identifier is an empty object', () => {
        const testObject = new ConfigurationModel({ a: { b: 1 }, f: { g: 1 } }, [], [{ identifiers: ['c'], contents: {}, keys: [] }], [], new NullLogService());
        assert.deepStrictEqual(testObject.override('c').contents, { a: { b: 1 }, f: { g: 1 } });
    });
    test('simple merge', () => {
        const base = new ConfigurationModel({ a: 1, b: 2 }, ['a', 'b'], [], undefined, new NullLogService());
        const add = new ConfigurationModel({ a: 3, c: 4 }, ['a', 'c'], [], undefined, new NullLogService());
        const result = base.merge(add);
        assert.deepStrictEqual(result.contents, { a: 3, b: 2, c: 4 });
        assert.deepStrictEqual(result.keys, ['a', 'b', 'c']);
    });
    test('recursive merge', () => {
        const base = new ConfigurationModel({ a: { b: 1 } }, ['a.b'], [], undefined, new NullLogService());
        const add = new ConfigurationModel({ a: { b: 2 } }, ['a.b'], [], undefined, new NullLogService());
        const result = base.merge(add);
        assert.deepStrictEqual(result.contents, { a: { b: 2 } });
        assert.deepStrictEqual(result.getValue('a'), { b: 2 });
        assert.deepStrictEqual(result.keys, ['a.b']);
    });
    test('simple merge overrides', () => {
        const base = new ConfigurationModel({ a: { b: 1 } }, ['a.b'], [{ identifiers: ['c'], contents: { a: 2 }, keys: ['a'] }], undefined, new NullLogService());
        const add = new ConfigurationModel({ a: { b: 2 } }, ['a.b'], [{ identifiers: ['c'], contents: { b: 2 }, keys: ['b'] }], undefined, new NullLogService());
        const result = base.merge(add);
        assert.deepStrictEqual(result.contents, { a: { b: 2 } });
        assert.deepStrictEqual(result.overrides, [
            { identifiers: ['c'], contents: { a: 2, b: 2 }, keys: ['a', 'b'] },
        ]);
        assert.deepStrictEqual(result.override('c').contents, { a: 2, b: 2 });
        assert.deepStrictEqual(result.keys, ['a.b']);
    });
    test('recursive merge overrides', () => {
        const base = new ConfigurationModel({ a: { b: 1 }, f: 1 }, ['a.b', 'f'], [{ identifiers: ['c'], contents: { a: { d: 1 } }, keys: ['a'] }], undefined, new NullLogService());
        const add = new ConfigurationModel({ a: { b: 2 } }, ['a.b'], [{ identifiers: ['c'], contents: { a: { e: 2 } }, keys: ['a'] }], undefined, new NullLogService());
        const result = base.merge(add);
        assert.deepStrictEqual(result.contents, { a: { b: 2 }, f: 1 });
        assert.deepStrictEqual(result.overrides, [
            { identifiers: ['c'], contents: { a: { d: 1, e: 2 } }, keys: ['a'] },
        ]);
        assert.deepStrictEqual(result.override('c').contents, { a: { b: 2, d: 1, e: 2 }, f: 1 });
        assert.deepStrictEqual(result.keys, ['a.b', 'f']);
    });
    test('Test contents while getting an existing property', () => {
        let testObject = new ConfigurationModel({ a: 1 }, [], [], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.getValue('a'), 1);
        testObject = new ConfigurationModel({ a: { b: 1 } }, [], [], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.getValue('a'), { b: 1 });
    });
    test('Test contents are undefined for non existing properties', () => {
        const testObject = new ConfigurationModel({ awesome: true }, [], [], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.getValue('unknownproperty'), undefined);
    });
    test('Test override gives all content merged with overrides', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, [], [{ identifiers: ['b'], contents: { a: 2 }, keys: ['a'] }], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.override('b').contents, { a: 2, c: 1 });
    });
    test('Test override when an override has multiple identifiers', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], undefined, new NullLogService());
        let actual = testObject.override('x');
        assert.deepStrictEqual(actual.contents, { a: 2, c: 1 });
        assert.deepStrictEqual(actual.keys, ['a', 'c']);
        assert.deepStrictEqual(testObject.getKeysForOverrideIdentifier('x'), ['a']);
        actual = testObject.override('y');
        assert.deepStrictEqual(actual.contents, { a: 2, c: 1 });
        assert.deepStrictEqual(actual.keys, ['a', 'c']);
        assert.deepStrictEqual(testObject.getKeysForOverrideIdentifier('y'), ['a']);
    });
    test('Test override when an identifier is defined in multiple overrides', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [
            { identifiers: ['x'], contents: { a: 3, b: 1 }, keys: ['a', 'b'] },
            { identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] },
        ], undefined, new NullLogService());
        const actual = testObject.override('x');
        assert.deepStrictEqual(actual.contents, { a: 3, c: 1, b: 1 });
        assert.deepStrictEqual(actual.keys, ['a', 'c']);
        assert.deepStrictEqual(testObject.getKeysForOverrideIdentifier('x'), ['a', 'b']);
    });
    test('Test merge when configuration models have multiple identifiers', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [
            { identifiers: ['y'], contents: { c: 1 }, keys: ['c'] },
            { identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] },
        ], undefined, new NullLogService());
        const target = new ConfigurationModel({ a: 2, b: 1 }, ['a', 'b'], [
            { identifiers: ['x'], contents: { a: 3, b: 2 }, keys: ['a', 'b'] },
            { identifiers: ['x', 'y'], contents: { b: 3 }, keys: ['b'] },
        ], undefined, new NullLogService());
        const actual = testObject.merge(target);
        assert.deepStrictEqual(actual.contents, { a: 2, c: 1, b: 1 });
        assert.deepStrictEqual(actual.keys, ['a', 'c', 'b']);
        assert.deepStrictEqual(actual.overrides, [
            { identifiers: ['y'], contents: { c: 1 }, keys: ['c'] },
            { identifiers: ['x', 'y'], contents: { a: 2, b: 3 }, keys: ['a', 'b'] },
            { identifiers: ['x'], contents: { a: 3, b: 2 }, keys: ['a', 'b'] },
        ]);
    });
    test('inspect when raw is same', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [{ identifiers: ['x', 'y'], contents: { a: 2, b: 1 }, keys: ['a'] }], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.inspect('a'), {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('a', 'x'), {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('b', 'x'), {
            value: undefined,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(testObject.inspect('d'), {
            value: undefined,
            override: undefined,
            merged: undefined,
            overrides: undefined,
        });
    });
    test('inspect when raw is not same', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 1,
            d: 3,
            '[x][y]': {
                a: 2,
                b: 1,
            },
        }, new NullLogService());
        assert.deepStrictEqual(testObject.inspect('a'), {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('a', 'x'), {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('b', 'x'), {
            value: 2,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(testObject.inspect('d'), {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(testObject.inspect('e'), {
            value: undefined,
            override: undefined,
            merged: undefined,
            overrides: undefined,
        });
    });
    test('inspect in merged configuration when raw is same', () => {
        const target1 = new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], undefined, new NullLogService());
        const target2 = new ConfigurationModel({ b: 3 }, ['b'], [], undefined, new NullLogService());
        const testObject = target1.merge(target2);
        assert.deepStrictEqual(testObject.inspect('a'), {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('a', 'x'), {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('b'), {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(testObject.inspect('b', 'y'), {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(testObject.inspect('c'), {
            value: undefined,
            override: undefined,
            merged: undefined,
            overrides: undefined,
        });
    });
    test('inspect in merged configuration when raw is not same for one model', () => {
        const target1 = new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 3,
            '[x][y]': {
                a: 2,
                b: 4,
            },
        }, new NullLogService());
        const target2 = new ConfigurationModel({ b: 3 }, ['b'], [], undefined, new NullLogService());
        const testObject = target1.merge(target2);
        assert.deepStrictEqual(testObject.inspect('a'), {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('a', 'x'), {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(testObject.inspect('b'), {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(testObject.inspect('b', 'y'), {
            value: 3,
            override: 4,
            merged: 4,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(testObject.inspect('c'), {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
    });
    test('inspect: return all overrides', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [
            { identifiers: ['x', 'y'], contents: { a: 2, b: 1 }, keys: ['a', 'b'] },
            { identifiers: ['x'], contents: { a: 3 }, keys: ['a'] },
            { identifiers: ['y'], contents: { b: 3 }, keys: ['b'] },
        ], undefined, new NullLogService());
        assert.deepStrictEqual(testObject.inspect('a').overrides, [
            { identifiers: ['x', 'y'], value: 2 },
            { identifiers: ['x'], value: 3 },
        ]);
    });
    test('inspect when no overrides', () => {
        const testObject = new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [], undefined, new NullLogService());
        assert.strictEqual(testObject.inspect('a').overrides, undefined);
    });
});
suite('CustomConfigurationModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple merge using models', () => {
        const base = new ConfigurationModelParser('base', new NullLogService());
        base.parse(JSON.stringify({ a: 1, b: 2 }));
        const add = new ConfigurationModelParser('add', new NullLogService());
        add.parse(JSON.stringify({ a: 3, c: 4 }));
        const result = base.configurationModel.merge(add.configurationModel);
        assert.deepStrictEqual(result.contents, { a: 3, b: 2, c: 4 });
    });
    test('simple merge with an undefined contents', () => {
        let base = new ConfigurationModelParser('base', new NullLogService());
        base.parse(JSON.stringify({ a: 1, b: 2 }));
        let add = new ConfigurationModelParser('add', new NullLogService());
        let result = base.configurationModel.merge(add.configurationModel);
        assert.deepStrictEqual(result.contents, { a: 1, b: 2 });
        base = new ConfigurationModelParser('base', new NullLogService());
        add = new ConfigurationModelParser('add', new NullLogService());
        add.parse(JSON.stringify({ a: 1, b: 2 }));
        result = base.configurationModel.merge(add.configurationModel);
        assert.deepStrictEqual(result.contents, { a: 1, b: 2 });
        base = new ConfigurationModelParser('base', new NullLogService());
        add = new ConfigurationModelParser('add', new NullLogService());
        result = base.configurationModel.merge(add.configurationModel);
        assert.deepStrictEqual(result.contents, {});
    });
    test('Recursive merge using config models', () => {
        const base = new ConfigurationModelParser('base', new NullLogService());
        base.parse(JSON.stringify({ a: { b: 1 } }));
        const add = new ConfigurationModelParser('add', new NullLogService());
        add.parse(JSON.stringify({ a: { b: 2 } }));
        const result = base.configurationModel.merge(add.configurationModel);
        assert.deepStrictEqual(result.contents, { a: { b: 2 } });
    });
    test('Test contents while getting an existing property', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        testObject.parse(JSON.stringify({ a: 1 }));
        assert.deepStrictEqual(testObject.configurationModel.getValue('a'), 1);
        testObject.parse(JSON.stringify({ a: { b: 1 } }));
        assert.deepStrictEqual(testObject.configurationModel.getValue('a'), { b: 1 });
    });
    test('Test contents are undefined for non existing properties', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        testObject.parse(JSON.stringify({
            awesome: true,
        }));
        assert.deepStrictEqual(testObject.configurationModel.getValue('unknownproperty'), undefined);
    });
    test('Test contents are undefined for undefined config', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        assert.deepStrictEqual(testObject.configurationModel.getValue('unknownproperty'), undefined);
    });
    test('Test configWithOverrides gives all content merged with overrides', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        testObject.parse(JSON.stringify({ a: 1, c: 1, '[b]': { a: 2 } }));
        assert.deepStrictEqual(testObject.configurationModel.override('b').contents, {
            a: 2,
            c: 1,
            '[b]': { a: 2 },
        });
    });
    test('Test configWithOverrides gives empty contents', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        assert.deepStrictEqual(testObject.configurationModel.override('b').contents, {});
    });
    test('Test update with empty data', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        testObject.parse('');
        assert.deepStrictEqual(testObject.configurationModel.contents, Object.create(null));
        assert.deepStrictEqual(testObject.configurationModel.keys, []);
        testObject.parse(null);
        assert.deepStrictEqual(testObject.configurationModel.contents, Object.create(null));
        assert.deepStrictEqual(testObject.configurationModel.keys, []);
        testObject.parse(undefined);
        assert.deepStrictEqual(testObject.configurationModel.contents, Object.create(null));
        assert.deepStrictEqual(testObject.configurationModel.keys, []);
    });
    test('Test empty property is not ignored', () => {
        const testObject = new ConfigurationModelParser('test', new NullLogService());
        testObject.parse(JSON.stringify({ '': 1 }));
        // deepStrictEqual seems to ignore empty properties, fall back
        // to comparing the output of JSON.stringify
        assert.strictEqual(JSON.stringify(testObject.configurationModel.contents), JSON.stringify({ '': 1 }));
        assert.deepStrictEqual(testObject.configurationModel.keys, ['']);
    });
});
export class TestConfiguration extends Configuration {
    constructor(defaultConfiguration, policyConfiguration, applicationConfiguration, localUserConfiguration, remoteUserConfiguration) {
        super(defaultConfiguration, policyConfiguration, applicationConfiguration, localUserConfiguration, remoteUserConfiguration ?? ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), new NullLogService());
    }
}
suite('Configuration', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Test inspect for overrideIdentifiers', () => {
        const defaultConfigurationModel = parseConfigurationModel({
            '[l1]': { a: 1 },
            '[l2]': { b: 1 },
        });
        const userConfigurationModel = parseConfigurationModel({ '[l3]': { a: 2 } });
        const workspaceConfigurationModel = parseConfigurationModel({
            '[l1]': { a: 3 },
            '[l4]': { a: 3 },
        });
        const testObject = new TestConfiguration(defaultConfigurationModel, ConfigurationModel.createEmptyModel(new NullLogService()), userConfigurationModel, workspaceConfigurationModel);
        const { overrideIdentifiers } = testObject.inspect('a', {}, undefined);
        assert.deepStrictEqual(overrideIdentifiers, ['l1', 'l3', 'l4']);
    });
    test('Test update value', () => {
        const parser = new ConfigurationModelParser('test', new NullLogService());
        parser.parse(JSON.stringify({ a: 1 }));
        const testObject = new TestConfiguration(parser.configurationModel, ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateValue('a', 2);
        assert.strictEqual(testObject.getValue('a', {}, undefined), 2);
    });
    test('Test update value after inspect', () => {
        const parser = new ConfigurationModelParser('test', new NullLogService());
        parser.parse(JSON.stringify({ a: 1 }));
        const testObject = new TestConfiguration(parser.configurationModel, ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.inspect('a', {}, undefined);
        testObject.updateValue('a', 2);
        assert.strictEqual(testObject.getValue('a', {}, undefined), 2);
    });
    test('Test compare and update default configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateDefaultConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'on',
        }));
        const actual = testObject.compareAndUpdateDefaultConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'off',
            '[markdown]': {
                'editor.wordWrap': 'off',
            },
        }), ['editor.lineNumbers', '[markdown]']);
        assert.deepStrictEqual(actual, {
            keys: ['editor.lineNumbers', '[markdown]'],
            overrides: [['markdown', ['editor.wordWrap']]],
        });
    });
    test('Test compare and update application configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateApplicationConfiguration(toConfigurationModel({
            'update.mode': 'on',
        }));
        const actual = testObject.compareAndUpdateApplicationConfiguration(toConfigurationModel({
            'update.mode': 'none',
            '[typescript]': {
                'editor.wordWrap': 'off',
            },
        }));
        assert.deepStrictEqual(actual, {
            keys: ['[typescript]', 'update.mode'],
            overrides: [['typescript', ['editor.wordWrap']]],
        });
    });
    test('Test compare and update user configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateLocalUserConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'off',
            'editor.fontSize': 12,
            '[typescript]': {
                'editor.wordWrap': 'off',
            },
        }));
        const actual = testObject.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'on',
            'window.zoomLevel': 1,
            '[typescript]': {
                'editor.wordWrap': 'on',
                'editor.insertSpaces': false,
            },
        }));
        assert.deepStrictEqual(actual, {
            keys: ['window.zoomLevel', 'editor.lineNumbers', '[typescript]', 'editor.fontSize'],
            overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]],
        });
    });
    test('Test compare and update workspace configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateWorkspaceConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'off',
            'editor.fontSize': 12,
            '[typescript]': {
                'editor.wordWrap': 'off',
            },
        }));
        const actual = testObject.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'on',
            'window.zoomLevel': 1,
            '[typescript]': {
                'editor.wordWrap': 'on',
                'editor.insertSpaces': false,
            },
        }));
        assert.deepStrictEqual(actual, {
            keys: ['window.zoomLevel', 'editor.lineNumbers', '[typescript]', 'editor.fontSize'],
            overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]],
        });
    });
    test('Test compare and update workspace folder configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({
            'editor.lineNumbers': 'off',
            'editor.fontSize': 12,
            '[typescript]': {
                'editor.wordWrap': 'off',
            },
        }));
        const actual = testObject.compareAndUpdateFolderConfiguration(URI.file('file1'), toConfigurationModel({
            'editor.lineNumbers': 'on',
            'window.zoomLevel': 1,
            '[typescript]': {
                'editor.wordWrap': 'on',
                'editor.insertSpaces': false,
            },
        }));
        assert.deepStrictEqual(actual, {
            keys: ['window.zoomLevel', 'editor.lineNumbers', '[typescript]', 'editor.fontSize'],
            overrides: [['typescript', ['editor.insertSpaces', 'editor.wordWrap']]],
        });
    });
    test('Test compare and delete workspace folder configuration', () => {
        const testObject = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        testObject.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({
            'editor.lineNumbers': 'off',
            'editor.fontSize': 12,
            '[typescript]': {
                'editor.wordWrap': 'off',
            },
        }));
        const actual = testObject.compareAndDeleteFolderConfiguration(URI.file('file1'));
        assert.deepStrictEqual(actual, {
            keys: ['editor.lineNumbers', 'editor.fontSize', '[typescript]'],
            overrides: [['typescript', ['editor.wordWrap']]],
        });
    });
    function parseConfigurationModel(content) {
        const parser = new ConfigurationModelParser('test', new NullLogService());
        parser.parse(JSON.stringify(content));
        return parser.configurationModel;
    }
});
suite('ConfigurationChangeEvent', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('changeEvent affecting keys with new configuration', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            'window.zoomLevel': 1,
            'workbench.editor.enablePreview': false,
            'files.autoSave': 'off',
        }));
        const testObject = new ConfigurationChangeEvent(change, undefined, configuration, undefined, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], ['window.zoomLevel', 'workbench.editor.enablePreview', 'files.autoSave']);
        assert.ok(testObject.affectsConfiguration('window.zoomLevel'));
        assert.ok(testObject.affectsConfiguration('window'));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview'));
        assert.ok(testObject.affectsConfiguration('workbench.editor'));
        assert.ok(testObject.affectsConfiguration('workbench'));
        assert.ok(testObject.affectsConfiguration('files'));
        assert.ok(testObject.affectsConfiguration('files.autoSave'));
        assert.ok(!testObject.affectsConfiguration('files.exclude'));
        assert.ok(!testObject.affectsConfiguration('[markdown]'));
        assert.ok(!testObject.affectsConfiguration('editor'));
    });
    test('changeEvent affecting keys when configuration changed', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        configuration.updateLocalUserConfiguration(toConfigurationModel({
            'window.zoomLevel': 2,
            'workbench.editor.enablePreview': true,
            'files.autoSave': 'off',
        }));
        const data = configuration.toData();
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            'window.zoomLevel': 1,
            'workbench.editor.enablePreview': false,
            'files.autoSave': 'off',
        }));
        const testObject = new ConfigurationChangeEvent(change, { data }, configuration, undefined, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], ['window.zoomLevel', 'workbench.editor.enablePreview']);
        assert.ok(testObject.affectsConfiguration('window.zoomLevel'));
        assert.ok(testObject.affectsConfiguration('window'));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview'));
        assert.ok(testObject.affectsConfiguration('workbench.editor'));
        assert.ok(testObject.affectsConfiguration('workbench'));
        assert.ok(!testObject.affectsConfiguration('files'));
        assert.ok(!testObject.affectsConfiguration('[markdown]'));
        assert.ok(!testObject.affectsConfiguration('editor'));
    });
    test('changeEvent affecting overrides with new configuration', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            'files.autoSave': 'off',
            '[markdown]': {
                'editor.wordWrap': 'off',
            },
            '[typescript][jsonc]': {
                'editor.lineNumbers': 'off',
            },
        }));
        const testObject = new ConfigurationChangeEvent(change, undefined, configuration, undefined, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], [
            'files.autoSave',
            '[markdown]',
            '[typescript][jsonc]',
            'editor.wordWrap',
            'editor.lineNumbers',
        ]);
        assert.ok(testObject.affectsConfiguration('files'));
        assert.ok(testObject.affectsConfiguration('files.autoSave'));
        assert.ok(!testObject.affectsConfiguration('files.exclude'));
        assert.ok(testObject.affectsConfiguration('[markdown]'));
        assert.ok(!testObject.affectsConfiguration('[markdown].editor'));
        assert.ok(!testObject.affectsConfiguration('[markdown].workbench'));
        assert.ok(testObject.affectsConfiguration('editor'));
        assert.ok(testObject.affectsConfiguration('editor.wordWrap'));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers'));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'jsonc' }));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'typescript' }));
        assert.ok(testObject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'markdown' }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'jsonc' }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'typescript' }));
        assert.ok(!testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'typescript' }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'jsonc' }));
        assert.ok(!testObject.affectsConfiguration('editor', { overrideIdentifier: 'json' }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'markdown' }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize'));
        assert.ok(!testObject.affectsConfiguration('window'));
    });
    test('changeEvent affecting overrides when configuration changed', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        configuration.updateLocalUserConfiguration(toConfigurationModel({
            'workbench.editor.enablePreview': true,
            '[markdown]': {
                'editor.fontSize': 12,
                'editor.wordWrap': 'off',
            },
            '[css][scss]': {
                'editor.lineNumbers': 'off',
                'css.lint.emptyRules': 'error',
            },
            'files.autoSave': 'off',
        }));
        const data = configuration.toData();
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            'files.autoSave': 'off',
            '[markdown]': {
                'editor.fontSize': 13,
                'editor.wordWrap': 'off',
            },
            '[css][scss]': {
                'editor.lineNumbers': 'relative',
                'css.lint.emptyRules': 'error',
            },
            'window.zoomLevel': 1,
        }));
        const testObject = new ConfigurationChangeEvent(change, { data }, configuration, undefined, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], [
            'window.zoomLevel',
            '[markdown]',
            '[css][scss]',
            'workbench.editor.enablePreview',
            'editor.fontSize',
            'editor.lineNumbers',
        ]);
        assert.ok(!testObject.affectsConfiguration('files'));
        assert.ok(testObject.affectsConfiguration('[markdown]'));
        assert.ok(!testObject.affectsConfiguration('[markdown].editor'));
        assert.ok(!testObject.affectsConfiguration('[markdown].editor.fontSize'));
        assert.ok(!testObject.affectsConfiguration('[markdown].editor.wordWrap'));
        assert.ok(!testObject.affectsConfiguration('[markdown].workbench'));
        assert.ok(testObject.affectsConfiguration('[css][scss]'));
        assert.ok(testObject.affectsConfiguration('editor'));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'css' }));
        assert.ok(testObject.affectsConfiguration('editor', { overrideIdentifier: 'scss' }));
        assert.ok(testObject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'markdown' }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'css' }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'scss' }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'scss' }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'css' }));
        assert.ok(!testObject.affectsConfiguration('editor.lineNumbers', { overrideIdentifier: 'markdown' }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap'));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', { overrideIdentifier: 'markdown' }));
        assert.ok(!testObject.affectsConfiguration('editor', { overrideIdentifier: 'json' }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { overrideIdentifier: 'json' }));
        assert.ok(testObject.affectsConfiguration('window'));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel'));
        assert.ok(testObject.affectsConfiguration('window', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('workbench'));
        assert.ok(testObject.affectsConfiguration('workbench.editor'));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview'));
        assert.ok(testObject.affectsConfiguration('workbench', { overrideIdentifier: 'markdown' }));
        assert.ok(testObject.affectsConfiguration('workbench.editor', { overrideIdentifier: 'markdown' }));
    });
    test('changeEvent affecting workspace folders', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        configuration.updateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'custom' }));
        configuration.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'window.zoomLevel': 2, 'window.restoreFullscreen': true }));
        configuration.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({
            'workbench.editor.enablePreview': true,
            'window.restoreWindows': true,
        }));
        const data = configuration.toData();
        const workspace = new Workspace('a', [
            new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }),
            new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('folder2') }),
            new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') }),
        ]);
        const change = mergeChanges(configuration.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'native' })), configuration.compareAndUpdateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'window.zoomLevel': 1, 'window.restoreFullscreen': false })), configuration.compareAndUpdateFolderConfiguration(URI.file('folder2'), toConfigurationModel({
            'workbench.editor.enablePreview': false,
            'window.restoreWindows': false,
        })));
        const testObject = new ConfigurationChangeEvent(change, { data, workspace }, configuration, workspace, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], [
            'window.title',
            'window.zoomLevel',
            'window.restoreFullscreen',
            'workbench.editor.enablePreview',
            'window.restoreWindows',
        ]);
        assert.ok(testObject.affectsConfiguration('window.zoomLevel'));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel', { resource: URI.file('folder1') }));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(!testObject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('window.zoomLevel', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('window.zoomLevel', {
            resource: URI.file(join('folder3', 'file3')),
        }));
        assert.ok(testObject.affectsConfiguration('window.restoreFullscreen'));
        assert.ok(testObject.affectsConfiguration('window.restoreFullscreen', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(testObject.affectsConfiguration('window.restoreFullscreen', {
            resource: URI.file('folder1'),
        }));
        assert.ok(!testObject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('window.restoreFullscreen', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('window.restoreFullscreen', {
            resource: URI.file(join('folder3', 'file3')),
        }));
        assert.ok(testObject.affectsConfiguration('window.restoreWindows'));
        assert.ok(testObject.affectsConfiguration('window.restoreWindows', { resource: URI.file('folder2') }));
        assert.ok(testObject.affectsConfiguration('window.restoreWindows', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('window.restoreWindows', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(!testObject.affectsConfiguration('window.restoreWindows', {
            resource: URI.file(join('folder3', 'file3')),
        }));
        assert.ok(testObject.affectsConfiguration('window.title'));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('folder1') }));
        assert.ok(testObject.affectsConfiguration('window.title', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('folder2') }));
        assert.ok(testObject.affectsConfiguration('window.title', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('folder3') }));
        assert.ok(testObject.affectsConfiguration('window.title', {
            resource: URI.file(join('folder3', 'file3')),
        }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('file3') }));
        assert.ok(testObject.affectsConfiguration('window'));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('folder1') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file(join('folder1', 'file1')) }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('folder2') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file(join('folder2', 'file2')) }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('folder3') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file(join('folder3', 'file3')) }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('file3') }));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview'));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file('folder2'),
        }));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file('folder1'),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file('folder3'),
        }));
        assert.ok(testObject.affectsConfiguration('workbench.editor'));
        assert.ok(testObject.affectsConfiguration('workbench.editor', { resource: URI.file('folder2') }));
        assert.ok(testObject.affectsConfiguration('workbench.editor', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor', { resource: URI.file('folder1') }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor', {
            resource: URI.file(join('folder1', 'file1')),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor', { resource: URI.file('folder3') }));
        assert.ok(testObject.affectsConfiguration('workbench'));
        assert.ok(testObject.affectsConfiguration('workbench', { resource: URI.file('folder2') }));
        assert.ok(testObject.affectsConfiguration('workbench', {
            resource: URI.file(join('folder2', 'file2')),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench', { resource: URI.file('folder1') }));
        assert.ok(!testObject.affectsConfiguration('workbench', { resource: URI.file('folder3') }));
        assert.ok(!testObject.affectsConfiguration('files'));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file('folder1') }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file(join('folder1', 'file1')) }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file('folder2') }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file(join('folder2', 'file2')) }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file('folder3') }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file(join('folder3', 'file3')) }));
    });
    test('changeEvent - all', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        configuration.updateFolderConfiguration(URI.file('file1'), toConfigurationModel({ 'window.zoomLevel': 2, 'window.restoreFullscreen': true }));
        const data = configuration.toData();
        const change = mergeChanges(configuration.compareAndUpdateDefaultConfiguration(toConfigurationModel({
            'editor.lineNumbers': 'off',
            '[markdown]': {
                'editor.wordWrap': 'off',
            },
        }), ['editor.lineNumbers', '[markdown]']), configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            '[json]': {
                'editor.lineNumbers': 'relative',
            },
        })), configuration.compareAndUpdateWorkspaceConfiguration(toConfigurationModel({ 'window.title': 'custom' })), configuration.compareAndDeleteFolderConfiguration(URI.file('file1')), configuration.compareAndUpdateFolderConfiguration(URI.file('file2'), toConfigurationModel({
            'workbench.editor.enablePreview': true,
            'window.restoreWindows': true,
        })));
        const workspace = new Workspace('a', [
            new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('file1') }),
            new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('file2') }),
            new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') }),
        ]);
        const testObject = new ConfigurationChangeEvent(change, { data, workspace }, configuration, workspace, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], [
            'editor.lineNumbers',
            '[markdown]',
            '[json]',
            'window.title',
            'window.zoomLevel',
            'window.restoreFullscreen',
            'workbench.editor.enablePreview',
            'window.restoreWindows',
            'editor.wordWrap',
        ]);
        assert.ok(testObject.affectsConfiguration('window.title'));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('window.title', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window'));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('window', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel'));
        assert.ok(testObject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('window.zoomLevel', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window.restoreFullscreen'));
        assert.ok(testObject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('window.restoreFullscreen', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('window.restoreWindows'));
        assert.ok(testObject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('window.restoreWindows', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview'));
        assert.ok(testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file('file2'),
        }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor.enablePreview', {
            resource: URI.file('file1'),
        }));
        assert.ok(testObject.affectsConfiguration('workbench.editor'));
        assert.ok(testObject.affectsConfiguration('workbench.editor', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('workbench.editor', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('workbench'));
        assert.ok(testObject.affectsConfiguration('workbench', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('workbench', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('files'));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('files', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('editor'));
        assert.ok(testObject.affectsConfiguration('editor', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('editor', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file1'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file1'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file1'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file2'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file2'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(testObject.affectsConfiguration('editor', {
            resource: URI.file('file2'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers'));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { resource: URI.file('file1') }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', { resource: URI.file('file2') }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file1'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file1'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file1'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file2'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file2'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(testObject.affectsConfiguration('editor.lineNumbers', {
            resource: URI.file('file2'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(testObject.affectsConfiguration('editor.wordWrap'));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', { resource: URI.file('file2') }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file1'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file1'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file1'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file2'),
            overrideIdentifier: 'json',
        }));
        assert.ok(testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file2'),
            overrideIdentifier: 'markdown',
        }));
        assert.ok(!testObject.affectsConfiguration('editor.wordWrap', {
            resource: URI.file('file2'),
            overrideIdentifier: 'typescript',
        }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize'));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { resource: URI.file('file1') }));
        assert.ok(!testObject.affectsConfiguration('editor.fontSize', { resource: URI.file('file2') }));
    });
    test('changeEvent affecting tasks and launches', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({
            launch: {
                configuraiton: {},
            },
            'launch.version': 1,
            tasks: {
                version: 2,
            },
        }));
        const testObject = new ConfigurationChangeEvent(change, undefined, configuration, undefined, new NullLogService());
        assert.deepStrictEqual([...testObject.affectedKeys], ['launch', 'launch.version', 'tasks']);
        assert.ok(testObject.affectsConfiguration('launch'));
        assert.ok(testObject.affectsConfiguration('launch.version'));
        assert.ok(testObject.affectsConfiguration('tasks'));
    });
    test('affectsConfiguration returns false for empty string', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()));
        const change = configuration.compareAndUpdateLocalUserConfiguration(toConfigurationModel({ 'window.zoomLevel': 1 }));
        const testObject = new ConfigurationChangeEvent(change, undefined, configuration, undefined, new NullLogService());
        assert.strictEqual(false, testObject.affectsConfiguration(''));
    });
});
suite('Configuration.Parse', () => {
    const logService = new NullLogService();
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parsing configuration only with local user configuration and raw is same', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [{ identifiers: ['x', 'y'], contents: { a: 2, b: 1 }, keys: ['a'] }], undefined, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: undefined,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).user, {
            value: undefined,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).user, undefined);
    });
    test('parsing configuration only with local user configuration and raw is not same', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ a: 1, c: 1 }, ['a', 'c'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 1,
            d: 3,
            '[x][y]': {
                a: 2,
                b: 1,
            },
        }, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 2,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('e', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('e', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'x' }, undefined).user, {
            value: 2,
            override: 1,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 1 }],
        });
        assert.deepStrictEqual(actual.inspect('d', {}, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('e', {}, undefined).user, undefined);
    });
    test('parsing configuration with local and remote user configuration and raw is same for both', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], undefined, logService), new ConfigurationModel({ b: 3 }, ['b'], [], undefined, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).user, undefined);
    });
    test('parsing configuration with local and remote user configuration and raw is not same for local user', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 3,
            '[x][y]': {
                a: 2,
                b: 4,
            },
        }, logService), new ConfigurationModel({ b: 3 }, ['b'], [], undefined, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userLocal, {
            value: 2,
            override: undefined,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userLocal, {
            value: 2,
            override: 4,
            merged: 4,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userRemote, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).user, {
            value: 3,
            merged: 3,
            override: undefined,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).user, undefined);
    });
    test('parsing configuration with local and remote user configuration and raw is not same for remote user', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ b: 3 }, ['b'], [], undefined, logService), new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 3,
            '[x][y]': {
                a: 2,
                b: 4,
            },
        }, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userRemote, {
            value: 2,
            override: undefined,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userRemote, {
            value: 2,
            override: 4,
            merged: 4,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).user, undefined);
    });
    test('parsing configuration with local and remote user configuration and raw is not same for both', () => {
        const configuration = new TestConfiguration(ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ConfigurationModel({ b: 3 }, ['b'], [], {
            a: 4,
            b: 3,
        }, logService), new ConfigurationModel({ a: 1 }, ['a'], [{ identifiers: ['x', 'y'], contents: { a: 2 }, keys: ['a'] }], {
            a: 1,
            b: 2,
            c: 3,
            '[x][y]': {
                a: 2,
                b: 4,
            },
        }, logService));
        const actual = Configuration.parse(configuration.toData(), logService);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userLocal, {
            value: 4,
            override: undefined,
            merged: 4,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userLocal, {
            value: 4,
            override: undefined,
            merged: 4,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userLocal, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userLocal, undefined);
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).userRemote, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).userRemote, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).userRemote, {
            value: 2,
            override: undefined,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).userRemote, {
            value: 2,
            override: 4,
            merged: 4,
            overrides: [{ identifiers: ['x', 'y'], value: 4 }],
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).userRemote, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('a', {}, undefined).user, {
            value: 1,
            override: undefined,
            merged: 1,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('a', { overrideIdentifier: 'x' }, undefined).user, {
            value: 1,
            override: 2,
            merged: 2,
            overrides: [{ identifiers: ['x', 'y'], value: 2 }],
        });
        assert.deepStrictEqual(actual.inspect('b', {}, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('b', { overrideIdentifier: 'y' }, undefined).user, {
            value: 3,
            override: undefined,
            merged: 3,
            overrides: undefined,
        });
        assert.deepStrictEqual(actual.inspect('c', {}, undefined).user, undefined);
    });
});
function toConfigurationModel(obj) {
    const parser = new ConfigurationModelParser('test', new NullLogService());
    parser.parse(JSON.stringify(obj));
    return parser.configurationModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL3Rlc3QvY29tbW9uL2NvbmZpZ3VyYXRpb25Nb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLGFBQWEsRUFDYix3QkFBd0IsRUFDeEIsa0JBQWtCLEVBQ2xCLHdCQUF3QixFQUN4QixZQUFZLEdBQ1osTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTNFLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO1lBQ25G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QyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtRQUNyRixNQUFNLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUN4QyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ3JCLEVBQUUsRUFDRixDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUMzRSxFQUFFLEVBQ0YsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzdGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdGQUFnRixFQUFFLEdBQUcsRUFBRTtRQUMzRixNQUFNLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUN4QyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ3JCLEVBQUUsRUFDRixDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxH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QyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0MsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0MsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxTQUFTO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLFVBQVUs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QUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FDdkYsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUYsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFO1lBQzVDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDNUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FDUixDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVB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QTtRQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDekMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLGtCQUFrQixFQUFFLE1BQU07U0FDMUIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDekMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLGtCQUFrQixFQUFFLFVBQVU7U0FDOUIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDekMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLGtCQUFrQixFQUFFLFlBQVk7U0FDaEMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDekMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzNCLGtCQUFrQixFQUFFLE1BQU07U0FDMUIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUU7WUFDekMs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Q0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRTtZQUM3RixLQUFLLEVBQUUsQ0FBQztZQUNSLFFBQVEsRUFBRSxDQUFDO1lBQ1gsTUFBTSxFQUFFLENBQUM7WUFDVCxTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDbEQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ3BFLEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLFNBQVM7WUFDbkIsTUFBTSxFQUFFLENBQUM7WUFDVCxTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDbEQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRTtZQUM3RixLQUFLLEVBQUUsQ0FBQztZQUNSLFFBQVEsRUFBRSxDQUFDO1lBQ1gsTUFBTSxFQUFFLENBQUM7WUFDVCxTQUFTLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDbEQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFD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LEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQzlGLEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxVQUFVLEVBQUU7WUFDckUsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsVUFBVSxFQUFFO1lBQzlGLEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENB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