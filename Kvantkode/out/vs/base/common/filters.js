/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from './map.js';
import { getKoreanAltChars } from './naturalLanguage/korean.js';
import * as strings from './strings.js';
// Combined filters
/**
 * @returns A filter which combines the provided set
 * of filters with an or. The *first* filters that
 * matches defined the return value of the returned
 * filter.
 */
export function or(...filter) {
    return function (word, wordToMatchAgainst) {
        for (let i = 0, len = filter.length; i < len; i++) {
            const match = filter[i](word, wordToMatchAgainst);
            if (match) {
                return match;
            }
        }
        return null;
    };
}
// Prefix
export const matchesStrictPrefix = _matchesPrefix.bind(undefined, false);
export const matchesPrefix = _matchesPrefix.bind(undefined, true);
function _matchesPrefix(ignoreCase, word, wordToMatchAgainst) {
    if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) {
        return null;
    }
    let matches;
    if (ignoreCase) {
        matches = strings.startsWithIgnoreCase(wordToMatchAgainst, word);
    }
    else {
        matches = wordToMatchAgainst.indexOf(word) === 0;
    }
    if (!matches) {
        return null;
    }
    return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}
// Contiguous Substring
export function matchesContiguousSubString(word, wordToMatchAgainst) {
    const index = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) {
        return null;
    }
    return [{ start: index, end: index + word.length }];
}
// Substring
export function matchesSubString(word, wordToMatchAgainst) {
    return _matchesSubString(word.toLowerCase(), wordToMatchAgainst.toLowerCase(), 0, 0);
}
function _matchesSubString(word, wordToMatchAgainst, i, j) {
    if (i === word.length) {
        return [];
    }
    else if (j === wordToMatchAgainst.length) {
        return null;
    }
    else {
        if (word[i] === wordToMatchAgainst[j]) {
            let result = null;
            if ((result = _matchesSubString(word, wordToMatchAgainst, i + 1, j + 1))) {
                return join({ start: j, end: j + 1 }, result);
            }
            return null;
        }
        return _matchesSubString(word, wordToMatchAgainst, i, j + 1);
    }
}
// CamelCase
function isLower(code) {
    return 97 /* CharCode.a */ <= code && code <= 122 /* CharCode.z */;
}
export function isUpper(code) {
    return 65 /* CharCode.A */ <= code && code <= 90 /* CharCode.Z */;
}
function isNumber(code) {
    return 48 /* CharCode.Digit0 */ <= code && code <= 57 /* CharCode.Digit9 */;
}
function isWhitespace(code) {
    return (code === 32 /* CharCode.Space */ ||
        code === 9 /* CharCode.Tab */ ||
        code === 10 /* CharCode.LineFeed */ ||
        code === 13 /* CharCode.CarriageReturn */);
}
const wordSeparators = new Set();
// These are chosen as natural word separators based on writen text.
// It is a subset of the word separators used by the monaco editor.
'()[]{}<>`\'"-/;:,.?!'.split('').forEach((s) => wordSeparators.add(s.charCodeAt(0)));
function isWordSeparator(code) {
    return isWhitespace(code) || wordSeparators.has(code);
}
function charactersMatch(codeA, codeB) {
    return codeA === codeB || (isWordSeparator(codeA) && isWordSeparator(codeB));
}
const alternateCharsCache = new Map();
/**
 * Gets alternative codes to the character code passed in. This comes in the
 * form of an array of character codes, all of which must match _in order_ to
 * successfully match.
 *
 * @param code The character code to check.
 */
