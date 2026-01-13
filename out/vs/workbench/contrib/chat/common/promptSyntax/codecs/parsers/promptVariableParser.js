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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGVQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvcGFyc2Vycy9wcm9tcHRWYXJpYWJsZVBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUMzRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFFbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUZBQWlGLENBQUE7QUFDakgsT0FBTyxFQUNOLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSwwRUFBMEUsQ0FBQTtBQUNq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