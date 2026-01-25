/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { randomInt } from '../../common/numbers.js';
export function flakySuite(title, fn) {
    return suite(title, function () {
        // Flaky suites need retries and timeout to complete
        // e.g. because they access browser features which can
        // be unreliable depending on the environment.
        this.retries(3);
        this.timeout(1000 * 20);
        // Invoke suite ensuring that `this` is
        // properly wired in.
        fn.call(this);
    });
}
/**
 * Helper function that allows to await for a specified amount of time.
 * @param ms The amount of time to wait in milliseconds.
 */
export const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 * Helper function that allows to await for a random amount of time.
 * @param maxMs The `maximum` amount of time to wait, in milliseconds.
 * @param minMs [`optional`] The `minimum` amount of time to wait, in milliseconds.
 */
export const waitRandom = (maxMs, minMs = 0) => {
    return wait(randomInt(maxMs, minMs));
};
/**
 * (pseudo)Random boolean generator.
 *
 * ## Examples
 *
 * ```typsecript
 * randomBoolean(); // generates either `true` or `false`
 * ```
 *
 */
export const randomBoolean = () => {
    return Math.random() > 0.5;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3Rlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFbkQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxLQUFhLEVBQUUsRUFBYztJQUN2RCxPQUFPLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDbkIsb0RBQW9EO1FBQ3BELHNEQUFzRDtRQUN0RCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBRXZCLHVDQUF1QztRQUN2QyxxQkFBcUI7UUFDckIsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLEVBQVUsRUFBaUIsRUFBRTtJQUNqRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDekQsQ0FBQyxDQUFBO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWEsRUFBRSxRQUFnQixDQUFDLEVBQWlCLEVBQUU7SUFDN0UsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBQ3JDLENBQUMsQ0FBQTtBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxHQUFZLEVBQUU7SUFDMUMsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFBO0FBQzNCLENBQUMsQ0FBQSJ9