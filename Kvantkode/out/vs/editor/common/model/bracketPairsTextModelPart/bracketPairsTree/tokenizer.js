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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS90b2tlbml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFxQixhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVyRixPQUFPLEVBQWtCLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUV0RCxPQUFPLEVBRU4sU0FBUyxFQUNULFVBQVUsRUFDVixtQ0FBbUMsRUFDbkMsV0FBVyxFQUNYLFVBQVUsRUFDVixRQUFRLEdBQ1IsTUFBTSxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFhMUQsTUFBTSxDQUFOLElBQWtCLFNBSWpCO0FBSkQsV0FBa0IsU0FBUztJQUMxQix5Q0FBUSxDQUFBO0lBQ1IsNkRBQWtCLENBQUE7SUFDbEIsNkRBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUppQixTQUFTLEtBQVQsU0FBUyxRQUkxQjtBQUlELE1BQU0sT0FBTyxLQUFLO0lBQ2pCLFlBQ1UsTUFBYyxFQUNkLElBQWU7SUFDeEI7Ozs7T0FJRztJQUNNLFNBQTJCO0lBQ3BDOzs7O09BSUc7SUFDTSxVQUErQyxFQUMvQyxPQUFpRDtRQWRqRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBVztRQU1mLGNBQVMsR0FBVCxTQUFTLENBQWtCO1FBTTNCLGVBQVUsR0FBVixVQUFVLENBQXFDO1FBQy9DLFlBQU8sR0FBUCxPQUFPLENBQTBDO0lBQ3hELENB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