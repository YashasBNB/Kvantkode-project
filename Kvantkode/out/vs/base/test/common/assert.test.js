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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vYXNzZXJ0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFekUsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDZixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ1YsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxFQUFFLENBQUE7UUFDTCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQ1o7WUFDQyxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BCLENBQUMsRUFDRCxVQUFVLENBQVE7WUFDakIsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUNELENBQUE7UUFFRCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDUixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDVCxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDTixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDMUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFekMsSUFBSSxDQUFDO2dCQUNKLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDbkMsQ0FBQztZQUFDLE9BQU8sV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFBO2dCQUV6RixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLHlDQUF5QyxDQUFDLENBQUE7WUFDN0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtZQUMvQixNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7WUFFN0MsSUFBSSxDQUFDO2dCQUNKLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDbkMsQ0FBQztZQUFDLE9BQU8sV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFBO1lBQzFGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7WUFDM0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFaEQsSUFBSSxDQUFDO2dCQUNKLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDbkMsQ0FBQztZQUFDLE9BQU8sV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFBO2dCQUV6RixNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLENBQUMsT0FBTyxFQUNuQiwwQ0FBMEMsRUFDMUMseUNBQXlDLENBQ3pDLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==