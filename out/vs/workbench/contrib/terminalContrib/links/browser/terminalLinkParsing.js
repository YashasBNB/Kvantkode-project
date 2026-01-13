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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUGFyc2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rUGFyc2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7OztHQUlHO0FBRUgsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBc0J6RDs7O0dBR0c7QUFDSCxNQUFNLGtCQUFrQixHQUFHLElBQUksSUFBSSxDQUFTLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDaEY7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBRyxJQUFJLElBQUksQ0FBUyxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBRTlFLFNBQVMsdUJBQXVCLENBQUMsT0FBZ0I7SUFDaEQsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ1YsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ1YsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ1gsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ1gsU0FBUyxDQUFDO1FBQ1QsT0FBTyxTQUFTLEVBQUUsRUFBRSxRQUFRLENBQUE7SUFDN0IsQ0FBQztJQUNELFNBQVMsQ0FBQztRQUNULE9BQU8sU0FBUyxFQUFFLEVBQUUsUUFBUSxDQUFBO0lBQzdCLENBQUM7SUFDRCxTQUFTLEVBQUU7UUFDVixPQUFPLFlBQVksR0FBRyxFQUFFLFFBQVEsQ0FBQTtJQUNqQyxDQUFDO0lBQ0QsU0FBUyxFQUFFO1FBQ1YsT0FBTyxZQUFZLEdBQUcsRUFBRSxRQUFRLENBQUE7SUFDakMsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFFcEMsMEZBQTBGO0lBQzFGLGNBQWM7SUFDZCxrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLGlCQUFpQjtJQUNqQixrQkFBa0I7SUFDbEIsa0JBQWtCO0lBQ2xCLEVBQUU7SUFDRiwrRUFBK0U7SUFDL0UsRUFBRTtJQUNGLGdFQUFnRTtJQUNoRSxNQUFNLHlCQUF5QixHQUFHO1FBQ2pDLFVBQVU7UUFDVixhQUFhO1FBQ2IsaUJBQWlCO1FBQ2pCLHFCQUFxQjtRQUNyQixhQUFhO1FBQ2IsVUFBVTtRQUNWLG9EQUFvRDtRQUNwRCxhQUFhO1FBQ2IsVUFBVTtRQUNWLG9EQUFvRDtRQUNwRCxhQUFhO1FBQ2Isb0RBQW9EO1FBQ3BELFlBQVk7UUFDWixlQUFlO1FBQ2YsZUFBZTtRQUNmLG1CQUFtQjtRQUNuQix1QkFBdUI7UUFDdkIscUJBQXFCLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEdBQUcsU0FBUztRQUMvRSxvREFBb0Q7UUFDcEQsbURBQW1EO1FBQ25ELDBCQUEwQjtRQUMxQiw2QkFBNkI7UUFDN0IsaUJBQWlCO1FBQ2pCLHlCQUF5QjtRQUN6Qiw0QkFBNEI7UUFDNUIsa0JBQWtCO1FBQ2xCLDBCQUEwQjtRQUMxQiw2QkFBNkI7UUFDN0Isb0JBQW9CO1FBQ3BCLDRCQUE0QjtRQUM1QiwrQkFBK0I7UUFDL0IsMkJBQTJCO1FBQzNCLG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsb0RBQW9EO1FBQ3BELG9EQUFvRDtRQUNwRCwrQkFBK0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLHVDQUF1QyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTTtZQUN2RyxTQUFTO1FBQ1YsZ0NBQWdDO1FBQ2hDLFdBQVc7UUFDWCxjQUFjO1FBQ2QsZUFBZTtRQUNmLFlBQVk7UUFDWixlQUFlO1FBQ2YsZ0JBQWdCO1FBQ2hCLGFBQWE7UUFDYixnQkFBZ0I7UUFDaEIsaUJBQWlCO1FBQ2pCLG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsZUFBZSxDQUFDLEVBQUUsZUFBZSxDQUFDLEVBQUUsWUFBWSxHQUFHLFNBQVM7S0FDNUQsQ0FBQTtJQUVELE1BQU0sWUFBWSxHQUFHLHlCQUF5QjtRQUM3Qyw0QkFBNEI7U0FDM0IsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNWLGtFQUFrRTtTQUNqRSxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksUUFBUSxJQUFJLENBQUMsQ0FBQTtJQUVqQyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksWUFBWSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ2xFLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBWTtJQUM1QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFBO0lBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3ZDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsSUFBWTtJQUNqRCxzQkFBc0I7SUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEMsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsSUFBWTtJQUM5QyxnR0FBZ0c7SUFDaEcsdURBQXVEO0lBQ3ZELElBQUksS0FBNkIsQ0FBQTtJQUNqQyxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFBO0lBQ2pDLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNuQyxPQUFPLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3JCLE1BQUs7UUFDTixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNyQixDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FBQyxJQUFZO0lBQ3pDLE9BQU8sWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUN6RCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUE2QjtJQUN6RCxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsTUFBTSxDQUFBO0lBQzVCLElBQUksQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxPQUFPO1FBQ04sR0FBRyxFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2hFLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQztRQUNoRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDNUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQzVFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7S0FDOUMsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEtBQXlCO0lBQ2xELElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxvR0FBb0c7QUFDcEcsOEZBQThGO0FBQzlGLG1HQUFtRztBQUNuRywwREFBMEQ7QUFDMUQsTUFBTSw0QkFBNEIsR0FBRyxvREFBb0QsQ0FBQTtBQUV6RixNQUFNLFVBQVUsV0FBVyxDQUFDLElBQVksRUFBRSxFQUFtQjtJQUM1RCxpREFBaUQ7SUFDakQsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFMUMseUZBQXlGO0lBQ3pGLE1BQU0sYUFBYSxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRCxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFFeEMsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFtQixFQUFFLFFBQXVCO0lBQ3JFLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUE7SUFDdkIsQ0FBQztJQUNELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7UUFDN0IsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLElBQW1CLEVBQUUsT0FBb0IsRUFBRSxHQUFXLEVBQUUsSUFBWTtJQUN6RixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQixPQUFNO0lBQ1AsQ0FBQztJQUNELElBQUksR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQ2hCLE9BQU07SUFDUCxDQUFDO0lBQ0QscURBQXFEO0lBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDeEMsSUFDQyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU07UUFDbEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDekMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzdELENBQUM7UUFDRiw0REFBNEQ7UUFDNUQsSUFDQyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU07WUFDbEIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO2dCQUNwRSxDQUFDLEdBQUcsS0FBSyxDQUFDO29CQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDakYsQ0FBQztZQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDL0MsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMzQyxDQUFDO1NBQU0sQ0FBQztRQUNQLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQVk7SUFDekMsTUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQTtJQUVqQyxzQ0FBc0M7SUFDdEMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDekMsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUMvQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzFFLElBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQixDQUFDLEtBQUssS0FBSyxTQUFTO1lBQ3JDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQzdCLENBQUM7WUFDRixJQUFJLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7WUFDNUMsSUFBSSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQTtZQUN4Qyx1RkFBdUY7WUFDdkYsV0FBVztZQUNYLElBQUksTUFBTSxHQUFrQyxTQUFTLENBQUE7WUFDckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQ25ELElBQUksV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxHQUFHO29CQUNSLEtBQUssRUFBRSxjQUFjO29CQUNyQixJQUFJLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNO2lCQUMvQixDQUFBO2dCQUNELElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRXpDLG1GQUFtRjtnQkFDbkYsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QixTQUFRO2dCQUNULENBQUM7Z0JBRUQsaUZBQWlGO2dCQUNqRixrRkFBa0Y7Z0JBQ2xGLGlDQUFpQztnQkFDakMsRUFBRTtnQkFDRixhQUFhO2dCQUNiLGFBQWE7Z0JBQ2IsdUJBQXVCO2dCQUN2QixFQUFFO2dCQUNGLHFFQUFxRTtnQkFDckUsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFDLElBQ0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQzt3QkFDbkMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzs0QkFDOUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ3JCLENBQUM7d0JBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO3dCQUM3RCxNQUFNLENBQUMsS0FBSyxJQUFJLGdCQUFnQixDQUFBO3dCQUNoQyxNQUFNLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTt3QkFDN0UsY0FBYyxJQUFJLGdCQUFnQixDQUFBO29CQUNuQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixJQUFJLEVBQUU7b0JBQ0wsS0FBSyxFQUFFLGNBQWMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztvQkFDbEQsSUFBSSxFQUFFLElBQUk7aUJBQ1Y7Z0JBQ0QsTUFBTTtnQkFDTixNQUFNO2FBQ04sQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxJQUFLLGtCQVlKO0FBWkQsV0FBSyxrQkFBa0I7SUFDdEIsNERBQXdDLENBQUE7SUFDeEMsaURBQTJCLENBQUE7SUFDM0IseUVBQXlFO0lBQ3pFLHFFQUFxRTtJQUNyRSxvRkFBOEQsQ0FBQTtJQUM5RCwrRkFBeUUsQ0FBQTtJQUV6RSx3REFBa0MsQ0FBQTtJQUNsQyw2REFBdUMsQ0FBQTtJQUN2Qyx5RkFBbUUsQ0FBQTtJQUNuRSxvR0FBOEUsQ0FBQTtBQUMvRSxDQUFDLEVBWkksa0JBQWtCLEtBQWxCLGtCQUFrQixRQVl0QjtBQUVEOzs7R0FHRztBQUNILE1BQU0sbUJBQW1CLEdBQ3hCLFFBQVE7SUFDUixrQkFBa0IsQ0FBQyxVQUFVO0lBQzdCLE1BQU07SUFDTixrQkFBa0IsQ0FBQyxpQ0FBaUM7SUFDcEQsa0JBQWtCLENBQUMsNEJBQTRCO0lBQy9DLFNBQVM7SUFDVCxrQkFBa0IsQ0FBQyxtQkFBbUI7SUFDdEMsS0FBSztJQUNMLGtCQUFrQixDQUFDLDRCQUE0QjtJQUMvQyxPQUFPLENBQUE7QUFFUjs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsOENBQThDLENBQUE7QUFFNUU7OztHQUdHO0FBQ0gsTUFBTSxrQkFBa0IsR0FDdkIsUUFBUTtJQUNSLE1BQU0sY0FBYyxJQUFJLGtCQUFrQixDQUFDLGtCQUFrQixHQUFHO0lBQ2hFLE1BQU07SUFDTixrQkFBa0IsQ0FBQyxvQ0FBb0M7SUFDdkQsa0JBQWtCLENBQUMsK0JBQStCO0lBQ2xELFNBQVM7SUFDVCxrQkFBa0IsQ0FBQyxzQkFBc0I7SUFDekMsS0FBSztJQUNMLGtCQUFrQixDQUFDLCtCQUErQjtJQUNsRCxPQUFPLENBQUE7QUFFUixTQUFTLG1CQUFtQixDQUFDLElBQVksRUFBRSxFQUFtQjtJQUM3RCxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFBO0lBRWpDLE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUN2QixFQUFFLG9DQUE0QixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQ3pFLEdBQUcsQ0FDSCxDQUFBO0lBQ0QsSUFBSSxLQUFLLENBQUE7SUFDVCxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1QyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUN2QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxxRkFBcUY7WUFDckYsK0RBQStEO1lBQy9ELE1BQUs7UUFDTixDQUFDO1FBRUQseUVBQXlFO1FBQ3pFO1FBQ0MsZ0JBQWdCO1FBQ2hCLGdCQUFnQjtRQUNoQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQztZQUN6RSxpQ0FBaUM7WUFDakMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDbEYsQ0FBQztZQUNGLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLEtBQUssSUFBSSxDQUFDLENBQUE7UUFDWCxDQUFDO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNaLElBQUksRUFBRTtnQkFDTCxLQUFLO2dCQUNMLElBQUk7YUFDSjtZQUNELE1BQU0sRUFBRSxTQUFTO1lBQ2pCLE1BQU0sRUFBRSxTQUFTO1NBQ2pCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUMifQ==