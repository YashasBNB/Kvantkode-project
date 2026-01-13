/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalState } from '../../../base/common/errors.js';
import { localize } from '../../../nls.js';
export var TokenType;
(function (TokenType) {
    TokenType[TokenType["LParen"] = 0] = "LParen";
    TokenType[TokenType["RParen"] = 1] = "RParen";
    TokenType[TokenType["Neg"] = 2] = "Neg";
    TokenType[TokenType["Eq"] = 3] = "Eq";
    TokenType[TokenType["NotEq"] = 4] = "NotEq";
    TokenType[TokenType["Lt"] = 5] = "Lt";
    TokenType[TokenType["LtEq"] = 6] = "LtEq";
    TokenType[TokenType["Gt"] = 7] = "Gt";
    TokenType[TokenType["GtEq"] = 8] = "GtEq";
    TokenType[TokenType["RegexOp"] = 9] = "RegexOp";
    TokenType[TokenType["RegexStr"] = 10] = "RegexStr";
    TokenType[TokenType["True"] = 11] = "True";
    TokenType[TokenType["False"] = 12] = "False";
    TokenType[TokenType["In"] = 13] = "In";
    TokenType[TokenType["Not"] = 14] = "Not";
    TokenType[TokenType["And"] = 15] = "And";
    TokenType[TokenType["Or"] = 16] = "Or";
    TokenType[TokenType["Str"] = 17] = "Str";
    TokenType[TokenType["QuotedStr"] = 18] = "QuotedStr";
    TokenType[TokenType["Error"] = 19] = "Error";
    TokenType[TokenType["EOF"] = 20] = "EOF";
})(TokenType || (TokenType = {}));
function hintDidYouMean(...meant) {
    switch (meant.length) {
        case 1:
            return localize('contextkey.scanner.hint.didYouMean1', 'Did you mean {0}?', meant[0]);
        case 2:
            return localize('contextkey.scanner.hint.didYouMean2', 'Did you mean {0} or {1}?', meant[0], meant[1]);
        case 3:
            return localize('contextkey.scanner.hint.didYouMean3', 'Did you mean {0}, {1} or {2}?', meant[0], meant[1], meant[2]);
        default: // we just don't expect that many
            return undefined;
    }
}
const hintDidYouForgetToOpenOrCloseQuote = localize('contextkey.scanner.hint.didYouForgetToOpenOrCloseQuote', 'Did you forget to open or close the quote?');
const hintDidYouForgetToEscapeSlash = localize('contextkey.scanner.hint.didYouForgetToEscapeSlash', "Did you forget to escape the '/' (slash) character? Put two backslashes before it to escape, e.g., '\\\\/\'.");
/**
 * A simple scanner for context keys.
 *
 * Example:
 *
 * ```ts
 * const scanner = new Scanner().reset('resourceFileName =~ /docker/ && !config.docker.enabled');
 * const tokens = [...scanner];
 * if (scanner.errorTokens.length > 0) {
 *     scanner.errorTokens.forEach(err => console.error(`Unexpected token at ${err.offset}: ${err.lexeme}\nHint: ${err.additional}`));
 * } else {
 *     // process tokens
 * }
 * ```
 */
