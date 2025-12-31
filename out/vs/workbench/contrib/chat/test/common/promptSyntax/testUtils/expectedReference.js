/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { ResolveError } from '../../../../common/promptFileReferenceErrors.js';
/**
 * An expected child reference to use in tests.
 */
export class ExpectedReference {
    constructor(options) {
        this.options = options;
    }
    /**
     * Validate that the provided reference is equal to this object.
     */
    validateEqual(other) {
        const { uri, text, path, childrenOrError = [] } = this.options;
        const errorPrefix = `[${uri}] `;
        /**
         * Validate the base properties of the reference first.
         */
        assert.strictEqual(other.uri.toString(), uri.toString(), `${errorPrefix} Incorrect 'uri'.`);
        assert.strictEqual(other.text, text, `${errorPrefix} Incorrect 'text'.`);
        assert.strictEqual(other.path, path, `${errorPrefix} Incorrect 'path'.`);
        const range = new Range(this.options.startLine, this.options.startColumn, this.options.startLine, this.options.startColumn + text.length);
        assert(range.equalsRange(other.range), `${errorPrefix} Incorrect 'range': expected '${range}', got '${other.range}'.`);
        if (path.length) {
            assertDefined(other.linkRange, `${errorPrefix} Link range must be defined.`);
            const linkRange = new Range(this.options.startLine, this.options.pathStartColumn, this.options.startLine, this.options.pathStartColumn + path.length);
            assert(linkRange.equalsRange(other.linkRange), `${errorPrefix} Incorrect 'linkRange': expected '${linkRange}', got '${other.linkRange}'.`);
        }
        else {
            assert.strictEqual(other.linkRange, undefined, `${errorPrefix} Link range must be 'undefined'.`);
        }
        /**
         * Next validate children or error condition.
         */
        if (childrenOrError instanceof ResolveError) {
            const error = childrenOrError;
            const { errorCondition } = other;
            assertDefined(errorCondition, `${errorPrefix} Expected 'errorCondition' to be defined.`);
            assert(errorCondition instanceof ResolveError, `${errorPrefix} Expected 'errorCondition' to be a 'ResolveError'.`);
            assert(error.sameTypeAs(errorCondition), `${errorPrefix} Incorrect 'errorCondition' type.`);
            return;
        }
        const children = childrenOrError;
        const { references } = other;
        for (let i = 0; i < children.length; i++) {
            const reference = references[i];
            assertDefined(reference, `${errorPrefix} Expected reference #${i} be ${children[i]}, got 'undefined'.`);
            children[i].validateEqual(reference);
        }
        if (references.length > children.length) {
            const extraReference = references[children.length];
            // sanity check
            assertDefined(extraReference, `${errorPrefix} Extra reference must be defined.`);
            throw new Error(`${errorPrefix} Expected no more references, got '${extraReference.text}'.`);
        }
        if (children.length > references.length) {
            const expectedReference = children[references.length];
            // sanity check
            assertDefined(expectedReference, `${errorPrefix} Expected reference must be defined.`);
            throw new Error(`${errorPrefix} Expected another reference '${expectedReference.options.text}', got 'undefined'.`);
        }
    }
    /**
     * Returns a string representation of the reference.
     */
    toString() {
        return `expected-reference/${this.options.text}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvZXhwZWN0ZWRSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBK0M5RTs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFBNkIsT0FBa0M7UUFBbEMsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7SUFBRyxDQUFDO0lBRW5FOztPQUVHO0lBQ0ksYUFBYSxDQUFDLEtBQXVCO1FBQzNDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxlQUFlLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBRS9COztXQUVHO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLFdBQVcsbUJBQW1CLENBQUMsQ0FBQTtRQUUzRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsV0FBVyxvQkFBb0IsQ0FBQyxDQUFBO1FBRXhFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxXQUFXLG9CQUFvQixDQUFDLENBQUE7UUFFeEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQ3RDLENBQUE7UUFFRCxNQUFNLENBQ0wsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQzlCLEdBQUcsV0FBVyxpQ0FBaUMsS0FBSyxXQUFXLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FDOUUsQ0FBQTtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsV0FBVyw4QkFBOEIsQ0FBQyxDQUFBO1lBRTVFLE1BQU0sU0FBUyxHQUFHLElBQUksS0FBSyxDQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUMxQyxDQUFBO1lBRUQsTUFBTSxDQUNMLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUN0QyxHQUFHLFdBQVcscUNBQXFDLFNBQVMsV0FBVyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQzFGLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULEdBQUcsV0FBVyxrQ0FBa0MsQ0FDaEQsQ0FBQTtRQUNGLENBQUM7UUFFRDs7V0FFRztRQUVILElBQUksZUFBZSxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQzdDLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQTtZQUM3QixNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFBO1lBQ2hDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxXQUFXLDJDQUEyQyxDQUFDLENBQUE7WUFFeEYsTUFBTSxDQUNMLGNBQWMsWUFBWSxZQUFZLEVBQ3RDLEdBQUcsV0FBVyxvREFBb0QsQ0FDbEUsQ0FBQTtZQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEdBQUcsV0FBVyxtQ0FBbUMsQ0FBQyxDQUFBO1lBRTNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFBO1FBQ2hDLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFL0IsYUFBYSxDQUNaLFNBQVMsRUFDVCxHQUFHLFdBQVcsd0JBQXdCLENBQUMsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUM3RSxDQUFBO1lBRUQsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRWxELGVBQWU7WUFDZixhQUFhLENBQUMsY0FBYyxFQUFFLEdBQUcsV0FBVyxtQ0FBbUMsQ0FBQyxDQUFBO1lBRWhGLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxXQUFXLHNDQUFzQyxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQTtRQUM3RixDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFckQsZUFBZTtZQUNmLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLFdBQVcsc0NBQXNDLENBQUMsQ0FBQTtZQUV0RixNQUFNLElBQUksS0FBSyxDQUNkLEdBQUcsV0FBVyxnQ0FBZ0MsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUkscUJBQXFCLENBQ2pHLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUTtRQUNkLE9BQU8sc0JBQXNCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDakQsQ0FBQztDQUNEIn0=