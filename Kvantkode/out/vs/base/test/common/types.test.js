/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as types from '../../common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { assertDefined, assertOneOf, typeCheck } from '../../common/types.js';
suite('Types', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('isFunction', () => {
        assert(!types.isFunction(undefined));
        assert(!types.isFunction(null));
        assert(!types.isFunction('foo'));
        assert(!types.isFunction(5));
        assert(!types.isFunction(true));
        assert(!types.isFunction([]));
        assert(!types.isFunction([1, 2, '3']));
        assert(!types.isFunction({}));
        assert(!types.isFunction({ foo: 'bar' }));
        assert(!types.isFunction(/test/));
        assert(!types.isFunction(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert(types.isFunction(assert));
        assert(types.isFunction(function foo() {
            /**/
        }));
    });
    test('areFunctions', () => {
        assert(!types.areFunctions());
        assert(!types.areFunctions(null));
        assert(!types.areFunctions('foo'));
        assert(!types.areFunctions(5));
        assert(!types.areFunctions(true));
        assert(!types.areFunctions([]));
        assert(!types.areFunctions([1, 2, '3']));
        assert(!types.areFunctions({}));
        assert(!types.areFunctions({ foo: 'bar' }));
        assert(!types.areFunctions(/test/));
        assert(!types.areFunctions(new RegExp('')));
        assert(!types.areFunctions(new Date()));
        assert(!types.areFunctions(assert, ''));
        assert(types.areFunctions(assert));
        assert(types.areFunctions(assert, assert));
        assert(types.areFunctions(function foo() {
            /**/
        }));
    });
    test('isObject', () => {
        assert(!types.isObject(undefined));
        assert(!types.isObject(null));
        assert(!types.isObject('foo'));
        assert(!types.isObject(5));
        assert(!types.isObject(true));
        assert(!types.isObject([]));
        assert(!types.isObject([1, 2, '3']));
        assert(!types.isObject(/test/));
        assert(!types.isObject(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert.strictEqual(types.isObject(assert), false);
        assert(!types.isObject(function foo() { }));
        assert(types.isObject({}));
        assert(types.isObject({ foo: 'bar' }));
    });
    test('isEmptyObject', () => {
        assert(!types.isEmptyObject(undefined));
        assert(!types.isEmptyObject(null));
        assert(!types.isEmptyObject('foo'));
        assert(!types.isEmptyObject(5));
        assert(!types.isEmptyObject(true));
        assert(!types.isEmptyObject([]));
        assert(!types.isEmptyObject([1, 2, '3']));
        assert(!types.isEmptyObject(/test/));
        assert(!types.isEmptyObject(new RegExp('')));
        assert(!types.isEmptyObject(new Date()));
        assert.strictEqual(types.isEmptyObject(assert), false);
        assert(!types.isEmptyObject(function foo() {
            /**/
        }));
        assert(!types.isEmptyObject({ foo: 'bar' }));
        assert(types.isEmptyObject({}));
    });
    test('isString', () => {
        assert(!types.isString(undefined));
        assert(!types.isString(null));
        assert(!types.isString(5));
        assert(!types.isString([]));
        assert(!types.isString([1, 2, '3']));
        assert(!types.isString(true));
        assert(!types.isString({}));
        assert(!types.isString(/test/));
        assert(!types.isString(new RegExp('')));
        assert(!types.isString(new Date()));
        assert(!types.isString(assert));
        assert(!types.isString(function foo() {
            /**/
        }));
        assert(!types.isString({ foo: 'bar' }));
        assert(types.isString('foo'));
    });
    test('isNumber', () => {
        assert(!types.isNumber(undefined));
        assert(!types.isNumber(null));
        assert(!types.isNumber('foo'));
        assert(!types.isNumber([]));
        assert(!types.isNumber([1, 2, '3']));
        assert(!types.isNumber(true));
        assert(!types.isNumber({}));
        assert(!types.isNumber(/test/));
        assert(!types.isNumber(new RegExp('')));
        assert(!types.isNumber(new Date()));
        assert(!types.isNumber(assert));
        assert(!types.isNumber(function foo() {
            /**/
        }));
        assert(!types.isNumber({ foo: 'bar' }));
        assert(!types.isNumber(parseInt('A', 10)));
        assert(types.isNumber(5));
    });
    test('isUndefined', () => {
        assert(!types.isUndefined(null));
        assert(!types.isUndefined('foo'));
        assert(!types.isUndefined([]));
        assert(!types.isUndefined([1, 2, '3']));
        assert(!types.isUndefined(true));
        assert(!types.isUndefined({}));
        assert(!types.isUndefined(/test/));
        assert(!types.isUndefined(new RegExp('')));
        assert(!types.isUndefined(new Date()));
        assert(!types.isUndefined(assert));
        assert(!types.isUndefined(function foo() {
            /**/
        }));
        assert(!types.isUndefined({ foo: 'bar' }));
        assert(types.isUndefined(undefined));
    });
    test('isUndefinedOrNull', () => {
        assert(!types.isUndefinedOrNull('foo'));
        assert(!types.isUndefinedOrNull([]));
        assert(!types.isUndefinedOrNull([1, 2, '3']));
        assert(!types.isUndefinedOrNull(true));
        assert(!types.isUndefinedOrNull({}));
        assert(!types.isUndefinedOrNull(/test/));
        assert(!types.isUndefinedOrNull(new RegExp('')));
        assert(!types.isUndefinedOrNull(new Date()));
        assert(!types.isUndefinedOrNull(assert));
        assert(!types.isUndefinedOrNull(function foo() {
            /**/
        }));
        assert(!types.isUndefinedOrNull({ foo: 'bar' }));
        assert(types.isUndefinedOrNull(undefined));
        assert(types.isUndefinedOrNull(null));
    });
    test('assertIsDefined / assertAreDefined', () => {
        assert.throws(() => types.assertIsDefined(undefined));
        assert.throws(() => types.assertIsDefined(null));
        assert.throws(() => types.assertAllDefined(null, undefined));
        assert.throws(() => types.assertAllDefined(true, undefined));
        assert.throws(() => types.assertAllDefined(undefined, false));
        assert.strictEqual(types.assertIsDefined(true), true);
        assert.strictEqual(types.assertIsDefined(false), false);
        assert.strictEqual(types.assertIsDefined('Hello'), 'Hello');
        assert.strictEqual(types.assertIsDefined(''), '');
        const res = types.assertAllDefined(1, true, 'Hello');
        assert.strictEqual(res[0], 1);
        assert.strictEqual(res[1], true);
        assert.strictEqual(res[2], 'Hello');
    });
    suite('assertDefined', () => {
        test('should not throw if `value` is defined (bool)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(true, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (number)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(5, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (zero)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(0, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('some string', 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (empty string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('', 'Oops something happened.');
            });
        });
        /**
         * Note! API of `assert.throws()` is different in the browser
         * and in Node.js, and it is not possible to use the same code
         * here. Therefore we had to resort to the manual try/catch.
         */
        const assertThrows = (testFunction, errorMessage) => {
            let thrownError;
            try {
                testFunction();
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        };
        test('should throw if `value` is `null`', async () => {
            const errorMessage = 'Uggh ohh!';
            assertThrows(() => {
                assertDefined(null, errorMessage);
            }, errorMessage);
        });
        test('should throw if `value` is `undefined`', async () => {
            const errorMessage = 'Oh no!';
            assertThrows(() => {
                assertDefined(undefined, new Error(errorMessage));
            }, errorMessage);
        });
        test('should throw assertion error by default', async () => {
            const errorMessage = 'Uggh ohh!';
            let thrownError;
            try {
                assertDefined(null, errorMessage);
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
        test('should throw provided error instance', async () => {
            class TestError extends Error {
                constructor(...args) {
                    super(...args);
                    this.name = 'TestError';
                }
            }
            const errorMessage = 'Oops something hapenned.';
            const error = new TestError(errorMessage);
            let thrownError;
            try {
                assertDefined(null, error);
            }
            catch (e) {
                thrownError = e;
            }
            assert(thrownError instanceof TestError, 'Error must be an instance of `TestError`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
    });
    suite('assertOneOf', () => {
        suite('success', () => {
            suite('string', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf('foo', ['foo', 'bar'], 'Foo must be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 'hi';
                        const list = ['hi', 'ciao'];
                        assertOneOf(item, list, 'Hi must be one of: hi, ciao');
                        typeCheck(item);
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(10, [10, 100], '10 must be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 20;
                        const list = [20, 2000];
                        assertOneOf(item, list, '20 must be one of: 20, 2000');
                        typeCheck(item);
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(true, [true, false], 'true must be one of: true, false');
                    });
                    assert.doesNotThrow(() => {
                        assertOneOf(false, [true, false], 'false must be one of: true, false');
                    });
                });
                test('subtype (true)', () => {
                    assert.doesNotThrow(() => {
                        const item = true;
                        const list = [true, true];
                        assertOneOf(item, list, 'true must be one of: true, true');
                        typeCheck(item);
                    });
                });
                test('subtype (false)', () => {
                    assert.doesNotThrow(() => {
                        const item = false;
                        const list = [false, true];
                        assertOneOf(item, list, 'false must be one of: false, true');
                        typeCheck(item);
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(undefined, [undefined], 'undefined must be one of: undefined');
                    });
                    assert.doesNotThrow(() => {
                        assertOneOf(undefined, [void 0], 'undefined must be one of: void 0');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        let item;
                        const list = [undefined];
                        assertOneOf(item, list, 'undefined | null must be one of: undefined');
                        typeCheck(item);
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(null, [null], 'null must be one of: null');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = null;
                        const list = [null];
                        assertOneOf(item, list, 'null must be one of: null');
                        typeCheck(item);
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assertOneOf(item, list, '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('list', () => {
                    assert.doesNotThrow(() => {
                        const item = '5';
                        const list = ['3', '5', '2.5'];
                        assertOneOf(item, list, '5 must be one of: 3, 5, 2.5');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assertOneOf(item, list, '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assertOneOf(item, list, '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assertOneOf(item, list, '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
        });
        suite('failure', () => {
            suite('string', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf('baz', ['foo', 'bar'], 'Baz must not be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = ['hi', 'ciao'];
                        assertOneOf(item, list, 'vitannia must be one of: hi, ciao');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = [];
                        assertOneOf(item, list, 'vitannia must be one of: empty');
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(19, [10, 100], '19 must not be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 24;
                        const list = [20, 2000];
                        assertOneOf(item, list, '24 must not be one of: 20, 2000');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 20;
                        const list = [];
                        assertOneOf(item, list, '20 must not be one of: empty');
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(true, [false], 'true must not be one of: false');
                    });
                    assert.throws(() => {
                        assertOneOf(false, [true], 'false must not be one of: true');
                    });
                });
                test('subtype (true)', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [false];
                        assertOneOf(item, list, 'true must not be one of: false');
                    });
                });
                test('subtype (false)', () => {
                    assert.throws(() => {
                        const item = false;
                        const list = [true, true, true];
                        assertOneOf(item, list, 'false must be one of: true, true, true');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [];
                        assertOneOf(item, list, 'true must be one of: empty');
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(undefined, [], 'undefined must not be one of: empty');
                    });
                    assert.throws(() => {
                        assertOneOf(void 0, [], 'void 0 must not be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        let item;
                        const list = [null];
                        assertOneOf(item, list, 'undefined must be one of: null');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        let item;
                        const list = [];
                        assertOneOf(item, list, 'undefined must be one of: empty');
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(null, [], 'null must be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = null;
                        const list = [];
                        assertOneOf(item, list, 'null must be one of: empty');
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '1';
                        const list = ['3', '4'];
                        assertOneOf(item, list, '1 must not be one of: 3, 4');
                    });
                });
                test('list', () => {
                    assert.throws(() => {
                        const item = '5';
                        const list = ['3', '6', '2.5'];
                        assertOneOf(item, list, '5 must not be one of: 3, 6, 2.5');
                    });
                });
                test('both', () => {
                    assert.throws(() => {
                        const item = '12';
                        const list = ['14.25', '7', '15'];
                        assertOneOf(item, list, '12 must not be one of: 14.25, 7, 15');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = '25';
                        const list = [];
                        assertOneOf(item, list, '25 must not be one of: empty');
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '100';
                        const list = ['12', '11'];
                        assertOneOf(item, list, '100 must not be one of: 12, 11');
                    });
                    test('both', () => {
                        assert.throws(() => {
                            const item = '21';
                            const list = ['14.25', '7', '12'];
                            assertOneOf(item, list, '21 must not be one of: 14.25, 7, 12');
                        });
                    });
                });
            });
        });
    });
    test('validateConstraints', () => {
        types.validateConstraints([1, 'test', true], [Number, String, Boolean]);
        types.validateConstraints([1, 'test', true], ['number', 'string', 'boolean']);
        types.validateConstraints([console.log], [Function]);
        types.validateConstraints([undefined], [types.isUndefined]);
        types.validateConstraints([1], [types.isNumber]);
        class Foo {
        }
        types.validateConstraints([new Foo()], [Foo]);
        function isFoo(f) { }
        assert.throws(() => types.validateConstraints([new Foo()], [isFoo]));
        function isFoo2(f) {
            return true;
        }
        types.validateConstraints([new Foo()], [isFoo2]);
        assert.throws(() => types.validateConstraints([1, true], [types.isNumber, types.isString]));
        assert.throws(() => types.validateConstraints(['2'], [types.isNumber]));
        assert.throws(() => types.validateConstraints([1, 'test', true], [Number, String, Number]));
    });
});
