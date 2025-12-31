/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import * as stringBuilder from '../../core/stringBuilder.js';
import { Range } from '../../core/range.js';
/**
 * Represents a grouping of colliding bracket pairs.
 *
 * Most of the times this contains a single bracket pair,
 * but sometimes this contains multiple bracket pairs in cases
 * where the same string appears as a closing bracket for multiple
 * bracket pairs, or the same string appears an opening bracket for
 * multiple bracket pairs.
 *
 * e.g. of a group containing a single pair:
 *   open: ['{'], close: ['}']
 *
 * e.g. of a group containing multiple pairs:
 *   open: ['if', 'for'], close: ['end', 'end']
 */
export class RichEditBracket {
    constructor(languageId, index, open, close, forwardRegex, reversedRegex) {
        this._richEditBracketBrand = undefined;
        this.languageId = languageId;
        this.index = index;
        this.open = open;
        this.close = close;
        this.forwardRegex = forwardRegex;
        this.reversedRegex = reversedRegex;
        this._openSet = RichEditBracket._toSet(this.open);
        this._closeSet = RichEditBracket._toSet(this.close);
    }
    /**
     * Check if the provided `text` is an open bracket in this group.
     */
    isOpen(text) {
        return this._openSet.has(text);
    }
    /**
     * Check if the provided `text` is a close bracket in this group.
     */
    isClose(text) {
        return this._closeSet.has(text);
    }
    static _toSet(arr) {
        const result = new Set();
        for (const element of arr) {
            result.add(element);
        }
        return result;
    }
}
/**
 * Groups together brackets that have equal open or close sequences.
 *
 * For example, if the following brackets are defined:
 *   ['IF','END']
 *   ['for','end']
 *   ['{','}']
 *
 * Then the grouped brackets would be:
 *   { open: ['if', 'for'], close: ['end', 'end'] }
 *   { open: ['{'], close: ['}'] }
 *
 */
function groupFuzzyBrackets(brackets) {
    const N = brackets.length;
    brackets = brackets.map((b) => [b[0].toLowerCase(), b[1].toLowerCase()]);
    const group = [];
    for (let i = 0; i < N; i++) {
        group[i] = i;
    }
    const areOverlapping = (a, b) => {
        const [aOpen, aClose] = a;
        const [bOpen, bClose] = b;
        return aOpen === bOpen || aOpen === bClose || aClose === bOpen || aClose === bClose;
    };
    const mergeGroups = (g1, g2) => {
        const newG = Math.min(g1, g2);
        const oldG = Math.max(g1, g2);
        for (let i = 0; i < N; i++) {
            if (group[i] === oldG) {
                group[i] = newG;
            }
        }
    };
    // group together brackets that have the same open or the same close sequence
    for (let i = 0; i < N; i++) {
        const a = brackets[i];
        for (let j = i + 1; j < N; j++) {
            const b = brackets[j];
            if (areOverlapping(a, b)) {
                mergeGroups(group[i], group[j]);
            }
        }
    }
    const result = [];
    for (let g = 0; g < N; g++) {
        const currentOpen = [];
        const currentClose = [];
        for (let i = 0; i < N; i++) {
            if (group[i] === g) {
                const [open, close] = brackets[i];
                currentOpen.push(open);
                currentClose.push(close);
            }
        }
        if (currentOpen.length > 0) {
            result.push({
                open: currentOpen,
                close: currentClose,
            });
        }
    }
    return result;
}
export class RichEditBrackets {
    constructor(languageId, _brackets) {
        this._richEditBracketsBrand = undefined;
        const brackets = groupFuzzyBrackets(_brackets);
        this.brackets = brackets.map((b, index) => {
            return new RichEditBracket(languageId, index, b.open, b.close, getRegexForBracketPair(b.open, b.close, brackets, index), getReversedRegexForBracketPair(b.open, b.close, brackets, index));
        });
        this.forwardRegex = getRegexForBrackets(this.brackets);
        this.reversedRegex = getReversedRegexForBrackets(this.brackets);
        this.textIsBracket = {};
        this.textIsOpenBracket = {};
        this.maxBracketLength = 0;
        for (const bracket of this.brackets) {
            for (const open of bracket.open) {
                this.textIsBracket[open] = bracket;
                this.textIsOpenBracket[open] = true;
                this.maxBracketLength = Math.max(this.maxBracketLength, open.length);
            }
            for (const close of bracket.close) {
                this.textIsBracket[close] = bracket;
                this.textIsOpenBracket[close] = false;
                this.maxBracketLength = Math.max(this.maxBracketLength, close.length);
            }
        }
    }
}
function collectSuperstrings(str, brackets, currentIndex, dest) {
    for (let i = 0, len = brackets.length; i < len; i++) {
        if (i === currentIndex) {
            continue;
        }
        const bracket = brackets[i];
        for (const open of bracket.open) {
            if (open.indexOf(str) >= 0) {
                dest.push(open);
            }
        }
        for (const close of bracket.close) {
            if (close.indexOf(str) >= 0) {
                dest.push(close);
            }
        }
    }
}
function lengthcmp(a, b) {
    return a.length - b.length;
}
function unique(arr) {
    if (arr.length <= 1) {
        return arr;
    }
    const result = [];
    const seen = new Set();
    for (const element of arr) {
        if (seen.has(element)) {
            continue;
        }
        result.push(element);
        seen.add(element);
    }
    return result;
}
/**
 * Create a regular expression that can be used to search forward in a piece of text
 * for a group of bracket pairs. But this regex must be built in a way in which
 * it is aware of the other bracket pairs defined for the language.
 *
 * For example, if a language contains the following bracket pairs:
 *   ['begin', 'end']
 *   ['if', 'end if']
 * The two bracket pairs do not collide because no open or close brackets are equal.
 * So the function getRegexForBracketPair is called twice, once with
 * the ['begin'], ['end'] group consisting of one bracket pair, and once with
 * the ['if'], ['end if'] group consiting of the other bracket pair.
 *
 * But there could be a situation where an occurrence of 'end if' is mistaken
 * for an occurrence of 'end'.
 *
 * Therefore, for the bracket pair ['begin', 'end'], the regex will also
 * target 'end if'. The regex will be something like:
 *   /(\bend if\b)|(\bend\b)|(\bif\b)/
 *
 * The regex also searches for "superstrings" (other brackets that might be mistaken with the current bracket).
 *
 */
