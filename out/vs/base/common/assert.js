/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError, onUnexpectedError } from './errors.js';
/**
 * Throws an error with the provided message if the provided value does not evaluate to a true Javascript value.
 *
 * @deprecated Use `assert(...)` instead.
 * This method is usually used like this:
 * ```ts
 * import * as assert from 'vs/base/common/assert';
 * assert.ok(...);
 * ```
 *
 * However, `assert` in that example is a user chosen name.
 * There is no tooling for generating such an import statement.
 * Thus, the `assert(...)` function should be used instead.
 */
export function ok(value, message) {
    if (!value) {
        throw new Error(message ? `Assertion failed (${message})` : 'Assertion Failed');
    }
}
export function assertNever(value, message = 'Unreachable') {
    throw new Error(message);
}
/**
 * Asserts that a condition is `truthy`.
 *
 * @throws provided {@linkcode messageOrError} if the {@linkcode condition} is `falsy`.
 *
 * @param condition The condition to assert.
 * @param messageOrError An error message or error object to throw if condition is `falsy`.
 */
export function assert(condition, messageOrError = 'unexpected state') {
    if (!condition) {
        // if error instance is provided, use it, otherwise create a new one
        const errorToThrow = typeof messageOrError === 'string'
            ? new BugIndicatingError(`Assertion Failed: ${messageOrError}`)
            : messageOrError;
        throw errorToThrow;
    }
}
/**
 * Like assert, but doesn't throw.
 */
export function softAssert(condition, message = 'Soft Assertion Failed') {
    if (!condition) {
        onUnexpectedError(new BugIndicatingError(message));
    }
}
/**
 * condition must be side-effect free!
 */
export function assertFn(condition) {
    if (!condition()) {
        // eslint-disable-next-line no-debugger
        debugger;
        // Reevaluate `condition` again to make debugging easier
        condition();
        onUnexpectedError(new BugIndicatingError('Assertion Failed'));
    }
}
export function checkAdjacentItems(items, predicate) {
    let i = 0;
    while (i < items.length - 1) {
        const a = items[i];
        const b = items[i + 1];
        if (!predicate(a, b)) {
            return false;
        }
        i++;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vYXNzZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVuRTs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxVQUFVLEVBQUUsQ0FBQyxLQUFlLEVBQUUsT0FBZ0I7SUFDbkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUNoRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBWSxFQUFFLE9BQU8sR0FBRyxhQUFhO0lBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDekIsQ0FBQztBQUVEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUNyQixTQUFrQixFQUNsQixpQkFBaUMsa0JBQWtCO0lBRW5ELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixvRUFBb0U7UUFDcEUsTUFBTSxZQUFZLEdBQ2pCLE9BQU8sY0FBYyxLQUFLLFFBQVE7WUFDakMsQ0FBQyxDQUFDLElBQUksa0JBQWtCLENBQUMscUJBQXFCLGNBQWMsRUFBRSxDQUFDO1lBQy9ELENBQUMsQ0FBQyxjQUFjLENBQUE7UUFFbEIsTUFBTSxZQUFZLENBQUE7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsU0FBa0IsRUFBRSxPQUFPLEdBQUcsdUJBQXVCO0lBQy9FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixpQkFBaUIsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsU0FBd0I7SUFDaEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7UUFDbEIsdUNBQXVDO1FBQ3ZDLFFBQVEsQ0FBQTtRQUNSLHdEQUF3RDtRQUN4RCxTQUFTLEVBQUUsQ0FBQTtRQUNYLGlCQUFpQixDQUFDLElBQUksa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxLQUFtQixFQUNuQixTQUEwQztJQUUxQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDVCxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsQixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsQ0FBQyxFQUFFLENBQUE7SUFDSixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDIn0=