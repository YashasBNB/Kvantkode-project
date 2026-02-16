/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mockObject } from './mock.js';
import { typeCheck } from '../../../../../base/common/types.js';
import { randomInt } from '../../../../../base/common/numbers.js';
import { randomBoolean } from '../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('mock', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('• mockObject', () => {
        test('• overrides properties and functions', () => {
            const mock = mockObject({
                bar: 'oh hi!',
                baz: 42,
                anotherMethod(arg) {
                    return isNaN(arg);
                },
            });
            typeCheck(mock);
            assert.strictEqual(mock.bar, 'oh hi!', 'bar should be overriden');
            assert.strictEqual(mock.baz, 42, 'baz should be overriden');
            assert(!mock.anotherMethod(randomInt(100)), 'Must execute overriden method correctly 1.');
            assert(mock.anotherMethod(NaN), 'Must execute overriden method correctly 2.');
            assert.throws(() => {
                // property is not overriden so must throw
                // eslint-disable-next-line local/code-no-unused-expressions
                mock.foo;
            });
            assert.throws(() => {
                // function is not overriden so must throw
                mock.someMethod(randomBoolean());
            });
        });
        test('• immutability of the overrides object', () => {
            const overrides = {
                baz: 4,
            };
            const mock = mockObject(overrides);
            typeCheck(mock);
            assert.strictEqual(mock.baz, 4, 'baz should be overriden');
            // overrides object must be immutable
            assert.throws(() => {
                overrides.foo = 'test';
            });
            assert.throws(() => {
                overrides.someMethod = (arg) => {
                    return `${arg}__${arg}`;
                };
            });
        });
    });
    suite('• mockService', () => {
        test('• overrides properties and functions', () => {
            const mock = mockObject({
                id: 'ciao!',
                counter: 74,
                testMethod2(arg) {
                    return !isNaN(arg);
                },
            });
            typeCheck(mock);
            assert.strictEqual(mock.id, 'ciao!', 'id should be overriden');
            assert.strictEqual(mock.counter, 74, 'counter should be overriden');
            assert(mock.testMethod2(randomInt(100)), 'Must execute overriden method correctly 1.');
            assert(!mock.testMethod2(NaN), 'Must execute overriden method correctly 2.');
            assert.throws(() => {
                // property is not overriden so must throw
                // eslint-disable-next-line local/code-no-unused-expressions
                mock.prop1;
            });
            assert.throws(() => {
                // function is not overriden so must throw
                mock.method1(randomBoolean());
            });
        });
        test('• immutability of the overrides object', () => {
            const overrides = {
                baz: false,
            };
            const mock = mockObject(overrides);
            typeCheck(mock);
            assert.strictEqual(mock.baz, false, 'baz should be overriden');
            // overrides object must be immutable
            assert.throws(() => {
                overrides.foo = 'test';
            });
            assert.throws(() => {
                overrides.someMethod = (arg) => {
                    return `${arg}__${arg}`;
                };
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL3V0aWxzL21vY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUNsQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQzFCLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFTakQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFjO2dCQUNwQyxHQUFHLEVBQUUsUUFBUTtnQkFDYixHQUFHLEVBQUUsRUFBRTtnQkFDUCxhQUFhLENBQUMsR0FBVztvQkFDeEIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2xCLENBQUM7YUFDRCxDQUFDLENBQUE7WUFFRixTQUFTLENBQWMsSUFBSSxDQUFDLENBQUE7WUFFNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1lBRWpFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdB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