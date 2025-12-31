/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ok, assert as commonAssert } from '../../common/assert.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { CancellationError, ReadonlyError } from '../../common/errors.js';
suite('Assert', () => {
    test('ok', () => {
        assert.throws(function () {
            ok(false);
        });
        assert.throws(function () {
            ok(null);
        });
        assert.throws(function () {
            ok();
        });
        assert.throws(function () {
            ok(null, 'Foo Bar');
        }, function (e) {
            return e.message.indexOf('Foo Bar') >= 0;
        });
        ok(true);
        ok('foo');
        ok({});
        ok(5);
    });
    suite('throws a provided error object', () => {
        test('generic error', () => {
            const originalError = new Error('Oh no!');
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
                assert.strictEqual(thrownError.message, 'Oh no!', 'Must throw the provided error instance.');
            }
        });
        test('cancellation error', () => {
            const originalError = new CancellationError();
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
            }
        });
        test('readonly error', () => {
            const originalError = new ReadonlyError('World');
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
                assert.strictEqual(thrownError.message, 'World is read-only and cannot be changed', 'Must throw the provided error instance.');
            }
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2Fzc2VydC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sSUFBSSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXpFLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNiLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNWLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNiLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNULENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNiLEVBQUUsRUFBRSxDQUFBO1FBQ0wsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsTUFBTSxDQUNaO1lBQ0MsRUFBRSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwQixDQUFDLEVBQ0QsVUFBVSxDQUFRO1lBQ2pCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pDLENBQUMsQ0FDRCxDQUFBO1FBRUQsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1IsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ1QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ04sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFCLE1BQU0sYUFBYSxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRXpDLElBQUksQ0FBQztnQkFDSixZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUseUNBQXlDLENBQUMsQ0FBQTtnQkFFekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFBO1lBQzdGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7WUFDL0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFBO1lBRTdDLElBQUksQ0FBQztnQkFDSixZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUseUNBQXlDLENBQUMsQ0FBQTtZQUMxRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1lBQzNCLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRWhELElBQUksQ0FBQztnQkFDSixZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUseUNBQXlDLENBQUMsQ0FBQTtnQkFFekYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsV0FBVyxDQUFDLE9BQU8sRUFDbkIsMENBQTBDLEVBQzFDLHlDQUF5QyxDQUN6QyxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=