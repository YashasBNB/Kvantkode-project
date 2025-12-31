/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NotSupportedError } from '../../../../../base/common/errors.js';
import { TokenMetadata } from '../../../encodedTokenAttributes.js';
import { TextAstNode } from './ast.js';
import { lengthAdd, lengthDiff, lengthGetColumnCountIfZeroLineCount, lengthToObj, lengthZero, toLength, } from './length.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
export var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["Text"] = 0] = "Text";
    TokenKind[TokenKind["OpeningBracket"] = 1] = "OpeningBracket";
    TokenKind[TokenKind["ClosingBracket"] = 2] = "ClosingBracket";
})(TokenKind || (TokenKind = {}));
export class Token {
    constructor(length, kind, 
    /**
     * If this token is an opening bracket, this is the id of the opening bracket.
     * If this token is a closing bracket, this is the id of the first opening bracket that is closed by this bracket.
     * Otherwise, it is -1.
     */
    bracketId, 
    /**
     * If this token is an opening bracket, this just contains `bracketId`.
     * If this token is a closing bracket, this lists all opening bracket ids, that it closes.
     * Otherwise, it is empty.
     */
    bracketIds, astNode) {
        this.length = length;
        this.kind = kind;
        this.bracketId = bracketId;
        this.bracketIds = bracketIds;
        this.astNode = astNode;
    }
}
export class TextBufferTokenizer {
    constructor(textModel, bracketTokens) {
        this.textModel = textModel;
        this.bracketTokens = bracketTokens;
        this.reader = new NonPeekableTextBufferTokenizer(this.textModel, this.bracketTokens);
        this._offset = lengthZero;
        this.didPeek = false;
        this.peeked = null;
        this.textBufferLineCount = textModel.getLineCount();
        this.textBufferLastLineLength = textModel.getLineLength(this.textBufferLineCount);
    }
    get offset() {
        return this._offset;
    }
    get length() {
        return toLength(this.textBufferLineCount - 1, this.textBufferLastLineLength);
    }
    getText() {
        return this.textModel.getValue();
    }
    skip(length) {
        this.didPeek = false;
        this._offset = lengthAdd(this._offset, length);
        const obj = lengthToObj(this._offset);
        this.reader.setPosition(obj.lineCount, obj.columnCount);
    }
    read() {
        let token;
        if (this.peeked) {
            this.didPeek = false;
            token = this.peeked;
        }
        else {
            token = this.reader.read();
        }
        if (token) {
            this._offset = lengthAdd(this._offset, token.length);
        }
        return token;
    }
    peek() {
        if (!this.didPeek) {
            this.peeked = this.reader.read();
            this.didPeek = true;
        }
        return this.peeked;
    }
}
/**
 * Does not support peek.
 */
