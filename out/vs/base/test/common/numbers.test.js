/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { isPointWithinTriangle, randomInt } from '../../common/numbers.js';
suite('isPointWithinTriangle', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should return true if the point is within the triangle', () => {
        const result = isPointWithinTriangle(0.25, 0.25, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
    test('should return false if the point is outside the triangle', () => {
        const result = isPointWithinTriangle(2, 2, 0, 0, 1, 0, 0, 1);
        assert.ok(!result);
    });
    test('should return true if the point is on the edge of the triangle', () => {
        const result = isPointWithinTriangle(0.5, 0, 0, 0, 1, 0, 0, 1);
        assert.ok(result);
    });
});
suite('randomInt', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test helper that allows to run a test on the `randomInt()`
     * utility with specified `max` and `min` values.
     */
    const testRandomIntUtil = (max, min, testName) => {
        suite(testName, () => {
            let i = 0;
            while (++i < 5) {
                test(`should generate random boolean attempt#${i}`, async () => {
                    let iterations = 100;
                    while (iterations-- > 0) {
                        const int = randomInt(max, min);
                        assert(int <= max, `Expected ${int} to be less than or equal to ${max}.`);
                        assert(int >= (min ?? 0), `Expected ${int} to be greater than or equal to ${min ?? 0}.`);
                    }
                });
            }
            test('should include min and max', async () => {
                let iterations = 125;
                const results = [];
                while (iterations-- > 0) {
                    results.push(randomInt(max, min));
                }
                assert(results.includes(max), `Expected ${results} to include ${max}.`);
                assert(results.includes(min ?? 0), `Expected ${results} to include ${min ?? 0}.`);
            });
        });
    };
    suite('positive numbers', () => {
        testRandomIntUtil(4, 2, 'max: 4, min: 2');
        testRandomIntUtil(4, 0, 'max: 4, min: 0');
        testRandomIntUtil(4, undefined, 'max: 4, min: undefined');
        testRandomIntUtil(1, 0, 'max: 0, min: 0');
    });
    suite('negative numbers', () => {
        testRandomIntUtil(-2, -5, 'max: -2, min: -5');
        testRandomIntUtil(0, -5, 'max: 0, min: -5');
        testRandomIntUtil(0, -1, 'max: 0, min: -1');
    });
    suite('split numbers', () => {
        testRandomIntUtil(3, -1, 'max: 3, min: -1');
        testRandomIntUtil(2, -2, 'max: 2, min: -2');
        testRandomIntUtil(1, -3, 'max: 2, min: -2');
    });
    suite('errors', () => {
        test('should throw if "min" is == "max" #1', () => {
            assert.throws(() => {
                randomInt(200, 200);
            }, `"max"(200) param should be greater than "min"(200)."`);
        });
        test('should throw if "min" is == "max" #2', () => {
            assert.throws(() => {
                randomInt(2, 2);
            }, `"max"(2) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is == "max" #3', () => {
            assert.throws(() => {
                randomInt(0);
            }, `"max"(0) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #1', () => {
            assert.throws(() => {
                randomInt(2, 3);
            }, `"max"(2) param should be greater than "min"(3)."`);
        });
        test('should throw if "min" is > "max" #2', () => {
            assert.throws(() => {
                randomInt(999, 2000);
            }, `"max"(999) param should be greater than "min"(2000)."`);
        });
        test('should throw if "min" is > "max" #3', () => {
            assert.throws(() => {
                randomInt(0, 1);
            }, `"max"(0) param should be greater than "min"(1)."`);
        });
        test('should throw if "min" is > "max" #4', () => {
            assert.throws(() => {
                randomInt(-5, 2);
            }, `"max"(-5) param should be greater than "min"(2)."`);
        });
        test('should throw if "min" is > "max" #5', () => {
            assert.throws(() => {
                randomInt(-4, 0);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "min" is > "max" #6', () => {
            assert.throws(() => {
                randomInt(-4);
            }, `"max"(-4) param should be greater than "min"(0)."`);
        });
        test('should throw if "max" is `NaN`', () => {
            assert.throws(() => {
                randomInt(NaN);
            }, `"max" param is not a number."`);
        });
        test('should throw if "min" is `NaN`', () => {
            assert.throws(() => {
                randomInt(4, NaN);
            }, `"min" param is not a number."`);
        });
        suite('infinite arguments', () => {
            test('should throw if "max" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(-Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "max" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(+Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [-Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, -Infinity);
                }, `"max" param is not finite."`);
            });
            test('should throw if "min" is infinite [+Infinity]', () => {
                assert.throws(() => {
                    randomInt(Infinity, +Infinity);
                }, `"max" param is not finite."`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9udW1iZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFMUUsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7UUFDbkUsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMERBQTBELEVBQUUsR0FBRyxFQUFFO1FBQ3JFLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFD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