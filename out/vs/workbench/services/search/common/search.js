/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mapArrayOrNot } from '../../../../base/common/arrays.js';
import * as glob from '../../../../base/common/glob.js';
import * as objects from '../../../../base/common/objects.js';
import * as extpath from '../../../../base/common/extpath.js';
import { fuzzyContains, getNLines } from '../../../../base/common/strings.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import * as paths from '../../../../base/common/path.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { TextSearchCompleteMessageType } from './searchExtTypes.js';
import { isThenable } from '../../../../base/common/async.js';
export { TextSearchCompleteMessageType };
export const VIEWLET_ID = 'workbench.view.search';
export const PANEL_ID = 'workbench.panel.search';
export const VIEW_ID = 'workbench.view.search';
export const SEARCH_RESULT_LANGUAGE_ID = 'search-result';
export const SEARCH_EXCLUDE_CONFIG = 'search.exclude';
export const DEFAULT_MAX_SEARCH_RESULTS = 20000;
// Warning: this pattern is used in the search editor to detect offsets. If you
// change this, also change the search-result built-in extension
const SEARCH_ELIDED_PREFIX = '⟪ ';
const SEARCH_ELIDED_SUFFIX = ' characters skipped ⟫';
const SEARCH_ELIDED_MIN_LEN = (SEARCH_ELIDED_PREFIX.length + SEARCH_ELIDED_SUFFIX.length + 5) * 2;
export const ISearchService = createDecorator('searchService');
/**
 * TODO@roblou - split text from file search entirely, or share code in a more natural way.
 */
