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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2dsb2IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXZDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdkMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQXNCNUQsTUFBTSxVQUFVLGtCQUFrQjtJQUNqQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDM0IsQ0FBQztBQU1ELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUE7QUFDNUIsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQTtBQUU3QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUEsQ0FBQyx5QkFBeUI7QUFDdEQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFBLENBQUMsa0NBQWtDO0FBQ25FLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFBO0FBRWpDLFNBQVMsYUFBYSxDQUFDLFNBQWlCLEVBQUUsYUFBdUI7SUFDaEUsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNuQixLQUFLLENBQUM7WUFDTCxPQUFPLEVBQUUsQ0FBQTtRQUNWLEtBQUssQ0FBQztZQUNMLE9BQU8sR0FBRyxhQUFhLElBQUksQ0FBQSxDQUFDLDJGQUEyRjtRQUN4SDtZQUNDLHVHQUF1RztZQUN2Ryx1RUFBdUU7WUFDdkUseUVBQXlFO1lBQ3pFLGdGQUFnRjtZQUNoRixPQUFPLE1BQU0sVUFBVSxJQUFJLGFBQWEsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLFVBQVUsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUE7SUFDdEgsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLE9BQWUsRUFBRSxTQUFpQjtJQUNoRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUE7SUFFN0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFBO0lBQ3BCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtJQUV0QixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7SUFDZixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzVCLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLFNBQVM7Z0JBQ2IsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNyQixNQUFNLEdBQUcsRUFBRSxDQUFBO29CQUVYLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxNQUFLO1lBQ04sS0FBSyxHQUFHO2dCQUNQLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2YsTUFBSztZQUNOLEtBQUssR0FBRztnQkFDUCxRQUFRLEdBQUcsS0FBSyxDQUFBO2dCQUNoQixNQUFLO1lBQ04sS0FBSyxHQUFHO2dCQUNQLFVBQVUsR0FBRyxJQUFJLENBQUE7Z0JBQ2pCLE1BQUs7WUFDTixLQUFLLEdBQUc7Z0JBQ1AsVUFBVSxHQUFHLEtBQUssQ0FBQTtnQkFDbEIsTUFBSztRQUNQLENBQUM7UUFFRCxNQUFNLElBQUksSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELE9BQU87SUFDUCxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1osUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWU7SUFDbkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFBO0lBRWQsOENBQThDO0lBQzlDLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFFcEQsNENBQTRDO0lBQzVDLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDdkQsS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNiLENBQUM7SUFFRCw0QkFBNEI7U0FDdkIsQ0FBQztRQUNMLElBQUksMEJBQTBCLEdBQUcsS0FBSyxDQUFBO1FBQ3RDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbkMsMkJBQTJCO1lBQzNCLElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQixrRUFBa0U7Z0JBQ2xFLElBQUksMEJBQTBCLEVBQUUsQ0FBQztvQkFDaEMsT0FBTTtnQkFDUCxDQUFDO2dCQUVELEtBQUssSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3pELENBQUM7WUFFRCw4QkFBOEI7aUJBQ3pCLENBQUM7Z0JBQ0wsU0FBUztnQkFDVCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7Z0JBQ3BCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtnQkFFakIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO2dCQUN0QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUE7Z0JBRW5CLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQzVCLDBCQUEwQjtvQkFDMUIsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUM5QixRQUFRLElBQUksSUFBSSxDQUFBO3dCQUNoQixTQUFRO29CQUNULENBQUM7b0JBRUQsbUJBQW1CO29CQUNuQixJQUNDLFVBQVU7d0JBQ1YsQ0FBQyxJQUFJLEtBQUssR0FBRzs0QkFDWixDQUFDLFVBQVUsQ0FBQyxDQUFDLDRFQUE0RSxFQUN6RixDQUFDO3dCQUNGLElBQUksR0FBVyxDQUFBO3dCQUVmLGlCQUFpQjt3QkFDakIsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7NEJBQ2xCLEdBQUcsR0FBRyxJQUFJLENBQUE7d0JBQ1gsQ0FBQzt3QkFFRCwyREFBMkQ7NkJBQ3RELElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDOzRCQUN4RCxHQUFHLEdBQUcsR0FBRyxDQUFBO3dCQUNWLENBQUM7d0JBRUQsNkRBQTZEO3dCQUM3RCx1REFBdUQ7NkJBQ2xELElBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDOzRCQUM5QixHQUFHLEdBQUcsRUFBRSxDQUFBO3dCQUNULENBQUM7d0JBRUQsNkJBQTZCOzZCQUN4QixDQUFDOzRCQUNMLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDbkMsQ0FBQzt3QkFFRCxVQUFVLElBQUksR0FBRyxDQUFBO3dCQUNqQixTQUFRO29CQUNULENBQUM7b0JBRUQsUUFBUSxJQUFJLEVBQUUsQ0FBQzt3QkFDZCxLQUFLLEdBQUc7NEJBQ1AsUUFBUSxHQUFHLElBQUksQ0FBQTs0QkFDZixTQUFRO3dCQUVULEtBQUssR0FBRzs0QkFDUCxVQUFVLEdBQUcsSUFBSSxDQUFBOzRCQUNqQixTQUFRO3dCQUVULEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDVixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFBOzRCQUU3QyxrQ0FBa0M7NEJBQ2xDLE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUE7NEJBRW5GLEtBQUssSUFBSSxXQUFXLENBQUE7NEJBRXBCLFFBQVEsR0FBRyxLQUFLLENBQUE7NEJBQ2hCLFFBQVEsR0FBRyxFQUFFLENBQUE7NEJBRWIsTUFBSzt3QkFDTixDQUFDO3dCQUVELEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDVixLQUFLLElBQUksR0FBRyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUE7NEJBRS9CLFVBQVUsR0FBRyxLQUFLLENBQUE7NEJBQ2xCLFVBQVUsR0FBRyxFQUFFLENBQUE7NEJBRWYsTUFBSzt3QkFDTixDQUFDO3dCQUVELEtBQUssR0FBRzs0QkFDUCxLQUFLLElBQUksYUFBYSxDQUFBLENBQUMsbUVBQW1FOzRCQUMxRixTQUFRO3dCQUVULEtBQUssR0FBRzs0QkFDUCxLQUFLLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBOzRCQUN6QixTQUFRO3dCQUVUOzRCQUNDLEtBQUssSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDdkMsQ0FBQztnQkFDRixDQUFDO2dCQUVELDBEQUEwRDtnQkFDMUQsbURBQW1EO2dCQUNuRCw2REFBNkQ7Z0JBQzdELDhEQUE4RDtnQkFDOUQsZ0NBQWdDO2dCQUNoQyxJQUNDLEtBQUssR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxtQ0FBbUM7b0JBQ2xFLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUksZ0NBQWdDO3dCQUNwRSxLQUFLLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyw4REFBOEQ7a0JBQzNGLENBQUM7b0JBQ0YsS0FBSyxJQUFJLFVBQVUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUM7WUFFRCx3QkFBd0I7WUFDeEIsMEJBQTBCLEdBQUcsT0FBTyxLQUFLLFFBQVEsQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxpRkFBaUY7QUFDakYsTUFBTSxFQUFFLEdBQUcsc0JBQXNCLENBQUEsQ0FBQyxpQkFBaUI7QUFDbkQsTUFBTSxFQUFFLEdBQUcsdUJBQXVCLENBQUEsQ0FBQyxlQUFlO0FBQ2xELE1BQU0sRUFBRSxHQUFHLGtEQUFrRCxDQUFBLENBQUMsa0VBQWtFO0FBQ2hJLE1BQU0sSUFBSSxHQUFHLG9FQUFvRSxDQUFBLENBQUMsc0NBQXNDO0FBQ3hILE1BQU0sRUFBRSxHQUFHLDBCQUEwQixDQUFBLENBQUMsb0JBQW9CO0FBQzFELE1BQU0sRUFBRSxHQUFHLDhCQUE4QixDQUFBLENBQUMsaUJBQWlCO0FBNEMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBOEIsS0FBSyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7QUFFM0YsTUFBTSxLQUFLLEdBQUc7SUFDYixPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUMsQ0FBQTtBQUVELE1BQU0sSUFBSSxHQUFHO0lBQ1osT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDLENBQUE7QUFFRCxTQUFTLFlBQVksQ0FBQyxJQUErQixFQUFFLE9BQXFCO0lBQzNFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELDJCQUEyQjtJQUMzQixJQUFJLE9BQWUsQ0FBQTtJQUNuQixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3ZCLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNmLENBQUM7SUFFRCxzQkFBc0I7SUFDdEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUV4QixjQUFjO0lBQ2QsTUFBTSxVQUFVLEdBQUcsR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQzlELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDekMsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUNuQixPQUFPLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQscUJBQXFCO0lBQ3JCLElBQUksS0FBNkIsQ0FBQTtJQUNqQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN0QixhQUFhLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUEsQ0FBQyxvREFBb0Q7SUFDekcsQ0FBQztTQUFNLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkUsdURBQXVEO1FBQ3ZELGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7U0FBTSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2xFLGdFQUFnRTtRQUNoRSxhQUFhLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUMxQyxDQUFDO1NBQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRSw2REFBNkQ7UUFDN0QsYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvRCxDQUFDO1NBQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRSx3REFBd0Q7UUFDeEQsYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCwrQkFBK0I7U0FDMUIsQ0FBQztRQUNMLGFBQWEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELFFBQVE7SUFDUixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUVwQyxPQUFPLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUNoRCxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FDM0IsYUFBa0MsRUFDbEMsSUFBK0I7SUFFL0IsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixPQUFPLGFBQWEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsTUFBTSxjQUFjLEdBQXdCLFVBQVUsSUFBSSxFQUFFLFFBQVE7UUFDbkUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakQseURBQXlEO1lBQ3pELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELHlEQUF5RDtRQUN6RCxxREFBcUQ7UUFDckQsa0RBQWtEO1FBQ2xELHVEQUF1RDtRQUN2RCwwREFBMEQ7UUFDMUQseURBQXlEO1FBQ3pELHNEQUFzRDtRQUV0RCxPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUMsQ0FBQTtJQUVELDRDQUE0QztJQUM1QyxjQUFjLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUE7SUFDeEQsY0FBYyxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFBO0lBQ2hELGNBQWMsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQTtJQUNsRCxjQUFjLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUE7SUFFaEQsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsT0FBZSxFQUFFLE9BQXFCO0lBQ2hFLE9BQU8sT0FBTyxDQUFDLGlCQUFpQixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQzFELENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsT0FBTyxDQUFBLENBQUMsMENBQTBDO0FBQ3RELENBQUM7QUFFRCxvREFBb0Q7QUFDcEQsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLE9BQWU7SUFDN0MsT0FBTyxVQUFVLElBQVksRUFBRSxRQUFpQjtRQUMvQyxPQUFPLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUN4RSxDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQsdURBQXVEO0FBQ3ZELFNBQVMsT0FBTyxDQUFDLElBQVksRUFBRSxPQUFlO0lBQzdDLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7SUFDNUIsTUFBTSxhQUFhLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQTtJQUVqQyxNQUFNLGFBQWEsR0FBd0IsVUFBVSxJQUFZLEVBQUUsUUFBaUI7UUFDbkYsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUMxQyxDQUFDO1FBRUQsT0FBTyxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7WUFDL0UsQ0FBQyxDQUFDLE9BQU87WUFDVCxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ1IsQ0FBQyxDQUFBO0lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN4QixhQUFhLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtJQUNuQyxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEMsYUFBYSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7SUFFdEMsT0FBTyxhQUFhLENBQUE7QUFDckIsQ0FBQztBQUVELGdFQUFnRTtBQUNoRSxTQUFTLE9BQU8sQ0FBQyxPQUFlLEVBQUUsT0FBcUI7SUFDdEQsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQzlDLE9BQU87U0FDTCxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ1osS0FBSyxDQUFDLEdBQUcsQ0FBQztTQUNWLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNoRCxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFDdkMsT0FBTyxDQUNQLENBQUE7SUFFRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFBO0lBQzVDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJLGNBQWMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQsTUFBTSxhQUFhLEdBQXdCLFVBQVUsSUFBWSxFQUFFLFFBQWlCO1FBQ25GLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxPQUFPLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQyxDQUFBO0lBRUQsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM5RSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ25CLGFBQWEsQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQTtJQUN4RCxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDckMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDekUsRUFBYyxDQUNkLENBQUE7SUFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixhQUFhLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsT0FBTyxhQUFhLENBQUE7QUFDckIsQ0FBQztBQUVELDBHQUEwRztBQUMxRyxTQUFTLFdBQVcsQ0FDbkIsVUFBa0IsRUFDbEIsT0FBZSxFQUNmLGFBQXNCO0lBRXRCLE1BQU0sYUFBYSxHQUFHLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFBO0lBQ3ZDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzVGLE1BQU0sYUFBYSxHQUFHLEdBQUcsR0FBRyxVQUFVLENBQUE7SUFDdEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUE7SUFFNUMsSUFBSSxhQUFrQyxDQUFBO0lBQ3RDLElBQUksYUFBYSxFQUFFLENBQUM7UUFDbkIsYUFBYSxHQUFHLFVBQVUsSUFBWSxFQUFFLFFBQWlCO1lBQ3hELE9BQU8sT0FBTyxJQUFJLEtBQUssUUFBUTtnQkFDOUIsQ0FBQyxJQUFJLEtBQUssVUFBVTtvQkFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQzVCLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzRSxDQUFDLENBQUMsT0FBTztnQkFDVCxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ1IsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxhQUFhLEdBQUcsVUFBVSxJQUFZLEVBQUUsUUFBaUI7WUFDeEQsT0FBTyxPQUFPLElBQUksS0FBSyxRQUFRO2dCQUM5QixDQUFDLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsQ0FBQyxPQUFPO2dCQUNULENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDUixDQUFDLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFBO0lBRXJFLE9BQU8sYUFBYSxDQUFBO0FBQ3JCLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxPQUFlO0lBQ2hDLElBQUksQ0FBQztRQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0RCxPQUFPLFVBQVUsSUFBWTtZQUM1QixNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQSxDQUFDLGlEQUFpRDtZQUV0RSxPQUFPLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUN0RSxDQUFDLENBQUE7SUFDRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7QUFDRixDQUFDO0FBaUJELE1BQU0sVUFBVSxLQUFLLENBQ3BCLElBQTZDLEVBQzdDLElBQVksRUFDWixVQUFzQztJQUV0QyxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDaEQsQ0FBQztBQWlCRCxNQUFNLFVBQVUsS0FBSyxDQUNwQixJQUE2QyxFQUM3QyxVQUF3QixFQUFFO0lBRTFCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELG1CQUFtQjtJQUNuQixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3pELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakQsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDNUIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQ2xCLFVBQVUsSUFBWSxFQUFFLFFBQWlCO1lBQ3hDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDaEMsYUFBYSxDQUFDLFlBQVksR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFBO1FBQ3hELENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixhQUFhLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUE7UUFDaEQsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFRCx1QkFBdUI7SUFDdkIsT0FBTyxnQkFBZ0IsQ0FBYyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDcEQsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxHQUFZO0lBQzdDLE1BQU0sRUFBRSxHQUFHLEdBQTBDLENBQUE7SUFDckQsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ1QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUE7QUFDckUsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxtQkFBcUQ7SUFDckYsT0FBNkIsbUJBQW9CLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQTtBQUNyRSxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxtQkFBcUQ7SUFDakYsT0FBNkIsbUJBQW9CLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQTtBQUNqRSxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxVQUF1QixFQUFFLE9BQXFCO0lBQ3ZFLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUM5QyxNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDO1NBQ3BDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUMvRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsQ0FDdkMsQ0FBQTtJQUVELE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUE7SUFDNUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQ0MsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUNuQixDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUEyQixhQUFjLENBQUMsZ0JBQWdCLENBQzlFLEVBQ0EsQ0FBQztRQUNGLElBQUksY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBd0IsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBd0IsVUFBVSxJQUFZLEVBQUUsUUFBaUI7WUFDdEYsSUFBSSxjQUFjLEdBQXlDLFNBQVMsQ0FBQTtZQUVwRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZELE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ2hELElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ2hDLE9BQU8sTUFBTSxDQUFBLENBQUMsNkRBQTZEO2dCQUM1RSxDQUFDO2dCQUVELHFEQUFxRDtnQkFDckQsa0RBQWtEO2dCQUNsRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQ3JCLGNBQWMsR0FBRyxFQUFFLENBQUE7b0JBQ3BCLENBQUM7b0JBRUQsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7WUFFRCxzREFBc0Q7WUFDdEQsb0RBQW9EO1lBQ3BELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDbEIsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUUsQ0FBQzt3QkFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUE7d0JBQ2xDLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7NEJBQ2hDLE9BQU8sTUFBTSxDQUFBO3dCQUNkLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDLENBQUMsRUFBRSxDQUFBO1lBQ0wsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxDQUFBO1FBRUQsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5RSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLGdCQUFnQixDQUFDLFlBQVksR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFBO1FBQzNELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUNyQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUN6RSxFQUFjLENBQ2QsQ0FBQTtRQUNELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLGdCQUFnQixDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFDckMsQ0FBQztRQUVELE9BQU8sZ0JBQWdCLENBQUE7SUFDeEIsQ0FBQztJQUVELE1BQU0sZ0JBQWdCLEdBQXdCLFVBQzdDLElBQVksRUFDWixJQUFhLEVBQ2IsVUFBeUQ7UUFFekQsSUFBSSxJQUFJLEdBQXVCLFNBQVMsQ0FBQTtRQUN4QyxJQUFJLGNBQWMsR0FBeUMsU0FBUyxDQUFBO1FBRXBFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCx1QkFBdUI7WUFDdkIsTUFBTSxhQUFhLEdBQTRCLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoRSxJQUFJLGFBQWEsQ0FBQyxnQkFBZ0IsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3RCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDMUQsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDMUQsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxNQUFNLENBQUEsQ0FBQyw2REFBNkQ7WUFDNUUsQ0FBQztZQUVELHFEQUFxRDtZQUNyRCxrREFBa0Q7WUFDbEQsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNyQixjQUFjLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixDQUFDO2dCQUVELGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsb0RBQW9EO1FBQ3BELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsT0FBTyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNsQixLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQTtvQkFDbEMsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDaEMsT0FBTyxNQUFNLENBQUE7b0JBQ2QsQ0FBQztnQkFDRixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNMLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUMsQ0FBQTtJQUVELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDOUUsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUNuQixnQkFBZ0IsQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQTtJQUMzRCxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDckMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDekUsRUFBYyxDQUNkLENBQUE7SUFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixnQkFBZ0IsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxPQUFPLGdCQUFnQixDQUFBO0FBQ3hCLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUM5QixPQUFlLEVBQ2YsS0FBOEIsRUFDOUIsT0FBcUI7SUFFckIsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDckIsT0FBTyxJQUFJLENBQUEsQ0FBQyxzQkFBc0I7SUFDbkMsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDcEQsSUFBSSxhQUFhLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsa0NBQWtDO0lBQ2xDLElBQUksT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDaEMsT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQztJQUVELHdDQUF3QztJQUN4QyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUN2QixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE1BQU0sTUFBTSxHQUE0QixDQUN2QyxJQUFZLEVBQ1osUUFBaUIsRUFDakIsSUFBYSxFQUNiLFVBQXlELEVBQ3hELEVBQUU7Z0JBQ0gsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFLLENBQUMsQ0FBQTtnQkFDOUQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN6QyxPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUM7b0JBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkQsQ0FBQyxDQUFDLE9BQU87d0JBQ1IsQ0FBQyxDQUFDLE9BQU87d0JBQ1QsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNULENBQUMsQ0FBQTtZQUVELE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7WUFFOUIsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QjtJQUN6QixPQUFPLGFBQWEsQ0FBQTtBQUNyQixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FDaEMsY0FBb0UsRUFDcEUsTUFBZTtJQUVmLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDN0MsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBdUIsYUFBYyxDQUFDLFNBQVMsQ0FDbkUsQ0FBQTtJQUNELElBQUksZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sY0FBYyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQVcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDcEUsTUFBTSxTQUFTLEdBQXlCLE9BQVEsQ0FBQyxTQUFTLENBQUE7UUFFMUQsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtJQUMvQyxDQUFDLEVBQUUsRUFBYyxDQUFDLENBQUE7SUFFbEIsSUFBSSxRQUFrQixDQUFBO0lBQ3RCLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixRQUFRLEdBQUcsRUFBRSxDQUFBO1FBRWIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsUUFBUSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNuRCxNQUFNLFFBQVEsR0FBeUIsT0FBUSxDQUFDLFFBQVEsQ0FBQTtZQUV4RCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQzdDLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQTtJQUNuQixDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQXdCLFVBQVUsSUFBWSxFQUFFLFFBQWlCO1FBQy9FLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFTLENBQUE7WUFDYixLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pDLElBQUksRUFBRSw0QkFBbUIsSUFBSSxFQUFFLGdDQUF1QixFQUFFLENBQUM7b0JBQ3hELE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7WUFFRCxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6QyxPQUFPLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDN0MsQ0FBQyxDQUFBO0lBRUQsU0FBUyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7SUFDL0IsU0FBUyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7SUFDN0IsU0FBUyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7SUFFbEMsTUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUMvQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBdUIsYUFBYyxDQUFDLFNBQVMsQ0FDbEUsQ0FBQTtJQUNELGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUVsQyxPQUFPLGtCQUFrQixDQUFBO0FBQzFCLENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUM3QixTQUF1RCxFQUN2RCxTQUF1RDtJQUV2RCxPQUFPLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNmLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDcEQsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDIn0=