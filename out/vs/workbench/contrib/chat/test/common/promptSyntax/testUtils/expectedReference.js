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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9leHBlY3RlZFJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saURBQWlELENBQUE7QUErQzlFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixZQUE2QixPQUFrQztRQUFsQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtJQUFHLENBQUM7SUFFbkU7O09BRUc7SUFDSSxhQUFhLENBQUMsS0FBdUI7UUFDM0MsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQzlELE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUE7UUFFL0I7O1dBRUc7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsV0FBVyxtQkFBbUIsQ0FBQyxDQUFBO1FBRTNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxXQUFXLG9CQUFvQixDQUFDLENBQUE7UUFFeEUsTUFBTSxDQUFDLFdB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