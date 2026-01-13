/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ScanError;
(function (ScanError) {
    ScanError[ScanError["None"] = 0] = "None";
    ScanError[ScanError["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
    ScanError[ScanError["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
    ScanError[ScanError["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
    ScanError[ScanError["InvalidUnicode"] = 4] = "InvalidUnicode";
    ScanError[ScanError["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
    ScanError[ScanError["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
export var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["OpenBraceToken"] = 1] = "OpenBraceToken";
    SyntaxKind[SyntaxKind["CloseBraceToken"] = 2] = "CloseBraceToken";
    SyntaxKind[SyntaxKind["OpenBracketToken"] = 3] = "OpenBracketToken";
    SyntaxKind[SyntaxKind["CloseBracketToken"] = 4] = "CloseBracketToken";
    SyntaxKind[SyntaxKind["CommaToken"] = 5] = "CommaToken";
    SyntaxKind[SyntaxKind["ColonToken"] = 6] = "ColonToken";
    SyntaxKind[SyntaxKind["NullKeyword"] = 7] = "NullKeyword";
    SyntaxKind[SyntaxKind["TrueKeyword"] = 8] = "TrueKeyword";
    SyntaxKind[SyntaxKind["FalseKeyword"] = 9] = "FalseKeyword";
    SyntaxKind[SyntaxKind["StringLiteral"] = 10] = "StringLiteral";
    SyntaxKind[SyntaxKind["NumericLiteral"] = 11] = "NumericLiteral";
    SyntaxKind[SyntaxKind["LineCommentTrivia"] = 12] = "LineCommentTrivia";
    SyntaxKind[SyntaxKind["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
    SyntaxKind[SyntaxKind["LineBreakTrivia"] = 14] = "LineBreakTrivia";
    SyntaxKind[SyntaxKind["Trivia"] = 15] = "Trivia";
    SyntaxKind[SyntaxKind["Unknown"] = 16] = "Unknown";
    SyntaxKind[SyntaxKind["EOF"] = 17] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
export var ParseErrorCode;
(function (ParseErrorCode) {
    ParseErrorCode[ParseErrorCode["InvalidSymbol"] = 1] = "InvalidSymbol";
    ParseErrorCode[ParseErrorCode["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
    ParseErrorCode[ParseErrorCode["PropertyNameExpected"] = 3] = "PropertyNameExpected";
    ParseErrorCode[ParseErrorCode["ValueExpected"] = 4] = "ValueExpected";
    ParseErrorCode[ParseErrorCode["ColonExpected"] = 5] = "ColonExpected";
    ParseErrorCode[ParseErrorCode["CommaExpected"] = 6] = "CommaExpected";
    ParseErrorCode[ParseErrorCode["CloseBraceExpected"] = 7] = "CloseBraceExpected";
    ParseErrorCode[ParseErrorCode["CloseBracketExpected"] = 8] = "CloseBracketExpected";
    ParseErrorCode[ParseErrorCode["EndOfFileExpected"] = 9] = "EndOfFileExpected";
    ParseErrorCode[ParseErrorCode["InvalidCommentToken"] = 10] = "InvalidCommentToken";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
    ParseErrorCode[ParseErrorCode["InvalidUnicode"] = 14] = "InvalidUnicode";
    ParseErrorCode[ParseErrorCode["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
    ParseErrorCode[ParseErrorCode["InvalidCharacter"] = 16] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));
export var ParseOptions;
(function (ParseOptions) {
    ParseOptions.DEFAULT = {
        allowTrailingComma: true,
    };
})(ParseOptions || (ParseOptions = {}));
/**
 * Creates a JSON scanner on the given text.
 * If ignoreTrivia is set, whitespaces or comments are ignored.
 */
export function createScanner(text, ignoreTrivia = false) {
    let pos = 0;
    const len = text.length;
    let value = '';
    let tokenOffset = 0;
    let token = 16 /* SyntaxKind.Unknown */;
    let scanError = 0 /* ScanError.None */;
    function scanHexDigits(count) {
        let digits = 0;
        let hexValue = 0;
        while (digits < count) {
            const ch = text.charCodeAt(pos);
            if (ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */) {
                hexValue = hexValue * 16 + ch - 48 /* CharacterCodes._0 */;
            }
            else if (ch >= 65 /* CharacterCodes.A */ && ch <= 70 /* CharacterCodes.F */) {
                hexValue = hexValue * 16 + ch - 65 /* CharacterCodes.A */ + 10;
            }
            else if (ch >= 97 /* CharacterCodes.a */ && ch <= 102 /* CharacterCodes.f */) {
                hexValue = hexValue * 16 + ch - 97 /* CharacterCodes.a */ + 10;
            }
            else {
                break;
            }
            pos++;
            digits++;
        }
        if (digits < count) {
            hexValue = -1;
        }
        return hexValue;
    }
    function setPosition(newPosition) {
        pos = newPosition;
        value = '';
        tokenOffset = 0;
        token = 16 /* SyntaxKind.Unknown */;
        scanError = 0 /* ScanError.None */;
    }
    function scanNumber() {
        const start = pos;
        if (text.charCodeAt(pos) === 48 /* CharacterCodes._0 */) {
            pos++;
        }
        else {
            pos++;
            while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
            }
        }
        if (pos < text.length && text.charCodeAt(pos) === 46 /* CharacterCodes.dot */) {
            pos++;
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
                return text.substring(start, pos);
            }
        }
        let end = pos;
        if (pos < text.length &&
            (text.charCodeAt(pos) === 69 /* CharacterCodes.E */ || text.charCodeAt(pos) === 101 /* CharacterCodes.e */)) {
            pos++;
            if ((pos < text.length && text.charCodeAt(pos) === 43 /* CharacterCodes.plus */) ||
                text.charCodeAt(pos) === 45 /* CharacterCodes.minus */) {
                pos++;
            }
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
                end = pos;
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
            }
        }
        return text.substring(start, end);
    }
    function scanString() {
        let result = '', start = pos;
        while (true) {
            if (pos >= len) {
                result += text.substring(start, pos);
                scanError = 2 /* ScanError.UnexpectedEndOfString */;
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === 34 /* CharacterCodes.doubleQuote */) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            if (ch === 92 /* CharacterCodes.backslash */) {
                result += text.substring(start, pos);
                pos++;
                if (pos >= len) {
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                const ch2 = text.charCodeAt(pos++);
                switch (ch2) {
                    case 34 /* CharacterCodes.doubleQuote */:
                        result += '\"';
                        break;
                    case 92 /* CharacterCodes.backslash */:
                        result += '\\';
                        break;
                    case 47 /* CharacterCodes.slash */:
                        result += '/';
                        break;
                    case 98 /* CharacterCodes.b */:
                        result += '\b';
                        break;
                    case 102 /* CharacterCodes.f */:
                        result += '\f';
                        break;
                    case 110 /* CharacterCodes.n */:
                        result += '\n';
                        break;
                    case 114 /* CharacterCodes.r */:
                        result += '\r';
                        break;
                    case 116 /* CharacterCodes.t */:
                        result += '\t';
                        break;
                    case 117 /* CharacterCodes.u */: {
                        const ch3 = scanHexDigits(4);
                        if (ch3 >= 0) {
                            result += String.fromCharCode(ch3);
                        }
                        else {
                            scanError = 4 /* ScanError.InvalidUnicode */;
                        }
                        break;
                    }
                    default:
                        scanError = 5 /* ScanError.InvalidEscapeCharacter */;
                }
                start = pos;
                continue;
            }
            if (ch >= 0 && ch <= 0x1f) {
                if (isLineBreak(ch)) {
                    result += text.substring(start, pos);
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                else {
                    scanError = 6 /* ScanError.InvalidCharacter */;
                    // mark as error but continue with string
                }
            }
            pos++;
        }
        return result;
    }
    function scanNext() {
        value = '';
        scanError = 0 /* ScanError.None */;
        tokenOffset = pos;
        if (pos >= len) {
            // at the end
            tokenOffset = len;
            return (token = 17 /* SyntaxKind.EOF */);
        }
        let code = text.charCodeAt(pos);
        // trivia: whitespace
        if (isWhitespace(code)) {
            do {
                pos++;
                value += String.fromCharCode(code);
                code = text.charCodeAt(pos);
            } while (isWhitespace(code));
            return (token = 15 /* SyntaxKind.Trivia */);
        }
        // trivia: newlines
        if (isLineBreak(code)) {
            pos++;
            value += String.fromCharCode(code);
            if (code === 13 /* CharacterCodes.carriageReturn */ &&
                text.charCodeAt(pos) === 10 /* CharacterCodes.lineFeed */) {
                pos++;
                value += '\n';
            }
            return (token = 14 /* SyntaxKind.LineBreakTrivia */);
        }
        switch (code) {
            // tokens: []{}:,
            case 123 /* CharacterCodes.openBrace */:
                pos++;
                return (token = 1 /* SyntaxKind.OpenBraceToken */);
            case 125 /* CharacterCodes.closeBrace */:
                pos++;
                return (token = 2 /* SyntaxKind.CloseBraceToken */);
            case 91 /* CharacterCodes.openBracket */:
                pos++;
                return (token = 3 /* SyntaxKind.OpenBracketToken */);
            case 93 /* CharacterCodes.closeBracket */:
                pos++;
                return (token = 4 /* SyntaxKind.CloseBracketToken */);
            case 58 /* CharacterCodes.colon */:
                pos++;
                return (token = 6 /* SyntaxKind.ColonToken */);
            case 44 /* CharacterCodes.comma */:
                pos++;
                return (token = 5 /* SyntaxKind.CommaToken */);
            // strings
            case 34 /* CharacterCodes.doubleQuote */:
                pos++;
                value = scanString();
                return (token = 10 /* SyntaxKind.StringLiteral */);
            // comments
            case 47 /* CharacterCodes.slash */: {
                const start = pos - 1;
                // Single-line comment
                if (text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                    pos += 2;
                    while (pos < len) {
                        if (isLineBreak(text.charCodeAt(pos))) {
                            break;
                        }
                        pos++;
                    }
                    value = text.substring(start, pos);
                    return (token = 12 /* SyntaxKind.LineCommentTrivia */);
                }
                // Multi-line comment
                if (text.charCodeAt(pos + 1) === 42 /* CharacterCodes.asterisk */) {
                    pos += 2;
                    const safeLength = len - 1; // For lookahead.
                    let commentClosed = false;
                    while (pos < safeLength) {
                        const ch = text.charCodeAt(pos);
                        if (ch === 42 /* CharacterCodes.asterisk */ &&
                            text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                            pos += 2;
                            commentClosed = true;
                            break;
                        }
                        pos++;
                    }
                    if (!commentClosed) {
                        pos++;
                        scanError = 1 /* ScanError.UnexpectedEndOfComment */;
                    }
                    value = text.substring(start, pos);
                    return (token = 13 /* SyntaxKind.BlockCommentTrivia */);
                }
                // just a single slash
                value += String.fromCharCode(code);
                pos++;
                return (token = 16 /* SyntaxKind.Unknown */);
            }
            // numbers
            case 45 /* CharacterCodes.minus */:
                value += String.fromCharCode(code);
                pos++;
                if (pos === len || !isDigit(text.charCodeAt(pos))) {
                    return (token = 16 /* SyntaxKind.Unknown */);
                }
            // found a minus, followed by a number so
            // we fall through to proceed with scanning
            // numbers
            case 48 /* CharacterCodes._0 */:
            case 49 /* CharacterCodes._1 */:
            case 50 /* CharacterCodes._2 */:
            case 51 /* CharacterCodes._3 */:
            case 52 /* CharacterCodes._4 */:
            case 53 /* CharacterCodes._5 */:
            case 54 /* CharacterCodes._6 */:
            case 55 /* CharacterCodes._7 */:
            case 56 /* CharacterCodes._8 */:
            case 57 /* CharacterCodes._9 */:
                value += scanNumber();
                return (token = 11 /* SyntaxKind.NumericLiteral */);
            // literals and unknown symbols
            default:
                // is a literal? Read the full word.
                while (pos < len && isUnknownContentCharacter(code)) {
                    pos++;
                    code = text.charCodeAt(pos);
                }
                if (tokenOffset !== pos) {
                    value = text.substring(tokenOffset, pos);
                    // keywords: true, false, null
                    switch (value) {
                        case 'true':
                            return (token = 8 /* SyntaxKind.TrueKeyword */);
                        case 'false':
                            return (token = 9 /* SyntaxKind.FalseKeyword */);
                        case 'null':
                            return (token = 7 /* SyntaxKind.NullKeyword */);
                    }
                    return (token = 16 /* SyntaxKind.Unknown */);
                }
                // some
                value += String.fromCharCode(code);
                pos++;
                return (token = 16 /* SyntaxKind.Unknown */);
        }
    }
    function isUnknownContentCharacter(code) {
        if (isWhitespace(code) || isLineBreak(code)) {
            return false;
        }
        switch (code) {
            case 125 /* CharacterCodes.closeBrace */:
            case 93 /* CharacterCodes.closeBracket */:
            case 123 /* CharacterCodes.openBrace */:
            case 91 /* CharacterCodes.openBracket */:
            case 34 /* CharacterCodes.doubleQuote */:
            case 58 /* CharacterCodes.colon */:
            case 44 /* CharacterCodes.comma */:
            case 47 /* CharacterCodes.slash */:
                return false;
        }
        return true;
    }
    function scanNextNonTrivia() {
        let result;
        do {
            result = scanNext();
        } while (result >= 12 /* SyntaxKind.LineCommentTrivia */ && result <= 15 /* SyntaxKind.Trivia */);
        return result;
    }
    return {
        setPosition: setPosition,
        getPosition: () => pos,
        scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
        getToken: () => token,
        getTokenValue: () => value,
        getTokenOffset: () => tokenOffset,
        getTokenLength: () => pos - tokenOffset,
        getTokenError: () => scanError,
    };
}
function isWhitespace(ch) {
    return (ch === 32 /* CharacterCodes.space */ ||
        ch === 9 /* CharacterCodes.tab */ ||
        ch === 11 /* CharacterCodes.verticalTab */ ||
        ch === 12 /* CharacterCodes.formFeed */ ||
        ch === 160 /* CharacterCodes.nonBreakingSpace */ ||
        ch === 5760 /* CharacterCodes.ogham */ ||
        (ch >= 8192 /* CharacterCodes.enQuad */ && ch <= 8203 /* CharacterCodes.zeroWidthSpace */) ||
        ch === 8239 /* CharacterCodes.narrowNoBreakSpace */ ||
        ch === 8287 /* CharacterCodes.mathematicalSpace */ ||
        ch === 12288 /* CharacterCodes.ideographicSpace */ ||
        ch === 65279 /* CharacterCodes.byteOrderMark */);
}
function isLineBreak(ch) {
    return (ch === 10 /* CharacterCodes.lineFeed */ ||
        ch === 13 /* CharacterCodes.carriageReturn */ ||
        ch === 8232 /* CharacterCodes.lineSeparator */ ||
        ch === 8233 /* CharacterCodes.paragraphSeparator */);
}
function isDigit(ch) {
    return ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */;
}
var CharacterCodes;
(function (CharacterCodes) {
    CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
    CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 127] = "maxAsciiCharacter";
    CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
    CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
    CharacterCodes[CharacterCodes["lineSeparator"] = 8232] = "lineSeparator";
    CharacterCodes[CharacterCodes["paragraphSeparator"] = 8233] = "paragraphSeparator";
    // REVIEW: do we need to support this?  The scanner doesn't, but our IText does.  This seems
    // like an odd disparity?  (Or maybe it's completely fine for them to be different).
    CharacterCodes[CharacterCodes["nextLine"] = 133] = "nextLine";
    // Unicode 3.0 space characters
    CharacterCodes[CharacterCodes["space"] = 32] = "space";
    CharacterCodes[CharacterCodes["nonBreakingSpace"] = 160] = "nonBreakingSpace";
    CharacterCodes[CharacterCodes["enQuad"] = 8192] = "enQuad";
    CharacterCodes[CharacterCodes["emQuad"] = 8193] = "emQuad";
    CharacterCodes[CharacterCodes["enSpace"] = 8194] = "enSpace";
    CharacterCodes[CharacterCodes["emSpace"] = 8195] = "emSpace";
    CharacterCodes[CharacterCodes["threePerEmSpace"] = 8196] = "threePerEmSpace";
    CharacterCodes[CharacterCodes["fourPerEmSpace"] = 8197] = "fourPerEmSpace";
    CharacterCodes[CharacterCodes["sixPerEmSpace"] = 8198] = "sixPerEmSpace";
    CharacterCodes[CharacterCodes["figureSpace"] = 8199] = "figureSpace";
    CharacterCodes[CharacterCodes["punctuationSpace"] = 8200] = "punctuationSpace";
    CharacterCodes[CharacterCodes["thinSpace"] = 8201] = "thinSpace";
    CharacterCodes[CharacterCodes["hairSpace"] = 8202] = "hairSpace";
    CharacterCodes[CharacterCodes["zeroWidthSpace"] = 8203] = "zeroWidthSpace";
    CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 8239] = "narrowNoBreakSpace";
    CharacterCodes[CharacterCodes["ideographicSpace"] = 12288] = "ideographicSpace";
    CharacterCodes[CharacterCodes["mathematicalSpace"] = 8287] = "mathematicalSpace";
    CharacterCodes[CharacterCodes["ogham"] = 5760] = "ogham";
    CharacterCodes[CharacterCodes["_"] = 95] = "_";
    CharacterCodes[CharacterCodes["$"] = 36] = "$";
    CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
    CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
    CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
    CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
    CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
    CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
    CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
    CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
    CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
    CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
    CharacterCodes[CharacterCodes["a"] = 97] = "a";
    CharacterCodes[CharacterCodes["b"] = 98] = "b";
    CharacterCodes[CharacterCodes["c"] = 99] = "c";
    CharacterCodes[CharacterCodes["d"] = 100] = "d";
    CharacterCodes[CharacterCodes["e"] = 101] = "e";
    CharacterCodes[CharacterCodes["f"] = 102] = "f";
    CharacterCodes[CharacterCodes["g"] = 103] = "g";
    CharacterCodes[CharacterCodes["h"] = 104] = "h";
    CharacterCodes[CharacterCodes["i"] = 105] = "i";
    CharacterCodes[CharacterCodes["j"] = 106] = "j";
    CharacterCodes[CharacterCodes["k"] = 107] = "k";
    CharacterCodes[CharacterCodes["l"] = 108] = "l";
    CharacterCodes[CharacterCodes["m"] = 109] = "m";
    CharacterCodes[CharacterCodes["n"] = 110] = "n";
    CharacterCodes[CharacterCodes["o"] = 111] = "o";
    CharacterCodes[CharacterCodes["p"] = 112] = "p";
    CharacterCodes[CharacterCodes["q"] = 113] = "q";
    CharacterCodes[CharacterCodes["r"] = 114] = "r";
    CharacterCodes[CharacterCodes["s"] = 115] = "s";
    CharacterCodes[CharacterCodes["t"] = 116] = "t";
    CharacterCodes[CharacterCodes["u"] = 117] = "u";
    CharacterCodes[CharacterCodes["v"] = 118] = "v";
    CharacterCodes[CharacterCodes["w"] = 119] = "w";
    CharacterCodes[CharacterCodes["x"] = 120] = "x";
    CharacterCodes[CharacterCodes["y"] = 121] = "y";
    CharacterCodes[CharacterCodes["z"] = 122] = "z";
    CharacterCodes[CharacterCodes["A"] = 65] = "A";
    CharacterCodes[CharacterCodes["B"] = 66] = "B";
    CharacterCodes[CharacterCodes["C"] = 67] = "C";
    CharacterCodes[CharacterCodes["D"] = 68] = "D";
    CharacterCodes[CharacterCodes["E"] = 69] = "E";
    CharacterCodes[CharacterCodes["F"] = 70] = "F";
    CharacterCodes[CharacterCodes["G"] = 71] = "G";
    CharacterCodes[CharacterCodes["H"] = 72] = "H";
    CharacterCodes[CharacterCodes["I"] = 73] = "I";
    CharacterCodes[CharacterCodes["J"] = 74] = "J";
    CharacterCodes[CharacterCodes["K"] = 75] = "K";
    CharacterCodes[CharacterCodes["L"] = 76] = "L";
    CharacterCodes[CharacterCodes["M"] = 77] = "M";
    CharacterCodes[CharacterCodes["N"] = 78] = "N";
    CharacterCodes[CharacterCodes["O"] = 79] = "O";
    CharacterCodes[CharacterCodes["P"] = 80] = "P";
    CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
    CharacterCodes[CharacterCodes["R"] = 82] = "R";
    CharacterCodes[CharacterCodes["S"] = 83] = "S";
    CharacterCodes[CharacterCodes["T"] = 84] = "T";
    CharacterCodes[CharacterCodes["U"] = 85] = "U";
    CharacterCodes[CharacterCodes["V"] = 86] = "V";
    CharacterCodes[CharacterCodes["W"] = 87] = "W";
    CharacterCodes[CharacterCodes["X"] = 88] = "X";
    CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
    CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
    CharacterCodes[CharacterCodes["ampersand"] = 38] = "ampersand";
    CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
    CharacterCodes[CharacterCodes["at"] = 64] = "at";
    CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
    CharacterCodes[CharacterCodes["bar"] = 124] = "bar";
    CharacterCodes[CharacterCodes["caret"] = 94] = "caret";
    CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
    CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
    CharacterCodes[CharacterCodes["closeParen"] = 41] = "closeParen";
    CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
    CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
    CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
    CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
    CharacterCodes[CharacterCodes["equals"] = 61] = "equals";
    CharacterCodes[CharacterCodes["exclamation"] = 33] = "exclamation";
    CharacterCodes[CharacterCodes["greaterThan"] = 62] = "greaterThan";
    CharacterCodes[CharacterCodes["lessThan"] = 60] = "lessThan";
    CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
    CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
    CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
    CharacterCodes[CharacterCodes["openParen"] = 40] = "openParen";
    CharacterCodes[CharacterCodes["percent"] = 37] = "percent";
    CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
    CharacterCodes[CharacterCodes["question"] = 63] = "question";
    CharacterCodes[CharacterCodes["semicolon"] = 59] = "semicolon";
    CharacterCodes[CharacterCodes["singleQuote"] = 39] = "singleQuote";
    CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
    CharacterCodes[CharacterCodes["tilde"] = 126] = "tilde";
    CharacterCodes[CharacterCodes["backspace"] = 8] = "backspace";
    CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
    CharacterCodes[CharacterCodes["byteOrderMark"] = 65279] = "byteOrderMark";
    CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
    CharacterCodes[CharacterCodes["verticalTab"] = 11] = "verticalTab";
})(CharacterCodes || (CharacterCodes = {}));
/**
 * For a given offset, evaluate the location in the JSON document. Each segment in the location path is either a property name or an array index.
 */
export function getLocation(text, position) {
    const segments = []; // strings or numbers
    const earlyReturnException = new Object();
    let previousNode = undefined;
    const previousNodeInst = {
        value: {},
        offset: 0,
        length: 0,
        type: 'object',
        parent: undefined,
    };
    let isAtPropertyKey = false;
    function setPreviousNode(value, offset, length, type) {
        previousNodeInst.value = value;
        previousNodeInst.offset = offset;
        previousNodeInst.length = length;
        previousNodeInst.type = type;
        previousNodeInst.colonOffset = undefined;
        previousNode = previousNodeInst;
    }
    try {
        visit(text, {
            onObjectBegin: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                isAtPropertyKey = position > offset;
                segments.push(''); // push a placeholder (will be replaced)
            },
            onObjectProperty: (name, offset, length) => {
                if (position < offset) {
                    throw earlyReturnException;
                }
                setPreviousNode(name, offset, length, 'property');
                segments[segments.length - 1] = name;
                if (position <= offset + length) {
                    throw earlyReturnException;
                }
            },
            onObjectEnd: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.pop();
            },
            onArrayBegin: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.push(0);
            },
            onArrayEnd: (offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                previousNode = undefined;
                segments.pop();
            },
            onLiteralValue: (value, offset, length) => {
                if (position < offset) {
                    throw earlyReturnException;
                }
                setPreviousNode(value, offset, length, getNodeType(value));
                if (position <= offset + length) {
                    throw earlyReturnException;
                }
            },
            onSeparator: (sep, offset, length) => {
                if (position <= offset) {
                    throw earlyReturnException;
                }
                if (sep === ':' && previousNode && previousNode.type === 'property') {
                    previousNode.colonOffset = offset;
                    isAtPropertyKey = false;
                    previousNode = undefined;
                }
                else if (sep === ',') {
                    const last = segments[segments.length - 1];
                    if (typeof last === 'number') {
                        segments[segments.length - 1] = last + 1;
                    }
                    else {
                        isAtPropertyKey = true;
                        segments[segments.length - 1] = '';
                    }
                    previousNode = undefined;
                }
            },
        });
    }
    catch (e) {
        if (e !== earlyReturnException) {
            throw e;
        }
    }
    return {
        path: segments,
        previousNode,
        isAtPropertyKey,
        matches: (pattern) => {
            let k = 0;
            for (let i = 0; k < pattern.length && i < segments.length; i++) {
                if (pattern[k] === segments[i] || pattern[k] === '*') {
                    k++;
                }
                else if (pattern[k] !== '**') {
                    return false;
                }
            }
            return k === pattern.length;
        },
    };
}
/**
 * Parses the given text and returns the object the JSON content represents. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 * Therefore always check the errors list to find out if the input was valid.
 */
export function parse(text, errors = [], options = ParseOptions.DEFAULT) {
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    function onValue(value) {
        if (Array.isArray(currentParent)) {
            ;
            currentParent.push(value);
        }
        else if (currentProperty !== null) {
            currentParent[currentProperty] = value;
        }
    }
    const visitor = {
        onObjectBegin: () => {
            const object = {};
            onValue(object);
            previousParents.push(currentParent);
            currentParent = object;
            currentProperty = null;
        },
        onObjectProperty: (name) => {
            currentProperty = name;
        },
        onObjectEnd: () => {
            currentParent = previousParents.pop();
        },
        onArrayBegin: () => {
            const array = [];
            onValue(array);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: () => {
            currentParent = previousParents.pop();
        },
        onLiteralValue: onValue,
        onError: (error, offset, length) => {
            errors.push({ error, offset, length });
        },
    };
    visit(text, visitor, options);
    return currentParent[0];
}
/**
 * Parses the given text and returns a tree representation the JSON content. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 */
export function parseTree(text, errors = [], options = ParseOptions.DEFAULT) {
    let currentParent = {
        type: 'array',
        offset: -1,
        length: -1,
        children: [],
        parent: undefined,
    }; // artificial root
    function ensurePropertyComplete(endOffset) {
        if (currentParent.type === 'property') {
            currentParent.length = endOffset - currentParent.offset;
            currentParent = currentParent.parent;
        }
    }
    function onValue(valueNode) {
        currentParent.children.push(valueNode);
        return valueNode;
    }
    const visitor = {
        onObjectBegin: (offset) => {
            currentParent = onValue({
                type: 'object',
                offset,
                length: -1,
                parent: currentParent,
                children: [],
            });
        },
        onObjectProperty: (name, offset, length) => {
            currentParent = onValue({
                type: 'property',
                offset,
                length: -1,
                parent: currentParent,
                children: [],
            });
            currentParent.children.push({
                type: 'string',
                value: name,
                offset,
                length,
                parent: currentParent,
            });
        },
        onObjectEnd: (offset, length) => {
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
        },
        onArrayBegin: (offset, length) => {
            currentParent = onValue({
                type: 'array',
                offset,
                length: -1,
                parent: currentParent,
                children: [],
            });
        },
        onArrayEnd: (offset, length) => {
            currentParent.length = offset + length - currentParent.offset;
            currentParent = currentParent.parent;
            ensurePropertyComplete(offset + length);
        },
        onLiteralValue: (value, offset, length) => {
            onValue({ type: getNodeType(value), offset, length, parent: currentParent, value });
            ensurePropertyComplete(offset + length);
        },
        onSeparator: (sep, offset, length) => {
            if (currentParent.type === 'property') {
                if (sep === ':') {
                    currentParent.colonOffset = offset;
                }
                else if (sep === ',') {
                    ensurePropertyComplete(offset);
                }
            }
        },
        onError: (error, offset, length) => {
            errors.push({ error, offset, length });
        },
    };
    visit(text, visitor, options);
    const result = currentParent.children[0];
    if (result) {
        delete result.parent;
    }
    return result;
}
/**
 * Finds the node at the given path in a JSON DOM.
 */
export function findNodeAtLocation(root, path) {
    if (!root) {
        return undefined;
    }
    let node = root;
    for (const segment of path) {
        if (typeof segment === 'string') {
            if (node.type !== 'object' || !Array.isArray(node.children)) {
                return undefined;
            }
            let found = false;
            for (const propertyNode of node.children) {
                if (Array.isArray(propertyNode.children) && propertyNode.children[0].value === segment) {
                    node = propertyNode.children[1];
                    found = true;
                    break;
                }
            }
            if (!found) {
                return undefined;
            }
        }
        else {
            const index = segment;
            if (node.type !== 'array' ||
                index < 0 ||
                !Array.isArray(node.children) ||
                index >= node.children.length) {
                return undefined;
            }
            node = node.children[index];
        }
    }
    return node;
}
/**
 * Gets the JSON path of the given JSON DOM node
 */
export function getNodePath(node) {
    if (!node.parent || !node.parent.children) {
        return [];
    }
    const path = getNodePath(node.parent);
    if (node.parent.type === 'property') {
        const key = node.parent.children[0].value;
        path.push(key);
    }
    else if (node.parent.type === 'array') {
        const index = node.parent.children.indexOf(node);
        if (index !== -1) {
            path.push(index);
        }
    }
    return path;
}
/**
 * Evaluates the JavaScript object of the given JSON DOM node
 */
export function getNodeValue(node) {
    switch (node.type) {
        case 'array':
            return node.children.map(getNodeValue);
        case 'object': {
            const obj = Object.create(null);
            for (const prop of node.children) {
                const valueNode = prop.children[1];
                if (valueNode) {
                    obj[prop.children[0].value] = getNodeValue(valueNode);
                }
            }
            return obj;
        }
        case 'null':
        case 'string':
        case 'number':
        case 'boolean':
            return node.value;
        default:
            return undefined;
    }
}
export function contains(node, offset, includeRightBound = false) {
    return ((offset >= node.offset && offset < node.offset + node.length) ||
        (includeRightBound && offset === node.offset + node.length));
}
/**
 * Finds the most inner node at the given offset. If includeRightBound is set, also finds nodes that end at the given offset.
 */
export function findNodeAtOffset(node, offset, includeRightBound = false) {
    if (contains(node, offset, includeRightBound)) {
        const children = node.children;
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
                const item = findNodeAtOffset(children[i], offset, includeRightBound);
                if (item) {
                    return item;
                }
            }
        }
        return node;
    }
    return undefined;
}
/**
 * Parses the given text and invokes the visitor functions for each object, array and literal reached.
 */
export function visit(text, visitor, options = ParseOptions.DEFAULT) {
    const _scanner = createScanner(text, false);
    function toNoArgVisit(visitFunction) {
        return visitFunction
            ? () => visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength())
            : () => true;
    }
    function toOneArgVisit(visitFunction) {
        return visitFunction
            ? (arg) => visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength())
            : () => true;
    }
    const onObjectBegin = toNoArgVisit(visitor.onObjectBegin), onObjectProperty = toOneArgVisit(visitor.onObjectProperty), onObjectEnd = toNoArgVisit(visitor.onObjectEnd), onArrayBegin = toNoArgVisit(visitor.onArrayBegin), onArrayEnd = toNoArgVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisit(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
    const disallowComments = options && options.disallowComments;
    const allowTrailingComma = options && options.allowTrailingComma;
    function scanNext() {
        while (true) {
            const token = _scanner.scan();
            switch (_scanner.getTokenError()) {
                case 4 /* ScanError.InvalidUnicode */:
                    handleError(14 /* ParseErrorCode.InvalidUnicode */);
                    break;
                case 5 /* ScanError.InvalidEscapeCharacter */:
                    handleError(15 /* ParseErrorCode.InvalidEscapeCharacter */);
                    break;
                case 3 /* ScanError.UnexpectedEndOfNumber */:
                    handleError(13 /* ParseErrorCode.UnexpectedEndOfNumber */);
                    break;
                case 1 /* ScanError.UnexpectedEndOfComment */:
                    if (!disallowComments) {
                        handleError(11 /* ParseErrorCode.UnexpectedEndOfComment */);
                    }
                    break;
                case 2 /* ScanError.UnexpectedEndOfString */:
                    handleError(12 /* ParseErrorCode.UnexpectedEndOfString */);
                    break;
                case 6 /* ScanError.InvalidCharacter */:
                    handleError(16 /* ParseErrorCode.InvalidCharacter */);
                    break;
            }
            switch (token) {
                case 12 /* SyntaxKind.LineCommentTrivia */:
                case 13 /* SyntaxKind.BlockCommentTrivia */:
                    if (disallowComments) {
                        handleError(10 /* ParseErrorCode.InvalidCommentToken */);
                    }
                    else {
                        onComment();
                    }
                    break;
                case 16 /* SyntaxKind.Unknown */:
                    handleError(1 /* ParseErrorCode.InvalidSymbol */);
                    break;
                case 15 /* SyntaxKind.Trivia */:
                case 14 /* SyntaxKind.LineBreakTrivia */:
                    break;
                default:
                    return token;
            }
        }
    }
    function handleError(error, skipUntilAfter = [], skipUntil = []) {
        onError(error);
        if (skipUntilAfter.length + skipUntil.length > 0) {
            let token = _scanner.getToken();
            while (token !== 17 /* SyntaxKind.EOF */) {
                if (skipUntilAfter.indexOf(token) !== -1) {
                    scanNext();
                    break;
                }
                else if (skipUntil.indexOf(token) !== -1) {
                    break;
                }
                token = scanNext();
            }
        }
    }
    function parseString(isValue) {
        const value = _scanner.getTokenValue();
        if (isValue) {
            onLiteralValue(value);
        }
        else {
            onObjectProperty(value);
        }
        scanNext();
        return true;
    }
    function parseLiteral() {
        switch (_scanner.getToken()) {
            case 11 /* SyntaxKind.NumericLiteral */: {
                let value = 0;
                try {
                    value = JSON.parse(_scanner.getTokenValue());
                    if (typeof value !== 'number') {
                        handleError(2 /* ParseErrorCode.InvalidNumberFormat */);
                        value = 0;
                    }
                }
                catch (e) {
                    handleError(2 /* ParseErrorCode.InvalidNumberFormat */);
                }
                onLiteralValue(value);
                break;
            }
            case 7 /* SyntaxKind.NullKeyword */:
                onLiteralValue(null);
                break;
            case 8 /* SyntaxKind.TrueKeyword */:
                onLiteralValue(true);
                break;
            case 9 /* SyntaxKind.FalseKeyword */:
                onLiteralValue(false);
                break;
            default:
                return false;
        }
        scanNext();
        return true;
    }
    function parseProperty() {
        if (_scanner.getToken() !== 10 /* SyntaxKind.StringLiteral */) {
            handleError(3 /* ParseErrorCode.PropertyNameExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            return false;
        }
        parseString(false);
        if (_scanner.getToken() === 6 /* SyntaxKind.ColonToken */) {
            onSeparator(':');
            scanNext(); // consume colon
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
        }
        else {
            handleError(5 /* ParseErrorCode.ColonExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
        }
        return true;
    }
    function parseObject() {
        onObjectBegin();
        scanNext(); // consume open brace
        let needsComma = false;
        while (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */ &&
            _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 2 /* SyntaxKind.CloseBraceToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (!parseProperty()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onObjectEnd();
        if (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */) {
            handleError(7 /* ParseErrorCode.CloseBraceExpected */, [2 /* SyntaxKind.CloseBraceToken */], []);
        }
        else {
            scanNext(); // consume close brace
        }
        return true;
    }
    function parseArray() {
        onArrayBegin();
        scanNext(); // consume open bracket
        let needsComma = false;
        while (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */ &&
            _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 4 /* SyntaxKind.CloseBracketToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [4 /* SyntaxKind.CloseBracketToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onArrayEnd();
        if (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */) {
            handleError(8 /* ParseErrorCode.CloseBracketExpected */, [4 /* SyntaxKind.CloseBracketToken */], []);
        }
        else {
            scanNext(); // consume close bracket
        }
        return true;
    }
    function parseValue() {
        switch (_scanner.getToken()) {
            case 3 /* SyntaxKind.OpenBracketToken */:
                return parseArray();
            case 1 /* SyntaxKind.OpenBraceToken */:
                return parseObject();
            case 10 /* SyntaxKind.StringLiteral */:
                return parseString(true);
            default:
                return parseLiteral();
        }
    }
    scanNext();
    if (_scanner.getToken() === 17 /* SyntaxKind.EOF */) {
        if (options.allowEmptyContent) {
            return true;
        }
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (!parseValue()) {
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (_scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
        handleError(9 /* ParseErrorCode.EndOfFileExpected */, [], []);
    }
    return true;
}
export function getNodeType(value) {
    switch (typeof value) {
        case 'boolean':
            return 'boolean';
        case 'number':
            return 'number';
        case 'string':
            return 'string';
        case 'object': {
            if (!value) {
                return 'null';
            }
            else if (Array.isArray(value)) {
                return 'array';
            }
            return 'object';
        }
        default:
            return 'null';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQU4sSUFBa0IsU0FRakI7QUFSRCxXQUFrQixTQUFTO0lBQzFCLHlDQUFRLENBQUE7SUFDUiw2RUFBMEIsQ0FBQTtJQUMxQiwyRUFBeUIsQ0FBQTtJQUN6QiwyRUFBeUIsQ0FBQTtJQUN6Qiw2REFBa0IsQ0FBQTtJQUNsQiw2RUFBMEIsQ0FBQTtJQUMxQixpRUFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBUmlCLFNBQVMsS0FBVCxTQUFTLFFBUTFCO0FBRUQsTUFBTSxDQUFOLElBQWtCLFVBa0JqQjtBQWxCRCxXQUFrQixVQUFVO0lBQzNCLCtEQUFrQixDQUFBO0lBQ2xCLGlFQUFtQixDQUFBO0lBQ25CLG1FQUFvQixDQUFBO0lBQ3BCLHFFQUFxQixDQUFBO0lBQ3JCLHVEQUFjLENBQUE7SUFDZCx1REFBYyxDQUFBO0lBQ2QseURBQWUsQ0FBQTtJQUNmLHlEQUFlLENBQUE7SUFDZiwyREFBZ0IsQ0FBQTtJQUNoQiw4REFBa0IsQ0FBQTtJQUNsQixnRUFBbUIsQ0FBQTtJQUNuQixzRUFBc0IsQ0FBQTtJQUN0Qix3RUFBdUIsQ0FBQTtJQUN2QixrRUFBb0IsQ0FBQTtJQUNwQixnREFBVyxDQUFBO0lBQ1gsa0RBQVksQ0FBQTtJQUNaLDBDQUFRLENBQUE7QUFDVCxDQUFDLEVBbEJpQixVQUFVLEtBQVYsVUFBVSxRQWtCM0I7QUE4Q0QsTUFBTSxDQUFOLElBQWtCLGNBaUJqQjtBQWpCRCxXQUFrQixjQUFjO0lBQy9CLHFFQUFpQixDQUFBO0lBQ2pCLGlGQUF1QixDQUFBO0lBQ3ZCLG1GQUF3QixDQUFBO0lBQ3hCLHFFQUFpQixDQUFBO0lBQ2pCLHFFQUFpQixDQUFBO0lBQ2pCLHFFQUFpQixDQUFBO0lBQ2pCLCtFQUFzQixDQUFBO0lBQ3RCLG1GQUF3QixDQUFBO0lBQ3hCLDZFQUFxQixDQUFBO0lBQ3JCLGtGQUF3QixDQUFBO0lBQ3hCLHdGQUEyQixDQUFBO0lBQzNCLHNGQUEwQixDQUFBO0lBQzFCLHNGQUEwQixDQUFBO0lBQzFCLHdFQUFtQixDQUFBO0lBQ25CLHdGQUEyQixDQUFBO0lBQzNCLDRFQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFqQmlCLGNBQWMsS0FBZCxjQUFjLFFBaUIvQjtBQTZDRCxNQUFNLEtBQVcsWUFBWSxDQUk1QjtBQUpELFdBQWlCLFlBQVk7SUFDZixvQkFBTyxHQUFHO1FBQ3RCLGtCQUFrQixFQUFFLElBQUk7S0FDeEIsQ0FBQTtBQUNGLENBQUMsRUFKZ0IsWUFBWSxLQUFaLFlBQVksUUFJNUI7QUFpREQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FBQyxJQUFZLEVBQUUsZUFBd0IsS0FBSztJQUN4RSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDWCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ3ZCLElBQUksS0FBSyxHQUFXLEVBQUUsQ0FBQTtJQUN0QixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUE7SUFDbkIsSUFBSSxLQUFLLDhCQUFpQyxDQUFBO0lBQzFDLElBQUksU0FBUyx5QkFBNEIsQ0FBQTtJQUV6QyxTQUFTLGFBQWEsQ0FBQyxLQUFhO1FBQ25DLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUNoQixPQUFPLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztZQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQy9CLElBQUksRUFBRSw4QkFBcUIsSUFBSSxFQUFFLDhCQUFxQixFQUFFLENBQUM7Z0JBQ3hELFFBQVEsR0FBRyxRQUFRLEdBQUcsRUFBRSxHQUFHLEVBQUUsNkJBQW9CLENBQUE7WUFDbEQsQ0FBQztpQkFBTSxJQUFJLEVBQUUsNkJBQW9CLElBQUksRUFBRSw2QkFBb0IsRUFBRSxDQUFDO2dCQUM3RCxRQUFRLEdBQUcsUUFBUSxHQUFHLEVBQUUsR0FBRyxFQUFFLDRCQUFtQixHQUFHLEVBQUUsQ0FBQTtZQUN0RCxDQUFDO2lCQUFNLElBQUksRUFBRSw2QkFBb0IsSUFBSSxFQUFFLDhCQUFvQixFQUFFLENBQUM7Z0JBQzdELFFBQVEsR0FBRyxRQUFRLEdBQUcsRUFBRSxHQUFHLEVBQUUsNEJBQW1CLEdBQUcsRUFBRSxDQUFBO1lBQ3RELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFLO1lBQ04sQ0FBQztZQUNELEdBQUcsRUFBRSxDQUFBO1lBQ0wsTUFBTSxFQUFFLENBQUE7UUFDVCxDQUFDO1FBQ0QsSUFBSSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7WUFDcEIsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2QsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxXQUFtQjtRQUN2QyxHQUFHLEdBQUcsV0FBVyxDQUFBO1FBQ2pCLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDVixXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQ2YsS0FBSyw4QkFBcUIsQ0FBQTtRQUMxQixTQUFTLHlCQUFpQixDQUFBO0lBQzNCLENBQUM7SUFFRCxTQUFTLFVBQVU7UUFDbEIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFBO1FBQ2pCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsK0JBQXNCLEVBQUUsQ0FBQztZQUNoRCxHQUFHLEVBQUUsQ0FBQTtRQUNOLENBQUM7YUFBTSxDQUFDO1lBQ1AsR0FBRyxFQUFFLENBQUE7WUFDTCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0QsR0FBRyxFQUFFLENBQUE7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsZ0NBQXVCLEVBQUUsQ0FBQztZQUN0RSxHQUFHLEVBQUUsQ0FBQTtZQUNMLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDM0QsR0FBRyxFQUFFLENBQUE7Z0JBQ04sQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxTQUFTLDBDQUFrQyxDQUFBO2dCQUMzQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFBO1FBQ2IsSUFDQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU07WUFDakIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyw4QkFBcUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQywrQkFBcUIsQ0FBQyxFQUN2RixDQUFDO1lBQ0YsR0FBRyxFQUFFLENBQUE7WUFDTCxJQUNDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsaUNBQXdCLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGtDQUF5QixFQUM1QyxDQUFDO2dCQUNGLEdBQUcsRUFBRSxDQUFBO1lBQ04sQ0FBQztZQUNELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDM0QsR0FBRyxFQUFFLENBQUE7Z0JBQ04sQ0FBQztnQkFDRCxHQUFHLEdBQUcsR0FBRyxDQUFBO1lBQ1YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsMENBQWtDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxTQUFTLFVBQVU7UUFDbEIsSUFBSSxNQUFNLEdBQUcsRUFBRSxFQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFFWixPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDcEMsU0FBUywwQ0FBa0MsQ0FBQTtnQkFDM0MsTUFBSztZQUNOLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQy9CLElBQUksRUFBRSx3Q0FBK0IsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ3BDLEdBQUcsRUFBRSxDQUFBO2dCQUNMLE1BQUs7WUFDTixDQUFDO1lBQ0QsSUFBSSxFQUFFLHNDQUE2QixFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDcEMsR0FBRyxFQUFFLENBQUE7Z0JBQ0wsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ2hCLFNBQVMsMENBQWtDLENBQUE7b0JBQzNDLE1BQUs7Z0JBQ04sQ0FBQztnQkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUE7Z0JBQ2xDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0JBQ2I7d0JBQ0MsTUFBTSxJQUFJLElBQUksQ0FBQTt3QkFDZCxNQUFLO29CQUNOO3dCQUNDLE1BQU0sSUFBSSxJQUFJLENBQUE7d0JBQ2QsTUFBSztvQkFDTjt3QkFDQyxNQUFNLElBQUksR0FBRyxDQUFBO3dCQUNiLE1BQUs7b0JBQ047d0JBQ0MsTUFBTSxJQUFJLElBQUksQ0FBQTt3QkFDZCxNQUFLO29CQUNOO3dCQUNDLE1BQU0sSUFBSSxJQUFJLENBQUE7d0JBQ2QsTUFBSztvQkFDTjt3QkFDQyxNQUFNLElBQUksSUFBSSxDQUFBO3dCQUNkLE1BQUs7b0JBQ047d0JBQ0MsTUFBTSxJQUFJLElBQUksQ0FBQTt3QkFDZCxNQUFLO29CQUNOO3dCQUNDLE1BQU0sSUFBSSxJQUFJLENBQUE7d0JBQ2QsTUFBSztvQkFDTiwrQkFBcUIsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZCLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTt3QkFDNUIsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQ2QsTUFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ25DLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxTQUFTLG1DQUEyQixDQUFBO3dCQUNyQyxDQUFDO3dCQUNELE1BQUs7b0JBQ04sQ0FBQztvQkFDRDt3QkFDQyxTQUFTLDJDQUFtQyxDQUFBO2dCQUM5QyxDQUFDO2dCQUNELEtBQUssR0FBRyxHQUFHLENBQUE7Z0JBQ1gsU0FBUTtZQUNULENBQUM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUMzQixJQUFJLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUNyQixNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7b0JBQ3BDLFNBQVMsMENBQWtDLENBQUE7b0JBQzNDLE1BQUs7Z0JBQ04sQ0FBQztxQkFBTSxDQUFDO29CQUNQLFNBQVMscUNBQTZCLENBQUE7b0JBQ3RDLHlDQUF5QztnQkFDMUMsQ0FBQztZQUNGLENBQUM7WUFDRCxHQUFHLEVBQUUsQ0FBQTtRQUNOLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxTQUFTLFFBQVE7UUFDaEIsS0FBSyxHQUFHLEVBQUUsQ0FBQTtRQUNWLFNBQVMseUJBQWlCLENBQUE7UUFFMUIsV0FBVyxHQUFHLEdBQUcsQ0FBQTtRQUVqQixJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNoQixhQUFhO1lBQ2IsV0FBVyxHQUFHLEdBQUcsQ0FBQTtZQUNqQixPQUFPLENBQUMsS0FBSywwQkFBaUIsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFFRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLHFCQUFxQjtRQUNyQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hCLEdBQUcsQ0FBQztnQkFDSCxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxLQUFLLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbEMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUIsQ0FBQyxRQUFRLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQztZQUU1QixPQUFPLENBQUMsS0FBSyw2QkFBb0IsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixHQUFHLEVBQUUsQ0FBQTtZQUNMLEtBQUssSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xDLElBQ0MsSUFBSSwyQ0FBa0M7Z0JBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLHFDQUE0QixFQUMvQyxDQUFDO2dCQUNGLEdBQUcsRUFBRSxDQUFBO2dCQUNMLEtBQUssSUFBSSxJQUFJLENBQUE7WUFDZCxDQUFDO1lBQ0QsT0FBTyxDQUFDLEtBQUssc0NBQTZCLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLGlCQUFpQjtZQUNqQjtnQkFDQyxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLENBQUMsS0FBSyxvQ0FBNEIsQ0FBQyxDQUFBO1lBQzNDO2dCQUNDLEdBQUcsRUFBRSxDQUFBO2dCQUNMLE9BQU8sQ0FBQyxLQUFLLHFDQUE2QixDQUFDLENBQUE7WUFDNUM7Z0JBQ0MsR0FBRyxFQUFFLENBQUE7Z0JBQ0wsT0FBTyxDQUFDLEtBQUssc0NBQThCLENBQUMsQ0FBQTtZQUM3QztnQkFDQyxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLENBQUMsS0FBSyx1Q0FBK0IsQ0FBQyxDQUFBO1lBQzlDO2dCQUNDLEdBQUcsRUFBRSxDQUFBO2dCQUNMLE9BQU8sQ0FBQyxLQUFLLGdDQUF3QixDQUFDLENBQUE7WUFDdkM7Z0JBQ0MsR0FBRyxFQUFFLENBQUE7Z0JBQ0wsT0FBTyxDQUFDLEtBQUssZ0NBQXdCLENBQUMsQ0FBQTtZQUV2QyxVQUFVO1lBQ1Y7Z0JBQ0MsR0FBRyxFQUFFLENBQUE7Z0JBQ0wsS0FBSyxHQUFHLFVBQVUsRUFBRSxDQUFBO2dCQUNwQixPQUFPLENBQUMsS0FBSyxvQ0FBMkIsQ0FBQyxDQUFBO1lBRTFDLFdBQVc7WUFDWCxrQ0FBeUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUE7Z0JBQ3JCLHNCQUFzQjtnQkFDdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsa0NBQXlCLEVBQUUsQ0FBQztvQkFDdkQsR0FBRyxJQUFJLENBQUMsQ0FBQTtvQkFFUixPQUFPLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQzt3QkFDbEIsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQ3ZDLE1BQUs7d0JBQ04sQ0FBQzt3QkFDRCxHQUFHLEVBQUUsQ0FBQTtvQkFDTixDQUFDO29CQUNELEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtvQkFDbEMsT0FBTyxDQUFDLEtBQUssd0NBQStCLENBQUMsQ0FBQTtnQkFDOUMsQ0FBQztnQkFFRCxxQkFBcUI7Z0JBQ3JCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLHFDQUE0QixFQUFFLENBQUM7b0JBQzFELEdBQUcsSUFBSSxDQUFDLENBQUE7b0JBRVIsTUFBTSxVQUFVLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQSxDQUFDLGlCQUFpQjtvQkFDNUMsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO29CQUN6QixPQUFPLEdBQUcsR0FBRyxVQUFVLEVBQUUsQ0FBQzt3QkFDekIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFFL0IsSUFDQyxFQUFFLHFDQUE0Qjs0QkFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLGtDQUF5QixFQUNoRCxDQUFDOzRCQUNGLEdBQUcsSUFBSSxDQUFDLENBQUE7NEJBQ1IsYUFBYSxHQUFHLElBQUksQ0FBQTs0QkFDcEIsTUFBSzt3QkFDTixDQUFDO3dCQUNELEdBQUcsRUFBRSxDQUFBO29CQUNOLENBQUM7b0JBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUNwQixHQUFHLEVBQUUsQ0FBQTt3QkFDTCxTQUFTLDJDQUFtQyxDQUFBO29CQUM3QyxDQUFDO29CQUVELEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtvQkFDbEMsT0FBTyxDQUFDLEtBQUsseUNBQWdDLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQztnQkFDRCxzQkFBc0I7Z0JBQ3RCLEtBQUssSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNsQyxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLENBQUMsS0FBSyw4QkFBcUIsQ0FBQyxDQUFBO1lBQ3BDLENBQUM7WUFDRCxVQUFVO1lBQ1Y7Z0JBQ0MsS0FBSyxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xDLEdBQUcsRUFBRSxDQUFBO2dCQUNMLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsT0FBTyxDQUFDLEtBQUssOEJBQXFCLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztZQUNGLHlDQUF5QztZQUN6QywyQ0FBMkM7WUFDM0MsVUFBVTtZQUNWLGdDQUF1QjtZQUN2QixnQ0FBdUI7WUFDdkIsZ0NBQXVCO1lBQ3ZCLGdDQUF1QjtZQUN2QixnQ0FBdUI7WUFDdkIsZ0NBQXVCO1lBQ3ZCLGdDQUF1QjtZQUN2QixnQ0FBdUI7WUFDdkIsZ0NBQXVCO1lBQ3ZCO2dCQUNDLEtBQUssSUFBSSxVQUFVLEVBQUUsQ0FBQTtnQkFDckIsT0FBTyxDQUFDLEtBQUsscUNBQTRCLENBQUMsQ0FBQTtZQUMzQywrQkFBK0I7WUFDL0I7Z0JBQ0Msb0NBQW9DO2dCQUNwQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDckQsR0FBRyxFQUFFLENBQUE7b0JBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzVCLENBQUM7Z0JBQ0QsSUFBSSxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ3pCLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQTtvQkFDeEMsOEJBQThCO29CQUM5QixRQUFRLEtBQUssRUFBRSxDQUFDO3dCQUNmLEtBQUssTUFBTTs0QkFDVixPQUFPLENBQUMsS0FBSyxpQ0FBeUIsQ0FBQyxDQUFBO3dCQUN4QyxLQUFLLE9BQU87NEJBQ1gsT0FBTyxDQUFDLEtBQUssa0NBQTBCLENBQUMsQ0FBQTt3QkFDekMsS0FBSyxNQUFNOzRCQUNWLE9BQU8sQ0FBQyxLQUFLLGlDQUF5QixDQUFDLENBQUE7b0JBQ3pDLENBQUM7b0JBQ0QsT0FBTyxDQUFDLEtBQUssOEJBQXFCLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztnQkFDRCxPQUFPO2dCQUNQLEtBQUssSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNsQyxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxPQUFPLENBQUMsS0FBSyw4QkFBcUIsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FBQyxJQUFvQjtRQUN0RCxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QseUNBQStCO1lBQy9CLDBDQUFpQztZQUNqQyx3Q0FBOEI7WUFDOUIseUNBQWdDO1lBQ2hDLHlDQUFnQztZQUNoQyxtQ0FBMEI7WUFDMUIsbUNBQTBCO1lBQzFCO2dCQUNDLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsaUJBQWlCO1FBQ3pCLElBQUksTUFBa0IsQ0FBQTtRQUN0QixHQUFHLENBQUM7WUFDSCxNQUFNLEdBQUcsUUFBUSxFQUFFLENBQUE7UUFDcEIsQ0FBQyxRQUFRLE1BQU0seUNBQWdDLElBQUksTUFBTSw4QkFBcUIsRUFBQztRQUMvRSxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxPQUFPO1FBQ04sV0FBVyxFQUFFLFdBQVc7UUFDeEIsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUc7UUFDdEIsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFFBQVE7UUFDakQsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7UUFDckIsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7UUFDMUIsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVc7UUFDakMsY0FBYyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxXQUFXO1FBQ3ZDLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0tBQzlCLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsRUFBVTtJQUMvQixPQUFPLENBQ04sRUFBRSxrQ0FBeUI7UUFDM0IsRUFBRSwrQkFBdUI7UUFDekIsRUFBRSx3Q0FBK0I7UUFDakMsRUFBRSxxQ0FBNEI7UUFDOUIsRUFBRSw4Q0FBb0M7UUFDdEMsRUFBRSxvQ0FBeUI7UUFDM0IsQ0FBQyxFQUFFLG9DQUF5QixJQUFJLEVBQUUsNENBQWlDLENBQUM7UUFDcEUsRUFBRSxpREFBc0M7UUFDeEMsRUFBRSxnREFBcUM7UUFDdkMsRUFBRSxnREFBb0M7UUFDdEMsRUFBRSw2Q0FBaUMsQ0FDbkMsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxFQUFVO0lBQzlCLE9BQU8sQ0FDTixFQUFFLHFDQUE0QjtRQUM5QixFQUFFLDJDQUFrQztRQUNwQyxFQUFFLDRDQUFpQztRQUNuQyxFQUFFLGlEQUFzQyxDQUN4QyxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLEVBQVU7SUFDMUIsT0FBTyxFQUFFLDhCQUFxQixJQUFJLEVBQUUsOEJBQXFCLENBQUE7QUFDMUQsQ0FBQztBQUVELElBQVcsY0F1SVY7QUF2SUQsV0FBVyxjQUFjO0lBQ3hCLHFFQUFpQixDQUFBO0lBQ2pCLCtFQUF3QixDQUFBO0lBRXhCLDREQUFlLENBQUE7SUFDZix3RUFBcUIsQ0FBQTtJQUNyQix3RUFBc0IsQ0FBQTtJQUN0QixrRkFBMkIsQ0FBQTtJQUUzQiw0RkFBNEY7SUFDNUYsb0ZBQW9GO0lBQ3BGLDZEQUFpQixDQUFBO0lBRWpCLCtCQUErQjtJQUMvQixzREFBYyxDQUFBO0lBQ2QsNkVBQXlCLENBQUE7SUFDekIsMERBQWUsQ0FBQTtJQUNmLDBEQUFlLENBQUE7SUFDZiw0REFBZ0IsQ0FBQTtJQUNoQiw0REFBZ0IsQ0FBQTtJQUNoQiw0RUFBd0IsQ0FBQTtJQUN4QiwwRUFBdUIsQ0FBQTtJQUN2Qix3RUFBc0IsQ0FBQTtJQUN0QixvRUFBb0IsQ0FBQTtJQUNwQiw4RUFBeUIsQ0FBQTtJQUN6QixnRUFBa0IsQ0FBQTtJQUNsQixnRUFBa0IsQ0FBQTtJQUNsQiwwRUFBdUIsQ0FBQTtJQUN2QixrRkFBMkIsQ0FBQTtJQUMzQiwrRUFBeUIsQ0FBQTtJQUN6QixnRkFBMEIsQ0FBQTtJQUMxQix3REFBYyxDQUFBO0lBRWQsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFFUixnREFBUyxDQUFBO0lBQ1QsZ0RBQVMsQ0FBQTtJQUNULGdEQUFTLENBQUE7SUFDVCxnREFBUyxDQUFBO0lBQ1QsZ0RBQVMsQ0FBQTtJQUNULGdEQUFTLENBQUE7SUFDVCxnREFBUyxDQUFBO0lBQ1QsZ0RBQVMsQ0FBQTtJQUNULGdEQUFTLENBQUE7SUFDVCxnREFBUyxDQUFBO0lBRVQsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFFUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUNSLDhDQUFRLENBQUE7SUFDUiw4Q0FBUSxDQUFBO0lBQ1IsOENBQVEsQ0FBQTtJQUVSLDhEQUFnQixDQUFBO0lBQ2hCLDREQUFlLENBQUE7SUFDZixnREFBUyxDQUFBO0lBQ1QsOERBQWdCLENBQUE7SUFDaEIsbURBQVUsQ0FBQTtJQUNWLHNEQUFZLENBQUE7SUFDWixpRUFBaUIsQ0FBQTtJQUNqQixvRUFBbUIsQ0FBQTtJQUNuQixnRUFBaUIsQ0FBQTtJQUNqQixzREFBWSxDQUFBO0lBQ1osc0RBQVksQ0FBQTtJQUNaLGtEQUFVLENBQUE7SUFDVixrRUFBa0IsQ0FBQTtJQUNsQix3REFBYSxDQUFBO0lBQ2Isa0VBQWtCLENBQUE7SUFDbEIsa0VBQWtCLENBQUE7SUFDbEIsNERBQWUsQ0FBQTtJQUNmLHNEQUFZLENBQUE7SUFDWiwrREFBZ0IsQ0FBQTtJQUNoQixrRUFBa0IsQ0FBQTtJQUNsQiw4REFBZ0IsQ0FBQTtJQUNoQiwwREFBYyxDQUFBO0lBQ2Qsb0RBQVcsQ0FBQTtJQUNYLDREQUFlLENBQUE7SUFDZiw4REFBZ0IsQ0FBQTtJQUNoQixrRUFBa0IsQ0FBQTtJQUNsQixzREFBWSxDQUFBO0lBQ1osdURBQVksQ0FBQTtJQUVaLDZEQUFnQixDQUFBO0lBQ2hCLDREQUFlLENBQUE7SUFDZix5RUFBc0IsQ0FBQTtJQUN0QixpREFBVSxDQUFBO0lBQ1Ysa0VBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQXZJVSxjQUFjLEtBQWQsY0FBYyxRQXVJeEI7QUFZRDs7R0FFRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsSUFBWSxFQUFFLFFBQWdCO0lBQ3pELE1BQU0sUUFBUSxHQUFjLEVBQUUsQ0FBQSxDQUFDLHFCQUFxQjtJQUNwRCxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxFQUFFLENBQUE7SUFDekMsSUFBSSxZQUFZLEdBQXlCLFNBQVMsQ0FBQTtJQUNsRCxNQUFNLGdCQUFnQixHQUFhO1FBQ2xDLEtBQUssRUFBRSxFQUFFO1FBQ1QsTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLEVBQUUsQ0FBQztRQUNULElBQUksRUFBRSxRQUFRO1FBQ2QsTUFBTSxFQUFFLFNBQVM7S0FDakIsQ0FBQTtJQUNELElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQTtJQUMzQixTQUFTLGVBQWUsQ0FBQyxLQUFhLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxJQUFjO1FBQ3JGLGdCQUFnQixDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDOUIsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNoQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ2hDLGdCQUFnQixDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDNUIsZ0JBQWdCLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQTtRQUN4QyxZQUFZLEdBQUcsZ0JBQWdCLENBQUE7SUFDaEMsQ0FBQztJQUNELElBQUksQ0FBQztRQUNKLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDWCxhQUFhLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7Z0JBQ2pELElBQUksUUFBUSxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QixNQUFNLG9CQUFvQixDQUFBO2dCQUMzQixDQUFDO2dCQUNELFlBQVksR0FBRyxTQUFTLENBQUE7Z0JBQ3hCLGVBQWUsR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFBO2dCQUNuQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUMsd0NBQXdDO1lBQzNELENBQUM7WUFDRCxnQkFBZ0IsRUFBRSxDQUFDLElBQVksRUFBRSxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7Z0JBQ2xFLElBQUksUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDO29CQUN2QixNQUFNLG9CQUFvQixDQUFBO2dCQUMzQixDQUFDO2dCQUNELGVBQWUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFDakQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUNwQyxJQUFJLFFBQVEsSUFBSSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUM7b0JBQ2pDLE1BQU0sb0JBQW9CLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBQ0QsV0FBVyxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO2dCQUMvQyxJQUFJLFFBQVEsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxvQkFBb0IsQ0FBQTtnQkFDM0IsQ0FBQztnQkFDRCxZQUFZLEdBQUcsU0FBUyxDQUFBO2dCQUN4QixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDZixDQUFDO1lBQ0QsWUFBWSxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO2dCQUNoRCxJQUFJLFFBQVEsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxvQkFBb0IsQ0FBQTtnQkFDM0IsQ0FBQztnQkFDRCxZQUFZLEdBQUcsU0FBUyxDQUFBO2dCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxVQUFVLEVBQUUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7Z0JBQzlDLElBQUksUUFBUSxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QixNQUFNLG9CQUFvQixDQUFBO2dCQUMzQixDQUFDO2dCQUNELFlBQVksR0FBRyxTQUFTLENBQUE7Z0JBQ3hCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNmLENBQUM7WUFDRCxjQUFjLEVBQUUsQ0FBQyxLQUFVLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO2dCQUM5RCxJQUFJLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxvQkFBb0IsQ0FBQTtnQkFDM0IsQ0FBQztnQkFDRCxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBRTFELElBQUksUUFBUSxJQUFJLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxvQkFBb0IsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7WUFDRCxXQUFXLEVBQUUsQ0FBQyxHQUFXLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxFQUFFO2dCQUM1RCxJQUFJLFFBQVEsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxvQkFBb0IsQ0FBQTtnQkFDM0IsQ0FBQztnQkFDRCxJQUFJLEdBQUcsS0FBSyxHQUFHLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3JFLFlBQVksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFBO29CQUNqQyxlQUFlLEdBQUcsS0FBSyxDQUFBO29CQUN2QixZQUFZLEdBQUcsU0FBUyxDQUFBO2dCQUN6QixDQUFDO3FCQUFNLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUN4QixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDMUMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDOUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQTtvQkFDekMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLGVBQWUsR0FBRyxJQUFJLENBQUE7d0JBQ3RCLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtvQkFDbkMsQ0FBQztvQkFDRCxZQUFZLEdBQUcsU0FBUyxDQUFBO2dCQUN6QixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osSUFBSSxDQUFDLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztZQUNoQyxNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksRUFBRSxRQUFRO1FBQ2QsWUFBWTtRQUNaLGVBQWU7UUFDZixPQUFPLEVBQUUsQ0FBQyxPQUFrQixFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ1QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDdEQsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osQ0FBQztxQkFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLENBQUMsS0FBSyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQzVCLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQ3BCLElBQVksRUFDWixTQUF1QixFQUFFLEVBQ3pCLFVBQXdCLFlBQVksQ0FBQyxPQUFPO0lBRTVDLElBQUksZUFBZSxHQUFrQixJQUFJLENBQUE7SUFDekMsSUFBSSxhQUFhLEdBQVEsRUFBRSxDQUFBO0lBQzNCLE1BQU0sZUFBZSxHQUFVLEVBQUUsQ0FBQTtJQUVqQyxTQUFTLE9BQU8sQ0FBQyxLQUFVO1FBQzFCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFBUSxhQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLENBQUM7YUFBTSxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNyQyxhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQWdCO1FBQzVCLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDbkIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO1lBQ2pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNmLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDbkMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtZQUN0QixlQUFlLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxnQkFBZ0IsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ2xDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUNELFdBQVcsRUFBRSxHQUFHLEVBQUU7WUFDakIsYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsWUFBWSxFQUFFLEdBQUcsRUFBRTtZQUNsQixNQUFNLEtBQUssR0FBVSxFQUFFLENBQUE7WUFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2QsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUNuQyxhQUFhLEdBQUcsS0FBSyxDQUFBO1lBQ3JCLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUNELFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDaEIsYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsY0FBYyxFQUFFLE9BQU87UUFDdkIsT0FBTyxFQUFFLENBQUMsS0FBcUIsRUFBRSxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDbEUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN2QyxDQUFDO0tBQ0QsQ0FBQTtJQUNELEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzdCLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3hCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQ3hCLElBQVksRUFDWixTQUF1QixFQUFFLEVBQ3pCLFVBQXdCLFlBQVksQ0FBQyxPQUFPO0lBRTVDLElBQUksYUFBYSxHQUFhO1FBQzdCLElBQUksRUFBRSxPQUFPO1FBQ2IsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNWLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDVixRQUFRLEVBQUUsRUFBRTtRQUNaLE1BQU0sRUFBRSxTQUFTO0tBQ2pCLENBQUEsQ0FBQyxrQkFBa0I7SUFFcEIsU0FBUyxzQkFBc0IsQ0FBQyxTQUFpQjtRQUNoRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDdkMsYUFBYSxDQUFDLE1BQU0sR0FBRyxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQTtZQUN2RCxhQUFhLEdBQUcsYUFBYSxDQUFDLE1BQU8sQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsT0FBTyxDQUFDLFNBQWU7UUFDL0IsYUFBYSxDQUFDLFFBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFnQjtRQUM1QixhQUFhLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtZQUNqQyxhQUFhLEdBQUcsT0FBTyxDQUFDO2dCQUN2QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNO2dCQUNOLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ1YsTUFBTSxFQUFFLGFBQWE7Z0JBQ3JCLFFBQVEsRUFBRSxFQUFFO2FBQ1osQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELGdCQUFnQixFQUFFLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUNsRSxhQUFhLEdBQUcsT0FBTyxDQUFDO2dCQUN2QixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsTUFBTTtnQkFDTixNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUNWLE1BQU0sRUFBRSxhQUFhO2dCQUNyQixRQUFRLEVBQUUsRUFBRTthQUNaLENBQUMsQ0FBQTtZQUNGLGFBQWEsQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDO2dCQUM1QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxLQUFLLEVBQUUsSUFBSTtnQkFDWCxNQUFNO2dCQUNOLE1BQU07Z0JBQ04sTUFBTSxFQUFFLGFBQWE7YUFDckIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELFdBQVcsRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUMvQyxhQUFhLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQTtZQUM3RCxhQUFhLEdBQUcsYUFBYSxDQUFDLE1BQU8sQ0FBQTtZQUNyQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUNELFlBQVksRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUNoRCxhQUFhLEdBQUcsT0FBTyxDQUFDO2dCQUN2QixJQUFJLEVBQUUsT0FBTztnQkFDYixNQUFNO2dCQUNOLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ1YsTUFBTSxFQUFFLGFBQWE7Z0JBQ3JCLFFBQVEsRUFBRSxFQUFFO2FBQ1osQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELFVBQVUsRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUM5QyxhQUFhLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQTtZQUM3RCxhQUFhLEdBQUcsYUFBYSxDQUFDLE1BQU8sQ0FBQTtZQUNyQyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUNELGNBQWMsRUFBRSxDQUFDLEtBQVUsRUFBRSxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDOUQsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNuRixzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUNELFdBQVcsRUFBRSxDQUFDLEdBQVcsRUFBRSxNQUFjLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDNUQsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDakIsYUFBYSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUE7Z0JBQ25DLENBQUM7cUJBQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQ3hCLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQyxLQUFxQixFQUFFLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtZQUNsRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7S0FDRCxDQUFBO0lBQ0QsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFFN0IsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1osT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFBO0lBQ3JCLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUFVLEVBQUUsSUFBYztJQUM1RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQ2YsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUM1QixJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ2pCLEtBQUssTUFBTSxZQUFZLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sRUFBRSxDQUFDO29CQUN4RixJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDL0IsS0FBSyxHQUFHLElBQUksQ0FBQTtvQkFDWixNQUFLO2dCQUNOLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFXLE9BQU8sQ0FBQTtZQUM3QixJQUNDLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTztnQkFDckIsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7Z0JBQzdCLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDNUIsQ0FBQztnQkFDRixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsSUFBVTtJQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0MsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2YsQ0FBQztTQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFVO0lBQ3RDLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLEtBQUssT0FBTztZQUNYLE9BQU8sSUFBSSxDQUFDLFFBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDeEMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2YsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFTLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbkMsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3ZELENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsS0FBSyxNQUFNLENBQUM7UUFDWixLQUFLLFFBQVEsQ0FBQztRQUNkLEtBQUssUUFBUSxDQUFDO1FBQ2QsS0FBSyxTQUFTO1lBQ2IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ2xCO1lBQ0MsT0FBTyxTQUFTLENBQUE7SUFDbEIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQVUsRUFBRSxNQUFjLEVBQUUsaUJBQWlCLEdBQUcsS0FBSztJQUM3RSxPQUFPLENBQ04sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzdELENBQUMsaUJBQWlCLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUMzRCxDQUFBO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixJQUFVLEVBQ1YsTUFBYyxFQUNkLGlCQUFpQixHQUFHLEtBQUs7SUFFekIsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7UUFDL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUM5QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxRSxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUE7Z0JBQ3JFLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FDcEIsSUFBWSxFQUNaLE9BQW9CLEVBQ3BCLFVBQXdCLFlBQVksQ0FBQyxPQUFPO0lBRTVDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFFM0MsU0FBUyxZQUFZLENBQUMsYUFBd0Q7UUFDN0UsT0FBTyxhQUFhO1lBQ25CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMzRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFBO0lBQ2QsQ0FBQztJQUNELFNBQVMsYUFBYSxDQUNyQixhQUFnRTtRQUVoRSxPQUFPLGFBQWE7WUFDbkIsQ0FBQyxDQUFDLENBQUMsR0FBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEYsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQTtJQUNkLENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUN4RCxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQzFELFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUMvQyxZQUFZLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFDakQsVUFBVSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQzdDLGNBQWMsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUN0RCxXQUFXLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDaEQsU0FBUyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQzNDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRXpDLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM1RCxNQUFNLGtCQUFrQixHQUFHLE9BQU8sSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUE7SUFDaEUsU0FBUyxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDN0IsUUFBUSxRQUFRLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztnQkFDbEM7b0JBQ0MsV0FBVyx3Q0FBK0IsQ0FBQTtvQkFDMUMsTUFBSztnQkFDTjtvQkFDQyxXQUFXLGdEQUF1QyxDQUFBO29CQUNsRCxNQUFLO2dCQUNOO29CQUNDLFdBQVcsK0NBQXNDLENBQUE7b0JBQ2pELE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQ3ZCLFdBQVcsZ0RBQXVDLENBQUE7b0JBQ25ELENBQUM7b0JBQ0QsTUFBSztnQkFDTjtvQkFDQyxXQUFXLCtDQUFzQyxDQUFBO29CQUNqRCxNQUFLO2dCQUNOO29CQUNDLFdBQVcsMENBQWlDLENBQUE7b0JBQzVDLE1BQUs7WUFDUCxDQUFDO1lBQ0QsUUFBUSxLQUFLLEVBQUUsQ0FBQztnQkFDZiwyQ0FBa0M7Z0JBQ2xDO29CQUNDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDdEIsV0FBVyw2Q0FBb0MsQ0FBQTtvQkFDaEQsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFNBQVMsRUFBRSxDQUFBO29CQUNaLENBQUM7b0JBQ0QsTUFBSztnQkFDTjtvQkFDQyxXQUFXLHNDQUE4QixDQUFBO29CQUN6QyxNQUFLO2dCQUNOLGdDQUF1QjtnQkFDdkI7b0JBQ0MsTUFBSztnQkFDTjtvQkFDQyxPQUFPLEtBQUssQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUNuQixLQUFxQixFQUNyQixpQkFBK0IsRUFBRSxFQUNqQyxZQUEwQixFQUFFO1FBRTVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNkLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xELElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQixPQUFPLEtBQUssNEJBQW1CLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzFDLFFBQVEsRUFBRSxDQUFBO29CQUNWLE1BQUs7Z0JBQ04sQ0FBQztxQkFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsTUFBSztnQkFDTixDQUFDO2dCQUNELEtBQUssR0FBRyxRQUFRLEVBQUUsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxPQUFnQjtRQUNwQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNQLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hCLENBQUM7UUFDRCxRQUFRLEVBQUUsQ0FBQTtRQUNWLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsWUFBWTtRQUNwQixRQUFRLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzdCLHVDQUE4QixDQUFDLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUNiLElBQUksQ0FBQztvQkFDSixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtvQkFDNUMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDL0IsV0FBVyw0Q0FBb0MsQ0FBQTt3QkFDL0MsS0FBSyxHQUFHLENBQUMsQ0FBQTtvQkFDVixDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixXQUFXLDRDQUFvQyxDQUFBO2dCQUNoRCxDQUFDO2dCQUNELGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDckIsTUFBSztZQUNOLENBQUM7WUFDRDtnQkFDQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3BCLE1BQUs7WUFDTjtnQkFDQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3BCLE1BQUs7WUFDTjtnQkFDQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3JCLE1BQUs7WUFDTjtnQkFDQyxPQUFPLEtBQUssQ0FBQTtRQUNkLENBQUM7UUFDRCxRQUFRLEVBQUUsQ0FBQTtRQUNWLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsYUFBYTtRQUNyQixJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsc0NBQTZCLEVBQUUsQ0FBQztZQUN0RCxXQUFXLDhDQUVWLEVBQUUsRUFDRixtRUFBbUQsQ0FDbkQsQ0FBQTtZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQixJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsa0NBQTBCLEVBQUUsQ0FBQztZQUNuRCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDaEIsUUFBUSxFQUFFLENBQUEsQ0FBQyxnQkFBZ0I7WUFFM0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ25CLFdBQVcsdUNBRVYsRUFBRSxFQUNGLG1FQUFtRCxDQUNuRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyx1Q0FFVixFQUFFLEVBQ0YsbUVBQW1ELENBQ25ELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsU0FBUyxXQUFXO1FBQ25CLGFBQWEsRUFBRSxDQUFBO1FBQ2YsUUFBUSxFQUFFLENBQUEsQ0FBQyxxQkFBcUI7UUFFaEMsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLE9BQ0MsUUFBUSxDQUFDLFFBQVEsRUFBRSx1Q0FBK0I7WUFDbEQsUUFBUSxDQUFDLFFBQVEsRUFBRSw0QkFBbUIsRUFDckMsQ0FBQztZQUNGLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxrQ0FBMEIsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pCLFdBQVcsdUNBQStCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQztnQkFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2hCLFFBQVEsRUFBRSxDQUFBLENBQUMsZ0JBQWdCO2dCQUMzQixJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsdUNBQStCLElBQUksa0JBQWtCLEVBQUUsQ0FBQztvQkFDOUUsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUN2QixXQUFXLHVDQUErQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDbEQsQ0FBQztZQUNELElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDO2dCQUN0QixXQUFXLHVDQUVWLEVBQUUsRUFDRixtRUFBbUQsQ0FDbkQsQ0FBQTtZQUNGLENBQUM7WUFDRCxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLENBQUM7UUFDRCxXQUFXLEVBQUUsQ0FBQTtRQUNiLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSx1Q0FBK0IsRUFBRSxDQUFDO1lBQ3hELFdBQVcsNENBQW9DLG9DQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxFQUFFLENBQUEsQ0FBQyxzQkFBc0I7UUFDbEMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsVUFBVTtRQUNsQixZQUFZLEVBQUUsQ0FBQTtRQUNkLFFBQVEsRUFBRSxDQUFBLENBQUMsdUJBQXVCO1FBRWxDLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUN0QixPQUNDLFFBQVEsQ0FBQyxRQUFRLEVBQUUseUNBQWlDO1lBQ3BELFFBQVEsQ0FBQyxRQUFRLEVBQUUsNEJBQW1CLEVBQ3JDLENBQUM7WUFDRixJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsa0NBQTBCLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNqQixXQUFXLHVDQUErQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2xELENBQUM7Z0JBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNoQixRQUFRLEVBQUUsQ0FBQSxDQUFDLGdCQUFnQjtnQkFDM0IsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLHlDQUFpQyxJQUFJLGtCQUFrQixFQUFFLENBQUM7b0JBQ2hGLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDdkIsV0FBVyx1Q0FBK0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDbkIsV0FBVyx1Q0FFVixFQUFFLEVBQ0YscUVBQXFELENBQ3JELENBQUE7WUFDRixDQUFDO1lBQ0QsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUNsQixDQUFDO1FBQ0QsVUFBVSxFQUFFLENBQUE7UUFDWixJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUseUNBQWlDLEVBQUUsQ0FBQztZQUMxRCxXQUFXLDhDQUFzQyxzQ0FBOEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsRUFBRSxDQUFBLENBQUMsd0JBQXdCO1FBQ3BDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxTQUFTLFVBQVU7UUFDbEIsUUFBUSxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM3QjtnQkFDQyxPQUFPLFVBQVUsRUFBRSxDQUFBO1lBQ3BCO2dCQUNDLE9BQU8sV0FBVyxFQUFFLENBQUE7WUFDckI7Z0JBQ0MsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDekI7Z0JBQ0MsT0FBTyxZQUFZLEVBQUUsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsRUFBRSxDQUFBO0lBQ1YsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLDRCQUFtQixFQUFFLENBQUM7UUFDNUMsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxXQUFXLHVDQUErQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDbkIsV0FBVyx1Q0FBK0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSw0QkFBbUIsRUFBRSxDQUFDO1FBQzVDLFdBQVcsMkNBQW1DLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxLQUFVO0lBQ3JDLFFBQVEsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUN0QixLQUFLLFNBQVM7WUFDYixPQUFPLFNBQVMsQ0FBQTtRQUNqQixLQUFLLFFBQVE7WUFDWixPQUFPLFFBQVEsQ0FBQTtRQUNoQixLQUFLLFFBQVE7WUFDWixPQUFPLFFBQVEsQ0FBQTtRQUNoQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLE9BQU8sQ0FBQTtZQUNmLENBQUM7WUFDRCxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBQ0Q7WUFDQyxPQUFPLE1BQU0sQ0FBQTtJQUNmLENBQUM7QUFDRixDQUFDIn0=