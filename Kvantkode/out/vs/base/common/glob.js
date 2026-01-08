/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from './arrays.js';
import { isThenable } from './async.js';
import { isEqualOrParent } from './extpath.js';
import { LRUCache } from './map.js';
import { basename, extname, posix, sep } from './path.js';
import { isLinux } from './platform.js';
import { escapeRegExpCharacters, ltrim } from './strings.js';
export function getEmptyExpression() {
    return Object.create(null);
}
export const GLOBSTAR = '**';
export const GLOB_SPLIT = '/';
const PATH_REGEX = '[/\\\\]'; // any slash or backslash
const NO_PATH_REGEX = '[^/\\\\]'; // any non-slash and non-backslash
const ALL_FORWARD_SLASHES = /\//g;
function starsToRegExp(starCount, isLastPattern) {
    switch (starCount) {
        case 0:
            return '';
        case 1:
            return `${NO_PATH_REGEX}*?`; // 1 star matches any number of characters except path separator (/ and \) - non greedy (?)
        default:
            // Matches:  (Path Sep OR Path Val followed by Path Sep) 0-many times except when it's the last pattern
            //           in which case also matches (Path Sep followed by Path Val)
            // Group is non capturing because we don't need to capture at all (?:...)
            // Overall we use non-greedy matching because it could be that we match too much
            return `(?:${PATH_REGEX}|${NO_PATH_REGEX}+${PATH_REGEX}${isLastPattern ? `|${PATH_REGEX}${NO_PATH_REGEX}+` : ''})*?`;
    }
}
export function splitGlobAware(pattern, splitChar) {
    if (!pattern) {
        return [];
    }
    const segments = [];
    let inBraces = false;
    let inBrackets = false;
    let curVal = '';
    for (const char of pattern) {
        switch (char) {
            case splitChar:
                if (!inBraces && !inBrackets) {
                    segments.push(curVal);
                    curVal = '';
                    continue;
                }
                break;
            case '{':
                inBraces = true;
                break;
            case '}':
                inBraces = false;
                break;
            case '[':
                inBrackets = true;
                break;
            case ']':
                inBrackets = false;
                break;
        }
        curVal += char;
    }
    // Tail
    if (curVal) {
        segments.push(curVal);
    }
    return segments;
}
function parseRegExp(pattern) {
    if (!pattern) {
        return '';
    }
    let regEx = '';
    // Split up into segments for each slash found
    const segments = splitGlobAware(pattern, GLOB_SPLIT);
    // Special case where we only have globstars
    if (segments.every((segment) => segment === GLOBSTAR)) {
        regEx = '.*';
    }
    // Build regex over segments
    else {
        let previousSegmentWasGlobStar = false;
        segments.forEach((segment, index) => {
            // Treat globstar specially
            if (segment === GLOBSTAR) {
                // if we have more than one globstar after another, just ignore it
                if (previousSegmentWasGlobStar) {
                    return;
                }
                regEx += starsToRegExp(2, index === segments.length - 1);
            }
            // Anything else, not globstar
            else {
                // States
                let inBraces = false;
                let braceVal = '';
                let inBrackets = false;
                let bracketVal = '';
                for (const char of segment) {
                    // Support brace expansion
                    if (char !== '}' && inBraces) {
                        braceVal += char;
                        continue;
                    }
                    // Support brackets
                    if (inBrackets &&
                        (char !== ']' ||
                            !bracketVal) /* ] is literally only allowed as first character in brackets to match it */) {
                        let res;
                        // range operator
                        if (char === '-') {
                            res = char;
                        }
                        // negation operator (only valid on first index in bracket)
                        else if ((char === '^' || char === '!') && !bracketVal) {
                            res = '^';
                        }
                        // glob split matching is not allowed within character ranges
                        // see http://man7.org/linux/man-pages/man7/glob.7.html
                        else if (char === GLOB_SPLIT) {
                            res = '';
                        }
                        // anything else gets escaped
                        else {
                            res = escapeRegExpCharacters(char);
                        }
                        bracketVal += res;
                        continue;
                    }
                    switch (char) {
                        case '{':
                            inBraces = true;
                            continue;
                        case '[':
                            inBrackets = true;
                            continue;
                        case '}': {
                            const choices = splitGlobAware(braceVal, ',');
                            // Converts {foo,bar} => [foo|bar]
                            const braceRegExp = `(?:${choices.map((choice) => parseRegExp(choice)).join('|')})`;
                            regEx += braceRegExp;
                            inBraces = false;
                            braceVal = '';
                            break;
                        }
                        case ']': {
                            regEx += '[' + bracketVal + ']';
                            inBrackets = false;
                            bracketVal = '';
                            break;
                        }
                        case '?':
                            regEx += NO_PATH_REGEX; // 1 ? matches any single character except path separator (/ and \)
                            continue;
                        case '*':
                            regEx += starsToRegExp(1);
                            continue;
                        default:
                            regEx += escapeRegExpCharacters(char);
                    }
                }
                // Tail: Add the slash we had split on if there is more to
                // come and the remaining pattern is not a globstar
                // For example if pattern: some/**/*.js we want the "/" after
                // some to be included in the RegEx to prevent a folder called
                // "something" to match as well.
                if (index < segments.length - 1 && // more segments to come after this
                    (segments[index + 1] !== GLOBSTAR || // next segment is not **, or...
                        index + 2 < segments.length) // ...next segment is ** but there is more segments after that
                ) {
                    regEx += PATH_REGEX;
                }
            }
            // update globstar state
            previousSegmentWasGlobStar = segment === GLOBSTAR;
        });
    }
    return regEx;
}
// regexes to check for trivial glob patterns that just check for String#endsWith
const T1 = /^\*\*\/\*\.[\w\.-]+$/; // **/*.something
const T2 = /^\*\*\/([\w\.-]+)\/?$/; // **/something
const T3 = /^{\*\*\/\*?[\w\.-]+\/?(,\*\*\/\*?[\w\.-]+\/?)*}$/; // {**/*.something,**/*.else} or {**/package.json,**/project.json}
const T3_2 = /^{\*\*\/\*?[\w\.-]+(\/(\*\*)?)?(,\*\*\/\*?[\w\.-]+(\/(\*\*)?)?)*}$/; // Like T3, with optional trailing /**
const T4 = /^\*\*((\/[\w\.-]+)+)\/?$/; // **/something/else
const T5 = /^([\w\.-]+(\/[\w\.-]+)*)\/?$/; // something/else
const CACHE = new LRUCache(10000); // bounded to 10000 elements
const FALSE = function () {
    return false;
};
const NULL = function () {
    return null;
};
function parsePattern(arg1, options) {
    if (!arg1) {
        return NULL;
    }
    // Handle relative patterns
    let pattern;
    if (typeof arg1 !== 'string') {
        pattern = arg1.pattern;
    }
    else {
        pattern = arg1;
    }
    // Whitespace trimming
    pattern = pattern.trim();
    // Check cache
    const patternKey = `${pattern}_${!!options.trimForExclusions}`;
    let parsedPattern = CACHE.get(patternKey);
    if (parsedPattern) {
        return wrapRelativePattern(parsedPattern, arg1);
    }
    // Check for Trivials
    let match;
    if (T1.test(pattern)) {
        parsedPattern = trivia1(pattern.substr(4), pattern); // common pattern: **/*.txt just need endsWith check
    }
    else if ((match = T2.exec(trimForExclusions(pattern, options)))) {
        // common pattern: **/some.txt just need basename check
        parsedPattern = trivia2(match[1], pattern);
    }
    else if ((options.trimForExclusions ? T3_2 : T3).test(pattern)) {
        // repetition of common patterns (see above) {**/*.txt,**/*.png}
        parsedPattern = trivia3(pattern, options);
    }
    else if ((match = T4.exec(trimForExclusions(pattern, options)))) {
        // common pattern: **/something/else just need endsWith check
        parsedPattern = trivia4and5(match[1].substr(1), pattern, true);
    }
    else if ((match = T5.exec(trimForExclusions(pattern, options)))) {
        // common pattern: something/else just need equals check
        parsedPattern = trivia4and5(match[1], pattern, false);
    }
    // Otherwise convert to pattern
    else {
        parsedPattern = toRegExp(pattern);
    }
    // Cache
    CACHE.set(patternKey, parsedPattern);
    return wrapRelativePattern(parsedPattern, arg1);
}
function wrapRelativePattern(parsedPattern, arg2) {
    if (typeof arg2 === 'string') {
        return parsedPattern;
    }
    const wrappedPattern = function (path, basename) {
        if (!isEqualOrParent(path, arg2.base, !isLinux)) {
            // skip glob matching if `base` is not a parent of `path`
            return null;
        }
        // Given we have checked `base` being a parent of `path`,
        // we can now remove the `base` portion of the `path`
        // and only match on the remaining path components
        // For that we try to extract the portion of the `path`
        // that comes after the `base` portion. We have to account
        // for the fact that `base` might end in a path separator
        // (https://github.com/microsoft/vscode/issues/162498)
        return parsedPattern(ltrim(path.substr(arg2.base.length), sep), basename);
    };
    // Make sure to preserve associated metadata
    wrappedPattern.allBasenames = parsedPattern.allBasenames;
    wrappedPattern.allPaths = parsedPattern.allPaths;
    wrappedPattern.basenames = parsedPattern.basenames;
    wrappedPattern.patterns = parsedPattern.patterns;
    return wrappedPattern;
}
function trimForExclusions(pattern, options) {
    return options.trimForExclusions && pattern.endsWith('/**')
        ? pattern.substr(0, pattern.length - 2)
        : pattern; // dropping **, tailing / is dropped later
}
// common pattern: **/*.txt just need endsWith check
function trivia1(base, pattern) {
    return function (path, basename) {
        return typeof path === 'string' && path.endsWith(base) ? pattern : null;
    };
}
// common pattern: **/some.txt just need basename check
function trivia2(base, pattern) {
    const slashBase = `/${base}`;
    const backslashBase = `\\${base}`;
    const parsedPattern = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (basename) {
            return basename === base ? pattern : null;
        }
        return path === base || path.endsWith(slashBase) || path.endsWith(backslashBase)
            ? pattern
            : null;
    };
    const basenames = [base];
    parsedPattern.basenames = basenames;
    parsedPattern.patterns = [pattern];
    parsedPattern.allBasenames = basenames;
    return parsedPattern;
}
// repetition of common patterns (see above) {**/*.txt,**/*.png}
function trivia3(pattern, options) {
    const parsedPatterns = aggregateBasenameMatches(pattern
        .slice(1, -1)
        .split(',')
        .map((pattern) => parsePattern(pattern, options))
        .filter((pattern) => pattern !== NULL), pattern);
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (patternsLength === 1) {
        return parsedPatterns[0];
    }
    const parsedPattern = function (path, basename) {
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            if (parsedPatterns[i](path, basename)) {
                return pattern;
            }
        }
        return null;
    };
    const withBasenames = parsedPatterns.find((pattern) => !!pattern.allBasenames);
    if (withBasenames) {
        parsedPattern.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => (current.allPaths ? all.concat(current.allPaths) : all), []);
    if (allPaths.length) {
        parsedPattern.allPaths = allPaths;
    }
    return parsedPattern;
}
// common patterns: **/something/else just need endsWith check, something/else just needs and equals check
function trivia4and5(targetPath, pattern, matchPathEnds) {
    const usingPosixSep = sep === posix.sep;
    const nativePath = usingPosixSep ? targetPath : targetPath.replace(ALL_FORWARD_SLASHES, sep);
    const nativePathEnd = sep + nativePath;
    const targetPathEnd = posix.sep + targetPath;
    let parsedPattern;
    if (matchPathEnds) {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' &&
                (path === nativePath ||
                    path.endsWith(nativePathEnd) ||
                    (!usingPosixSep && (path === targetPath || path.endsWith(targetPathEnd))))
                ? pattern
                : null;
        };
    }
    else {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' &&
                (path === nativePath || (!usingPosixSep && path === targetPath))
                ? pattern
                : null;
        };
    }
    parsedPattern.allPaths = [(matchPathEnds ? '*/' : './') + targetPath];
    return parsedPattern;
}
function toRegExp(pattern) {
    try {
        const regExp = new RegExp(`^${parseRegExp(pattern)}$`);
        return function (path) {
            regExp.lastIndex = 0; // reset RegExp to its initial state to reuse it!
            return typeof path === 'string' && regExp.test(path) ? pattern : null;
        };
    }
    catch (error) {
        return NULL;
    }
}
export function match(arg1, path, hasSibling) {
    if (!arg1 || typeof path !== 'string') {
        return false;
    }
    return parse(arg1)(path, undefined, hasSibling);
}
export function parse(arg1, options = {}) {
    if (!arg1) {
        return FALSE;
    }
    // Glob with String
    if (typeof arg1 === 'string' || isRelativePattern(arg1)) {
        const parsedPattern = parsePattern(arg1, options);
        if (parsedPattern === NULL) {
            return FALSE;
        }
        const resultPattern = function (path, basename) {
            return !!parsedPattern(path, basename);
        };
        if (parsedPattern.allBasenames) {
            resultPattern.allBasenames = parsedPattern.allBasenames;
        }
        if (parsedPattern.allPaths) {
            resultPattern.allPaths = parsedPattern.allPaths;
        }
        return resultPattern;
    }
    // Glob with Expression
    return parsedExpression(arg1, options);
}
export function isRelativePattern(obj) {
    const rp = obj;
    if (!rp) {
        return false;
    }
    return typeof rp.base === 'string' && typeof rp.pattern === 'string';
}
export function getBasenameTerms(patternOrExpression) {
    return patternOrExpression.allBasenames || [];
}
export function getPathTerms(patternOrExpression) {
    return patternOrExpression.allPaths || [];
}
function parsedExpression(expression, options) {
    const parsedPatterns = aggregateBasenameMatches(Object.getOwnPropertyNames(expression)
        .map((pattern) => parseExpressionPattern(pattern, expression[pattern], options))
        .filter((pattern) => pattern !== NULL));
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (!parsedPatterns.some((parsedPattern) => !!parsedPattern.requiresSiblings)) {
        if (patternsLength === 1) {
            return parsedPatterns[0];
        }
        const resultExpression = function (path, basename) {
            let resultPromises = undefined;
            for (let i = 0, n = parsedPatterns.length; i < n; i++) {
                const result = parsedPatterns[i](path, basename);
                if (typeof result === 'string') {
                    return result; // immediately return as soon as the first expression matches
                }
                // If the result is a promise, we have to keep it for
                // later processing and await the result properly.
                if (isThenable(result)) {
                    if (!resultPromises) {
                        resultPromises = [];
                    }
                    resultPromises.push(result);
                }
            }
            // With result promises, we have to loop over each and
            // await the result before we can return any result.
            if (resultPromises) {
                return (async () => {
                    for (const resultPromise of resultPromises) {
                        const result = await resultPromise;
                        if (typeof result === 'string') {
                            return result;
                        }
                    }
                    return null;
                })();
            }
            return null;
        };
        const withBasenames = parsedPatterns.find((pattern) => !!pattern.allBasenames);
        if (withBasenames) {
            resultExpression.allBasenames = withBasenames.allBasenames;
        }
        const allPaths = parsedPatterns.reduce((all, current) => (current.allPaths ? all.concat(current.allPaths) : all), []);
        if (allPaths.length) {
            resultExpression.allPaths = allPaths;
        }
        return resultExpression;
    }
    const resultExpression = function (path, base, hasSibling) {
        let name = undefined;
        let resultPromises = undefined;
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            // Pattern matches path
            const parsedPattern = parsedPatterns[i];
            if (parsedPattern.requiresSiblings && hasSibling) {
                if (!base) {
                    base = basename(path);
                }
                if (!name) {
                    name = base.substr(0, base.length - extname(path).length);
                }
            }
            const result = parsedPattern(path, base, name, hasSibling);
            if (typeof result === 'string') {
                return result; // immediately return as soon as the first expression matches
            }
            // If the result is a promise, we have to keep it for
            // later processing and await the result properly.
            if (isThenable(result)) {
                if (!resultPromises) {
                    resultPromises = [];
                }
                resultPromises.push(result);
            }
        }
        // With result promises, we have to loop over each and
        // await the result before we can return any result.
        if (resultPromises) {
            return (async () => {
                for (const resultPromise of resultPromises) {
                    const result = await resultPromise;
                    if (typeof result === 'string') {
                        return result;
                    }
                }
                return null;
            })();
        }
        return null;
    };
    const withBasenames = parsedPatterns.find((pattern) => !!pattern.allBasenames);
    if (withBasenames) {
        resultExpression.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => (current.allPaths ? all.concat(current.allPaths) : all), []);
    if (allPaths.length) {
        resultExpression.allPaths = allPaths;
    }
    return resultExpression;
}
function parseExpressionPattern(pattern, value, options) {
    if (value === false) {
        return NULL; // pattern is disabled
    }
    const parsedPattern = parsePattern(pattern, options);
    if (parsedPattern === NULL) {
        return NULL;
    }
    // Expression Pattern is <boolean>
    if (typeof value === 'boolean') {
        return parsedPattern;
    }
    // Expression Pattern is <SiblingClause>
    if (value) {
        const when = value.when;
        if (typeof when === 'string') {
            const result = (path, basename, name, hasSibling) => {
                if (!hasSibling || !parsedPattern(path, basename)) {
                    return null;
                }
                const clausePattern = when.replace('$(basename)', () => name);
                const matched = hasSibling(clausePattern);
                return isThenable(matched)
                    ? matched.then((match) => (match ? pattern : null))
                    : matched
                        ? pattern
                        : null;
            };
            result.requiresSiblings = true;
            return result;
        }
    }
    // Expression is anything
    return parsedPattern;
}
function aggregateBasenameMatches(parsedPatterns, result) {
    const basenamePatterns = parsedPatterns.filter((parsedPattern) => !!parsedPattern.basenames);
    if (basenamePatterns.length < 2) {
        return parsedPatterns;
    }
    const basenames = basenamePatterns.reduce((all, current) => {
        const basenames = current.basenames;
        return basenames ? all.concat(basenames) : all;
    }, []);
    let patterns;
    if (result) {
        patterns = [];
        for (let i = 0, n = basenames.length; i < n; i++) {
            patterns.push(result);
        }
    }
    else {
        patterns = basenamePatterns.reduce((all, current) => {
            const patterns = current.patterns;
            return patterns ? all.concat(patterns) : all;
        }, []);
    }
    const aggregate = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (!basename) {
            let i;
            for (i = path.length; i > 0; i--) {
                const ch = path.charCodeAt(i - 1);
                if (ch === 47 /* CharCode.Slash */ || ch === 92 /* CharCode.Backslash */) {
                    break;
                }
            }
            basename = path.substr(i);
        }
        const index = basenames.indexOf(basename);
        return index !== -1 ? patterns[index] : null;
    };
    aggregate.basenames = basenames;
    aggregate.patterns = patterns;
    aggregate.allBasenames = basenames;
    const aggregatedPatterns = parsedPatterns.filter((parsedPattern) => !parsedPattern.basenames);
    aggregatedPatterns.push(aggregate);
    return aggregatedPatterns;
}
export function patternsEquals(patternsA, patternsB) {
    return equals(patternsA, patternsB, (a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
            return a === b;
        }
        if (typeof a !== 'string' && typeof b !== 'string') {
            return a.base === b.base && a.pattern === b.pattern;
        }
        return false;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZ2xvYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFdkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ25DLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBc0I1RCxNQUFNLFVBQVUsa0JBQWtCO0lBQ2pDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUMzQixDQUFDO0FBTUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQTtBQUM1QixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFBO0FBRTdCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQSxDQUFDLHlCQUF5QjtBQUN0RCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUEsQ0FBQyxrQ0FBa0M7QUFDbkUsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUE7QUFFakMsU0FBUyxhQUFhLENBQUMsU0FBaUIsRUFBRSxhQUF1QjtJQUNoRSxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ25CLEtBQUssQ0FBQztZQUNMLE9BQU8sRUFBRSxDQUFBO1FBQ1YsS0FBSyxDQUFDO1lBQ0ws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