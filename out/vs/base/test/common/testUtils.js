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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi90ZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRW5ELE1BQU0sVUFBVSxVQUFVLENBQUMsS0FBYSxFQUFFLEVBQWM7SUFDdkQsT0FBTyxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQ25CLG9EQUFvRDtRQUNwRCxzREFBc0Q7UUFDdEQsOENBQThDO1FBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUV2Qix1Q0FBdUM7UUFDdkMscUJBQXFCO1FBQ3JCLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDZCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxFQUFVLEVBQWlCLEVBQUU7SUFDakQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3pELENBQUMsQ0FBQTtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsQ0FBQyxFQUFpQixFQUFFO0lBQzdFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtBQUNyQyxDQUFDLENBQUE7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsR0FBWSxFQUFFO0lBQzFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQTtBQUMzQixDQUFDLENBQUEifQ==