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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy90ZXN0L2NvbW1vbi91dGlscy9tb2NrLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDdEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFDbEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUMxQixJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1lBU2pELE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBYztnQkFDcEMsR0FBRyxFQUFFLFFBQVE7Z0JBQ2IsR0FBRyxFQUFFLEVBQUU7Z0JBQ1AsYUFBYSxDQUFDLEdBQVc7b0JBQ3hCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNsQixDQUFDO2FBQ0QsQ0FBQyxDQUFBO1lBRUYsU0FBUyxDQUFjLElBQUksQ0FBQyxDQUFBO1lBRTVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtZQUVqRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLHlCQUF5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