function getAlternateCodes(code) {
    if (alternateCharsCache.has(code)) {
        return alternateCharsCache.get(code);
    }
    // NOTE: This function is written in such a way that it can be extended in
    // the future, but right now the return type takes into account it's only
    // supported by a single "alt codes provider".
    // `ArrayLike<ArrayLike<number>>` is a more appropriate type if changed.
    let result;
    const codes = getKoreanAltChars(code);
    if (codes) {
        result = codes;
    }
    alternateCharsCache.set(code, result);
    return result;
}
function isAlphanumeric(code) {
    return isLower(code) || isUpper(code) || isNumber(code);
}
function join(head, tail) {
    if (tail.length === 0) {
        tail = [head];
    }
    else if (head.end === tail[0].start) {
        tail[0].start = head.start;
    }
    else {
        tail.unshift(head);
    }
    return tail;
}
function nextAnchor(camelCaseWord, start) {
    for (let i = start; i < camelCaseWord.length; i++) {
        const c = camelCaseWord.charCodeAt(i);
        if (isUpper(c) || isNumber(c) || (i > 0 && !isAlphanumeric(camelCaseWord.charCodeAt(i - 1)))) {
            return i;
        }
    }
    return camelCaseWord.length;
}
function _matchesCamelCase(word, camelCaseWord, i, j) {
    if (i === word.length) {
        return [];
    }
    else if (j === camelCaseWord.length) {
        return null;
    }
    else if (word[i] !== camelCaseWord[j].toLowerCase()) {
        return null;
    }
    else {
        let result = null;
        let nextUpperIndex = j + 1;
        result = _matchesCamelCase(word, camelCaseWord, i + 1, j + 1);
        while (!result &&
            (nextUpperIndex = nextAnchor(camelCaseWord, nextUpperIndex)) < camelCaseWord.length) {
            result = _matchesCamelCase(word, camelCaseWord, i + 1, nextUpperIndex);
            nextUpperIndex++;
        }
        return result === null ? null : join({ start: j, end: j + 1 }, result);
    }
}
// Heuristic to avoid computing camel case matcher for words that don't
// look like camelCaseWords.
function analyzeCamelCaseWord(word) {
    let upper = 0, lower = 0, alpha = 0, numeric = 0, code = 0;
    for (let i = 0; i < word.length; i++) {
        code = word.charCodeAt(i);
        if (isUpper(code)) {
            upper++;
        }
        if (isLower(code)) {
            lower++;
        }
        if (isAlphanumeric(code)) {
            alpha++;
        }
        if (isNumber(code)) {
            numeric++;
        }
    }
    const upperPercent = upper / word.length;
    const lowerPercent = lower / word.length;
    const alphaPercent = alpha / word.length;
    const numericPercent = numeric / word.length;
    return { upperPercent, lowerPercent, alphaPercent, numericPercent };
}
function isUpperCaseWord(analysis) {
    const { upperPercent, lowerPercent } = analysis;
    return lowerPercent === 0 && upperPercent > 0.6;
}
function isCamelCaseWord(analysis) {
    const { upperPercent, lowerPercent, alphaPercent, numericPercent } = analysis;
    return lowerPercent > 0.2 && upperPercent < 0.8 && alphaPercent > 0.6 && numericPercent < 0.2;
}
// Heuristic to avoid computing camel case matcher for words that don't
// look like camel case patterns.
function isCamelCasePattern(word) {
    let upper = 0, lower = 0, code = 0, whitespace = 0;
    for (let i = 0; i < word.length; i++) {
        code = word.charCodeAt(i);
        if (isUpper(code)) {
            upper++;
        }
        if (isLower(code)) {
            lower++;
        }
        if (isWhitespace(code)) {
            whitespace++;
        }
    }
    if ((upper === 0 || lower === 0) && whitespace === 0) {
        return word.length <= 30;
    }
    else {
        return upper <= 5;
    }
}
export function matchesCamelCase(word, camelCaseWord) {
    if (!camelCaseWord) {
        return null;
    }
    camelCaseWord = camelCaseWord.trim();
    if (camelCaseWord.length === 0) {
        return null;
    }
    if (!isCamelCasePattern(word)) {
        return null;
    }
    // TODO: Consider removing this check
    if (camelCaseWord.length > 60) {
        camelCaseWord = camelCaseWord.substring(0, 60);
    }
    const analysis = analyzeCamelCaseWord(camelCaseWord);
    if (!isCamelCaseWord(analysis)) {
        if (!isUpperCaseWord(analysis)) {
            return null;
        }
        camelCaseWord = camelCaseWord.toLowerCase();
    }
    let result = null;
    let i = 0;
    word = word.toLowerCase();
    while (i < camelCaseWord.length &&
        (result = _matchesCamelCase(word, camelCaseWord, 0, i)) === null) {
        i = nextAnchor(camelCaseWord, i + 1);
    }
    return result;
}
// Matches beginning of words supporting non-ASCII languages
// If `contiguous` is true then matches word with beginnings of the words in the target. E.g. "pul" will match "Git: Pull"
// Otherwise also matches sub string of the word with beginnings of the words in the target. E.g. "gp" or "g p" will match "Git: Pull"
// Useful in cases where the target is words (e.g. command labels)
export function matchesWords(word, target, contiguous = false) {
    if (!target || target.length === 0) {
        return null;
    }
    let result = null;
    let targetIndex = 0;
    word = word.toLowerCase();
    target = target.toLowerCase();
    while (targetIndex < target.length) {
        result = _matchesWords(word, target, 0, targetIndex, contiguous);
        if (result !== null) {
            break;
        }
        targetIndex = nextWord(target, targetIndex + 1);
    }
    return result;
}
function _matchesWords(word, target, wordIndex, targetIndex, contiguous) {
    let targetIndexOffset = 0;
    if (wordIndex === word.length) {
        return [];
    }
    else if (targetIndex === target.length) {
        return null;
    }
    else if (!charactersMatch(word.charCodeAt(wordIndex), target.charCodeAt(targetIndex))) {
        // Verify alternate characters before exiting
        const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
        if (!altChars) {
            return null;
        }
        for (let k = 0; k < altChars.length; k++) {
            if (!charactersMatch(altChars[k], target.charCodeAt(targetIndex + k))) {
                return null;
            }
        }
        targetIndexOffset += altChars.length - 1;
    }
    let result = null;
    let nextWordIndex = targetIndex + targetIndexOffset + 1;
    result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
    if (!contiguous) {
        while (!result && (nextWordIndex = nextWord(target, nextWordIndex)) < target.length) {
            result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
            nextWordIndex++;
        }
    }
    if (!result) {
        return null;
    }
    // If the characters don't exactly match, then they must be word separators (see charactersMatch(...)).
    // We don't want to include this in the matches but we don't want to throw the target out all together so we return `result`.
    if (word.charCodeAt(wordIndex) !== target.charCodeAt(targetIndex)) {
        // Verify alternate characters before exiting
        const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
        if (!altChars) {
            return result;
        }
        for (let k = 0; k < altChars.length; k++) {
            if (altChars[k] !== target.charCodeAt(targetIndex + k)) {
                return result;
            }
        }
    }
    return join({ start: targetIndex, end: targetIndex + targetIndexOffset + 1 }, result);
}
function nextWord(word, start) {
    for (let i = start; i < word.length; i++) {
        if (isWordSeparator(word.charCodeAt(i)) || (i > 0 && isWordSeparator(word.charCodeAt(i - 1)))) {
            return i;
        }
    }
    return word.length;
}
// Fuzzy
const fuzzyContiguousFilter = or(matchesPrefix, matchesCamelCase, matchesContiguousSubString);
const fuzzySeparateFilter = or(matchesPrefix, matchesCamelCase, matchesSubString);
const fuzzyRegExpCache = new LRUCache(10000); // bounded to 10000 elements
export function matchesFuzzy(word, wordToMatchAgainst, enableSeparateSubstringMatching = false) {
    if (typeof word !== 'string' || typeof wordToMatchAgainst !== 'string') {
        return null; // return early for invalid input
    }
    // Form RegExp for wildcard matches
    let regexp = fuzzyRegExpCache.get(word);
    if (!regexp) {
        regexp = new RegExp(strings.convertSimple2RegExpPattern(word), 'i');
        fuzzyRegExpCache.set(word, regexp);
    }
    // RegExp Filter
    const match = regexp.exec(wordToMatchAgainst);
    if (match) {
        return [{ start: match.index, end: match.index + match[0].length }];
    }
    // Default Filter
    return enableSeparateSubstringMatching
        ? fuzzySeparateFilter(word, wordToMatchAgainst)
        : fuzzyContiguousFilter(word, wordToMatchAgainst);
}
/**
 * Match pattern against word in a fuzzy way. As in IntelliSense and faster and more
 * powerful than `matchesFuzzy`
 */
