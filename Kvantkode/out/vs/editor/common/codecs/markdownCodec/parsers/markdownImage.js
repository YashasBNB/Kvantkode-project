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
import { MarkdownLink } from '../tokens/markdownLink.js';
import { MarkdownImage } from '../tokens/markdownImage.js';
import { LeftBracket } from '../../simpleCodec/tokens/brackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
import { PartialMarkdownLinkCaption, } from './markdownLink.js';
/**
 * The parser responsible for parsing the `markdown image` sequence of characters.
 * E.g., `![alt text](./path/to/image.jpeg)` syntax.
 */
export class PartialMarkdownImage extends ParserBase {
    constructor(token) {
        super([token]);
    }
    /**
     * Get all currently available tokens of the `markdown link` sequence.
     */
    get tokens() {
        const linkTokens = this.markdownLinkParser?.tokens ?? [];
        return [...this.currentTokens, ...linkTokens];
    }
    accept(token) {
        // on the first call we expect a character that begins `markdown link` sequence
        // hence we initiate the markdown link parsing process, otherwise we fail
        if (!this.markdownLinkParser) {
            if (token instanceof LeftBracket) {
                this.markdownLinkParser = new PartialMarkdownLinkCaption(token);
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // handle subsequent tokens next
        const acceptResult = this.markdownLinkParser.accept(token);
        const { result, wasTokenConsumed } = acceptResult;
        if (result === 'success') {
            const { nextParser } = acceptResult;
            // if full markdown link was parsed out, the process completes
            if (nextParser instanceof MarkdownLink) {
                this.isConsumed = true;
                const firstToken = this.currentTokens[0];
                return {
                    result,
                    wasTokenConsumed,
                    nextParser: new MarkdownImage(firstToken.range.startLineNumber, firstToken.range.startColumn, `${firstToken.text}${nextParser.caption}`, nextParser.reference),
                };
            }
            // otherwise save new link parser reference and continue
            this.markdownLinkParser = nextParser;
            return {
                result,
                wasTokenConsumed,
                nextParser: this,
            };
        }
        // return the failure result
        this.isConsumed = true;
        return acceptResult;
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownImage.prototype, "accept", null);
