/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createURI } from '../testUtils/createUri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { basename } from '../../../../../../../base/common/resources.js';
import { isWindows } from '../../../../../../../base/common/platform.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { PromptsConfig } from '../../../../../../../platform/prompts/common/config.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { mockObject, mockService, } from '../../../../../../../platform/prompts/test/common/utils/mock.js';
import { isValidGlob, PromptFilesLocator, } from '../../../../common/promptSyntax/utils/promptFilesLocator.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IConfigurationService, } from '../../../../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, } from '../../../../../../../platform/workspace/common/workspace.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
const mockConfigService = (value) => {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            assert([PromptsConfig.KEY, PromptsConfig.LOCATIONS_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
};
/**
 * Mocked instance of {@link IWorkspaceContextService}.
 */
const mockWorkspaceService = (folders) => {
    return mockService({
        getWorkspace() {
            return mockObject({
                folders,
            });
        },
    });
};
suite('PromptFilesLocator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    if (isWindows) {
        return;
    }
    let initService;
    setup(async () => {
        initService = disposables.add(new TestInstantiationService());
        initService.stub(ILogService, new NullLogService());
        const fileService = disposables.add(initService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        initService.stub(IFileService, fileService);
    });
    /**
     * Create a new instance of {@link PromptFilesLocator} with provided mocked
     * values for configuration and workspace services.
     */
    const createPromptsLocator = async (configValue, workspaceFolderPaths, filesystem) => {
        await initService.createInstance(MockFilesystem, filesystem).mock();
        initService.stub(IConfigurationService, mockConfigService(configValue));
        const workspaceFolders = workspaceFolderPaths.map((path, index) => {
            const uri = createURI(path);
            return mockObject({
                uri,
                name: basename(uri),
                index,
            });
        });
        initService.stub(IWorkspaceContextService, mockWorkspaceService(workspaceFolders));
        return initService.createInstance(PromptFilesLocator);
    };
    suite('• empty workspace', () => {
        const EMPTY_WORKSPACE = [];
        suite('• empty filesystem', () => {
            test('• no config value', async () => {
                const locator = await createPromptsLocator(undefined, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [], 'No prompts must be found.');
            });
            test('• object config value', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts/': true,
                    '/tmp/prompts/': false,
                }, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual(await locator.listFiles(), [], 'No prompts must be found.');
            });
            test('• array config value', async () => {
                const locator = await createPromptsLocator(['relative/path/to/prompts/', '/abs/path'], EMPTY_WORKSPACE, []);
                assert.deepStrictEqual(await locator.listFiles(), [], 'No prompts must be found.');
            });
            test('• null config value', async () => {
                const locator = await createPromptsLocator(null, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [], 'No prompts must be found.');
            });
            test('• string config value', async () => {
                const locator = await createPromptsLocator('/etc/hosts/prompts', EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [], 'No prompts must be found.');
            });
        });
        suite('• non-empty filesystem', () => {
            test('• core logic', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': true,
                }, EMPTY_WORKSPACE, [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        ['/Users/legomushroom/repos/vscode/**/*specific*'],
                        ['/Users/legomushroom/repos/vscode/**/*specific*.prompt.md'],
                        ['/Users/legomushroom/repos/vscode/**/*specific*.md'],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        ['/Users/legomushroom/repos/vscode/**/nested/*specific*'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*.prompt.md'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/**/text/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/deps/text/nested/*spec*'],
                        ['/Users/legomushroom/repos/vscode/deps/text/nested/*specific*'],
                        ['/Users/legomushroom/repos/vscode/deps/**/*specific*'],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        ['/Users/legomushroom/repos/vscode/deps/text/**/*specific*'],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    suite('• single-root workspace', () => {
        suite('• glob pattern', () => {
            suite('• relative', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'deps/**',
                        'deps/**/*.prompt.md',
                        'deps/**/*',
                        'deps/**/*.md',
                        '**/text/**',
                        '**/text/**/*',
                        '**/text/**/*.md',
                        '**/text/**/*.prompt.md',
                        'deps/text/**',
                        'deps/text/**/*',
                        'deps/text/**/*.md',
                        'deps/text/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        ['**/*specific*'],
                        ['**/*specific*.prompt.md'],
                        ['**/*specific*.md'],
                        ['**/specific*', '**/unspecific1.prompt.md', '**/unspecific2.prompt.md'],
                        ['**/specific.prompt.md', '**/unspecific*.prompt.md'],
                        ['**/nested/specific.prompt.md', '**/nested/unspecific*.prompt.md'],
                        ['**/nested/*specific*'],
                        ['**/*spec*.prompt.md'],
                        ['**/*spec*'],
                        ['**/*spec*.md'],
                        ['**/deps/**/*spec*.md'],
                        ['**/text/**/*spec*.md'],
                        ['deps/text/nested/*spec*'],
                        ['deps/text/nested/*specific*'],
                        ['deps/**/*specific*'],
                        ['deps/**/specific*', 'deps/**/unspecific*.prompt.md'],
                        ['deps/**/specific*.md', 'deps/**/unspecific*.md'],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1.prompt.md',
                            'deps/**/unspecific2.prompt.md',
                        ],
                        ['deps/**/specific.prompt.md', 'deps/**/unspecific1*.md', 'deps/**/unspecific2*.md'],
                        ['deps/text/**/*specific*'],
                        ['deps/text/**/specific*', 'deps/text/**/unspecific*.prompt.md'],
                        ['deps/text/**/specific*.md', 'deps/text/**/unspecific*.md'],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1.prompt.md',
                            'deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1*.md',
                            'deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        ['/Users/legomushroom/repos/vscode/**/*specific*'],
                        ['/Users/legomushroom/repos/vscode/**/*specific*.prompt.md'],
                        ['/Users/legomushroom/repos/vscode/**/*specific*.md'],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        ['/Users/legomushroom/repos/vscode/**/nested/*specific*'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*.prompt.md'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*'],
                        ['/Users/legomushroom/repos/vscode/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/**/text/**/*spec*.md'],
                        ['/Users/legomushroom/repos/vscode/deps/text/nested/*spec*'],
                        ['/Users/legomushroom/repos/vscode/deps/text/nested/*specific*'],
                        ['/Users/legomushroom/repos/vscode/deps/**/*specific*'],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        ['/Users/legomushroom/repos/vscode/deps/text/**/*specific*'],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    test('• core logic', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
        }, ['/Users/legomushroom/repos/vscode'], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
            createURI('/Users/legomushroom/repos/vscode/.github/prompts/my.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
            createURI('/tmp/prompts/translate.to-rust.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md').fsPath,
        ], 'Must find correct prompts.');
    });
    test('• with disabled `.github/prompts` location', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
            '.github/prompts': false,
        }, ['/Users/legomushroom/repos/vscode'], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                            {
                                name: 'your.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
            createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
            createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
            createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
            createURI('/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md').path,
        ], 'Must find correct prompts.');
    });
    suite('• multi-root workspace', () => {
        suite('• core logic', () => {
            test('• without top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/node'], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is not part of the workspace, so prompt files are `ignored`
                    {
                        name: '/Users/legomushroom/repos/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').path,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            test('• with top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/prompt-name.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').fsPath,
                ], 'Must find correct prompts.');
            });
            test('• with disabled `.github/prompts` location', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                    '.github/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            test('• mixed', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/**/*test*': true,
                    '.copilot/prompts': false,
                    '.github/prompts': true,
                    '/absolute/path/prompts/some-prompt-file.prompt.md': true,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                            {
                                name: 'elf.prompt.md',
                                contents: 'haalo!',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                    // all of these are due to the `.github/prompts` setting
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/prompt-name.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md').fsPath,
                    // all of these are due to the `/Users/legomushroom/repos/**/*test*` setting
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
                    // this one is due to the specific `/absolute/path/prompts/some-prompt-file.prompt.md` setting
                    createURI('/absolute/path/prompts/some-prompt-file.prompt.md').fsPath,
                ], 'Must find correct prompts.');
            });
        });
        suite('• glob pattern', () => {
            suite('• relative', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'gen*/**',
                        'gen*/**/*.prompt.md',
                        'gen*/**/*',
                        'gen*/**/*.md',
                        '**/gen*/**',
                        '**/gen*/**/*',
                        '**/gen*/**/*.md',
                        '**/gen*/**/*.prompt.md',
                        '{generic,general,gen}/**',
                        '{generic,general,gen}/**/*.prompt.md',
                        '{generic,general,gen}/**/*',
                        '{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**',
                        '**/{generic,general,gen}/**/*',
                        '**/{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/prompts'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md')
                                    .fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        ['**/my.prompt.md', '**/*specific*', '**/*common*'],
                        ['**/my.prompt.md', '**/*specific*.prompt.md', '**/*common*.prompt.md'],
                        ['**/my*.md', '**/*specific*.md', '**/*common*.md'],
                        ['**/my*.md', '**/specific*', '**/unspecific*', '**/common*', '**/uncommon*'],
                        [
                            '**/my.prompt.md',
                            '**/specific.prompt.md',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                            '**/common.prompt.md',
                            '**/uncommon-10.prompt.md',
                        ],
                        ['gen*/**/my.prompt.md', 'gen*/**/*specific*', 'gen*/**/*common*'],
                        ['gen*/**/my.prompt.md', 'gen*/**/*specific*.prompt.md', 'gen*/**/*common*.prompt.md'],
                        ['gen*/**/my*.md', 'gen*/**/*specific*.md', 'gen*/**/*common*.md'],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/specific*',
                            'gen*/**/unspecific*',
                            'gen*/**/common*',
                            'gen*/**/uncommon*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/specific.prompt.md',
                            'gen*/**/unspecific1.prompt.md',
                            'gen*/**/unspecific2.prompt.md',
                            'gen*/**/common.prompt.md',
                            'gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/specific.prompt.md',
                            'gen/text/nested/unspecific1.prompt.md',
                            'gen/text/nested/unspecific2.prompt.md',
                            'general/common.prompt.md',
                            'general/uncommon-10.prompt.md',
                        ],
                        ['gen/text/my.prompt.md', 'gen/text/nested/*specific*', 'general/*common*'],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/**/specific.prompt.md',
                            'gen/text/**/unspecific1.prompt.md',
                            'gen/text/**/unspecific2.prompt.md',
                            'general/*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*',
                            '{gen,general}/**/*common*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*.prompt.md',
                            '{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/*specific*.md',
                            '{gen,general}/**/*common*.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/specific*',
                            '{gen,general}/**/unspecific*',
                            '{gen,general}/**/common*',
                            '{gen,general}/**/uncommon*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/specific.prompt.md',
                            '{gen,general}/**/unspecific1.prompt.md',
                            '{gen,general}/**/unspecific2.prompt.md',
                            '{gen,general}/**/common.prompt.md',
                            '{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/prompts'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md')
                                    .fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '/Users/legomushroom/repos/**',
                        '/Users/legomushroom/repos/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/*.md',
                        '/Users/legomushroom/repos/**/*',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/prompts'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md')
                                    .fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*',
                            '/Users/legomushroom/repos/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/*specific*.md',
                            '/Users/legomushroom/repos/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/specific*',
                            '/Users/legomushroom/repos/**/unspecific*',
                            '/Users/legomushroom/repos/**/common*',
                            '/Users/legomushroom/repos/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*',
                            '/Users/legomushroom/repos/**/gen*/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific*',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific*',
                            '/Users/legomushroom/repos/**/gen*/**/common*',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/*specific*',
                            '/Users/legomushroom/repos/prompts/general/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/prompts'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles()).map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md')
                                    .fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md')
                                    .fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    suite('• isValidGlob', () => {
        test('• valid patterns', () => {
            const globs = [
                '**',
                '\*',
                '\**',
                '**/*',
                '**/*.prompt.md',
                '/Users/legomushroom/**/*.prompt.md',
                '/Users/legomushroom/*.prompt.md',
                '/Users/legomushroom/*',
                '/Users/legomushroom/repos/{repo1,test}',
                '/Users/legomushroom/repos/{repo1,test}/**',
                '/Users/legomushroom/repos/{repo1,test}/*',
                '/Users/legomushroom/**/{repo1,test}/**',
                '/Users/legomushroom/**/{repo1,test}',
                '/Users/legomushroom/**/{repo1,test}/*',
                '/Users/legomushroom/**/repo[1,2,3]',
                '/Users/legomushroom/**/repo[1,2,3]/**',
                '/Users/legomushroom/**/repo[1,2,3]/*',
                '/Users/legomushroom/**/repo[1,2,3]/**/*.prompt.md',
                'repo[1,2,3]/**/*.prompt.md',
                'repo[[1,2,3]/**/*.prompt.md',
                '{repo1,test}/*.prompt.md',
                '{repo1,test}/*',
                '/{repo1,test}/*',
                '/{repo1,test}}/*',
            ];
            for (const glob of globs) {
                assert(isValidGlob(glob) === true, `'${glob}' must be a 'valid' glob pattern.`);
            }
        });
        test('• invalid patterns', () => {
            const globs = [
                '.',
                '\\*',
                '\\?',
                '\\*\\?\\*',
                'repo[1,2,3',
                'repo1,2,3]',
                'repo\\[1,2,3]',
                'repo[1,2,3\\]',
                'repo\\[1,2,3\\]',
                '{repo1,repo2',
                'repo1,repo2}',
                '\\{repo1,repo2}',
                '{repo1,repo2\\}',
                '\\{repo1,repo2\\}',
                '/Users/legomushroom/repos',
                '/Users/legomushroom/repo[1,2,3',
                '/Users/legomushroom/repo1,2,3]',
                '/Users/legomushroom/repo\\[1,2,3]',
                '/Users/legomushroom/repo[1,2,3\\]',
                '/Users/legomushroom/repo\\[1,2,3\\]',
                '/Users/legomushroom/{repo1,repo2',
                '/Users/legomushroom/repo1,repo2}',
                '/Users/legomushroom/\\{repo1,repo2}',
                '/Users/legomushroom/{repo1,repo2\\}',
                '/Users/legomushroom/\\{repo1,repo2\\}',
            ];
            for (const glob of globs) {
                assert(isValidGlob(glob) === false, `'${glob}' must be an 'invalid' glob pattern.`);
            }
        });
    });
    suite('• getConfigBasedSourceFolders', () => {
        test('• gets unambiguous list of folders', async () => {
            const locator = await createPromptsLocator({
                '.github/prompts': true,
                '/Users/**/repos/**': true,
                'gen/text/**': true,
                'gen/text/nested/*.prompt.md': true,
                'general/*': true,
                '/Users/legomushroom/repos/vscode/my-prompts': true,
                '/Users/legomushroom/repos/vscode/your-prompts/*.md': true,
                '/Users/legomushroom/repos/prompts/shared-prompts/*': true,
            }, ['/Users/legomushroom/repos/vscode', '/Users/legomushroom/repos/prompts'], []);
            assert.deepStrictEqual(locator.getConfigBasedSourceFolders().map((file) => file.fsPath), [
                createURI('/Users/legomushroom/repos/vscode/.github/prompts').fsPath,
                createURI('/Users/legomushroom/repos/prompts/.github/prompts').fsPath,
                createURI('/Users/legomushroom/repos/vscode/gen/text/nested').fsPath,
                createURI('/Users/legomushroom/repos/prompts/gen/text/nested').fsPath,
                createURI('/Users/legomushroom/repos/vscode/general').fsPath,
                createURI('/Users/legomushroom/repos/prompts/general').fsPath,
                createURI('/Users/legomushroom/repos/vscode/my-prompts').fsPath,
                createURI('/Users/legomushroom/repos/vscode/your-prompts').fsPath,
                createURI('/Users/legomushroom/repos/prompts/shared-prompts').fsPath,
            ], 'Must find correct prompts.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL3Byb21wdEZpbGVzTG9jYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEcsT0FBTyxFQUNOLFVBQVUsRUFDVixXQUFXLEdBQ1gsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sV0FBVyxFQUNYLGtCQUFrQixHQUNsQixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSx3QkFBd0Is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