/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Position } from '../../../../../editor/common/core/position.js';
/**
 * Token that represent a `form feed` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class FormFeed extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\f'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return FormFeed.symbol;
    }
    /**
     * Create new `FormFeed` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new FormFeed(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `formfeed${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybUZlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy90b2tlbnMvZm9ybUZlZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFeEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFFBQVMsU0FBUSxTQUFTO0lBQ3RDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxJQUFJLENBQUE7SUFFNUM7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUE7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBVSxFQUFFLGNBQXNCO1FBQ3pELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFdEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN6RSxNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTVGLE9BQU8sSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sV0FBVyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDL0IsQ0FBQyJ9