/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isChrome, isEdge, isFirefox, isLinux, isMacintosh, isSafari, isWeb, isWindows, } from '../../../base/common/platform.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { Scanner } from './scanner.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { localize } from '../../../nls.js';
import { illegalArgument } from '../../../base/common/errors.js';
const CONSTANT_VALUES = new Map();
CONSTANT_VALUES.set('false', false);
CONSTANT_VALUES.set('true', true);
CONSTANT_VALUES.set('isMac', isMacintosh);
CONSTANT_VALUES.set('isLinux', isLinux);
CONSTANT_VALUES.set('isWindows', isWindows);
CONSTANT_VALUES.set('isWeb', isWeb);
CONSTANT_VALUES.set('isMacNative', isMacintosh && !isWeb);
CONSTANT_VALUES.set('isEdge', isEdge);
CONSTANT_VALUES.set('isFirefox', isFirefox);
CONSTANT_VALUES.set('isChrome', isChrome);
CONSTANT_VALUES.set('isSafari', isSafari);
/** allow register constant context keys that are known only after startup; requires running `substituteConstants` on the context key - https://github.com/microsoft/vscode/issues/174218#issuecomment-1437972127 */
export function setConstant(key, value) {
    if (CONSTANT_VALUES.get(key) !== undefined) {
        throw illegalArgument('contextkey.setConstant(k, v) invoked with already set constant `k`');
    }
    CONSTANT_VALUES.set(key, value);
}
const hasOwnProperty = Object.prototype.hasOwnProperty;
export var ContextKeyExprType;
(function (ContextKeyExprType) {
    ContextKeyExprType[ContextKeyExprType["False"] = 0] = "False";
    ContextKeyExprType[ContextKeyExprType["True"] = 1] = "True";
    ContextKeyExprType[ContextKeyExprType["Defined"] = 2] = "Defined";
    ContextKeyExprType[ContextKeyExprType["Not"] = 3] = "Not";
    ContextKeyExprType[ContextKeyExprType["Equals"] = 4] = "Equals";
    ContextKeyExprType[ContextKeyExprType["NotEquals"] = 5] = "NotEquals";
    ContextKeyExprType[ContextKeyExprType["And"] = 6] = "And";
    ContextKeyExprType[ContextKeyExprType["Regex"] = 7] = "Regex";
    ContextKeyExprType[ContextKeyExprType["NotRegex"] = 8] = "NotRegex";
    ContextKeyExprType[ContextKeyExprType["Or"] = 9] = "Or";
    ContextKeyExprType[ContextKeyExprType["In"] = 10] = "In";
    ContextKeyExprType[ContextKeyExprType["NotIn"] = 11] = "NotIn";
    ContextKeyExprType[ContextKeyExprType["Greater"] = 12] = "Greater";
    ContextKeyExprType[ContextKeyExprType["GreaterEquals"] = 13] = "GreaterEquals";
    ContextKeyExprType[ContextKeyExprType["Smaller"] = 14] = "Smaller";
    ContextKeyExprType[ContextKeyExprType["SmallerEquals"] = 15] = "SmallerEquals";
})(ContextKeyExprType || (ContextKeyExprType = {}));
const defaultConfig = {
    regexParsingWithErrorRecovery: true,
};
const errorEmptyString = localize('contextkey.parser.error.emptyString', 'Empty context key expression');
const hintEmptyString = localize('contextkey.parser.error.emptyString.hint', "Did you forget to write an expression? You can also put 'false' or 'true' to always evaluate to false or true, respectively.");
const errorNoInAfterNot = localize('contextkey.parser.error.noInAfterNot', "'in' after 'not'.");
const errorClosingParenthesis = localize('contextkey.parser.error.closingParenthesis', "closing parenthesis ')'");
const errorUnexpectedToken = localize('contextkey.parser.error.unexpectedToken', 'Unexpected token');
const hintUnexpectedToken = localize('contextkey.parser.error.unexpectedToken.hint', 'Did you forget to put && or || before the token?');
const errorUnexpectedEOF = localize('contextkey.parser.error.unexpectedEOF', 'Unexpected end of expression');
const hintUnexpectedEOF = localize('contextkey.parser.error.unexpectedEOF.hint', 'Did you forget to put a context key?');
/**
 * A parser for context key expressions.
 *
 * Example:
 * ```ts
 * const parser = new Parser();
 * const expr = parser.parse('foo == "bar" && baz == true');
 *
 * if (expr === undefined) {
 * 	// there were lexing or parsing errors
 * 	// process lexing errors with `parser.lexingErrors`
 *  // process parsing errors with `parser.parsingErrors`
 * } else {
 * 	// expr is a valid expression
 * }
 * ```
 */
