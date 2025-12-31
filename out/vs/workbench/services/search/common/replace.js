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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3JlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RixNQUFNLE9BQU8sY0FBYztJQVExQixZQUFZLGFBQXFCLEVBQUUsSUFBUyxFQUFFLElBQVU7UUFOaEQsbUJBQWMsR0FBWSxLQUFLLENBQUE7UUFPdEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUE7UUFDcEMsSUFBSSxpQkFBK0IsQ0FBQTtRQUNuQyxJQUFJLGVBQXdCLENBQUE7UUFDNUIsSUFBSSxPQUFPLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMvQixlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUJBQWlCLEdBQUcsSUFBSSxDQUFBO1lBQ3hCLGVBQWUsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFBO1lBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRTtnQkFDNUYsU0FBUyxFQUFFLGlCQUFpQixDQUFDLGVBQWU7Z0JBQzVDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxXQUFXO2dCQUN4QyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsV0FBVztnQkFDeEMsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsT0FBTyxFQUFFLElBQUk7YUFDYixDQUFDLENBQUE7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