function getRegexForBracketPair(open, close, brackets, currentIndex) {
    // search in all brackets for other brackets that are a superstring of these brackets
    let pieces = [];
    pieces = pieces.concat(open);
    pieces = pieces.concat(close);
    for (let i = 0, len = pieces.length; i < len; i++) {
        collectSuperstrings(pieces[i], brackets, currentIndex, pieces);
    }
    pieces = unique(pieces);
    pieces.sort(lengthcmp);
    pieces.reverse();
    return createBracketOrRegExp(pieces);
}
/**
 * Matching a regular expression in JS can only be done "forwards". So JS offers natively only
 * methods to find the first match of a regex in a string. But sometimes, it is useful to
 * find the last match of a regex in a string. For such a situation, a nice solution is to
 * simply reverse the string and then search for a reversed regex.
 *
 * This function also has the fine details of `getRegexForBracketPair`. For the same example
 * given above, the regex produced here would look like:
 *   /(\bfi dne\b)|(\bdne\b)|(\bfi\b)/
 */
function getReversedRegexForBracketPair(open, close, brackets, currentIndex) {
    // search in all brackets for other brackets that are a superstring of these brackets
    let pieces = [];
    pieces = pieces.concat(open);
    pieces = pieces.concat(close);
    for (let i = 0, len = pieces.length; i < len; i++) {
        collectSuperstrings(pieces[i], brackets, currentIndex, pieces);
    }
    pieces = unique(pieces);
    pieces.sort(lengthcmp);
    pieces.reverse();
    return createBracketOrRegExp(pieces.map(toReversedString));
}
/**
 * Creates a regular expression that targets all bracket pairs.
 *
 * e.g. for the bracket pairs:
 *  ['{','}']
 *  ['begin,'end']
 *  ['for','end']
 * the regex would look like:
 *  /(\{)|(\})|(\bbegin\b)|(\bend\b)|(\bfor\b)/
 */