export var SearchProviderType;
(function (SearchProviderType) {
    SearchProviderType[SearchProviderType["file"] = 0] = "file";
    SearchProviderType[SearchProviderType["text"] = 1] = "text";
    SearchProviderType[SearchProviderType["aiText"] = 2] = "aiText";
})(SearchProviderType || (SearchProviderType = {}));
export var QueryType;
(function (QueryType) {
    QueryType[QueryType["File"] = 1] = "File";
    QueryType[QueryType["Text"] = 2] = "Text";
    QueryType[QueryType["aiText"] = 3] = "aiText";
})(QueryType || (QueryType = {}));
export function resultIsMatch(result) {
    return !!result.rangeLocations && !!result.previewText;
}
export function isFileMatch(p) {
    return !!p.resource;
}
export function isProgressMessage(p) {
    return !!p.message;
}
export var SearchCompletionExitCode;
(function (SearchCompletionExitCode) {
    SearchCompletionExitCode[SearchCompletionExitCode["Normal"] = 0] = "Normal";
    SearchCompletionExitCode[SearchCompletionExitCode["NewSearchStarted"] = 1] = "NewSearchStarted";
})(SearchCompletionExitCode || (SearchCompletionExitCode = {}));
export class FileMatch {
    constructor(resource) {
        this.resource = resource;
        this.results = [];
        // empty
    }
}
export class TextSearchMatch {
    constructor(text, ranges, previewOptions, webviewIndex) {
        this.rangeLocations = [];
        this.webviewIndex = webviewIndex;
        // Trim preview if this is one match and a single-line match with a preview requested.
        // Otherwise send the full text, like for replace or for showing multiple previews.
        // TODO this is fishy.
        const rangesArr = Array.isArray(ranges) ? ranges : [ranges];
        if (previewOptions && previewOptions.matchLines === 1 && isSingleLineRangeList(rangesArr)) {
            // 1 line preview requested
            text = getNLines(text, previewOptions.matchLines);
            let result = '';
            let shift = 0;
            let lastEnd = 0;
            const leadingChars = Math.floor(previewOptions.charsPerLine / 5);
            for (const range of rangesArr) {
                const previewStart = Math.max(range.startColumn - leadingChars, 0);
                const previewEnd = range.startColumn + previewOptions.charsPerLine;
                if (previewStart > lastEnd + leadingChars + SEARCH_ELIDED_MIN_LEN) {
                    const elision = SEARCH_ELIDED_PREFIX + (previewStart - lastEnd) + SEARCH_ELIDED_SUFFIX;
                    result += elision + text.slice(previewStart, previewEnd);
                    shift += previewStart - (lastEnd + elision.length);
                }
                else {
                    result += text.slice(lastEnd, previewEnd);
                }
                lastEnd = previewEnd;
                this.rangeLocations.push({
                    source: range,
                    preview: new OneLineRange(0, range.startColumn - shift, range.endColumn - shift),
                });
            }
            this.previewText = result;
        }
        else {
            const firstMatchLine = Array.isArray(ranges)
                ? ranges[0].startLineNumber
                : ranges.startLineNumber;
            const rangeLocs = mapArrayOrNot(ranges, (r) => ({
                preview: new SearchRange(r.startLineNumber - firstMatchLine, r.startColumn, r.endLineNumber - firstMatchLine, r.endColumn),
                source: r,
            }));
            this.rangeLocations = Array.isArray(rangeLocs) ? rangeLocs : [rangeLocs];
            this.previewText = text;
        }
    }
}
function isSingleLineRangeList(ranges) {
    const line = ranges[0].startLineNumber;
    for (const r of ranges) {
        if (r.startLineNumber !== line || r.endLineNumber !== line) {
            return false;
        }
    }
    return true;
}
export class SearchRange {
    constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
    }
}
export class OneLineRange extends SearchRange {
    constructor(lineNumber, startColumn, endColumn) {
        super(lineNumber, startColumn, lineNumber, endColumn);
    }
}
export var ViewMode;
(function (ViewMode) {
    ViewMode["List"] = "list";
    ViewMode["Tree"] = "tree";
})(ViewMode || (ViewMode = {}));
export var SearchSortOrder;
(function (SearchSortOrder) {
    SearchSortOrder["Default"] = "default";
    SearchSortOrder["FileNames"] = "fileNames";
    SearchSortOrder["Type"] = "type";
    SearchSortOrder["Modified"] = "modified";
    SearchSortOrder["CountDescending"] = "countDescending";
    SearchSortOrder["CountAscending"] = "countAscending";
})(SearchSortOrder || (SearchSortOrder = {}));
export function getExcludes(configuration, includeSearchExcludes = true) {
    const fileExcludes = configuration && configuration.files && configuration.files.exclude;
    const searchExcludes = includeSearchExcludes && configuration && configuration.search && configuration.search.exclude;
    if (!fileExcludes && !searchExcludes) {
        return undefined;
    }
    if (!fileExcludes || !searchExcludes) {
        return fileExcludes || searchExcludes || undefined;
    }
    let allExcludes = Object.create(null);
    // clone the config as it could be frozen
    allExcludes = objects.mixin(allExcludes, objects.deepClone(fileExcludes));
    allExcludes = objects.mixin(allExcludes, objects.deepClone(searchExcludes), true);
    return allExcludes;
}
export function pathIncludedInQuery(queryProps, fsPath) {
    if (queryProps.excludePattern && glob.match(queryProps.excludePattern, fsPath)) {
        return false;
    }
    if (queryProps.includePattern || queryProps.usingSearchPaths) {
        if (queryProps.includePattern && glob.match(queryProps.includePattern, fsPath)) {
            return true;
        }
        // If searchPaths are being used, the extra file must be in a subfolder and match the pattern, if present
        if (queryProps.usingSearchPaths) {
            return (!!queryProps.folderQueries &&
                queryProps.folderQueries.some((fq) => {
                    const searchPath = fq.folder.fsPath;
                    if (extpath.isEqualOrParent(fsPath, searchPath)) {
                        const relPath = paths.relative(searchPath, fsPath);
                        return !fq.includePattern || !!glob.match(fq.includePattern, relPath);
                    }
                    else {
                        return false;
                    }
                }));
        }
        return false;
    }
    return true;
}
export var SearchErrorCode;
(function (SearchErrorCode) {
    SearchErrorCode[SearchErrorCode["unknownEncoding"] = 1] = "unknownEncoding";
    SearchErrorCode[SearchErrorCode["regexParseError"] = 2] = "regexParseError";
    SearchErrorCode[SearchErrorCode["globParseError"] = 3] = "globParseError";
    SearchErrorCode[SearchErrorCode["invalidLiteral"] = 4] = "invalidLiteral";
    SearchErrorCode[SearchErrorCode["rgProcessError"] = 5] = "rgProcessError";
    SearchErrorCode[SearchErrorCode["other"] = 6] = "other";
    SearchErrorCode[SearchErrorCode["canceled"] = 7] = "canceled";
})(SearchErrorCode || (SearchErrorCode = {}));
export class SearchError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export function deserializeSearchError(error) {
    const errorMsg = error.message;
    if (isCancellationError(error)) {
        return new SearchError(errorMsg, SearchErrorCode.canceled);
    }
    try {
        const details = JSON.parse(errorMsg);
        return new SearchError(details.message, details.code);
    }
    catch (e) {
        return new SearchError(errorMsg, SearchErrorCode.other);
    }
}
export function serializeSearchError(searchError) {
    const details = { message: searchError.message, code: searchError.code };
    return new Error(JSON.stringify(details));
}
export function isSerializedSearchComplete(arg) {
    if (arg.type === 'error') {
        return true;
    }
    else if (arg.type === 'success') {
        return true;
    }
    else {
        return false;
    }
}
export function isSerializedSearchSuccess(arg) {
    return arg.type === 'success';
}
export function isSerializedFileMatch(arg) {
    return !!arg.path;
}
export function isFilePatternMatch(candidate, filePatternToUse, fuzzy = true) {
    const pathToMatch = candidate.searchPath ? candidate.searchPath : candidate.relativePath;
    return fuzzy
        ? fuzzyContains(pathToMatch, filePatternToUse)
        : glob.match(filePatternToUse, pathToMatch);
}
export class SerializableFileMatch {
    constructor(path) {
        this.path = path;
        this.results = [];
    }
    addMatch(match) {
        this.results.push(match);
    }
    serialize() {
        return {
            path: this.path,
            results: this.results,
            numMatches: this.results.length,
        };
    }
}
/**
 *  Computes the patterns that the provider handles. Discards sibling clauses and 'false' patterns
 */
