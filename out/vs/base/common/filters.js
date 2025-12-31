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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2ZpbHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMvRCxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQTtBQVl2QyxtQkFBbUI7QUFFbkI7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsRUFBRSxDQUFDLEdBQUcsTUFBaUI7SUFDdEMsT0FBTyxVQUFVLElBQVksRUFBRSxrQkFBMEI7UUFDeEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtZQUNqRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTO0FBRVQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQVksY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDakYsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFZLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBRTFFLFNBQVMsY0FBYyxDQUN0QixVQUFtQixFQUNuQixJQUFZLEVBQ1osa0JBQTBCO0lBRTFC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