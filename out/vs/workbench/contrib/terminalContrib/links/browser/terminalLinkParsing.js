/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This module is responsible for parsing possible links out of lines with only access to the line
 * text and the target operating system, ie. it does not do any validation that paths actually
 * exist.
 */
import { Lazy } from '../../../../../base/common/lazy.js';
/**
 * A regex that extracts the link suffix which contains line and column information. The link suffix
 * must terminate at the end of line.
 */
const linkSuffixRegexEol = new Lazy(() => generateLinkSuffixRegex(true));
/**
 * A regex that extracts the link suffix which contains line and column information.
 */
const linkSuffixRegex = new Lazy(() => generateLinkSuffixRegex(false));
function generateLinkSuffixRegex(eolOnly) {
    let ri = 0;
    let ci = 0;
    let rei = 0;
    let cei = 0;
    function r() {
        return `(?<row${ri++}>\\d+)`;
    }
    function c() {
        return `(?<col${ci++}>\\d+)`;
    }
    function re() {
        return `(?<rowEnd${rei++}>\\d+)`;
    }
    function ce() {
        return `(?<colEnd${cei++}>\\d+)`;
    }
    const eolSuffix = eolOnly ? '$' : '';
    // The comments in the regex below use real strings/numbers for better readability, here's
    // the legend:
    // - Path    = foo
    // - Row     = 339
    // - Col     = 12
    // - RowEnd  = 341
    // - ColEnd  = 789
    //
    // These all support single quote ' in the place of " and [] in the place of ()
    //
    // See the tests for an exhaustive list of all supported formats
    const lineAndColumnRegexClauses = [
        // foo:339
        // foo:339:12
        // foo:339:12-789
        // foo:339:12-341.789
        // foo:339.12
        // foo 339
        // foo 339:12                              [#140780]
        // foo 339.12
        // foo#339
        // foo#339:12                              [#190288]
        // foo#339.12
        // foo, 339                                [#217927]
        // "foo",339
        // "foo",339:12
        // "foo",339.12
        // "foo",339.12-789
        // "foo",339.12-341.789
        `(?::|#| |['"],|, )${r()}([:.]${c()}(?:-(?:${re()}\\.)?${ce()})?)?` + eolSuffix,
        // The quotes below are optional           [#171652]
        // "foo", line 339                         [#40468]
        // "foo", line 339, col 12
        // "foo", line 339, column 12
        // "foo":line 339
        // "foo":line 339, col 12
        // "foo":line 339, column 12
        // "foo": line 339
        // "foo": line 339, col 12
        // "foo": line 339, column 12
        // "foo" on line 339
        // "foo" on line 339, col 12
        // "foo" on line 339, column 12
        // "foo" line 339 column 12
        // "foo", line 339, character 12           [#171880]
        // "foo", line 339, characters 12-789      [#171880]
        // "foo", lines 339-341                    [#171880]
        // "foo", lines 339-341, characters 12-789 [#178287]
        `['"]?(?:,? |: ?| on )lines? ${r()}(?:-${re()})?(?:,? (?:col(?:umn)?|characters?) ${c()}(?:-${ce()})?)?` +
            eolSuffix,
        // () and [] are interchangeable
        // foo(339)
        // foo(339,12)
        // foo(339, 12)
        // foo (339)
        // foo (339,12)
        // foo (339, 12)
        // foo: (339)
        // foo: (339,12)
        // foo: (339, 12)
        // foo(339:12)                             [#229842]
        // foo (339:12)                            [#229842]
        `:? ?[\\[\\(]${r()}(?:(?:, ?|:)${c()})?[\\]\\)]` + eolSuffix,
    ];
    const suffixClause = lineAndColumnRegexClauses
        // Join all clauses together
        .join('|')
        // Convert spaces to allow the non-breaking space char (ascii 160)
        .replace(/ /g, `[${'\u00A0'} ]`);
    return new RegExp(`(${suffixClause})`, eolOnly ? undefined : 'g');
}
/**
 * Removes the optional link suffix which contains line and column information.
 * @param link The link to use.
 */
export function removeLinkSuffix(link) {
    const suffix = getLinkSuffix(link)?.suffix;
    if (!suffix) {
        return link;
    }
    return link.substring(0, suffix.index);
}
/**
 * Removes any query string from the link.
 * @param link The link to use.
 */
export function removeLinkQueryString(link) {
    // Skip ? in UNC paths
    const start = link.startsWith('\\\\?\\') ? 4 : 0;
    const index = link.indexOf('?', start);
    if (index === -1) {
        return link;
    }
    return link.substring(0, index);
}
export function detectLinkSuffixes(line) {
    // Find all suffixes on the line. Since the regex global flag is used, lastIndex will be updated
    // in place such that there are no overlapping matches.
    let match;
    const results = [];
    linkSuffixRegex.value.lastIndex = 0;
    while ((match = linkSuffixRegex.value.exec(line)) !== null) {
        const suffix = toLinkSuffix(match);
        if (suffix === null) {
            break;
        }
        results.push(suffix);
    }
    return results;
}
/**
 * Returns the optional link suffix which contains line and column information.
 * @param link The link to parse.
 */
