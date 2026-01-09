/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { join } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI, URI as uri } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IWorkspaceContextService, toWorkspaceFolder, } from '../../../../../platform/workspace/common/workspace.js';
import { toWorkspaceFolders } from '../../../../../platform/workspaces/common/workspaces.js';
import { QueryBuilder } from '../../common/queryBuilder.js';
import { IPathService } from '../../../path/common/pathService.js';
import { TestPathService, TestEnvironmentService, } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { extUriBiasedIgnorePathCase } from '../../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const DEFAULT_EDITOR_CONFIG = {};
const DEFAULT_USER_CONFIG = {
    useRipgrep: true,
    useIgnoreFiles: true,
    useGlobalIgnoreFiles: true,
    useParentIgnoreFiles: true,
};
const DEFAULT_QUERY_PROPS = {};
const DEFAULT_TEXT_QUERY_PROPS = { usePCRE2: false };
suite('QueryBuilder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const PATTERN_INFO = { pattern: 'a' };
    const ROOT_1 = fixPath('/foo/root1');
    const ROOT_1_URI = getUri(ROOT_1);
    const ROOT_1_NAMED_FOLDER = toWorkspaceFolder(ROOT_1_URI);
    const WS_CONFIG_PATH = getUri('/bar/test.code-workspace'); // location of the workspace file (not important except that it is a file URI)
    let instantiationService;
    let queryBuilder;
    let mockConfigService;
    let mockContextService;
    let mockWorkspace;
    setup(() => {
        instantiationService = new TestInstantiationService();
        mockConfigService = new TestConfigurationService();
        mockConfigService.setUserConfiguration('search', DEFAULT_USER_CONFIG);
        mockConfigService.setUserConfiguration('editor', DEFAULT_EDITOR_CONFIG);
        instantiationService.stub(IConfigurationService, mockConfigService);
        mockContextService = new TestContextService();
        mockWorkspace = new Workspace('workspace', [toWorkspaceFolder(ROOT_1_URI)]);
        mockContextService.setWorkspace(mockWorkspace);
        instantiationService.stub(IWorkspaceContextService, mockContextService);
        instantiationService.stub(IEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IPathService, new TestPathService());
        queryBuilder = instantiationService.createInstance(QueryBuilder);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('simple text pattern', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO), {
            folderQueries: [],
            contentPattern: PATTERN_INFO,
            type: 2 /* QueryType.Text */,
        });
    });
    test('normalize literal newlines', () => {
        assertEqualTextQueries(queryBuilder.text({ pattern: 'foo\nbar', isRegExp: true }), {
            folderQueries: [],
            contentPattern: {
                pattern: 'foo\\nbar',
                isRegExp: true,
                isMultiline: true,
            },
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text({ pattern: 'foo\nbar', isRegExp: false }), {
            folderQueries: [],
            contentPattern: {
                pattern: 'foo\nbar',
                isRegExp: false,
                isMultiline: true,
            },
            type: 2 /* QueryType.Text */,
        });
    });
    test('splits include pattern when expandPatterns enabled', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], {
            includePattern: '**/foo, **/bar',
            expandPatterns: true,
        }), {
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/foo/**': true,
                '**/bar': true,
                '**/bar/**': true,
            },
        });
    });
    test('does not split include pattern when expandPatterns disabled', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: '**/foo, **/bar' }), {
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo, **/bar': true,
            },
        });
    });
    test('includePattern array', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], { includePattern: ['**/foo', '**/bar'] }), {
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/bar': true,
            },
        });
    });
    test('includePattern array with expandPatterns', () => {
        assertEqualQueries(queryBuilder.file([ROOT_1_NAMED_FOLDER], {
            includePattern: ['**/foo', '**/bar'],
            expandPatterns: true,
        }), {
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            type: 1 /* QueryType.File */,
            includePattern: {
                '**/foo': true,
                '**/foo/**': true,
                '**/bar': true,
                '**/bar/**': true,
            },
        });
    });
    test('folderResources', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI]), {
            contentPattern: PATTERN_INFO,
            folderQueries: [{ folder: ROOT_1_URI }],
            type: 2 /* QueryType.Text */,
        });
    });
    test('simple exclude setting', () => {
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: {
                'bar/**': true,
                'foo/**': {
                    when: '$(basename).ts',
                },
            },
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            expandPatterns: true, // verify that this doesn't affect patterns from configuration
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    excludePattern: [
                        {
                            pattern: {
                                'bar/**': true,
                                'foo/**': {
                                    when: '$(basename).ts',
                                },
                            },
                        },
                    ],
                },
            ],
            type: 2 /* QueryType.Text */,
        });
    });
    test('simple include', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: 'bar',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            includePattern: {
                '**/bar': true,
                '**/bar/**': true,
            },
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: 'bar',
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            includePattern: {
                bar: true,
            },
            type: 2 /* QueryType.Text */,
        });
    });
    test('simple include with ./ syntax', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: './bar',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    includePattern: {
                        bar: true,
                        'bar/**': true,
                    },
                },
            ],
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: '.\\bar',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    includePattern: {
                        bar: true,
                        'bar/**': true,
                    },
                },
            ],
            type: 2 /* QueryType.Text */,
        });
    });
    test('exclude setting and searchPath', () => {
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: {
                'foo/**/*.js': true,
                'bar/**': {
                    when: '$(basename).ts',
                },
            },
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            includePattern: './foo',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    includePattern: {
                        foo: true,
                        'foo/**': true,
                    },
                    excludePattern: [
                        {
                            pattern: {
                                'foo/**/*.js': true,
                                'bar/**': {
                                    when: '$(basename).ts',
                                },
                            },
                        },
                    ],
                },
            ],
            type: 2 /* QueryType.Text */,
        });
    });
    test('multiroot exclude settings', () => {
        const ROOT_2 = fixPath('/project/root2');
        const ROOT_2_URI = getUri(ROOT_2);
        const ROOT_3 = fixPath('/project/root3');
        const ROOT_3_URI = getUri(ROOT_3);
        mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath }, { path: ROOT_2_URI.fsPath }, { path: ROOT_3_URI.fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
        mockWorkspace.configuration = uri.file(fixPath('/config'));
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: { 'foo/**/*.js': true },
        }, ROOT_1_URI);
        mockConfigService.setUserConfiguration('search', {
            ...DEFAULT_USER_CONFIG,
            exclude: { bar: true },
        }, ROOT_2_URI);
        // There are 3 roots, the first two have search.exclude settings, test that the correct basic query is returned
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI, ROOT_2_URI, ROOT_3_URI]), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                { folder: ROOT_1_URI, excludePattern: makeExcludePatternFromPatterns('foo/**/*.js') },
                { folder: ROOT_2_URI, excludePattern: makeExcludePatternFromPatterns('bar') },
                { folder: ROOT_3_URI },
            ],
            type: 2 /* QueryType.Text */,
        });
        // Now test that it merges the root excludes when an 'include' is used
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI, ROOT_2_URI, ROOT_3_URI], {
            includePattern: './root2/src',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_2_URI,
                    includePattern: {
                        src: true,
                        'src/**': true,
                    },
                    excludePattern: [
                        {
                            pattern: { bar: true },
                        },
                    ],
                },
            ],
            type: 2 /* QueryType.Text */,
        });
    });
    test('simple exclude input pattern', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: 'foo' }],
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            type: 2 /* QueryType.Text */,
            excludePattern: patternsToIExpression(...globalGlob('foo')),
        });
    });
    test('file pattern trimming', () => {
        const content = 'content';
        assertEqualQueries(queryBuilder.file([], { filePattern: ` ${content} ` }), {
            folderQueries: [],
            filePattern: content,
            type: 1 /* QueryType.File */,
        });
    });
    test('exclude ./ syntax', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: './bar' }],
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar', 'bar/**'),
                },
            ],
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: './bar/**/*.ts' }],
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar/**/*.ts', 'bar/**/*.ts/**'),
                },
            ],
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            excludePattern: [{ pattern: '.\\bar\\**\\*.ts' }],
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                    excludePattern: makeExcludePatternFromPatterns('bar/**/*.ts', 'bar/**/*.ts/**'),
                },
            ],
            type: 2 /* QueryType.Text */,
        });
    });
    test('extraFileResources', () => {
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            extraFileResources: [getUri('/foo/bar.js')],
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            extraFileResources: [getUri('/foo/bar.js')],
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            extraFileResources: [getUri('/foo/bar.js')],
            excludePattern: [{ pattern: '*.js' }],
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            excludePattern: patternsToIExpression(...globalGlob('*.js')),
            type: 2 /* QueryType.Text */,
        });
        assertEqualTextQueries(queryBuilder.text(PATTERN_INFO, [ROOT_1_URI], {
            extraFileResources: [getUri('/foo/bar.js')],
            includePattern: '*.txt',
            expandPatterns: true,
        }), {
            contentPattern: PATTERN_INFO,
            folderQueries: [
                {
                    folder: ROOT_1_URI,
                },
            ],
            includePattern: patternsToIExpression(...globalGlob('*.txt')),
            type: 2 /* QueryType.Text */,
        });
    });
    suite('parseSearchPaths 1', () => {
        test('simple includes', () => {
            function testSimpleIncludes(includePattern, expectedPatterns) {
                const result = queryBuilder.parseSearchPaths(includePattern);
                assert.deepStrictEqual({ ...result.pattern }, patternsToIExpression(...expectedPatterns), includePattern);
                assert.strictEqual(result.searchPaths, undefined);
            }
            ;
            [
                ['a', ['**/a/**', '**/a']],
                ['a/b', ['**/a/b', '**/a/b/**']],
                ['a/b,  c', ['**/a/b', '**/c', '**/a/b/**', '**/c/**']],
                ['a,.txt', ['**/a', '**/a/**', '**/*.txt', '**/*.txt/**']],
                ['a,,,b', ['**/a', '**/a/**', '**/b', '**/b/**']],
                ['**/a,b/**', ['**/a', '**/a/**', '**/b/**']],
            ].forEach(([includePattern, expectedPatterns]) => testSimpleIncludes(includePattern, expectedPatterns));
        });
        function testIncludes(includePattern, expectedResult) {
            let actual;
            try {
                actual = queryBuilder.parseSearchPaths(includePattern);
            }
            catch (_) {
                actual = { searchPaths: [] };
            }
            assertEqualSearchPathResults(actual, expectedResult, includePattern);
        }
        function testIncludesDataItem([includePattern, expectedResult]) {
            testIncludes(includePattern, expectedResult);
        }
        test('absolute includes', () => {
            const cases = [
                [
                    fixPath('/foo/bar'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }],
                    },
                ],
                [
                    fixPath('/foo/bar') + ',' + 'a',
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }],
                        pattern: patternsToIExpression(...globalGlob('a')),
                    },
                ],
                [
                    fixPath('/foo/bar') + ',' + fixPath('/1/2'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/bar') }, { searchPath: getUri('/1/2') }],
                    },
                ],
                [
                    fixPath('/foo/bar') + ',' + fixPath('/foo/../foo/bar/fooar/..'),
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo/bar'),
                            },
                        ],
                    },
                ],
                [
                    fixPath('/foo/bar/**/*.ts'),
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo/bar'),
                                pattern: patternsToIExpression('**/*.ts', '**/*.ts/**'),
                            },
                        ],
                    },
                ],
                [
                    fixPath('/foo/bar/*a/b/c'),
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo/bar'),
                                pattern: patternsToIExpression('*a/b/c', '*a/b/c/**'),
                            },
                        ],
                    },
                ],
                [
                    fixPath('/*a/b/c'),
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/'),
                                pattern: patternsToIExpression('*a/b/c', '*a/b/c/**'),
                            },
                        ],
                    },
                ],
                [
                    fixPath('/foo/{b,c}ar'),
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo'),
                                pattern: patternsToIExpression('{b,c}ar', '{b,c}ar/**'),
                            },
                        ],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/single root folder', () => {
            const cases = [
                [
                    './a',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a', 'a/**'),
                            },
                        ],
                    },
                ],
                [
                    './a/',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a', 'a/**'),
                            },
                        ],
                    },
                ],
                [
                    './a/*b/c',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/*b/c', 'a/*b/c/**'),
                            },
                        ],
                    },
                ],
                [
                    './a/*b/c, ' + fixPath('/project/foo'),
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/*b/c', 'a/*b/c/**'),
                            },
                            {
                                searchPath: getUri('/project/foo'),
                            },
                        ],
                    },
                ],
                [
                    './a/b/,./c/d',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/b', 'a/b/**', 'c/d', 'c/d/**'),
                            },
                        ],
                    },
                ],
                [
                    '../',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo'),
                            },
                        ],
                    },
                ],
                [
                    '..',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo'),
                            },
                        ],
                    },
                ],
                [
                    '..\\bar',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri('/foo/bar'),
                            },
                        ],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/two root folders', () => {
            const ROOT_2 = '/project/root2';
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath }, { path: getUri(ROOT_2).fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './root1',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_1),
                            },
                        ],
                    },
                ],
                [
                    './root2',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_2),
                            },
                        ],
                    },
                ],
                [
                    './root1/a/**/b, ./root2/**/*.txt',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**'),
                            },
                            {
                                searchPath: getUri(ROOT_2),
                                pattern: patternsToIExpression('**/*.txt', '**/*.txt/**'),
                            },
                        ],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('include ./foldername', () => {
            const ROOT_2 = '/project/root2';
            const ROOT_1_FOLDERNAME = 'foldername';
            mockWorkspace.folders = toWorkspaceFolders([{ path: ROOT_1_URI.fsPath, name: ROOT_1_FOLDERNAME }, { path: getUri(ROOT_2).fsPath }], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './foldername',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                            },
                        ],
                    },
                ],
                [
                    './foldername/foo',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('foo', 'foo/**'),
                            },
                        ],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('folder with slash in the name', () => {
            const ROOT_2 = '/project/root2';
            const ROOT_2_URI = getUri(ROOT_2);
            const ROOT_1_FOLDERNAME = 'folder/one';
            const ROOT_2_FOLDERNAME = 'folder/two+'; // And another regex character, #126003
            mockWorkspace.folders = toWorkspaceFolders([
                { path: ROOT_1_URI.fsPath, name: ROOT_1_FOLDERNAME },
                { path: ROOT_2_URI.fsPath, name: ROOT_2_FOLDERNAME },
            ], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('config'));
            const cases = [
                [
                    './folder/one',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                            },
                        ],
                    },
                ],
                [
                    './folder/two+/foo/',
                    {
                        searchPaths: [
                            {
                                searchPath: ROOT_2_URI,
                                pattern: patternsToIExpression('foo', 'foo/**'),
                            },
                        ],
                    },
                ],
                ['./folder/onesomethingelse', { searchPaths: [] }],
                ['./folder/onesomethingelse/foo', { searchPaths: [] }],
                ['./folder', { searchPaths: [] }],
            ];
            cases.forEach(testIncludesDataItem);
        });
        test('relative includes w/multiple ambiguous root folders', () => {
            const ROOT_2 = '/project/rootB';
            const ROOT_3 = '/otherproject/rootB';
            mockWorkspace.folders = toWorkspaceFolders([
                { path: ROOT_1_URI.fsPath },
                { path: getUri(ROOT_2).fsPath },
                { path: getUri(ROOT_3).fsPath },
            ], WS_CONFIG_PATH, extUriBiasedIgnorePathCase);
            mockWorkspace.configuration = uri.file(fixPath('/config'));
            const cases = [
                [
                    '',
                    {
                        searchPaths: undefined,
                    },
                ],
                [
                    './',
                    {
                        searchPaths: undefined,
                    },
                ],
                [
                    './root1',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_1),
                            },
                        ],
                    },
                ],
                [
                    './root1,./',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_1),
                            },
                        ],
                    },
                ],
                [
                    './rootB',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_2),
                            },
                            {
                                searchPath: getUri(ROOT_3),
                            },
                        ],
                    },
                ],
                [
                    './rootB/a/**/b, ./rootB/b/**/*.txt',
                    {
                        searchPaths: [
                            {
                                searchPath: getUri(ROOT_2),
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**', 'b/**/*.txt', 'b/**/*.txt/**'),
                            },
                            {
                                searchPath: getUri(ROOT_3),
                                pattern: patternsToIExpression('a/**/b', 'a/**/b/**', 'b/**/*.txt', 'b/**/*.txt/**'),
                            },
                        ],
                    },
                ],
                [
                    './root1/**/foo/, bar/',
                    {
                        pattern: patternsToIExpression('**/bar', '**/bar/**'),
                        searchPaths: [
                            {
                                searchPath: ROOT_1_URI,
                                pattern: patternsToIExpression('**/foo', '**/foo/**'),
                            },
                        ],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
    });
    suite('parseSearchPaths 2', () => {
        function testIncludes(includePattern, expectedResult) {
            assertEqualSearchPathResults(queryBuilder.parseSearchPaths(includePattern), expectedResult, includePattern);
        }
        function testIncludesDataItem([includePattern, expectedResult]) {
            testIncludes(includePattern, expectedResult);
        }
        ;
        (isWindows ? test.skip : test)('includes with tilde', () => {
            const userHome = URI.file('/');
            const cases = [
                [
                    '~/foo/bar',
                    {
                        searchPaths: [{ searchPath: getUri(userHome.fsPath, '/foo/bar') }],
                    },
                ],
                [
                    '~/foo/bar, a',
                    {
                        searchPaths: [{ searchPath: getUri(userHome.fsPath, '/foo/bar') }],
                        pattern: patternsToIExpression(...globalGlob('a')),
                    },
                ],
                [
                    fixPath('/foo/~/bar'),
                    {
                        searchPaths: [{ searchPath: getUri('/foo/~/bar') }],
                    },
                ],
            ];
            cases.forEach(testIncludesDataItem);
        });
    });
    suite('smartCase', () => {
        test('no flags -> no change', () => {
            const query = queryBuilder.text({
                pattern: 'a',
            }, []);
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('maintains isCaseSensitive when smartCase not set', () => {
            const query = queryBuilder.text({
                pattern: 'a',
                isCaseSensitive: true,
            }, []);
            assert(query.contentPattern.isCaseSensitive);
        });
        test('maintains isCaseSensitive when smartCase set', () => {
            const query = queryBuilder.text({
                pattern: 'a',
                isCaseSensitive: true,
            }, [], {
                isSmartCase: true,
            });
            assert(query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines not case sensitive', () => {
            const query = queryBuilder.text({
                pattern: 'abcd',
            }, [], {
                isSmartCase: true,
            });
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines case sensitive', () => {
            const query = queryBuilder.text({
                pattern: 'abCd',
            }, [], {
                isSmartCase: true,
            });
            assert(query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines not case sensitive (regex)', () => {
            const query = queryBuilder.text({
                pattern: 'ab\\Sd',
                isRegExp: true,
            }, [], {
                isSmartCase: true,
            });
            assert(!query.contentPattern.isCaseSensitive);
        });
        test('smartCase determines case sensitive (regex)', () => {
            const query = queryBuilder.text({
                pattern: 'ab[A-Z]d',
                isRegExp: true,
            }, [], {
                isSmartCase: true,
            });
            assert(query.contentPattern.isCaseSensitive);
        });
    });
    suite('file', () => {
        test('simple file query', () => {
            const cacheKey = 'asdf';
            const query = queryBuilder.file([ROOT_1_NAMED_FOLDER], {
                cacheKey,
                sortByScore: true,
            });
            assert.strictEqual(query.folderQueries.length, 1);
            assert.strictEqual(query.cacheKey, cacheKey);
            assert(query.sortByScore);
        });
    });
    suite('pattern processing', () => {
        test('text query with comma-separated includes with no workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [], {
                includePattern: '*.js,*.ts',
                expandPatterns: true,
            });
            assert.deepEqual(query.includePattern, {
                '**/*.js/**': true,
                '**/*.js': true,
                '**/*.ts/**': true,
                '**/*.ts': true,
            });
            assert.strictEqual(query.folderQueries.length, 0);
        });
        test('text query with comma-separated includes with workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_URI], {
                includePattern: '*.js,*.ts',
                expandPatterns: true,
            });
            assert.deepEqual(query.includePattern, {
                '**/*.js/**': true,
                '**/*.js': true,
                '**/*.ts/**': true,
                '**/*.ts': true,
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test('text query with comma-separated excludes globally', () => {
            const query = queryBuilder.text({ pattern: `` }, [], {
                excludePattern: [{ pattern: '*.js,*.ts' }],
                expandPatterns: true,
            });
            assert.deepEqual(query.excludePattern, {
                '**/*.js/**': true,
                '**/*.js': true,
                '**/*.ts/**': true,
                '**/*.ts': true,
            });
            assert.strictEqual(query.folderQueries.length, 0);
        });
        test('text query with comma-separated excludes globally in a workspace', () => {
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ pattern: '*.js,*.ts' }],
                expandPatterns: true,
            });
            assert.deepEqual(query.excludePattern, {
                '**/*.js/**': true,
                '**/*.js': true,
                '**/*.ts/**': true,
                '**/*.ts': true,
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test.skip('text query with multiple comma-separated excludes', () => {
            // TODO: Fix. Will require `ICommonQueryProps.excludePattern` to support an array.
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ pattern: '*.js,*.ts' }, { pattern: 'foo/*,bar/*' }],
                expandPatterns: true,
            });
            assert.deepEqual(query.excludePattern, [
                {
                    '**/*.js/**': true,
                    '**/*.js': true,
                    '**/*.ts/**': true,
                    '**/*.ts': true,
                },
                {
                    '**/foo/*/**': true,
                    '**/foo/*': true,
                    '**/bar/*/**': true,
                    '**/bar/*': true,
                },
            ]);
            assert.strictEqual(query.folderQueries.length, 1);
        });
        test.skip('text query with base URI on exclud', () => {
            // TODO: Fix. Will require `ICommonQueryProps.excludePattern` to support an baseURI.
            const query = queryBuilder.text({ pattern: `` }, [ROOT_1_NAMED_FOLDER.uri], {
                excludePattern: [{ uri: ROOT_1_URI, pattern: '*.js,*.ts' }],
                expandPatterns: true,
            });
            // todo: incorporate the base URI into the pattern
            assert.deepEqual(query.excludePattern, {
                uri: ROOT_1_URI,
                pattern: {
                    '**/*.js/**': true,
                    '**/*.js': true,
                    '**/*.ts/**': true,
                    '**/*.ts': true,
                },
            });
            assert.strictEqual(query.folderQueries.length, 1);
        });
    });
});
function makeExcludePatternFromPatterns(...patterns) {
    const pattern = patternsToIExpression(...patterns);
    return pattern ? [{ pattern }] : undefined;
}
function assertEqualTextQueries(actual, expected) {
    expected = {
        ...DEFAULT_TEXT_QUERY_PROPS,
        ...expected,
    };
    return assertEqualQueries(actual, expected);
}
export function assertEqualQueries(actual, expected) {
    expected = {
        ...DEFAULT_QUERY_PROPS,
        ...expected,
    };
    const folderQueryToCompareObject = (fq) => {
        const excludePattern = fq.excludePattern?.map((e) => normalizeExpression(e.pattern));
        return {
            path: fq.folder.fsPath,
            excludePattern: excludePattern?.length ? excludePattern : undefined,
            includePattern: normalizeExpression(fq.includePattern),
            fileEncoding: fq.fileEncoding,
        };
    };
    // Avoid comparing URI objects, not a good idea
    if (expected.folderQueries) {
        assert.deepStrictEqual(actual.folderQueries.map(folderQueryToCompareObject), expected.folderQueries.map(folderQueryToCompareObject));
        actual.folderQueries = [];
        expected.folderQueries = [];
    }
    if (expected.extraFileResources) {
        assert.deepStrictEqual(actual.extraFileResources.map((extraFile) => extraFile.fsPath), expected.extraFileResources.map((extraFile) => extraFile.fsPath));
        delete expected.extraFileResources;
        delete actual.extraFileResources;
    }
    delete actual.usingSearchPaths;
    actual.includePattern = normalizeExpression(actual.includePattern);
    actual.excludePattern = normalizeExpression(actual.excludePattern);
    cleanUndefinedQueryValues(actual);
    assert.deepStrictEqual(actual, expected);
}
export function assertEqualSearchPathResults(actual, expected, message) {
    cleanUndefinedQueryValues(actual);
    assert.deepStrictEqual({ ...actual.pattern }, { ...expected.pattern }, message);
    assert.strictEqual(actual.searchPaths && actual.searchPaths.length, expected.searchPaths && expected.searchPaths.length);
    if (actual.searchPaths) {
        actual.searchPaths.forEach((searchPath, i) => {
            const expectedSearchPath = expected.searchPaths[i];
            assert.deepStrictEqual(searchPath.pattern && { ...searchPath.pattern }, expectedSearchPath.pattern);
            assert.strictEqual(searchPath.searchPath.toString(), expectedSearchPath.searchPath.toString());
        });
    }
}
/**
 * Recursively delete all undefined property values from the search query, to make it easier to
 * assert.deepStrictEqual with some expected object.
 */