export class Parser {
    // Note: this doesn't produce an exact syntax tree but a normalized one
    // ContextKeyExpression's that we use as AST nodes do not expose constructors that do not normalize
    static { this._parseError = new Error(); }
    get lexingErrors() {
        return this._scanner.errors;
    }
    get parsingErrors() {
        return this._parsingErrors;
    }
    constructor(_config = defaultConfig) {
        this._config = _config;
        // lifetime note: `_scanner` lives as long as the parser does, i.e., is not reset between calls to `parse`
        this._scanner = new Scanner();
        // lifetime note: `_tokens`, `_current`, and `_parsingErrors` must be reset between calls to `parse`
        this._tokens = [];
        this._current = 0; // invariant: 0 <= this._current < this._tokens.length ; any incrementation of this value must first call `_isAtEnd`
        this._parsingErrors = [];
        this._flagsGYRe = /g|y/g;
    }
    /**
     * Parse a context key expression.
     *
     * @param input the expression to parse
     * @returns the parsed expression or `undefined` if there's an error - call `lexingErrors` and `parsingErrors` to see the errors
     */
    parse(input) {
        if (input === '') {
            this._parsingErrors.push({
                message: errorEmptyString,
                offset: 0,
                lexeme: '',
                additionalInfo: hintEmptyString,
            });
            return undefined;
        }
        this._tokens = this._scanner.reset(input).scan();
        // @ulugbekna: we do not stop parsing if there are lexing errors to be able to reconstruct regexes with unescaped slashes; TODO@ulugbekna: make this respect config option for recovery
        this._current = 0;
        this._parsingErrors = [];
        try {
            const expr = this._expr();
            if (!this._isAtEnd()) {
                const peek = this._peek();
                const additionalInfo = peek.type === 17 /* TokenType.Str */ ? hintUnexpectedToken : undefined;
                this._parsingErrors.push({
                    message: errorUnexpectedToken,
                    offset: peek.offset,
                    lexeme: Scanner.getLexeme(peek),
                    additionalInfo,
                });
                throw Parser._parseError;
            }
            return expr;
        }
        catch (e) {
            if (!(e === Parser._parseError)) {
                throw e;
            }
            return undefined;
        }
    }
    _expr() {
        return this._or();
    }
    _or() {
        const expr = [this._and()];
        while (this._matchOne(16 /* TokenType.Or */)) {
            const right = this._and();
            expr.push(right);
        }
        return expr.length === 1 ? expr[0] : ContextKeyExpr.or(...expr);
    }
    _and() {
        const expr = [this._term()];
        while (this._matchOne(15 /* TokenType.And */)) {
            const right = this._term();
            expr.push(right);
        }
        return expr.length === 1 ? expr[0] : ContextKeyExpr.and(...expr);
    }
    _term() {
        if (this._matchOne(2 /* TokenType.Neg */)) {
            const peek = this._peek();
            switch (peek.type) {
                case 11 /* TokenType.True */:
                    this._advance();
                    return ContextKeyFalseExpr.INSTANCE;
                case 12 /* TokenType.False */:
                    this._advance();
                    return ContextKeyTrueExpr.INSTANCE;
                case 0 /* TokenType.LParen */: {
                    this._advance();
                    const expr = this._expr();
                    this._consume(1 /* TokenType.RParen */, errorClosingParenthesis);
                    return expr?.negate();
                }
                case 17 /* TokenType.Str */:
                    this._advance();
                    return ContextKeyNotExpr.create(peek.lexeme);
                default:
                    throw this._errExpectedButGot(`KEY | true | false | '(' expression ')'`, peek);
            }
        }
        return this._primary();
    }
    _primary() {
        const peek = this._peek();
        switch (peek.type) {
            case 11 /* TokenType.True */:
                this._advance();
                return ContextKeyExpr.true();
            case 12 /* TokenType.False */:
                this._advance();
                return ContextKeyExpr.false();
            case 0 /* TokenType.LParen */: {
                this._advance();
                const expr = this._expr();
                this._consume(1 /* TokenType.RParen */, errorClosingParenthesis);
                return expr;
            }
            case 17 /* TokenType.Str */: {
                // KEY
                const key = peek.lexeme;
                this._advance();
                // =~ regex
                if (this._matchOne(9 /* TokenType.RegexOp */)) {
                    // @ulugbekna: we need to reconstruct the regex from the tokens because some extensions use unescaped slashes in regexes
                    const expr = this._peek();
                    if (!this._config.regexParsingWithErrorRecovery) {
                        this._advance();
                        if (expr.type !== 10 /* TokenType.RegexStr */) {
                            throw this._errExpectedButGot(`REGEX`, expr);
                        }
                        const regexLexeme = expr.lexeme;
                        const closingSlashIndex = regexLexeme.lastIndexOf('/');
                        const flags = closingSlashIndex === regexLexeme.length - 1
                            ? undefined
                            : this._removeFlagsGY(regexLexeme.substring(closingSlashIndex + 1));
                        let regexp;
                        try {
                            regexp = new RegExp(regexLexeme.substring(1, closingSlashIndex), flags);
                        }
                        catch (e) {
                            throw this._errExpectedButGot(`REGEX`, expr);
                        }
                        return ContextKeyRegexExpr.create(key, regexp);
                    }
                    switch (expr.type) {
                        case 10 /* TokenType.RegexStr */:
                        case 19 /* TokenType.Error */: {
                            // also handle an ErrorToken in case of smth such as /(/file)/
                            const lexemeReconstruction = [expr.lexeme]; // /REGEX/ or /REGEX/FLAGS
                            this._advance();
                            let followingToken = this._peek();
                            let parenBalance = 0;
                            for (let i = 0; i < expr.lexeme.length; i++) {
                                if (expr.lexeme.charCodeAt(i) === 40 /* CharCode.OpenParen */) {
                                    parenBalance++;
                                }
                                else if (expr.lexeme.charCodeAt(i) === 41 /* CharCode.CloseParen */) {
                                    parenBalance--;
                                }
                            }
                            while (!this._isAtEnd() &&
                                followingToken.type !== 15 /* TokenType.And */ &&
                                followingToken.type !== 16 /* TokenType.Or */) {
                                switch (followingToken.type) {
                                    case 0 /* TokenType.LParen */:
                                        parenBalance++;
                                        break;
                                    case 1 /* TokenType.RParen */:
                                        parenBalance--;
                                        break;
                                    case 10 /* TokenType.RegexStr */:
                                    case 18 /* TokenType.QuotedStr */:
                                        for (let i = 0; i < followingToken.lexeme.length; i++) {
                                            if (followingToken.lexeme.charCodeAt(i) === 40 /* CharCode.OpenParen */) {
                                                parenBalance++;
                                            }
                                            else if (expr.lexeme.charCodeAt(i) === 41 /* CharCode.CloseParen */) {
                                                parenBalance--;
                                            }
                                        }
                                }
                                if (parenBalance < 0) {
                                    break;
                                }
                                lexemeReconstruction.push(Scanner.getLexeme(followingToken));
                                this._advance();
                                followingToken = this._peek();
                            }
                            const regexLexeme = lexemeReconstruction.join('');
                            const closingSlashIndex = regexLexeme.lastIndexOf('/');
                            const flags = closingSlashIndex === regexLexeme.length - 1
                                ? undefined
                                : this._removeFlagsGY(regexLexeme.substring(closingSlashIndex + 1));
                            let regexp;
                            try {
                                regexp = new RegExp(regexLexeme.substring(1, closingSlashIndex), flags);
                            }
                            catch (e) {
                                throw this._errExpectedButGot(`REGEX`, expr);
                            }
                            return ContextKeyExpr.regex(key, regexp);
                        }
                        case 18 /* TokenType.QuotedStr */: {
                            const serializedValue = expr.lexeme;
                            this._advance();
                            // replicate old regex parsing behavior
                            let regex = null;
                            if (!isFalsyOrWhitespace(serializedValue)) {
                                const start = serializedValue.indexOf('/');
                                const end = serializedValue.lastIndexOf('/');
                                if (start !== end && start >= 0) {
                                    const value = serializedValue.slice(start + 1, end);
                                    const caseIgnoreFlag = serializedValue[end + 1] === 'i' ? 'i' : '';
                                    try {
                                        regex = new RegExp(value, caseIgnoreFlag);
                                    }
                                    catch (_e) {
                                        throw this._errExpectedButGot(`REGEX`, expr);
                                    }
                                }
                            }
                            if (regex === null) {
                                throw this._errExpectedButGot('REGEX', expr);
                            }
                            return ContextKeyRegexExpr.create(key, regex);
                        }
                        default:
                            throw this._errExpectedButGot('REGEX', this._peek());
                    }
                }
                // [ 'not' 'in' value ]
                if (this._matchOne(14 /* TokenType.Not */)) {
                    this._consume(13 /* TokenType.In */, errorNoInAfterNot);
                    const right = this._value();
                    return ContextKeyExpr.notIn(key, right);
                }
                // [ ('==' | '!=' | '<' | '<=' | '>' | '>=' | 'in') value ]
                const maybeOp = this._peek().type;
                switch (maybeOp) {
                    case 3 /* TokenType.Eq */: {
                        this._advance();
                        const right = this._value();
                        if (this._previous().type === 18 /* TokenType.QuotedStr */) {
                            // to preserve old parser behavior: "foo == 'true'" is preserved as "foo == 'true'", but "foo == true" is optimized as "foo"
                            return ContextKeyExpr.equals(key, right);
                        }
                        switch (right) {
                            case 'true':
                                return ContextKeyExpr.has(key);
                            case 'false':
                                return ContextKeyExpr.not(key);
                            default:
                                return ContextKeyExpr.equals(key, right);
                        }
                    }
                    case 4 /* TokenType.NotEq */: {
                        this._advance();
                        const right = this._value();
                        if (this._previous().type === 18 /* TokenType.QuotedStr */) {
                            // same as above with "foo != 'true'"
                            return ContextKeyExpr.notEquals(key, right);
                        }
                        switch (right) {
                            case 'true':
                                return ContextKeyExpr.not(key);
                            case 'false':
                                return ContextKeyExpr.has(key);
                            default:
                                return ContextKeyExpr.notEquals(key, right);
                        }
                    }
                    // TODO: ContextKeyExpr.smaller(key, right) accepts only `number` as `right` AND during eval of this node, we just eval to `false` if `right` is not a number
                    // consequently, package.json linter should _warn_ the user if they're passing undesired things to ops
                    case 5 /* TokenType.Lt */:
                        this._advance();
                        return ContextKeySmallerExpr.create(key, this._value());
                    case 6 /* TokenType.LtEq */:
                        this._advance();
                        return ContextKeySmallerEqualsExpr.create(key, this._value());
                    case 7 /* TokenType.Gt */:
                        this._advance();
                        return ContextKeyGreaterExpr.create(key, this._value());
                    case 8 /* TokenType.GtEq */:
                        this._advance();
                        return ContextKeyGreaterEqualsExpr.create(key, this._value());
                    case 13 /* TokenType.In */:
                        this._advance();
                        return ContextKeyExpr.in(key, this._value());
                    default:
                        return ContextKeyExpr.has(key);
                }
            }
            case 20 /* TokenType.EOF */:
                this._parsingErrors.push({
                    message: errorUnexpectedEOF,
                    offset: peek.offset,
                    lexeme: '',
                    additionalInfo: hintUnexpectedEOF,
                });
                throw Parser._parseError;
            default:
                throw this._errExpectedButGot(`true | false | KEY \n\t| KEY '=~' REGEX \n\t| KEY ('==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not' 'in') value`, this._peek());
        }
    }
    _value() {
        const token = this._peek();
        switch (token.type) {
            case 17 /* TokenType.Str */:
            case 18 /* TokenType.QuotedStr */:
                this._advance();
                return token.lexeme;
            case 11 /* TokenType.True */:
                this._advance();
                return 'true';
            case 12 /* TokenType.False */:
                this._advance();
                return 'false';
            case 13 /* TokenType.In */: // we support `in` as a value, e.g., "when": "languageId == in" - exists in existing extensions
                this._advance();
                return 'in';
            default:
                // this allows "when": "foo == " which's used by existing extensions
                // we do not call `_advance` on purpose - we don't want to eat unintended tokens
                return '';
        }
    }
    _removeFlagsGY(flags) {
        return flags.replaceAll(this._flagsGYRe, '');
    }
    // careful: this can throw if current token is the initial one (ie index = 0)
    _previous() {
        return this._tokens[this._current - 1];
    }
    _matchOne(token) {
        if (this._check(token)) {
            this._advance();
            return true;
        }
        return false;
    }
    _advance() {
        if (!this._isAtEnd()) {
            this._current++;
        }
        return this._previous();
    }
    _consume(type, message) {
        if (this._check(type)) {
            return this._advance();
        }
        throw this._errExpectedButGot(message, this._peek());
    }
    _errExpectedButGot(expected, got, additionalInfo) {
        const message = localize('contextkey.parser.error.expectedButGot', "Expected: {0}\nReceived: '{1}'.", expected, Scanner.getLexeme(got));
        const offset = got.offset;
        const lexeme = Scanner.getLexeme(got);
        this._parsingErrors.push({ message, offset, lexeme, additionalInfo });
        return Parser._parseError;
    }
    _check(type) {
        return this._peek().type === type;
    }
    _peek() {
        return this._tokens[this._current];
    }
    _isAtEnd() {
        return this._peek().type === 20 /* TokenType.EOF */;
    }
}
export class ContextKeyExpr {
    static false() {
        return ContextKeyFalseExpr.INSTANCE;
    }
    static true() {
        return ContextKeyTrueExpr.INSTANCE;
    }
    static has(key) {
        return ContextKeyDefinedExpr.create(key);
    }
    static equals(key, value) {
        return ContextKeyEqualsExpr.create(key, value);
    }
    static notEquals(key, value) {
        return ContextKeyNotEqualsExpr.create(key, value);
    }
    static regex(key, value) {
        return ContextKeyRegexExpr.create(key, value);
    }
    static in(key, value) {
        return ContextKeyInExpr.create(key, value);
    }
    static notIn(key, value) {
        return ContextKeyNotInExpr.create(key, value);
    }
    static not(key) {
        return ContextKeyNotExpr.create(key);
    }
    static and(...expr) {
        return ContextKeyAndExpr.create(expr, null, true);
    }
    static or(...expr) {
        return ContextKeyOrExpr.create(expr, null, true);
    }
    static greater(key, value) {
        return ContextKeyGreaterExpr.create(key, value);
    }
    static greaterEquals(key, value) {
        return ContextKeyGreaterEqualsExpr.create(key, value);
    }
    static smaller(key, value) {
        return ContextKeySmallerExpr.create(key, value);
    }
    static smallerEquals(key, value) {
        return ContextKeySmallerEqualsExpr.create(key, value);
    }
    static { this._parser = new Parser({ regexParsingWithErrorRecovery: false }); }
    static deserialize(serialized) {
        if (serialized === undefined || serialized === null) {
            // an empty string needs to be handled by the parser to get a corresponding parsing error reported
            return undefined;
        }
        const expr = this._parser.parse(serialized);
        return expr;
    }
}
export function validateWhenClauses(whenClauses) {
    const parser = new Parser({ regexParsingWithErrorRecovery: false }); // we run with no recovery to guide users to use correct regexes
    return whenClauses.map((whenClause) => {
        parser.parse(whenClause);
        if (parser.lexingErrors.length > 0) {
            return parser.lexingErrors.map((se) => ({
                errorMessage: se.additionalInfo
                    ? localize('contextkey.scanner.errorForLinterWithHint', 'Unexpected token. Hint: {0}', se.additionalInfo)
                    : localize('contextkey.scanner.errorForLinter', 'Unexpected token.'),
                offset: se.offset,
                length: se.lexeme.length,
            }));
        }
        else if (parser.parsingErrors.length > 0) {
            return parser.parsingErrors.map((pe) => ({
                errorMessage: pe.additionalInfo ? `${pe.message}. ${pe.additionalInfo}` : pe.message,
                offset: pe.offset,
                length: pe.lexeme.length,
            }));
        }
        else {
            return [];
        }
    });
}
export function expressionsAreEqualWithConstantSubstitution(a, b) {
    const aExpr = a ? a.substituteConstants() : undefined;
    const bExpr = b ? b.substituteConstants() : undefined;
    if (!aExpr && !bExpr) {
        return true;
    }
    if (!aExpr || !bExpr) {
        return false;
    }
    return aExpr.equals(bExpr);
}
function cmp(a, b) {
    return a.cmp(b);
}
export class ContextKeyFalseExpr {
    static { this.INSTANCE = new ContextKeyFalseExpr(); }
    constructor() {
        this.type = 0 /* ContextKeyExprType.False */;
    }
    cmp(other) {
        return this.type - other.type;
    }
    equals(other) {
        return other.type === this.type;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return false;
    }
    serialize() {
        return 'false';
    }
    keys() {
        return [];
    }
    map(mapFnc) {
        return this;
    }
    negate() {
        return ContextKeyTrueExpr.INSTANCE;
    }
}
export class ContextKeyTrueExpr {
    static { this.INSTANCE = new ContextKeyTrueExpr(); }
    constructor() {
        this.type = 1 /* ContextKeyExprType.True */;
    }
    cmp(other) {
        return this.type - other.type;
    }
    equals(other) {
        return other.type === this.type;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return true;
    }
    serialize() {
        return 'true';
    }
    keys() {
        return [];
    }
    map(mapFnc) {
        return this;
    }
    negate() {
        return ContextKeyFalseExpr.INSTANCE;
    }
}
export class ContextKeyDefinedExpr {
    static create(key, negated = null) {
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return new ContextKeyDefinedExpr(key, negated);
    }
    constructor(key, negated) {
        this.key = key;
        this.negated = negated;
        this.type = 2 /* ContextKeyExprType.Defined */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp1(this.key, other.key);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key;
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return this;
    }
    evaluate(context) {
        return !!context.getValue(this.key);
    }
    serialize() {
        return this.key;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapDefined(this.key);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotExpr.create(this.key, this);
        }
        return this.negated;
    }
}
export class ContextKeyEqualsExpr {
    static create(key, value, negated = null) {
        if (typeof value === 'boolean') {
            return value
                ? ContextKeyDefinedExpr.create(key, negated)
                : ContextKeyNotExpr.create(key, negated);
        }
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            const trueValue = constantValue ? 'true' : 'false';
            return value === trueValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return new ContextKeyEqualsExpr(key, value, negated);
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 4 /* ContextKeyExprType.Equals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            const trueValue = constantValue ? 'true' : 'false';
            return this.value === trueValue ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE;
        }
        return this;
    }
    evaluate(context) {
        // Intentional ==
        // eslint-disable-next-line eqeqeq
        return context.getValue(this.key) == this.value;
    }
    serialize() {
        return `${this.key} == '${this.value}'`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyInExpr {
    static create(key, valueKey) {
        return new ContextKeyInExpr(key, valueKey);
    }
    constructor(key, valueKey) {
        this.key = key;
        this.valueKey = valueKey;
        this.type = 10 /* ContextKeyExprType.In */;
        this.negated = null;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.valueKey, other.key, other.valueKey);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.valueKey === other.valueKey;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        const source = context.getValue(this.valueKey);
        const item = context.getValue(this.key);
        if (Array.isArray(source)) {
            return source.includes(item);
        }
        if (typeof item === 'string' && typeof source === 'object' && source !== null) {
            return hasOwnProperty.call(source, item);
        }
        return false;
    }
    serialize() {
        return `${this.key} in '${this.valueKey}'`;
    }
    keys() {
        return [this.key, this.valueKey];
    }
    map(mapFnc) {
        return mapFnc.mapIn(this.key, this.valueKey);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotInExpr.create(this.key, this.valueKey);
        }
        return this.negated;
    }
}
export class ContextKeyNotInExpr {
    static create(key, valueKey) {
        return new ContextKeyNotInExpr(key, valueKey);
    }
    constructor(key, valueKey) {
        this.key = key;
        this.valueKey = valueKey;
        this.type = 11 /* ContextKeyExprType.NotIn */;
        this._negated = ContextKeyInExpr.create(key, valueKey);
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return this._negated.cmp(other._negated);
    }
    equals(other) {
        if (other.type === this.type) {
            return this._negated.equals(other._negated);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return !this._negated.evaluate(context);
    }
    serialize() {
        return `${this.key} not in '${this.valueKey}'`;
    }
    keys() {
        return this._negated.keys();
    }
    map(mapFnc) {
        return mapFnc.mapNotIn(this.key, this.valueKey);
    }
    negate() {
        return this._negated;
    }
}
export class ContextKeyNotEqualsExpr {
    static create(key, value, negated = null) {
        if (typeof value === 'boolean') {
            if (value) {
                return ContextKeyNotExpr.create(key, negated);
            }
            return ContextKeyDefinedExpr.create(key, negated);
        }
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            const falseValue = constantValue ? 'true' : 'false';
            return value === falseValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE;
        }
        return new ContextKeyNotEqualsExpr(key, value, negated);
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 5 /* ContextKeyExprType.NotEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            const falseValue = constantValue ? 'true' : 'false';
            return this.value === falseValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE;
        }
        return this;
    }
    evaluate(context) {
        // Intentional !=
        // eslint-disable-next-line eqeqeq
        return context.getValue(this.key) != this.value;
    }
    serialize() {
        return `${this.key} != '${this.value}'`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapNotEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyNotExpr {
    static create(key, negated = null) {
        const constantValue = CONSTANT_VALUES.get(key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE;
        }
        return new ContextKeyNotExpr(key, negated);
    }
    constructor(key, negated) {
        this.key = key;
        this.negated = negated;
        this.type = 3 /* ContextKeyExprType.Not */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp1(this.key, other.key);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key;
        }
        return false;
    }
    substituteConstants() {
        const constantValue = CONSTANT_VALUES.get(this.key);
        if (typeof constantValue === 'boolean') {
            return constantValue ? ContextKeyFalseExpr.INSTANCE : ContextKeyTrueExpr.INSTANCE;
        }
        return this;
    }
    evaluate(context) {
        return !context.getValue(this.key);
    }
    serialize() {
        return `!${this.key}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapNot(this.key);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyDefinedExpr.create(this.key, this);
        }
        return this.negated;
    }
}
function withFloatOrStr(value, callback) {
    if (typeof value === 'string') {
        const n = parseFloat(value);
        if (!isNaN(n)) {
            value = n;
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return callback(value);
    }
    return ContextKeyFalseExpr.INSTANCE;
}
export class ContextKeyGreaterExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeyGreaterExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 12 /* ContextKeyExprType.Greater */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return parseFloat(context.getValue(this.key)) > this.value;
    }
    serialize() {
        return `${this.key} > ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapGreater(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeySmallerEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyGreaterEqualsExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeyGreaterEqualsExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 13 /* ContextKeyExprType.GreaterEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return parseFloat(context.getValue(this.key)) >= this.value;
    }
    serialize() {
        return `${this.key} >= ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapGreaterEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeySmallerExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeySmallerExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeySmallerExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 14 /* ContextKeyExprType.Smaller */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return parseFloat(context.getValue(this.key)) < this.value;
    }
    serialize() {
        return `${this.key} < ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapSmaller(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyGreaterEqualsExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeySmallerEqualsExpr {
    static create(key, _value, negated = null) {
        return withFloatOrStr(_value, (value) => new ContextKeySmallerEqualsExpr(key, value, negated));
    }
    constructor(key, value, negated) {
        this.key = key;
        this.value = value;
        this.negated = negated;
        this.type = 15 /* ContextKeyExprType.SmallerEquals */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return cmp2(this.key, this.value, other.key, other.value);
    }
    equals(other) {
        if (other.type === this.type) {
            return this.key === other.key && this.value === other.value;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        if (typeof this.value === 'string') {
            return false;
        }
        return parseFloat(context.getValue(this.key)) <= this.value;
    }
    serialize() {
        return `${this.key} <= ${this.value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapSmallerEquals(this.key, this.value);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyGreaterExpr.create(this.key, this.value, this);
        }
        return this.negated;
    }
}
export class ContextKeyRegexExpr {
    static create(key, regexp) {
        return new ContextKeyRegexExpr(key, regexp);
    }
    constructor(key, regexp) {
        this.key = key;
        this.regexp = regexp;
        this.type = 7 /* ContextKeyExprType.Regex */;
        this.negated = null;
        //
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.key < other.key) {
            return -1;
        }
        if (this.key > other.key) {
            return 1;
        }
        const thisSource = this.regexp ? this.regexp.source : '';
        const otherSource = other.regexp ? other.regexp.source : '';
        if (thisSource < otherSource) {
            return -1;
        }
        if (thisSource > otherSource) {
            return 1;
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            const thisSource = this.regexp ? this.regexp.source : '';
            const otherSource = other.regexp ? other.regexp.source : '';
            return this.key === other.key && thisSource === otherSource;
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        const value = context.getValue(this.key);
        return this.regexp ? this.regexp.test(value) : false;
    }
    serialize() {
        const value = this.regexp ? `/${this.regexp.source}/${this.regexp.flags}` : '/invalid/';
        return `${this.key} =~ ${value}`;
    }
    keys() {
        return [this.key];
    }
    map(mapFnc) {
        return mapFnc.mapRegex(this.key, this.regexp);
    }
    negate() {
        if (!this.negated) {
            this.negated = ContextKeyNotRegexExpr.create(this);
        }
        return this.negated;
    }
}
export class ContextKeyNotRegexExpr {
    static create(actual) {
        return new ContextKeyNotRegexExpr(actual);
    }
    constructor(_actual) {
        this._actual = _actual;
        this.type = 8 /* ContextKeyExprType.NotRegex */;
        //
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        return this._actual.cmp(other._actual);
    }
    equals(other) {
        if (other.type === this.type) {
            return this._actual.equals(other._actual);
        }
        return false;
    }
    substituteConstants() {
        return this;
    }
    evaluate(context) {
        return !this._actual.evaluate(context);
    }
    serialize() {
        return `!(${this._actual.serialize()})`;
    }
    keys() {
        return this._actual.keys();
    }
    map(mapFnc) {
        return new ContextKeyNotRegexExpr(this._actual.map(mapFnc));
    }
    negate() {
        return this._actual;
    }
}
/**
 * @returns the same instance if nothing changed.
 */
