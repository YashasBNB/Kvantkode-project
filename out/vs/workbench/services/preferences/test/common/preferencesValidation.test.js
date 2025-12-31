/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createValidator, getInvalidTypeError } from '../../common/preferencesValidation.js';
suite('Preferences Validation', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Tester {
        constructor(settings) {
            this.settings = settings;
            this.validator = createValidator(settings);
        }
        accepts(input) {
            assert.strictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to accept \`${JSON.stringify(input)}\`. Got ${this.validator(input)}.`);
        }
        rejects(input) {
            assert.notStrictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to reject \`${JSON.stringify(input)}\`.`);
            return {
                withMessage: (message) => {
                    const actual = this.validator(input);
                    assert.ok(actual);
                    assert(actual.indexOf(message) > -1, `Expected error of ${JSON.stringify(this.settings)} on \`${input}\` to contain ${message}. Got ${this.validator(input)}.`);
                },
            };
        }
        validatesNumeric() {
            this.accepts('3');
            this.accepts('3.');
            this.accepts('.0');
            this.accepts('3.0');
            this.accepts(' 3.0');
            this.accepts(' 3.0  ');
            this.rejects('3f');
            this.accepts(3);
            this.rejects('test');
        }
        validatesNullableNumeric() {
            this.validatesNumeric();
            this.accepts(0);
            this.accepts('');
            this.accepts(null);
            this.accepts(undefined);
        }
        validatesNonNullableNumeric() {
            this.validatesNumeric();
            this.accepts(0);
            this.rejects('');
            this.rejects(null);
            this.rejects(undefined);
        }
        validatesString() {
            this.accepts('3');
            this.accepts('3.');
            this.accepts('.0');
            this.accepts('3.0');
            this.accepts(' 3.0');
            this.accepts(' 3.0  ');
            this.accepts('');
            this.accepts('3f');
            this.accepts('hello');
            this.rejects(6);
        }
    }
    test('exclusive max and max work together properly', () => {
        {
            const justMax = new Tester({ maximum: 5, type: 'number' });
            justMax.validatesNonNullableNumeric();
            justMax.rejects('5.1');
            justMax.accepts('5.0');
        }
        {
            const justEMax = new Tester({ exclusiveMaximum: 5, type: 'number' });
            justEMax.validatesNonNullableNumeric();
            justEMax.rejects('5.1');
            justEMax.rejects('5.0');
            justEMax.accepts('4.999');
        }
        {
            const bothNumeric = new Tester({ exclusiveMaximum: 5, maximum: 4, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('5.1');
            bothNumeric.rejects('5.0');
            bothNumeric.rejects('4.999');
            bothNumeric.accepts('4');
        }
        {
            const bothNumeric = new Tester({ exclusiveMaximum: 5, maximum: 6, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('5.1');
            bothNumeric.rejects('5.0');
            bothNumeric.accepts('4.999');
        }
    });
    test('exclusive min and min work together properly', () => {
        {
            const justMin = new Tester({ minimum: -5, type: 'number' });
            justMin.validatesNonNullableNumeric();
            justMin.rejects('-5.1');
            justMin.accepts('-5.0');
        }
        {
            const justEMin = new Tester({ exclusiveMinimum: -5, type: 'number' });
            justEMin.validatesNonNullableNumeric();
            justEMin.rejects('-5.1');
            justEMin.rejects('-5.0');
            justEMin.accepts('-4.999');
        }
        {
            const bothNumeric = new Tester({ exclusiveMinimum: -5, minimum: -4, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('-5.1');
            bothNumeric.rejects('-5.0');
            bothNumeric.rejects('-4.999');
            bothNumeric.accepts('-4');
        }
        {
            const bothNumeric = new Tester({ exclusiveMinimum: -5, minimum: -6, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('-5.1');
            bothNumeric.rejects('-5.0');
            bothNumeric.accepts('-4.999');
        }
    });
    test('multiple of works for both integers and fractions', () => {
        {
            const onlyEvens = new Tester({ multipleOf: 2, type: 'number' });
            onlyEvens.accepts('2.0');
            onlyEvens.accepts('2');
            onlyEvens.accepts('-4');
            onlyEvens.accepts('0');
            onlyEvens.accepts('100');
            onlyEvens.rejects('100.1');
            onlyEvens.rejects('');
            onlyEvens.rejects('we');
        }
        {
            const hackyIntegers = new Tester({ multipleOf: 1, type: 'number' });
            hackyIntegers.accepts('2.0');
            hackyIntegers.rejects('.5');
        }
        {
            const halfIntegers = new Tester({ multipleOf: 0.5, type: 'number' });
            halfIntegers.accepts('0.5');
            halfIntegers.accepts('1.5');
            halfIntegers.rejects('1.51');
        }
    });
    test('integer type correctly adds a validation', () => {
        {
            const integers = new Tester({ multipleOf: 1, type: 'integer' });
            integers.accepts('02');
            integers.accepts('2');
            integers.accepts('20');
            integers.rejects('.5');
            integers.rejects('2j');
            integers.rejects('');
        }
    });
    test('null is allowed only when expected', () => {
        {
            const nullableIntegers = new Tester({ type: ['integer', 'null'] });
            nullableIntegers.accepts('2');
            nullableIntegers.rejects('.5');
            nullableIntegers.accepts('2.0');
            nullableIntegers.rejects('2j');
            nullableIntegers.accepts('');
        }
        {
            const nonnullableIntegers = new Tester({ type: ['integer'] });
            nonnullableIntegers.accepts('2');
            nonnullableIntegers.rejects('.5');
            nonnullableIntegers.accepts('2.0');
            nonnullableIntegers.rejects('2j');
            nonnullableIntegers.rejects('');
        }
        {
            const nullableNumbers = new Tester({ type: ['number', 'null'] });
            nullableNumbers.accepts('2');
            nullableNumbers.accepts('.5');
            nullableNumbers.accepts('2.0');
            nullableNumbers.rejects('2j');
            nullableNumbers.accepts('');
        }
        {
            const nonnullableNumbers = new Tester({ type: ['number'] });
            nonnullableNumbers.accepts('2');
            nonnullableNumbers.accepts('.5');
            nonnullableNumbers.accepts('2.0');
            nonnullableNumbers.rejects('2j');
            nonnullableNumbers.rejects('');
        }
    });
    test('string max min length work', () => {
        {
            const min = new Tester({ minLength: 4, type: 'string' });
            min.rejects('123');
            min.accepts('1234');
            min.accepts('12345');
        }
        {
            const max = new Tester({ maxLength: 6, type: 'string' });
            max.accepts('12345');
            max.accepts('123456');
            max.rejects('1234567');
        }
        {
            const minMax = new Tester({ minLength: 4, maxLength: 6, type: 'string' });
            minMax.rejects('123');
            minMax.accepts('1234');
            minMax.accepts('12345');
            minMax.accepts('123456');
            minMax.rejects('1234567');
        }
    });
    test('objects work', () => {
        {
            const obj = new Tester({
                type: 'object',
                properties: { a: { type: 'string', maxLength: 2 } },
                additionalProperties: false,
            });
            obj.rejects({ a: 'string' });
            obj.accepts({ a: 'st' });
            obj.rejects({ a: null });
            obj.rejects({ a: 7 });
            obj.accepts({});
            obj.rejects('test');
            obj.rejects(7);
            obj.rejects([1, 2, 3]);
        }
        {
            const pattern = new Tester({
                type: 'object',
                patternProperties: { '^a[a-z]$': { type: 'string', minLength: 2 } },
                additionalProperties: false,
            });
            pattern.accepts({ ab: 'string' });
            pattern.accepts({ ab: 'string', ac: 'hmm' });
            pattern.rejects({ ab: 'string', ac: 'h' });
            pattern.rejects({ ab: 'string', ac: 99999 });
            pattern.rejects({ abc: 'string' });
            pattern.rejects({ a0: 'string' });
            pattern.rejects({ ab: 'string', bc: 'hmm' });
            pattern.rejects({ be: 'string' });
            pattern.rejects({ be: 'a' });
            pattern.accepts({});
        }
        {
            const pattern = new Tester({
                type: 'object',
                patternProperties: { '^#': { type: 'string', minLength: 3 } },
                additionalProperties: { type: 'string', maxLength: 3 },
            });
            pattern.accepts({ '#ab': 'string' });
            pattern.accepts({ ab: 'str' });
            pattern.rejects({ '#ab': 's' });
            pattern.rejects({ ab: 99999 });
            pattern.rejects({ '#ab': 99999 });
            pattern.accepts({});
        }
        {
            const pattern = new Tester({
                type: 'object',
                properties: { hello: { type: 'string' } },
                additionalProperties: { type: 'boolean' },
            });
            pattern.accepts({ hello: 'world' });
            pattern.accepts({ hello: 'world', bye: false });
            pattern.rejects({ hello: 'world', bye: 'false' });
            pattern.rejects({ hello: 'world', bye: 1 });
            pattern.rejects({ hello: 'world', bye: 'world' });
            pattern.accepts({ hello: 'test' });
            pattern.accepts({});
        }
    });
    test('numerical objects work', () => {
        {
            const obj = new Tester({ type: 'object', properties: { b: { type: 'number' } } });
            obj.accepts({ b: 2.5 });
            obj.accepts({ b: -2.5 });
            obj.accepts({ b: 0 });
            obj.accepts({ b: '0.12' });
            obj.rejects({ b: 'abc' });
            obj.rejects({ b: [] });
            obj.rejects({ b: false });
            obj.rejects({ b: null });
            obj.rejects({ b: undefined });
        }
        {
            const obj = new Tester({
                type: 'object',
                properties: { b: { type: 'integer', minimum: 2, maximum: 5.5 } },
            });
            obj.accepts({ b: 2 });
            obj.accepts({ b: 3 });
            obj.accepts({ b: '3.0' });
            obj.accepts({ b: 5 });
            obj.rejects({ b: 1 });
            obj.rejects({ b: 6 });
            obj.rejects({ b: 5.5 });
        }
    });
    test('patterns work', () => {
        {
            const urls = new Tester({ pattern: '^(hello)*$', type: 'string' });
            urls.accepts('');
            urls.rejects('hel');
            urls.accepts('hello');
            urls.rejects('hellohel');
            urls.accepts('hellohello');
        }
        {
            const urls = new Tester({
                pattern: '^(hello)*$',
                type: 'string',
                patternErrorMessage: 'err: must be friendly',
            });
            urls.accepts('');
            urls.rejects('hel').withMessage('err: must be friendly');
            urls.accepts('hello');
            urls.rejects('hellohel').withMessage('err: must be friendly');
            urls.accepts('hellohello');
        }
        {
            const unicodePattern = new Tester({
                type: 'string',
                pattern: '^[\\p{L}\\d_. -]*$',
                minLength: 3,
            });
            unicodePattern.accepts('_autoload');
            unicodePattern.rejects('#hash');
            unicodePattern.rejects('');
        }
    });
    test('custom error messages are shown', () => {
        const withMessage = new Tester({
            minLength: 1,
            maxLength: 0,
            type: 'string',
            errorMessage: 'always error!',
        });
        withMessage.rejects('').withMessage('always error!');
        withMessage.rejects(' ').withMessage('always error!');
        withMessage.rejects('1').withMessage('always error!');
    });
    class ArrayTester {
        constructor(settings) {
            this.settings = settings;
            this.validator = createValidator(settings);
        }
        accepts(input) {
            assert.strictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to accept \`${JSON.stringify(input)}\`. Got ${this.validator(input)}.`);
        }
        rejects(input) {
            assert.notStrictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to reject \`${JSON.stringify(input)}\`.`);
            return {
                withMessage: (message) => {
                    const actual = this.validator(input);
                    assert.ok(actual);
                    assert(actual.indexOf(message) > -1, `Expected error of ${JSON.stringify(this.settings)} on \`${input}\` to contain ${message}. Got ${this.validator(input)}.`);
                },
            };
        }
    }
    test('simple array', () => {
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'string' } });
            arr.accepts([]);
            arr.accepts(['foo']);
            arr.accepts(['foo', 'bar']);
            arr.rejects(76);
            arr.rejects([6, '3', 7]);
        }
    });
    test('min-max items array', () => {
        {
            const arr = new ArrayTester({
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 2,
            });
            arr.rejects([]).withMessage('Array must have at least 1 items');
            arr.accepts(['a']);
            arr.accepts(['a', 'a']);
            arr.rejects(['a', 'a', 'a']).withMessage('Array must have at most 2 items');
        }
    });
    test('array of enums', () => {
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'string', enum: ['a', 'b'] } });
            arr.accepts(['a']);
            arr.accepts(['a', 'b']);
            arr.rejects(['c']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['a', 'c']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['c', 'd']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['c', 'd']).withMessage(`Value 'd' is not one of`);
        }
    });
    test('array of numbers', () => {
        // We accept parseable strings since the view handles strings
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'number' } });
            arr.accepts([]);
            arr.accepts([2]);
            arr.accepts([2, 3]);
            arr.accepts(['2', '3']);
            arr.accepts([6.6, '3', 7]);
            arr.rejects(76);
            arr.rejects(7.6);
            arr.rejects([6, 'a', 7]);
        }
        {
            const arr = new ArrayTester({
                type: 'array',
                items: { type: 'integer', minimum: -2, maximum: 3 },
                maxItems: 4,
            });
            arr.accepts([]);
            arr.accepts([-2, 3]);
            arr.accepts([2, 3]);
            arr.accepts(['2', '3']);
            arr.accepts(['-2', '0', '3']);
            arr.accepts(['-2', 0.0, '3']);
            arr.rejects(2);
            arr.rejects(76);
            arr.rejects([6, '3', 7]);
            arr.rejects([2, 'a', 3]);
            arr.rejects([-2, 4]);
            arr.rejects([-1.2, 2.1]);
            arr.rejects([-3, 3]);
            arr.rejects([-3, 4]);
            arr.rejects([2, 2, 2, 2, 2]);
        }
    });
    test('min-max and enum', () => {
        const arr = new ArrayTester({
            type: 'array',
            items: { type: 'string', enum: ['a', 'b'] },
            minItems: 1,
            maxItems: 2,
        });
        arr.rejects(['a', 'b', 'c']).withMessage('Array must have at most 2 items');
        arr.rejects(['a', 'b', 'c']).withMessage(`Value 'c' is not one of`);
    });
    test('pattern', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string', pattern: '^(hello)*$' } });
        arr.accepts(['hello']);
        arr.rejects(['a']).withMessage(`Value 'a' must match regex`);
    });
    test('Unicode pattern', () => {
        const arr = new ArrayTester({
            type: 'array',
            items: { type: 'string', pattern: '^[\\p{L}\\d_. -]*$' },
        });
        arr.accepts(['hello', 'world']);
        arr.rejects(['hello', '#world']).withMessage(`Value '#world' must match regex`);
    });
    test('pattern with error message', () => {
        const arr = new ArrayTester({
            type: 'array',
            items: {
                type: 'string',
                pattern: '^(hello)*$',
                patternErrorMessage: 'err: must be friendly',
            },
        });
        arr.rejects(['a']).withMessage(`err: must be friendly`);
    });
    test('uniqueItems', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string' }, uniqueItems: true });
        arr.rejects(['a', 'a']).withMessage(`Array has duplicate items`);
    });
    test('getInvalidTypeError', () => {
        function testInvalidTypeError(value, type, shouldValidate) {
            const message = `value: ${value}, type: ${JSON.stringify(type)}, expected: ${shouldValidate ? 'valid' : 'invalid'}`;
            if (shouldValidate) {
                assert.ok(!getInvalidTypeError(value, type), message);
            }
            else {
                assert.ok(getInvalidTypeError(value, type), message);
            }
        }
        testInvalidTypeError(1, 'number', true);
        testInvalidTypeError(1.5, 'number', true);
        testInvalidTypeError([1], 'number', false);
        testInvalidTypeError('1', 'number', false);
        testInvalidTypeError({ a: 1 }, 'number', false);
        testInvalidTypeError(null, 'number', false);
        testInvalidTypeError('a', 'string', true);
        testInvalidTypeError('1', 'string', true);
        testInvalidTypeError([], 'string', false);
        testInvalidTypeError({}, 'string', false);
        testInvalidTypeError([1], 'array', true);
        testInvalidTypeError([], 'array', true);
        testInvalidTypeError([{}, [[]]], 'array', true);
        testInvalidTypeError({ a: ['a'] }, 'array', false);
        testInvalidTypeError('hello', 'array', false);
        testInvalidTypeError(true, 'boolean', true);
        testInvalidTypeError('hello', 'boolean', false);
        testInvalidTypeError(null, 'boolean', false);
        testInvalidTypeError([true], 'boolean', false);
        testInvalidTypeError(null, 'null', true);
        testInvalidTypeError(false, 'null', false);
        testInvalidTypeError([null], 'null', false);
        testInvalidTypeError('null', 'null', false);
    });
    test('uri checks work', () => {
        const tester = new Tester({ type: 'string', format: 'uri' });
        tester.rejects('example.com');
        tester.rejects('example.com/example');
        tester.rejects('example/example.html');
        tester.rejects('www.example.com');
        tester.rejects('');
        tester.rejects(' ');
        tester.rejects('example');
        tester.accepts('https:');
        tester.accepts('https://');
        tester.accepts('https://example.com');
        tester.accepts('https://www.example.com');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNWYWxpZGF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvdGVzdC9jb21tb24vcHJlZmVyZW5jZXNWYWxpZGF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RixLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxNQUFNO1FBR1gsWUFBb0IsUUFBc0M7WUFBdEMsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7WUFDekQsSUFBSSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFFLENBQUE7UUFDNUMsQ0FBQztRQUVNLE9BQU8sQ0FBQyxLQUFVO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQ3JCLEVBQUUsRUFDRixZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQ2pILENBQUE7UUFDRixDQUFDO1FBRU0sT0FBTyxDQUFDLEtBQVU7WUFDeEIsTUFBTSxDQUFDLGNBQWMsQ0FDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFDckIsRUFBRSxFQUNGLFlBQVksSUFBSSxDQUFDLFNB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