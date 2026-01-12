/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../base/common/assert.js';
/**
 * An abstract parser class that is able to parse a sequence of
 * tokens into a new single entity.
 */
export class ParserBase {
    constructor(
    /**
     * Set of tokens that were accumulated so far.
     */
    currentTokens = []) {
        this.currentTokens = currentTokens;
        /**
         * Whether the parser object was "consumed" and should not be used anymore.
         */
        this.isConsumed = false;
        this.startTokensCount = this.currentTokens.length;
    }
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens() {
        return this.currentTokens;
    }
    /**
     * A helper method that validates that the current parser object was not yet consumed,
     * hence can still be used to accept new tokens in the parsing process.
     *
     * @throws if the parser object is already consumed.
     */
    assertNotConsumed() {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
    }
}
/**
 * Decorator that validates that the current parser object was not yet consumed,
 * hence can still be used to accept new tokens in the parsing process.
 *
 * @throws the resulting decorated method throws if the parser object was already consumed.
 */
export function assertNotConsumed(_target, propertyKey, descriptor) {
    // store the original method reference
    const originalMethod = descriptor.value;
    // validate that the current parser object was not yet consumed
    // before invoking the original accept method
    descriptor.value = function (...args) {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
        return originalMethod.apply(this, args);
    };
    return descriptor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3Mvc2ltcGxlQ29kZWMvcGFyc2VyQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUF1QzFEOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsVUFBVTtJQVcvQjtJQUNDOztPQUVHO0lBQ2dCLGdCQUEwQixFQUFFO1FBQTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBZGhEOztXQUVHO1FBQ08sZUFBVSxHQUFZLEtBQUssQ0FBQTtRQWFwQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUE7SUFDbEQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBWUQ7Ozs7O09BS0c7SUFDTyxpQkFBaUI7UUFDMUIsTUFBTSxDQUNMLElBQUksQ0FBQyxVQUFVLEtBQUssS0FBSyxFQUN6Qix1RUFBdUUsQ0FDdkUsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxPQUFVLEVBQ1YsV0FBcUIsRUFDckIsVUFBOEI7SUFFOUIsc0NBQXNDO0lBQ3RDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUE7SUFFdkMsK0RBQStEO0lBQy9ELDZDQUE2QztJQUM3QyxVQUFVLENBQUMsS0FBSyxHQUFHLFVBRWxCLEdBQUcsSUFBdUM7UUFFMUMsTUFBTSxDQUNMLElBQUksQ0FBQyxVQUFVLEtBQUssS0FBSyxFQUN6Qix1RUFBdUUsQ0FDdkUsQ0FBQTtRQUVELE9BQU8sY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFBO0lBRUQsT0FBTyxVQUFVLENBQUE7QUFDbEIsQ0FBQyJ9