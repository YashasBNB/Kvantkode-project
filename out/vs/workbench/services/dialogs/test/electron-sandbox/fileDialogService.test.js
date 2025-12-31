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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9maWxlRGlhbG9nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FHbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FB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