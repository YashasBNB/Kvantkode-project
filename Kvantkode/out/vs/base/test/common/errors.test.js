/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { toErrorMessage } from '../../common/errorMessage.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { transformErrorForSerialization, transformErrorFromSerialization, } from '../../common/errors.js';
import { assertType } from '../../common/types.js';
suite('Errors', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Get Error Message', function () {
        assert.strictEqual(toErrorMessage('Foo Bar'), 'Foo Bar');
        assert.strictEqual(toErrorMessage(new Error('Foo Bar')), 'Foo Bar');
        let error = new Error();
        error = new Error();
        error.detail = {};
        error.detail.exception = {};
        error.detail.exception.message = 'Foo Bar';
        assert.strictEqual(toErrorMessage(error), 'Foo Bar');
        assert.strictEqual(toErrorMessage(error, true), 'Foo Bar');
        assert(toErrorMessage());
        assert(toErrorMessage(null));
        assert(toErrorMessage({}));
        try {
            throw new Error();
        }
        catch (error) {
            assert.strictEqual(toErrorMessage(error), 'An unknown error occurred. Please consult the log for more details.');
            assert.ok(toErrorMessage(error, true).length >
                'An unknown error occurred. Please consult the log for more details.'.length);
        }
    });
    test('Transform Error for Serialization', function () {
        const error = new Error('Test error');
        const serializedError = transformErrorForSerialization(error);
        assert.strictEqual(serializedError.name, 'Error');
        assert.strictEqual(serializedError.message, 'Test error');
        assert.strictEqual(serializedError.stack, error.stack);
        assert.strictEqual(serializedError.noTelemetry, false);
        assert.strictEqual(serializedError.cause, undefined);
    });
    test('Transform Error with Cause for Serialization', function () {
        const cause = new Error('Cause error');
        const error = new Error('Test error', { cause });
        const serializedError = transformErrorForSerialization(error);
        assert.strictEqual(serializedError.name, 'Error');
        assert.strictEqual(serializedError.message, 'Test error');
        assert.strictEqual(serializedError.stack, error.stack);
        assert.strictEqual(serializedError.noTelemetry, false);
        assert.ok(serializedError.cause);
        assert.strictEqual(serializedError.cause?.name, 'Error');
        assert.strictEqual(serializedError.cause?.message, 'Cause error');
        assert.strictEqual(serializedError.cause?.stack, cause.stack);
    });
    test('Transform Error from Serialization', function () {
        const serializedError = transformErrorForSerialization(new Error('Test error'));
        const error = transformErrorFromSerialization(serializedError);
        assert.strictEqual(error.name, 'Error');
        assert.strictEqual(error.message, 'Test error');
        assert.strictEqual(error.stack, serializedError.stack);
        assert.strictEqual(error.cause, undefined);
    });
    test('Transform Error with Cause from Serialization', function () {
        const cause = new Error('Cause error');
        const serializedCause = transformErrorForSerialization(cause);
        const error = new Error('Test error', { cause });
        const serializedError = transformErrorForSerialization(error);
        const deserializedError = transformErrorFromSerialization(serializedError);
        assert.strictEqual(deserializedError.name, 'Error');
        assert.strictEqual(deserializedError.message, 'Test error');
        assert.strictEqual(deserializedError.stack, serializedError.stack);
        assert.ok(deserializedError.cause);
        assertType(deserializedError.cause instanceof Error);
        assert.strictEqual(deserializedError.cause?.name, 'Error');
        assert.strictEqual(deserializedError.cause?.message, 'Cause error');
        assert.strictEqual(deserializedError.cause?.stack, serializedCause.stack);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZXJyb3JzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUNOLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFbEQsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVuRSxJQUFJLEtBQUssR0FBUSxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQzVCLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ25CLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUMzQixLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtB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