export function getLinkSuffix(link) {
    return toLinkSuffix(linkSuffixRegexEol.value.exec(link));
}
export function toLinkSuffix(match) {
    const groups = match?.groups;
    if (!groups || match.length < 1) {
        return null;
    }
    return {
        row: parseIntOptional(groups.row0 || groups.row1 || groups.row2),
        col: parseIntOptional(groups.col0 || groups.col1 || groups.col2),
        rowEnd: parseIntOptional(groups.rowEnd0 || groups.rowEnd1 || groups.rowEnd2),
        colEnd: parseIntOptional(groups.colEnd0 || groups.colEnd1 || groups.colEnd2),
        suffix: { index: match.index, text: match[0] },
    };
}
function parseIntOptional(value) {
    if (value === undefined) {
        return value;
    }
    return parseInt(value);
}
// This defines valid path characters for a link with a suffix, the first `[]` of the regex includes
// characters the path is not allowed to _start_ with, the second `[]` includes characters not
// allowed at all in the path. If the characters show up in both regexes the link will stop at that
// character, otherwise it will stop at a space character.
const linkWithSuffixPathCharacters = /(?<path>(?:file:\/\/\/)?[^\s\|<>\[\({][^\s\|<>]*)$/;
export function detectLinks(line, os) {
    // 1: Detect all links on line via suffixes first
    const results = detectLinksViaSuffix(line);
    // 2: Detect all links without suffixes and merge non-conflicting ranges into the results
    const noSuffixPaths = detectPathsNoSuffix(line, os);
    binaryInsertList(results, noSuffixPaths);
    return results;
}
function binaryInsertList(list, newItems) {
    if (list.length === 0) {
        list.push(...newItems);
    }
    for (const item of newItems) {
        binaryInsert(list, item, 0, list.length);
    }
}
function binaryInsert(list, newItem, low, high) {
    if (list.length === 0) {
        list.push(newItem);
        return;
    }
    if (low > high) {
        return;
    }
    // Find the index where the newItem would be inserted
    const mid = Math.floor((low + high) / 2);
    if (mid >= list.length ||
        (newItem.path.index < list[mid].path.index &&
            (mid === 0 || newItem.path.index > list[mid - 1].path.index))) {
        // Check if it conflicts with an existing link before adding
        if (mid >= list.length ||
            (newItem.path.index + newItem.path.text.length < list[mid].path.index &&
                (mid === 0 ||
                    newItem.path.index > list[mid - 1].path.index + list[mid - 1].path.text.length))) {
            list.splice(mid, 0, newItem);
        }
        return;
    }
    if (newItem.path.index > list[mid].path.index) {
        binaryInsert(list, newItem, mid + 1, high);
    }
    else {
        binaryInsert(list, newItem, low, mid - 1);
    }
}
function detectLinksViaSuffix(line) {
    const results = [];
    // 1: Detect link suffixes on the line
    const suffixes = detectLinkSuffixes(line);
    for (const suffix of suffixes) {
        const beforeSuffix = line.substring(0, suffix.suffix.index);
        const possiblePathMatch = beforeSuffix.match(linkWithSuffixPathCharacters);
        if (possiblePathMatch &&
            possiblePathMatch.index !== undefined &&
            possiblePathMatch.groups?.path) {
            let linkStartIndex = possiblePathMatch.index;
            let path = possiblePathMatch.groups.path;
            // Extract a path prefix if it exists (not part of the path, but part of the underlined
            // section)
            let prefix = undefined;
            const prefixMatch = path.match(/^(?<prefix>['"]+)/);
            if (prefixMatch?.groups?.prefix) {
                prefix = {
                    index: linkStartIndex,
                    text: prefixMatch.groups.prefix,
                };
                path = path.substring(prefix.text.length);
                // Don't allow suffix links to be returned when the link itself is the empty string
                if (path.trim().length === 0) {
                    continue;
                }
                // If there are multiple characters in the prefix, trim the prefix if the _first_
                // suffix character is the same as the last prefix character. For example, for the
                // text `echo "'foo' on line 1"`:
                //
                // - Prefix='
                // - Path=foo
                // - Suffix=' on line 1
                //
                // If this fails on a multi-character prefix, just keep the original.
                if (prefixMatch.groups.prefix.length > 1) {
                    if (suffix.suffix.text[0].match(/['"]/) &&
                        prefixMatch.groups.prefix[prefixMatch.groups.prefix.length - 1] ===
                            suffix.suffix.text[0]) {
                        const trimPrefixAmount = prefixMatch.groups.prefix.length - 1;
                        prefix.index += trimPrefixAmount;
                        prefix.text = prefixMatch.groups.prefix[prefixMatch.groups.prefix.length - 1];
                        linkStartIndex += trimPrefixAmount;
                    }
                }
            }
            results.push({
                path: {
                    index: linkStartIndex + (prefix?.text.length || 0),
                    text: path,
                },
                prefix,
                suffix,
            });
        }
    }
    return results;
}
var RegexPathConstants;
(function (RegexPathConstants) {
    RegexPathConstants["PathPrefix"] = "(?:\\.\\.?|\\~|file://)";
    RegexPathConstants["PathSeparatorClause"] = "\\/";
    // '":; are allowed in paths but they are often separators so ignore them
    // Also disallow \\ to prevent a catastropic backtracking case #24795
    RegexPathConstants["ExcludedPathCharactersClause"] = "[^\\0<>\\?\\s!`&*()'\":;\\\\]";
    RegexPathConstants["ExcludedStartPathCharactersClause"] = "[^\\0<>\\?\\s!`&*()\\[\\]'\":;\\\\]";
    RegexPathConstants["WinOtherPathPrefix"] = "\\.\\.?|\\~";
    RegexPathConstants["WinPathSeparatorClause"] = "(?:\\\\|\\/)";
    RegexPathConstants["WinExcludedPathCharactersClause"] = "[^\\0<>\\?\\|\\/\\s!`&*()'\":;]";
    RegexPathConstants["WinExcludedStartPathCharactersClause"] = "[^\\0<>\\?\\|\\/\\s!`&*()\\[\\]'\":;]";
})(RegexPathConstants || (RegexPathConstants = {}));
/**
 * A regex that matches non-Windows paths, such as `/foo`, `~/foo`, `./foo`, `../foo` and
 * `foo/bar`.
 */
const unixLocalLinkClause = '(?:(?:' +
    RegexPathConstants.PathPrefix +
    '|(?:' +
    RegexPathConstants.ExcludedStartPathCharactersClause +
    RegexPathConstants.ExcludedPathCharactersClause +
    '*))?(?:' +
    RegexPathConstants.PathSeparatorClause +
    '(?:' +
    RegexPathConstants.ExcludedPathCharactersClause +
    ')+)+)';
/**
 * A regex clause that matches the start of an absolute path on Windows, such as: `C:`, `c:`,
 * `file:///c:` (uri) and `\\?\C:` (UNC path).
 */
export const winDrivePrefix = '(?:\\\\\\\\\\?\\\\|file:\\/\\/\\/)?[a-zA-Z]:';
/**
 * A regex that matches Windows paths, such as `\\?\c:\foo`, `c:\foo`, `~\foo`, `.\foo`, `..\foo`
 * and `foo\bar`.
 */
const winLocalLinkClause = '(?:(?:' +
    `(?:${winDrivePrefix}|${RegexPathConstants.WinOtherPathPrefix})` +
    '|(?:' +
    RegexPathConstants.WinExcludedStartPathCharactersClause +
    RegexPathConstants.WinExcludedPathCharactersClause +
    '*))?(?:' +
    RegexPathConstants.WinPathSeparatorClause +
    '(?:' +
    RegexPathConstants.WinExcludedPathCharactersClause +
    ')+)+)';
function detectPathsNoSuffix(line, os) {
    const results = [];
    const regex = new RegExp(os === 1 /* OperatingSystem.Windows */ ? winLocalLinkClause : unixLocalLinkClause, 'g');
    let match;
    while ((match = regex.exec(line)) !== null) {
        let text = match[0];
        let index = match.index;
        if (!text) {
            // Something matched but does not comply with the given match index, since this would
            // most likely a bug the regex itself we simply do nothing here
            break;
        }
        // Adjust the link range to exclude a/ and b/ if it looks like a git diff
        if (
        // --- a/foo/bar
        // +++ b/foo/bar
        ((line.startsWith('--- a/') || line.startsWith('+++ b/')) && index === 4) ||
            // diff --git a/foo/bar b/foo/bar
            (line.startsWith('diff --git') && (text.startsWith('a/') || text.startsWith('b/')))) {
            text = text.substring(2);
            index += 2;
        }
        results.push({
            path: {
                index,
                text,
            },
            prefix: undefined,
            suffix: undefined,
        });
    }
    return results;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUGFyc2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua1BhcnNpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7R0FJRztBQUVILE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQXNCekQ7OztHQUdHO0FBQ0gsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLElBQUksQ0FBUyxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBQ2hGOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQUcsSUFBSSxJQUFJLENBQVMsR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtBQUU5RSxTQUFTLHVCQUF1QixDQUFDLE9BQWdCO0lBQ2hELElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNWLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNWLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUNYLFNBQVMsQ0FBQztRQUNULE9BQU8sU0FBUyxFQUFFLEVBQUUsUUFBUSxDQUFBO0lBQzdCLENBQUM7SUFDRCxTQUFTLENBQUM7UUFDVCxPQUFPLFNBQVMsRUFBRSxFQUFFLFFBQVEsQ0FBQTtJQUM3QixDQUFDO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsT0FBTyxZQUFZLEdBQUcsRUFBRSxRQUFRLENBQUE7SUFDakMsQ0FBQztJQUNELFNBQVMsRUFBRTtRQUNWLE9BQU8sWUFBWSxHQUFHLEVBQUUsUUFBUSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENB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