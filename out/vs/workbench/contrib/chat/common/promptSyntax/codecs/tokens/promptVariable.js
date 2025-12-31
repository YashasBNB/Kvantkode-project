/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { INVALID_NAME_CHARACTERS, STOP_CHARACTERS } from '../parsers/promptVariableParser.js';
/**
 * All prompt variables start with `#` character.
 */
const START_CHARACTER = '#';
/**
 * Character that separates name of a prompt variable from its data.
 */
const DATA_SEPARATOR = ':';
/**
 * Represents a `#variable` token in a prompt text.
 */
export class PromptVariable extends PromptToken {
    constructor(range, 
    /**
     * The name of a prompt variable, excluding the `#` character at the start.
     */
    name) {
        // sanity check of characters used in the provided variable name
        for (const character of name) {
            assert(INVALID_NAME_CHARACTERS.includes(character) === false &&
                STOP_CHARACTERS.includes(character) === false, `Variable 'name' cannot contain character '${character}', got '${name}'.`);
        }
        super(range);
        this.name = name;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}`;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if (other instanceof PromptVariable === false) {
            return false;
        }
        if (this.text.length !== other.text.length) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
/**
 * Represents a {@link PromptVariable} with additional data token in a prompt text.
 * (e.g., `#variable:/path/to/file.md`)
 */
export class PromptVariableWithData extends PromptVariable {
    constructor(fullRange, 
    /**
     * The name of the variable, excluding the starting `#` character.
     */
    name, 
    /**
     * The data of the variable, excluding the starting {@link DATA_SEPARATOR} character.
     */
    data) {
        super(fullRange, name);
        this.data = data;
        // sanity check of characters used in the provided variable data
        for (const character of data) {
            assert(STOP_CHARACTERS.includes(character) === false, `Variable 'data' cannot contain character '${character}', got '${data}'.`);
        }
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}${DATA_SEPARATOR}${this.data}`;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (other instanceof PromptVariableWithData === false) {
            return false;
        }
        return super.equals(other);
    }
    /**
     * Range of the `data` part of the variable.
     */
    get dataRange() {
        const { range } = this;
        // calculate the start column number of the `data` part of the variable
        const dataStartColumn = range.startColumn + START_CHARACTER.length + this.name.length + DATA_SEPARATOR.length;
        // create `range` of the `data` part of the variable
        const result = new Range(range.startLineNumber, dataStartColumn, range.endLineNumber, range.endColumn);
        // if the resulting range is empty, return `undefined`
        // because there is no `data` part present in the variable
        if (result.isEmpty()) {
            return undefined;
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9wcm9tcHRWYXJpYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25FLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVoRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFN0Y7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBVyxHQUFHLENBQUE7QUFFbkM7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBVyxHQUFHLENBQUE7QUFFbEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQVc7SUFDOUMsWUFDQyxLQUFZO0lBQ1o7O09BRUc7SUFDYSxJQUFZO1FBRTVCLGdFQUFnRTtRQUNoRSxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FDTCx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSztnQkFDcEQsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLEVBQzlDLDZDQUE2QyxTQUFTLFdBQVcsSUFBSSxJQUFJLENBQ3pFLENBQUE7UUFDRixDQUFDO1FBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBWEksU0FBSSxHQUFKLElBQUksQ0FBUTtJQVk3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLEdBQUcsZUFB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