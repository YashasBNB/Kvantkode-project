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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFRleHRTZWFyY2hFbmdpbmVVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvcmlwZ3JlcFRleHRTZWFyY2hFbmdpbmVVdGlscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTixlQUFlLEVBR2YsYUFBYSxFQUNiLHFCQUFxQixFQUNyQixVQUFVLEVBQ1YsU0FBUyxFQUNULCtCQUErQixHQUMvQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTixLQUFLLEVBQ0wsZ0JBQWdCLEdBR2hCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFNUUsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3pDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFFdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sTUFBTSxHQUFHO1lBQ2QsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO1lBQ2QsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQ3hCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQztZQUN4QixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQztZQUNsQyxDQUFDLFlBQVksRUFBRSxxQkFBcUIsQ0FBQztZQUNyQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7WUFDeEIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDO1lBQzlCLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDO1lBQzlCLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDO1lBQy9CLENBQUMsY0FBYyxFQUFFLHNCQUFzQixDQUFDO1lBQ3hDLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQztZQUN6QixDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUM7WUFDL0IsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDO1lBQy9CLGdDQUFnQztZQUNoQyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUM7WUFDL0IsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUM7U0FDckMsQ0FBQTtRQUVELEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxLQUFLLE9BQU8sUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNoRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLFNBQVMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FJM0Q7WUFDQSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFDakIsV0FBVyxFQUNYLEdBQUcsUUFBUSxPQUFPLEdBQUcsS0FBSyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQ25ELENBQUE7UUFDRixDQUFDO1FBRUQsQ0FBQztRQUNBO1lBQ0MsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQztZQUVwQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDO1lBQzNCLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUM7WUFDOUIsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQztZQUNsQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDO1lBQ3pCLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUM7WUFDakMsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQztZQUMvQixDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDO1lBRTlCLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUM7WUFDbEMsQ0FBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQztZQUNwQyxDQUFDLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUM7WUFDMUMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDO1NBRXBDLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLFNBQVMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEdBQUcsSUFBSSxDQUk3RDtZQUNBLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QixNQUFNLENBQUMsV0FBVyxDQUNqQixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUNqQixXQUFXLEVBQ1gsR0FBRyxRQUFRLE9BQU8sR0FBRyxLQUFLLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FDbkQsQ0FBQTtRQUNGLENBQUM7UUFFRCxDQUFDO1FBQ0E7WUFDQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7WUFFZCxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDcEIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1lBQ2xCLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQztZQUMxQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7WUFDeEIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1lBRXRCLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7WUFDOUIsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztTQUU5QixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzNCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFeEMsU0FBUyxVQUFVLENBQUMsU0FBbUIsRUFBRSxlQUFvQztZQUM1RSxNQUFNLFVBQVUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLG1DQUFtQyxDQUFDLENBQUE7WUFFNUYsTUFBTSxhQUFhLEdBQXdCLEVBQUUsQ0FBQTtZQUM3QyxVQUFVLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM3QixhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLENBQUMsQ0FBQyxDQUFBO1lBRUYsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xELFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUVsQixNQUFNLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBRUQsU0FBUyxXQUFXLENBQ25CLFlBQW9CLEVBQ3BCLElBQVksRUFDWixVQUFrQixFQUNsQixXQUE2QztZQUU3QyxPQUFPLENBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBYTtnQkFDMUIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFZO29CQUNmLElBQUksRUFBRTt3QkFDTCxJQUFJLEVBQUUsWUFBWTtxQkFDbEI7b0JBQ0QsS0FBSyxFQUFFO3dCQUNOLElBQUk7cUJBQ0o7b0JBQ0QsV0FBVyxFQUFFLFVBQVU7b0JBQ3ZCLGVBQWUsRUFBRSxDQUFDLEVBQUUsU0FBUztvQkFDN0IsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTt3QkFDbEMsT0FBTzs0QkFDTixHQUFHLEVBQUU7NEJBQ0wsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUU7eUJBQ2pELENBQUE7b0JBQ0YsQ0FBQyxDQUFDO2lCQUNGO2FBQ0QsQ0FBQyxHQUFHLElBQUksQ0FDVCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFCLFVBQVUsQ0FDVCxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzlEO2dCQUNDLElBQUksZ0JBQWdCLENBQ25CLFFBQVEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLEVBQ2pDO29CQUNDO3dCQUNDLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25DLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2xDO2lCQUNELEVBQ0QsUUFBUSxDQUNSO2FBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1lBQzdCLFVBQVUsQ0FDVDtnQkFDQyxXQUFXLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVELFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDaEUsV0FBVyxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2pFLEVBQ0Q7Z0JBQ0MsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFDakM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxRQUFRLENBQ1I7Z0JBQ0QsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsRUFDckM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxRQUFRLENBQ1I7Z0JBQ0QsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsRUFDdEM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxRQUFRLENBQ1I7YUFDRCxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDcEMsTUFBTSxRQUFRLEdBQUc7Z0JBQ2hCLFdBQVcsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDN0QsV0FBVyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxXQUFXLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDakUsQ0FBQTtZQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUMsVUFBVSxDQUNUO2dCQUNDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0JBQzNDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztnQkFDeEMsSUFBSTtnQkFDSixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO2dCQUNsQixJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNuQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQzthQUN6QixFQUNEO2dCQUNDLElBQUksZ0JBQWdCLENBQ25CLFFBQVEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLEVBQ2pDO29CQUNDO3dCQUNDLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25DLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2xDO2lCQUNELEVBQ0QsU0FBUyxDQUNUO2dCQUNELElBQUksZ0JBQWdCLENBQ25CLFFBQVEsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEVBQ3JDO29CQUNDO3dCQUNDLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25DLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2xDO2lCQUNELEVBQ0QsUUFBUSxDQUNSO2dCQUNELElBQUksZ0JBQWdCLENBQ25CLFFBQVEsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLEVBQ3RDO29CQUNDO3dCQUNDLFlBQVksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25DLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ2xDO2lCQUNELEVBQ0QsUUFBUSxDQUNSO2FBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1lBQ25DLFVBQVUsQ0FDVCxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDOUU7Z0JBQ0MsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFDakM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxRQUFRLENBQ1I7Z0JBQ0QsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFDakM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxFQUFFLENBQ0Y7YUFDRCxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7WUFDckUsVUFBVSxDQUNUO2dCQUNDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRTtvQkFDM0MsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7b0JBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO2lCQUNyQixDQUFDO2FBQ0YsRUFDRDtnQkFDQyxJQUFJLGdCQUFnQixDQUNuQixRQUFRLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUNqQztvQkFDQzt3QkFDQyxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNuQyxXQUFXLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNsQztvQkFDRDt3QkFDQyxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUNwQyxXQUFXLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3FCQUNuQztpQkFDRCxFQUNELGVBQWUsQ0FDZjthQUNELENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsRUFBRTtZQUNsRSxVQUFVLENBQ1Q7Z0JBQ0MsV0FBVyxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7b0JBQ2pELEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO29CQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtpQkFDckIsQ0FBQzthQUNGLEVBQ0Q7Z0JBQ0MsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFDakM7b0JBQ0M7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7b0JBQ0Q7d0JBQ0MsWUFBWSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbEM7aUJBQ0QsRUFDRCxxQkFBcUIsQ0FDckI7YUFDRCxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdkIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtZQUM1QixpREFBaUQ7WUFDakQsU0FBUyxhQUFhLENBQUMsUUFBa0IsRUFBRSxvQkFBOEI7Z0JBQ3hFLE1BQU0sS0FBSyxHQUFxQjtvQkFDL0IsT0FBTyxFQUFFLE1BQU07aUJBQ2YsQ0FBQTtnQkFFRCxNQUFNLE9BQU8sR0FBNkI7b0JBQ3pDLGFBQWEsRUFBRTt3QkFDZCxRQUFRLEVBQUUsUUFBUTt3QkFDbEIsUUFBUSxFQUFFLEVBQUU7d0JBQ1osY0FBYyxFQUFFOzRCQUNmLEtBQUssRUFBRSxLQUFLOzRCQUNaLE1BQU0sRUFBRSxLQUFLOzRCQUNiLE1BQU0sRUFBRSxLQUFLO3lCQUNiO3dCQUNELGNBQWMsRUFBRSxLQUFLO3dCQUNyQixNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7d0JBQ2hDLFFBQVEsRUFBRSxNQUFNO3FCQUNoQjtvQkFDRCxVQUFVLEVBQUUsSUFBSTtpQkFDaEIsQ0FBQTtnQkFDRCxNQUFNLFFBQVEsR0FBRztvQkFDaEIsVUFBVTtvQkFDVixrQkFBa0I7b0JBQ2xCLGVBQWU7b0JBQ2YsR0FBRyxvQkFBb0I7b0JBQ3ZCLGFBQWE7b0JBQ2IsUUFBUTtvQkFDUixpQkFBaUI7b0JBQ2pCLGFBQWE7b0JBQ2Isb0JBQW9CO29CQUNwQixRQUFRO29CQUNSLElBQUk7b0JBQ0osTUFBTTtvQkFDTixHQUFHO2lCQUNILENBQUE7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDekMsQ0FBQztZQUVELENBQUM7WUFBQTtnQkFDQTtvQkFDQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7b0JBQ2QsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7aUJBQ2hFO2dCQUNEO29CQUNDLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztvQkFDakIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDO2lCQUN0RDtnQkFDRDtvQkFDQyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ3BCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDO2lCQUNoQztnQkFDRDtvQkFDQyxDQUFDLHVCQUF1QixDQUFDO29CQUN6Qjt3QkFDQyxJQUFJO3dCQUNKLElBQUk7d0JBQ0osSUFBSTt3QkFDSixNQUFNO3dCQUNOLElBQUk7d0JBQ0osV0FBVzt3QkFDWCxJQUFJO3dCQUNKLHFCQUFxQjt3QkFDckIsSUFBSTt3QkFDSix3QkFBd0I7cUJBQ3hCO2lCQUNEO2FBQ0QsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FDOUMsYUFBYSxDQUFXLFFBQVEsRUFBWSxvQkFBb0IsQ0FBQyxDQUNqRSxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsU0FBUyxrQkFBa0IsQ0FBQyxPQUFlLEVBQUUsWUFBc0I7WUFDbEUsTUFBTSxNQUFNLEdBQUcsK0JBQStCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUVELENBQUM7UUFBQTtZQUNBLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDaEQsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDekYsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUMzRCxDQUFDLGtCQUFrQixFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN4QyxDQUFDLG9CQUFvQixFQUFFLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDeEQsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDaEQsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxDQUFDLGtCQUFrQixFQUFFLENBQUMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3BELENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQixDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xCLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsQixDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ1osQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FDaEQsa0JBQWtCLENBQVMsY0FBYyxFQUFZLGdCQUFnQixDQUFDLENBQ3RFLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=