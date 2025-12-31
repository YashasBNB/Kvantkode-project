/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';
import { coalesce, mapArrayOrNot } from '../../../../base/common/arrays.js';
import { groupBy } from '../../../../base/common/collections.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { createRegExp, escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { DEFAULT_MAX_SEARCH_RESULTS, SearchError, SearchErrorCode, serializeSearchError, TextSearchMatch, } from '../common/search.js';
import { Range, TextSearchContext2, TextSearchMatch2, } from '../common/searchExtTypes.js';
import { RegExpParser, RegExpVisitor } from 'vscode-regexpp';
import { rgPath } from '@vscode/ripgrep';
import { anchorGlob, rangeToSearchRange, searchRangeToRange, } from './ripgrepSearchUtils.js';
import { newToOldPreviewOptions } from '../common/searchExtConversionTypes.js';
// If @vscode/ripgrep is in an .asar file, then the binary is unpacked.
const rgDiskPath = rgPath.replace(/\bnode_modules\.asar\b/, 'node_modules.asar.unpacked');
export class RipgrepTextSearchEngine {
    constructor(outputChannel, _numThreads) {
        this.outputChannel = outputChannel;
        this._numThreads = _numThreads;
    }
    provideTextSearchResults(query, options, progress, token) {
        return Promise.all(options.folderOptions.map((folderOption) => {
            const extendedOptions = {
                folderOptions: folderOption,
                numThreads: this._numThreads,
                maxResults: options.maxResults,
                previewOptions: options.previewOptions,
                maxFileSize: options.maxFileSize,
                surroundingContext: options.surroundingContext,
            };
            return this.provideTextSearchResultsWithRgOptions(query, extendedOptions, progress, token);
        })).then((e) => {
            const complete = {
                // todo: get this to actually check
                limitHit: e.some((complete) => !!complete && complete.limitHit),
            };
            return complete;
        });
    }
    provideTextSearchResultsWithRgOptions(query, options, progress, token) {
        this.outputChannel.appendLine(`provideTextSearchResults ${query.pattern}, ${JSON.stringify({
            ...options,
            ...{
                folder: options.folderOptions.folder.toString(),
            },
        })}`);
        return new Promise((resolve, reject) => {
            token.onCancellationRequested(() => cancel());
            const extendedOptions = {
                ...options,
                numThreads: this._numThreads,
            };
            const rgArgs = getRgArgs(query, extendedOptions);
            const cwd = options.folderOptions.folder.fsPath;
            const escapedArgs = rgArgs.map((arg) => (arg.match(/^-/) ? arg : `'${arg}'`)).join(' ');
            this.outputChannel.appendLine(`${rgDiskPath} ${escapedArgs}\n - cwd: ${cwd}`);
            let rgProc = cp.spawn(rgDiskPath, rgArgs, { cwd });
            rgProc.on('error', (e) => {
                console.error(e);
                this.outputChannel.appendLine('Error: ' + (e && e.message));
                reject(serializeSearchError(new SearchError(e && e.message, SearchErrorCode.rgProcessError)));
            });
            let gotResult = false;
            const ripgrepParser = new RipgrepParser(options.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS, options.folderOptions.folder, newToOldPreviewOptions(options.previewOptions));
            ripgrepParser.on('result', (match) => {
                gotResult = true;
                dataWithoutResult = '';
                progress.report(match);
            });
            let isDone = false;
            const cancel = () => {
                isDone = true;
                rgProc?.kill();
                ripgrepParser?.cancel();
            };
            let limitHit = false;
            ripgrepParser.on('hitLimit', () => {
                limitHit = true;
                cancel();
            });
            let dataWithoutResult = '';
            rgProc.stdout.on('data', (data) => {
                ripgrepParser.handleData(data);
                if (!gotResult) {
                    dataWithoutResult += data;
                }
            });
            let gotData = false;
            rgProc.stdout.once('data', () => (gotData = true));
            let stderr = '';
            rgProc.stderr.on('data', (data) => {
                const message = data.toString();
                this.outputChannel.appendLine(message);
                if (stderr.length + message.length < 1e6) {
                    stderr += message;
                }
            });
            rgProc.on('close', () => {
                this.outputChannel.appendLine(gotData ? 'Got data from stdout' : 'No data from stdout');
                this.outputChannel.appendLine(gotResult ? 'Got result from parser' : 'No result from parser');
                if (dataWithoutResult) {
                    this.outputChannel.appendLine(`Got data without result: ${dataWithoutResult}`);
                }
                this.outputChannel.appendLine('');
                if (isDone) {
                    resolve({ limitHit });
                }
                else {
                    // Trigger last result
                    ripgrepParser.flush();
                    rgProc = null;
                    let searchError;
                    if (stderr && !gotData && (searchError = rgErrorMsgForDisplay(stderr))) {
                        reject(serializeSearchError(new SearchError(searchError.message, searchError.code)));
                    }
                    else {
                        resolve({ limitHit });
                    }
                }
            });
        });
    }
}
/**
 * Read the first line of stderr and return an error for display or undefined, based on a list of
 * allowed properties.
 * Ripgrep produces stderr output which is not from a fatal error, and we only want the search to be
 * "failed" when a fatal error was produced.
 */
