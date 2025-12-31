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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rT3BlbmVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExpbmtPcGVuZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSzFELE9BQU8sRUFDTixZQUFZLEdBRVosTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQTtBQUVsSSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLHdDQUF3QyxFQUN4Qyx3QkFBd0IsR0FDeEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUs3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUM1SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFD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