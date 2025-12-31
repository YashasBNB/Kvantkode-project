/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { assert } from '../../../../../base/common/assert.js';
import { Range } from '../../../../../editor/common/core/range.js';
/**
 * Token representing a line of text with a `range` which
 * reflects the line's position in the original data.
 */
export class Line extends BaseToken {
    constructor(
    // the line index
    // Note! 1-based indexing
    lineNumber, 
    // the line contents
    text) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        super(new Range(lineNumber, 1, lineNumber, text.length + 1));
        this.text = text;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.equals(other)) {
            return false;
        }
        if (!(other instanceof Line)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `line("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL2xpbmVzQ29kZWMvdG9rZW5zL2xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxTQUFTO0lBQ2xDO0lBQ0MsaUJBQWlCO0lBQ2pCLHlCQUF5QjtJQUN6QixVQUFrQjtJQUNsQixvQkFBb0I7SUFDSixJQUFZO1FBRTVCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLHNDQUFzQyxVQUFVLElBQUksQ0FBQyxDQUFBO1FBRTVFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFONUMsU0FBSSxHQUFKLElBQUksQ0FBUTtJQU83QixDQUFDO0lBRUQ7O09BRUc7SUFDYSxNQUFNLENBQXNCLEtBQVE7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQTtJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sU0FBUyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0NBQ0QifQ==