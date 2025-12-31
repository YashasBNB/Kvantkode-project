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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL3NpbXBsZUNvZGVjL3BhcnNlckJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBdUMxRDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLFVBQVU7SUFXL0I7SUFDQzs7T0FFRztJQUNnQixnQkFBMEIsRUFBRTtRQUE1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQWRoRDs7V0FFRztRQUNPLGVBQVUsR0FBWSxLQUFLLENBQUE7UUFhcEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFBO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQVlEOzs7OztPQUtHO0lBQ08saUJBQWlCO1FBQzFCLE1BQU0sQ0FDTCxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssRUFDekIsdUVBQXVFLENBQ3ZFLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsT0FBVSxFQUNWLFdBQXFCLEVBQ3JCLFVBQThCO0lBRTlCLHNDQUFzQztJQUN0QyxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFBO0lBRXZDLCtEQUErRDtJQUMvRCw2Q0FBNkM7SUFDN0MsVUFBVSxDQUFDLEtBQUssR0FBRyxVQUVsQixHQUFHLElBQXVDO1FBRTFDLE1BQU0sQ0FDTCxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssRUFDekIsdUVBQXVFLENBQ3ZFLENBQUE7UUFFRCxPQUFPLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQTtJQUVELE9BQU8sVUFBVSxDQUFBO0FBQ2xCLENBQUMifQ==