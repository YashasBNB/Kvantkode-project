/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService, } from '../../../../../../platform/files/common/files.js';
import { TerminalCompletionService, } from '../../browser/terminalCompletionService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import assert, { fail } from 'assert';
import { isWindows } from '../../../../../../base/common/platform.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ShellEnvDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/shellEnvDetectionCapability.js';
import { TerminalCompletionItemKind, } from '../../browser/terminalCompletionItem.js';
import { count } from '../../../../../../base/common/strings.js';
const pathSeparator = isWindows ? '\\' : '/';
/**
 * Assert the set of completions exist exactly, including their order.
 */
function assertCompletions(actual, expected, expectedConfig) {
    assert.deepStrictEqual(actual?.map((e) => ({
        label: e.label,
        detail: e.detail ?? '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: e.replacementIndex,
        replacementLength: e.replacementLength,
    })), expected.map((e) => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    })));
}
/**
 * Assert a set of completions exist within the actual set.
 */
function assertPartialCompletionsExist(actual, expectedPartial, expectedConfig) {
    if (!actual) {
        fail();
    }
    const expectedMapped = expectedPartial.map((e) => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    }));
    for (const expectedItem of expectedMapped) {
        assert.deepStrictEqual(actual
            .map((e) => ({
            label: e.label,
            detail: e.detail ?? '',
            kind: e.kind ?? TerminalCompletionItemKind.Folder,
            replacementIndex: e.replacementIndex,
            replacementLength: e.replacementLength,
        }))
            .find((e) => e.detail === expectedItem.detail), expectedItem);
    }
}
const testEnv = {
    HOME: '/home/user',
    USERPROFILE: '/home/user',
};
let homeDir = isWindows ? testEnv['USERPROFILE'] : testEnv['HOME'];
if (!homeDir.endsWith('/')) {
    homeDir += '/';
}
const standardTidleItem = Object.freeze({ label: '~', detail: homeDir });
suite('TerminalCompletionService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let capabilities;
    let validResources;
    let childResources;
    let terminalCompletionService;
    const provider = 'testProvider';
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map((e) => e.path).includes(resource.path)) {
                    throw new Error("Doesn't exist");
                }
                return createFileStat(resource);
            },
            async resolve(resource, options) {
                const children = childResources.filter((child) => {
                    const childFsPath = child.resource.path.replace(/\/$/, '');
                    const parentFsPath = resource.path.replace(/\/$/, '');
                    return (childFsPath.startsWith(parentFsPath) &&
                        count(childFsPath, '/') === count(parentFsPath, '/') + 1);
                });
                return createFileStat(resource, undefined, undefined, undefined, children);
            },
        });
        terminalCompletionService = store.add(instantiationService.createInstance(TerminalCompletionService));
        terminalCompletionService.processEnv = testEnv;
        validResources = [];
        childResources = [];
        capabilities = store.add(new TerminalCapabilityStore());
    });
    suite('resolveResources should return undefined', () => {
        test('if cwd is not provided', async () => {
            const resourceRequestConfig = { pathSeparator };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
        test('if neither filesRequested nor foldersRequested are true', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                pathSeparator,
            };
            validResources = [URI.parse('file:///test')];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
    });
    suite('resolveResources should return folder completions', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true, isFile: false },
                { resource: URI.parse('file:///test/file1.txt'), isDirectory: false, isFile: true },
            ];
        });
        test('| should return root-level completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 1, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 1, replacementLength: 0 });
        });
        test('./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 1, replacementLength: 2 });
        });
        test('cd ./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 2 });
        });
        test('cd ./f| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./f', 6, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 3 });
        });
    });
    suite('resolveResources should handle file and folder completion requests correctly', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/.hiddenFile'), isFile: true },
                { resource: URI.parse('file:///test/.hiddenFolder/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/file1.txt'), isFile: true },
            ];
        });
        test('./| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                {
                    label: './.hiddenFile',
                    detail: '/test/.hiddenFile',
                    kind: TerminalCompletionItemKind.File,
                },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                {
                    label: './file1.txt',
                    detail: '/test/file1.txt',
                    kind: TerminalCompletionItemKind.File,
                },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('./h| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './h', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                {
                    label: './.hiddenFile',
                    detail: '/test/.hiddenFile',
                    kind: TerminalCompletionItemKind.File,
                },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                {
                    label: './file1.txt',
                    detail: '/test/file1.txt',
                    kind: TerminalCompletionItemKind.File,
                },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 3 });
        });
    });
    suite('~ -> $HOME', () => {
        let resourceRequestConfig;
        let shellEnvDetection;
        setup(() => {
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({
                HOME: '/home',
                USERPROFILE: '/home',
            }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
            resourceRequestConfig = {
                cwd: URI.parse('file:///test/folder1'), // Updated to reflect home directory
                filesRequested: true,
                foldersRequested: true,
                pathSeparator,
            };
            validResources = [
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///home'),
                URI.parse('file:///home/vscode'),
                URI.parse('file:///home/vscode/foo'),
                URI.parse('file:///home/vscode/bar.txt'),
            ];
            childResources = [
                { resource: URI.parse('file:///home/vscode'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/foo'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/bar.txt'), isFile: true },
            ];
        });
        test('~| should return completion for ~', async () => {
            assertPartialCompletionsExist(await terminalCompletionService.resolveResources(resourceRequestConfig, '~', 1, provider, capabilities), [{ label: '~', detail: '/home/' }], { replacementIndex: 0, replacementLength: 1 });
        });
        test('~/| should return folder completions relative to $HOME', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/', 2, provider, capabilities), [
                { label: '~/', detail: '/home/' },
                { label: '~/vscode/', detail: '/home/vscode/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('~/vscode/| should return folder completions relative to $HOME/vscode', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/vscode/', 9, provider, capabilities), [
                { label: '~/vscode/', detail: '/home/vscode/' },
                { label: '~/vscode/foo/', detail: '/home/vscode/foo/' },
                {
                    label: '~/vscode/bar.txt',
                    detail: '/home/vscode/bar.txt',
                    kind: TerminalCompletionItemKind.File,
                },
            ], { replacementIndex: 0, replacementLength: 9 });
        });
    });
    suite('resolveResources edge cases and advanced scenarios', () => {
        setup(() => {
            validResources = [];
            childResources = [];
        });
        if (isWindows) {
            test('C:/Foo/| absolute paths on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:'),
                    foldersRequested: true,
                    pathSeparator,
                };
                validResources = [URI.parse('file:///C:/Foo')];
                childResources = [
                    { resource: URI.parse('file:///C:/Foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///C:/Foo/Baz.txt'), isDirectory: false, isFile: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'C:/Foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    { label: 'C:/Foo/', detail: 'C:/Foo/' },
                    { label: 'C:/Foo/Bar/', detail: 'C:/Foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
            test('c:/foo/| case insensitivity on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///c:'),
                    foldersRequested: true,
                    pathSeparator,
                };
                validResources = [URI.parse('file:///c:/foo')];
                childResources = [
                    { resource: URI.parse('file:///c:/foo/Bar'), isDirectory: true, isFile: false },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'c:/foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    // Note that the detail is normalizes drive letters to capital case intentionally
                    { label: 'c:/foo/', detail: 'C:/foo/' },
                    { label: 'c:/foo/Bar/', detail: 'C:/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
        }
        else {
            test('/foo/| absolute paths NOT on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///'),
                    foldersRequested: true,
                    pathSeparator,
                };
                validResources = [URI.parse('file:///foo')];
                childResources = [
                    { resource: URI.parse('file:///foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///foo/Baz.txt'), isDirectory: false, isFile: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '/foo/', 5, provider, capabilities);
                assertCompletions(result, [
                    { label: '/foo/', detail: '/foo/' },
                    { label: '/foo/Bar/', detail: '/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 5 });
            });
        }
        if (isWindows) {
            test('.\\folder | Case insensitivity should resolve correctly on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:/test'),
                    foldersRequested: true,
                    pathSeparator: '\\',
                };
                validResources = [URI.parse('file:///C:/test')];
                childResources = [
                    { resource: URI.parse('file:///C:/test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///C:/test/anotherFolder/'), isDirectory: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '.\\folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: '.\\', detail: 'C:\\test\\' },
                    { label: '.\\FolderA\\', detail: 'C:\\test\\FolderA\\' },
                    { label: '.\\anotherFolder\\', detail: 'C:\\test\\anotherFolder\\' },
                    { label: '.\\..\\', detail: 'C:\\' },
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        else {
            test('./folder | Case sensitivity should resolve correctly on Mac/Unix', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///test'),
                    foldersRequested: true,
                    pathSeparator: '/',
                };
                validResources = [URI.parse('file:///test')];
                childResources = [
                    { resource: URI.parse('file:///test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///test/foldera/'), isDirectory: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: './', detail: '/test/' },
                    { label: './FolderA/', detail: '/test/FolderA/' },
                    { label: './foldera/', detail: '/test/foldera/' },
                    { label: './../', detail: '/' },
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        test('| Empty input should resolve to current directory', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true },
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 0, replacementLength: 0 });
        });
        test('./| should handle large directories with many results gracefully', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            validResources = [URI.parse('file:///test')];
            childResources = Array.from({ length: 1000 }, (_, i) => ({
                resource: URI.parse(`file:///test/folder${i}/`),
                isDirectory: true,
            }));
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assert(result);
            // includes the 1000 folders + ./ and ./../
            assert.strictEqual(result?.length, 1002);
            assert.strictEqual(result[0].label, `.${pathSeparator}`);
            assert.strictEqual(result.at(-1)?.label, `.${pathSeparator}..${pathSeparator}`);
        });
        test('./folder| should include current folder with trailing / is missing', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true },
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder1', 10, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 1, replacementLength: 9 });
        });
        test('folder/| should normalize current and parent folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator,
            };
            validResources = [
                URI.parse('file:///'),
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///test/folder2'),
            ];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true },
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'test/', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './test/', detail: '/test/' },
                { label: './test/folder1/', detail: '/test/folder1/' },
                { label: './test/folder2/', detail: '/test/folder2/' },
                { label: './test/../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 5 });
        });
    });
    suite('cdpath', () => {
        let shellEnvDetection;
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///cdpath_value/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///cdpath_value/file1.txt'), isFile: true },
            ];
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({ CDPATH: '/cdpath_value' }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        });
        test('cd | should show paths from $CDPATH (relative)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [{ label: 'folder1', detail: 'CDPATH /cdpath_value/folder1/' }], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should show paths from $CDPATH (absolute)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'absolute');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [{ label: '/cdpath_value/folder1/', detail: 'CDPATH' }], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should support pulling from multiple paths in $CDPATH', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const pathPrefix = isWindows ? 'c:\\' : '/';
            const delimeter = isWindows ? ';' : ':';
            const separator = isWindows ? '\\' : '/';
            shellEnvDetection.setEnvironment({
                CDPATH: `${pathPrefix}cdpath1_value${delimeter}${pathPrefix}cdpath2_value${separator}inner_dir`,
            }, true);
            const uriPathPrefix = isWindows ? 'file:///c:/' : 'file:///';
            validResources = [
                URI.parse(`${uriPathPrefix}test`),
                URI.parse(`${uriPathPrefix}cdpath1_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir`),
            ];
            childResources = [
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/file1.txt`), isFile: true },
                {
                    resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder1/`),
                    isDirectory: true,
                },
                {
                    resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder2/`),
                    isDirectory: true,
                },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/file1.txt`), isFile: true },
            ];
            const resourceRequestConfig = {
                cwd: URI.parse(`${uriPathPrefix}test`),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator,
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            const finalPrefix = isWindows ? 'C:\\' : '/';
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath1_value/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath1_value/folder2/` },
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder2/` },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3Rlcm1pbmFsQ29tcGxldGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFlBQVksR0FHWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTix5QkFBeUIsR0FFekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsU0FBUyxFQUE0QixNQUFNLDJDQUEyQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUM1SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RkFBd0YsQ0FBQTtBQUVwSSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWhFLE1BQU0s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