export function matchesFuzzy2(pattern, word) {
    const score = fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0, {
        firstMatchCanBeWeak: true,
        boostFullMatch: true,
    });
    return score ? createMatches(score) : null;
}
export function anyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos) {
    const max = Math.min(13, pattern.length);
    for (; patternPos < max; patternPos++) {
        const result = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, {
            firstMatchCanBeWeak: true,
            boostFullMatch: true,
        });
        if (result) {
            return result;
        }
    }
    return [0, wordPos];
}
//#region --- fuzzyScore ---
export function createMatches(score) {
    if (typeof score === 'undefined') {
        return [];
    }
    const res = [];
    const wordPos = score[1];
    for (let i = score.length - 1; i > 1; i--) {
        const pos = score[i] + wordPos;
        const last = res[res.length - 1];
        if (last && last.end === pos) {
            last.end = pos + 1;
        }
        else {
            res.push({ start: pos, end: pos + 1 });
        }
    }
    return res;
}
const _maxLen = 128;
function initTable() {
    const table = [];
    const row = [];
    for (let i = 0; i <= _maxLen; i++) {
        row[i] = 0;
    }
    for (let i = 0; i <= _maxLen; i++) {
        table.push(row.slice(0));
    }
    return table;
}
function initArr(maxLen) {
    const row = [];
    for (let i = 0; i <= maxLen; i++) {
        row[i] = 0;
    }
    return row;
}
const _minWordMatchPos = initArr(2 * _maxLen); // min word position for a certain pattern position
const _maxWordMatchPos = initArr(2 * _maxLen); // max word position for a certain pattern position
const _diag = initTable(); // the length of a contiguous diagonal match
const _table = initTable();
const _arrows = initTable();
const _debug = false;
function printTable(table, pattern, patternLen, word, wordLen) {
    function pad(s, n, pad = ' ') {
        while (s.length < n) {
            s = pad + s;
        }
        return s;
    }
    let ret = ` |   |${word
        .split('')
        .map((c) => pad(c, 3))
        .join('|')}\n`;
    for (let i = 0; i <= patternLen; i++) {
        if (i === 0) {
            ret += ' |';
        }
        else {
            ret += `${pattern[i - 1]}|`;
        }
        ret +=
            table[i]
                .slice(0, wordLen + 1)
                .map((n) => pad(n.toString(), 3))
                .join('|') + '\n';
    }
    return ret;
}
function printTables(pattern, patternStart, word, wordStart) {
    pattern = pattern.substr(patternStart);
    word = word.substr(wordStart);
    console.log(printTable(_table, pattern, pattern.length, word, word.length));
    console.log(printTable(_arrows, pattern, pattern.length, word, word.length));
    console.log(printTable(_diag, pattern, pattern.length, word, word.length));
}
function isSeparatorAtPos(value, index) {
    if (index < 0 || index >= value.length) {
        return false;
    }
    const code = value.codePointAt(index);
    switch (code) {
        case 95 /* CharCode.Underline */:
        case 45 /* CharCode.Dash */:
        case 46 /* CharCode.Period */:
        case 32 /* CharCode.Space */:
        case 47 /* CharCode.Slash */:
        case 92 /* CharCode.Backslash */:
        case 39 /* CharCode.SingleQuote */:
        case 34 /* CharCode.DoubleQuote */:
        case 58 /* CharCode.Colon */:
        case 36 /* CharCode.DollarSign */:
        case 60 /* CharCode.LessThan */:
        case 62 /* CharCode.GreaterThan */:
        case 40 /* CharCode.OpenParen */:
        case 41 /* CharCode.CloseParen */:
        case 91 /* CharCode.OpenSquareBracket */:
        case 93 /* CharCode.CloseSquareBracket */:
        case 123 /* CharCode.OpenCurlyBrace */:
        case 125 /* CharCode.CloseCurlyBrace */:
            return true;
        case undefined:
            return false;
        default:
            if (strings.isEmojiImprecise(code)) {
                return true;
            }
            return false;
    }
}
function isWhitespaceAtPos(value, index) {
    if (index < 0 || index >= value.length) {
        return false;
    }
    const code = value.charCodeAt(index);
    switch (code) {
        case 32 /* CharCode.Space */:
        case 9 /* CharCode.Tab */:
            return true;
        default:
            return false;
    }
}
function isUpperCaseAtPos(pos, word, wordLow) {
    return word[pos] !== wordLow[pos];
}
export function isPatternInWord(patternLow, patternPos, patternLen, wordLow, wordPos, wordLen, fillMinWordPosArr = false) {
    while (patternPos < patternLen && wordPos < wordLen) {
        if (patternLow[patternPos] === wordLow[wordPos]) {
            if (fillMinWordPosArr) {
                // Remember the min word position for each pattern position
                _minWordMatchPos[patternPos] = wordPos;
            }
            patternPos += 1;
        }
        wordPos += 1;
    }
    return patternPos === patternLen; // pattern must be exhausted
}
var Arrow;
(function (Arrow) {
    Arrow[Arrow["Diag"] = 1] = "Diag";
    Arrow[Arrow["Left"] = 2] = "Left";
    Arrow[Arrow["LeftLeft"] = 3] = "LeftLeft";
})(Arrow || (Arrow = {}));
export var FuzzyScore;
(function (FuzzyScore) {
    /**
     * No matches and value `-100`
     */
    FuzzyScore.Default = [-100, 0];
    function isDefault(score) {
        return !score || (score.length === 2 && score[0] === -100 && score[1] === 0);
    }
    FuzzyScore.isDefault = isDefault;
})(FuzzyScore || (FuzzyScore = {}));
export class FuzzyScoreOptions {
    static { this.default = { boostFullMatch: true, firstMatchCanBeWeak: false }; }
    constructor(firstMatchCanBeWeak, boostFullMatch) {
        this.firstMatchCanBeWeak = firstMatchCanBeWeak;
        this.boostFullMatch = boostFullMatch;
    }
}
export function fuzzyScore(pattern, patternLow, patternStart, word, wordLow, wordStart, options = FuzzyScoreOptions.default) {
    const patternLen = pattern.length > _maxLen ? _maxLen : pattern.length;
    const wordLen = word.length > _maxLen ? _maxLen : word.length;
    if (patternStart >= patternLen ||
        wordStart >= wordLen ||
        patternLen - patternStart > wordLen - wordStart) {
        return undefined;
    }
    // Run a simple check if the characters of pattern occur
    // (in order) at all in word. If that isn't the case we
    // stop because no match will be possible
    if (!isPatternInWord(patternLow, patternStart, patternLen, wordLow, wordStart, wordLen, true)) {
        return undefined;
    }
    // Find the max matching word position for each pattern position
    // NOTE: the min matching word position was filled in above, in the `isPatternInWord` call
    _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow);
    let row = 1;
    let column = 1;
    let patternPos = patternStart;
    let wordPos = wordStart;
    const hasStrongFirstMatch = [false];
    // There will be a match, fill in tables
    for (row = 1, patternPos = patternStart; patternPos < patternLen; row++, patternPos++) {
        // Reduce search space to possible matching word positions and to possible access from next row
        const minWordMatchPos = _minWordMatchPos[patternPos];
        const maxWordMatchPos = _maxWordMatchPos[patternPos];
        const nextMaxWordMatchPos = patternPos + 1 < patternLen ? _maxWordMatchPos[patternPos + 1] : wordLen;
        for (column = minWordMatchPos - wordStart + 1, wordPos = minWordMatchPos; wordPos < nextMaxWordMatchPos; column++, wordPos++) {
            let score = Number.MIN_SAFE_INTEGER;
            let canComeDiag = false;
            if (wordPos <= maxWordMatchPos) {
                score = _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, _diag[row - 1][column - 1] === 0, hasStrongFirstMatch);
            }
            let diagScore = 0;
            if (score !== Number.MIN_SAFE_INTEGER) {
                canComeDiag = true;
                diagScore = score + _table[row - 1][column - 1];
            }
            const canComeLeft = wordPos > minWordMatchPos;
            const leftScore = canComeLeft
                ? _table[row][column - 1] + (_diag[row][column - 1] > 0 ? -5 : 0)
                : 0; // penalty for a gap start
            const canComeLeftLeft = wordPos > minWordMatchPos + 1 && _diag[row][column - 1] > 0;
            const leftLeftScore = canComeLeftLeft
                ? _table[row][column - 2] + (_diag[row][column - 2] > 0 ? -5 : 0)
                : 0; // penalty for a gap start
            if (canComeLeftLeft &&
                (!canComeLeft || leftLeftScore >= leftScore) &&
                (!canComeDiag || leftLeftScore >= diagScore)) {
                // always prefer choosing left left to jump over a diagonal because that means a match is earlier in the word
                _table[row][column] = leftLeftScore;
                _arrows[row][column] = 3 /* Arrow.LeftLeft */;
                _diag[row][column] = 0;
            }
            else if (canComeLeft && (!canComeDiag || leftScore >= diagScore)) {
                // always prefer choosing left since that means a match is earlier in the word
                _table[row][column] = leftScore;
                _arrows[row][column] = 2 /* Arrow.Left */;
                _diag[row][column] = 0;
            }
            else if (canComeDiag) {
                _table[row][column] = diagScore;
                _arrows[row][column] = 1 /* Arrow.Diag */;
                _diag[row][column] = _diag[row - 1][column - 1] + 1;
            }
            else {
                throw new Error(`not possible`);
            }
        }
    }
    if (_debug) {
        printTables(pattern, patternStart, word, wordStart);
    }
    if (!hasStrongFirstMatch[0] && !options.firstMatchCanBeWeak) {
        return undefined;
    }
    row--;
    column--;
    const result = [_table[row][column], wordStart];
    let backwardsDiagLength = 0;
    let maxMatchColumn = 0;
    while (row >= 1) {
        // Find the column where we go diagonally up
        let diagColumn = column;
        do {
            const arrow = _arrows[row][diagColumn];
            if (arrow === 3 /* Arrow.LeftLeft */) {
                diagColumn = diagColumn - 2;
            }
            else if (arrow === 2 /* Arrow.Left */) {
                diagColumn = diagColumn - 1;
            }
            else {
                // found the diagonal
                break;
            }
        } while (diagColumn >= 1);
        // Overturn the "forwards" decision if keeping the "backwards" diagonal would give a better match
        if (backwardsDiagLength > 1 && // only if we would have a contiguous match of 3 characters
            patternLow[patternStart + row - 1] === wordLow[wordStart + column - 1] && // only if we can do a contiguous match diagonally
            !isUpperCaseAtPos(diagColumn + wordStart - 1, word, wordLow) && // only if the forwards chose diagonal is not an uppercase
            backwardsDiagLength + 1 > _diag[row][diagColumn] // only if our contiguous match would be longer than the "forwards" contiguous match
        ) {
            diagColumn = column;
        }
        if (diagColumn === column) {
            // this is a contiguous match
            backwardsDiagLength++;
        }
        else {
            backwardsDiagLength = 1;
        }
        if (!maxMatchColumn) {
            // remember the last matched column
            maxMatchColumn = diagColumn;
        }
        row--;
        column = diagColumn - 1;
        result.push(column);
    }
    if (wordLen - wordStart === patternLen && options.boostFullMatch) {
        // the word matches the pattern with all characters!
        // giving the score a total match boost (to come up ahead other words)
        result[0] += 2;
    }
    // Add 1 penalty for each skipped character in the word
    const skippedCharsCount = maxMatchColumn - patternLen;
    result[0] -= skippedCharsCount;
    return result;
}
function _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow) {
    let patternPos = patternLen - 1;
    let wordPos = wordLen - 1;
    while (patternPos >= patternStart && wordPos >= wordStart) {
        if (patternLow[patternPos] === wordLow[wordPos]) {
            _maxWordMatchPos[patternPos] = wordPos;
            patternPos--;
        }
        wordPos--;
    }
}
function _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, newMatchStart, outFirstMatchStrong) {
    if (patternLow[patternPos] !== wordLow[wordPos]) {
        return Number.MIN_SAFE_INTEGER;
    }
    let score = 1;
    let isGapLocation = false;
    if (wordPos === patternPos - patternStart) {
        // common prefix: `foobar <-> foobaz`
        //                            ^^^^^
        score = pattern[patternPos] === word[wordPos] ? 7 : 5;
    }
    else if (isUpperCaseAtPos(wordPos, word, wordLow) &&
        (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))) {
        // hitting upper-case: `foo <-> forOthers`
        //                              ^^ ^
        score = pattern[patternPos] === word[wordPos] ? 7 : 5;
        isGapLocation = true;
    }
    else if (isSeparatorAtPos(wordLow, wordPos) &&
        (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))) {
        // hitting a separator: `. <-> foo.bar`
        //                                ^
        score = 5;
    }
    else if (isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1)) {
        // post separator: `foo <-> bar_foo`
        //                              ^^^
        score = 5;
        isGapLocation = true;
    }
    if (score > 1 && patternPos === patternStart) {
        outFirstMatchStrong[0] = true;
    }
    if (!isGapLocation) {
        isGapLocation =
            isUpperCaseAtPos(wordPos, word, wordLow) ||
                isSeparatorAtPos(wordLow, wordPos - 1) ||
                isWhitespaceAtPos(wordLow, wordPos - 1);
    }
    //
    if (patternPos === patternStart) {
        // first character in pattern
        if (wordPos > wordStart) {
            // the first pattern character would match a word character that is not at the word start
            // so introduce a penalty to account for the gap preceding this match
            score -= isGapLocation ? 3 : 5;
        }
    }
    else {
        if (newMatchStart) {
            // this would be the beginning of a new match (i.e. there would be a gap before this location)
            score += isGapLocation ? 2 : 0;
        }
        else {
            // this is part of a contiguous match, so give it a slight bonus, but do so only if it would not be a preferred gap location
            score += isGapLocation ? 0 : 1;
        }
    }
    if (wordPos + 1 === wordLen) {
        // we always penalize gaps, but this gives unfair advantages to a match that would match the last character in the word
        // so pretend there is a gap after the last character in the word to normalize things
        score -= isGapLocation ? 3 : 5;
    }
    return score;
}
//#endregion
//#region --- graceful ---
export function fuzzyScoreGracefulAggressive(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
    return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, true, options);
}
export function fuzzyScoreGraceful(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
    return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, false, options);
}
function fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, aggressive, options) {
    let top = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, options);
    if (top && !aggressive) {
        // when using the original pattern yield a result we`
        // return it unless we are aggressive and try to find
        // a better alignment, e.g. `cno` -> `^co^ns^ole` or `^c^o^nsole`.
        return top;
    }
    if (pattern.length >= 3) {
        // When the pattern is long enough then try a few (max 7)
        // permutations of the pattern to find a better match. The
        // permutations only swap neighbouring characters, e.g
        // `cnoso` becomes `conso`, `cnsoo`, `cnoos`.
        const tries = Math.min(7, pattern.length - 1);
        for (let movingPatternPos = patternPos + 1; movingPatternPos < tries; movingPatternPos++) {
            const newPattern = nextTypoPermutation(pattern, movingPatternPos);
            if (newPattern) {
                const candidate = fuzzyScore(newPattern, newPattern.toLowerCase(), patternPos, word, lowWord, wordPos, options);
                if (candidate) {
                    candidate[0] -= 3; // permutation penalty
                    if (!top || candidate[0] > top[0]) {
                        top = candidate;
                    }
                }
            }
        }
    }
    return top;
}
function nextTypoPermutation(pattern, patternPos) {
    if (patternPos + 1 >= pattern.length) {
        return undefined;
    }
    const swap1 = pattern[patternPos];
    const swap2 = pattern[patternPos + 1];
    if (swap1 === swap2) {
        return undefined;
    }
    return pattern.slice(0, patternPos) + swap2 + swap1 + pattern.slice(patternPos + 2);
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZmlsdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQy9ELE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBWXZDLG1CQUFtQjtBQUVuQjs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxFQUFFLENBQUMsR0FBRyxNQUFpQjtJQUN0QyxPQUFPLFVBQVUsSUFBWSxFQUFFLGtCQUEwQjtRQUN4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1lBQ2pELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVM7QUFFVCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBWSxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNqRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQVksY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFFMUUsU0FBUyxjQUFjLENBQ3RCLFVBQW1CLEVBQ25CLElBQVksRUFDWixrQkFBMEI7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