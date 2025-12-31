/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../core/range.js';
import { assert } from '../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown image` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownImage extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the image (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the image (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the image, including the `!` and `square brackets`.
     */
    caption, 
    /**
     * The reference of the image, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '!', `The caption must start with '!' character, got "${caption}".`);
        assert(caption[1] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
        assert(reference[0] === '(' && reference[reference.length - 1] === ')', `The reference must be enclosed in parentheses, got "${reference}".`);
        super(new Range(lineNumber, columnNumber, lineNumber, columnNumber + caption.length + reference.length));
        this.caption = caption;
        this.reference = reference;
        // set up the `isURL` flag based on the current
        try {
            new URL(this.path);
            this.isURL = true;
        }
        catch {
            this.isURL = false;
        }
    }
    get text() {
        return `${this.caption}${this.reference}`;
    }
    /**
     * Returns the `reference` part of the link without enclosing parentheses.
     */
    get path() {
        return this.reference.slice(1, this.reference.length - 1);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if (!(other instanceof MarkdownImage)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Get the range of the `link part` of the token.
     */
    get linkRange() {
        if (this.path.length === 0) {
            return undefined;
        }
        const { range } = this;
        // note! '+1' for openning `(` of the link
        const startColumn = range.startColumn + this.caption.length + 1;
        const endColumn = startColumn + this.path.length;
        return new Range(range.startLineNumber, startColumn, range.endLineNumber, endColumn);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-image("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvdG9rZW5zL21hcmtkb3duSW1hZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFN0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxhQUFhO0lBTS9DO0lBQ0M7O09BRUc7SUFDSCxVQUFrQjtJQUNsQjs7T0FFRztJQUNILFlBQW9CO0lBQ3BCOztPQUVHO0lBQ2MsT0FBZTtJQUNoQzs7T0FFRztJQUNjLFNBQWlCO1FBRWxDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLHNDQUFzQyxVQUFVLElBQUksQ0FBQyxDQUFBO1FBRTVFLE1BQU0sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLHdDQUF3QyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBRWxGLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLG1EQUFtRCxPQUFPLElBQUksQ0FBQyxDQUFBO1FBRTFGLE1BQU0sQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDekQseURBQXlELE9BQU8sSUFBSSxDQUNwRSxDQUFBO1FBRUQsTUFBTSxDQUNMLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUMvRCx1REFBdUQsU0FBUyxJQUFJLENBQ3BFLENBQUE7UUFFRCxLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLFlBQVksRUFDWixVQUFVLEVBQ1YsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FDaEQsQ0FDRCxDQUFBO1FBL0JnQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBSWYsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQTZCbEMsK0NBQStDO1FBQy9DLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNsQixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxNQUFNLENBQXNCLEtBQVE7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFdEIsMENBQTBDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sU0FBUyxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUVoRCxPQUFPLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGFBQWEsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDL0MsQ0FBQztDQUNEIn0=