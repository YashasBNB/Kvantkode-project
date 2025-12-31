/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './tokens/markdownToken.js';
import { LeftBracket } from '../simpleCodec/tokens/brackets.js';
import { PartialMarkdownImage } from './parsers/markdownImage.js';
import { LeftAngleBracket } from '../simpleCodec/tokens/angleBrackets.js';
import { ExclamationMark } from '../simpleCodec/tokens/exclamationMark.js';
import { BaseDecoder } from '../../../../base/common/codecs/baseDecoder.js';
import { SimpleDecoder } from '../simpleCodec/simpleDecoder.js';
import { MarkdownCommentStart, PartialMarkdownCommentStart } from './parsers/markdownComment.js';
import { PartialMarkdownLinkCaption, } from './parsers/markdownLink.js';
/**
 * Decoder capable of parsing markdown entities (e.g., links) from a sequence of simple tokens.
 */
export class MarkdownDecoder extends BaseDecoder {
    constructor(stream) {
        super(new SimpleDecoder(stream));
    }
    onStreamData(token) {
        // `markdown links` start with `[` character, so here we can
        // initiate the process of parsing a markdown link
        if (token instanceof LeftBracket && !this.current) {
            this.current = new PartialMarkdownLinkCaption(token);
            return;
        }
        // `markdown comments` start with `<` character, so here we can
        // initiate the process of parsing a markdown comment
        if (token instanceof LeftAngleBracket && !this.current) {
            this.current = new PartialMarkdownCommentStart(token);
            return;
        }
        // `markdown image links` start with `!` character, so here we can
        // initiate the process of parsing a markdown image
        if (token instanceof ExclamationMark && !this.current) {
            this.current = new PartialMarkdownImage(token);
            return;
        }
        // if current parser was not initiated before, - we are not inside a sequence
        // of tokens we care about, therefore re-emit the token immediately and continue
        if (!this.current) {
            this._onData.fire(token);
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        if (parseResult.result === 'success') {
            const { nextParser } = parseResult;
            // if got a fully parsed out token back, emit it and reset
            // the current parser object so a new parsing process can start
            if (nextParser instanceof MarkdownToken) {
                this._onData.fire(nextParser);
                delete this.current;
            }
            else {
                // otherwise, update the current parser object
                this.current = nextParser;
            }
        }
        else {
            // if failed to parse a sequence of a tokens as a single markdown
            // entity (e.g., a link), re-emit the tokens accumulated so far
            // then reset the current parser object
            for (const token of this.current.tokens) {
                this._onData.fire(token);
                delete this.current;
            }
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        // if the stream has ended and there is a current incomplete parser
        // object present, handle the remaining parser object
        if (this.current) {
            // if a `markdown comment` does not have an end marker `-->`
            // it is still a comment that extends to the end of the file
            // so re-emit the current parser as a comment token
            if (this.current instanceof MarkdownCommentStart) {
                this._onData.fire(this.current.asMarkdownComment());
                delete this.current;
                return this.onStreamEnd();
            }
            // in all other cases, re-emit existing parser tokens
            const { tokens } = this.current;
            delete this.current;
            for (const token of [...tokens]) {
                this._onData.fire(token);
            }
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25EZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbWFya2Rvd25Db2RlYy9tYXJrZG93bkRlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXpELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQWdCLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEcsT0FBTyxFQUdOLDBCQUEwQixHQUMxQixNQUFNLDJCQUEyQixDQUFBO0FBT2xDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBeUM7SUFhN0UsWUFBWSxNQUFnQztRQUMzQyxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRWtCLFlBQVksQ0FBQyxLQUFtQjtRQUNsRCw0REFBNEQ7UUFDNUQsa0RBQWtEO1FBQ2xELElBQUksS0FBSyxZQUFZLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksMEJBQTBCLENBQUMsS0FBSyxD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