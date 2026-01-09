/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownLink } from '../tokens/markdownLink.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { assert } from '../../../../../base/common/assert.js';
import { FormFeed } from '../../simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
import { RightBracket } from '../../simpleCodec/tokens/brackets.js';
import { ParserBase } from '../../simpleCodec/parserBase.js';
import { LeftParenthesis, RightParenthesis } from '../../simpleCodec/tokens/parentheses.js';
/**
 * List of characters that are not allowed in links so stop a markdown link sequence abruptly.
 */
const MARKDOWN_LINK_STOP_CHARACTERS = [
    CarriageReturn,
    NewLine,
    VerticalTab,
    FormFeed,
].map((token) => {
    return token.symbol;
});
/**
 * The parser responsible for parsing a `markdown link caption` part of a markdown
 * link (e.g., the `[caption text]` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with single `[` token and collects all tokens until
 * the first `]` token is encountered. In this successful case, the parser transitions
 * into the {@linkcode MarkdownLinkCaption} parser type which continues the general
 * parsing process of the markdown link.
 *
 * Otherwise, if one of the stop characters defined in the {@linkcode MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the `]` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 */
export class PartialMarkdownLinkCaption extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // any of stop characters is are breaking a markdown link caption sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the `]` character ends the caption of a markdown link
        if (token instanceof RightBracket) {
            return {
                result: 'success',
                nextParser: new MarkdownLinkCaption([...this.tokens, token]),
                wasTokenConsumed: true,
            };
        }
        // otherwise, include the token in the sequence
        // and keep the current parser object instance
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
/**
 * The parser responsible for transitioning from a {@linkcode PartialMarkdownLinkCaption}
 * parser to the {@link PartialMarkdownLink} one, therefore serves a parser glue between
 * the `[caption]` and the `(./some/path)` parts of the `[caption](./some/path)` link.
 *
 * The only successful case of this parser is the `(` token that initiated the process
 * of parsing the `reference` part of a markdown link and in this case the parser
 * transitions into the `PartialMarkdownLink` parser type.
 *
 * Any other character is considered a failure result. In this case, the caller is assumed
 * to be responsible for re-emitting the {@link tokens} accumulated so far as standalone
 * entities since they are no longer represent a coherent token entity of a larger size.
 */
export class MarkdownLinkCaption extends ParserBase {
    accept(token) {
        // the `(` character starts the link part of a markdown link
        // that is the only character that can follow the caption
        if (token instanceof LeftParenthesis) {
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: new PartialMarkdownLink([...this.tokens], token),
            };
        }
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
/**
 * The parser responsible for parsing a `link reference` part of a markdown link
 * (e.g., the `(./some/path)` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with tokens that represent the `[caption]` part of a markdown
 * link, followed by the `(` token. The parser collects all subsequent tokens until final closing
 * parenthesis (`)`) is encountered (*\*see [1] below*). In this successful case, the parser object
 * transitions into the {@linkcode MarkdownLink} token type which signifies the end of the entire
 * parsing process of the link text.
 *
 * Otherwise, if one of the stop characters defined in the {@linkcode MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the final `)` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 *
 * `[1]` The `reference` part of the markdown link can contain any number of nested parenthesis, e.g.,
 * 	  `[caption](/some/p(th/file.md)` is a valid markdown link and a valid folder name, hence number
 *     of open parenthesis must match the number of closing ones and the path sequence is considered
 *     to be complete as soon as this requirement is met. Therefore the `final` word is used in
 *     the description comments above to highlight this important detail.
 */
export class PartialMarkdownLink extends ParserBase {
    constructor(captionTokens, token) {
        super([token]);
        this.captionTokens = captionTokens;
        /**
         * Number of open parenthesis in the sequence.
         * See comment in the {@linkcode accept} method for more details.
         */
        this.openParensCount = 1;
    }
    get tokens() {
        return [...this.captionTokens, ...this.currentTokens];
    }
    accept(token) {
        // markdown links allow for nested parenthesis inside the link reference part, but
        // the number of open parenthesis must match the number of closing parenthesis, e.g.:
        // 	- `[caption](/some/p()th/file.md)` is a valid markdown link
        // 	- `[caption](/some/p(th/file.md)` is an invalid markdown link
        // hence we use the `openParensCount` variable to keep track of the number of open
        // parenthesis encountered so far; then upon encountering a closing parenthesis we
        // decrement the `openParensCount` and if it reaches 0 - we consider the link reference
        // to be complete
        if (token instanceof LeftParenthesis) {
            this.openParensCount += 1;
        }
        if (token instanceof RightParenthesis) {
            this.openParensCount -= 1;
            // sanity check! this must alway hold true because we return a complete markdown
            // link as soon as we encounter matching number of closing parenthesis, hence
            // we must never have `openParensCount` that is less than 0
            assert(this.openParensCount >= 0, `Unexpected right parenthesis token encountered: '${token}'.`);
            // the markdown link is complete as soon as we get the same number of closing parenthesis
            if (this.openParensCount === 0) {
                const { startLineNumber, startColumn } = this.captionTokens[0].range;
                // create link caption string
                const caption = this.captionTokens
                    .map((token) => {
                    return token.text;
                })
                    .join('');
                // create link reference string
                this.currentTokens.push(token);
                const reference = this.currentTokens
                    .map((token) => {
                    return token.text;
                })
                    .join('');
                // return complete markdown link object
                return {
                    result: 'success',
                    wasTokenConsumed: true,
                    nextParser: new MarkdownLink(startLineNumber, startColumn, caption, reference),
                };
            }
        }
        // any of stop characters is are breaking a markdown link reference sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the rest of the tokens can be included in the sequence
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9tYXJrZG93bkNvZGVjL3BhcnNlcnMvbWFya2Rvd25MaW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUzRjs7R0FFRztBQUNILE1BQU0sNkJBQTZCLEdBQXNCO0lBQ3hELGNBQWM7SUFDZCxPQUFPO0lBQ1AsV0FBVztJQUNYLFFBQVE7Q0FDUixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO0lBQ2YsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFBO0FBQ3BCLENBQUMsQ0FBQyxDQUFBO0FBRUY7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFHL0M7SUFDQSxZQUFZLEtBQWtCO1FBQzdCLEtBQUssQ0FBQyxDQUFDLEtBQUss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