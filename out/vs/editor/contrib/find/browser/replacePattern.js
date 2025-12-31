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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvcmVwbGFjZVBhdHRlcm4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkYsSUFBVyxrQkFHVjtBQUhELFdBQVcsa0JBQWtCO0lBQzVCLHlFQUFlLENBQUE7SUFDZiw2RUFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSFUsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUc1QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSx5QkFBeUI7SUFFOUIsWUFBNEIsV0FBbUI7UUFBbkIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFEL0IsU0FBSSwwQ0FBaUM7SUFDSCxDQUFDO0NBQ25EO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLDJCQUEyQjtJQUVoQyxZQUE0QixNQUFzQjtRQUF0QixXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQURsQyxTQUFJLDRDQUFtQztJQUNGLENBQUM7Q0FDdEQ7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUNuQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQWE7UUFDMUMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFJRCxJQUFXLHNCQUFzQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSw2Q0FBcUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsWUFBWSxNQUE2QjtRQUN4QyxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLHlCQUF5QixD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