/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `#` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Hash extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '#'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Hash.symbol;
    }
    /**
     * Create new token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new Hash(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `hash${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3Mvc2ltcGxlQ29kZWMvdG9rZW5zL2hhc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFHcEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxTQUFTO0lBQ2xDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxHQUFHLENBQUE7SUFFM0M7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBVSxFQUFFLGNBQXNCO1FBQ3pELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFdEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN6RSxNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTVGLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDM0IsQ0FBQyJ9