function getRegexForBrackets(brackets) {
    let pieces = [];
    for (const bracket of brackets) {
        for (const open of bracket.open) {
            pieces.push(open);
        }
        for (const close of bracket.close) {
            pieces.push(close);
        }
    }
    pieces = unique(pieces);
    return createBracketOrRegExp(pieces);
}
/**
 * Matching a regular expression in JS can only be done "forwards". So JS offers natively only
 * methods to find the first match of a regex in a string. But sometimes, it is useful to
 * find the last match of a regex in a string. For such a situation, a nice solution is to
 * simply reverse the string and then search for a reversed regex.
 *
 * e.g. for the bracket pairs:
 *  ['{','}']
 *  ['begin,'end']
 *  ['for','end']
 * the regex would look like:
 *  /(\{)|(\})|(\bnigeb\b)|(\bdne\b)|(\brof\b)/
 */
function getReversedRegexForBrackets(brackets) {
    let pieces = [];
    for (const bracket of brackets) {
        for (const open of bracket.open) {
            pieces.push(open);
        }
        for (const close of bracket.close) {
            pieces.push(close);
        }
    }
    pieces = unique(pieces);
    return createBracketOrRegExp(pieces.map(toReversedString));
}
function prepareBracketForRegExp(str) {
    // This bracket pair uses letters like e.g. "begin" - "end"
    const insertWordBoundaries = /^[\w ]+$/.test(str);
    str = strings.escapeRegExpCharacters(str);
    return insertWordBoundaries ? `\\b${str}\\b` : str;
}
export function createBracketOrRegExp(pieces, options) {
    const regexStr = `(${pieces.map(prepareBracketForRegExp).join(')|(')})`;
    return strings.createRegExp(regexStr, true, options);
}
const toReversedString = (function () {
    function reverse(str) {
        // create a Uint16Array and then use a TextDecoder to create a string
        const arr = new Uint16Array(str.length);
        let offset = 0;
        for (let i = str.length - 1; i >= 0; i--) {
            arr[offset++] = str.charCodeAt(i);
        }
        return stringBuilder.getPlatformTextDecoder().decode(arr);
    }
    let lastInput = null;
    let lastOutput = null;
    return function toReversedString(str) {
        if (lastInput !== str) {
            lastInput = str;
            lastOutput = reverse(lastInput);
        }
        return lastOutput;
    };
})();
export class BracketsUtils {
    static _findPrevBracketInText(reversedBracketRegex, lineNumber, reversedText, offset) {
        const m = reversedText.match(reversedBracketRegex);
        if (!m) {
            return null;
        }
        const matchOffset = reversedText.length - (m.index || 0);
        const matchLength = m[0].length;
        const absoluteMatchOffset = offset + matchOffset;
        return new Range(lineNumber, absoluteMatchOffset - matchLength + 1, lineNumber, absoluteMatchOffset + 1);
    }
    static findPrevBracketInRange(reversedBracketRegex, lineNumber, lineText, startOffset, endOffset) {
        // Because JS does not support backwards regex search, we search forwards in a reversed string with a reversed regex ;)
        const reversedLineText = toReversedString(lineText);
        const reversedSubstr = reversedLineText.substring(lineText.length - endOffset, lineText.length - startOffset);
        return this._findPrevBracketInText(reversedBracketRegex, lineNumber, reversedSubstr, startOffset);
    }
    static findNextBracketInText(bracketRegex, lineNumber, text, offset) {
        const m = text.match(bracketRegex);
        if (!m) {
            return null;
        }
        const matchOffset = m.index || 0;
        const matchLength = m[0].length;
        if (matchLength === 0) {
            return null;
        }
        const absoluteMatchOffset = offset + matchOffset;
        return new Range(lineNumber, absoluteMatchOffset + 1, lineNumber, absoluteMatchOffset + 1 + matchLength);
    }
    static findNextBracketInRange(bracketRegex, lineNumber, lineText, startOffset, endOffset) {
        const substr = lineText.substring(startOffset, endOffset);
        return this.findNextBracketInText(bracketRegex, lineNumber, substr, startOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEVkaXRCcmFja2V0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL3JpY2hFZGl0QnJhY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssYUFBYSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQVEzQzs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBaUQzQixZQUNDLFVBQWtCLEVBQ2xCLEtBQWEsRUFDYixJQUFjLEVBQ2QsS0FBZSxFQUNmLFlBQW9CLEVBQ3BCLGFBQXFCO1FBdER0QiwwQkFBcUIsR0FBUyxTQUFTLENBQUE7UUF3RHRDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsSUFBWTtRQUN6QixPQUFPLElBQUksQ0FBQyxRQUFR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