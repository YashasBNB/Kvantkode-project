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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdHlwZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFN0UsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFDbkIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxD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LENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxLQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHO1lBQ2hDLElBQUk7UUFDTCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUNMLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUc7WUFDM0IsSUFBSTtRQUNMLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV2QyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxD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