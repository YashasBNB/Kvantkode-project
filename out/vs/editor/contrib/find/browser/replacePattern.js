/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { buildReplaceStringWithCasePreserved } from '../../../../base/common/search.js';
var ReplacePatternKind;
(function (ReplacePatternKind) {
    ReplacePatternKind[ReplacePatternKind["StaticValue"] = 0] = "StaticValue";
    ReplacePatternKind[ReplacePatternKind["DynamicPieces"] = 1] = "DynamicPieces";
})(ReplacePatternKind || (ReplacePatternKind = {}));
/**
 * Assigned when the replace pattern is entirely static.
 */
class StaticValueReplacePattern {
    constructor(staticValue) {
        this.staticValue = staticValue;
        this.kind = 0 /* ReplacePatternKind.StaticValue */;
    }
}
/**
 * Assigned when the replace pattern has replacement patterns.
 */
class DynamicPiecesReplacePattern {
    constructor(pieces) {
        this.pieces = pieces;
        this.kind = 1 /* ReplacePatternKind.DynamicPieces */;
    }
}
export class ReplacePattern {
    static fromStaticValue(value) {
        return new ReplacePattern([ReplacePiece.staticValue(value)]);
    }
    get hasReplacementPatterns() {
        return this._state.kind === 1 /* ReplacePatternKind.DynamicPieces */;
    }
    constructor(pieces) {
        if (!pieces || pieces.length === 0) {
            this._state = new StaticValueReplacePattern('');
        }
        else if (pieces.length === 1 && pieces[0].staticValue !== null) {
            this._state = new StaticValueReplacePattern(pieces[0].staticValue);
        }
        else {
            this._state = new DynamicPiecesReplacePattern(pieces);
        }
    }
    buildReplaceString(matches, preserveCase) {
        if (this._state.kind === 0 /* ReplacePatternKind.StaticValue */) {
            if (preserveCase) {
                return buildReplaceStringWithCasePreserved(matches, this._state.staticValue);
            }
            else {
                return this._state.staticValue;
            }
        }
        let result = '';
        for (let i = 0, len = this._state.pieces.length; i < len; i++) {
            const piece = this._state.pieces[i];
            if (piece.staticValue !== null) {
                // static value ReplacePiece
                result += piece.staticValue;
                continue;
            }
            // match index ReplacePiece
            let match = ReplacePattern._substitute(piece.matchIndex, matches);
            if (piece.caseOps !== null && piece.caseOps.length > 0) {
                const repl = [];
                const lenOps = piece.caseOps.length;
                let opIdx = 0;
                for (let idx = 0, len = match.length; idx < len; idx++) {
                    if (opIdx >= lenOps) {
                        repl.push(match.slice(idx));
                        break;
                    }
                    switch (piece.caseOps[opIdx]) {
                        case 'U':
                            repl.push(match[idx].toUpperCase());
                            break;
                        case 'u':
                            repl.push(match[idx].toUpperCase());
                            opIdx++;
                            break;
                        case 'L':
                            repl.push(match[idx].toLowerCase());
                            break;
                        case 'l':
                            repl.push(match[idx].toLowerCase());
                            opIdx++;
                            break;
                        default:
                            repl.push(match[idx]);
                    }
                }
                match = repl.join('');
            }
            result += match;
        }
        return result;
    }
    static _substitute(matchIndex, matches) {
        if (matches === null) {
            return '';
        }
        if (matchIndex === 0) {
            return matches[0];
        }
        let remainder = '';
        while (matchIndex > 0) {
            if (matchIndex < matches.length) {
                // A match can be undefined
                const match = matches[matchIndex] || '';
                return match + remainder;
            }
            remainder = String(matchIndex % 10) + remainder;
            matchIndex = Math.floor(matchIndex / 10);
        }
        return '$' + remainder;
    }
}
/**
 * A replace piece can either be a static string or an index to a specific match.
 */
export class ReplacePiece {
    static staticValue(value) {
        return new ReplacePiece(value, -1, null);
    }
    static matchIndex(index) {
        return new ReplacePiece(null, index, null);
    }
    static caseOps(index, caseOps) {
        return new ReplacePiece(null, index, caseOps);
    }
    constructor(staticValue, matchIndex, caseOps) {
        this.staticValue = staticValue;
        this.matchIndex = matchIndex;
        if (!caseOps || caseOps.length === 0) {
            this.caseOps = null;
        }
        else {
            this.caseOps = caseOps.slice(0);
        }
    }
}
class ReplacePieceBuilder {
    constructor(source) {
        this._source = source;
        this._lastCharIndex = 0;
        this._result = [];
        this._resultLen = 0;
        this._currentStaticPiece = '';
    }
    emitUnchanged(toCharIndex) {
        this._emitStatic(this._source.substring(this._lastCharIndex, toCharIndex));
        this._lastCharIndex = toCharIndex;
    }
    emitStatic(value, toCharIndex) {
        this._emitStatic(value);
        this._lastCharIndex = toCharIndex;
    }
    _emitStatic(value) {
        if (value.length === 0) {
            return;
        }
        this._currentStaticPiece += value;
    }
    emitMatchIndex(index, toCharIndex, caseOps) {
        if (this._currentStaticPiece.length !== 0) {
            this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
            this._currentStaticPiece = '';
        }
        this._result[this._resultLen++] = ReplacePiece.caseOps(index, caseOps);
        this._lastCharIndex = toCharIndex;
    }
    finalize() {
        this.emitUnchanged(this._source.length);
        if (this._currentStaticPiece.length !== 0) {
            this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
            this._currentStaticPiece = '';
        }
        return new ReplacePattern(this._result);
    }
}
/**
 * \n			=> inserts a LF
 * \t			=> inserts a TAB
 * \\			=> inserts a "\".
 * \u			=> upper-cases one character in a match.
 * \U			=> upper-cases ALL remaining characters in a match.
 * \l			=> lower-cases one character in a match.
 * \L			=> lower-cases ALL remaining characters in a match.
 * $$			=> inserts a "$".
 * $& and $0	=> inserts the matched substring.
 * $n			=> Where n is a non-negative integer lesser than 100, inserts the nth parenthesized submatch string
 * everything else stays untouched
 *
 * Also see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
 */
