/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `(` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftParenthesis extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '('; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftParenthesis.symbol;
    }
    /**
     * Create new `LeftParenthesis` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new LeftParenthesis(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-parenthesis${this.range}`;
    }
}
/**
 * A token that represent a `)` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightParenthesis extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = ')'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightParenthesis.symbol;
    }
    /**
     * Create new `RightParenthesis` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new RightParenthesis(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-parenthesis${this.range}`;
    }
}
