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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi90ZXN0L2NvbW1vbi9jb25maWd1cmF0aW9uTW9kZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEVBQ3hCLGtCQUFrQixFQUNsQix3QkFBd0IsRUFDeEIsWUFBWSxHQUNaLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUUzRSxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztZQUNuRixFQUFF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QTtJQUVGLElBQUksQ0FBQywwRUFBMEUsRUFBRSxHQUFHLEVBQUU7UUFDckYsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDeEMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNyQixFQUFFLEVBQ0YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFDM0UsRUFBRSxFQUNGLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM3RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxHQUFHLEVBQUU7UUFDM0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDeEMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNyQixFQUFFLEVBQ0YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUNsRixFQUFFLEVBQ0YsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzlGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtGQUErRixFQUFFLEdBQUcsRUFBRTtRQUMxRyxNQUFNLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUN4QyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFDNUIsRUFBRSxFQUNGLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQzNFLEVBQUUsRUFDRixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtGQUFrRixFQUFFLEdBQUcsRUFBRTtRQUM3RixNQUFNLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUN4QyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFDNUIsRUFBRSxFQUNGLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUNuRCxFQUFFLEVBQ0YsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN4RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1RkFBdUYsRUFBRSxHQUFHLEVBQUU7UUFDbEcsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDeEMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQzVCLEVBQUUsRUFDRixDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFDaEQsRUFBRSxFQUNGLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDeEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFrQixDQUNsQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNkLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUNWLEVBQUUsRUFDRixTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksa0JBQWtCLENBQ2pDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1YsRUFBRSxFQUNGLFNBQVMsRUFDVCxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUU5QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFrQixDQUNsQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1AsRUFBRSxFQUNGLFNBQVMsRUFDVCxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxrQkFBa0IsQ0FDakMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsRUFDRixTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFrQixDQUNsQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1AsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQ3pELFNBQVMsRUFDVCxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxrQkFBa0IsQ0FDakMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUN6RCxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDeEMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUU7U0FDbEUsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxrQkFBa0IsQ0FDbEMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNyQixDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFDWixDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUNoRSxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksa0JBQWtCLENBQ2pDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQ2YsQ0FBQyxLQUFLLENBQUMsRUFDUCxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUNoRSxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtZQUN4QyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7U0FDcEUsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1FBQzdELElBQUksVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuRCxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDeEMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQ2pCLEVBQUUsRUFDRixFQUFFLEVBQ0YsU0FBUyxFQUNULElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUMxRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7UUFDbEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxrQkFBa0IsQ0FDeEMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFDZCxFQUFFLEVBQ0YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQ3pELFNBQVMsRUFDVCxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDMUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseURBQXlELEVBQUUsR0FBRyxFQUFFO1FBQ3BFLE1BQU0sVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQ3hDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUM5RCxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFM0UsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFO1FBQzlFLE1BQU0sVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQ3hDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1Y7WUFDQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNsRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7U0FDNUQsRUFDRCxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRS9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLE1BQU0sVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQ3hDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1Y7WUFDQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2RCxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7U0FDNUQsRUFDRCxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQ3BDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1Y7WUFDQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtZQUNsRSxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7U0FDNUQsRUFDRCxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDeEMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkQsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZFLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1NBQ2xFLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUN4QyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNkLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUNWLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUNwRSxTQUFTLEVBQ1QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQyxLQUFLLEVBQUUsQ0FBQztZQUNSLFFBQVEsRUFBRSxTQUFTO1lBQ25CLE1BQU0sRUFBRSxDQUFDO1lBQ1QsU0FBUyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQ2xELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDcEQsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsQ0FBQztZQUNYLE1BQU0sRUFBRSxDQUFDO1lBQ1QsU0FBUyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQ2xELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDcEQsS0FBSyxFQUFFLFNBQVM7WUFDaEIsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0MsS0FBSyxFQUFFLFNBQVM7WUFDaEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLFNBQVM7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQ3hDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQ2QsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQ1YsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUM5RDtZQUNDLENBQUMsRUFBRSxDQUFDO1lBQ0osQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsQ0FBQztZQUNKLENBQUMsRUFBRSxDQUFDO1lBQ0osUUFBUSxFQUFFO2dCQUNULENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBRSxDQUFDO2FBQ0o7U0FDRCxFQUNELElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0MsS0FBSyxFQUFFLENBQUM7WUFDUixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUNsRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3BELEtBQUssRUFBRSxDQUFDO1lBQ1IsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsQ0FBQztZQUNULFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtB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RUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLEVBQUU7WUFDakUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQzdCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLEVBQUU7WUFDakUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM1QyxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQ1IsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLEVBQUU7WUFDbEUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQzdCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FDUixDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsRUFBRTtZQUNsRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMs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