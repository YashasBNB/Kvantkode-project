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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2Vycm9ycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BFLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsK0JBQStCLEdBQy9CLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWxELEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbkUsSUFBSSxLQUFLLEdBQVEsSUFBSSxLQUFLLEVBQUUsQ0FBQTtRQUM1QixLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQTtRQUNuQixLQUFLLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDM0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENB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