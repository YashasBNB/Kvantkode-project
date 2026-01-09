/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import * as sinon from 'sinon';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService, IFileDialogService, } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../../../../platform/workspaces/common/workspaces.js';
import { FileDialogService } from '../../electron-sandbox/fileDialogService.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IHistoryService } from '../../../history/common/history.js';
import { IHostService } from '../../../host/browser/host.js';
import { IPathService } from '../../../path/common/pathService.js';
import { BrowserWorkspaceEditingService } from '../../../workspaces/browser/workspaceEditingService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
let TestFileDialogService = class TestFileDialogService extends FileDialogService {
    constructor(simple, hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        super(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService);
        this.simple = simple;
    }
    getSimpleFileDialog() {
        if (this.simple) {
            return this.simple;
        }
        else {
            return super.getSimpleFileDialog();
        }
    }
};
TestFileDialogService = __decorate([
    __param(1, IHostService),
    __param(2, IWorkspaceContextService),
    __param(3, IHistoryService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IFileService),
    __param(8, IOpenerService),
    __param(9, INativeHostService),
    __param(10, IDialogService),
    __param(11, ILanguageService),
    __param(12, IWorkspacesService),
    __param(13, ILabelService),
    __param(14, IPathService),
    __param(15, ICommandService),
    __param(16, IEditorService),
    __param(17, ICodeEditorService),
    __param(18, ILogService)
], TestFileDialogService);
suite('FileDialogService', function () {
    let instantiationService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const testFile = URI.file('/test/file');
    setup(async function () {
        disposables.add((instantiationService = workbenchInstantiationService(undefined, disposables)));
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('files', { simpleDialog: { enable: true } });
        instantiationService.stub(IConfigurationService, configurationService);
    });
    test('Local - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Virtual - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 1);
                assert.strictEqual(options.availableFileSystems[0], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        instantiationService.stub(IPathService, new (class {
            constructor() {
                this.defaultUriScheme = 'vscode-virtual-test';
                this.userHome = async () => URI.file('/user/home');
            }
        })());
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Remote - open/save workspaces availableFilesystems', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 2);
                assert.strictEqual(options.availableFileSystems[0], Schemas.vscodeRemote);
                assert.strictEqual(options.availableFileSystems[1], Schemas.file);
                return testFile;
            }
            async showSaveDialog(options) {
                assert.strictEqual(options.availableFileSystems?.length, 2);
                assert.strictEqual(options.availableFileSystems[0], Schemas.vscodeRemote);
                assert.strictEqual(options.availableFileSystems[1], Schemas.file);
                return testFile;
            }
            dispose() { }
        }
        instantiationService.set(IWorkbenchEnvironmentService, new (class extends mock() {
            get remoteAuthority() {
                return 'testRemote';
            }
        })());
        instantiationService.stub(IPathService, new (class {
            constructor() {
                this.defaultUriScheme = Schemas.vscodeRemote;
                this.userHome = async () => URI.file('/user/home');
            }
        })());
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        instantiationService.set(IFileDialogService, dialogService);
        const workspaceService = disposables.add(instantiationService.createInstance(BrowserWorkspaceEditingService));
        assert.strictEqual((await workspaceService.pickNewWorkspacePath())?.path.startsWith(testFile.path), true);
        assert.strictEqual(await dialogService.pickWorkspaceAndOpen({}), undefined);
    });
    test('Remote - filters default files/folders to RA (#195938)', async function () {
        class TestSimpleFileDialog {
            async showOpenDialog() {
                return testFile;
            }
            async showSaveDialog() {
                return testFile;
            }
            dispose() { }
        }
        instantiationService.set(IWorkbenchEnvironmentService, new (class extends mock() {
            get remoteAuthority() {
                return 'testRemote';
            }
        })());
        instantiationService.stub(IPathService, new (class {
            constructor() {
                this.defaultUriScheme = Schemas.vscodeRemote;
                this.userHome = async () => URI.file('/user/home');
            }
        })());
        const dialogService = instantiationService.createInstance(TestFileDialogService, new TestSimpleFileDialog());
        const historyService = instantiationService.get(IHistoryService);
        const getLastActiveWorkspaceRoot = sinon.spy(historyService, 'getLastActiveWorkspaceRoot');
        const getLastActiveFile = sinon.spy(historyService, 'getLastActiveFile');
        await dialogService.defaultFilePath();
        assert.deepStrictEqual(getLastActiveFile.args, [[Schemas.vscodeRemote, 'testRemote']]);
        assert.deepStrictEqual(getLastActiveWorkspaceRoot.args, [[Schemas.vscodeRemote, 'testRemote']]);
        await dialogService.defaultFolderPath();
        assert.deepStrictEqual(getLastActiveWorkspaceRoot.args[1], [Schemas.vscodeRemote, 'testRemote']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RpYWxvZ3MvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2ZpbGVEaWFsb2dTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUdsQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsYUFBYSxF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