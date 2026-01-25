/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `:` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Colon extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = ':'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Colon.symbol;
    }
    /**
     * Create new token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new Colon(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `colon${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL3NpbXBsZUNvZGVjL3Rva2Vucy9jb2xvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUdwRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sS0FBTSxTQUFRLFNBQVM7SUFDbkM7O09BRUc7YUFDb0IsV0FBTSxHQUFXLEdBQUcsQ0FBQTtJQUUzQzs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQTtJQUNwQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFVLEVBQUUsY0FBc0I7UUFDekQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV0QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUYsT0FBTyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxRQUFRLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM1QixDQUFDIn0=