export function parseReplaceString(replaceString) {
    if (!replaceString || replaceString.length === 0) {
        return new ReplacePattern(null);
    }
    const caseOps = [];
    const result = new ReplacePieceBuilder(replaceString);
    for (let i = 0, len = replaceString.length; i < len; i++) {
        const chCode = replaceString.charCodeAt(i);
        if (chCode === 92 /* CharCode.Backslash */) {
            // move to next char
            i++;
            if (i >= len) {
                // string ends with a \
                break;
            }
            const nextChCode = replaceString.charCodeAt(i);
            // let replaceWithCharacter: string | null = null;
            switch (nextChCode) {
                case 92 /* CharCode.Backslash */:
                    // \\ => inserts a "\"
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\\', i + 1);
                    break;
                case 110 /* CharCode.n */:
                    // \n => inserts a LF
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\n', i + 1);
                    break;
                case 116 /* CharCode.t */:
                    // \t => inserts a TAB
                    result.emitUnchanged(i - 1);
                    result.emitStatic('\t', i + 1);
                    break;
                // Case modification of string replacements, patterned after Boost, but only applied
                // to the replacement text, not subsequent content.
                case 117 /* CharCode.u */:
                // \u => upper-cases one character.
                case 85 /* CharCode.U */:
                // \U => upper-cases ALL following characters.
                case 108 /* CharCode.l */:
                // \l => lower-cases one character.
                case 76 /* CharCode.L */:
                    // \L => lower-cases ALL following characters.
                    result.emitUnchanged(i - 1);
                    result.emitStatic('', i + 1);
                    caseOps.push(String.fromCharCode(nextChCode));
                    break;
            }
            continue;
        }
        if (chCode === 36 /* CharCode.DollarSign */) {
            // move to next char
            i++;
            if (i >= len) {
                // string ends with a $
                break;
            }
            const nextChCode = replaceString.charCodeAt(i);
            if (nextChCode === 36 /* CharCode.DollarSign */) {
                // $$ => inserts a "$"
                result.emitUnchanged(i - 1);
                result.emitStatic('$', i + 1);
                continue;
            }
            if (nextChCode === 48 /* CharCode.Digit0 */ || nextChCode === 38 /* CharCode.Ampersand */) {
                // $& and $0 => inserts the matched substring.
                result.emitUnchanged(i - 1);
                result.emitMatchIndex(0, i + 1, caseOps);
                caseOps.length = 0;
                continue;
            }
            if (49 /* CharCode.Digit1 */ <= nextChCode && nextChCode <= 57 /* CharCode.Digit9 */) {
                // $n
                let matchIndex = nextChCode - 48 /* CharCode.Digit0 */;
                // peek next char to probe for $nn
                if (i + 1 < len) {
                    const nextNextChCode = replaceString.charCodeAt(i + 1);
                    if (48 /* CharCode.Digit0 */ <= nextNextChCode && nextNextChCode <= 57 /* CharCode.Digit9 */) {
                        // $nn
                        // move to next char
                        i++;
                        matchIndex = matchIndex * 10 + (nextNextChCode - 48 /* CharCode.Digit0 */);
                        result.emitUnchanged(i - 2);
                        result.emitMatchIndex(matchIndex, i + 1, caseOps);
                        caseOps.length = 0;
                        continue;
                    }
                }
                result.emitUnchanged(i - 1);
                result.emitMatchIndex(matchIndex, i + 1, caseOps);
                caseOps.length = 0;
                continue;
            }
        }
    }
    return result.finalize();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9yZXBsYWNlUGF0dGVybi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RixJQUFXLGtCQUdWO0FBSEQsV0FBVyxrQkFBa0I7SUFDNUIseUVBQWUsQ0FBQTtJQUNmLDZFQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFIVSxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRzVCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLHlCQUF5QjtJQUU5QixZQUE0QixXQUFtQjtRQUFuQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUQvQixTQUFJLDBDQUFpQztJQUNILENBQUM7Q0FDbkQ7QUFFRDs7R0FFRztBQUNILE1BQU0sMkJBQTJCO0lBRWhDLFlBQTRCLE1BQXNCO1FBQXRCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBRGxDLFNBQUksNENBQW1DO0lBQ0YsQ0FBQztDQUN0RDtBQUVELE1BQU0sT0FBTyxjQUFjO0lBQ25CLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBYTtRQUMxQyxPQUFPLElBQUksY0FBYyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUlELElBQVcsc0JBQXNCO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDZDQUFxQyxDQUFBO0lBQzdELENBQUM7SUFFRCxZQUFZLE1BQTZCO1FBQ3hDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUkseUJB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