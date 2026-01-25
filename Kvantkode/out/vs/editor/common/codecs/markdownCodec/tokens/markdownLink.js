/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../core/range.js';
import { assert } from '../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown link` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownLink extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the link (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the link (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the original link, including the square brackets.
     */
    caption, 
    /**
     * The reference of the original link, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
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
        if (!(other instanceof MarkdownLink)) {
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
        return `md-link("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9tYXJrZG93bkNvZGVjL3Rva2Vucy9tYXJrZG93bkxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFN0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxhQUFhO0lBTTlDO0lBQ0M7O09BRUc7SUFDSCxVQUFrQjtJQUNsQjs7T0FFRztJQUNILFlBQW9CO0lBQ3BCOztPQUVHO0lBQ2EsT0FBZTtJQUMvQjs7T0FFRztJQUNhLFNBQWlCO1FBRWpDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLHNDQUFzQyxVQUFVLElBQUksQ0FBQyxDQUFBO1FBRTVFLE1BQU0sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLHdDQUF3QyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBRWxGLE1BQU0sQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDekQseURBQXlELE9BQU8sSUFBSSxDQUNwRSxDQUFBO1FBRUQsTUFBTSxDQUNMLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUMvRCx1REFBdUQsU0FBUyxJQUFJLENBQ3BFLENBQUE7UUFFRCxLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLFlBQVksRUFDWixVQUFVLEVBQ1YsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FDaEQsQ0FDRCxDQUFBO1FBN0JlLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFJZixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBMkJqQywrQ0FBK0M7UUFDL0MsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQW9CLElBQUk7UUFDdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU0sQ0FBc0IsS0FBUTtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQTtJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFNBQVM7UUFDbkIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV0QiwwQ0FBMEM7UUFDMUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDL0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBRWhELE9BQU8sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sWUFBWSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM5QyxDQUFDO0NBQ0QifQ==