function eliminateConstantsInArray(arr) {
    // Allocate array only if there is a difference
    let newArr = null;
    for (let i = 0, len = arr.length; i < len; i++) {
        const newExpr = arr[i].substituteConstants();
        if (arr[i] !== newExpr) {
            // something has changed!
            // allocate array on first difference
            if (newArr === null) {
                newArr = [];
                for (let j = 0; j < i; j++) {
                    newArr[j] = arr[j];
                }
            }
        }
        if (newArr !== null) {
            newArr[i] = newExpr;
        }
    }
    if (newArr === null) {
        return arr;
    }
    return newArr;
}
export class ContextKeyAndExpr {
    static create(_expr, negated, extraRedundantCheck) {
        return ContextKeyAndExpr._normalizeArr(_expr, negated, extraRedundantCheck);
    }
    constructor(expr, negated) {
        this.expr = expr;
        this.negated = negated;
        this.type = 6 /* ContextKeyExprType.And */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.expr.length < other.expr.length) {
            return -1;
        }
        if (this.expr.length > other.expr.length) {
            return 1;
        }
        for (let i = 0, len = this.expr.length; i < len; i++) {
            const r = cmp(this.expr[i], other.expr[i]);
            if (r !== 0) {
                return r;
            }
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            if (this.expr.length !== other.expr.length) {
                return false;
            }
            for (let i = 0, len = this.expr.length; i < len; i++) {
                if (!this.expr[i].equals(other.expr[i])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    substituteConstants() {
        const exprArr = eliminateConstantsInArray(this.expr);
        if (exprArr === this.expr) {
            // no change
            return this;
        }
        return ContextKeyAndExpr.create(exprArr, this.negated, false);
    }
    evaluate(context) {
        for (let i = 0, len = this.expr.length; i < len; i++) {
            if (!this.expr[i].evaluate(context)) {
                return false;
            }
        }
        return true;
    }
    static _normalizeArr(arr, negated, extraRedundantCheck) {
        const expr = [];
        let hasTrue = false;
        for (const e of arr) {
            if (!e) {
                continue;
            }
            if (e.type === 1 /* ContextKeyExprType.True */) {
                // anything && true ==> anything
                hasTrue = true;
                continue;
            }
            if (e.type === 0 /* ContextKeyExprType.False */) {
                // anything && false ==> false
                return ContextKeyFalseExpr.INSTANCE;
            }
            if (e.type === 6 /* ContextKeyExprType.And */) {
                expr.push(...e.expr);
                continue;
            }
            expr.push(e);
        }
        if (expr.length === 0 && hasTrue) {
            return ContextKeyTrueExpr.INSTANCE;
        }
        if (expr.length === 0) {
            return undefined;
        }
        if (expr.length === 1) {
            return expr[0];
        }
        expr.sort(cmp);
        // eliminate duplicate terms
        for (let i = 1; i < expr.length; i++) {
            if (expr[i - 1].equals(expr[i])) {
                expr.splice(i, 1);
                i--;
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // We must distribute any OR expression because we don't support parens
        // OR extensions will be at the end (due to sorting rules)
        while (expr.length > 1) {
            const lastElement = expr[expr.length - 1];
            if (lastElement.type !== 9 /* ContextKeyExprType.Or */) {
                break;
            }
            // pop the last element
            expr.pop();
            // pop the second to last element
            const secondToLastElement = expr.pop();
            const isFinished = expr.length === 0;
            // distribute `lastElement` over `secondToLastElement`
            const resultElement = ContextKeyOrExpr.create(lastElement.expr.map((el) => ContextKeyAndExpr.create([el, secondToLastElement], null, extraRedundantCheck)), null, isFinished);
            if (resultElement) {
                expr.push(resultElement);
                expr.sort(cmp);
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // resolve false AND expressions
        if (extraRedundantCheck) {
            for (let i = 0; i < expr.length; i++) {
                for (let j = i + 1; j < expr.length; j++) {
                    if (expr[i].negate().equals(expr[j])) {
                        // A && !A case
                        return ContextKeyFalseExpr.INSTANCE;
                    }
                }
            }
            if (expr.length === 1) {
                return expr[0];
            }
        }
        return new ContextKeyAndExpr(expr, negated);
    }
    serialize() {
        return this.expr.map((e) => e.serialize()).join(' && ');
    }
    keys() {
        const result = [];
        for (const expr of this.expr) {
            result.push(...expr.keys());
        }
        return result;
    }
    map(mapFnc) {
        return new ContextKeyAndExpr(this.expr.map((expr) => expr.map(mapFnc)), null);
    }
    negate() {
        if (!this.negated) {
            const result = [];
            for (const expr of this.expr) {
                result.push(expr.negate());
            }
            this.negated = ContextKeyOrExpr.create(result, this, true);
        }
        return this.negated;
    }
}
export class ContextKeyOrExpr {
    static create(_expr, negated, extraRedundantCheck) {
        return ContextKeyOrExpr._normalizeArr(_expr, negated, extraRedundantCheck);
    }
    constructor(expr, negated) {
        this.expr = expr;
        this.negated = negated;
        this.type = 9 /* ContextKeyExprType.Or */;
    }
    cmp(other) {
        if (other.type !== this.type) {
            return this.type - other.type;
        }
        if (this.expr.length < other.expr.length) {
            return -1;
        }
        if (this.expr.length > other.expr.length) {
            return 1;
        }
        for (let i = 0, len = this.expr.length; i < len; i++) {
            const r = cmp(this.expr[i], other.expr[i]);
            if (r !== 0) {
                return r;
            }
        }
        return 0;
    }
    equals(other) {
        if (other.type === this.type) {
            if (this.expr.length !== other.expr.length) {
                return false;
            }
            for (let i = 0, len = this.expr.length; i < len; i++) {
                if (!this.expr[i].equals(other.expr[i])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    substituteConstants() {
        const exprArr = eliminateConstantsInArray(this.expr);
        if (exprArr === this.expr) {
            // no change
            return this;
        }
        return ContextKeyOrExpr.create(exprArr, this.negated, false);
    }
    evaluate(context) {
        for (let i = 0, len = this.expr.length; i < len; i++) {
            if (this.expr[i].evaluate(context)) {
                return true;
            }
        }
        return false;
    }
    static _normalizeArr(arr, negated, extraRedundantCheck) {
        let expr = [];
        let hasFalse = false;
        if (arr) {
            for (let i = 0, len = arr.length; i < len; i++) {
                const e = arr[i];
                if (!e) {
                    continue;
                }
                if (e.type === 0 /* ContextKeyExprType.False */) {
                    // anything || false ==> anything
                    hasFalse = true;
                    continue;
                }
                if (e.type === 1 /* ContextKeyExprType.True */) {
                    // anything || true ==> true
                    return ContextKeyTrueExpr.INSTANCE;
                }
                if (e.type === 9 /* ContextKeyExprType.Or */) {
                    expr = expr.concat(e.expr);
                    continue;
                }
                expr.push(e);
            }
            if (expr.length === 0 && hasFalse) {
                return ContextKeyFalseExpr.INSTANCE;
            }
            expr.sort(cmp);
        }
        if (expr.length === 0) {
            return undefined;
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // eliminate duplicate terms
        for (let i = 1; i < expr.length; i++) {
            if (expr[i - 1].equals(expr[i])) {
                expr.splice(i, 1);
                i--;
            }
        }
        if (expr.length === 1) {
            return expr[0];
        }
        // resolve true OR expressions
        if (extraRedundantCheck) {
            for (let i = 0; i < expr.length; i++) {
                for (let j = i + 1; j < expr.length; j++) {
                    if (expr[i].negate().equals(expr[j])) {
                        // A || !A case
                        return ContextKeyTrueExpr.INSTANCE;
                    }
                }
            }
            if (expr.length === 1) {
                return expr[0];
            }
        }
        return new ContextKeyOrExpr(expr, negated);
    }
    serialize() {
        return this.expr.map((e) => e.serialize()).join(' || ');
    }
    keys() {
        const result = [];
        for (const expr of this.expr) {
            result.push(...expr.keys());
        }
        return result;
    }
    map(mapFnc) {
        return new ContextKeyOrExpr(this.expr.map((expr) => expr.map(mapFnc)), null);
    }
    negate() {
        if (!this.negated) {
            const result = [];
            for (const expr of this.expr) {
                result.push(expr.negate());
            }
            // We don't support parens, so here we distribute the AND over the OR terminals
            // We always take the first 2 AND pairs and distribute them
            while (result.length > 1) {
                const LEFT = result.shift();
                const RIGHT = result.shift();
                const all = [];
                for (const left of getTerminals(LEFT)) {
                    for (const right of getTerminals(RIGHT)) {
                        all.push(ContextKeyAndExpr.create([left, right], null, false));
                    }
                }
                result.unshift(ContextKeyOrExpr.create(all, null, false));
            }
            this.negated = ContextKeyOrExpr.create(result, this, true);
        }
        return this.negated;
    }
}
export class RawContextKey extends ContextKeyDefinedExpr {
    static { this._info = []; }
    static all() {
        return RawContextKey._info.values();
    }
    constructor(key, defaultValue, metaOrHide) {
        super(key, null);
        this._defaultValue = defaultValue;
        // collect all context keys into a central place
        if (typeof metaOrHide === 'object') {
            RawContextKey._info.push({ ...metaOrHide, key });
        }
        else if (metaOrHide !== true) {
            RawContextKey._info.push({
                key,
                description: metaOrHide,
                type: defaultValue !== null && defaultValue !== undefined ? typeof defaultValue : undefined,
            });
        }
    }
    bindTo(target) {
        return target.createKey(this.key, this._defaultValue);
    }
    getValue(target) {
        return target.getContextKeyValue(this.key);
    }
    toNegated() {
        return this.negate();
    }
    isEqualTo(value) {
        return ContextKeyEqualsExpr.create(this.key, value);
    }
    notEqualsTo(value) {
        return ContextKeyNotEqualsExpr.create(this.key, value);
    }
    greater(value) {
        return ContextKeyGreaterExpr.create(this.key, value);
    }
}
export const IContextKeyService = createDecorator('contextKeyService');
function cmp1(key1, key2) {
    if (key1 < key2) {
        return -1;
    }
    if (key1 > key2) {
        return 1;
    }
    return 0;
}
function cmp2(key1, value1, key2, value2) {
    if (key1 < key2) {
        return -1;
    }
    if (key1 > key2) {
        return 1;
    }
    if (value1 < value2) {
        return -1;
    }
    if (value1 > value2) {
        return 1;
    }
    return 0;
}
/**
 * Returns true if it is provable `p` implies `q`.
 */
export function implies(p, q) {
    if (p.type === 0 /* ContextKeyExprType.False */ || q.type === 1 /* ContextKeyExprType.True */) {
        // false implies anything
        // anything implies true
        return true;
    }
    if (p.type === 9 /* ContextKeyExprType.Or */) {
        if (q.type === 9 /* ContextKeyExprType.Or */) {
            // `a || b || c` can only imply something like `a || b || c || d`
            return allElementsIncluded(p.expr, q.expr);
        }
        return false;
    }
    if (q.type === 9 /* ContextKeyExprType.Or */) {
        for (const element of q.expr) {
            if (implies(p, element)) {
                return true;
            }
        }
        return false;
    }
    if (p.type === 6 /* ContextKeyExprType.And */) {
        if (q.type === 6 /* ContextKeyExprType.And */) {
            // `a && b && c` implies `a && c`
            return allElementsIncluded(q.expr, p.expr);
        }
        for (const element of p.expr) {
            if (implies(element, q)) {
                return true;
            }
        }
        return false;
    }
    return p.equals(q);
}
/**
 * Returns true if all elements in `p` are also present in `q`.
 * The two arrays are assumed to be sorted
 */
function allElementsIncluded(p, q) {
    let pIndex = 0;
    let qIndex = 0;
    while (pIndex < p.length && qIndex < q.length) {
        const cmp = p[pIndex].cmp(q[qIndex]);
        if (cmp < 0) {
            // an element from `p` is missing from `q`
            return false;
        }
        else if (cmp === 0) {
            pIndex++;
            qIndex++;
        }
        else {
            qIndex++;
        }
    }
    return pIndex === p.length;
}
function getTerminals(node) {
    if (node.type === 9 /* ContextKeyExprType.Or */) {
        return node.expr;
    }
    return [node];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHRrZXkvY29tbW9uL2NvbnRleHRrZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUNOLFFBQVEsRUFDUixNQUFNLEVBQ04sU0FBUyxFQUNULE9BQU8sRUFDUCxXQUFXLEVBQ1gsUUFBUSxFQUNSLEtBQUssRUFDTCxTQUFTLEdBQ1QsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFpQyxNQUFNLGNBQWMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVoRSxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtBQUNsRCxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNuQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUNqQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtBQUN6QyxlQUFlLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUN2QyxlQUFlLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUMzQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNuQyxlQUFlLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN6RCxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUNyQyxlQUFlLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUMzQyxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUN6QyxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUV6QyxvTkFBb047QUFDcE4sTUFBTSxVQUFVLFdBQVcsQ0FBQyxHQUFXLEVBQUUsS0FBYztJQUN0RCxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDNUMsTUFBTSxlQUFlLENBQUMsb0VBQW9FLENBQUMsQ0FBQTtJQUM1RixDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDaEMsQ0FBQztBQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFBO0FBRXRELE1BQU0sQ0FBTixJQUFrQixrQkFpQmpCO0FBakJELFdBQWtCLGtCQUFrQjtJQUNuQyw2REFBUyxDQUFBO0lBQ1QsMkRBQVEsQ0FBQTtJQUNSLGlFQUFXLENBQUE7SUFDWCx5REFBTyxDQUFBO0lBQ1AsK0RBQVUsQ0FBQTtJQUNWLHFFQUFhLENBQUE7SUFDYix5REFBTyxDQUFBO0lBQ1AsNkRBQVMsQ0FBQTtJQUNULG1FQUFZLENBQUE7SUFDWix1REFBTSxDQUFBO0lBQ04sd0RBQU8sQ0FBQTtJQUNQLDhEQUFVLENBQUE7SUFDVixrRUFBWSxDQUFBO0lBQ1osOEVBQWtCLENBQUE7SUFDbEIsa0VBQVksQ0FBQTtJQUNaLDhFQUFrQixDQUFBO0FBQ25CLENBQUMsRUFqQmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFpQm5DO0FBeUZELE1BQU0sYUFBYSxHQUFpQjtJQUNuQyw2QkFBNkIsRUFBRSxJQUFJO0NBQ25DLENBQUE7QUFTRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FDaEMscUNBQXFDLEVBQ3JDLDhCQUE4QixDQUM5QixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUMvQiwwQ0FBMEMsRUFDMUMsOEhBQThILENBQzlILENBQUE7QUFDRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0FBQy9GLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUN2Qyw0Q0FBNEMsRUFDNUMseUJBQXlCLENBQ3pCLENBQUE7QUFDRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO0FBQ3BHLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUNuQyw4Q0FBOEMsRUFDOUMsa0RBQWtELENBQ2xELENBQUE7QUFDRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FDbEMsdUNBQXVDLEVBQ3ZDLDhCQUE4QixDQUM5QixDQUFBO0FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQ2pDLDRDQUE0QyxFQUM1QyxzQ0FBc0MsQ0FDdEMsQ0FBQTtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxPQUFPLE1BQU07SUFDbEIsdUVBQXVFO0lBQ3ZFLG1HQUFtRzthQUVwRixnQkFBVyxHQUFHLElBQUksS0FBSyxFQUFFLEFBQWQsQ0FBYztJQVV4QyxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFFRCxZQUE2QixVQUF3QixhQUFhO1FBQXJDLFlBQU8sR0FBUCxPQUFPLENBQThCO1FBaEJsRSwwR0FBMEc7UUFDekYsYUFBUSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFFekMsb0dBQW9HO1FBQzVGLFlBQU8sR0FBWSxFQUFFLENBQUE7UUFDckIsYUFBUSxHQUFHLENBQUMsQ0FBQSxDQUFDLG9IQUFvSDtRQUNqSSxtQkFBYyxHQUFtQixFQUFFLENBQUE7UUE0V25DLGVBQVUsR0FBRyxNQUFNLENBQUE7SUFsVzBDLENBQUM7SUFFdEU7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsS0FBYTtRQUNsQixJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztnQkFDeEIsT0FBTyxFQUFFLGdCQUFnQjtnQkFDekIsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsY0FBYyxFQUFFLGVBQWU7YUFDL0IsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDaEQsdUxBQXVMO1FBRXZMLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1FBRXhCLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDekIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksMkJBQWtCLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ3BGLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO29CQUN4QixPQUFPLEVBQUUsb0JBQW9CO29CQUM3QixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07b0JBQ25CLE1BQU0sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztvQkFDL0IsY0FBYztpQkFDZCxDQUFDLENBQUE7Z0JBQ0YsTUFBTSxNQUFNLENBQUMsV0FBVyxDQUFBO1lBQ3pCLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsQ0FBQTtZQUNSLENBQUM7WUFDRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUs7UUFDWixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sR0FBRztRQUNWLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFFMUIsT0FBTyxJQUFJLENBQUMsU0FBUyx1QkFBYyxFQUFFLENBQUM7WUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFTyxJQUFJO1FBQ1gsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUUzQixPQUFPLElBQUksQ0FBQyxTQUFTLHdCQUFlLEVBQUUsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLEtBQUs7UUFDWixJQUFJLElBQUksQ0FBQyxTQUFTLHVCQUFlLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDekIsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CO29CQUNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtvQkFDZixPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtnQkFDcEM7b0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO29CQUNmLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxDQUFBO2dCQUNuQyw2QkFBcUIsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtvQkFDZixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3pCLElBQUksQ0FBQyxRQUFRLDJCQUFtQix1QkFBdUIsQ0FBQyxDQUFBO29CQUN4RCxPQUFPLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQTtnQkFDdEIsQ0FBQztnQkFDRDtvQkFDQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7b0JBQ2YsT0FBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QztvQkFDQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx5Q0FBeUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxRQUFRO1FBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3pCLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25CO2dCQUNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDZixPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUU3QjtnQkFDQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ2YsT0FBTyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUE7WUFFOUIsNkJBQXFCLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUN6QixJQUFJLENBQUMsUUFBUSwyQkFBbUIsdUJBQXVCLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsMkJBQWtCLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixNQUFNO2dCQUNOLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7Z0JBQ3ZCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFFZixXQUFXO2dCQUNYLElBQUksSUFBSSxDQUFDLFNBQVMsMkJBQW1CLEVBQUUsQ0FBQztvQkFDdkMsd0hBQXdIO29CQUN4SCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBRXpCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFLENBQUM7d0JBQ2pELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTt3QkFDZixJQUFJLElBQUksQ0FBQyxJQUFJLGdDQUF1QixFQUFFLENBQUM7NEJBQ3RDLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDN0MsQ0FBQzt3QkFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO3dCQUMvQixNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ3RELE1BQU0sS0FBSyxHQUNWLGlCQUFpQixLQUFLLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQzs0QkFDM0MsQ0FBQyxDQUFDLFNBQVM7NEJBQ1gsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNyRSxJQUFJLE1BQXFCLENBQUE7d0JBQ3pCLElBQUksQ0FBQzs0QkFDSixNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTt3QkFDeEUsQ0FBQzt3QkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDOzRCQUNaLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDN0MsQ0FBQzt3QkFDRCxPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQy9DLENBQUM7b0JBRUQsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ25CLGlDQUF3Qjt3QkFDeEIsNkJBQW9CLENBQUMsQ0FBQyxDQUFDOzRCQUN0Qiw4REFBOEQ7NEJBQzlELE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQywwQkFBMEI7NEJBQ3JFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTs0QkFFZixJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7NEJBQ2pDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTs0QkFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0NBQzdDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGdDQUF1QixFQUFFLENBQUM7b0NBQ3RELFlBQVksRUFBRSxDQUFBO2dDQUNmLENBQUM7cUNBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUNBQXdCLEVBQUUsQ0FBQztvQ0FDOUQsWUFBWSxFQUFFLENBQUE7Z0NBQ2YsQ0FBQzs0QkFDRixDQUFDOzRCQUVELE9BQ0MsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO2dDQUNoQixjQUFjLENBQUMsSUFBSSwyQkFBa0I7Z0NBQ3JDLGNBQWMsQ0FBQyxJQUFJLDBCQUFpQixFQUNuQyxDQUFDO2dDQUNGLFFBQVEsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO29DQUM3Qjt3Q0FDQyxZQUFZLEVBQUUsQ0FBQTt3Q0FDZCxNQUFLO29DQUNOO3dDQUNDLFlBQVksRUFBRSxDQUFBO3dDQUNkLE1BQUs7b0NBQ04saUNBQXdCO29DQUN4Qjt3Q0FDQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0Q0FDdkQsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsZ0NBQXVCLEVBQUUsQ0FBQztnREFDaEUsWUFBWSxFQUFFLENBQUE7NENBQ2YsQ0FBQztpREFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxpQ0FBd0IsRUFBRSxDQUFDO2dEQUM5RCxZQUFZLEVBQUUsQ0FBQTs0Q0FDZixDQUFDO3dDQUNGLENBQUM7Z0NBQ0gsQ0FBQztnQ0FDRCxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztvQ0FDdEIsTUFBSztnQ0FDTixDQUFDO2dDQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7Z0NBQzVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQ0FDZixjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBOzRCQUM5QixDQUFDOzRCQUVELE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTs0QkFDakQsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBOzRCQUN0RCxNQUFNLEtBQUssR0FDVixpQkFBaUIsS0FBSyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUM7Z0NBQzNDLENBQUMsQ0FBQyxTQUFTO2dDQUNYLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTs0QkFDckUsSUFBSSxNQUFxQixDQUFBOzRCQUN6QixJQUFJLENBQUM7Z0NBQ0osTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7NEJBQ3hFLENBQUM7NEJBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQ0FDWixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7NEJBQzdDLENBQUM7NEJBQ0QsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTt3QkFDekMsQ0FBQzt3QkFFRCxpQ0FBd0IsQ0FBQyxDQUFDLENBQUM7NEJBQzFCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7NEJBQ25DLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTs0QkFDZix1Q0FBdUM7NEJBRXZDLElBQUksS0FBSyxHQUFrQixJQUFJLENBQUE7NEJBRS9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2dDQUMzQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dDQUMxQyxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dDQUM1QyxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO29DQUNqQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7b0NBQ25ELE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtvQ0FDbEUsSUFBSSxDQUFDO3dDQUNKLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7b0NBQzFDLENBQUM7b0NBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzt3Q0FDYixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7b0NBQzdDLENBQUM7Z0NBQ0YsQ0FBQzs0QkFDRixDQUFDOzRCQUVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO2dDQUNwQixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7NEJBQzdDLENBQUM7NEJBRUQsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUM5QyxDQUFDO3dCQUVEOzRCQUNDLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtvQkFDdEQsQ0FBQztnQkFDRixDQUFDO2dCQUVELHVCQUF1QjtnQkFDdkIsSUFBSSxJQUFJLENBQUMsU0FBUyx3QkFBZSxFQUFFLENBQUM7b0JBQ25DLElBQUksQ0FBQyxRQUFRLHdCQUFlLGlCQUFpQixDQUFDLENBQUE7b0JBQzlDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtvQkFDM0IsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztnQkFFRCwyREFBMkQ7Z0JBQzNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUE7Z0JBQ2pDLFFBQVEsT0FBTyxFQUFFLENBQUM7b0JBQ2pCLHlCQUFpQixDQUFDLENBQUMsQ0FBQzt3QkFDbkIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUVmLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTt3QkFDM0IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxpQ0FBd0IsRUFBRSxDQUFDOzRCQUNuRCw0SEFBNEg7NEJBQzVILE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7d0JBQ3pDLENBQUM7d0JBQ0QsUUFBUSxLQUFLLEVBQUUsQ0FBQzs0QkFDZixLQUFLLE1BQU07Z0NBQ1YsT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOzRCQUMvQixLQUFLLE9BQU87Z0NBQ1gsT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOzRCQUMvQjtnQ0FDQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUMxQyxDQUFDO29CQUNGLENBQUM7b0JBRUQsNEJBQW9CLENBQUMsQ0FBQyxDQUFDO3dCQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7d0JBRWYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO3dCQUMzQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLGlDQUF3QixFQUFFLENBQUM7NEJBQ25ELHFDQUFxQzs0QkFDckMsT0FBTyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTt3QkFDNUMsQ0FBQzt3QkFDRCxRQUFRLEtBQUssRUFBRSxDQUFDOzRCQUNmLEtBQUssTUFBTTtnQ0FDVixPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQy9CLEtBQUssT0FBTztnQ0FDWCxPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7NEJBQy9CO2dDQUNDLE9BQU8sY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7d0JBQzdDLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCw2SkFBNko7b0JBQzdKLHNHQUFzRztvQkFDdEc7d0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNmLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtvQkFFeEQ7d0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNmLE9BQU8sMkJBQTJCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtvQkFFOUQ7d0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNmLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtvQkFFeEQ7d0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNmLE9BQU8sMkJBQTJCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtvQkFFOUQ7d0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUNmLE9BQU8sY0FBYyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7b0JBRTdDO3dCQUNDLE9BQU8sY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUM7WUFFRDtnQkFDQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztvQkFDeEIsT0FBTyxFQUFFLGtCQUFrQjtvQkFDM0IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO29CQUNuQixNQUFNLEVBQUUsRUFBRTtvQkFDVixjQUFjLEVBQUUsaUJBQWlCO2lCQUNqQyxDQUFDLENBQUE7Z0JBQ0YsTUFBTSxNQUFNLENBQUMsV0FBVyxDQUFBO1lBRXpCO2dCQUNDLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUM1QixxSEFBcUgsRUFDckgsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUNaLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU07UUFDYixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDMUIsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEIsNEJBQW1CO1lBQ25CO2dCQUNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDZixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUE7WUFDcEI7Z0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNmLE9BQU8sTUFBTSxDQUFBO1lBQ2Q7Z0JBQ0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNmLE9BQU8sT0FBTyxDQUFBO1lBQ2YsNEJBQW1CLCtGQUErRjtnQkFDakgsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNmLE9BQU8sSUFBSSxDQUFBO1lBQ1o7Z0JBQ0Msb0VBQW9FO2dCQUNwRSxnRkFBZ0Y7Z0JBQ2hGLE9BQU8sRUFBRSxDQUFBO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFHTyxjQUFjLENBQUMsS0FBYTtRQUNuQyxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsNkVBQTZFO0lBQ3JFLFNBQVM7UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLFNBQVMsQ0FBQyxLQUFnQjtRQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDZixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDeEIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFlLEVBQUUsT0FBZTtRQUNoRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN2QixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLEdBQVUsRUFBRSxjQUF1QjtRQUMvRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQ3ZCLHdDQUF3QyxFQUN4QyxpQ0FBaUMsRUFDakMsUUFBUSxFQUNSLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQ3RCLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQTtJQUMxQixDQUFDO0lBRU8sTUFBTSxDQUFDLElBQWU7UUFDN0IsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQTtJQUNsQyxDQUFDO0lBRU8sS0FBSztRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVPLFFBQVE7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLDJCQUFrQixDQUFBO0lBQzNDLENBQUM7O0FBR0YsTUFBTSxPQUFnQixjQUFjO0lBQzVCLE1BQU0sQ0FBQyxLQUFLO1FBQ2xCLE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFBO0lBQ3BDLENBQUM7SUFDTSxNQUFNLENBQUMsSUFBSTtRQUNqQixPQUFPLGtCQUFrQixDQUFDLFFBQVEsQ0FBQTtJQUNuQyxDQUFDO0lBQ00sTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFXO1FBQzVCLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFDTSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQVcsRUFBRSxLQUFVO1FBQzNDLE9BQU8sb0JBQW9CLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBQ00sTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFXLEVBQUUsS0FBVTtRQUM5QyxPQUFPLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUNNLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDN0MsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFDTSxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQzFDLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ00sTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUM3QyxPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUNNLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBVztRQUM1QixPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBQ00sTUFBTSxDQUFDLEdBQUcsQ0FDaEIsR0FBRyxJQUFvRDtRQUV2RCxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFDTSxNQUFNLENBQUMsRUFBRSxDQUNmLEdBQUcsSUFBb0Q7UUFFdkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBQ00sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUMvQyxPQUFPLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUNNLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDckQsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFDTSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQy9DLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBQ00sTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUNyRCxPQUFPLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEQsQ0FBQzthQUVjLFlBQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFFLDZCQUE2QixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FDeEIsVUFBcUM7UUFFckMsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNyRCxrR0FBa0c7WUFDbEcsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQzs7QUFHRixNQUFNLFVBQVUsbUJBQW1CLENBQUMsV0FBcUI7SUFDeEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsRUFBRSw2QkFBNkIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBLENBQUMsZ0VBQWdFO0lBRXBJLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFeEIsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxZQUFZLEVBQUUsRUFBRSxDQUFDLGNBQWM7b0JBQzlCLENBQUMsQ0FBQyxRQUFRLENBQ1IsMkNBQTJDLEVBQzNDLDZCQUE2QixFQUM3QixFQUFFLENBQUMsY0FBYyxDQUNqQjtvQkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLG1CQUFtQixDQUFDO2dCQUNyRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU07Z0JBQ2pCLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU07YUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEQsWUFBWSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPO2dCQUNwRixNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU07Z0JBQ2pCLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU07YUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSwyQ0FBMkMsQ0FDMUQsQ0FBMEMsRUFDMUMsQ0FBMEM7SUFFMUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ3JELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNyRCxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUMzQixDQUFDO0FBRUQsU0FBUyxHQUFHLENBQUMsQ0FBdUIsRUFBRSxDQUF1QjtJQUM1RCxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDaEIsQ0FBQztBQUVELE1BQU0sT0FBTyxtQkFBbUI7YUFDakIsYUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQUFBNUIsQ0FBNEI7SUFJbEQ7UUFGZ0IsU0FBSSxvQ0FBMkI7SUFFdEIsQ0FBQztJQUVuQixHQUFHLENBQUMsS0FBMkI7UUFDckMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFDOUIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNoQyxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLENBQUE7SUFDbkMsQ0FBQzs7QUFHRixNQUFNLE9BQU8sa0JBQWtCO2FBQ2hCLGFBQVEsR0FBRyxJQUFJLGtCQUFrQixFQUFFLEFBQTNCLENBQTJCO0lBSWpEO1FBRmdCLFNBQUksbUNBQTBCO0lBRXJCLENBQUM7SUFFbkIsR0FBRyxDQUFDLEtBQTJCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQzlCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBMkI7UUFDeEMsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDaEMsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxRQUFRLENBQUMsT0FBaUI7UUFDaEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBNkI7UUFDdkMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sTUFBTTtRQUNaLE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFBO0lBQ3BDLENBQUM7O0FBR0YsTUFBTSxPQUFPLHFCQUFxQjtJQUMxQixNQUFNLENBQUMsTUFBTSxDQUNuQixHQUFXLEVBQ1gsVUFBdUMsSUFBSTtRQUUzQyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzlDLElBQUksT0FBTyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEMsT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFBO1FBQ2xGLENBQUM7UUFDRCxPQUFPLElBQUkscUJBQXFCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFJRCxZQUNVLEdBQVcsRUFDWixPQUFvQztRQURuQyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFKN0IsU0FBSSxzQ0FBNkI7SUFLOUMsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQTJCO1FBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuRCxJQUFJLE9BQU8sYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtRQUNsRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFBO0lBQ2hCLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQW9CO0lBQ3pCLE1BQU0sQ0FBQyxNQUFNLENBQ25CLEdBQVcsRUFDWCxLQUFVLEVBQ1YsVUFBdUMsSUFBSTtRQUUzQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sS0FBSztnQkFDWCxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzlDLElBQUksT0FBTyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUNsRCxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFBO1FBQ3hGLENBQUM7UUFDRCxPQUFPLElBQUksb0JBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBSUQsWUFDa0IsR0FBVyxFQUNYLEtBQVUsRUFDbkIsT0FBb0M7UUFGM0IsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFVBQUssR0FBTCxLQUFLLENBQUs7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFMN0IsU0FBSSxxQ0FBNEI7SUFNN0MsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25ELElBQUksT0FBTyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtZQUNsRCxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtRQUM3RixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLGlCQUFpQjtRQUNqQixrQ0FBa0M7UUFDbEMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2hELENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFBO0lBQ3hDLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFFLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFnQjtJQUNyQixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQVcsRUFBRSxRQUFnQjtRQUNqRCxPQUFPLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFLRCxZQUNrQixHQUFXLEVBQ1gsUUFBZ0I7UUFEaEIsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLGFBQVEsR0FBUixRQUFRLENBQVE7UUFMbEIsU0FBSSxrQ0FBd0I7UUFDcEMsWUFBTyxHQUFnQyxJQUFJLENBQUE7SUFLaEQsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQTtRQUNsRSxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU5QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUV2QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBVyxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0UsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQTtJQUMzQyxDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBVyxFQUFFLFFBQWdCO1FBQ2pELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQU1ELFlBQ2tCLEdBQVcsRUFDWCxRQUFnQjtRQURoQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQU5sQixTQUFJLHFDQUEyQjtRQVE5QyxJQUFJLENBQUMsUUFBUSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQTJCO1FBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxRQUFRLENBQUMsT0FBaUI7UUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLFlBQVksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFBO0lBQy9DLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBNkI7UUFDdkMsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2hELENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFDNUIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsR0FBVyxFQUNYLEtBQVUsRUFDVixVQUF1QyxJQUFJO1FBRTNDLElBQUksT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDOUMsQ0FBQztZQUNELE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QyxJQUFJLE9BQU8sYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFDbkQsT0FBTyxLQUFLLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQTtRQUN6RixDQUFDO1FBQ0QsT0FBTyxJQUFJLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUlELFlBQ2tCLEdBQVcsRUFDWCxLQUFVLEVBQ25CLE9BQW9DO1FBRjNCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxVQUFLLEdBQUwsS0FBSyxDQUFLO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQTZCO1FBTDdCLFNBQUksd0NBQStCO0lBTWhELENBQUM7SUFFRyxHQUFHLENBQUMsS0FBMkI7UUFDckMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFTSxNQUFNLENBQUMsS0FBMkI7UUFDeEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDNUQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuRCxJQUFJLE9BQU8sYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7WUFDbkQsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUE7UUFDOUYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxpQkFBaUI7UUFDakIsa0NBQWtDO1FBQ2xDLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNoRCxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQTtJQUN4QyxDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDdEIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsR0FBVyxFQUNYLFVBQXVDLElBQUk7UUFFM0MsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QyxJQUFJLE9BQU8sYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQTtRQUNsRixDQUFDO1FBQ0QsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBSUQsWUFDa0IsR0FBVyxFQUNwQixPQUFvQztRQUQzQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ3BCLFlBQU8sR0FBUCxPQUFPLENBQTZCO1FBSjdCLFNBQUksa0NBQXlCO0lBSzFDLENBQUM7SUFFRyxHQUFHLENBQUMsS0FBMkI7UUFDckMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkQsSUFBSSxPQUFPLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxPQUFPLGFBQWEsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUE7UUFDbEYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FDdEIsS0FBVSxFQUNWLFFBQXVDO0lBRXZDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDL0IsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNmLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDVixDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtBQUNwQyxDQUFDO0FBRUQsTUFBTSxPQUFPLHFCQUFxQjtJQUMxQixNQUFNLENBQUMsTUFBTSxDQUNuQixHQUFXLEVBQ1gsTUFBVyxFQUNYLFVBQXVDLElBQUk7UUFFM0MsT0FBTyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBSUQsWUFDa0IsR0FBVyxFQUNYLEtBQXNCLEVBQy9CLE9BQW9DO1FBRjNCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxVQUFLLEdBQUwsS0FBSyxDQUFpQjtRQUMvQixZQUFPLEdBQVAsT0FBTyxDQUE2QjtRQUw3QixTQUFJLHVDQUE2QjtJQU05QyxDQUFDO0lBRUcsR0FBRyxDQUFDLEtBQTJCO1FBQ3JDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQTJCO1FBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQzVELENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNoRSxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsMkJBQTJCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywyQkFBMkI7SUFDaEMsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsR0FBVyxFQUNYLE1BQVcsRUFDWCxVQUF1QyxJQUFJO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUlELFlBQ2tCLEdBQVcsRUFDWCxLQUFzQixFQUMvQixPQUFvQztRQUYzQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsVUFBSyxHQUFMLEtBQUssQ0FBaUI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFMN0IsU0FBSSw2Q0FBbUM7SUFNcEQsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBTSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDakUsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBNkI7UUFDdkMsT0FBTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsR0FBVyxFQUNYLE1BQVcsRUFDWCxVQUF1QyxJQUFJO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDekYsQ0FBQztJQUlELFlBQ2tCLEdBQVcsRUFDWCxLQUFzQixFQUMvQixPQUFvQztRQUYzQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsVUFBSyxHQUFMLEtBQUssQ0FBaUI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFMN0IsU0FBSSx1Q0FBNkI7SUFNOUMsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBTSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDaEUsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckMsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBNkI7UUFDdkMsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTSxNQUFNO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMkJBQTJCO0lBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQ25CLEdBQVcsRUFDWCxNQUFXLEVBQ1gsVUFBdUMsSUFBSTtRQUUzQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksMkJBQTJCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFJRCxZQUNrQixHQUFXLEVBQ1gsS0FBc0IsRUFDL0IsT0FBb0M7UUFGM0IsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFVBQUssR0FBTCxLQUFLLENBQWlCO1FBQy9CLFlBQU8sR0FBUCxPQUFPLENBQTZCO1FBTDdCLFNBQUksNkNBQW1DO0lBTXBELENBQUM7SUFFRyxHQUFHLENBQUMsS0FBMkI7UUFDckMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFTSxNQUFNLENBQUMsS0FBMkI7UUFDeEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDNUQsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTSxRQUFRLENBQUMsT0FBaUI7UUFDaEMsSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2pFLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTSxNQUFNO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBVyxFQUFFLE1BQXFCO1FBQ3RELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUtELFlBQ2tCLEdBQVcsRUFDWCxNQUFxQjtRQURyQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsV0FBTSxHQUFOLE1BQU0sQ0FBZTtRQUx2QixTQUFJLG9DQUEyQjtRQUN2QyxZQUFPLEdBQWdDLElBQUksQ0FBQTtRQU1sRCxFQUFFO0lBQ0gsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDVixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMxQixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3hELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDM0QsSUFBSSxVQUFVLEdBQUcsV0FBVyxFQUFFLENBQUM7WUFDOUIsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLFVBQVUsR0FBRyxXQUFXLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTSxNQUFNLENBQUMsS0FBMkI7UUFDeEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBQ3hELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDM0QsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLElBQUksVUFBVSxLQUFLLFdBQVcsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFpQjtRQUNoQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDckQsQ0FBQztJQUVNLFNBQVM7UUFDZixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQTtRQUN2RixPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsT0FBTyxLQUFLLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHNCQUFzQjtJQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQTJCO1FBQy9DLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBSUQsWUFBcUMsT0FBNEI7UUFBNUIsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7UUFGakQsU0FBSSx1Q0FBOEI7UUFHakQsRUFBRTtJQUNILENBQUM7SUFFTSxHQUFHLENBQUMsS0FBMkI7UUFDckMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUE7SUFDeEMsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRU0sTUFBTTtRQUNaLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILFNBQVMseUJBQXlCLENBQ2pDLEdBQTJCO0lBRTNCLCtDQUErQztJQUMvQyxJQUFJLE1BQU0sR0FBZ0QsSUFBSSxDQUFBO0lBQzlELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUU1QyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN4Qix5QkFBeUI7WUFFekIscUNBQXFDO1lBQ3JDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNyQixNQUFNLEdBQUcsRUFBRSxDQUFBO2dCQUNYLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDckIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3JCLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDdEIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsS0FBNkQsRUFDN0QsT0FBb0MsRUFDcEMsbUJBQTRCO1FBRTVCLE9BQU8saUJBQWlCLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBSUQsWUFDaUIsSUFBNEIsRUFDcEMsT0FBb0M7UUFENUIsU0FBSSxHQUFKLElBQUksQ0FBd0I7UUFDcEMsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFKN0IsU0FBSSxrQ0FBeUI7SUFLMUMsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN6QyxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixNQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEQsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNCLFlBQVk7WUFDWixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxNQUFNLENBQUMsYUFBYSxDQUMzQixHQUEyRCxFQUMzRCxPQUFvQyxFQUNwQyxtQkFBNEI7UUFFNUIsTUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFFbkIsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1IsU0FBUTtZQUNULENBQUM7WUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLG9DQUE0QixFQUFFLENBQUM7Z0JBQ3hDLGdDQUFnQztnQkFDaEMsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDZCxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLElBQUkscUNBQTZCLEVBQUUsQ0FBQztnQkFDekMsOEJBQThCO2dCQUM5QixPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtZQUNwQyxDQUFDO1lBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxtQ0FBMkIsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNwQixTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNsQyxPQUFPLGtCQUFrQixDQUFDLFFBQVEsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVkLDRCQUE0QjtRQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pCLENBQUMsRUFBRSxDQUFBO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixDQUFDO1FBRUQsdUVBQXVFO1FBQ3ZFLDBEQUEwRDtRQUMxRCxPQUFPLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekMsSUFBSSxXQUFXLENBQUMsSUFBSSxrQ0FBMEIsRUFBRSxDQUFDO2dCQUNoRCxNQUFLO1lBQ04sQ0FBQztZQUNELHVCQUF1QjtZQUN2QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7WUFFVixpQ0FBaUM7WUFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFHLENBQUE7WUFFdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUE7WUFFcEMsc0RBQXNEO1lBQ3RELE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FDNUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUMzQixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FDOUUsRUFDRCxJQUFJLEVBQ0osVUFBVSxDQUNWLENBQUE7WUFFRCxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixDQUFDO1FBRUQsZ0NBQWdDO1FBQ2hDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ3RDLGVBQWU7d0JBQ2YsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLENBQUE7b0JBQ3BDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFTSxJQUFJO1FBQ1YsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQTZCO1FBQ3ZDLE9BQU8sSUFBSSxpQkFBaUIsQ0FDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDekMsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQTtZQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtZQUMzQixDQUFDO1lBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUUsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBZ0I7SUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsS0FBNkQsRUFDN0QsT0FBb0MsRUFDcEMsbUJBQTRCO1FBRTVCLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBSUQsWUFDaUIsSUFBNEIsRUFDcEMsT0FBb0M7UUFENUIsU0FBSSxHQUFKLElBQUksQ0FBd0I7UUFDcEMsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFKN0IsU0FBSSxpQ0FBd0I7SUFLekMsQ0FBQztJQUVHLEdBQUcsQ0FBQyxLQUEyQjtRQUNyQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzlCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUEyQjtRQUN4QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN6QyxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixNQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEQsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNCLFlBQVk7WUFDWixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRU0sUUFBUSxDQUFDLE9BQWlCO1FBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sTUFBTSxDQUFDLGFBQWEsQ0FDM0IsR0FBMkQsRUFDM0QsT0FBb0MsRUFDcEMsbUJBQTRCO1FBRTVCLElBQUksSUFBSSxHQUEyQixFQUFFLENBQUE7UUFDckMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBRXBCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEIsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNSLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLHFDQUE2QixFQUFFLENBQUM7b0JBQ3pDLGlDQUFpQztvQkFDakMsUUFBUSxHQUFHLElBQUksQ0FBQTtvQkFDZixTQUFRO2dCQUNULENBQUM7Z0JBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxvQ0FBNEIsRUFBRSxDQUFDO29CQUN4Qyw0QkFBNEI7b0JBQzVCLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxDQUFBO2dCQUNuQyxDQUFDO2dCQUVELElBQUksQ0FBQyxDQUFDLElBQUksa0NBQTBCLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUMxQixTQUFRO2dCQUNULENBQUM7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNiLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQTtZQUNwQyxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNmLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNqQixDQUFDLEVBQUUsQ0FBQTtZQUNKLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUN0QyxlQUFlO3dCQUNmLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxDQUFBO29CQUNuQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN2QixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRU0sSUFBSTtRQUNWLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLEdBQUcsQ0FBQyxNQUE2QjtRQUN2QyxPQUFPLElBQUksZ0JBQWdCLENBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQ3pDLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUE7WUFDekMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7WUFDM0IsQ0FBQztZQUVELCtFQUErRTtZQUMvRSwyREFBMkQ7WUFDM0QsT0FBTyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFHLENBQUE7Z0JBQzVCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUcsQ0FBQTtnQkFFN0IsTUFBTSxHQUFHLEdBQTJCLEVBQUUsQ0FBQTtnQkFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsS0FBSyxNQUFNLEtBQUssSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBRSxDQUFDLENBQUE7b0JBQ2hFLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBRSxDQUFDLENBQUE7WUFDM0QsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFFLENBQUE7UUFDNUQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFRRCxNQUFNLE9BQU8sYUFBeUMsU0FBUSxxQkFBcUI7YUFDbkUsVUFBSyxHQUFxQixFQUFFLENBQUE7SUFFM0MsTUFBTSxDQUFDLEdBQUc7UUFDVCxPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUlELFlBQ0MsR0FBVyxFQUNYLFlBQTJCLEVBQzNCLFVBQWtFO1FBRWxFLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDaEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFFakMsZ0RBQWdEO1FBQ2hELElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELENBQUM7YUFBTSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDeEIsR0FBRztnQkFDSCxXQUFXLEVBQUUsVUFBVTtnQkFDdkIsSUFBSSxFQUFFLFlBQVksS0FBSyxJQUFJLElBQUksWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDM0YsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBMEI7UUFDdkMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFTSxRQUFRLENBQUMsTUFBMEI7UUFDekMsT0FBTyxNQUFNLENBQUMsa0JBQWtCLENBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxLQUFVO1FBQzFCLE9BQU8sb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVNLFdBQVcsQ0FBQyxLQUFVO1FBQzVCLE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVNLE9BQU8sQ0FBQyxLQUFVO1FBQ3hCLE9BQU8scUJBQXFCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDckQsQ0FBQzs7QUE4QkYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFBO0FBOEIxRixTQUFTLElBQUksQ0FBQyxJQUFZLEVBQUUsSUFBWTtJQUN2QyxJQUFJLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUNELElBQUksSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQUVELFNBQVMsSUFBSSxDQUFDLElBQVksRUFBRSxNQUFXLEVBQUUsSUFBWSxFQUFFLE1BQVc7SUFDakUsSUFBSSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNWLENBQUM7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUNqQixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFDRCxJQUFJLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUNyQixPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUNELElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FBQyxDQUF1QixFQUFFLENBQXVCO0lBQ3ZFLElBQUksQ0FBQyxDQUFDLElBQUkscUNBQTZCLElBQUksQ0FBQyxDQUFDLElBQUksb0NBQTRCLEVBQUUsQ0FBQztRQUMvRSx5QkFBeUI7UUFDekIsd0JBQXdCO1FBQ3hCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUksQ0FBQyxDQUFDLElBQUksa0NBQTBCLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsQ0FBQyxJQUFJLGtDQUEwQixFQUFFLENBQUM7WUFDdEMsaUVBQWlFO1lBQ2pFLE9BQU8sbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFDLElBQUksa0NBQTBCLEVBQUUsQ0FBQztRQUN0QyxLQUFLLE1BQU0sT0FBTyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFDLElBQUksbUNBQTJCLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsQ0FBQyxJQUFJLG1DQUEyQixFQUFFLENBQUM7WUFDdkMsaUNBQWlDO1lBQ2pDLE9BQU8sbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELEtBQUssTUFBTSxPQUFPLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ25CLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLG1CQUFtQixDQUFDLENBQXlCLEVBQUUsQ0FBeUI7SUFDaEYsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ2QsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ2QsT0FBTyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9DLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFcEMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDYiwwQ0FBMEM7WUFDMUMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO2FBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEIsTUFBTSxFQUFFLENBQUE7WUFDUixNQUFNLEVBQUUsQ0FBQTtRQUNULENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxFQUFFLENBQUE7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFDM0IsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLElBQTBCO0lBQy9DLElBQUksSUFBSSxDQUFDLElBQUksa0NBQTBCLEVBQUUsQ0FBQztRQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNkLENBQUMifQ==