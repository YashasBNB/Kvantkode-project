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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHRrZXkvY29tbW9uL3NjYW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxNQUFNLENBQU4sSUFBa0IsU0FzQmpCO0FBdEJELFdBQWtCLFNBQVM7SUFDMUIsNkNBQU0sQ0FBQTtJQUNOLDZDQUFNLENBQUE7SUFDTix1Q0FBRyxDQUFBO0lBQ0gscUNBQUUsQ0FBQTtJQUNGLDJDQUFLLENBQUE7SUFDTCxxQ0FBRSxDQUFBO0lBQ0YseUNBQUksQ0FBQTtJQUNKLHFDQUFFLENBQUE7SUFDRix5Q0FBSSxDQUFBO0lBQ0osK0NBQU8sQ0FBQTtJQUNQLGtEQUFRLENBQUE7SUFDUiwwQ0FBSSxDQUFBO0lBQ0osNENBQUssQ0FBQTtJQUNMLHNDQUFFLENBQUE7SUFDRix3Q0FBRyxDQUFBO0lBQ0gsd0NBQUcsQ0FBQTtJQUNILHNDQUFFLENBQUE7SUFDRix3Q0FBRyxDQUFBO0lBQ0gsb0RBQVMsQ0FBQTtJQUNULDRDQUFLLENBQUE7SUFDTCx3Q0FBRyxDQUFBO0FBQ0osQ0FBQyxFQXRCaUIsU0FBUyxLQUFULFNBQVMsUUFzQjFCO0FBc0RELFNBQVMsY0FBYyxDQUFDLEdBQUcsS0FBZTtJQUN6QyxRQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixLQUFLLENBQUM7WUFDTCxPQUFPLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RixLQUFLLENBQUM7WUFDTCxPQUFPLFFBQVEsQ0FDZCxxQ0FBcUMsRUFDckMs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