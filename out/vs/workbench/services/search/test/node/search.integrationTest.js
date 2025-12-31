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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3NlYXJjaC5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxNQUFNLElBQUksZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVsRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuQyxVQUFVLENBQUMsU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUMsTUFBTSxDQUM5RSxDQUFBO0FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7QUFDeEUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQ2hFLE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJ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