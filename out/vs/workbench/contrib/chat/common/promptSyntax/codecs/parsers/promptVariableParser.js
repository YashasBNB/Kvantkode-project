/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { pick } from '../../../../../../../base/common/arrays.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { PromptVariable, PromptVariableWithData } from '../tokens/promptVariable.js';
import { Tab } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/tab.js';
import { Hash } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/hash.js';
import { Space } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/space.js';
import { Colon } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/colon.js';
import { NewLine } from '../../../../../../../editor/common/codecs/linesCodec/tokens/newLine.js';
import { FormFeed } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../../../../../../../editor/common/codecs/linesCodec/tokens/carriageReturn.js';
import { ExclamationMark } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/exclamationMark.js';
import { LeftBracket, RightBracket, } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/brackets.js';
import { LeftAngleBracket, RightAngleBracket, } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase, } from '../../../../../../../editor/common/codecs/simpleCodec/parserBase.js';
/**
 * List of characters that terminate the prompt variable sequence.
 */
export const STOP_CHARACTERS = [
    Space,
    Tab,
    NewLine,
    CarriageReturn,
    VerticalTab,
    FormFeed,
].map((token) => {
    return token.symbol;
});
/**
 * List of characters that cannot be in a variable name (excluding the {@link STOP_CHARACTERS}).
 */
export const INVALID_NAME_CHARACTERS = [
    Hash,
    Colon,
    ExclamationMark,
    LeftAngleBracket,
    RightAngleBracket,
    LeftBracket,
    RightBracket,
].map((token) => {
    return token.symbol;
});
/**
 * The parser responsible for parsing a `prompt variable name`.
 * E.g., `#selection` or `#workspace` variable. If the `:` character follows
 * the variable name, the parser transitions to {@link PartialPromptVariableWithData}
 * that is also able to parse the `data` part of the variable. E.g., the `#file` part
 * of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableName extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            try {
                // if it is possible to convert current parser to `PromptVariable`, return success result
                return {
                    result: 'success',
                    nextParser: this.asPromptVariable(),
                    wasTokenConsumed: false,
                };
            }
            catch (error) {
                // otherwise fail
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            finally {
                // in any case this is an end of the parsing process
                this.isConsumed = true;
            }
        }
        // if a `:` character is encountered, we might transition to {@link PartialPromptVariableWithData}
        if (token instanceof Colon) {
            this.isConsumed = true;
            // if there is only one token before the `:` character, it must be the starting
            // `#` symbol, therefore fail because there is no variable name present
            if (this.currentTokens.length <= 1) {
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            // otherwise, if there are more characters after `#` available,
            // we have a variable name, so we can transition to {@link PromptVariableWithData}
            return {
                result: 'success',
                nextParser: new PartialPromptVariableWithData([...this.currentTokens, token]),
                wasTokenConsumed: true,
            };
        }
        // variables cannot have {@link INVALID_NAME_CHARACTERS} in their names
        if (INVALID_NAME_CHARACTERS.includes(token.text)) {
            this.isConsumed = true;
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // otherwise, a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptVariable} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `#` token is available.
     */
    asPromptVariable() {
        // if there is only one token before the stop character
        // must be the starting `#` one), then fail
        assert(this.currentTokens.length > 1, 'Cannot create a prompt variable out of incomplete token sequence.');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // render the characters above into strings, excluding the starting `#` character
        const variableNameTokens = this.currentTokens.slice(1);
        const variableName = variableNameTokens.map(pick('text')).join('');
        return new PromptVariable(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableName.prototype, "accept", null);
/**
 * The parser responsible for parsing a `prompt variable name` with `data`.
 * E.g., the `/path/to/something.md` part of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableWithData extends ParserBase {
    constructor(tokens) {
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        // sanity checks of our expectations about the tokens list
        assert(tokens.length > 2, `Tokens list must contain at least 3 items, got '${tokens.length}'.`);
        assert(firstToken instanceof Hash, `The first token must be a '#', got '${firstToken} '.`);
        assert(lastToken instanceof Colon, `The last token must be a ':', got '${lastToken} '.`);
        super([...tokens]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            // in any case, success of failure below, this is an end of the parsing process
            this.isConsumed = true;
            const firstToken = this.currentTokens[0];
            const lastToken = this.currentTokens[this.currentTokens.length - 1];
            // tokens representing variable name without the `#` character at the start and
            // the `:` data separator character at the end
            const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
            // tokens representing variable data without the `:` separator character at the start
            const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
            // compute the full range of the variable token
            const fullRange = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
            // render the characters above into strings
            const variableName = variableNameTokens.map(pick('text')).join('');
            const variableData = variableDataTokens.map(pick('text')).join('');
            return {
                result: 'success',
                nextParser: new PromptVariableWithData(fullRange, variableName, variableData),
                wasTokenConsumed: false,
            };
        }
        // otherwise, token is a valid data character - the data can contain almost any character,
        // including `:` and `#`, hence add it to the list of the current tokens and continue
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link asPromptVariableWithData} token.
     */
    asPromptVariableWithData() {
        // tokens representing variable name without the `#` character at the start and
        // the `:` data separator character at the end
        const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
        // tokens representing variable data without the `:` separator character at the start
        const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
        // render the characters above into strings
        const variableName = variableNameTokens.map(pick('text')).join('');
        const variableData = variableDataTokens.map(pick('text')).join('');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        return new PromptVariableWithData(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName, variableData);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableWithData.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGVQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3BhcnNlcnMvcHJvbXB0VmFyaWFibGVQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN6RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBRW5HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBQ2pILE9BQU8sRUFDTixXQUFXLEVBQ1gsWUFBWSxHQUNaLE1BQU0sMEVBQTBFLENBQUE7QUFDakYsT0FBTyxFQUNOLGdCQUFnQixFQUNo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