function rgErrorMsgForDisplay(msg) {
    const lines = msg.split('\n');
    const firstLine = lines[0].trim();
    if (lines.some((l) => l.startsWith('regex parse error'))) {
        return new SearchError(buildRegexParseError(lines), SearchErrorCode.regexParseError);
    }
    const match = firstLine.match(/grep config error: unknown encoding: (.*)/);
    if (match) {
        return new SearchError(`Unknown encoding: ${match[1]}`, SearchErrorCode.unknownEncoding);
    }
    if (firstLine.startsWith('error parsing glob')) {
        // Uppercase first letter
        return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.substr(1), SearchErrorCode.globParseError);
    }
    if (firstLine.startsWith('the literal')) {
        // Uppercase first letter
        return new SearchError(firstLine.charAt(0).toUpperCase() + firstLine.substr(1), SearchErrorCode.invalidLiteral);
    }
    if (firstLine.startsWith('PCRE2: error compiling pattern')) {
        return new SearchError(firstLine, SearchErrorCode.regexParseError);
    }
    return undefined;
}
function buildRegexParseError(lines) {
    const errorMessage = ['Regex parse error'];
    const pcre2ErrorLine = lines.filter((l) => l.startsWith('PCRE2:'));
    if (pcre2ErrorLine.length >= 1) {
        const pcre2ErrorMessage = pcre2ErrorLine[0].replace('PCRE2:', '');
        if (pcre2ErrorMessage.indexOf(':') !== -1 && pcre2ErrorMessage.split(':').length >= 2) {
            const pcre2ActualErrorMessage = pcre2ErrorMessage.split(':')[1];
            errorMessage.push(':' + pcre2ActualErrorMessage);
        }
    }
    return errorMessage.join('');
}
export class RipgrepParser extends EventEmitter {
    constructor(maxResults, root, previewOptions) {
        super();
        this.maxResults = maxResults;
        this.root = root;
        this.previewOptions = previewOptions;
        this.remainder = '';
        this.isDone = false;
        this.hitLimit = false;
        this.numResults = 0;
        this.stringDecoder = new StringDecoder();
    }
    cancel() {
        this.isDone = true;
    }
    flush() {
        this.handleDecodedData(this.stringDecoder.end());
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    handleData(data) {
        if (this.isDone) {
            return;
        }
        const dataStr = typeof data === 'string' ? data : this.stringDecoder.write(data);
        this.handleDecodedData(dataStr);
    }
    handleDecodedData(decodedData) {
        // check for newline before appending to remainder
        let newlineIdx = decodedData.indexOf('\n');
        // If the previous data chunk didn't end in a newline, prepend it to this chunk
        const dataStr = this.remainder + decodedData;
        if (newlineIdx >= 0) {
            newlineIdx += this.remainder.length;
        }
        else {
            // Shortcut
            this.remainder = dataStr;
            return;
        }
        let prevIdx = 0;
        while (newlineIdx >= 0) {
            this.handleLine(dataStr.substring(prevIdx, newlineIdx).trim());
            prevIdx = newlineIdx + 1;
            newlineIdx = dataStr.indexOf('\n', prevIdx);
        }
        this.remainder = dataStr.substring(prevIdx);
    }
    handleLine(outputLine) {
        if (this.isDone || !outputLine) {
            return;
        }
        let parsedLine;
        try {
            parsedLine = JSON.parse(outputLine);
        }
        catch (e) {
            throw new Error(`malformed line from rg: ${outputLine}`);
        }
        if (parsedLine.type === 'match') {
            const matchPath = bytesOrTextToString(parsedLine.data.path);
            const uri = URI.joinPath(this.root, matchPath);
            const result = this.createTextSearchMatch(parsedLine.data, uri);
            this.onResult(result);
            if (this.hitLimit) {
                this.cancel();
                this.emit('hitLimit');
            }
        }
        else if (parsedLine.type === 'context') {
            const contextPath = bytesOrTextToString(parsedLine.data.path);
            const uri = URI.joinPath(this.root, contextPath);
            const result = this.createTextSearchContexts(parsedLine.data, uri);
            result.forEach((r) => this.onResult(r));
        }
    }
    createTextSearchMatch(data, uri) {
        const lineNumber = data.line_number - 1;
        const fullText = bytesOrTextToString(data.lines);
        const fullTextBytes = Buffer.from(fullText);
        let prevMatchEnd = 0;
        let prevMatchEndCol = 0;
        let prevMatchEndLine = lineNumber;
        // it looks like certain regexes can match a line, but cause rg to not
        // emit any specific submatches for that line.
        // https://github.com/microsoft/vscode/issues/100569#issuecomment-738496991
        if (data.submatches.length === 0) {
            data.submatches.push(fullText.length
                ? { start: 0, end: 1, match: { text: fullText[0] } }
                : { start: 0, end: 0, match: { text: '' } });
        }
        const ranges = coalesce(data.submatches.map((match, i) => {
            if (this.hitLimit) {
                return null;
            }
            this.numResults++;
            if (this.numResults >= this.maxResults) {
                // Finish the line, then report the result below
                this.hitLimit = true;
            }
            const matchText = bytesOrTextToString(match.match);
            const inBetweenText = fullTextBytes.slice(prevMatchEnd, match.start).toString();
            const inBetweenStats = getNumLinesAndLastNewlineLength(inBetweenText);
            const startCol = inBetweenStats.numLines > 0
                ? inBetweenStats.lastLineLength
                : inBetweenStats.lastLineLength + prevMatchEndCol;
            const stats = getNumLinesAndLastNewlineLength(matchText);
            const startLineNumber = inBetweenStats.numLines + prevMatchEndLine;
            const endLineNumber = stats.numLines + startLineNumber;
            const endCol = stats.numLines > 0 ? stats.lastLineLength : stats.lastLineLength + startCol;
            prevMatchEnd = match.end;
            prevMatchEndCol = endCol;
            prevMatchEndLine = endLineNumber;
            return new Range(startLineNumber, startCol, endLineNumber, endCol);
        }));
        const searchRange = mapArrayOrNot(ranges, rangeToSearchRange);
        const internalResult = new TextSearchMatch(fullText, searchRange, this.previewOptions);
        return new TextSearchMatch2(uri, internalResult.rangeLocations.map((e) => ({
            sourceRange: searchRangeToRange(e.source),
            previewRange: searchRangeToRange(e.preview),
        })), internalResult.previewText);
    }
    createTextSearchContexts(data, uri) {
        const text = bytesOrTextToString(data.lines);
        const startLine = data.line_number;
        return text
            .replace(/\r?\n$/, '')
            .split('\n')
            .map((line, i) => new TextSearchContext2(uri, line, startLine + i));
    }
    onResult(match) {
        this.emit('result', match);
    }
}
function bytesOrTextToString(obj) {
    return obj.bytes ? Buffer.from(obj.bytes, 'base64').toString() : obj.text;
}
function getNumLinesAndLastNewlineLength(text) {
    const re = /\n/g;
    let numLines = 0;
    let lastNewlineIdx = -1;
    let match;
    while ((match = re.exec(text))) {
        numLines++;
        lastNewlineIdx = match.index;
    }
    const lastLineLength = lastNewlineIdx >= 0 ? text.length - lastNewlineIdx - 1 : text.length;
    return { numLines, lastLineLength };
}
// exported for testing
export function getRgArgs(query, options) {
    const args = ['--hidden', '--no-require-git'];
    args.push(query.isCaseSensitive ? '--case-sensitive' : '--ignore-case');
    const { doubleStarIncludes, otherIncludes } = groupBy(options.folderOptions.includes, (include) => (include.startsWith('**') ? 'doubleStarIncludes' : 'otherIncludes'));
    if (otherIncludes && otherIncludes.length) {
        const uniqueOthers = new Set();
        otherIncludes.forEach((other) => {
            uniqueOthers.add(other);
        });
        args.push('-g', '!*');
        uniqueOthers.forEach((otherIncude) => {
            spreadGlobComponents(otherIncude)
                .map(anchorGlob)
                .forEach((globArg) => {
                args.push('-g', globArg);
            });
        });
    }
    if (doubleStarIncludes && doubleStarIncludes.length) {
        doubleStarIncludes.forEach((globArg) => {
            args.push('-g', globArg);
        });
    }
    options.folderOptions.excludes
        .map((e) => (typeof e === 'string' ? e : e.pattern))
        .map(anchorGlob)
        .forEach((rgGlob) => args.push('-g', `!${rgGlob}`));
    if (options.maxFileSize) {
        args.push('--max-filesize', options.maxFileSize + '');
    }
    if (options.folderOptions.useIgnoreFiles.local) {
        if (!options.folderOptions.useIgnoreFiles.parent) {
            args.push('--no-ignore-parent');
        }
    }
    else {
        // Don't use .gitignore or .ignore
        args.push('--no-ignore');
    }
    if (options.folderOptions.followSymlinks) {
        args.push('--follow');
    }
    if (options.folderOptions.encoding && options.folderOptions.encoding !== 'utf8') {
        args.push('--encoding', options.folderOptions.encoding);
    }
    if (options.numThreads) {
        args.push('--threads', `${options.numThreads}`);
    }
    // Ripgrep handles -- as a -- arg separator. Only --.
    // - is ok, --- is ok, --some-flag is also ok. Need to special case.
    if (query.pattern === '--') {
        query.isRegExp = true;
        query.pattern = '\\-\\-';
    }
    if (query.isMultiline && !query.isRegExp) {
        query.pattern = escapeRegExpCharacters(query.pattern);
        query.isRegExp = true;
    }
    if (options.usePCRE2) {
        args.push('--pcre2');
    }
    // Allow $ to match /r/n
    args.push('--crlf');
    if (query.isRegExp) {
        query.pattern = unicodeEscapesToPCRE2(query.pattern);
        args.push('--engine', 'auto');
    }
    let searchPatternAfterDoubleDashes;
    if (query.isWordMatch) {
        const regexp = createRegExp(query.pattern, !!query.isRegExp, { wholeWord: query.isWordMatch });
        const regexpStr = regexp.source.replace(/\\\//g, '/'); // RegExp.source arbitrarily returns escaped slashes. Search and destroy.
        args.push('--regexp', regexpStr);
    }
    else if (query.isRegExp) {
        let fixedRegexpQuery = fixRegexNewline(query.pattern);
        fixedRegexpQuery = fixNewline(fixedRegexpQuery);
        args.push('--regexp', fixedRegexpQuery);
    }
    else {
        searchPatternAfterDoubleDashes = query.pattern;
        args.push('--fixed-strings');
    }
    args.push('--no-config');
    if (!options.folderOptions.useIgnoreFiles.global) {
        args.push('--no-ignore-global');
    }
    args.push('--json');
    if (query.isMultiline) {
        args.push('--multiline');
    }
    if (options.surroundingContext) {
        args.push('--before-context', options.surroundingContext + '');
        args.push('--after-context', options.surroundingContext + '');
    }
    // Folder to search
    args.push('--');
    if (searchPatternAfterDoubleDashes) {
        // Put the query after --, in case the query starts with a dash
        args.push(searchPatternAfterDoubleDashes);
    }
    args.push('.');
    return args;
}
/**
 * `"foo/*bar/something"` -> `["foo", "foo/*bar", "foo/*bar/something", "foo/*bar/something/**"]`
 */
function spreadGlobComponents(globComponent) {
    const globComponentWithBraceExpansion = performBraceExpansionForRipgrep(globComponent);
    return globComponentWithBraceExpansion.flatMap((globArg) => {
        const components = splitGlobAware(globArg, '/');
        return components.map((_, i) => components.slice(0, i + 1).join('/'));
    });
}
export function unicodeEscapesToPCRE2(pattern) {
    // Match \u1234
    const unicodePattern = /((?:[^\\]|^)(?:\\\\)*)\\u([a-z0-9]{4})/gi;
    while (pattern.match(unicodePattern)) {
        pattern = pattern.replace(unicodePattern, `$1\\x{$2}`);
    }
    // Match \u{1234}
    // \u with 5-6 characters will be left alone because \x only takes 4 characters.
    const unicodePatternWithBraces = /((?:[^\\]|^)(?:\\\\)*)\\u\{([a-z0-9]{4})\}/gi;
    while (pattern.match(unicodePatternWithBraces)) {
        pattern = pattern.replace(unicodePatternWithBraces, `$1\\x{$2}`);
    }
    return pattern;
}
const isLookBehind = (node) => node.type === 'Assertion' && node.kind === 'lookbehind';
export function fixRegexNewline(pattern) {
    // we parse the pattern anew each tiem
    let re;
    try {
        re = new RegExpParser().parsePattern(pattern);
    }
    catch {
        return pattern;
    }
    let output = '';
    let lastEmittedIndex = 0;
    const replace = (start, end, text) => {
        output += pattern.slice(lastEmittedIndex, start) + text;
        lastEmittedIndex = end;
    };
    const context = [];
    const visitor = new RegExpVisitor({
        onCharacterEnter(char) {
            if (char.raw !== '\\n') {
                return;
            }
            const parent = context[0];
            if (!parent) {
                // simple char, \n -> \r?\n
                replace(char.start, char.end, '\\r?\\n');
            }
            else if (context.some(isLookBehind)) {
                // no-op in a lookbehind, see #100569
            }
            else if (parent.type === 'CharacterClass') {
                if (parent.negate) {
                    // negative bracket expr, [^a-z\n] -> (?![a-z]|\r?\n)
                    const otherContent = pattern.slice(parent.start + 2, char.start) + pattern.slice(char.end, parent.end - 1);
                    if (parent.parent?.type === 'Quantifier') {
                        // If quantified, we can't use a negative lookahead in a quantifier.
                        // But `.` already doesn't match new lines, so we can just use that
                        // (with any other negations) instead.
                        replace(parent.start, parent.end, otherContent ? `[^${otherContent}]` : '.');
                    }
                    else {
                        replace(parent.start, parent.end, '(?!\\r?\\n' + (otherContent ? `|[${otherContent}]` : '') + ')');
                    }
                }
                else {
                    // positive bracket expr, [a-z\n] -> (?:[a-z]|\r?\n)
                    const otherContent = pattern.slice(parent.start + 1, char.start) + pattern.slice(char.end, parent.end - 1);
                    replace(parent.start, parent.end, otherContent === '' ? '\\r?\\n' : `(?:[${otherContent}]|\\r?\\n)`);
                }
            }
            else if (parent.type === 'Quantifier') {
                replace(char.start, char.end, '(?:\\r?\\n)');
            }
        },
        onQuantifierEnter(node) {
            context.unshift(node);
        },
        onQuantifierLeave() {
            context.shift();
        },
        onCharacterClassRangeEnter(node) {
            context.unshift(node);
        },
        onCharacterClassRangeLeave() {
            context.shift();
        },
        onCharacterClassEnter(node) {
            context.unshift(node);
        },
        onCharacterClassLeave() {
            context.shift();
        },
        onAssertionEnter(node) {
            if (isLookBehind(node)) {
                context.push(node);
            }
        },
        onAssertionLeave(node) {
            if (context[0] === node) {
                context.shift();
            }
        },
    });
    visitor.visit(re);
    output += pattern.slice(lastEmittedIndex);
    return output;
}
export function fixNewline(pattern) {
    return pattern.replace(/\n/g, '\\r?\\n');
}
// brace expansion for ripgrep
/**
 * Split string given first opportunity for brace expansion in the string.
 * - If the brace is prepended by a \ character, then it is escaped.
 * - Does not process escapes that are within the sub-glob.
 * - If two unescaped `{` occur before `}`, then ripgrep will return an error for brace nesting, so don't split on those.
 */
function getEscapeAwareSplitStringForRipgrep(pattern) {
    let inBraces = false;
    let escaped = false;
    let fixedStart = '';
    let strInBraces = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        switch (char) {
            case '\\':
                if (escaped) {
                    // If we're already escaped, then just leave the escaped slash and the preceeding slash that escapes it.
                    // The two escaped slashes will result in a single slash and whatever processes the glob later will properly process the escape
                    if (inBraces) {
                        strInBraces += '\\' + char;
                    }
                    else {
                        fixedStart += '\\' + char;
                    }
                    escaped = false;
                }
                else {
                    escaped = true;
                }
                break;
            case '{':
                if (escaped) {
                    // if we escaped this opening bracket, then it is to be taken literally. Remove the `\` because we've acknowleged it and add the `{` to the appropriate string
                    if (inBraces) {
                        strInBraces += char;
                    }
                    else {
                        fixedStart += char;
                    }
                    escaped = false;
                }
                else {
                    if (inBraces) {
                        // ripgrep treats this as attempting to do a nested alternate group, which is invalid. Return with pattern including changes from escaped braces.
                        return { strInBraces: fixedStart + '{' + strInBraces + '{' + pattern.substring(i + 1) };
                    }
                    else {
                        inBraces = true;
                    }
                }
                break;
            case '}':
                if (escaped) {
                    // same as `}`, but for closing bracket
                    if (inBraces) {
                        strInBraces += char;
                    }
                    else {
                        fixedStart += char;
                    }
                    escaped = false;
                }
                else if (inBraces) {
                    // we found an end bracket to a valid opening bracket. Return the appropriate strings.
                    return { fixedStart, strInBraces, fixedEnd: pattern.substring(i + 1) };
                }
                else {
                    // if we're not in braces and not escaped, then this is a literal `}` character and we're still adding to fixedStart.
                    fixedStart += char;
                }
                break;
            default:
                // similar to the `\\` case, we didn't do anything with the escape, so we should re-insert it into the appropriate string
                // to be consumed later when individual parts of the glob are processed
                if (inBraces) {
                    strInBraces += (escaped ? '\\' : '') + char;
                }
                else {
                    fixedStart += (escaped ? '\\' : '') + char;
                }
                escaped = false;
                break;
        }
    }
    // we are haven't hit the last brace, so no splitting should occur. Return with pattern including changes from escaped braces.
    return { strInBraces: fixedStart + (inBraces ? '{' + strInBraces : '') };
}
/**
 * Parses out curly braces and returns equivalent globs. Only supports one level of nesting.
 * Exported for testing.
 */
export function performBraceExpansionForRipgrep(pattern) {
    const { fixedStart, strInBraces, fixedEnd } = getEscapeAwareSplitStringForRipgrep(pattern);
    if (fixedStart === undefined || fixedEnd === undefined) {
        return [strInBraces];
    }
    let arr = splitGlobAware(strInBraces, ',');
    if (!arr.length) {
        // occurs if the braces are empty.
        arr = [''];
    }
    const ends = performBraceExpansionForRipgrep(fixedEnd);
    return arr.flatMap((elem) => {
        const start = fixedStart + elem;
        return ends.map((end) => {
            return start + end;
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvcmlwZ3JlcFRleHRTZWFyY2hFbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUNOLDBCQUEwQixFQUcxQixXQUFXLEVBQ1gsZUFBZSxFQUNmLG9CQUFvQixFQUNwQixlQUFlLEdBQ2YsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQ04sS0FBSyxFQUVMLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FJaEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQWdCLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDeEMsT0FBTyxFQUNOLFVBQVUsRUFHVixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0seUJBQXlCLENB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