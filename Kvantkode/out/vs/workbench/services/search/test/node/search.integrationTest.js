/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as path from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { Engine as FileSearchEngine, FileWalker } from '../../node/fileSearch.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { FileAccess } from '../../../../../base/common/network.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const EXAMPLES_FIXTURES = URI.file(path.join(TEST_FIXTURES, 'examples'));
const MORE_FIXTURES = URI.file(path.join(TEST_FIXTURES, 'more'));
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [TEST_ROOT_FOLDER];
const ROOT_FOLDER_QUERY_36438 = [
    {
        folder: URI.file(path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures2/36438').fsPath)),
    },
];
const MULTIROOT_QUERIES = [{ folder: EXAMPLES_FIXTURES }, { folder: MORE_FIXTURES }];
flakySuite('FileSearchEngine', () => {
    test('Files: *.js', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.js',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 4);
            done();
        });
    });
    test('Files: maxResults', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            maxResults: 1,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: maxResults without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            maxResults: 1,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/file.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: not exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/nofile.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(!complete.limitHit);
            done();
        });
    });
    test('Files: exists without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/file.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: not exists without Ripgrep', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: { '**/nofile.txt': true },
            exists: true,
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(!complete.limitHit);
            done();
        });
    });
    test('Files: examples/com*', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: path.join('examples', 'com*'),
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: examples (fuzzy)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'xl',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 7);
            done();
        });
    });
    test('Files: multiroot', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'file',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 3);
            done();
        });
    });
    test('Files: multiroot with includePattern and maxResults', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 1,
            includePattern: {
                '*.txt': true,
                '*.js': true,
            },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: multiroot with includePattern and exists', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            exists: true,
            includePattern: {
                '*.txt': true,
                '*.js': true,
            },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error, complete) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            assert.ok(complete.limitHit);
            done();
        });
    });
    test('Files: NPE (CamelCase)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'NullPE',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: *.*', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 14);
            done();
        });
    });
    test('Files: *.as', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.as',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            done();
        });
    });
    test('Files: *.* without derived', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'site.*',
            excludePattern: { '**/*.css': { when: '$(basename).less' } },
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'site.less');
            done();
        });
    });
    test('Files: *.* exclude folder without wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { examples: true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: exclude folder without wildcard #36438', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY_36438,
            excludePattern: { modules: true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: include folder without wildcard #36438', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY_36438,
            includePattern: { 'modules/**': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: *.* exclude folder with leading wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { '**/examples': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: *.* exclude folder with trailing wildcard', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { 'examples/**': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 8);
            done();
        });
    });
    test('Files: *.* exclude with unicode', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            excludePattern: { '**/üm laut汉语': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 13);
            done();
        });
    });
    test('Files: *.* include with unicode', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '*.*',
            includePattern: { '**/üm laut汉语/*': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
    test('Files: multiroot with exclude', function (done) {
        const folderQueries = [
            {
                folder: EXAMPLES_FIXTURES,
                excludePattern: [
                    {
                        pattern: { '**/anotherfile.txt': true },
                    },
                ],
            },
            {
                folder: MORE_FIXTURES,
                excludePattern: [
                    {
                        pattern: {
                            '**/file.txt': true,
                        },
                    },
                ],
            },
        ];
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries,
            filePattern: '*',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 5);
            done();
        });
    });
    test('Files: Unicode and Spaces', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: '汉语',
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), '汉语.txt');
            done();
        });
    });
    test('Files: no results', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'nofilematch',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 0);
            done();
        });
    });
    test('Files: relative path matched once', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: path.normalize(path.join('examples', 'company.js')),
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'company.js');
            done();
        });
    });
    test('Files: Include pattern, single files', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            includePattern: {
                'site.css': true,
                'examples/company.js': true,
                'examples/subfolder/subfile.txt': true,
            },
        });
        const res = [];
        engine.search((result) => {
            res.push(result);
        }, () => { }, (error) => {
            assert.ok(!error);
            const basenames = res.map((r) => path.basename(r.relativePath));
            assert.ok(basenames.indexOf('site.css') !== -1, `site.css missing in ${JSON.stringify(basenames)}`);
            assert.ok(basenames.indexOf('company.js') !== -1, `company.js missing in ${JSON.stringify(basenames)}`);
            assert.ok(basenames.indexOf('subfile.txt') !== -1, `subfile.txt missing in ${JSON.stringify(basenames)}`);
            done();
        });
    });
    test('Files: extraFiles only', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html'))),
            ],
            filePattern: '*.js',
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'company.js');
            done();
        });
    });
    test('Files: extraFiles only (with include)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html'))),
            ],
            filePattern: '*.*',
            includePattern: { '**/*.css': true },
        });
        let count = 0;
        let res;
        engine.search((result) => {
            if (result) {
                count++;
            }
            res = result;
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            assert.strictEqual(path.basename(res.relativePath), 'site.css');
            done();
        });
    });
    test('Files: extraFiles only (with exclude)', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [],
            extraFileResources: [
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'site.css'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'examples', 'company.js'))),
                URI.file(path.normalize(path.join(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath, 'index.html'))),
            ],
            filePattern: '*.*',
            excludePattern: { '**/*.css': true },
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 2);
            done();
        });
    });
    test('Files: no dupes in nested folders', function (done) {
        const engine = new FileSearchEngine({
            type: 1 /* QueryType.File */,
            folderQueries: [
                { folder: EXAMPLES_FIXTURES },
                { folder: joinPath(EXAMPLES_FIXTURES, 'subfolder') },
            ],
            filePattern: 'subfile.txt',
        });
        let count = 0;
        engine.search((result) => {
            if (result) {
                count++;
            }
        }, () => { }, (error) => {
            assert.ok(!error);
            assert.strictEqual(count, 1);
            done();
        });
    });
});
flakySuite('FileWalker', () => {
    ;
    (platform.isWindows ? test.skip : test)('Find: exclude subfolder', function (done) {
        const file0 = './more/file.txt';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { '**/something': true },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { '**/subfolder': true },
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: folder excludes', function (done) {
        const folderQueries = [
            {
                folder: URI.file(TEST_FIXTURES),
                excludePattern: [
                    {
                        pattern: { '**/subfolder': true },
                    },
                ],
            },
        ];
        const file0 = './more/file.txt';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({ type: 1 /* QueryType.File */, folderQueries });
        const cmd1 = walker.spawnFindCmd(folderQueries[0]);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert(outputContains(stdout1, file0), stdout1);
            assert(!outputContains(stdout1, file1), stdout1);
            done();
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude multiple folders', function (done) {
        const file0 = './index.html';
        const file1 = './examples/small.js';
        const file2 = './more/file.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { '**/something': true },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file2), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { '{**/examples,**/more}': true },
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                assert.strictEqual(stdout2.split('\n').indexOf(file2), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude folder path suffix', function (done) {
        const file0 = './examples/company.js';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { '**/examples/something': true },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { '**/examples/subfolder': true },
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude subfolder path suffix', function (done) {
        const file0 = './examples/subfolder/subfile.txt';
        const file1 = './examples/subfolder/anotherfolder/anotherfile.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { '**/subfolder/something': true },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { '**/subfolder/anotherfolder': true },
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude folder path', function (done) {
        const file0 = './examples/company.js';
        const file1 = './examples/subfolder/subfile.txt';
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: { 'examples/something': true },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
            assert.notStrictEqual(stdout1.split('\n').indexOf(file1), -1, stdout1);
            const walker = new FileWalker({
                type: 1 /* QueryType.File */,
                folderQueries: ROOT_FOLDER_QUERY,
                excludePattern: { 'examples/subfolder': true },
            });
            const cmd2 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
            walker.readStdout(cmd2, 'utf8', (err2, stdout2) => {
                assert.strictEqual(err2, null);
                assert.notStrictEqual(stdout1.split('\n').indexOf(file0), -1, stdout1);
                assert.strictEqual(stdout2.split('\n').indexOf(file1), -1, stdout2);
                done();
            });
        });
    });
    (platform.isWindows ? test.skip : test)('Find: exclude combination of paths', function (done) {
        const filesIn = ['./examples/subfolder/subfile.txt', './examples/company.js', './index.html'];
        const filesOut = ['./examples/subfolder/anotherfolder/anotherfile.txt', './more/file.txt'];
        const walker = new FileWalker({
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            excludePattern: {
                '**/subfolder/anotherfolder': true,
                '**/something/else': true,
                '**/more': true,
                '**/andmore': true,
            },
        });
        const cmd1 = walker.spawnFindCmd(TEST_ROOT_FOLDER);
        walker.readStdout(cmd1, 'utf8', (err1, stdout1) => {
            assert.strictEqual(err1, null);
            for (const fileIn of filesIn) {
                assert.notStrictEqual(stdout1.split('\n').indexOf(fileIn), -1, stdout1);
            }
            for (const fileOut of filesOut) {
                assert.strictEqual(stdout1.split('\n').indexOf(fileOut), -1, stdout1);
            }
            done();
        });
    });
    function outputContains(stdout, ...files) {
        const lines = stdout.split('\n');
        return files.every((file) => lines.indexOf(file) >= 0);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvc2VhcmNoLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWxFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQzlFLENBQUE7QUFDRCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtBQUN4RSxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDaEUsTUFBTSxnQkFBZ0IsR0FBaUIsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFD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