class NonPeekableTextBufferTokenizer {
    constructor(textModel, bracketTokens) {
        this.textModel = textModel;
        this.bracketTokens = bracketTokens;
        this.lineIdx = 0;
        this.line = null;
        this.lineCharOffset = 0;
        this.lineTokens = null;
        this.lineTokenOffset = 0;
        /** Must be a zero line token. The end of the document cannot be peeked. */
        this.peekedToken = null;
        this.textBufferLineCount = textModel.getLineCount();
        this.textBufferLastLineLength = textModel.getLineLength(this.textBufferLineCount);
    }
    setPosition(lineIdx, column) {
        // We must not jump into a token!
        if (lineIdx === this.lineIdx) {
            this.lineCharOffset = column;
            if (this.line !== null) {
                this.lineTokenOffset =
                    this.lineCharOffset === 0
                        ? 0
                        : this.lineTokens.findTokenIndexAtOffset(this.lineCharOffset);
            }
        }
        else {
            this.lineIdx = lineIdx;
            this.lineCharOffset = column;
            this.line = null;
        }
        this.peekedToken = null;
    }
    read() {
        if (this.peekedToken) {
            const token = this.peekedToken;
            this.peekedToken = null;
            this.lineCharOffset += lengthGetColumnCountIfZeroLineCount(token.length);
            return token;
        }
        if (this.lineIdx > this.textBufferLineCount - 1 ||
            (this.lineIdx === this.textBufferLineCount - 1 &&
                this.lineCharOffset >= this.textBufferLastLineLength)) {
            // We are after the end
            return null;
        }
        if (this.line === null) {
            this.lineTokens = this.textModel.tokenization.getLineTokens(this.lineIdx + 1);
            this.line = this.lineTokens.getLineContent();
            this.lineTokenOffset =
                this.lineCharOffset === 0 ? 0 : this.lineTokens.findTokenIndexAtOffset(this.lineCharOffset);
        }
        const startLineIdx = this.lineIdx;
        const startLineCharOffset = this.lineCharOffset;
        // limits the length of text tokens.
        // If text tokens get too long, incremental updates will be slow
        let lengthHeuristic = 0;
        while (true) {
            const lineTokens = this.lineTokens;
            const tokenCount = lineTokens.getCount();
            let peekedBracketToken = null;
            if (this.lineTokenOffset < tokenCount) {
                const tokenMetadata = lineTokens.getMetadata(this.lineTokenOffset);
                while (this.lineTokenOffset + 1 < tokenCount &&
                    tokenMetadata === lineTokens.getMetadata(this.lineTokenOffset + 1)) {
                    // Skip tokens that are identical.
                    // Sometimes, (bracket) identifiers are split up into multiple tokens.
                    this.lineTokenOffset++;
                }
                const isOther = TokenMetadata.getTokenType(tokenMetadata) === 0 /* StandardTokenType.Other */;
                const containsBracketType = TokenMetadata.containsBalancedBrackets(tokenMetadata);
                const endOffset = lineTokens.getEndOffset(this.lineTokenOffset);
                // Is there a bracket token next? Only consume text.
                if (containsBracketType && isOther && this.lineCharOffset < endOffset) {
                    const languageId = lineTokens.getLanguageId(this.lineTokenOffset);
                    const text = this.line.substring(this.lineCharOffset, endOffset);
                    const brackets = this.bracketTokens.getSingleLanguageBracketTokens(languageId);
                    const regexp = brackets.regExpGlobal;
                    if (regexp) {
                        regexp.lastIndex = 0;
                        const match = regexp.exec(text);
                        if (match) {
                            peekedBracketToken = brackets.getToken(match[0]);
                            if (peekedBracketToken) {
                                // Consume leading text of the token
                                this.lineCharOffset += match.index;
                            }
                        }
                    }
                }
                lengthHeuristic += endOffset - this.lineCharOffset;
                if (peekedBracketToken) {
                    // Don't skip the entire token, as a single token could contain multiple brackets.
                    if (startLineIdx !== this.lineIdx || startLineCharOffset !== this.lineCharOffset) {
                        // There is text before the bracket
                        this.peekedToken = peekedBracketToken;
                        break;
                    }
                    else {
                        // Consume the peeked token
                        this.lineCharOffset += lengthGetColumnCountIfZeroLineCount(peekedBracketToken.length);
                        return peekedBracketToken;
                    }
                }
                else {
                    // Skip the entire token, as the token contains no brackets at all.
                    this.lineTokenOffset++;
                    this.lineCharOffset = endOffset;
                }
            }
            else {
                if (this.lineIdx === this.textBufferLineCount - 1) {
                    break;
                }
                this.lineIdx++;
                this.lineTokens = this.textModel.tokenization.getLineTokens(this.lineIdx + 1);
                this.lineTokenOffset = 0;
                this.line = this.lineTokens.getLineContent();
                this.lineCharOffset = 0;
                lengthHeuristic += 33; // max 1000/33 = 30 lines
                // This limits the amount of work to recompute min-indentation
                if (lengthHeuristic > 1000) {
                    // only break (automatically) at the end of line.
                    break;
                }
            }
            if (lengthHeuristic > 1500) {
                // Eventually break regardless of the line length so that
                // very long lines do not cause bad performance.
                // This effective limits max indentation to 500, as
                // indentation is not computed across multiple text nodes.
                break;
            }
        }
        // If a token contains some proper indentation, it also contains \n{INDENTATION+}(?!{INDENTATION}),
        // unless the line is too long.
        // Thus, the min indentation of the document is the minimum min indentation of every text node.
        const length = lengthDiff(startLineIdx, startLineCharOffset, this.lineIdx, this.lineCharOffset);
        return new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
    }
}
export class FastTokenizer {
    constructor(text, brackets) {
        this.text = text;
        this._offset = lengthZero;
        this.idx = 0;
        const regExpStr = brackets.getRegExpStr();
        const regexp = regExpStr ? new RegExp(regExpStr + '|\n', 'gi') : null;
        const tokens = [];
        let match;
        let curLineCount = 0;
        let lastLineBreakOffset = 0;
        let lastTokenEndOffset = 0;
        let lastTokenEndLine = 0;
        const smallTextTokens0Line = [];
        for (let i = 0; i < 60; i++) {
            smallTextTokens0Line.push(new Token(toLength(0, i), 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(toLength(0, i))));
        }
        const smallTextTokens1Line = [];
        for (let i = 0; i < 60; i++) {
            smallTextTokens1Line.push(new Token(toLength(1, i), 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(toLength(1, i))));
        }
        if (regexp) {
            regexp.lastIndex = 0;
            // If a token contains indentation, it also contains \n{INDENTATION+}(?!{INDENTATION})
            while ((match = regexp.exec(text)) !== null) {
                const curOffset = match.index;
                const value = match[0];
                if (value === '\n') {
                    curLineCount++;
                    lastLineBreakOffset = curOffset + 1;
                }
                else {
                    if (lastTokenEndOffset !== curOffset) {
                        let token;
                        if (lastTokenEndLine === curLineCount) {
                            const colCount = curOffset - lastTokenEndOffset;
                            if (colCount < smallTextTokens0Line.length) {
                                token = smallTextTokens0Line[colCount];
                            }
                            else {
                                const length = toLength(0, colCount);
                                token = new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
                            }
                        }
                        else {
                            const lineCount = curLineCount - lastTokenEndLine;
                            const colCount = curOffset - lastLineBreakOffset;
                            if (lineCount === 1 && colCount < smallTextTokens1Line.length) {
                                token = smallTextTokens1Line[colCount];
                            }
                            else {
                                const length = toLength(lineCount, colCount);
                                token = new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
                            }
                        }
                        tokens.push(token);
                    }
                    // value is matched by regexp, so the token must exist
                    tokens.push(brackets.getToken(value));
                    lastTokenEndOffset = curOffset + value.length;
                    lastTokenEndLine = curLineCount;
                }
            }
        }
        const offset = text.length;
        if (lastTokenEndOffset !== offset) {
            const length = lastTokenEndLine === curLineCount
                ? toLength(0, offset - lastTokenEndOffset)
                : toLength(curLineCount - lastTokenEndLine, offset - lastLineBreakOffset);
            tokens.push(new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length)));
        }
        this.length = toLength(curLineCount, offset - lastLineBreakOffset);
        this.tokens = tokens;
    }
    get offset() {
        return this._offset;
    }
    read() {
        return this.tokens[this.idx++] || null;
    }
    peek() {
        return this.tokens[this.idx] || null;
    }
    skip(length) {
        throw new NotSupportedError();
    }
    getText() {
        return this.text;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvdG9rZW5pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBcUIsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckYsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFFdEQsT0FBTyxFQUVOLFNBQVMsRUFDVCxVQUFVLEVBQ1YsbUNBQW1DLEVBQ25DLFdBQVcsRUFDWCxVQUFVLEVBQ1YsUUFBUSxHQUNSLE1BQU0sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBYTFELE1BQU0sQ0FBTixJQUFrQixTQUlqQjtBQUpELFdBQWtCLFNBQVM7SUFDMUIseUNBQVEsQ0FBQTtJQUNSLDZEQUFrQixDQUFBO0lBQ2xCLDZEQUFrQixDQUFBO0FBQ25CLENBQUMsRUFKaUIsU0FBUyxLQUFULFNBQVMsUUFJMUI7QUFJRCxNQUFNLE9BQU8sS0FBSztJQUNqQixZQUNVLE1BQWMsRUFDZCxJQUFlO0lBQ3hCOzs7O09BSUc7SUFDTSxTQUEyQjtJQUNwQzs7OztPQUlHO0lBQ00sVUFBK0MsRUFDL0MsT0FBaUQ7UUFkakQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVc7UUFNZixjQUFTLEdBQVQsU0FBUyxDQUFrQjtRQU0zQixlQUFVLEdBQVYsVUFBVSxDQUFxQztRQUMvQyxZQUFPLEdBQVAsT0FBTyxDQUEwQztJQUN4RCxDQUFDO0NBQ0o7QUFZRCxNQUFNLE9BQU8s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