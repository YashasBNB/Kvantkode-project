/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { Schemas } from '../../../../../../base/common/network.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService, } from '../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { TerminalLocalFileLinkOpener, TerminalLocalFolderInWorkspaceLinkOpener, TerminalSearchLinkOpener, } from '../../browser/terminalLinkOpeners.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { TestContextService } from '../../../../../test/common/workbenchTestServices.js';
import { ISearchService, } from '../../../../../services/search/common/search.js';
import { SearchService } from '../../../../../services/search/common/searchService.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCommand } from '../../../../../../platform/terminal/common/capabilities/commandDetection/terminalCommand.js';
class TestCommandDetectionCapability extends CommandDetectionCapability {
    setCommands(commands) {
        this._commands = commands;
    }
}
class TestFileService extends FileService {
    constructor() {
        super(...arguments);
        this._files = '*';
    }
    async stat(resource) {
        if (this._files === '*' || this._files.some((e) => e.toString() === resource.toString())) {
            return {
                isFile: true,
                isDirectory: false,
                isSymbolicLink: false,
            };
        }
        throw new Error('ENOENT');
    }
    setFiles(files) {
        this._files = files;
    }
}
class TestSearchService extends SearchService {
    async fileSearch(query) {
        return this._searchResult;
    }
    setSearchResult(result) {
        this._searchResult = result;
    }
}
class TestTerminalSearchLinkOpener extends TerminalSearchLinkOpener {
    setFileQueryBuilder(value) {
        this._fileQueryBuilder = value;
    }
}
suite('Workbench - TerminalLinkOpeners', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let fileService;
    let searchService;
    let activationResult;
    let xterm;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        fileService = store.add(new TestFileService(new NullLogService()));
        searchService = store.add(new TestSearchService(null, null, null, null, null, null, null));
        instantiationService.set(IFileService, fileService);
        instantiationService.set(ILogService, new NullLogService());
        instantiationService.set(ISearchService, searchService);
        instantiationService.set(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(ITerminalLogService, new NullLogService());
        instantiationService.stub(IWorkbenchEnvironmentService, {
            remoteAuthority: undefined,
        });
        // Allow intercepting link activations
        activationResult = undefined;
        instantiationService.stub(IQuickInputService, {
            quickAccess: {
                show(link) {
                    activationResult = { link, source: 'search' };
                },
            },
        });
        instantiationService.stub(IEditorService, {
            async openEditor(editor) {
                activationResult = {
                    source: 'editor',
                    link: editor.resource?.toString(),
                };
                // Only assert on selection if it's not the default value
                if (editor.options?.selection &&
                    (editor.options.selection.startColumn !== 1 ||
                        editor.options.selection.startLineNumber !== 1)) {
                    activationResult.selection = editor.options.selection;
                }
            },
        });
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true }));
    });
    suite('TerminalSearchLinkOpener', () => {
        let opener;
        let capabilities;
        let commandDetection;
        let localFileOpener;
        setup(() => {
            capabilities = store.add(new TerminalCapabilityStore());
            commandDetection = store.add(instantiationService.createInstance(TestCommandDetectionCapability, xterm));
            capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        });
        test('should open single exact match against cwd when searching if it exists when command detection cwd is available', async () => {
            localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
            const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
            opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/initial/cwd', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            // Set a fake detected command starting as line 0 to establish the cwd
            commandDetection.setCommands([
                new TerminalCommand(xterm, {
                    command: '',
                    commandLineConfidence: 'low',
                    exitCode: 0,
                    commandStartLineContent: '',
                    markProperties: {},
                    isTrusted: true,
                    cwd: '/initial/cwd',
                    timestamp: 0,
                    duration: 0,
                    executedX: undefined,
                    startX: undefined,
                    marker: {
                        line: 0,
                    },
                }),
            ]);
            fileService.setFiles([
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/bar.txt' }),
            ]);
            await opener.open({
                text: 'foo/bar.txt',
                bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                type: "Search" /* TerminalBuiltinLinkType.Search */,
            });
            deepStrictEqual(activationResult, {
                link: 'file:///initial/cwd/foo/bar.txt',
                source: 'editor',
            });
        });
        test("should open single exact match against cwd for paths containing a separator when searching if it exists, even when command detection isn't available", async () => {
            localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
            const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
            opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/initial/cwd', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            fileService.setFiles([
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/bar.txt' }),
            ]);
            await opener.open({
                text: 'foo/bar.txt',
                bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                type: "Search" /* TerminalBuiltinLinkType.Search */,
            });
            deepStrictEqual(activationResult, {
                link: 'file:///initial/cwd/foo/bar.txt',
                source: 'editor',
            });
        });
        test("should open single exact match against any folder for paths not containing a separator when there is a single search result, even when command detection isn't available", async () => {
            localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
            const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
            opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/initial/cwd', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            capabilities.remove(2 /* TerminalCapability.CommandDetection */);
            opener.setFileQueryBuilder({ file: () => null });
            fileService.setFiles([
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/baz.txt' }),
            ]);
            searchService.setSearchResult({
                messages: [],
                results: [
                    { resource: URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }) },
                ],
            });
            await opener.open({
                text: 'bar.txt',
                bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                type: "Search" /* TerminalBuiltinLinkType.Search */,
            });
            deepStrictEqual(activationResult, {
                link: 'file:///initial/cwd/foo/bar.txt',
                source: 'editor',
            });
        });
        test("should open single exact match against any folder for paths not containing a separator when there are multiple search results, even when command detection isn't available", async () => {
            localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
            const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
            opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/initial/cwd', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            capabilities.remove(2 /* TerminalCapability.CommandDetection */);
            opener.setFileQueryBuilder({ file: () => null });
            fileService.setFiles([
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.test.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/bar.test.txt' }),
            ]);
            searchService.setSearchResult({
                messages: [],
                results: [
                    { resource: URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }) },
                    { resource: URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.test.txt' }) },
                    { resource: URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/bar.test.txt' }) },
                ],
            });
            await opener.open({
                text: 'bar.txt',
                bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                type: "Search" /* TerminalBuiltinLinkType.Search */,
            });
            deepStrictEqual(activationResult, {
                link: 'file:///initial/cwd/foo/bar.txt',
                source: 'editor',
            });
        });
        test("should not open single exact match for paths not containing a when command detection isn't available", async () => {
            localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
            const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
            opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/initial/cwd', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            fileService.setFiles([
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo/bar.txt' }),
                URI.from({ scheme: Schemas.file, path: '/initial/cwd/foo2/bar.txt' }),
            ]);
            await opener.open({
                text: 'bar.txt',
                bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                type: "Search" /* TerminalBuiltinLinkType.Search */,
            });
            deepStrictEqual(activationResult, {
                link: 'bar.txt',
                source: 'search',
            });
        });
        suite('macOS/Linux', () => {
            setup(() => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
            });
            test('should apply the cwd to the link only when the file exists and cwdDetection is enabled', async () => {
                const cwd = '/Users/home/folder';
                const absoluteFile = '/Users/home/folder/file.txt';
                fileService.setFiles([
                    URI.from({ scheme: Schemas.file, path: absoluteFile }),
                    URI.from({ scheme: Schemas.file, path: '/Users/home/folder/other/file.txt' }),
                ]);
                // Set a fake detected command starting as line 0 to establish the cwd
                commandDetection.setCommands([
                    new TerminalCommand(xterm, {
                        command: '',
                        commandLineConfidence: 'low',
                        isTrusted: true,
                        cwd,
                        timestamp: 0,
                        duration: 0,
                        executedX: undefined,
                        startX: undefined,
                        marker: {
                            line: 0,
                        },
                        exitCode: 0,
                        commandStartLineContent: '',
                        markProperties: {},
                    }),
                ]);
                await opener.open({
                    text: 'file.txt',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///Users/home/folder/file.txt',
                    source: 'editor',
                });
                // Clear detected commands and ensure the same request results in a search since there are 2 matches
                commandDetection.setCommands([]);
                opener.setFileQueryBuilder({ file: () => null });
                searchService.setSearchResult({
                    messages: [],
                    results: [
                        {
                            resource: URI.from({
                                scheme: Schemas.file,
                                path: 'file:///Users/home/folder/file.txt',
                            }),
                        },
                        {
                            resource: URI.from({
                                scheme: Schemas.file,
                                path: 'file:///Users/home/folder/other/file.txt',
                            }),
                        },
                    ],
                });
                await opener.open({
                    text: 'file.txt',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file.txt',
                    source: 'search',
                });
            });
            test('should extract column and/or line numbers from links in a workspace containing spaces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/space folder', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
                fileService.setFiles([
                    URI.from({ scheme: Schemas.file, path: '/space folder/foo/bar.txt' }),
                ]);
                await opener.open({
                    text: './foo/bar.txt:10:5',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract column and/or line numbers from links and remove trailing periods', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/folder', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: '/folder/foo/bar.txt' })]);
                await opener.open({
                    text: './foo/bar.txt.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                });
                await opener.open({
                    text: './foo/bar.txt:10:5.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract column and/or line numbers from links and remove grepped lines', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/folder', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: '/folder/foo/bar.txt' })]);
                await opener.open({
                    text: "./foo/bar.txt:10:5:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: "./foo/bar.txt:10:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            // Test for https://github.com/microsoft/vscode/pull/200919#discussion_r1428124196
            test('should extract column and/or line numbers from links and remove grepped lines incl singular spaces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/folder', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: '/folder/foo/bar.txt' })]);
                await opener.open({
                    text: './foo/bar.txt:10:5: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract line numbers from links and remove ruby stack traces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '/folder', localFileOpener, localFolderOpener, () => 3 /* OperatingSystem.Linux */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: '/folder/foo/bar.rb' })]);
                await opener.open({
                    text: './foo/bar.rb:30:in `<main>`',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///folder/foo/bar.rb',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 30,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
        });
        suite('Windows', () => {
            setup(() => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, '', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
            });
            test('should apply the cwd to the link only when the file exists and cwdDetection is enabled', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:\\Users', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                const cwd = 'c:\\Users\\home\\folder';
                const absoluteFile = 'c:\\Users\\home\\folder\\file.txt';
                fileService.setFiles([URI.file('/c:/Users/home/folder/file.txt')]);
                // Set a fake detected command starting as line 0 to establish the cwd
                commandDetection.setCommands([
                    new TerminalCommand(xterm, {
                        exitCode: 0,
                        commandStartLineContent: '',
                        markProperties: {},
                        command: '',
                        commandLineConfidence: 'low',
                        isTrusted: true,
                        cwd,
                        executedX: undefined,
                        startX: undefined,
                        timestamp: 0,
                        duration: 0,
                        marker: {
                            line: 0,
                        },
                    }),
                ]);
                await opener.open({
                    text: 'file.txt',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/Users/home/folder/file.txt',
                    source: 'editor',
                });
                // Clear detected commands and ensure the same request results in a search
                commandDetection.setCommands([]);
                opener.setFileQueryBuilder({ file: () => null });
                searchService.setSearchResult({
                    messages: [],
                    results: [
                        { resource: URI.file(absoluteFile) },
                        { resource: URI.file('/c:/Users/home/folder/other/file.txt') },
                    ],
                });
                await opener.open({
                    text: 'file.txt',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file.txt',
                    source: 'search',
                });
            });
            test('should extract column and/or line numbers from links in a workspace containing spaces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:/space folder', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                fileService.setFiles([
                    URI.from({ scheme: Schemas.file, path: 'c:/space folder/foo/bar.txt' }),
                ]);
                await opener.open({
                    text: './foo/bar.txt:10:5',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:10:5',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:10',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/space%20folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract column and/or line numbers from links and remove trailing periods', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:/folder', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: 'c:/folder/foo/bar.txt' })]);
                await opener.open({
                    text: './foo/bar.txt.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                });
                await opener.open({
                    text: './foo/bar.txt:10:5.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:2:5.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 2,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:2.',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 2,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract column and/or line numbers from links and remove grepped lines', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:/folder', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: 'c:/folder/foo/bar.txt' })]);
                await opener.open({
                    text: "./foo/bar.txt:10:5:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: "./foo/bar.txt:10:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: ".\\foo\\bar.txt:10:5:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: ".\\foo\\bar.txt:10:import { ILoveVSCode } from './foo/bar.ts';",
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            // Test for https://github.com/microsoft/vscode/pull/200919#discussion_r1428124196
            test('should extract column and/or line numbers from links and remove grepped lines incl singular spaces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:/folder', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: 'c:/folder/foo/bar.txt' })]);
                await opener.open({
                    text: './foo/bar.txt:10:5: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: './foo/bar.txt:10: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:10:5: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 5,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.txt:10: ',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.txt',
                    source: 'editor',
                    selection: {
                        startColumn: 1,
                        startLineNumber: 10,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
            test('should extract line numbers from links and remove ruby stack traces', async () => {
                localFileOpener = instantiationService.createInstance(TerminalLocalFileLinkOpener);
                const localFolderOpener = instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
                opener = instantiationService.createInstance(TestTerminalSearchLinkOpener, capabilities, 'c:/folder', localFileOpener, localFolderOpener, () => 1 /* OperatingSystem.Windows */);
                fileService.setFiles([URI.from({ scheme: Schemas.file, path: 'c:/folder/foo/bar.rb' })]);
                await opener.open({
                    text: './foo/bar.rb:30:in `<main>`',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.rb',
                    source: 'editor',
                    selection: {
                        startColumn: 1, // Since Ruby doesn't appear to put columns in stack traces, this should be 1
                        startLineNumber: 30,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
                await opener.open({
                    text: '.\\foo\\bar.rb:30:in `<main>`',
                    bufferRange: { start: { x: 1, y: 1 }, end: { x: 8, y: 1 } },
                    type: "Search" /* TerminalBuiltinLinkType.Search */,
                });
                deepStrictEqual(activationResult, {
                    link: 'file:///c%3A/folder/foo/bar.rb',
                    source: 'editor',
                    selection: {
                        startColumn: 1, // Since Ruby doesn't appear to put columns in stack traces, this should be 1
                        startLineNumber: 30,
                        endColumn: undefined,
                        endLineNumber: undefined,
                    },
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rT3BlbmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL3Rlcm1pbmFsTGlua09wZW5lcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLMUQsT0FBTyxFQUNOLFlBQVksR0FFWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVGQUF1RixDQUFBO0FBRWxJLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0Isd0NBQXdDLEVBQ3hDLHdCQUF3QixHQUN4QixNQUFNLHNDQUFzQyxDQUFBO0FBSzdDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFBO0FBQzVILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsNEJBQTRCLEVB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