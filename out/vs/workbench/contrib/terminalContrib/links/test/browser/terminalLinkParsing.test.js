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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUGFyc2luZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExpbmtQYXJzaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBRXpELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFDTixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGFBQWEsRUFFYixxQkFBcUIsRUFDckIsZ0JBQWdCLEdBQ2hCLE1BQU0sc0NBQXNDLENBQUE7QUFhN0MsTUFBTSxnQkFBZ0IsR0FBbUM7Ozs7Q0FJeEQsQ0FBQTtBQUNELE1BQU0sVUFBVSxHQUFnRDtJQUMvRCwrQkFBdUIsRUFBRSxrQkFBa0I7SUFDM0MsbUNBQTJCLEVBQUUsc0JBQXNCO0lBQ25ELGlDQUF5QixFQUFFLHlCQUF5QjtDQUNwRCxDQUFBO0FBQ0QsTUFBTSxPQUFPLEdBQWdEO0lBQzVELCtCQUF1QixFQUFFLFNBQVM7SUFDbEMsbUNBQTJCLEVBQUUsU0FBUztJQUN0QyxpQ0FBeUIsRUFBRSxXQUFXO0NBQ3RDLENBQUE7QUFFRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUE7QUFDbkIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFBO0FBQ2xCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQTtBQUN0QixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUE7QUFDdEIsTUFBTSxTQUFTLEdBQWdCO0lBQzlCLFNBQVM7SUFDVCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFN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O0tBQ1o7SUFFRCxjQUFjO0lBQ2QsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDckYsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDMUYsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDdkYsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDOUYsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDekYsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDOUYsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUNoRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUMxRixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUU1RixrQkFBa0I7SUFDbEIsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDckYsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDMUYsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDdkYsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDOUYsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7SUFDekYsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7SUFDOUYsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUNoRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUMxRixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUU1RixjQUFjO0lBQ2Q7UUFDQyxJQUFJLEVBQUUsK0JBQStCO1FBQ3JDLE1BQU0sRUFBRSxHQUFHO1FBQ1gsTUFBTSxFQUFFLDJCQUEyQjtRQUNuQyxNQUFNLEVBQUUsSUFBSTtRQUNaLE1BQU0sRUFBRSxJQUFJO0tBQ1o7SUFDRDtRQUNDLElBQUksRUFBRSxvQ0FBb0M7UUFDMUMsTUFBTSxFQUFFLEdBQUc7UUFDWCxNQUFNLEVBQUUsZ0NBQWdDO1FBQ3hDLE1BQU0sRUFBRSxJQUFJO1FBQ1osTUFBTSxFQUFFLElBQUk7UUFDWixTQUFTLEVBQUUsSUFBSTtLQUNmO0lBQ0Q7UUFDQyxJQUFJLEVBQUUsc0JBQXNCO1FBQzVCLE1BQU0sRUFBRSxHQUFHO1FBQ1gsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixNQUFNLEVBQUUsSUFBSTtRQUNaLE1BQU0sRUFBRSxLQUFLO1FBQ2IsU0FBUyxFQUFFLElBQUk7S0FDZjtJQUNEO1FBQ0MsSUFBSSxFQUFFLHlDQUF5QztRQUMvQyxNQUFNLEVBQUUsR0FBRztRQUNYLE1BQU0sRUFBRSxxQ0FBcUM7UUFDN0MsTUFBTSxFQUFFLElBQUk7UUFDWixNQUFNLEVBQUUsSUFBSTtRQUNaLFNBQVMsRUFBRSxJQUFJO1FBQ2YsU0FBUyxFQUFFLElBQUk7S0FDZjtJQUVELHFCQUFxQjtJQUNyQjtRQUNDLElBQUksRUFBRSxpQkFBaUI7UUFDdkIsTUFBTSxFQUFFLFNBQVM7UUFDakIsTUFBTSxFQUFFLGNBQWM7UUFDdEIsTUFBTSxFQUFFLElBQUk7UUFDWixNQUFNLEVBQUUsSUFBSTtLQUNaO0lBQ0Q7UUFDQyxJQUFJLEVBQUUsbUNBQW1DO1FBQ3pDLE1BQU0sRUFBRSxHQUFHO1FBQ1gsTUFBTSxFQUFFLCtCQUErQjtRQUN2QyxNQUFNLEVBQUUsSUFBSTtRQUNaLE1BQU0sRUFBRSxJQUFJO0tBQ1o7SUFDRDtRQUNDLElBQUksRUFBRSxtQ0FBbUM7UUFDekMsTUFBTSxFQUFFLEdBQUc7UUFDWCxNQUFNLEVBQUUsK0JBQStCO1FBQ3ZDLE1BQU0sRUFBRSxJQUFJO1FBQ1osTUFBTSxFQUFFLElBQUk7S0FDWjtJQUNEO1FBQ0MsSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixNQUFNLEVBQUUsU0FBUztRQUNqQixNQUFNLEVBQUUsaUJBQWlCO1FBQ3pCLE1BQU0sRUFBRSxJQUFJO1FBQ1osTUFBTSxFQUFFLElBQUk7S0FDWjtJQUNEO1FBQ0MsSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixNQUFNLEVBQUUsU0FBUztRQUNqQixNQUFNLEVBQUUsaUJBQWlCO1FBQ3pCLE1BQU0sRUFBRSxJQUFJO1FBQ1osTUFBTSxFQUFFLElBQUk7S0FDWjtDQUNELENBQUE7QUFDRCxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7QUFFL0QsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDcEMsZUFBZSxDQUNkLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFDL0IsUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTO29CQUM1QixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQzdDLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzNCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ3BDLGVBQWUsQ0FDZCxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUM1QixRQUFRLENBQUMsTUFBTSxLQUFLLFNBQVM7b0JBQzVCLENBQUMsQ0FBQyxJQUFJO29CQUNOLENBQUMsQ0FBRTt3QkFDRCxHQUFHLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUMxQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUMxQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUNuRCxNQUFNLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO3dCQUNuRCxNQUFNLEVBQUU7NEJBQ1AsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTTs0QkFDcEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNO3lCQUNyQjtxQkFDb0MsQ0FDeEMsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFO2dCQUNwQyxlQUFlLENBQ2Qsa0JBQWtCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUNqQyxRQUFRLENBQUMsTUFBTSxLQUFLLFNBQVM7b0JBQzVCLENBQUMsQ0FBQyxFQUFFO29CQUNKLENBQUMsQ0FBQzt3QkFDQTs0QkFDQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTOzRCQUMxQyxHQUFHLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTOzRCQUMxQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTOzRCQUNuRCxNQUFNLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTOzRCQUNuRCxNQUFNLEVBQUU7Z0NBQ1AsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTTtnQ0FDcEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNOzZCQUNyQjt5QkFDbUM7cUJBQ3JDLENBQ0gsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLG1DQUFtQyxDQUFDLEVBQUU7Z0JBQ3hFO29CQUNDLEdBQUcsRUFBRSxDQUFDO29CQUNOLEdBQUcsRUFBRSxDQUFDO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixNQUFNLEVBQUUsU0FBUztvQkFDakIsTUFBTSxFQUFFO3dCQUNQLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSxRQUFRO3FCQUNkO2lCQUNEO2dCQUNEO29CQUNDLEdBQUcsRUFBRSxDQUFDO29CQUNOLEdBQUcsRUFBRSxDQUFDO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixNQUFNLEVBQUUsU0FBUztvQkFDakIsTUFBTSxFQUFFO3dCQUNQLEtBQUssRUFBRSxFQUFFO3dCQUNULElBQUksRUFBRSxRQUFRO3FCQUNkO2lCQUNEO2dCQUNEO29CQUNDLEdBQUcsRUFBRSxTQUFTO29CQUNkLEdBQUcsRUFBRSxDQUFDO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixNQUFNLEVBQUUsU0FBUztvQkFDakIsTUFBTSxFQUFFO3dCQUNQLEtBQUssRUFBRSxFQUFFO3dCQUNULElBQUksRUFBRSxZQUFZO3FCQUNsQjtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDRixLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7WUFDekQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzlDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDeEQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzlELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNyRCxXQUFXLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ25FLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDRixLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN6QixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELGVBQWUsQ0FBQyxXQUFXLENBQUMscUNBQXFDLGdDQUF3QixFQUFFO2dCQUMxRjtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLENBQUM7d0JBQ1IsSUFBSSxFQUFFLEtBQUs7cUJBQ1g7b0JBQ0QsTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLE1BQU0sRUFBRTt3QkFDUCxHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQzt3QkFDTixNQUFNLEVBQUUsU0FBUzt3QkFDakIsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRTs0QkFDUCxLQUFLLEVBQUUsQ0FBQzs0QkFDUixJQUFJLEVBQUUsUUFBUTt5QkFDZDtxQkFDRDtpQkFDRDtnQkFDRDtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLEVBQUU7d0JBQ1QsSUFBSSxFQUFFLEtBQUs7cUJBQ1g7b0JBQ0QsTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLE1BQU0sRUFBRTt3QkFDUCxHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQzt3QkFDTixNQUFNLEVBQUUsU0FBUzt3QkFDakIsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRTs0QkFDUCxLQUFLLEVBQUUsRUFBRTs0QkFDVCxJQUFJLEVBQUUsUUFBUTt5QkFDZDtxQkFDRDtpQkFDRDtnQkFDRDtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLEVBQUU7d0JBQ1QsSUFBSSxFQUFFLEtBQUs7cUJBQ1g7b0JBQ0QsTUFBTSxFQUFFO3dCQUNQLEtBQUssRUFBRSxFQUFFO3dCQUNULElBQUksRUFBRSxHQUFHO3FCQUNUO29CQUNELE1BQU0sRUFBRTt3QkFDUCxHQUFHLEVBQUUsU0FBUzt3QkFDZCxHQUFHLEVBQUUsQ0FBQzt3QkFDTixNQUFNLEVBQUUsU0FBUzt3QkFDakIsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRTs0QkFDUCxLQUFLLEVBQUUsRUFBRTs0QkFDVCxJQUFJLEVBQUUsYUFBYTt5QkFDbkI7cUJBQ0Q7aUJBQ0Q7YUFDZ0IsQ0FBQyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxlQUFlLENBQUMsV0FBVyxDQUFDLHNCQUFzQixnQ0FBd0IsRUFBRTtnQkFDM0U7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSxLQUFLO3FCQUNYO29CQUNELE1BQU0sRUFBRTt3QkFDUCxLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsR0FBRztxQkFDVDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7d0JBQ04sTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3dCQUNqQixNQUFNLEVBQUU7NEJBQ1AsS0FBSyxFQUFFLENBQUM7NEJBQ1IsSUFBSSxFQUFFLGtCQUFrQjt5QkFDeEI7cUJBQ0Q7aUJBQ0Q7YUFDZ0IsQ0FBQyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHlGQUF5RixFQUFFLEdBQUcsRUFBRTtZQUNwRyxlQUFlLENBQ2QsV0FBVyxDQUFDLCtCQUErQixnQ0FBd0IsRUFDbkU7Z0JBQ0M7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSxLQUFLO3FCQUNYO29CQUNELE1BQU0sRUFBRTt3QkFDUCxLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsR0FBRztxQkFDVDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7d0JBQ04sTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3dCQUNqQixNQUFNLEVBQUU7NEJBQ1AsS0FBSyxFQUFFLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLGtCQUFrQjt5QkFDeEI7cUJBQ0Q7aUJBQ0Q7YUFDZ0IsRUFDbEIsNEVBQTRFLENBQzVFLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxHQUFHLEVBQUU7WUFDNUUsZUFBZSxDQUNkLFdBQVcsQ0FDVixpRUFBaUUsa0NBRWpFLEVBQ0Q7Z0JBQ0M7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSwrQkFBK0I7cUJBQ3JDO29CQUNELE1BQU0sRUFBRSxTQUFTO29CQUNqQixNQUFNLEVBQUUsU0FBUztpQkFDakI7Z0JBQ0Q7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLEtBQUssRUFBRSxFQUFFO3dCQUNULElBQUksRUFBRSxLQUFLO3FCQUNYO29CQUNELE1BQU0sRUFBRTt3QkFDUCxLQUFLLEVBQUUsRUFBRTt3QkFDVCxJQUFJLEVBQUUsR0FBRztxQkFDVDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7d0JBQ04sTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3dCQUNqQixNQUFNLEVBQUU7NEJBQ1AsS0FBSyxFQUFFLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLGtCQUFrQjt5QkFDeEI7cUJBQ0Q7aUJBQ0Q7YUFDZ0IsQ0FDbEIsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDakIsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtnQkFDM0QsZUFBZSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsa0NBQTBCLEVBQUU7b0JBQ3hGO3dCQUNDLElBQUksRUFBRTs0QkFDTCxLQUFLLEVBQUUsQ0FBQzs0QkFDUixJQUFJLEVBQUUsK0JBQStCO3lCQUNyQzt3QkFDRCxNQUFNLEVBQUUsU0FBUzt3QkFDakIsTUFBTSxFQUFFLFNBQVM7cUJBQ2pCO2lCQUNnQixDQUFDLENBQUE7WUFDcEIsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO2dCQUN6RSxlQUFlLENBQ2QsV0FBVyxDQUFDLHFDQUFxQyxrQ0FBMEIsRUFDM0U7b0JBQ0M7d0JBQ0MsSUFBSSxFQUFFOzRCQUNMLEtBQUssRUFBRSxDQUFDOzRCQUNSLElBQUksRUFBRSwrQkFBK0I7eUJBQ3JDO3dCQUNELE1BQU0sRUFBRSxTQUFTO3dCQUNqQixNQUFNLEVBQUU7NEJBQ1AsR0FBRyxFQUFFLFNBQVM7NEJBQ2QsR0FBRyxFQUFFLEdBQUc7NEJBQ1IsTUFBTSxFQUFFLFNBQVM7NEJBQ2pCLE1BQU0sRUFBRSxTQUFTOzRCQUNqQixNQUFNLEVBQUU7Z0NBQ1AsS0FBSyxFQUFFLEVBQUU7Z0NBQ1QsSUFBSSxFQUFFLE1BQU07NkJBQ1o7eUJBQ0Q7cUJBQ0Q7aUJBQ2dCLENBQ2xCLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDbEIsS0FBSyxNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMscURBQXFELE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRTtvQkFDN0UsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUN2RDs0QkFDQyxJQUFJLEVBQUU7Z0NBQ0wsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7NkJBQ3BCOzRCQUNELE1BQU0sRUFBRSxTQUFTOzRCQUNqQixNQUFNLEVBQUUsU0FBUzt5QkFDakI7cUJBQ2dCLENBQUMsQ0FBQTtvQkFDbkIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUN2RDs0QkFDQyxJQUFJLEVBQUU7Z0NBQ0wsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7NkJBQ3BCOzRCQUNELE1BQU0sRUFBRSxTQUFTOzRCQUNqQixNQUFNLEVBQUUsU0FBUzt5QkFDakI7cUJBQ2dCLENBQUMsQ0FBQTtnQkFDcEIsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLG1FQUFtRSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7b0JBQzNGLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRTt3QkFDM0Q7NEJBQ0MsSUFBSSxFQUFFO2dDQUNMLEtBQUssRUFBRSxDQUFDO2dDQUNSLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDOzZCQUNwQjs0QkFDRCxNQUFNLEVBQUUsU0FBUzs0QkFDakIsTUFBTSxFQUFFO2dDQUNQLEdBQUcsRUFBRSxTQUFTO2dDQUNkLEdBQUcsRUFBRSxHQUFHO2dDQUNSLE1BQU0sRUFBRSxTQUFTO2dDQUNqQixNQUFNLEVBQUUsU0FBUztnQ0FDakIsTUFBTSxFQUFFO29DQUNQLEtBQUssRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU07b0NBQ2hDLElBQUksRUFBRSxNQUFNO2lDQUNaOzZCQUNEO3lCQUNEO3FCQUNnQixDQUFDLENBQUE7b0JBQ25CLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRTt3QkFDM0Q7NEJBQ0MsSUFBSSxFQUFFO2dDQUNMLEtBQUssRUFBRSxDQUFDO2dDQUNSLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDOzZCQUNwQjs0QkFDRCxNQUFNLEVBQUUsU0FBUzs0QkFDakIsTUFBTSxFQUFFO2dDQUNQLEdBQUcsRUFBRSxTQUFTO2dDQUNkLEdBQUcsRUFBRSxHQUFHO2dDQUNSLE1BQU0sRUFBRSxTQUFTO2dDQUNqQixNQUFNLEVBQUUsU0FBUztnQ0FDakIsTUFBTSxFQUFFO29DQUNQLEtBQUssRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU07b0NBQ2hDLElBQUksRUFBRSxNQUFNO2lDQUNaOzZCQUNEO3lCQUNEO3FCQUNnQixDQUFDLENBQUE7Z0JBQ3BCLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDM0IsS0FBSyxNQUFNLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsZ0RBQWdELE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRTtvQkFDeEUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUN6RDs0QkFDQyxJQUFJLEVBQUU7Z0NBQ0wsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7NkJBQ3BCOzRCQUNELE1BQU0sRUFBRSxTQUFTOzRCQUNqQixNQUFNLEVBQUUsU0FBUzt5QkFDakI7cUJBQ2dCLENBQUMsQ0FBQTtvQkFDbkIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFO3dCQUM3RDs0QkFDQyxJQUFJLEVBQUU7Z0NBQ0wsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7NkJBQ3BCOzRCQUNELE1BQU0sRUFBRSxTQUFTOzRCQUNqQixNQUFNLEVBQUUsU0FBUzt5QkFDakI7cUJBQ2dCLENBQUMsQ0FBQTtnQkFDcEIsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLHVHQUF1RyxFQUFFLEdBQUcsRUFBRTtvQkFDbEgsMkRBQTJEO29CQUMzRCxXQUFXLENBQ1YsV0FBVyxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzVELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FDM0IsRUFDRCxLQUFLLENBQ0wsQ0FBQTtnQkFDRixDQUFDLENBQUMsQ0FBQTtnQkFDRixJQUFJLENBQUMseUdBQXlHLEVBQUUsR0FBRyxFQUFFO29CQUNwSCwyREFBMkQ7b0JBQzNELFdBQVcsQ0FDVixXQUFXLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDN0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUMzQixFQUNELEtBQUssQ0FDTCxDQUFBO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtnQkFDMUIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxlQUFlLGdDQUF3QixFQUFFO29CQUNwRTt3QkFDQyxJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUFFLENBQUM7NEJBQ1IsSUFBSSxFQUFFLFNBQVM7eUJBQ2Y7d0JBQ0QsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3FCQUNqQjtpQkFDZ0IsQ0FBQyxDQUFBO1lBQ3BCLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7Z0JBQzFCLGVBQWUsQ0FBQyxXQUFXLENBQUMsZUFBZSxnQ0FBd0IsRUFBRTtvQkFDcEU7d0JBQ0MsSUFBSSxFQUFFOzRCQUNMLEtBQUssRUFBRSxDQUFDOzRCQUNSLElBQUksRUFBRSxTQUFTO3lCQUNmO3dCQUNELE1BQU0sRUFBRSxTQUFTO3dCQUNqQixNQUFNLEVBQUUsU0FBUztxQkFDakI7aUJBQ2dCLENBQUMsQ0FBQTtZQUNwQixDQUFDLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7Z0JBQzNDLGVBQWUsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLGdDQUF3QixFQUFFO29CQUNyRjt3QkFDQyxJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUFFLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFNBQVM7eUJBQ2Y7d0JBQ0QsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3FCQUNqQjtvQkFDRDt3QkFDQyxJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUFFLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFNBQVM7eUJBQ2Y7d0JBQ0QsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLE1BQU0sRUFBRSxTQUFTO3FCQUNqQjtpQkFDZ0IsQ0FBQyxDQUFBO1lBQ3BCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixLQUFLLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1lBQzNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pELE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNwQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hDLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxDQUFBO2dCQUMxRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQzFELFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxnQ0FBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQy9ELEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2hCLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2hCLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2hCLE1BQU0sYUFBYSxHQUFnQjt3QkFDbEMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNOzRCQUNuQixDQUFDLENBQUM7Z0NBQ0EsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNOzZCQUNsQjs0QkFDRixDQUFDLENBQUMsU0FBUzt3QkFDWixJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQzs0QkFDdEMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQzt5QkFDMUU7d0JBQ0QsTUFBTSxFQUFFOzRCQUNQLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRTtnQ0FDUCxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0NBQ3BELElBQUksRUFBRSxLQUFLLENBQUMsTUFBTTs2QkFDbEI7eUJBQ0Q7cUJBQ0QsQ0FBQTtvQkFDRCxNQUFNLGFBQWEsR0FBZ0I7d0JBQ2xDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTs0QkFDbkIsQ0FBQyxDQUFDO2dDQUNBLEtBQUssRUFDSixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29DQUN6RCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU07b0NBQ2pCLENBQUM7Z0NBQ0YsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNOzZCQUNsQjs0QkFDRixDQUFDLENBQUMsU0FBUzt3QkFDWixJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUNKLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0NBQ3pELEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTTtnQ0FDakIsQ0FBQztnQ0FDRCxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTs0QkFDNUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQzt5QkFDMUU7d0JBQ0QsTUFBTSxFQUFFOzRCQUNQLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRTtnQ0FDUCxLQUFLLEVBQ0osQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQ0FDekQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNO29DQUNqQixDQUFDO29DQUNELENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0NBQzFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTTs2QkFDbEI7eUJBQ0Q7cUJBQ0QsQ0FBQTtvQkFDRCxNQUFNLGFBQWEsR0FBZ0I7d0JBQ2xDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTs0QkFDbkIsQ0FBQyxDQUFDO2dDQUNBLEtBQUssRUFDSixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29DQUN6RCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU07b0NBQ2pCLENBQUM7Z0NBQ0YsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNOzZCQUNsQjs0QkFDRixDQUFDLENBQUMsU0FBUzt3QkFDWixJQUFJLEVBQUU7NEJBQ0wsS0FBSyxFQUNKLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0NBQ3pELEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTTtnQ0FDakIsQ0FBQztnQ0FDRCxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTTs0QkFDNUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQzt5QkFDMUU7d0JBQ0QsTUFBTSxFQUFFOzRCQUNQLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ3ZDLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQ2hELE1BQU0sRUFBRTtnQ0FDUCxLQUFLLEVBQ0osQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQ0FDekQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNO29DQUNqQixDQUFDO29DQUNELENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0NBQzFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTTs2QkFDbEI7eUJBQ0Q7cUJBQ0QsQ0FBQTtvQkFDRCxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksZ0NBQXdCLEVBQUU7d0JBQ3pELGFBQWE7d0JBQ2IsYUFBYTt3QkFDYixhQUFhO3FCQUNiLENBQUMsQ0FBQTtnQkFDSCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLEtBQUssQ0FBQyw0RUFBNEUsRUFBRSxHQUFHLEVBQUU7WUFDeEYsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLGdDQUF3QixFQUFFLEVBQW1CLENBQUMsQ0FBQTtRQUNsRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==