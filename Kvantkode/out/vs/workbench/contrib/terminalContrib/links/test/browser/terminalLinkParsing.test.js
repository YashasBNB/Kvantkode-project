/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { detectLinks, detectLinkSuffixes, getLinkSuffix, removeLinkQueryString, removeLinkSuffix, } from '../../browser/terminalLinkParsing.js';
const operatingSystems = [
    3 /* OperatingSystem.Linux */,
    2 /* OperatingSystem.Macintosh */,
    1 /* OperatingSystem.Windows */,
];
const osTestPath = {
    [3 /* OperatingSystem.Linux */]: '/test/path/linux',
    [2 /* OperatingSystem.Macintosh */]: '/test/path/macintosh',
    [1 /* OperatingSystem.Windows */]: 'C:\\test\\path\\windows',
};
const osLabel = {
    [3 /* OperatingSystem.Linux */]: '[Linux]',
    [2 /* OperatingSystem.Macintosh */]: '[macOS]',
    [1 /* OperatingSystem.Windows */]: '[Windows]',
};
const testRow = 339;
const testCol = 12;
const testRowEnd = 341;
const testColEnd = 789;
const testLinks = [
    // Simple
    { link: 'foo', prefix: undefined, suffix: undefined, hasRow: false, hasCol: false },
    { link: 'foo:339', prefix: undefined, suffix: ':339', hasRow: true, hasCol: false },
    { link: 'foo:339:12', prefix: undefined, suffix: ':339:12', hasRow: true, hasCol: true },
    {
        link: 'foo:339:12-789',
        prefix: undefined,
        suffix: ':339:12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    { link: 'foo:339.12', prefix: undefined, suffix: ':339.12', hasRow: true, hasCol: true },
    {
        link: 'foo:339.12-789',
        prefix: undefined,
        suffix: ':339.12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    {
        link: 'foo:339.12-341.789',
        prefix: undefined,
        suffix: ':339.12-341.789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: true,
        hasColEnd: true,
    },
    { link: 'foo#339', prefix: undefined, suffix: '#339', hasRow: true, hasCol: false },
    { link: 'foo#339:12', prefix: undefined, suffix: '#339:12', hasRow: true, hasCol: true },
    {
        link: 'foo#339:12-789',
        prefix: undefined,
        suffix: '#339:12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    { link: 'foo#339.12', prefix: undefined, suffix: '#339.12', hasRow: true, hasCol: true },
    {
        link: 'foo#339.12-789',
        prefix: undefined,
        suffix: '#339.12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    {
        link: 'foo#339.12-341.789',
        prefix: undefined,
        suffix: '#339.12-341.789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: true,
        hasColEnd: true,
    },
    { link: 'foo 339', prefix: undefined, suffix: ' 339', hasRow: true, hasCol: false },
    { link: 'foo 339:12', prefix: undefined, suffix: ' 339:12', hasRow: true, hasCol: true },
    {
        link: 'foo 339:12-789',
        prefix: undefined,
        suffix: ' 339:12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    { link: 'foo 339.12', prefix: undefined, suffix: ' 339.12', hasRow: true, hasCol: true },
    {
        link: 'foo 339.12-789',
        prefix: undefined,
        suffix: ' 339.12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: false,
        hasColEnd: true,
    },
    {
        link: 'foo 339.12-341.789',
        prefix: undefined,
        suffix: ' 339.12-341.789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: true,
        hasColEnd: true,
    },
    { link: 'foo, 339', prefix: undefined, suffix: ', 339', hasRow: true, hasCol: false },
    // Double quotes
    { link: '"foo",339', prefix: '"', suffix: '",339', hasRow: true, hasCol: false },
    { link: '"foo",339:12', prefix: '"', suffix: '",339:12', hasRow: true, hasCol: true },
    { link: '"foo",339.12', prefix: '"', suffix: '",339.12', hasRow: true, hasCol: true },
    { link: '"foo", line 339', prefix: '"', suffix: '", line 339', hasRow: true, hasCol: false },
    {
        link: '"foo", line 339, col 12',
        prefix: '"',
        suffix: '", line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo", line 339, column 12',
        prefix: '"',
        suffix: '", line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: '"foo":line 339', prefix: '"', suffix: '":line 339', hasRow: true, hasCol: false },
    {
        link: '"foo":line 339, col 12',
        prefix: '"',
        suffix: '":line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo":line 339, column 12',
        prefix: '"',
        suffix: '":line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: '"foo": line 339', prefix: '"', suffix: '": line 339', hasRow: true, hasCol: false },
    {
        link: '"foo": line 339, col 12',
        prefix: '"',
        suffix: '": line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo": line 339, column 12',
        prefix: '"',
        suffix: '": line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: '"foo" on line 339', prefix: '"', suffix: '" on line 339', hasRow: true, hasCol: false },
    {
        link: '"foo" on line 339, col 12',
        prefix: '"',
        suffix: '" on line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo" on line 339, column 12',
        prefix: '"',
        suffix: '" on line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: '"foo" line 339', prefix: '"', suffix: '" line 339', hasRow: true, hasCol: false },
    {
        link: '"foo" line 339 column 12',
        prefix: '"',
        suffix: '" line 339 column 12',
        hasRow: true,
        hasCol: true,
    },
    // Single quotes
    { link: "'foo',339", prefix: "'", suffix: "',339", hasRow: true, hasCol: false },
    { link: "'foo',339:12", prefix: "'", suffix: "',339:12", hasRow: true, hasCol: true },
    { link: "'foo',339.12", prefix: "'", suffix: "',339.12", hasRow: true, hasCol: true },
    { link: "'foo', line 339", prefix: "'", suffix: "', line 339", hasRow: true, hasCol: false },
    {
        link: "'foo', line 339, col 12",
        prefix: "'",
        suffix: "', line 339, col 12",
        hasRow: true,
        hasCol: true,
    },
    {
        link: "'foo', line 339, column 12",
        prefix: "'",
        suffix: "', line 339, column 12",
        hasRow: true,
        hasCol: true,
    },
    { link: "'foo':line 339", prefix: "'", suffix: "':line 339", hasRow: true, hasCol: false },
    {
        link: "'foo':line 339, col 12",
        prefix: "'",
        suffix: "':line 339, col 12",
        hasRow: true,
        hasCol: true,
    },
    {
        link: "'foo':line 339, column 12",
        prefix: "'",
        suffix: "':line 339, column 12",
        hasRow: true,
        hasCol: true,
    },
    { link: "'foo': line 339", prefix: "'", suffix: "': line 339", hasRow: true, hasCol: false },
    {
        link: "'foo': line 339, col 12",
        prefix: "'",
        suffix: "': line 339, col 12",
        hasRow: true,
        hasCol: true,
    },
    {
        link: "'foo': line 339, column 12",
        prefix: "'",
        suffix: "': line 339, column 12",
        hasRow: true,
        hasCol: true,
    },
    { link: "'foo' on line 339", prefix: "'", suffix: "' on line 339", hasRow: true, hasCol: false },
    {
        link: "'foo' on line 339, col 12",
        prefix: "'",
        suffix: "' on line 339, col 12",
        hasRow: true,
        hasCol: true,
    },
    {
        link: "'foo' on line 339, column 12",
        prefix: "'",
        suffix: "' on line 339, column 12",
        hasRow: true,
        hasCol: true,
    },
    { link: "'foo' line 339", prefix: "'", suffix: "' line 339", hasRow: true, hasCol: false },
    {
        link: "'foo' line 339 column 12",
        prefix: "'",
        suffix: "' line 339 column 12",
        hasRow: true,
        hasCol: true,
    },
    // No quotes
    { link: 'foo, line 339', prefix: undefined, suffix: ', line 339', hasRow: true, hasCol: false },
    {
        link: 'foo, line 339, col 12',
        prefix: undefined,
        suffix: ', line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo, line 339, column 12',
        prefix: undefined,
        suffix: ', line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: 'foo:line 339', prefix: undefined, suffix: ':line 339', hasRow: true, hasCol: false },
    {
        link: 'foo:line 339, col 12',
        prefix: undefined,
        suffix: ':line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo:line 339, column 12',
        prefix: undefined,
        suffix: ':line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: 'foo: line 339', prefix: undefined, suffix: ': line 339', hasRow: true, hasCol: false },
    {
        link: 'foo: line 339, col 12',
        prefix: undefined,
        suffix: ': line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo: line 339, column 12',
        prefix: undefined,
        suffix: ': line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo on line 339',
        prefix: undefined,
        suffix: ' on line 339',
        hasRow: true,
        hasCol: false,
    },
    {
        link: 'foo on line 339, col 12',
        prefix: undefined,
        suffix: ' on line 339, col 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo on line 339, column 12',
        prefix: undefined,
        suffix: ' on line 339, column 12',
        hasRow: true,
        hasCol: true,
    },
    { link: 'foo line 339', prefix: undefined, suffix: ' line 339', hasRow: true, hasCol: false },
    {
        link: 'foo line 339 column 12',
        prefix: undefined,
        suffix: ' line 339 column 12',
        hasRow: true,
        hasCol: true,
    },
    // Parentheses
    { link: 'foo(339)', prefix: undefined, suffix: '(339)', hasRow: true, hasCol: false },
    { link: 'foo(339,12)', prefix: undefined, suffix: '(339,12)', hasRow: true, hasCol: true },
    { link: 'foo(339, 12)', prefix: undefined, suffix: '(339, 12)', hasRow: true, hasCol: true },
    { link: 'foo (339)', prefix: undefined, suffix: ' (339)', hasRow: true, hasCol: false },
    { link: 'foo (339,12)', prefix: undefined, suffix: ' (339,12)', hasRow: true, hasCol: true },
    { link: 'foo (339, 12)', prefix: undefined, suffix: ' (339, 12)', hasRow: true, hasCol: true },
    { link: 'foo: (339)', prefix: undefined, suffix: ': (339)', hasRow: true, hasCol: false },
    { link: 'foo: (339,12)', prefix: undefined, suffix: ': (339,12)', hasRow: true, hasCol: true },
    { link: 'foo: (339, 12)', prefix: undefined, suffix: ': (339, 12)', hasRow: true, hasCol: true },
    { link: 'foo(339:12)', prefix: undefined, suffix: '(339:12)', hasRow: true, hasCol: true },
    { link: 'foo (339:12)', prefix: undefined, suffix: ' (339:12)', hasRow: true, hasCol: true },
    // Square brackets
    { link: 'foo[339]', prefix: undefined, suffix: '[339]', hasRow: true, hasCol: false },
    { link: 'foo[339,12]', prefix: undefined, suffix: '[339,12]', hasRow: true, hasCol: true },
    { link: 'foo[339, 12]', prefix: undefined, suffix: '[339, 12]', hasRow: true, hasCol: true },
    { link: 'foo [339]', prefix: undefined, suffix: ' [339]', hasRow: true, hasCol: false },
    { link: 'foo [339,12]', prefix: undefined, suffix: ' [339,12]', hasRow: true, hasCol: true },
    { link: 'foo [339, 12]', prefix: undefined, suffix: ' [339, 12]', hasRow: true, hasCol: true },
    { link: 'foo: [339]', prefix: undefined, suffix: ': [339]', hasRow: true, hasCol: false },
    { link: 'foo: [339,12]', prefix: undefined, suffix: ': [339,12]', hasRow: true, hasCol: true },
    { link: 'foo: [339, 12]', prefix: undefined, suffix: ': [339, 12]', hasRow: true, hasCol: true },
    { link: 'foo[339:12]', prefix: undefined, suffix: '[339:12]', hasRow: true, hasCol: true },
    { link: 'foo [339:12]', prefix: undefined, suffix: ' [339:12]', hasRow: true, hasCol: true },
    // OCaml-style
    {
        link: '"foo", line 339, character 12',
        prefix: '"',
        suffix: '", line 339, character 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo", line 339, characters 12-789',
        prefix: '"',
        suffix: '", line 339, characters 12-789',
        hasRow: true,
        hasCol: true,
        hasColEnd: true,
    },
    {
        link: '"foo", lines 339-341',
        prefix: '"',
        suffix: '", lines 339-341',
        hasRow: true,
        hasCol: false,
        hasRowEnd: true,
    },
    {
        link: '"foo", lines 339-341, characters 12-789',
        prefix: '"',
        suffix: '", lines 339-341, characters 12-789',
        hasRow: true,
        hasCol: true,
        hasRowEnd: true,
        hasColEnd: true,
    },
    // Non-breaking space
    {
        link: 'foo\u00A0339:12',
        prefix: undefined,
        suffix: '\u00A0339:12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: '"foo" on line 339,\u00A0column 12',
        prefix: '"',
        suffix: '" on line 339,\u00A0column 12',
        hasRow: true,
        hasCol: true,
    },
    {
        link: "'foo' on line\u00A0339, column 12",
        prefix: "'",
        suffix: "' on line\u00A0339, column 12",
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo (339,\u00A012)',
        prefix: undefined,
        suffix: ' (339,\u00A012)',
        hasRow: true,
        hasCol: true,
    },
    {
        link: 'foo\u00A0[339, 12]',
        prefix: undefined,
        suffix: '\u00A0[339, 12]',
        hasRow: true,
        hasCol: true,
    },
];
const testLinksWithSuffix = testLinks.filter((e) => !!e.suffix);
suite('TerminalLinkParsing', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('removeLinkSuffix', () => {
        for (const testLink of testLinks) {
            test('`' + testLink.link + '`', () => {
                deepStrictEqual(removeLinkSuffix(testLink.link), testLink.suffix === undefined
                    ? testLink.link
                    : testLink.link.replace(testLink.suffix, ''));
            });
        }
    });
    suite('getLinkSuffix', () => {
        for (const testLink of testLinks) {
            test('`' + testLink.link + '`', () => {
                deepStrictEqual(getLinkSuffix(testLink.link), testLink.suffix === undefined
                    ? null
                    : {
                        row: testLink.hasRow ? testRow : undefined,
                        col: testLink.hasCol ? testCol : undefined,
                        rowEnd: testLink.hasRowEnd ? testRowEnd : undefined,
                        colEnd: testLink.hasColEnd ? testColEnd : undefined,
                        suffix: {
                            index: testLink.link.length - testLink.suffix.length,
                            text: testLink.suffix,
                        },
                    });
            });
        }
    });
    suite('detectLinkSuffixes', () => {
        for (const testLink of testLinks) {
            test('`' + testLink.link + '`', () => {
                deepStrictEqual(detectLinkSuffixes(testLink.link), testLink.suffix === undefined
                    ? []
                    : [
                        {
                            row: testLink.hasRow ? testRow : undefined,
                            col: testLink.hasCol ? testCol : undefined,
                            rowEnd: testLink.hasRowEnd ? testRowEnd : undefined,
                            colEnd: testLink.hasColEnd ? testColEnd : undefined,
                            suffix: {
                                index: testLink.link.length - testLink.suffix.length,
                                text: testLink.suffix,
                            },
                        },
                    ]);
            });
        }
        test('foo(1, 2) bar[3, 4] baz on line 5', () => {
            deepStrictEqual(detectLinkSuffixes('foo(1, 2) bar[3, 4] baz on line 5'), [
                {
                    col: 2,
                    row: 1,
                    rowEnd: undefined,
                    colEnd: undefined,
                    suffix: {
                        index: 3,
                        text: '(1, 2)',
                    },
                },
                {
                    col: 4,
                    row: 3,
                    rowEnd: undefined,
                    colEnd: undefined,
                    suffix: {
                        index: 13,
                        text: '[3, 4]',
                    },
                },
                {
                    col: undefined,
                    row: 5,
                    rowEnd: undefined,
                    colEnd: undefined,
                    suffix: {
                        index: 23,
                        text: ' on line 5',
                    },
                },
            ]);
        });
    });
    suite('removeLinkQueryString', () => {
        test('should remove any query string from the link', () => {
            strictEqual(removeLinkQueryString('?a=b'), '');
            strictEqual(removeLinkQueryString('foo?a=b'), 'foo');
            strictEqual(removeLinkQueryString('./foo?a=b'), './foo');
            strictEqual(removeLinkQueryString('/foo/bar?a=b'), '/foo/bar');
            strictEqual(removeLinkQueryString('foo?a=b?'), 'foo');
            strictEqual(removeLinkQueryString('foo?a=b&c=d'), 'foo');
        });
        test('should respect ? in UNC paths', () => {
            strictEqual(removeLinkQueryString('\\\\?\\foo?a=b'), '\\\\?\\foo');
        });
    });
    suite('detectLinks', () => {
        test('foo(1, 2) bar[3, 4] "baz" on line 5', () => {
            deepStrictEqual(detectLinks('foo(1, 2) bar[3, 4] "baz" on line 5', 3 /* OperatingSystem.Linux */), [
                {
                    path: {
                        index: 0,
                        text: 'foo',
                    },
                    prefix: undefined,
                    suffix: {
                        col: 2,
                        row: 1,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 3,
                            text: '(1, 2)',
                        },
                    },
                },
                {
                    path: {
                        index: 10,
                        text: 'bar',
                    },
                    prefix: undefined,
                    suffix: {
                        col: 4,
                        row: 3,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 13,
                            text: '[3, 4]',
                        },
                    },
                },
                {
                    path: {
                        index: 21,
                        text: 'baz',
                    },
                    prefix: {
                        index: 20,
                        text: '"',
                    },
                    suffix: {
                        col: undefined,
                        row: 5,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 24,
                            text: '" on line 5',
                        },
                    },
                },
            ]);
        });
        test('should extract the link prefix', () => {
            deepStrictEqual(detectLinks('"foo", line 5, col 6', 3 /* OperatingSystem.Linux */), [
                {
                    path: {
                        index: 1,
                        text: 'foo',
                    },
                    prefix: {
                        index: 0,
                        text: '"',
                    },
                    suffix: {
                        row: 5,
                        col: 6,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 4,
                            text: '", line 5, col 6',
                        },
                    },
                },
            ]);
        });
        test('should be smart about determining the link prefix when multiple prefix characters exist', () => {
            deepStrictEqual(detectLinks('echo \'"foo", line 5, col 6\'', 3 /* OperatingSystem.Linux */), [
                {
                    path: {
                        index: 7,
                        text: 'foo',
                    },
                    prefix: {
                        index: 6,
                        text: '"',
                    },
                    suffix: {
                        row: 5,
                        col: 6,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 10,
                            text: '", line 5, col 6',
                        },
                    },
                },
            ], 'The outer single quotes should be excluded from the link prefix and suffix');
        });
        test('should detect both suffix and non-suffix links on a single line', () => {
            deepStrictEqual(detectLinks('PS C:\\Github\\microsoft\\vscode> echo \'"foo", line 5, col 6\'', 1 /* OperatingSystem.Windows */), [
                {
                    path: {
                        index: 3,
                        text: 'C:\\Github\\microsoft\\vscode',
                    },
                    prefix: undefined,
                    suffix: undefined,
                },
                {
                    path: {
                        index: 38,
                        text: 'foo',
                    },
                    prefix: {
                        index: 37,
                        text: '"',
                    },
                    suffix: {
                        row: 5,
                        col: 6,
                        rowEnd: undefined,
                        colEnd: undefined,
                        suffix: {
                            index: 41,
                            text: '", line 5, col 6',
                        },
                    },
                },
            ]);
        });
        suite('"|"', () => {
            test('should exclude pipe characters from link paths', () => {
                deepStrictEqual(detectLinks('|C:\\Github\\microsoft\\vscode|', 1 /* OperatingSystem.Windows */), [
                    {
                        path: {
                            index: 1,
                            text: 'C:\\Github\\microsoft\\vscode',
                        },
                        prefix: undefined,
                        suffix: undefined,
                    },
                ]);
            });
            test('should exclude pipe characters from link paths with suffixes', () => {
                deepStrictEqual(detectLinks('|C:\\Github\\microsoft\\vscode:400|', 1 /* OperatingSystem.Windows */), [
                    {
                        path: {
                            index: 1,
                            text: 'C:\\Github\\microsoft\\vscode',
                        },
                        prefix: undefined,
                        suffix: {
                            col: undefined,
                            row: 400,
                            rowEnd: undefined,
                            colEnd: undefined,
                            suffix: {
                                index: 27,
                                text: ':400',
                            },
                        },
                    },
                ]);
            });
        });
        suite('"<>"', () => {
            for (const os of operatingSystems) {
                test(`should exclude bracket characters from link paths ${osLabel[os]}`, () => {
                    deepStrictEqual(detectLinks(`<${osTestPath[os]}<`, os), [
                        {
                            path: {
                                index: 1,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: undefined,
                        },
                    ]);
                    deepStrictEqual(detectLinks(`>${osTestPath[os]}>`, os), [
                        {
                            path: {
                                index: 1,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: undefined,
                        },
                    ]);
                });
                test(`should exclude bracket characters from link paths with suffixes ${osLabel[os]}`, () => {
                    deepStrictEqual(detectLinks(`<${osTestPath[os]}:400<`, os), [
                        {
                            path: {
                                index: 1,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: {
                                col: undefined,
                                row: 400,
                                rowEnd: undefined,
                                colEnd: undefined,
                                suffix: {
                                    index: 1 + osTestPath[os].length,
                                    text: ':400',
                                },
                            },
                        },
                    ]);
                    deepStrictEqual(detectLinks(`>${osTestPath[os]}:400>`, os), [
                        {
                            path: {
                                index: 1,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: {
                                col: undefined,
                                row: 400,
                                rowEnd: undefined,
                                colEnd: undefined,
                                suffix: {
                                    index: 1 + osTestPath[os].length,
                                    text: ':400',
                                },
                            },
                        },
                    ]);
                });
            }
        });
        suite('query strings', () => {
            for (const os of operatingSystems) {
                test(`should exclude query strings from link paths ${osLabel[os]}`, () => {
                    deepStrictEqual(detectLinks(`${osTestPath[os]}?a=b`, os), [
                        {
                            path: {
                                index: 0,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: undefined,
                        },
                    ]);
                    deepStrictEqual(detectLinks(`${osTestPath[os]}?a=b&c=d`, os), [
                        {
                            path: {
                                index: 0,
                                text: osTestPath[os],
                            },
                            prefix: undefined,
                            suffix: undefined,
                        },
                    ]);
                });
                test('should not detect links starting with ? within query strings that contain posix-style paths (#204195)', () => {
                    // ? appended to the cwd will exist since it's just the cwd
                    strictEqual(detectLinks(`http://foo.com/?bar=/a/b&baz=c`, os).some((e) => e.path.text.startsWith('?')), false);
                });
                test('should not detect links starting with ? within query strings that contain Windows-style paths (#204195)', () => {
                    // ? appended to the cwd will exist since it's just the cwd
                    strictEqual(detectLinks(`http://foo.com/?bar=a:\\b&baz=c`, os).some((e) => e.path.text.startsWith('?')), false);
                });
            }
        });
        suite('should detect file names in git diffs', () => {
            test('--- a/foo/bar', () => {
                deepStrictEqual(detectLinks('--- a/foo/bar', 3 /* OperatingSystem.Linux */), [
                    {
                        path: {
                            index: 6,
                            text: 'foo/bar',
                        },
                        prefix: undefined,
                        suffix: undefined,
                    },
                ]);
            });
            test('+++ b/foo/bar', () => {
                deepStrictEqual(detectLinks('+++ b/foo/bar', 3 /* OperatingSystem.Linux */), [
                    {
                        path: {
                            index: 6,
                            text: 'foo/bar',
                        },
                        prefix: undefined,
                        suffix: undefined,
                    },
                ]);
            });
            test('diff --git a/foo/bar b/foo/baz', () => {
                deepStrictEqual(detectLinks('diff --git a/foo/bar b/foo/baz', 3 /* OperatingSystem.Linux */), [
                    {
                        path: {
                            index: 13,
                            text: 'foo/bar',
                        },
                        prefix: undefined,
                        suffix: undefined,
                    },
                    {
                        path: {
                            index: 23,
                            text: 'foo/baz',
                        },
                        prefix: undefined,
                        suffix: undefined,
                    },
                ]);
            });
        });
        suite('should detect 3 suffix links on a single line', () => {
            for (let i = 0; i < testLinksWithSuffix.length - 2; i++) {
                const link1 = testLinksWithSuffix[i];
                const link2 = testLinksWithSuffix[i + 1];
                const link3 = testLinksWithSuffix[i + 2];
                const line = ` ${link1.link} ${link2.link} ${link3.link} `;
                test('`' + line.replaceAll('\u00A0', '<nbsp>') + '`', () => {
                    strictEqual(detectLinks(line, 3 /* OperatingSystem.Linux */).length, 3);
                    ok(link1.suffix);
                    ok(link2.suffix);
                    ok(link3.suffix);
                    const detectedLink1 = {
                        prefix: link1.prefix
                            ? {
                                index: 1,
                                text: link1.prefix,
                            }
                            : undefined,
                        path: {
                            index: 1 + (link1.prefix?.length ?? 0),
                            text: link1.link.replace(link1.suffix, '').replace(link1.prefix || '', ''),
                        },
                        suffix: {
                            row: link1.hasRow ? testRow : undefined,
                            col: link1.hasCol ? testCol : undefined,
                            rowEnd: link1.hasRowEnd ? testRowEnd : undefined,
                            colEnd: link1.hasColEnd ? testColEnd : undefined,
                            suffix: {
                                index: 1 + (link1.link.length - link1.suffix.length),
                                text: link1.suffix,
                            },
                        },
                    };
                    const detectedLink2 = {
                        prefix: link2.prefix
                            ? {
                                index: (detectedLink1.prefix?.index ?? detectedLink1.path.index) +
                                    link1.link.length +
                                    1,
                                text: link2.prefix,
                            }
                            : undefined,
                        path: {
                            index: (detectedLink1.prefix?.index ?? detectedLink1.path.index) +
                                link1.link.length +
                                1 +
                                (link2.prefix ?? '').length,
                            text: link2.link.replace(link2.suffix, '').replace(link2.prefix ?? '', ''),
                        },
                        suffix: {
                            row: link2.hasRow ? testRow : undefined,
                            col: link2.hasCol ? testCol : undefined,
                            rowEnd: link2.hasRowEnd ? testRowEnd : undefined,
                            colEnd: link2.hasColEnd ? testColEnd : undefined,
                            suffix: {
                                index: (detectedLink1.prefix?.index ?? detectedLink1.path.index) +
                                    link1.link.length +
                                    1 +
                                    (link2.link.length - link2.suffix.length),
                                text: link2.suffix,
                            },
                        },
                    };
                    const detectedLink3 = {
                        prefix: link3.prefix
                            ? {
                                index: (detectedLink2.prefix?.index ?? detectedLink2.path.index) +
                                    link2.link.length +
                                    1,
                                text: link3.prefix,
                            }
                            : undefined,
                        path: {
                            index: (detectedLink2.prefix?.index ?? detectedLink2.path.index) +
                                link2.link.length +
                                1 +
                                (link3.prefix ?? '').length,
                            text: link3.link.replace(link3.suffix, '').replace(link3.prefix ?? '', ''),
                        },
                        suffix: {
                            row: link3.hasRow ? testRow : undefined,
                            col: link3.hasCol ? testCol : undefined,
                            rowEnd: link3.hasRowEnd ? testRowEnd : undefined,
                            colEnd: link3.hasColEnd ? testColEnd : undefined,
                            suffix: {
                                index: (detectedLink2.prefix?.index ?? detectedLink2.path.index) +
                                    link2.link.length +
                                    1 +
                                    (link3.link.length - link3.suffix.length),
                                text: link3.suffix,
                            },
                        },
                    };
                    deepStrictEqual(detectLinks(line, 3 /* OperatingSystem.Linux */), [
                        detectedLink1,
                        detectedLink2,
                        detectedLink3,
                    ]);
                });
            }
        });
        suite('should ignore links with suffixes when the path itself is the empty string', () => {
            deepStrictEqual(detectLinks('""",1', 3 /* OperatingSystem.Linux */), []);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUGFyc2luZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL3Rlcm1pbmFsTGlua1BhcnNpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFFekQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUNOLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsYUFBYSxFQUViLHFCQUFxQixFQUNyQixnQkFBZ0IsR0FDaEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQWE3QyxNQUFNLGdCQUFnQixHQUFtQzs7OztDQUl4RCxDQUFBO0FBQ0QsTUFBTSxVQUFVLEdBQWdEO0lBQy9ELCtCQUF1QixFQUFFLGtCQUFrQjtJQUMzQyxtQ0FBMkIsRUFBRSxzQkFBc0I7SUFDbkQsaUNBQXlCLEVBQUUseUJBQXlCO0NBQ3BELENBQUE7QUFDRCxNQUFNLE9BQU8sR0FBZ0Q7SUFDNUQsK0JBQXVCLEVBQUUsU0FBUztJQUNsQyxtQ0FBMkIsRUFBRSxTQUFTO0lBQ3RDLGlDQUF5QixFQUFFLFdBQVc7Q0FDdEMsQ0FBQTtBQUVELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQTtBQUNuQixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUE7QUFDbEIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFBO0FBQ3RCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQTtBQUN0QixNQUFNLFNBQVMsR0FBZ0I7SUFDOUIsU0FBUztJQUNULEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFF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LElBQUk7S0FDWjtJQUVELGNBQWM7SUFDZCxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUNyRixFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUMxRixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUM1RixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUN2RixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUM1RixFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUM5RixFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUN6RixFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUM5RixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0lBQ2hHLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0lBQzFGLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO0lBRTVGLGtCQUFrQjtJQUNsQixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUNyRixFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUMxRixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUM1RixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtJQUN2RixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFF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