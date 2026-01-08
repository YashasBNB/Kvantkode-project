/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { fixRegexNewline, RipgrepParser, unicodeEscapesToPCRE2, fixNewline, getRgArgs, performBraceExpansionForRipgrep, } from '../../node/ripgrepTextSearchEngine.js';
import { Range, TextSearchMatch2, } from '../../common/searchExtTypes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from '../../common/search.js';
suite('RipgrepTextSearchEngine', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('unicodeEscapesToPCRE2', async () => {
        assert.strictEqual(unicodeEscapesToPCRE2('\\u1234'), '\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u1234\\u0001'), '\\x{1234}\\x{0001}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u1234bar'), 'foo\\x{1234}bar');
        assert.strictEqual(unicodeEscapesToPCRE2('\\\\\\u1234'), '\\\\\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\\\\\u1234'), 'foo\\\\\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u{1234}'), '\\x{1234}');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u{1234}\\u{0001}'), '\\x{1234}\\x{0001}');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u{1234}bar'), 'foo\\x{1234}bar');
        assert.strictEqual(unicodeEscapesToPCRE2('[\\u00A0-\\u00FF]'), '[\\x{00A0}-\\x{00FF}]');
        assert.strictEqual(unicodeEscapesToPCRE2('foo\\u{123456}7bar'), 'foo\\u{123456}7bar');
        assert.strictEqual(unicodeEscapesToPCRE2('\\u123'), '\\u123');
        assert.strictEqual(unicodeEscapesToPCRE2('foo'), 'foo');
        assert.strictEqual(unicodeEscapesToPCRE2(''), '');
    });
    test('fixRegexNewline - src', () => {
        const ttable = [
            ['foo', 'foo'],
            ['invalid(', 'invalid('],
            ['fo\\no', 'fo\\r?\\no'],
            ['f\\no\\no', 'f\\r?\\no\\r?\\no'],
            ['f[a-z\\n1]', 'f(?:[a-z1]|\\r?\\n)'],
            ['f[\\n-a]', 'f[\\n-a]'],
            ['(?<=\\n)\\w', '(?<=\\n)\\w'],
            ['fo\\n+o', 'fo(?:\\r?\\n)+o'],
            ['fo[^\\n]o', 'fo(?!\\r?\\n)o'],
            ['fo[^\\na-z]o', 'fo(?!\\r?\\n|[a-z])o'],
            ['foo[^\\n]+o', 'foo.+o'],
            ['foo[^\\nzq]+o', 'foo[^zq]+o'],
            ['foo[^\\nzq]+o', 'foo[^zq]+o'],
            // preserves quantifies, #137899
            ['fo[^\\S\\n]*o', 'fo[^\\S]*o'],
            ['fo[^\\S\\n]{3,}o', 'fo[^\\S]{3,}o'],
        ];
        for (const [input, expected] of ttable) {
            assert.strictEqual(fixRegexNewline(input), expected, `${input} -> ${expected}`);
        }
    });
    test('fixRegexNewline - re', () => {
        function testFixRegexNewline([inputReg, testStr, shouldMatch]) {
            const fixed = fixRegexNewline(inputReg);
            const reg = new RegExp(fixed);
            assert.strictEqual(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
        }
        ;
        [
            ['foo', 'foo', true],
            ['foo\\n', 'foo\r\n', true],
            ['foo\\n\\n', 'foo\n\n', true],
            ['foo\\n\\n', 'foo\r\n\r\n', true],
            ['foo\\n', 'foo\n', true],
            ['foo\\nabc', 'foo\r\nabc', true],
            ['foo\\nabc', 'foo\nabc', true],
            ['foo\\r\\n', 'foo\r\n', true],
            ['foo\\n+abc', 'foo\r\nabc', true],
            ['foo\\n+abc', 'foo\n\n\nabc', true],
            ['foo\\n+abc', 'foo\r\n\r\n\r\nabc', true],
            ['foo[\\n-9]+abc', 'foo1abc', true],
        ].forEach(testFixRegexNewline);
    });
    test('fixNewline - matching', () => {
        function testFixNewline([inputReg, testStr, shouldMatch = true]) {
            const fixed = fixNewline(inputReg);
            const reg = new RegExp(fixed);
            assert.strictEqual(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
        }
        ;
        [
            ['foo', 'foo'],
            ['foo\n', 'foo\r\n'],
            ['foo\n', 'foo\n'],
            ['foo\nabc', 'foo\r\nabc'],
            ['foo\nabc', 'foo\nabc'],
            ['foo\r\n', 'foo\r\n'],
            ['foo\nbarc', 'foobar', false],
            ['foobar', 'foo\nbar', false],
        ].forEach(testFixNewline);
    });
    suite('RipgrepParser', () => {
        const TEST_FOLDER = URI.file('/foo/bar');
        function testParser(inputData, expectedResults) {
            const testParser = new RipgrepParser(1000, TEST_FOLDER, DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS);
            const actualResults = [];
            testParser.on('result', (r) => {
                actualResults.push(r);
            });
            inputData.forEach((d) => testParser.handleData(d));
            testParser.flush();
            assert.deepStrictEqual(actualResults, expectedResults);
        }
        function makeRgMatch(relativePath, text, lineNumber, matchRanges) {
            return (JSON.stringify({
                type: 'match',
                data: {
                    path: {
                        text: relativePath,
                    },
                    lines: {
                        text,
                    },
                    line_number: lineNumber,
                    absolute_offset: 0, // unused
                    submatches: matchRanges.map((mr) => {
                        return {
                            ...mr,
                            match: { text: text.substring(mr.start, mr.end) },
                        };
                    }),
                },
            }) + '\n');
        }
        test('single result', () => {
            testParser([makeRgMatch('file1.js', 'foobar', 4, [{ start: 3, end: 6 }])], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
            ]);
        });
        test('multiple results', () => {
            testParser([
                makeRgMatch('file1.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app/file2.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app2/file3.js', 'foobar', 4, [{ start: 3, end: 6 }]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app/file2.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app2/file3.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
            ]);
        });
        test('chopped-up input chunks', () => {
            const dataStrs = [
                makeRgMatch('file1.js', 'foo bar', 4, [{ start: 3, end: 7 }]),
                makeRgMatch('app/file2.js', 'foobar', 4, [{ start: 3, end: 6 }]),
                makeRgMatch('app2/file3.js', 'foobar', 4, [{ start: 3, end: 6 }]),
            ];
            const dataStr0Space = dataStrs[0].indexOf(' ');
            testParser([
                dataStrs[0].substring(0, dataStr0Space + 1),
                dataStrs[0].substring(dataStr0Space + 1),
                '\n',
                dataStrs[1].trim(),
                '\n' + dataStrs[2].substring(0, 25),
                dataStrs[2].substring(25),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 7),
                        sourceRange: new Range(3, 3, 3, 7),
                    },
                ], 'foo bar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app/file2.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'app2/file3.js'), [
                    {
                        previewRange: new Range(0, 3, 0, 6),
                        sourceRange: new Range(3, 3, 3, 6),
                    },
                ], 'foobar'),
            ]);
        });
        test('empty result (#100569)', () => {
            testParser([makeRgMatch('file1.js', 'foobar', 4, []), makeRgMatch('file1.js', '', 5, [])], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 1),
                        sourceRange: new Range(3, 0, 3, 1),
                    },
                ], 'foobar'),
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 0),
                        sourceRange: new Range(4, 0, 4, 0),
                    },
                ], ''),
            ]);
        });
        test('multiple submatches without newline in between (#131507)', () => {
            testParser([
                makeRgMatch('file1.js', 'foobarbazquux', 4, [
                    { start: 0, end: 4 },
                    { start: 6, end: 10 },
                ]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 0, 4),
                        sourceRange: new Range(3, 0, 3, 4),
                    },
                    {
                        previewRange: new Range(0, 6, 0, 10),
                        sourceRange: new Range(3, 6, 3, 10),
                    },
                ], 'foobarbazquux'),
            ]);
        });
        test('multiple submatches with newline in between (#131507)', () => {
            testParser([
                makeRgMatch('file1.js', 'foo\nbar\nbaz\nquux', 4, [
                    { start: 0, end: 5 },
                    { start: 8, end: 13 },
                ]),
            ], [
                new TextSearchMatch2(joinPath(TEST_FOLDER, 'file1.js'), [
                    {
                        previewRange: new Range(0, 0, 1, 1),
                        sourceRange: new Range(3, 0, 4, 1),
                    },
                    {
                        previewRange: new Range(2, 0, 3, 1),
                        sourceRange: new Range(5, 0, 6, 1),
                    },
                ], 'foo\nbar\nbaz\nquux'),
            ]);
        });
    });
    suite('getRgArgs', () => {
        test('simple includes', () => {
            // Only testing the args that come from includes.
            function testGetRgArgs(includes, expectedFromIncludes) {
                const query = {
                    pattern: 'test',
                };
                const options = {
                    folderOptions: {
                        includes: includes,
                        excludes: [],
                        useIgnoreFiles: {
                            local: false,
                            global: false,
                            parent: false,
                        },
                        followSymlinks: false,
                        folder: URI.file('/some/folder'),
                        encoding: 'utf8',
                    },
                    maxResults: 1000,
                };
                const expected = [
                    '--hidden',
                    '--no-require-git',
                    '--ignore-case',
                    ...expectedFromIncludes,
                    '--no-ignore',
                    '--crlf',
                    '--fixed-strings',
                    '--no-config',
                    '--no-ignore-global',
                    '--json',
                    '--',
                    'test',
                    '.',
                ];
                const result = getRgArgs(query, options);
                assert.deepStrictEqual(result, expected);
            }
            ;
            [
                [
                    ['a/*', 'b/*'],
                    ['-g', '!*', '-g', '/a', '-g', '/a/*', '-g', '/b', '-g', '/b/*'],
                ],
                [
                    ['**/a/*', 'b/*'],
                    ['-g', '!*', '-g', '/b', '-g', '/b/*', '-g', '**/a/*'],
                ],
                [
                    ['**/a/*', '**/b/*'],
                    ['-g', '**/a/*', '-g', '**/b/*'],
                ],
                [
                    ['foo/*bar/something/**'],
                    [
                        '-g',
                        '!*',
                        '-g',
                        '/foo',
                        '-g',
                        '/foo/*bar',
                        '-g',
                        '/foo/*bar/something',
                        '-g',
                        '/foo/*bar/something/**',
                    ],
                ],
            ].forEach(([includes, expectedFromIncludes]) => testGetRgArgs(includes, expectedFromIncludes));
        });
    });
    test('brace expansion for ripgrep', () => {
        function testBraceExpansion(argGlob, expectedGlob) {
            const result = performBraceExpansionForRipgrep(argGlob);
            assert.deepStrictEqual(result, expectedGlob);
        }
        ;
        [
            ['eep/{a,b}/test', ['eep/a/test', 'eep/b/test']],
            ['eep/{a,b}/{c,d,e}', ['eep/a/c', 'eep/a/d', 'eep/a/e', 'eep/b/c', 'eep/b/d', 'eep/b/e']],
            ['eep/{a,b}/\\{c,d,e}', ['eep/a/{c,d,e}', 'eep/b/{c,d,e}']],
            ['eep/{a,b\\}/test', ['eep/{a,b}/test']],
            ['eep/{a,b\\\\}/test', ['eep/a/test', 'eep/b\\\\/test']],
            ['eep/{a,b\\\\\\}/test', ['eep/{a,b\\\\}/test']],
            ['e\\{ep/{a,b}/test', ['e{ep/a/test', 'e{ep/b/test']],
            ['eep/{a,\\b}/test', ['eep/a/test', 'eep/\\b/test']],
            ['{a/*.*,b/*.*}', ['a/*.*', 'b/*.*']],
            ['{{}', ['{{}']],
            ['aa{{}', ['aa{{}']],
            ['{b{}', ['{b{}']],
            ['{{}c', ['{{}c']],
            ['{{}}', ['{{}}']],
            ['\\{{}}', ['{}']],
            ['{}foo', ['foo']],
            ['bar{ }foo', ['bar foo']],
            ['{}', ['']],
        ].forEach(([includePattern, expectedPatterns]) => testBraceExpansion(includePattern, expectedPatterns));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmVVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9yaXBncmVwVGV4dFNlYXJjaEVuZ2luZVV0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUNOLGVBQWUsRUFHZixhQUFhLEVBQ2IscUJBQXFCLEVBQ3JCLFVBQVUsRUFDVixTQUFTLEVBQ1QsK0JBQStCLEdBQy9CLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLEtBQUssRUFDTCxnQkFBZ0IsR0FHaEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUU1RSxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFl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