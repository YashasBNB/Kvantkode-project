/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `new line` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class NewLine extends BaseToken {
    /**
     * The underlying symbol of the `NewLine` token.
     */
    static { this.symbol = '\n'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(NewLine.symbol); }
    /**
     * Return text representation of the token.
     */
    get text() {
        return NewLine.symbol;
    }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return NewLine.byte;
    }
    /**
     * Create new `NewLine` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new NewLine(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `newline${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3TGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbGluZXNDb2RlYy90b2tlbnMvbmV3TGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE9BQVEsU0FBUSxTQUFTO0lBQ3JDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxJQUFJLENBQUE7SUFFNUM7O09BRUc7YUFDb0IsU0FBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRWpFOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFBO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQTtJQUNwQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFVLEVBQUUsY0FBc0I7UUFDekQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV0QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUYsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxVQUFVLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM5QixDQUFDIn0=