/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Token that represent a `carriage return` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class CarriageReturn extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\r'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(CarriageReturn.symbol); }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return CarriageReturn.byte;
    }
    /**
     * Return text representation of the token.
     */
    get text() {
        return CarriageReturn.symbol;
    }
    /**
     * Create new `CarriageReturn` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new CarriageReturn(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `carriage-return${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FycmlhZ2VSZXR1cm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9saW5lc0NvZGVjL3Rva2Vucy9jYXJyaWFnZVJldHVybi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBQzVDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxJQUFJLENBQUE7SUFFNUM7O09BRUc7YUFDb0IsU0FBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRXhFOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFBO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQTtJQUM3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFVLEVBQUUsY0FBc0I7UUFDekQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV0QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUYsT0FBTyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxrQkFBa0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RDLENBQUMifQ==