export function cleanUndefinedQueryValues(q) {
    for (const key in q) {
        if (q[key] === undefined) {
            delete q[key];
        }
        else if (typeof q[key] === 'object') {
            cleanUndefinedQueryValues(q[key]);
        }
    }
    return q;
}
export function globalGlob(pattern) {
    return [`**/${pattern}/**`, `**/${pattern}`];
}
export function patternsToIExpression(...patterns) {
    return patterns.length
        ? patterns.reduce((glob, cur) => {
            glob[cur] = true;
            return glob;
        }, {})
        : undefined;
}
export function getUri(...slashPathParts) {
    return uri.file(fixPath(...slashPathParts));
}
export function fixPath(...slashPathParts) {
    if (isWindows && slashPathParts.length && !slashPathParts[0].match(/^c:/i)) {
        slashPathParts.unshift('c:');
    }
    return join(...slashPathParts);
}
export function normalizeExpression(expression) {
    if (!expression) {
        return expression;
    }
    const normalized = {};
    Object.keys(expression).forEach((key) => {
        normalized[key.replace(/\\/g, '/')] = expression[key];
    });
    return normalized;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9icm93c2VyL3F1ZXJ5QnVpbGRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsaUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFvQixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFRbEUsT0FBTyxFQUNOLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixP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