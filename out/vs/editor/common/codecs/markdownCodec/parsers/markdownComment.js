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
import { Range } from '../../../core/range.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { pick } from '../../../../../base/common/arrays.js';
import { assert } from '../../../../../base/common/assert.js';
import { MarkdownComment } from '../tokens/markdownComment.js';
import { ExclamationMark } from '../../simpleCodec/tokens/exclamationMark.js';
import { LeftAngleBracket, RightAngleBracket } from '../../simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * The parser responsible for parsing the `<!--` sequence - the start of a `markdown comment`.
 */
export class PartialMarkdownCommentStart extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // if received `!` after `<`, continue the parsing process
        if (token instanceof ExclamationMark && lastToken instanceof LeftAngleBracket) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if received `-` after, check that previous token either `!` or `-`,
        // which allows to continue the parsing process, otherwise fail
        if (token instanceof Dash) {
            this.currentTokens.push(token);
            if (lastToken instanceof ExclamationMark) {
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            if (lastToken instanceof Dash) {
                const token1 = this.currentTokens[0];
                const token2 = this.currentTokens[1];
                const token3 = this.currentTokens[2];
                const token4 = this.currentTokens[3];
                // sanity checks
                assert(token1 instanceof LeftAngleBracket, `The first token must be a '<', got '${token1}'.`);
                assert(token2 instanceof ExclamationMark, `The second token must be a '!', got '${token2}'.`);
                assert(token3 instanceof Dash, `The third token must be a '-', got '${token3}'.`);
                assert(token4 instanceof Dash, `The fourth token must be a '-', got '${token4}'.`);
                this.isConsumed = true;
                return {
                    result: 'success',
                    nextParser: new MarkdownCommentStart([token1, token2, token3, token4]),
                    wasTokenConsumed: true,
                };
            }
        }
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownCommentStart.prototype, "accept", null);
/**
 * The parser responsible for a `markdown comment` sequence of tokens.
 * E.g. `<!-- some comment` which may or may not end with `-->`. If it does,
 * then the parser transitions to the {@link MarkdownComment} token.
 */
export class MarkdownCommentStart extends ParserBase {
    constructor(tokens) {
        super(tokens);
    }
    accept(token) {
        // if received `>` while current token sequence ends with `--`,
        // then this is the end of the comment sequence
        if (token instanceof RightAngleBracket && this.endsWithDashes) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this.asMarkdownComment(),
                wasTokenConsumed: true,
            };
        }
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Convert the current token sequence into a {@link MarkdownComment} token.
     *
     * Note! that this method marks the current parser object as "consumend"
     *       hence it should not be used after this method is called.
     */
    asMarkdownComment() {
        this.isConsumed = true;
        const text = this.currentTokens.map(pick('text')).join('');
        return new MarkdownComment(this.range, text);
    }
    /**
     * Get range of current token sequence.
     */
    get range() {
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        const range = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
        return range;
    }
    /**
     * Whether the current token sequence ends with two dashes.
     */
    get endsWithDashes() {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        if (!(lastToken instanceof Dash)) {
            return false;
        }
        const secondLastToken = this.currentTokens[this.currentTokens.length - 2];
        if (!(secondLastToken instanceof Dash)) {
            return false;
        }
        return true;
    }
}
__decorate([
    assertNotConsumed
], MarkdownCommentStart.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Db21tZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duQ29tbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFBO0FBRW5HOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBR2hEO0lBQ0EsWUFBWSxLQUF1QjtRQUNsQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2YsQ0FBQztJQUdNLE1BQU0sQ0FDWixLQUFtQjtRQUVuQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRW5FLDBEQUEwRDtRQUMxRCxJQUFJLEtBQUssWUFBWSxlQUFlLElBQUksU0FBUyxZQUFZLGdCQUFnQixFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFD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