export function resolvePatternsForProvider(globalPattern, folderPattern) {
    const merged = {
        ...(globalPattern || {}),
        ...(folderPattern || {}),
    };
    return Object.keys(merged).filter((key) => {
        const value = merged[key];
        return typeof value === 'boolean' && value;
    });
}
export class QueryGlobTester {
    constructor(config, folderQuery) {
        this._parsedIncludeExpression = null;
        // todo: try to incorporate folderQuery.excludePattern.folder if available
        this._excludeExpression =
            folderQuery.excludePattern?.map((excludePattern) => {
                return {
                    ...(config.excludePattern || {}),
                    ...(excludePattern.pattern || {}),
                };
            }) ?? [];
        if (this._excludeExpression.length === 0) {
            // even if there are no folderQueries, we want to observe  the global excludes
            this._excludeExpression = [config.excludePattern || {}];
        }
        this._parsedExcludeExpression = this._excludeExpression.map((e) => glob.parse(e));
        // Empty includeExpression means include nothing, so no {} shortcuts
        let includeExpression = config.includePattern;
        if (folderQuery.includePattern) {
            if (includeExpression) {
                includeExpression = {
                    ...includeExpression,
                    ...folderQuery.includePattern,
                };
            }
            else {
                includeExpression = folderQuery.includePattern;
            }
        }
        if (includeExpression) {
            this._parsedIncludeExpression = glob.parse(includeExpression);
        }
    }
    _evalParsedExcludeExpression(testPath, basename, hasSibling) {
        // todo: less hacky way of evaluating sync vs async sibling clauses
        let result = null;
        for (const folderExclude of this._parsedExcludeExpression) {
            // find first non-null result
            const evaluation = folderExclude(testPath, basename, hasSibling);
            if (typeof evaluation === 'string') {
                result = evaluation;
                break;
            }
        }
        return result;
    }
    matchesExcludesSync(testPath, basename, hasSibling) {
        if (this._parsedExcludeExpression &&
            this._evalParsedExcludeExpression(testPath, basename, hasSibling)) {
            return true;
        }
        return false;
    }
    /**
     * Guaranteed sync - siblingsFn should not return a promise.
     */
    includedInQuerySync(testPath, basename, hasSibling) {
        if (this._parsedExcludeExpression &&
            this._evalParsedExcludeExpression(testPath, basename, hasSibling)) {
            return false;
        }
        if (this._parsedIncludeExpression &&
            !this._parsedIncludeExpression(testPath, basename, hasSibling)) {
            return false;
        }
        return true;
    }
    /**
     * Evaluating the exclude expression is only async if it includes sibling clauses. As an optimization, avoid doing anything with Promises
     * unless the expression is async.
     */
    includedInQuery(testPath, basename, hasSibling) {
        const isIncluded = () => {
            return this._parsedIncludeExpression
                ? !!this._parsedIncludeExpression(testPath, basename, hasSibling)
                : true;
        };
        return Promise.all(this._parsedExcludeExpression.map((e) => {
            const excluded = e(testPath, basename, hasSibling);
            if (isThenable(excluded)) {
                return excluded.then((excluded) => {
                    if (excluded) {
                        return false;
                    }
                    return isIncluded();
                });
            }
            return isIncluded();
        })).then((e) => e.some((e) => !!e));
    }
    hasSiblingExcludeClauses() {
        return this._excludeExpression.reduce((prev, curr) => hasSiblingClauses(curr) || prev, false);
    }
}
function hasSiblingClauses(pattern) {
    for (const key in pattern) {
        if (typeof pattern[key] !== 'boolean') {
            return true;
        }
    }
    return false;
}
export function hasSiblingPromiseFn(siblingsFn) {
    if (!siblingsFn) {
        return undefined;
    }
    let siblings;
    return (name) => {
        if (!siblings) {
            siblings = (siblingsFn() || Promise.resolve([])).then((list) => (list ? listToMap(list) : {}));
        }
        return siblings.then((map) => !!map[name]);
    };
}
export function hasSiblingFn(siblingsFn) {
    if (!siblingsFn) {
        return undefined;
    }
    let siblings;
    return (name) => {
        if (!siblings) {
            const list = siblingsFn();
            siblings = list ? listToMap(list) : {};
        }
        return !!siblings[name];
    };
}
function listToMap(list) {
    const map = {};
    for (const key of list) {
        map[key] = true;
    }
    return map;
}
export function excludeToGlobPattern(excludesForFolder) {
    return excludesForFolder.flatMap((exclude) => exclude.patterns.map((pattern) => {
        return exclude.baseUri
            ? {
                baseUri: exclude.baseUri,
                pattern: pattern,
            }
            : pattern;
    }));
}
export const DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS = {
    matchLines: 100,
    charsPerLine: 10000,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vc2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVqRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUc1RixPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBZSw2QkFBNkIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQTtBQUV4QyxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQUE7QUFDakQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFBO0FBQ2hELE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQTtBQUM5QyxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQUE7QUFFeEQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZ0JBQWdCLENBQUE7QUFDckQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsS0FB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