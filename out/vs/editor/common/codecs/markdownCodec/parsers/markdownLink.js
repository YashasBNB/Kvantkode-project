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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duTGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0Y7O0dBRUc7QUFDSCxNQUFNLDZCQUE2QixHQUFzQjtJQUN4RCxjQUFjO0lBQ2QsT0FBTztJQUNQLFdBQVc7SUFDWCxRQUFRO0NBQ1IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtJQUNmLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQTtBQUNwQixDQUFDLENBQUMsQ0FBQTtBQUVGOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBRy9DO0lBQ0EsWUFBWSxLQUFrQjtRQUM3QixLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2YsQ0FB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