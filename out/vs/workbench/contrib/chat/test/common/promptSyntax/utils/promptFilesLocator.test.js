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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9wcm9tcHRGaWxlc0xvY2F0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hHLE9BQU8sRUFDTixVQUFVLEVBQ1YsV0FBVyxHQUNYLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUNOLFdBQVcsRUFDWCxrQkFBa0IsR0FDbEIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUs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