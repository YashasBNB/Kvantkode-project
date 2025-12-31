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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2pzb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxDQUFOLElBQWtCLFNBUWpCO0FBUkQsV0FBa0IsU0FBUztJQUMxQix5Q0FBUSxDQUFBO0lBQ1IsNkVBQTBCLENBQUE7SUFDMUIsMkVBQXlCLENBQUE7SUFDekIsMkVBQXlCLENBQUE7SUFDekIsNkRBQWtCLENBQUE7SUFDbEIsNkVBQTBCLENBQUE7SUFDMUIsaUVBQW9CLENBQUE7QUFDckIsQ0FBQyxFQVJpQixTQUFTLEtBQVQsU0FBUyxRQVExQjtBQUVELE1BQU0sQ0FBTixJQUFrQixVQWtCakI7QUFsQkQsV0FBa0IsVUFBVTtJQUMzQiwrREFBa0IsQ0FBQTtJQUNsQixpRUFBbUIsQ0FBQTtJQUNuQixtRUFBb0IsQ0FBQTtJQUNwQixxRUFBcUIsQ0FBQTtJQUNyQix1REFBYyxDQUFBO0lBQ2QsdURBQWMsQ0FBQTtJQUNkLHlEQUFlLENBQUE7SUFDZix5REFBZSxDQUFBO0lBQ2YsMkRBQWdCLENBQUE7SUFDaEIsOERBQWtCLENBQUE7SUFDbEIsZ0VBQW1CLENBQUE7SUFDbkIsc0VBQXNCLENBQUE7SUFDdEIsd0VBQXVCLENBQUE7SUFDdkIsa0VBQW9CLENBQUE7SUFDcEIsZ0RBQVcsQ0FBQTtJQUNYLGtEQUFZLENBQUE7SUFDWiwwQ0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQWxCaUIsVUFBVSxLQUFWLFVBQVUsUUFrQjNCO0FBOENELE1BQU0sQ0FBTixJQUFrQixjQWlCakI7QUFqQkQsV0FBa0IsY0FBYztJQUMvQixxRUFBaUIsQ0FBQTtJQUNqQixpRkFBdUIsQ0FBQTtJQUN2QixtRkFBd0IsQ0FBQTtJQUN4QixxRUFBaUIsQ0FBQTtJQUNqQixxRUFBaUIsQ0FBQTtJQUNqQixxRUFBaUIsQ0FB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