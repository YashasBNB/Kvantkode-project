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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL251bWJlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUUxRSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTtRQUNuRSxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7UUFDckUsTUFBTSxNQUFNLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLEVBQUU7UUFDM0UsTUFBTSxNQUFNLEdBQUcscUJB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