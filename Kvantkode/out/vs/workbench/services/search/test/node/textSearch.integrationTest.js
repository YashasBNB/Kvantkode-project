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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3RleHRTZWFyY2guaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXBGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sc0JBQXNCLEVBT3RCLGVBQWUsR0FFZixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLE1BQU0sQ0FDOUUsQ0FBQTtBQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDOUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFDdEQsTUFBTSxnQkFBZ0IsR0FBaUIsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFBO0FBQzFFLE1BQU0s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