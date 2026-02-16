/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { buildReplaceStringWithCasePreserved } from '../../../../base/common/search.js';
export class ReplacePattern {
    constructor(replaceString, arg2, arg3) {
        this._hasParameters = false;
        this._replacePattern = replaceString;
        let searchPatternInfo;
        let parseParameters;
        if (typeof arg2 === 'boolean') {
            parseParameters = arg2;
            this._regExp = arg3;
        }
        else {
            searchPatternInfo = arg2;
            parseParameters = !!searchPatternInfo.isRegExp;
            this._regExp = strings.createRegExp(searchPatternInfo.pattern, !!searchPatternInfo.isRegExp, {
                matchCase: searchPatternInfo.isCaseSensitive,
                wholeWord: searchPatternInfo.isWordMatch,
                multiline: searchPatternInfo.isMultiline,
                global: false,
                unicode: true,
            });
        }
        if (parseParameters) {
            this.parseReplaceString(replaceString);
        }
        if (this._regExp.global) {
            this._regExp = strings.createRegExp(this._regExp.source, true, {
                matchCase: !this._regExp.ignoreCase,
                wholeWord: false,
                multiline: this._regExp.multiline,
                global: false,
            });
        }
        this._caseOpsRegExp = new RegExp(/([\s\S]*?)((?:\\[uUlL])+?|)(\$[0-9]+)([\s\S]*?)/g);
    }
    get hasParameters() {
        return this._hasParameters;
    }
    get pattern() {
        return this._replacePattern;
    }
    get regExp() {
        return this._regExp;
    }
    /**
     * Returns the replace string for the first match in the given text.
     * If text has no matches then returns null.
     */
    getReplaceString(text, preserveCase) {
        this._regExp.lastIndex = 0;
        const match = this._regExp.exec(text);
        if (match) {
            if (this.hasParameters) {
                const replaceString = this.replaceWithCaseOperations(text, this._regExp, this.buildReplaceString(match, preserveCase));
                if (match[0] === text) {
                    return replaceString;
                }
                return replaceString.substr(match.index, match[0].length - (text.length - replaceString.length));
            }
            return this.buildReplaceString(match, preserveCase);
        }
        return null;
    }
    /**
     * replaceWithCaseOperations applies case operations to relevant replacement strings and applies
     * the affected $N arguments. It then passes unaffected $N arguments through to string.replace().
     *
     * \u			=> upper-cases one character in a match.
     * \U			=> upper-cases ALL remaining characters in a match.
     * \l			=> lower-cases one character in a match.
     * \L			=> lower-cases ALL remaining characters in a match.
     */
    replaceWithCaseOperations(text, regex, replaceString) {
        // Short-circuit the common path.
        if (!/\\[uUlL]/.test(replaceString)) {
            return text.replace(regex, replaceString);
        }
        // Store the values of the search parameters.
        const firstMatch = regex.exec(text);
        if (firstMatch === null) {
            return text.replace(regex, replaceString);
        }
        let patMatch;
        let newReplaceString = '';
        let lastIndex = 0;
        let lastMatch = '';
        // For each annotated $N, perform text processing on the parameters and perform the substitution.
        while ((patMatch = this._caseOpsRegExp.exec(replaceString)) !== null) {
            lastIndex = patMatch.index;
            const fullMatch = patMatch[0];
            lastMatch = fullMatch;
            let caseOps = patMatch[2]; // \u, \l\u, etc.
            const money = patMatch[3]; // $1, $2, etc.
            if (!caseOps) {
                newReplaceString += fullMatch;
                continue;
            }
            const replacement = firstMatch[parseInt(money.slice(1))];
            if (!replacement) {
                newReplaceString += fullMatch;
                continue;
            }
            const replacementLen = replacement.length;
            newReplaceString += patMatch[1]; // prefix
            caseOps = caseOps.replace(/\\/g, '');
            let i = 0;
            for (; i < caseOps.length; i++) {
                switch (caseOps[i]) {
                    case 'U':
                        newReplaceString += replacement.slice(i).toUpperCase();
                        i = replacementLen;
                        break;
                    case 'u':
                        newReplaceString += replacement[i].toUpperCase();
                        break;
                    case 'L':
                        newReplaceString += replacement.slice(i).toLowerCase();
                        i = replacementLen;
                        break;
                    case 'l':
                        newReplaceString += replacement[i].toLowerCase();
                        break;
                }
            }
            // Append any remaining replacement string content not covered by case operations.
            if (i < replacementLen) {
                newReplaceString += replacement.slice(i);
            }
            newReplaceString += patMatch[4]; // suffix
        }
        // Append any remaining trailing content after the final regex match.
        newReplaceString += replaceString.slice(lastIndex + lastMatch.length);
        return text.replace(regex, newReplaceString);
    }
    buildReplaceString(matches, preserveCase) {
        if (preserveCase) {
            return buildReplaceStringWithCasePreserved(matches, this._replacePattern);
        }
        else {
            return this._replacePattern;
        }
    }
    /**
     * \n => LF
     * \t => TAB
     * \\ => \
     * $0 => $& (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter)
     * everything else stays untouched
     */
    parseReplaceString(replaceString) {
        if (!replaceString || replaceString.length === 0) {
            return;
        }
        let substrFrom = 0, result = '';
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
                let replaceWithCharacter = null;
                switch (nextChCode) {
                    case 92 /* CharCode.Backslash */:
                        // \\ => \
                        replaceWithCharacter = '\\';
                        break;
                    case 110 /* CharCode.n */:
                        // \n => LF
                        replaceWithCharacter = '\n';
                        break;
                    case 116 /* CharCode.t */:
                        // \t => TAB
                        replaceWithCharacter = '\t';
                        break;
                }
                if (replaceWithCharacter) {
                    result += replaceString.substring(substrFrom, i - 1) + replaceWithCharacter;
                    substrFrom = i + 1;
                }
            }
            if (chCode === 36 /* CharCode.DollarSign */) {
                // move to next char
                i++;
                if (i >= len) {
                    // string ends with a $
                    break;
                }
                const nextChCode = replaceString.charCodeAt(i);
                let replaceWithCharacter = null;
                switch (nextChCode) {
                    case 48 /* CharCode.Digit0 */:
                        // $0 => $&
                        replaceWithCharacter = '$&';
                        this._hasParameters = true;
                        break;
                    case 96 /* CharCode.BackTick */:
                    case 39 /* CharCode.SingleQuote */:
                        this._hasParameters = true;
                        break;
                    default: {
                        // check if it is a valid string parameter $n (0 <= n <= 99). $0 is already handled by now.
                        if (!this.between(nextChCode, 49 /* CharCode.Digit1 */, 57 /* CharCode.Digit9 */)) {
                            break;
                        }
                        if (i === replaceString.length - 1) {
                            this._hasParameters = true;
                            break;
                        }
                        let charCode = replaceString.charCodeAt(++i);
                        if (!this.between(charCode, 48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */)) {
                            this._hasParameters = true;
                            --i;
                            break;
                        }
                        if (i === replaceString.length - 1) {
                            this._hasParameters = true;
                            break;
                        }
                        charCode = replaceString.charCodeAt(++i);
                        if (!this.between(charCode, 48 /* CharCode.Digit0 */, 57 /* CharCode.Digit9 */)) {
                            this._hasParameters = true;
                            --i;
                            break;
                        }
                        break;
                    }
                }
                if (replaceWithCharacter) {
                    result += replaceString.substring(substrFrom, i - 1) + replaceWithCharacter;
                    substrFrom = i + 1;
                }
            }
        }
        if (substrFrom === 0) {
            // no replacement occurred
            return;
        }
        this._replacePattern = result + replaceString.substring(substrFrom);
    }
    between(value, from, to) {
        return from <= value && value <= to;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vcmVwbGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRzdELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZGLE1BQU0sT0FBTyxjQUFjO0lBUTFCLFlBQVksYUFBcUIsRUFBRSxJQUFTLEVBQUUsSUFBVTtRQU5oRCxtQkFBYyxHQUFZLEtBQUssQ0FBQTtRQU90QyxJQUFJLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQTtRQUNwQyxJQUFJLGlCQUErQixDQUFBO1FBQ25DLElBQUksZUFBd0IsQ0FBQTtRQUM1QixJQUFJLE9BQU8sSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDcEIsQ0FBQzthQUFNLENBQUM7WUFDUCxpQkFBaUIsR0FBRyxJQUFJLENBQUE7WUFDeEIsZUFBZSxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUE7WUFDOUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFO2dCQUM1RixTQUFTLEVBQUUsaUJBQWlCLENBQUMsZUFBZTtnQkFDNUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFdBQVc7Z0JBQ3hDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXO2dCQUN4QyxNQUFNLEVBQUUsS0FBSztnQkFDYixPQUFPLEVB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