export class Scanner {
    constructor() {
        this._input = '';
        this._start = 0;
        this._current = 0;
        this._tokens = [];
        this._errors = [];
        // u - unicode, y - sticky // TODO@ulugbekna: we accept double quotes as part of the string rather than as a delimiter (to preserve old parser's behavior)
        this.stringRe = /[a-zA-Z0-9_<>\-\./\\:\*\?\+\[\]\^,#@;"%\$\p{L}-]+/uy;
    }
    static getLexeme(token) {
        switch (token.type) {
            case 0 /* TokenType.LParen */:
                return '(';
            case 1 /* TokenType.RParen */:
                return ')';
            case 2 /* TokenType.Neg */:
                return '!';
            case 3 /* TokenType.Eq */:
                return token.isTripleEq ? '===' : '==';
            case 4 /* TokenType.NotEq */:
                return token.isTripleEq ? '!==' : '!=';
            case 5 /* TokenType.Lt */:
                return '<';
            case 6 /* TokenType.LtEq */:
                return '<=';
            case 7 /* TokenType.Gt */:
                return '>=';
            case 8 /* TokenType.GtEq */:
                return '>=';
            case 9 /* TokenType.RegexOp */:
                return '=~';
            case 10 /* TokenType.RegexStr */:
                return token.lexeme;
            case 11 /* TokenType.True */:
                return 'true';
            case 12 /* TokenType.False */:
                return 'false';
            case 13 /* TokenType.In */:
                return 'in';
            case 14 /* TokenType.Not */:
                return 'not';
            case 15 /* TokenType.And */:
                return '&&';
            case 16 /* TokenType.Or */:
                return '||';
            case 17 /* TokenType.Str */:
                return token.lexeme;
            case 18 /* TokenType.QuotedStr */:
                return token.lexeme;
            case 19 /* TokenType.Error */:
                return token.lexeme;
            case 20 /* TokenType.EOF */:
                return 'EOF';
            default:
                throw illegalState(`unhandled token type: ${JSON.stringify(token)}; have you forgotten to add a case?`);
        }
    }
    static { this._regexFlags = new Set(['i', 'g', 's', 'm', 'y', 'u'].map((ch) => ch.charCodeAt(0))); }
    static { this._keywords = new Map([
        ['not', 14 /* TokenType.Not */],
        ['in', 13 /* TokenType.In */],
        ['false', 12 /* TokenType.False */],
        ['true', 11 /* TokenType.True */],
    ]); }
    get errors() {
        return this._errors;
    }
    reset(value) {
        this._input = value;
        this._start = 0;
        this._current = 0;
        this._tokens = [];
        this._errors = [];
        return this;
    }
    scan() {
        while (!this._isAtEnd()) {
            this._start = this._current;
            const ch = this._advance();
            switch (ch) {
                case 40 /* CharCode.OpenParen */:
                    this._addToken(0 /* TokenType.LParen */);
                    break;
                case 41 /* CharCode.CloseParen */:
                    this._addToken(1 /* TokenType.RParen */);
                    break;
                case 33 /* CharCode.ExclamationMark */:
                    if (this._match(61 /* CharCode.Equals */)) {
                        const isTripleEq = this._match(61 /* CharCode.Equals */); // eat last `=` if `!==`
                        this._tokens.push({ type: 4 /* TokenType.NotEq */, offset: this._start, isTripleEq });
                    }
                    else {
                        this._addToken(2 /* TokenType.Neg */);
                    }
                    break;
                case 39 /* CharCode.SingleQuote */:
                    this._quotedString();
                    break;
                case 47 /* CharCode.Slash */:
                    this._regex();
                    break;
                case 61 /* CharCode.Equals */:
                    if (this._match(61 /* CharCode.Equals */)) {
                        // support `==`
                        const isTripleEq = this._match(61 /* CharCode.Equals */); // eat last `=` if `===`
                        this._tokens.push({ type: 3 /* TokenType.Eq */, offset: this._start, isTripleEq });
                    }
                    else if (this._match(126 /* CharCode.Tilde */)) {
                        this._addToken(9 /* TokenType.RegexOp */);
                    }
                    else {
                        this._error(hintDidYouMean('==', '=~'));
                    }
                    break;
                case 60 /* CharCode.LessThan */:
                    this._addToken(this._match(61 /* CharCode.Equals */) ? 6 /* TokenType.LtEq */ : 5 /* TokenType.Lt */);
                    break;
                case 62 /* CharCode.GreaterThan */:
                    this._addToken(this._match(61 /* CharCode.Equals */) ? 8 /* TokenType.GtEq */ : 7 /* TokenType.Gt */);
                    break;
                case 38 /* CharCode.Ampersand */:
                    if (this._match(38 /* CharCode.Ampersand */)) {
                        this._addToken(15 /* TokenType.And */);
                    }
                    else {
                        this._error(hintDidYouMean('&&'));
                    }
                    break;
                case 124 /* CharCode.Pipe */:
                    if (this._match(124 /* CharCode.Pipe */)) {
                        this._addToken(16 /* TokenType.Or */);
                    }
                    else {
                        this._error(hintDidYouMean('||'));
                    }
                    break;
                // TODO@ulugbekna: 1) rewrite using a regex 2) reconsider what characters are considered whitespace, including unicode, nbsp, etc.
                case 32 /* CharCode.Space */:
                case 13 /* CharCode.CarriageReturn */:
                case 9 /* CharCode.Tab */:
                case 10 /* CharCode.LineFeed */:
                case 160 /* CharCode.NoBreakSpace */: // &nbsp
                    break;
                default:
                    this._string();
            }
        }
        this._start = this._current;
        this._addToken(20 /* TokenType.EOF */);
        return Array.from(this._tokens);
    }
    _match(expected) {
        if (this._isAtEnd()) {
            return false;
        }
        if (this._input.charCodeAt(this._current) !== expected) {
            return false;
        }
        this._current++;
        return true;
    }
    _advance() {
        return this._input.charCodeAt(this._current++);
    }
    _peek() {
        return this._isAtEnd() ? 0 /* CharCode.Null */ : this._input.charCodeAt(this._current);
    }
    _addToken(type) {
        this._tokens.push({ type, offset: this._start });
    }
    _error(additional) {
        const offset = this._start;
        const lexeme = this._input.substring(this._start, this._current);
        const errToken = { type: 19 /* TokenType.Error */, offset: this._start, lexeme };
        this._errors.push({ offset, lexeme, additionalInfo: additional });
        this._tokens.push(errToken);
    }
    _string() {
        this.stringRe.lastIndex = this._start;
        const match = this.stringRe.exec(this._input);
        if (match) {
            this._current = this._start + match[0].length;
            const lexeme = this._input.substring(this._start, this._current);
            const keyword = Scanner._keywords.get(lexeme);
            if (keyword) {
                this._addToken(keyword);
            }
            else {
                this._tokens.push({ type: 17 /* TokenType.Str */, lexeme, offset: this._start });
            }
        }
    }
    // captures the lexeme without the leading and trailing '
    _quotedString() {
        while (this._peek() !== 39 /* CharCode.SingleQuote */ && !this._isAtEnd()) {
            // TODO@ulugbekna: add support for escaping ' ?
            this._advance();
        }
        if (this._isAtEnd()) {
            this._error(hintDidYouForgetToOpenOrCloseQuote);
            return;
        }
        // consume the closing '
        this._advance();
        this._tokens.push({
            type: 18 /* TokenType.QuotedStr */,
            lexeme: this._input.substring(this._start + 1, this._current - 1),
            offset: this._start + 1,
        });
    }
    /*
     * Lexing a regex expression: /.../[igsmyu]*
     * Based on https://github.com/microsoft/TypeScript/blob/9247ef115e617805983740ba795d7a8164babf89/src/compiler/scanner.ts#L2129-L2181
     *
     * Note that we want slashes within a regex to be escaped, e.g., /file:\\/\\/\\// should match `file:///`
     */
    _regex() {
        let p = this._current;
        let inEscape = false;
        let inCharacterClass = false;
        while (true) {
            if (p >= this._input.length) {
                this._current = p;
                this._error(hintDidYouForgetToEscapeSlash);
                return;
            }
            const ch = this._input.charCodeAt(p);
            if (inEscape) {
                // parsing an escape character
                inEscape = false;
            }
            else if (ch === 47 /* CharCode.Slash */ && !inCharacterClass) {
                // end of regex
                p++;
                break;
            }
            else if (ch === 91 /* CharCode.OpenSquareBracket */) {
                inCharacterClass = true;
            }
            else if (ch === 92 /* CharCode.Backslash */) {
                inEscape = true;
            }
            else if (ch === 93 /* CharCode.CloseSquareBracket */) {
                inCharacterClass = false;
            }
            p++;
        }
        // Consume flags // TODO@ulugbekna: use regex instead
        while (p < this._input.length && Scanner._regexFlags.has(this._input.charCodeAt(p))) {
            p++;
        }
        this._current = p;
        const lexeme = this._input.substring(this._start, this._current);
        this._tokens.push({ type: 10 /* TokenType.RegexStr */, lexeme, offset: this._start });
    }
    _isAtEnd() {
        return this._current >= this._input.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dGtleS9jb21tb24vc2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE1BQU0sQ0FBTixJQUFrQixTQXNCakI7QUF0QkQsV0FBa0IsU0FBUztJQUMxQiw2Q0FBTSxDQUFBO0lBQ04sNkNBQU0sQ0FBQTtJQUNOLHVDQUFHLENBQUE7SUFDSCxxQ0FBRSxDQUFBO0lBQ0YsMkNBQUssQ0FBQTtJQUNMLHFDQUFFLENBQUE7SUFDRix5Q0FBSSxDQUFBO0lBQ0oscUNBQUUsQ0FBQTtJQUNGLHlDQUFJLENBQUE7SUFDSiwrQ0FBTyxDQUFBO0lBQ1Asa0RBQVEsQ0FBQTtJQUNSLDBDQUFJLENBQUE7SUFDSiw0Q0FBSyxDQUFBO0lBQ0wsc0NBQUUsQ0FBQTtJQUNGLHdDQUFHLENBQUE7SUFDSCx3Q0FBRyxDQUFBO0lBQ0gsc0NBQUUsQ0FBQTtJQUNGLHdDQUFHLENBQUE7SUFDSCxvREFBUyxDQUFBO0lBQ1QsNENBQUssQ0FBQTtJQUNMLHdDQUFHLENBQUE7QUFDSixDQUFDLEVBdEJpQixTQUFTLEtBQVQsU0FBUyxRQXNCMUI7QUFzREQsU0FBUyxjQUFjLENBQUMsR0FBRyxLQUFlO0lBQ3pDLFFBQVEsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQztZQUNMLE9BQU8sUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLEtBQUssQ0FBQztZQUNMLE9BQU8s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