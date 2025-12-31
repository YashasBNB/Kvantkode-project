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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvYnJvd3Nlci9xdWVyeUJ1aWxkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBb0IsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBUWxFLE9BQU8sRUFDTixlQUFlLEVBQ2Ysc0JBQXNCLEdBQ3RCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFN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