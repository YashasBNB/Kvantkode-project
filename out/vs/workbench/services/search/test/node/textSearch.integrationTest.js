/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { deserializeSearchError, SearchErrorCode, } from '../../common/search.js';
import { TextSearchEngineAdapter } from '../../node/textSearchAdapter.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { FileAccess } from '../../../../../base/common/network.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const EXAMPLES_FIXTURES = path.join(TEST_FIXTURES, 'examples');
const MORE_FIXTURES = path.join(TEST_FIXTURES, 'more');
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [TEST_ROOT_FOLDER];
const MULTIROOT_QUERIES = [
    { folder: URI.file(EXAMPLES_FIXTURES) },
    { folder: URI.file(MORE_FIXTURES) },
];
function doSearchTest(query, expectedResultCount) {
    const engine = new TextSearchEngineAdapter(query);
    let c = 0;
    const results = [];
    return engine
        .search(new CancellationTokenSource().token, (_results) => {
        if (_results) {
            c += _results.reduce((acc, cur) => acc + cur.numMatches, 0);
            results.push(..._results);
        }
    }, () => { })
        .then(() => {
        if (typeof expectedResultCount === 'function') {
            assert(expectedResultCount(c));
        }
        else {
            assert.strictEqual(c, expectedResultCount, `rg ${c} !== ${expectedResultCount}`);
        }
        return results;
    });
}
flakySuite('TextSearch-integration', function () {
    test('Text: GameOfLife', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife' },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (RegExp)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'Game.?fL\\w?fe', isRegExp: true },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (unicode escape sequences)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'G\\u{0061}m\\u0065OfLife', isRegExp: true },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (unicode escape sequences, force PCRE2)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '(?<!a)G\\u{0061}m\\u0065OfLife', isRegExp: true },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (PCRE2 RegExp)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            usePCRE2: true,
            contentPattern: { pattern: 'Life(?!P)', isRegExp: true },
        };
        return doSearchTest(config, 8);
    });
    test('Text: GameOfLife (RegExp to EOL)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife.*', isRegExp: true },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (Word Match, Case Sensitive)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'GameOfLife', isWordMatch: true, isCaseSensitive: true },
        };
        return doSearchTest(config, 4);
    });
    test('Text: GameOfLife (Word Match, Spaces)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: ' GameOfLife ', isWordMatch: true },
        };
        return doSearchTest(config, 1);
    });
    test('Text: GameOfLife (Word Match, Punctuation and Spaces)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: ', as =', isWordMatch: true },
        };
        return doSearchTest(config, 1);
    });
    test('Text: Helvetica (UTF 16)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'Helvetica' },
        };
        return doSearchTest(config, 3);
    });
    test('Text: e', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
        };
        return doSearchTest(config, 785);
    });
    test('Text: e (with excludes)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            excludePattern: { '**/examples': true },
        };
        return doSearchTest(config, 391);
    });
    test('Text: e (with includes)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            includePattern: { '**/examples/**': true },
        };
        return doSearchTest(config, 394);
    });
    // TODO
    // test('Text: e (with absolute path excludes)', () => {
    // 	const config: any = {
    // 		folderQueries: ROOT_FOLDER_QUERY,
    // 		contentPattern: { pattern: 'e' },
    // 		excludePattern: makeExpression(path.join(TEST_FIXTURES, '**/examples'))
    // 	};
    // 	return doSearchTest(config, 394);
    // });
    // test('Text: e (with mixed absolute/relative path excludes)', () => {
    // 	const config: any = {
    // 		folderQueries: ROOT_FOLDER_QUERY,
    // 		contentPattern: { pattern: 'e' },
    // 		excludePattern: makeExpression(path.join(TEST_FIXTURES, '**/examples'), '*.css')
    // 	};
    // 	return doSearchTest(config, 310);
    // });
    test('Text: sibling exclude', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'm' },
            includePattern: makeExpression('**/site*'),
            excludePattern: { '*.css': { when: '$(basename).less' } },
        };
        return doSearchTest(config, 1);
    });
    test('Text: e (with includes and exclude)', () => {
        const config = {
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'e' },
            includePattern: { '**/examples/**': true },
            excludePattern: { '**/examples/small.js': true },
        };
        return doSearchTest(config, 371);
    });
    test('Text: a (capped)', () => {
        const maxResults = 520;
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'a' },
            maxResults,
        };
        return doSearchTest(config, maxResults);
    });
    test('Text: a (no results)', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'ahsogehtdas' },
        };
        return doSearchTest(config, 0);
    });
    test('Text: -size', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '-size' },
        };
        return doSearchTest(config, 9);
    });
    test('Multiroot: Conway', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'conway' },
        };
        return doSearchTest(config, 8);
    });
    test('Multiroot: e with partial global exclude', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'e' },
            excludePattern: makeExpression('**/*.txt'),
        };
        return doSearchTest(config, 394);
    });
    test('Multiroot: e with global excludes', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: MULTIROOT_QUERIES,
            contentPattern: { pattern: 'e' },
            excludePattern: makeExpression('**/*.txt', '**/*.js'),
        };
        return doSearchTest(config, 0);
    });
    test('Multiroot: e with folder exclude', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: [
                {
                    folder: URI.file(EXAMPLES_FIXTURES),
                    excludePattern: [
                        {
                            pattern: makeExpression('**/e*.js'),
                        },
                    ],
                },
                { folder: URI.file(MORE_FIXTURES) },
            ],
            contentPattern: { pattern: 'e' },
        };
        return doSearchTest(config, 298);
    });
    test('Text: 语', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: '语' },
        };
        return doSearchTest(config, 1).then((results) => {
            const matchRange = results[0].results[0].rangeLocations.map((e) => e.source);
            assert.deepStrictEqual(matchRange, [
                {
                    startLineNumber: 0,
                    startColumn: 1,
                    endLineNumber: 0,
                    endColumn: 2,
                },
            ]);
        });
    });
    test('Multiple matches on line: h\\d,', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'h\\d,', isRegExp: true },
        };
        return doSearchTest(config, 15).then((results) => {
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].results.length, 1);
            const match = results[0].results[0];
            assert.strictEqual(match.rangeLocations.map((e) => e.source).length, 5);
        });
    });
    test('Search with context matches', () => {
        const config = {
            type: 2 /* QueryType.Text */,
            folderQueries: ROOT_FOLDER_QUERY,
            contentPattern: { pattern: 'compiler.typeCheck();' },
            surroundingContext: 1,
        };
        return doSearchTest(config, 3).then((results) => {
            assert.strictEqual(results.length, 3);
            assert.strictEqual(results[0].results[0].lineNumber, 24);
            assert.strictEqual(results[0].results[0].text, '        compiler.addUnit(prog,"input.ts");');
            // assert.strictEqual((<ITextSearchMatch>results[1].results[0]).preview.text, '        compiler.typeCheck();\n'); // See https://github.com/BurntSushi/ripgrep/issues/1095
            assert.strictEqual(results[2].results[0].lineNumber, 26);
            assert.strictEqual(results[2].results[0].text, '        compiler.emit();');
        });
    });
    suite('error messages', () => {
        test('invalid encoding', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: [
                    {
                        ...TEST_ROOT_FOLDER,
                        fileEncoding: 'invalidEncoding',
                    },
                ],
                contentPattern: { pattern: 'test' },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, (err) => {
                const searchError = deserializeSearchError(err);
                assert.strictEqual(searchError.message, 'Unknown encoding: invalidEncoding');
                assert.strictEqual(searchError.code, SearchErrorCode.unknownEncoding);
            });
        });
        test('invalid regex case 1', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: ')', isRegExp: true },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, (err) => {
                const searchError = deserializeSearchError(err);
                const regexParseErrorForUnclosedParenthesis = 'Regex parse error: unmatched closing parenthesis';
                assert.strictEqual(searchError.message, regexParseErrorForUnclosedParenthesis);
                assert.strictEqual(searchError.code, SearchErrorCode.regexParseError);
            });
        });
        test('invalid regex case 2', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: '(?<!a.*)', isRegExp: true },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, (err) => {
                const searchError = deserializeSearchError(err);
                const regexParseErrorForLookAround = 'Regex parse error: lookbehind assertion is not fixed length';
                assert.strictEqual(searchError.message, regexParseErrorForLookAround);
                assert.strictEqual(searchError.code, SearchErrorCode.regexParseError);
            });
        });
        test('invalid glob', () => {
            const config = {
                type: 2 /* QueryType.Text */,
                folderQueries: ROOT_FOLDER_QUERY,
                contentPattern: { pattern: 'foo' },
                includePattern: {
                    '{{}': true,
                },
            };
            return doSearchTest(config, 0).then(() => {
                throw new Error('expected fail');
            }, (err) => {
                const searchError = deserializeSearchError(err);
                assert.strictEqual(searchError.message, "Error parsing glob '/{{}': nested alternate groups are not allowed");
                assert.strictEqual(searchError.code, SearchErrorCode.globParseError);
            });
        });
    });
});
function makeExpression(...patterns) {
    return patterns.reduce((glob, pattern) => {
        // glob.ts needs forward slashes
        pattern = pattern.replace(/\\/g, '/');
        glob[pattern] = true;
        return glob;
    }, Object.create(null));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS90ZXh0U2VhcmNoLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUNOLHNCQUFzQixFQU90QixlQUFlLEdBRWYsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWxFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQzlFLENBQUE7QUFDRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ3RELE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQTtBQUMxRSxNQUFNLGlCQUFp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