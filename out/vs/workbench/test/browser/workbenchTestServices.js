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
import { FileEditorInput } from '../../contrib/files/browser/editors/fileEditorInput.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { basename, isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ITelemetryService, } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditorInput } from '../../common/editor/editorInput.js';
import { EditorExtensions, EditorExtensions as Extensions, } from '../../common/editor.js';
import { DEFAULT_EDITOR_PART_OPTIONS, } from '../../browser/parts/editor/editor.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IWorkingCopyBackupService, } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService, } from '../../services/layout/browser/layoutService.js';
import { TextModelResolverService } from '../../services/textmodelResolver/common/textModelResolverService.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IUntitledTextEditorService, UntitledTextEditorService, } from '../../services/untitled/common/untitledTextEditorService.js';
import { IWorkspaceContextService, } from '../../../platform/workspace/common/workspace.js';
import { ILifecycleService, } from '../../services/lifecycle/common/lifecycle.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IFileService, } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { ITextFileService, } from '../../services/textfile/common/textfiles.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IHistoryService } from '../../services/history/common/history.js';
import { IInstantiationService, } from '../../../platform/instantiation/common/instantiation.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService, } from '../../../editor/common/services/textResourceConfiguration.js';
import { Position as EditorPosition } from '../../../editor/common/core/position.js';
import { IMenuService, } from '../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService, MockKeybindingService, } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { Range } from '../../../editor/common/core/range.js';
import { IDialogService, IFileDialogService, } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IDecorationsService, } from '../../services/decorations/common/decorations.js';
import { toDisposable, Disposable, DisposableStore, } from '../../../base/common/lifecycle.js';
import { IEditorGroupsService, } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, } from '../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { EditorPaneDescriptor } from '../../browser/editor.js';
import { ILoggerService, ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { IStorageService, } from '../../../platform/storage/common/storage.js';
import { isLinux, isWindows, } from '../../../base/common/platform.js';
import { LabelService } from '../../services/label/common/labelService.js';
import { bufferToStream, VSBuffer, } from '../../../base/common/buffer.js';
import { Schemas } from '../../../base/common/network.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import product from '../../../platform/product/common/product.js';
import { IHostService } from '../../services/host/browser/host.js';
import { IWorkingCopyService, WorkingCopyService, } from '../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService, FilesConfigurationService, } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { BrowserWorkbenchEnvironmentService } from '../../services/environment/browser/environmentService.js';
import { BrowserTextFileService } from '../../services/textfile/browser/browserTextFileService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { createTextBufferFactoryFromStream } from '../../../editor/common/model/textModel.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { IProgressService, Progress, } from '../../../platform/progress/common/progress.js';
import { IWorkingCopyFileService, WorkingCopyFileService, } from '../../services/workingCopy/common/workingCopyFileService.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { TextFileEditorModel } from '../../services/textfile/common/textFileEditorModel.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { EditorPane } from '../../browser/parts/editor/editorPane.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { CodeEditorService } from '../../services/editor/browser/codeEditorService.js';
import { MainEditorPart } from '../../browser/parts/editor/editorPart.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { QuickInputService } from '../../services/quickinput/browser/quickInputService.js';
import { IListService } from '../../../platform/list/browser/listService.js';
import { win32, posix } from '../../../base/common/path.js';
import { TestContextService, TestStorageService, TestTextResourcePropertiesService, TestExtensionService, TestProductService, createFileStat, TestLoggerService, TestWorkspaceTrustManagementService, TestWorkspaceTrustRequestService, TestMarkerService, TestHistoryService, } from '../common/workbenchTestServices.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { EncodingOracle, } from '../../services/textfile/browser/textFileService.js';
import { UTF16le, UTF16be, UTF8_with_bom } from '../../services/textfile/common/encoding.js';
import { ColorScheme } from '../../../platform/theme/common/theme.js';
import { Iterable } from '../../../base/common/iterator.js';
import { InMemoryWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackupService.js';
import { BrowserWorkingCopyBackupService } from '../../services/workingCopy/browser/workingCopyBackupService.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { TextResourceEditor } from '../../browser/parts/editor/textResourceEditor.js';
import { TestCodeEditor } from '../../../editor/test/browser/testCodeEditor.js';
import { TextFileEditor } from '../../contrib/files/browser/editors/textFileEditor.js';
import { TextResourceEditorInput } from '../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../services/untitled/common/untitledTextEditorInput.js';
import { SideBySideEditor } from '../../browser/parts/editor/sideBySideEditor.js';
import { IWorkspacesService, } from '../../../platform/workspaces/common/workspaces.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../platform/workspace/common/workspaceTrust.js';
import { ITerminalLogService, } from '../../../platform/terminal/common/terminal.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, } from '../../contrib/terminal/browser/terminal.js';
import { assertIsDefined, upcast } from '../../../base/common/types.js';
import { ITerminalProfileResolverService, ITerminalProfileService, } from '../../contrib/terminal/common/terminal.js';
import { EditorResolverService } from '../../services/editor/browser/editorResolverService.js';
import { FILE_EDITOR_INPUT_ID } from '../../contrib/files/common/files.js';
import { IEditorResolverService } from '../../services/editor/common/editorResolverService.js';
import { IWorkingCopyEditorService, WorkingCopyEditorService, } from '../../services/workingCopy/common/workingCopyEditorService.js';
import { IElevatedFileService } from '../../services/files/common/elevatedFileService.js';
import { BrowserElevatedFileService } from '../../services/files/browser/elevatedFileService.js';
import { IEditorWorkerService } from '../../../editor/common/services/editorWorker.js';
import { ResourceMap } from '../../../base/common/map.js';
import { SideBySideEditorInput } from '../../common/editor/sideBySideEditorInput.js';
import { ITextEditorService, TextEditorService, } from '../../services/textfile/common/textEditorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { env } from '../../../base/common/process.js';
import { isValidBasename } from '../../../base/common/extpath.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService, } from '../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../editor/common/services/languageFeaturesService.js';
import { TextEditorPaneSelection } from '../../browser/parts/editor/textEditor.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { TestEditorWorkerService } from '../../../editor/test/common/services/testEditorWorkerService.js';
import { IRemoteAgentService, } from '../../services/remote/common/remoteAgentService.js';
import { ILanguageDetectionService } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { IUserDataProfilesService, toUserDataProfile, UserDataProfilesService, } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { Codicon } from '../../../base/common/codicons.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService, } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { EditorParts } from '../../browser/parts/editor/editorParts.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IEditorPaneService } from '../../services/editor/common/editorPaneService.js';
import { EditorPaneService } from '../../services/editor/browser/editorPaneService.js';
import { IContextMenuService, IContextViewService, } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { CustomEditorLabelService, ICustomEditorLabelService, } from '../../services/editor/common/customEditorLabelService.js';
import { TerminalConfigurationService } from '../../contrib/terminal/browser/terminalConfigurationService.js';
import { TerminalLogService } from '../../../platform/terminal/common/terminalLogService.js';
import { IEnvironmentVariableService } from '../../contrib/terminal/common/environmentVariable.js';
import { EnvironmentVariableService } from '../../contrib/terminal/common/environmentVariableService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../platform/hover/test/browser/nullHoverService.js';
import { IActionViewItemService, NullActionViewItemService, } from '../../../platform/actions/browser/actionViewItemService.js';
export function createFileEditorInput(instantiationService, resource) {
    return instantiationService.createInstance(FileEditorInput, resource, undefined, undefined, undefined, undefined, undefined, undefined);
}
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    },
});
export class TestTextResourceEditor extends TextResourceEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, {}));
    }
}
export class TestTextFileEditor extends TextFileEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, {
            contributions: [],
        }));
    }
    setSelection(selection, reason) {
        this._options = selection
            ? upcast({ selection })
            : undefined;
        this._onDidChangeSelection.fire({ reason });
    }
    getSelection() {
        const options = this.options;
        if (!options) {
            return undefined;
        }
        const textSelection = options.selection;
        if (!textSelection) {
            return undefined;
        }
        return new TextEditorPaneSelection(new Selection(textSelection.startLineNumber, textSelection.startColumn, textSelection.endLineNumber ?? textSelection.startLineNumber, textSelection.endColumn ?? textSelection.startColumn));
    }
}
export class TestWorkingCopyService extends WorkingCopyService {
    testUnregisterWorkingCopy(workingCopy) {
        return super.unregisterWorkingCopy(workingCopy);
    }
}
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([ILifecycleService, disposables.add(new TestLifecycleService())], [IActionViewItemService, new SyncDescriptor(NullActionViewItemService)])));
    instantiationService.stub(IProductService, TestProductService);
    instantiationService.stub(IEditorWorkerService, new TestEditorWorkerService());
    instantiationService.stub(IWorkingCopyService, disposables.add(new TestWorkingCopyService()));
    const environmentService = overrides?.environmentService
        ? overrides.environmentService(instantiationService)
        : TestEnvironmentService;
    instantiationService.stub(IEnvironmentService, environmentService);
    instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
    instantiationService.stub(ILogService, new NullLogService());
    const contextKeyService = overrides?.contextKeyService
        ? overrides.contextKeyService(instantiationService)
        : instantiationService.createInstance(MockContextKeyService);
    instantiationService.stub(IContextKeyService, contextKeyService);
    instantiationService.stub(IProgressService, new TestProgressService());
    const workspaceContextService = new TestContextService(TestWorkspace);
    instantiationService.stub(IWorkspaceContextService, workspaceContextService);
    const configService = overrides?.configurationService
        ? overrides.configurationService(instantiationService)
        : new TestConfigurationService({
            files: {
                participants: {
                    timeout: 60000,
                },
            },
        });
    instantiationService.stub(IConfigurationService, configService);
    const textResourceConfigurationService = new TestTextResourceConfigurationService(configService);
    instantiationService.stub(ITextResourceConfigurationService, textResourceConfigurationService);
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
    instantiationService.stub(IRemoteAgentService, new TestRemoteAgentService());
    instantiationService.stub(ILanguageDetectionService, new TestLanguageDetectionService());
    instantiationService.stub(IPathService, overrides?.pathService ? overrides.pathService(instantiationService) : new TestPathService());
    const layoutService = new TestLayoutService();
    instantiationService.stub(IWorkbenchLayoutService, layoutService);
    instantiationService.stub(IDialogService, new TestDialogService());
    const accessibilityService = new TestAccessibilityService();
    instantiationService.stub(IAccessibilityService, accessibilityService);
    instantiationService.stub(IAccessibilitySignalService, {
        playSignal: async () => { },
        isSoundEnabled(signal) {
            return false;
        },
    });
    instantiationService.stub(IFileDialogService, instantiationService.createInstance(TestFileDialogService));
    instantiationService.stub(ILanguageService, disposables.add(instantiationService.createInstance(LanguageService)));
    instantiationService.stub(ILanguageFeaturesService, new LanguageFeaturesService());
    instantiationService.stub(ILanguageFeatureDebounceService, instantiationService.createInstance(LanguageFeatureDebounceService));
    instantiationService.stub(IHistoryService, new TestHistoryService());
    instantiationService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(configService));
    instantiationService.stub(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
    const themeService = new TestThemeService();
    instantiationService.stub(IThemeService, themeService);
    instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
    instantiationService.stub(IModelService, disposables.add(instantiationService.createInstance(ModelService)));
    const fileService = overrides?.fileService
        ? overrides.fileService(instantiationService)
        : disposables.add(new TestFileService());
    instantiationService.stub(IFileService, fileService);
    instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
    const markerService = new TestMarkerService();
    instantiationService.stub(IMarkerService, markerService);
    instantiationService.stub(IFilesConfigurationService, disposables.add(instantiationService.createInstance(TestFilesConfigurationService)));
    const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(instantiationService.createInstance(UserDataProfilesService)));
    instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
    instantiationService.stub(IWorkingCopyBackupService, overrides?.workingCopyBackupService
        ? overrides?.workingCopyBackupService(instantiationService)
        : disposables.add(new TestWorkingCopyBackupService()));
    instantiationService.stub(ITelemetryService, NullTelemetryService);
    instantiationService.stub(INotificationService, new TestNotificationService());
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IMenuService, new TestMenuService());
    const keybindingService = new MockKeybindingService();
    instantiationService.stub(IKeybindingService, keybindingService);
    instantiationService.stub(IDecorationsService, new TestDecorationsService());
    instantiationService.stub(IExtensionService, new TestExtensionService());
    instantiationService.stub(IWorkingCopyFileService, disposables.add(instantiationService.createInstance(WorkingCopyFileService)));
    instantiationService.stub(ITextFileService, overrides?.textFileService
        ? overrides.textFileService(instantiationService)
        : disposables.add(instantiationService.createInstance(TestTextFileService)));
    instantiationService.stub(IHostService, instantiationService.createInstance(TestHostService));
    instantiationService.stub(ITextModelService, (disposables.add(instantiationService.createInstance(TextModelResolverService))));
    instantiationService.stub(ILoggerService, disposables.add(new TestLoggerService(TestEnvironmentService.logsHome)));
    const editorGroupService = new TestEditorGroupsService([new TestEditorGroupView(0)]);
    instantiationService.stub(IEditorGroupsService, editorGroupService);
    instantiationService.stub(ILabelService, disposables.add(instantiationService.createInstance(LabelService)));
    const editorService = overrides?.editorService
        ? overrides.editorService(instantiationService)
        : disposables.add(new TestEditorService(editorGroupService));
    instantiationService.stub(IEditorService, editorService);
    instantiationService.stub(IEditorPaneService, new EditorPaneService());
    instantiationService.stub(IWorkingCopyEditorService, disposables.add(instantiationService.createInstance(WorkingCopyEditorService)));
    instantiationService.stub(IEditorResolverService, disposables.add(instantiationService.createInstance(EditorResolverService)));
    const textEditorService = overrides?.textEditorService
        ? overrides.textEditorService(instantiationService)
        : disposables.add(instantiationService.createInstance(TextEditorService));
    instantiationService.stub(ITextEditorService, textEditorService);
    instantiationService.stub(ICodeEditorService, disposables.add(new CodeEditorService(editorService, themeService, configService)));
    instantiationService.stub(IPaneCompositePartService, disposables.add(new TestPaneCompositeService()));
    instantiationService.stub(IListService, new TestListService());
    instantiationService.stub(IContextViewService, disposables.add(instantiationService.createInstance(ContextViewService)));
    instantiationService.stub(IContextMenuService, disposables.add(instantiationService.createInstance(ContextMenuService)));
    instantiationService.stub(IQuickInputService, disposables.add(new QuickInputService(configService, instantiationService, keybindingService, contextKeyService, themeService, layoutService)));
    instantiationService.stub(IWorkspacesService, new TestWorkspacesService());
    instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
    instantiationService.stub(IWorkspaceTrustRequestService, disposables.add(new TestWorkspaceTrustRequestService(false)));
    instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
    instantiationService.stub(ITerminalEditorService, new TestTerminalEditorService());
    instantiationService.stub(ITerminalGroupService, new TestTerminalGroupService());
    instantiationService.stub(ITerminalProfileService, new TestTerminalProfileService());
    instantiationService.stub(ITerminalProfileResolverService, new TestTerminalProfileResolverService());
    instantiationService.stub(ITerminalConfigurationService, disposables.add(instantiationService.createInstance(TestTerminalConfigurationService)));
    instantiationService.stub(ITerminalLogService, disposables.add(instantiationService.createInstance(TerminalLogService)));
    instantiationService.stub(IEnvironmentVariableService, disposables.add(instantiationService.createInstance(EnvironmentVariableService)));
    instantiationService.stub(IElevatedFileService, new BrowserElevatedFileService());
    instantiationService.stub(IRemoteSocketFactoryService, new RemoteSocketFactoryService());
    instantiationService.stub(ICustomEditorLabelService, disposables.add(new CustomEditorLabelService(configService, workspaceContextService)));
    instantiationService.stub(IHoverService, NullHoverService);
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, textEditorService, workingCopyFileService, filesConfigurationService, contextService, modelService, fileService, fileDialogService, dialogService, workingCopyService, editorService, editorPaneService, environmentService, pathService, editorGroupService, editorResolverService, languageService, textModelResolverService, untitledTextEditorService, testConfigurationService, workingCopyBackupService, hostService, quickInputService, labelService, logService, uriIdentityService, instantitionService, notificationService, workingCopyEditorService, instantiationService, elevatedFileService, workspaceTrustRequestService, decorationsService, progressService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.textEditorService = textEditorService;
        this.workingCopyFileService = workingCopyFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
        this.editorPaneService = editorPaneService;
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.editorGroupService = editorGroupService;
        this.editorResolverService = editorResolverService;
        this.languageService = languageService;
        this.textModelResolverService = textModelResolverService;
        this.untitledTextEditorService = untitledTextEditorService;
        this.testConfigurationService = testConfigurationService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.hostService = hostService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.instantitionService = instantitionService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.instantiationService = instantiationService;
        this.elevatedFileService = elevatedFileService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.decorationsService = decorationsService;
        this.progressService = progressService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, ITextEditorService),
    __param(3, IWorkingCopyFileService),
    __param(4, IFilesConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IModelService),
    __param(7, IFileService),
    __param(8, IFileDialogService),
    __param(9, IDialogService),
    __param(10, IWorkingCopyService),
    __param(11, IEditorService),
    __param(12, IEditorPaneService),
    __param(13, IWorkbenchEnvironmentService),
    __param(14, IPathService),
    __param(15, IEditorGroupsService),
    __param(16, IEditorResolverService),
    __param(17, ILanguageService),
    __param(18, ITextModelService),
    __param(19, IUntitledTextEditorService),
    __param(20, IConfigurationService),
    __param(21, IWorkingCopyBackupService),
    __param(22, IHostService),
    __param(23, IQuickInputService),
    __param(24, ILabelService),
    __param(25, ILogService),
    __param(26, IUriIdentityService),
    __param(27, IInstantiationService),
    __param(28, INotificationService),
    __param(29, IWorkingCopyEditorService),
    __param(30, IInstantiationService),
    __param(31, IElevatedFileService),
    __param(32, IWorkspaceTrustRequestService),
    __param(33, IDecorationsService),
    __param(34, IProgressService)
], TestServiceAccessor);
export { TestServiceAccessor };
let TestTextFileService = class TestTextFileService extends BrowserTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService);
        this.readStreamError = undefined;
        this.writeError = undefined;
    }
    setReadStreamErrorOnce(error) {
        this.readStreamError = error;
    }
    async readStream(resource, options) {
        if (this.readStreamError) {
            const error = this.readStreamError;
            this.readStreamError = undefined;
            throw error;
        }
        const content = await this.fileService.readFileStream(resource, options);
        return {
            resource: content.resource,
            name: content.name,
            mtime: content.mtime,
            ctime: content.ctime,
            etag: content.etag,
            encoding: 'utf8',
            value: await createTextBufferFactoryFromStream(content.value),
            size: 10,
            readonly: false,
            locked: false,
        };
    }
    setWriteErrorOnce(error) {
        this.writeError = error;
    }
    async write(resource, value, options) {
        if (this.writeError) {
            const error = this.writeError;
            this.writeError = undefined;
            throw error;
        }
        return super.write(resource, value, options);
    }
};
TestTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, ILogService),
    __param(16, IElevatedFileService),
    __param(17, IDecorationsService)
], TestTextFileService);
export { TestTextFileService };
export class TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestEncodingOracle extends EncodingOracle {
    get encodingOverrides() {
        return [
            { extension: 'utf16le', encoding: UTF16le },
            { extension: 'utf16be', encoding: UTF16be },
            { extension: 'utf8bom', encoding: UTF8_with_bom },
        ];
    }
    set encodingOverrides(overrides) { }
}
class TestEnvironmentServiceWithArgs extends BrowserWorkbenchEnvironmentService {
    constructor() {
        super(...arguments);
        this.args = [];
    }
}
export const TestEnvironmentService = new TestEnvironmentServiceWithArgs('', URI.file('tests').with({ scheme: 'vscode-tests' }), Object.create(null), TestProductService);
export class TestProgressService {
    withProgress(options, task, onDidCancel) {
        return task(Progress.None);
    }
}
export class TestDecorationsService {
    constructor() {
        this.onDidChangeDecorations = Event.None;
    }
    registerDecorationsProvider(_provider) {
        return Disposable.None;
    }
    getDecoration(_uri, _includeChildren, _overwrite) {
        return undefined;
    }
}
export class TestMenuService {
    createMenu(_id, _scopedKeybindingService) {
        return {
            onDidChange: Event.None,
            dispose: () => undefined,
            getActions: () => [],
        };
    }
    getMenuActions(id, contextKeyService, options) {
        throw new Error('Method not implemented.');
    }
    getMenuContexts(id) {
        throw new Error('Method not implemented.');
    }
    resetHiddenStates() {
        // nothing
    }
}
let TestFileDialogService = class TestFileDialogService {
    constructor(pathService) {
        this.pathService = pathService;
    }
    async defaultFilePath(_schemeFilter) {
        return this.pathService.userHome();
    }
    async defaultFolderPath(_schemeFilter) {
        return this.pathService.userHome();
    }
    async defaultWorkspacePath(_schemeFilter) {
        return this.pathService.userHome();
    }
    async preferredHome(_schemeFilter) {
        return this.pathService.userHome();
    }
    pickFileFolderAndOpen(_options) {
        return Promise.resolve(0);
    }
    pickFileAndOpen(_options) {
        return Promise.resolve(0);
    }
    pickFolderAndOpen(_options) {
        return Promise.resolve(0);
    }
    pickWorkspaceAndOpen(_options) {
        return Promise.resolve(0);
    }
    setPickFileToSave(path) {
        this.fileToSave = path;
    }
    pickFileToSave(defaultUri, availableFileSystems) {
        return Promise.resolve(this.fileToSave);
    }
    showSaveDialog(_options) {
        return Promise.resolve(undefined);
    }
    showOpenDialog(_options) {
        return Promise.resolve(undefined);
    }
    setConfirmResult(result) {
        this.confirmResult = result;
    }
    showSaveConfirm(fileNamesOrResources) {
        return Promise.resolve(this.confirmResult);
    }
};
TestFileDialogService = __decorate([
    __param(0, IPathService)
], TestFileDialogService);
export { TestFileDialogService };
export class TestLayoutService {
    constructor() {
        this.openedDefaultEditors = false;
        this.mainContainerDimension = { width: 800, height: 600 };
        this.activeContainerDimension = { width: 800, height: 600 };
        this.mainContainerOffset = { top: 0, quickPickTop: 0 };
        this.activeContainerOffset = { top: 0, quickPickTop: 0 };
        this.mainContainer = mainWindow.document.body;
        this.containers = [mainWindow.document.body];
        this.activeContainer = mainWindow.document.body;
        this.onDidChangeZenMode = Event.None;
        this.onDidChangeMainEditorCenteredLayout = Event.None;
        this.onDidChangeWindowMaximized = Event.None;
        this.onDidChangePanelPosition = Event.None;
        this.onDidChangePanelAlignment = Event.None;
        this.onDidChangePartVisibility = Event.None;
        this.onDidLayoutMainContainer = Event.None;
        this.onDidLayoutActiveContainer = Event.None;
        this.onDidLayoutContainer = Event.None;
        this.onDidChangeNotificationsVisibility = Event.None;
        this.onDidAddContainer = Event.None;
        this.onDidChangeActiveContainer = Event.None;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
    }
    layout() { }
    isRestored() {
        return true;
    }
    hasFocus(_part) {
        return false;
    }
    focusPart(_part) { }
    hasMainWindowBorder() {
        return false;
    }
    getMainWindowBorderRadius() {
        return undefined;
    }
    isVisible(_part) {
        return true;
    }
    getContainer() {
        return mainWindow.document.body;
    }
    whenContainerStylesLoaded() {
        return undefined;
    }
    isTitleBarHidden() {
        return false;
    }
    isStatusBarHidden() {
        return false;
    }
    isActivityBarHidden() {
        return false;
    }
    setActivityBarHidden(_hidden) { }
    setBannerHidden(_hidden) { }
    isSideBarHidden() {
        return false;
    }
    async setEditorHidden(_hidden) { }
    async setSideBarHidden(_hidden) { }
    async setAuxiliaryBarHidden(_hidden) { }
    async setPartHidden(_hidden, part) { }
    isPanelHidden() {
        return false;
    }
    async setPanelHidden(_hidden) { }
    toggleMaximizedPanel() { }
    isPanelMaximized() {
        return false;
    }
    getMenubarVisibility() {
        throw new Error('not implemented');
    }
    toggleMenuBar() { }
    getSideBarPosition() {
        return 0;
    }
    getPanelPosition() {
        return 0;
    }
    getPanelAlignment() {
        return 'center';
    }
    async setPanelPosition(_position) { }
    async setPanelAlignment(_alignment) { }
    addClass(_clazz) { }
    removeClass(_clazz) { }
    getMaximumEditorDimensions() {
        throw new Error('not implemented');
    }
    toggleZenMode() { }
    isMainEditorLayoutCentered() {
        return false;
    }
    centerMainEditorLayout(_active) { }
    resizePart(_part, _sizeChangeWidth, _sizeChangeHeight) { }
    getSize(part) {
        throw new Error('Method not implemented.');
    }
    setSize(part, size) {
        throw new Error('Method not implemented.');
    }
    registerPart(part) {
        return Disposable.None;
    }
    isWindowMaximized(targetWindow) {
        return false;
    }
    updateWindowMaximizedState(targetWindow, maximized) { }
    getVisibleNeighborPart(part, direction) {
        return undefined;
    }
    focus() { }
}
const activeViewlet = {};
export class TestPaneCompositeService extends Disposable {
    constructor() {
        super();
        this.parts = new Map();
        this.parts.set(1 /* ViewContainerLocation.Panel */, new TestPanelPart());
        this.parts.set(0 /* ViewContainerLocation.Sidebar */, new TestSideBarPart());
        this.onDidPaneCompositeOpen = Event.any(...[1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map((loc) => Event.map(this.parts.get(loc).onDidPaneCompositeOpen, (composite) => {
            return { composite, viewContainerLocation: loc };
        })));
        this.onDidPaneCompositeClose = Event.any(...[1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map((loc) => Event.map(this.parts.get(loc).onDidPaneCompositeClose, (composite) => {
            return { composite, viewContainerLocation: loc };
        })));
    }
    openPaneComposite(id, viewContainerLocation, focus) {
        return this.getPartByLocation(viewContainerLocation).openPaneComposite(id, focus);
    }
    getActivePaneComposite(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getActivePaneComposite();
    }
    getPaneComposite(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposite(id);
    }
    getPaneComposites(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposites();
    }
    getProgressIndicator(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getProgressIndicator(id);
    }
    hideActivePaneComposite(viewContainerLocation) {
        this.getPartByLocation(viewContainerLocation).hideActivePaneComposite();
    }
    getLastActivePaneCompositeId(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getLastActivePaneCompositeId();
    }
    getPinnedPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getVisiblePaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPartByLocation(viewContainerLocation) {
        return assertIsDefined(this.parts.get(viewContainerLocation));
    }
}
export class TestSideBarPart {
    constructor() {
        this.onDidViewletRegisterEmitter = new Emitter();
        this.onDidViewletDeregisterEmitter = new Emitter();
        this.onDidViewletOpenEmitter = new Emitter();
        this.onDidViewletCloseEmitter = new Emitter();
        this.partId = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = this.onDidViewletOpenEmitter.event;
        this.onDidPaneCompositeClose = this.onDidViewletCloseEmitter.event;
    }
    openPaneComposite(id, focus) {
        return Promise.resolve(undefined);
    }
    getPaneComposites() {
        return [];
    }
    getAllViewlets() {
        return [];
    }
    getActivePaneComposite() {
        return activeViewlet;
    }
    getDefaultViewletId() {
        return 'workbench.view.explorer';
    }
    getPaneComposite(id) {
        return undefined;
    }
    getProgressIndicator(id) {
        return undefined;
    }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() {
        return undefined;
    }
    dispose() { }
    getPinnedPaneCompositeIds() {
        return [];
    }
    getVisiblePaneCompositeIds() {
        return [];
    }
    getPaneCompositeIds() {
        return [];
    }
    layout(width, height, top, left) { }
}
export class TestPanelPart {
    constructor() {
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = new Emitter().event;
        this.onDidPaneCompositeClose = new Emitter().event;
        this.partId = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
    }
    async openPaneComposite(id, focus) {
        return undefined;
    }
    getPaneComposite(id) {
        return activeViewlet;
    }
    getPaneComposites() {
        return [];
    }
    getPinnedPaneCompositeIds() {
        return [];
    }
    getVisiblePaneCompositeIds() {
        return [];
    }
    getPaneCompositeIds() {
        return [];
    }
    getActivePaneComposite() {
        return activeViewlet;
    }
    setPanelEnablement(id, enabled) { }
    dispose() { }
    getProgressIndicator(id) {
        return null;
    }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() {
        return undefined;
    }
    layout(width, height, top, left) { }
}
export class TestViewsService {
    constructor() {
        this.onDidChangeViewContainerVisibility = new Emitter().event;
        this.onDidChangeViewVisibilityEmitter = new Emitter();
        this.onDidChangeViewVisibility = this.onDidChangeViewVisibilityEmitter.event;
        this.onDidChangeFocusedViewEmitter = new Emitter();
        this.onDidChangeFocusedView = this.onDidChangeFocusedViewEmitter.event;
    }
    isViewContainerVisible(id) {
        return true;
    }
    isViewContainerActive(id) {
        return true;
    }
    getVisibleViewContainer() {
        return null;
    }
    openViewContainer(id, focus) {
        return Promise.resolve(null);
    }
    closeViewContainer(id) { }
    isViewVisible(id) {
        return true;
    }
    getActiveViewWithId(id) {
        return null;
    }
    getViewWithId(id) {
        return null;
    }
    openView(id, focus) {
        return Promise.resolve(null);
    }
    closeView(id) { }
    getViewProgressIndicator(id) {
        return null;
    }
    getActiveViewPaneContainerWithId(id) {
        return null;
    }
    getFocusedViewName() {
        return '';
    }
    getFocusedView() {
        return null;
    }
}
export class TestEditorGroupsService {
    constructor(groups = []) {
        this.groups = groups;
        this.parts = [this];
        this.windowId = mainWindow.vscodeWindowId;
        this.onDidCreateAuxiliaryEditorPart = Event.None;
        this.onDidChangeActiveGroup = Event.None;
        this.onDidActivateGroup = Event.None;
        this.onDidAddGroup = Event.None;
        this.onDidRemoveGroup = Event.None;
        this.onDidMoveGroup = Event.None;
        this.onDidChangeGroupIndex = Event.None;
        this.onDidChangeGroupLabel = Event.None;
        this.onDidChangeGroupLocked = Event.None;
        this.onDidChangeGroupMaximized = Event.None;
        this.onDidLayout = Event.None;
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidScroll = Event.None;
        this.onWillDispose = Event.None;
        this.orientation = 0 /* GroupOrientation.HORIZONTAL */;
        this.isReady = true;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
        this.hasRestorableState = false;
        this.contentDimension = { width: 800, height: 600 };
        this.mainPart = this;
    }
    get activeGroup() {
        return this.groups[0];
    }
    get sideGroup() {
        return this.groups[0];
    }
    get count() {
        return this.groups.length;
    }
    getPart(group) {
        return this;
    }
    saveWorkingSet(name) {
        throw new Error('Method not implemented.');
    }
    getWorkingSets() {
        throw new Error('Method not implemented.');
    }
    applyWorkingSet(workingSet, options) {
        throw new Error('Method not implemented.');
    }
    deleteWorkingSet(workingSet) {
        throw new Error('Method not implemented.');
    }
    getGroups(_order) {
        return this.groups;
    }
    getGroup(identifier) {
        return this.groups.find((group) => group.id === identifier);
    }
    getLabel(_identifier) {
        return 'Group 1';
    }
    findGroup(_scope, _source, _wrap) {
        throw new Error('not implemented');
    }
    activateGroup(_group) {
        throw new Error('not implemented');
    }
    restoreGroup(_group) {
        throw new Error('not implemented');
    }
    getSize(_group) {
        return { width: 100, height: 100 };
    }
    setSize(_group, _size) { }
    arrangeGroups(_arrangement) { }
    toggleMaximizeGroup() { }
    hasMaximizedGroup() {
        throw new Error('not implemented');
    }
    toggleExpandGroup() { }
    applyLayout(_layout) { }
    getLayout() {
        throw new Error('not implemented');
    }
    setGroupOrientation(_orientation) { }
    addGroup(_location, _direction) {
        throw new Error('not implemented');
    }
    removeGroup(_group) { }
    moveGroup(_group, _location, _direction) {
        throw new Error('not implemented');
    }
    mergeGroup(_group, _target, _options) {
        throw new Error('not implemented');
    }
    mergeAllGroups(_group, _options) {
        throw new Error('not implemented');
    }
    copyGroup(_group, _location, _direction) {
        throw new Error('not implemented');
    }
    centerLayout(active) { }
    isLayoutCentered() {
        return false;
    }
    createEditorDropTarget(container, delegate) {
        return Disposable.None;
    }
    registerContextKeyProvider(_provider) {
        throw new Error('not implemented');
    }
    getScopedInstantiationService(part) {
        throw new Error('Method not implemented.');
    }
    enforcePartOptions(options) {
        return Disposable.None;
    }
    registerEditorPart(part) {
        return Disposable.None;
    }
    createAuxiliaryEditorPart() {
        throw new Error('Method not implemented.');
    }
}
export class TestEditorGroupView {
    constructor(id) {
        this.id = id;
        this.windowId = mainWindow.vscodeWindowId;
        this.groupsView = undefined;
        this.selectedEditors = [];
        this.editors = [];
        this.whenRestored = Promise.resolve(undefined);
        this.isEmpty = true;
        this.onWillDispose = Event.None;
        this.onDidModelChange = Event.None;
        this.onWillCloseEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidFocus = Event.None;
        this.onDidChange = Event.None;
        this.onWillMoveEditor = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidActiveEditorChange = Event.None;
    }
    getEditors(_order) {
        return [];
    }
    findEditors(_resource) {
        return [];
    }
    getEditorByIndex(_index) {
        throw new Error('not implemented');
    }
    getIndexOfEditor(_editor) {
        return -1;
    }
    isFirst(editor) {
        return false;
    }
    isLast(editor) {
        return false;
    }
    openEditor(_editor, _options) {
        throw new Error('not implemented');
    }
    openEditors(_editors) {
        throw new Error('not implemented');
    }
    isPinned(_editor) {
        return false;
    }
    isSticky(_editor) {
        return false;
    }
    isTransient(_editor) {
        return false;
    }
    isActive(_editor) {
        return false;
    }
    setSelection(_activeSelectedEditor, _inactiveSelectedEditors) {
        throw new Error('not implemented');
    }
    isSelected(_editor) {
        return false;
    }
    contains(candidate) {
        return false;
    }
    moveEditor(_editor, _target, _options) {
        return true;
    }
    moveEditors(_editors, _target) {
        return true;
    }
    copyEditor(_editor, _target, _options) { }
    copyEditors(_editors, _target) { }
    async closeEditor(_editor, options) {
        return true;
    }
    async closeEditors(_editors, options) {
        return true;
    }
    async closeAllEditors(options) {
        return true;
    }
    async replaceEditors(_editors) { }
    pinEditor(_editor) { }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    lock(locked) { }
    focus() { }
    get scopedContextKeyService() {
        throw new Error('not implemented');
    }
    setActive(_isActive) { }
    notifyIndexChanged(_index) { }
    notifyLabelChanged(_label) { }
    dispose() { }
    toJSON() {
        return Object.create(null);
    }
    layout(_width, _height) { }
    relayout() { }
    createEditorActions(_menuDisposable) {
        throw new Error('not implemented');
    }
}
export class TestEditorGroupAccessor {
    constructor() {
        this.label = '';
        this.windowId = mainWindow.vscodeWindowId;
        this.groups = [];
        this.partOptions = { ...DEFAULT_EDITOR_PART_OPTIONS };
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidVisibilityChange = Event.None;
    }
    getGroup(identifier) {
        throw new Error('Method not implemented.');
    }
    getGroups(order) {
        throw new Error('Method not implemented.');
    }
    activateGroup(identifier) {
        throw new Error('Method not implemented.');
    }
    restoreGroup(identifier) {
        throw new Error('Method not implemented.');
    }
    addGroup(location, direction) {
        throw new Error('Method not implemented.');
    }
    mergeGroup(group, target, options) {
        throw new Error('Method not implemented.');
    }
    moveGroup(group, location, direction) {
        throw new Error('Method not implemented.');
    }
    copyGroup(group, location, direction) {
        throw new Error('Method not implemented.');
    }
    removeGroup(group) {
        throw new Error('Method not implemented.');
    }
    arrangeGroups(arrangement, target) {
        throw new Error('Method not implemented.');
    }
    toggleMaximizeGroup(group) {
        throw new Error('Method not implemented.');
    }
    toggleExpandGroup(group) {
        throw new Error('Method not implemented.');
    }
}
export class TestEditorService extends Disposable {
    get activeTextEditorControl() {
        return this._activeTextEditorControl;
    }
    set activeTextEditorControl(value) {
        this._activeTextEditorControl = value;
    }
    get activeEditor() {
        return this._activeEditor;
    }
    set activeEditor(value) {
        this._activeEditor = value;
    }
    getVisibleTextEditorControls(order) {
        return this.visibleTextEditorControls;
    }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        this.onDidActiveEditorChange = Event.None;
        this.onDidVisibleEditorsChange = Event.None;
        this.onDidEditorsChange = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidMostRecentlyActiveEditorsChange = Event.None;
        this.editors = [];
        this.mostRecentlyActiveEditors = [];
        this.visibleEditorPanes = [];
        this.visibleTextEditorControls = [];
        this.visibleEditors = [];
        this.count = this.editors.length;
    }
    createScoped(editorGroupsContainer) {
        return this;
    }
    getEditors() {
        return [];
    }
    findEditors() {
        return [];
    }
    async openEditor(editor, optionsOrGroup, group) {
        // openEditor takes ownership of the input, register it to the TestEditorService
        // so it's not marked as leaked during tests.
        if ('dispose' in editor) {
            this._register(editor);
        }
        return undefined;
    }
    async closeEditor(editor, options) { }
    async closeEditors(editors, options) { }
    doResolveEditorOpenRequest(editor) {
        if (!this.editorGroupService) {
            return undefined;
        }
        return [this.editorGroupService.activeGroup, editor, undefined];
    }
    openEditors(_editors, _group) {
        throw new Error('not implemented');
    }
    isOpened(_editor) {
        return false;
    }
    isVisible(_editor) {
        return false;
    }
    replaceEditors(_editors, _group) {
        return Promise.resolve(undefined);
    }
    save(editors, options) {
        throw new Error('Method not implemented.');
    }
    saveAll(options) {
        throw new Error('Method not implemented.');
    }
    revert(editors, options) {
        throw new Error('Method not implemented.');
    }
    revertAll(options) {
        throw new Error('Method not implemented.');
    }
}
export class TestFileService {
    constructor() {
        this._onDidFilesChange = new Emitter();
        this._onDidRunOperation = new Emitter();
        this._onDidChangeFileSystemProviderCapabilities = new Emitter();
        this._onWillActivateFileSystemProvider = new Emitter();
        this.onWillActivateFileSystemProvider = this._onWillActivateFileSystemProvider.event;
        this.onDidWatchError = Event.None;
        this.content = 'Hello Html';
        this.readonly = false;
        this.notExistsSet = new ResourceMap();
        this.readShouldThrowError = undefined;
        this.writeShouldThrowError = undefined;
        this.onDidChangeFileSystemProviderRegistrations = Event.None;
        this.providers = new Map();
        this.watches = [];
    }
    get onDidFilesChange() {
        return this._onDidFilesChange.event;
    }
    fireFileChanges(event) {
        this._onDidFilesChange.fire(event);
    }
    get onDidRunOperation() {
        return this._onDidRunOperation.event;
    }
    fireAfterOperation(event) {
        this._onDidRunOperation.fire(event);
    }
    get onDidChangeFileSystemProviderCapabilities() {
        return this._onDidChangeFileSystemProviderCapabilities.event;
    }
    fireFileSystemProviderCapabilitiesChangeEvent(event) {
        this._onDidChangeFileSystemProviderCapabilities.fire(event);
    }
    setContent(content) {
        this.content = content;
    }
    getContent() {
        return this.content;
    }
    getLastReadFileUri() {
        return this.lastReadFileUri;
    }
    async resolve(resource, _options) {
        return createFileStat(resource, this.readonly);
    }
    stat(resource) {
        return this.resolve(resource, { resolveMetadata: true });
    }
    async resolveAll(toResolve) {
        const stats = await Promise.all(toResolve.map((resourceAndOption) => this.resolve(resourceAndOption.resource, resourceAndOption.options)));
        return stats.map((stat) => ({ stat, success: true }));
    }
    async exists(_resource) {
        return !this.notExistsSet.has(_resource);
    }
    async readFile(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: VSBuffer.fromString(this.content),
        };
    }
    async readFileStream(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: bufferToStream(VSBuffer.fromString(this.content)),
        };
    }
    async writeFile(resource, bufferOrReadable, options) {
        await timeout(0);
        if (this.writeShouldThrowError) {
            throw this.writeShouldThrowError;
        }
        return createFileStat(resource, this.readonly);
    }
    move(_source, _target, _overwrite) {
        return Promise.resolve(null);
    }
    copy(_source, _target, _overwrite) {
        return Promise.resolve(null);
    }
    async cloneFile(_source, _target) { }
    createFile(_resource, _content, _options) {
        return Promise.resolve(null);
    }
    createFolder(_resource) {
        return Promise.resolve(null);
    }
    registerProvider(scheme, provider) {
        this.providers.set(scheme, provider);
        return toDisposable(() => this.providers.delete(scheme));
    }
    getProvider(scheme) {
        return this.providers.get(scheme);
    }
    async activateProvider(_scheme) {
        this._onWillActivateFileSystemProvider.fire({ scheme: _scheme, join: () => { } });
    }
    async canHandleResource(resource) {
        return this.hasProvider(resource);
    }
    hasProvider(resource) {
        return resource.scheme === Schemas.file || this.providers.has(resource.scheme);
    }
    listCapabilities() {
        return [
            { scheme: Schemas.file, capabilities: 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ },
            ...Iterable.map(this.providers, ([scheme, p]) => {
                return { scheme, capabilities: p.capabilities };
            }),
        ];
    }
    hasCapability(resource, capability) {
        if (capability === 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ && isLinux) {
            return true;
        }
        const provider = this.getProvider(resource.scheme);
        return !!(provider && provider.capabilities & capability);
    }
    async del(_resource, _options) { }
    createWatcher(resource, options) {
        return {
            onDidChange: Event.None,
            dispose: () => { },
        };
    }
    watch(_resource) {
        this.watches.push(_resource);
        return toDisposable(() => this.watches.splice(this.watches.indexOf(_resource), 1));
    }
    getWriteEncoding(_resource) {
        return { encoding: 'utf8', hasBOM: false };
    }
    dispose() { }
    async canCreateFile(source, options) {
        return true;
    }
    async canMove(source, target, overwrite) {
        return true;
    }
    async canCopy(source, target, overwrite) {
        return true;
    }
    async canDelete(resource, options) {
        return true;
    }
}
export class TestWorkingCopyBackupService extends InMemoryWorkingCopyBackupService {
    constructor() {
        super();
        this.resolved = new Set();
    }
    parseBackupContent(textBufferFactory) {
        const textBuffer = textBufferFactory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
        const lineCount = textBuffer.getLineCount();
        const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
        return textBuffer.getValueInRange(range, 0 /* EndOfLinePreference.TextDefined */);
    }
    async resolve(identifier) {
        this.resolved.add(identifier);
        return super.resolve(identifier);
    }
}
export function toUntypedWorkingCopyId(resource) {
    return toTypedWorkingCopyId(resource, '');
}
export function toTypedWorkingCopyId(resource, typeId = 'testBackupTypeId') {
    return { typeId, resource };
}
export class InMemoryTestWorkingCopyBackupService extends BrowserWorkingCopyBackupService {
    constructor() {
        const disposables = new DisposableStore();
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        disposables.add(fileService.registerProvider(Schemas.file, disposables.add(new InMemoryFileSystemProvider())));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new InMemoryFileSystemProvider())));
        super(new TestContextService(TestWorkspace), environmentService, fileService, logService);
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this._register(disposables);
    }
    testGetFileService() {
        return this.fileService;
    }
    joinBackupResource() {
        return new Promise((resolve) => this.backupResourceJoiners.push(resolve));
    }
    joinDiscardBackup() {
        return new Promise((resolve) => this.discardBackupJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        await super.backup(identifier, content, versionId, meta, token);
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
export class TestLifecycleService extends Disposable {
    constructor() {
        super(...arguments);
        this.usePhases = false;
        this.whenStarted = new DeferredPromise();
        this.whenReady = new DeferredPromise();
        this.whenRestored = new DeferredPromise();
        this.whenEventually = new DeferredPromise();
        this.willShutdown = false;
        this._onBeforeShutdown = this._register(new Emitter());
        this._onBeforeShutdownError = this._register(new Emitter());
        this._onShutdownVeto = this._register(new Emitter());
        this._onWillShutdown = this._register(new Emitter());
        this._onDidShutdown = this._register(new Emitter());
        this.shutdownJoiners = [];
    }
    get phase() {
        return this._phase;
    }
    set phase(value) {
        this._phase = value;
        if (value === 1 /* LifecyclePhase.Starting */) {
            this.whenStarted.complete();
        }
        else if (value === 2 /* LifecyclePhase.Ready */) {
            this.whenReady.complete();
        }
        else if (value === 3 /* LifecyclePhase.Restored */) {
            this.whenRestored.complete();
        }
        else if (value === 4 /* LifecyclePhase.Eventually */) {
            this.whenEventually.complete();
        }
    }
    async when(phase) {
        if (!this.usePhases) {
            return;
        }
        if (phase === 1 /* LifecyclePhase.Starting */) {
            await this.whenStarted.p;
        }
        else if (phase === 2 /* LifecyclePhase.Ready */) {
            await this.whenReady.p;
        }
        else if (phase === 3 /* LifecyclePhase.Restored */) {
            await this.whenRestored.p;
        }
        else if (phase === 4 /* LifecyclePhase.Eventually */) {
            await this.whenEventually.p;
        }
    }
    get onBeforeShutdown() {
        return this._onBeforeShutdown.event;
    }
    get onBeforeShutdownError() {
        return this._onBeforeShutdownError.event;
    }
    get onShutdownVeto() {
        return this._onShutdownVeto.event;
    }
    get onWillShutdown() {
        return this._onWillShutdown.event;
    }
    get onDidShutdown() {
        return this._onDidShutdown.event;
    }
    fireShutdown(reason = 2 /* ShutdownReason.QUIT */) {
        this.shutdownJoiners = [];
        this._onWillShutdown.fire({
            join: (p) => {
                this.shutdownJoiners.push(typeof p === 'function' ? p() : p);
            },
            joiners: () => [],
            force: () => {
                /* No-Op in tests */
            },
            token: CancellationToken.None,
            reason,
        });
    }
    fireBeforeShutdown(event) {
        this._onBeforeShutdown.fire(event);
    }
    fireWillShutdown(event) {
        this._onWillShutdown.fire(event);
    }
    async shutdown() {
        this.fireShutdown();
    }
}
export class TestBeforeShutdownEvent {
    constructor() {
        this.reason = 1 /* ShutdownReason.CLOSE */;
    }
    veto(value) {
        this.value = value;
    }
    finalVeto(vetoFn) {
        this.value = vetoFn();
        this.finalValue = vetoFn;
    }
}
export class TestWillShutdownEvent {
    constructor() {
        this.value = [];
        this.joiners = () => [];
        this.reason = 1 /* ShutdownReason.CLOSE */;
        this.token = CancellationToken.None;
    }
    join(promise, joiner) {
        this.value.push(typeof promise === 'function' ? promise() : promise);
    }
    force() {
        /* No-Op in tests */
    }
}
export class TestTextResourceConfigurationService {
    constructor(configurationService = new TestConfigurationService()) {
        this.configurationService = configurationService;
    }
    onDidChangeConfiguration() {
        return { dispose() { } };
    }
    getValue(resource, arg2, arg3) {
        const position = EditorPosition.isIPosition(arg2) ? arg2 : null;
        const section = position
            ? typeof arg3 === 'string'
                ? arg3
                : undefined
            : typeof arg2 === 'string'
                ? arg2
                : undefined;
        return this.configurationService.getValue(section, { resource });
    }
    inspect(resource, position, section) {
        return this.configurationService.inspect(section, { resource });
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value);
    }
}
export class RemoteFileSystemProvider {
    constructor(wrappedFsp, remoteAuthority) {
        this.wrappedFsp = wrappedFsp;
        this.remoteAuthority = remoteAuthority;
        this.capabilities = this.wrappedFsp.capabilities;
        this.onDidChangeCapabilities = this.wrappedFsp.onDidChangeCapabilities;
        this.onDidChangeFile = Event.map(this.wrappedFsp.onDidChangeFile, (changes) => changes.map((c) => {
            return {
                type: c.type,
                resource: c.resource.with({
                    scheme: Schemas.vscodeRemote,
                    authority: this.remoteAuthority,
                }),
            };
        }));
    }
    watch(resource, opts) {
        return this.wrappedFsp.watch(this.toFileResource(resource), opts);
    }
    stat(resource) {
        return this.wrappedFsp.stat(this.toFileResource(resource));
    }
    mkdir(resource) {
        return this.wrappedFsp.mkdir(this.toFileResource(resource));
    }
    readdir(resource) {
        return this.wrappedFsp.readdir(this.toFileResource(resource));
    }
    delete(resource, opts) {
        return this.wrappedFsp.delete(this.toFileResource(resource), opts);
    }
    rename(from, to, opts) {
        return this.wrappedFsp.rename(this.toFileResource(from), this.toFileResource(to), opts);
    }
    copy(from, to, opts) {
        return this.wrappedFsp.copy(this.toFileResource(from), this.toFileResource(to), opts);
    }
    readFile(resource) {
        return this.wrappedFsp.readFile(this.toFileResource(resource));
    }
    writeFile(resource, content, opts) {
        return this.wrappedFsp.writeFile(this.toFileResource(resource), content, opts);
    }
    open(resource, opts) {
        return this.wrappedFsp.open(this.toFileResource(resource), opts);
    }
    close(fd) {
        return this.wrappedFsp.close(fd);
    }
    read(fd, pos, data, offset, length) {
        return this.wrappedFsp.read(fd, pos, data, offset, length);
    }
    write(fd, pos, data, offset, length) {
        return this.wrappedFsp.write(fd, pos, data, offset, length);
    }
    readFileStream(resource, opts, token) {
        return this.wrappedFsp.readFileStream(this.toFileResource(resource), opts, token);
    }
    toFileResource(resource) {
        return resource.with({ scheme: Schemas.file, authority: '' });
    }
}
export class TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider {
    get capabilities() {
        return (2 /* FileSystemProviderCapabilities.FileReadWrite */ |
            1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ |
            16 /* FileSystemProviderCapabilities.FileReadStream */);
    }
    readFileStream(resource) {
        const BUFFER_SIZE = 64 * 1024;
        const stream = newWriteableStream((data) => VSBuffer.concat(data.map((data) => VSBuffer.wrap(data))).buffer);
        (async () => {
            try {
                const data = await this.readFile(resource);
                let offset = 0;
                while (offset < data.length) {
                    await timeout(0);
                    await stream.write(data.subarray(offset, offset + BUFFER_SIZE));
                    offset += BUFFER_SIZE;
                }
                await timeout(0);
                stream.end();
            }
            catch (error) {
                stream.end(error);
            }
        })();
        return stream;
    }
}
export const productService = { _serviceBrand: undefined, ...product };
export class TestHostService {
    constructor() {
        this._hasFocus = true;
        this._onDidChangeFocus = new Emitter();
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeWindow = new Emitter();
        this.onDidChangeActiveWindow = this._onDidChangeWindow.event;
        this.onDidChangeFullScreen = Event.None;
        this.colorScheme = ColorScheme.DARK;
        this.onDidChangeColorScheme = Event.None;
    }
    get hasFocus() {
        return this._hasFocus;
    }
    async hadLastFocus() {
        return this._hasFocus;
    }
    setFocus(focus) {
        this._hasFocus = focus;
        this._onDidChangeFocus.fire(this._hasFocus);
    }
    async restart() { }
    async reload() { }
    async close() { }
    async withExpectedShutdown(expectedShutdownTask) {
        return await expectedShutdownTask();
    }
    async focus() { }
    async moveTop() { }
    async getCursorScreenPoint() {
        return undefined;
    }
    async openWindow(arg1, arg2) { }
    async toggleFullScreen() { }
    async getScreenshot() {
        return undefined;
    }
    async getNativeWindowHandle(_windowId) {
        return undefined;
    }
}
export class TestFilesConfigurationService extends FilesConfigurationService {
    testOnFilesConfigurationChange(configuration) {
        super.onFilesConfigurationChange(configuration, true);
    }
}
export class TestReadonlyTextFileEditorModel extends TextFileEditorModel {
    isReadonly() {
        return true;
    }
}
export class TestEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
    }
    get typeId() {
        return this._typeId;
    }
    get editorId() {
        return this._typeId;
    }
    resolve() {
        return Promise.resolve(null);
    }
}
export function registerTestEditor(id, inputs, serializerInputId) {
    const disposables = new DisposableStore();
    class TestEditor extends EditorPane {
        constructor(group) {
            super(id, group, NullTelemetryService, new TestThemeService(), disposables.add(new TestStorageService()));
            this._scopedContextKeyService = new MockContextKeyService();
        }
        async setInput(input, options, context, token) {
            super.setInput(input, options, context, token);
            await input.resolve();
        }
        getId() {
            return id;
        }
        layout() { }
        createEditor() { }
        get scopedContextKeyService() {
            return this._scopedContextKeyService;
        }
    }
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestEditor, id, 'Test Editor Control'), inputs));
    if (serializerInputId) {
        class EditorsObserverTestEditorInputSerializer {
            canSerialize(editorInput) {
                return true;
            }
            serialize(editorInput) {
                const testEditorInput = editorInput;
                const testInput = {
                    resource: testEditorInput.resource.toString(),
                };
                return JSON.stringify(testInput);
            }
            deserialize(instantiationService, serializedEditorInput) {
                const testInput = JSON.parse(serializedEditorInput);
                return new TestFileEditorInput(URI.parse(testInput.resource), serializerInputId);
            }
        }
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(serializerInputId, EditorsObserverTestEditorInputSerializer));
    }
    return disposables;
}
export function registerTestFileEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextFileEditor, TestTextFileEditor.ID, 'Text File Editor'), [new SyncDescriptor(FileEditorInput)]));
    return disposables;
}
export function registerTestResourceEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextResourceEditor, TestTextResourceEditor.ID, 'Text Editor'), [new SyncDescriptor(UntitledTextEditorInput), new SyncDescriptor(TextResourceEditorInput)]));
    return disposables;
}
export function registerTestSideBySideEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SideBySideEditor, SideBySideEditor.ID, 'Text Editor'), [new SyncDescriptor(SideBySideEditorInput)]));
    return disposables;
}
export class TestFileEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
        this.gotDisposed = false;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.gotReverted = false;
        this.dirty = false;
        this.fails = false;
        this.disableToUntyped = false;
        this._capabilities = 0 /* EditorInputCapabilities.None */;
        this.movedEditor = undefined;
        this.moveDisabledReason = undefined;
        this.preferredResource = this.resource;
    }
    get typeId() {
        return this._typeId;
    }
    get editorId() {
        return this._typeId;
    }
    get capabilities() {
        return this._capabilities;
    }
    set capabilities(capabilities) {
        if (this._capabilities !== capabilities) {
            this._capabilities = capabilities;
            this._onDidChangeCapabilities.fire();
        }
    }
    resolve() {
        return !this.fails ? Promise.resolve(null) : Promise.reject(new Error('fails'));
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof EditorInput) {
            return !!(other?.resource &&
                this.resource.toString() === other.resource.toString() &&
                other instanceof TestFileEditorInput &&
                other.typeId === this.typeId);
        }
        return (isEqual(this.resource, other.resource) &&
            (this.editorId === other.options?.override || other.options?.override === undefined));
    }
    setPreferredResource(resource) { }
    async setEncoding(encoding) { }
    getEncoding() {
        return undefined;
    }
    setPreferredName(name) { }
    setPreferredDescription(description) { }
    setPreferredEncoding(encoding) { }
    setPreferredContents(contents) { }
    setLanguageId(languageId, source) { }
    setPreferredLanguageId(languageId) { }
    setForceOpenAsBinary() { }
    setFailToOpen() {
        this.fails = true;
    }
    async save(groupId, options) {
        this.gotSaved = true;
        this.dirty = false;
        return this;
    }
    async saveAs(groupId, options) {
        this.gotSavedAs = true;
        return this;
    }
    async revert(group, options) {
        this.gotReverted = true;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.dirty = false;
    }
    toUntyped() {
        if (this.disableToUntyped) {
            return undefined;
        }
        return { resource: this.resource };
    }
    setModified() {
        this.modified = true;
    }
    isModified() {
        return this.modified === undefined ? this.dirty : this.modified;
    }
    setDirty() {
        this.dirty = true;
    }
    isDirty() {
        return this.dirty;
    }
    isResolved() {
        return false;
    }
    dispose() {
        super.dispose();
        this.gotDisposed = true;
    }
    async rename() {
        return this.movedEditor;
    }
    setMoveDisabled(reason) {
        this.moveDisabledReason = reason;
    }
    canMove(sourceGroup, targetGroup) {
        if (typeof this.moveDisabledReason === 'string') {
            return this.moveDisabledReason;
        }
        return super.canMove(sourceGroup, targetGroup);
    }
}
export class TestSingletonFileEditorInput extends TestFileEditorInput {
    get capabilities() {
        return 8 /* EditorInputCapabilities.Singleton */;
    }
}
export class TestEditorPart extends MainEditorPart {
    constructor() {
        super(...arguments);
        this.mainPart = this;
        this.parts = [this];
        this.onDidCreateAuxiliaryEditorPart = Event.None;
    }
    testSaveState() {
        return super.saveState();
    }
    clearState() {
        const workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(workspaceMemento)) {
            delete workspaceMemento[key];
        }
        const profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(profileMemento)) {
            delete profileMemento[key];
        }
    }
    registerEditorPart(part) {
        return Disposable.None;
    }
    createAuxiliaryEditorPart() {
        throw new Error('Method not implemented.');
    }
    getScopedInstantiationService(part) {
        throw new Error('Method not implemented.');
    }
    getPart(group) {
        return this;
    }
    saveWorkingSet(name) {
        throw new Error('Method not implemented.');
    }
    getWorkingSets() {
        throw new Error('Method not implemented.');
    }
    applyWorkingSet(workingSet, options) {
        throw new Error('Method not implemented.');
    }
    deleteWorkingSet(workingSet) {
        throw new Error('Method not implemented.');
    }
    registerContextKeyProvider(provider) {
        throw new Error('Method not implemented.');
    }
}
export class TestEditorParts extends EditorParts {
    createMainEditorPart() {
        this.testMainPart = this.instantiationService.createInstance(TestEditorPart, this);
        return this.testMainPart;
    }
}
export async function createEditorParts(instantiationService, disposables) {
    const parts = instantiationService.createInstance(TestEditorParts);
    const part = disposables.add(parts).testMainPart;
    part.create(document.createElement('div'));
    part.layout(1080, 800, 0, 0);
    await parts.whenReady;
    return parts;
}
export async function createEditorPart(instantiationService, disposables) {
    return (await createEditorParts(instantiationService, disposables)).testMainPart;
}
export class TestListService {
    constructor() {
        this.lastFocusedList = undefined;
    }
    register() {
        return Disposable.None;
    }
}
export class TestPathService {
    constructor(fallbackUserHome = URI.from({ scheme: Schemas.file, path: '/' }), defaultUriScheme = Schemas.file) {
        this.fallbackUserHome = fallbackUserHome;
        this.defaultUriScheme = defaultUriScheme;
    }
    hasValidBasename(resource, arg2, name) {
        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            return isValidBasename(arg2 ?? basename(resource));
        }
        return isValidBasename(name ?? basename(resource));
    }
    get path() {
        return Promise.resolve(isWindows ? win32 : posix);
    }
    userHome(options) {
        return options?.preferLocal ? this.fallbackUserHome : Promise.resolve(this.fallbackUserHome);
    }
    get resolvedUserHome() {
        return this.fallbackUserHome;
    }
    async fileURI(path) {
        return URI.file(path);
    }
}
export function getLastResolvedFileStat(model) {
    const candidate = model;
    return candidate?.lastResolvedFileStat;
}
export class TestWorkspacesService {
    constructor() {
        this.onDidChangeRecentlyOpened = Event.None;
    }
    async createUntitledWorkspace(folders, remoteAuthority) {
        throw new Error('Method not implemented.');
    }
    async deleteUntitledWorkspace(workspace) { }
    async addRecentlyOpened(recents) { }
    async removeRecentlyOpened(workspaces) { }
    async clearRecentlyOpened() { }
    async getRecentlyOpened() {
        return { files: [], workspaces: [] };
    }
    async getDirtyWorkspaces() {
        return [];
    }
    async enterWorkspace(path) {
        throw new Error('Method not implemented.');
    }
    async getWorkspaceIdentifier(workspacePath) {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalInstanceService {
    constructor() {
        this.onDidCreateInstance = Event.None;
        this.onDidRegisterBackend = Event.None;
    }
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile, cwd) {
        throw new Error('Method not implemented.');
    }
    preparePathForTerminalAsync(path, executable, title, shellType, remoteAuthority) {
        throw new Error('Method not implemented.');
    }
    createInstance(options, target) {
        throw new Error('Method not implemented.');
    }
    async getBackend(remoteAuthority) {
        throw new Error('Method not implemented.');
    }
    didRegisterBackend(backend) {
        throw new Error('Method not implemented.');
    }
    getRegisteredBackends() {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalEditorService {
    constructor() {
        this.instances = [];
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    openEditor(instance, editorOptions) {
        throw new Error('Method not implemented.');
    }
    detachInstance(instance) {
        throw new Error('Method not implemented.');
    }
    splitInstance(instanceToSplit, shellLaunchConfig) {
        throw new Error('Method not implemented.');
    }
    revealActiveEditor(preserveFocus) {
        throw new Error('Method not implemented.');
    }
    resolveResource(instance) {
        throw new Error('Method not implemented.');
    }
    reviveInput(deserializedInput) {
        throw new Error('Method not implemented.');
    }
    getInputFromResource(resource) {
        throw new Error('Method not implemented.');
    }
    setActiveInstance(instance) {
        throw new Error('Method not implemented.');
    }
    focusActiveInstance() {
        throw new Error('Method not implemented.');
    }
    focusInstance(instance) {
        throw new Error('Method not implemented.');
    }
    getInstanceFromResource(resource) {
        throw new Error('Method not implemented.');
    }
    focusFindWidget() {
        throw new Error('Method not implemented.');
    }
    hideFindWidget() {
        throw new Error('Method not implemented.');
    }
    findNext() {
        throw new Error('Method not implemented.');
    }
    findPrevious() {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalGroupService {
    constructor() {
        this.instances = [];
        this.groups = [];
        this.activeGroupIndex = 0;
        this.lastAccessedMenu = 'inline-tab';
        this.onDidChangeActiveGroup = Event.None;
        this.onDidDisposeGroup = Event.None;
        this.onDidShow = Event.None;
        this.onDidChangeGroups = Event.None;
        this.onDidChangePanelOrientation = Event.None;
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    createGroup(instance) {
        throw new Error('Method not implemented.');
    }
    getGroupForInstance(instance) {
        throw new Error('Method not implemented.');
    }
    moveGroup(source, target) {
        throw new Error('Method not implemented.');
    }
    moveGroupToEnd(source) {
        throw new Error('Method not implemented.');
    }
    moveInstance(source, target, side) {
        throw new Error('Method not implemented.');
    }
    unsplitInstance(instance) {
        throw new Error('Method not implemented.');
    }
    joinInstances(instances) {
        throw new Error('Method not implemented.');
    }
    instanceIsSplit(instance) {
        throw new Error('Method not implemented.');
    }
    getGroupLabels() {
        throw new Error('Method not implemented.');
    }
    setActiveGroupByIndex(index) {
        throw new Error('Method not implemented.');
    }
    setActiveGroupToNext() {
        throw new Error('Method not implemented.');
    }
    setActiveGroupToPrevious() {
        throw new Error('Method not implemented.');
    }
    setActiveInstanceByIndex(terminalIndex) {
        throw new Error('Method not implemented.');
    }
    setContainer(container) {
        throw new Error('Method not implemented.');
    }
    showPanel(focus) {
        throw new Error('Method not implemented.');
    }
    hidePanel() {
        throw new Error('Method not implemented.');
    }
    focusTabs() {
        throw new Error('Method not implemented.');
    }
    focusHover() {
        throw new Error('Method not implemented.');
    }
    setActiveInstance(instance) {
        throw new Error('Method not implemented.');
    }
    focusActiveInstance() {
        throw new Error('Method not implemented.');
    }
    focusInstance(instance) {
        throw new Error('Method not implemented.');
    }
    getInstanceFromResource(resource) {
        throw new Error('Method not implemented.');
    }
    focusFindWidget() {
        throw new Error('Method not implemented.');
    }
    hideFindWidget() {
        throw new Error('Method not implemented.');
    }
    findNext() {
        throw new Error('Method not implemented.');
    }
    findPrevious() {
        throw new Error('Method not implemented.');
    }
    updateVisibility() {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalProfileService {
    constructor() {
        this.availableProfiles = [];
        this.contributedProfiles = [];
        this.profilesReady = Promise.resolve();
        this.onDidChangeAvailableProfiles = Event.None;
    }
    getPlatformKey() {
        throw new Error('Method not implemented.');
    }
    refreshAvailableProfiles() {
        throw new Error('Method not implemented.');
    }
    getDefaultProfileName() {
        throw new Error('Method not implemented.');
    }
    getDefaultProfile() {
        throw new Error('Method not implemented.');
    }
    getContributedDefaultProfile(shellLaunchConfig) {
        throw new Error('Method not implemented.');
    }
    registerContributedProfile(args) {
        throw new Error('Method not implemented.');
    }
    getContributedProfileProvider(extensionIdentifier, id) {
        throw new Error('Method not implemented.');
    }
    registerTerminalProfileProvider(extensionIdentifier, id, profileProvider) {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalProfileResolverService {
    constructor() {
        this.defaultProfileName = '';
    }
    resolveIcon(shellLaunchConfig) { }
    async resolveShellLaunchConfig(shellLaunchConfig, options) { }
    async getDefaultProfile(options) {
        return { path: '/default', profileName: 'Default', isDefault: true };
    }
    async getDefaultShell(options) {
        return '/default';
    }
    async getDefaultShellArgs(options) {
        return [];
    }
    getDefaultIcon() {
        return Codicon.terminal;
    }
    async getEnvironment() {
        return env;
    }
    getSafeConfigValue(key, os) {
        return undefined;
    }
    getSafeConfigValueFullKey(key) {
        return undefined;
    }
    createProfileFromShellAndShellArgs(shell, shellArgs) {
        throw new Error('Method not implemented.');
    }
}
export class TestTerminalConfigurationService extends TerminalConfigurationService {
    get fontMetrics() {
        return this._fontMetrics;
    }
    setConfig(config) {
        this._config = config;
    }
}
export class TestQuickInputService {
    constructor() {
        this.onShow = Event.None;
        this.onHide = Event.None;
        this.currentQuickInput = undefined;
        this.quickAccess = undefined;
    }
    async pick(picks, options, token) {
        if (Array.isArray(picks)) {
            return { label: 'selectedPick', description: 'pick description', value: 'selectedPick' };
        }
        else {
            return undefined;
        }
    }
    async input(options, token) {
        return options ? 'resolved' + options.prompt : 'resolved';
    }
    createQuickPick() {
        throw new Error('not implemented.');
    }
    createInputBox() {
        throw new Error('not implemented.');
    }
    createQuickWidget() {
        throw new Error('Method not implemented.');
    }
    focus() {
        throw new Error('not implemented.');
    }
    toggle() {
        throw new Error('not implemented.');
    }
    navigate(next, quickNavigate) {
        throw new Error('not implemented.');
    }
    accept() {
        throw new Error('not implemented.');
    }
    back() {
        throw new Error('not implemented.');
    }
    cancel() {
        throw new Error('not implemented.');
    }
    setAlignment(alignment) {
        throw new Error('not implemented.');
    }
    toggleHover() {
        throw new Error('not implemented.');
    }
}
class TestLanguageDetectionService {
    isEnabledForLanguage(languageId) {
        return false;
    }
    async detectLanguage(resource, supportedLangs) {
        return undefined;
    }
}
export class TestRemoteAgentService {
    getConnection() {
        return null;
    }
    async getEnvironment() {
        return null;
    }
    async getRawEnvironment() {
        return null;
    }
    async getExtensionHostExitInfo(reconnectionToken) {
        return null;
    }
    async getDiagnosticInfo(options) {
        return undefined;
    }
    async updateTelemetryLevel(telemetryLevel) { }
    async logTelemetry(eventName, data) { }
    async flushTelemetry() { }
    async getRoundTripTime() {
        return undefined;
    }
    async endConnection() { }
}
export class TestRemoteExtensionsScannerService {
    async whenExtensionsReady() {
        return { failed: [] };
    }
    scanExtensions() {
        throw new Error('Method not implemented.');
    }
}
export class TestWorkbenchExtensionEnablementService {
    constructor() {
        this.onEnablementChanged = Event.None;
    }
    getEnablementState(extension) {
        return 11 /* EnablementState.EnabledGlobally */;
    }
    getEnablementStates(extensions, workspaceTypeOverrides) {
        return [];
    }
    getDependenciesEnablementStates(extension) {
        return [];
    }
    canChangeEnablement(extension) {
        return true;
    }
    canChangeWorkspaceEnablement(extension) {
        return true;
    }
    isEnabled(extension) {
        return true;
    }
    isEnabledEnablementState(enablementState) {
        return true;
    }
    isDisabledGlobally(extension) {
        return false;
    }
    async setEnablement(extensions, state) {
        return [];
    }
    async updateExtensionsEnablementsWhenWorkspaceTrustChanges() { }
}
export class TestWorkbenchExtensionManagementService {
    constructor() {
        this.onInstallExtension = Event.None;
        this.onDidInstallExtensions = Event.None;
        this.onUninstallExtension = Event.None;
        this.onDidUninstallExtension = Event.None;
        this.onDidUpdateExtensionMetadata = Event.None;
        this.onProfileAwareInstallExtension = Event.None;
        this.onProfileAwareDidInstallExtensions = Event.None;
        this.onProfileAwareUninstallExtension = Event.None;
        this.onProfileAwareDidUninstallExtension = Event.None;
        this.onDidProfileAwareUninstallExtensions = Event.None;
        this.onProfileAwareDidUpdateExtensionMetadata = Event.None;
        this.onDidChangeProfile = Event.None;
        this.onDidEnableExtensions = Event.None;
    }
    installVSIX(location, manifest, installOptions) {
        throw new Error('Method not implemented.');
    }
    installFromLocation(location) {
        throw new Error('Method not implemented.');
    }
    installGalleryExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async updateFromGallery(gallery, extension, installOptions) {
        return extension;
    }
    zip(extension) {
        throw new Error('Method not implemented.');
    }
    getManifest(vsix) {
        throw new Error('Method not implemented.');
    }
    install(vsix, options) {
        throw new Error('Method not implemented.');
    }
    isAllowed() {
        return true;
    }
    async canInstall(extension) {
        return true;
    }
    installFromGallery(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstall(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstallExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async getInstalled(type) {
        return [];
    }
    getExtensionsControlManifest() {
        throw new Error('Method not implemented.');
    }
    async updateMetadata(local, metadata) {
        return local;
    }
    registerParticipant(pariticipant) { }
    async getTargetPlatform() {
        return "undefined" /* TargetPlatform.UNDEFINED */;
    }
    async cleanUp() { }
    download() {
        throw new Error('Method not implemented.');
    }
    copyExtensions() {
        throw new Error('Not Supported');
    }
    toggleAppliationScope() {
        throw new Error('Not Supported');
    }
    installExtensionsFromProfile() {
        throw new Error('Not Supported');
    }
    whenProfileChanged(from, to) {
        throw new Error('Not Supported');
    }
    getInstalledWorkspaceExtensionLocations() {
        throw new Error('Method not implemented.');
    }
    getInstalledWorkspaceExtensions() {
        throw new Error('Method not implemented.');
    }
    installResourceExtension() {
        throw new Error('Method not implemented.');
    }
    getExtensions() {
        throw new Error('Method not implemented.');
    }
    resetPinnedStateForAllUserExtensions(pinned) {
        throw new Error('Method not implemented.');
    }
    getInstallableServers(extension) {
        throw new Error('Method not implemented.');
    }
    isPublisherTrusted(extension) {
        return false;
    }
    getTrustedPublishers() {
        return [];
    }
    trustPublishers() { }
    untrustPublishers() { }
    async requestPublisherTrust(extensions) { }
}
export class TestUserDataProfileService {
    constructor() {
        this.onDidChangeCurrentProfile = Event.None;
        this.currentProfile = toUserDataProfile('test', 'test', URI.file('tests').with({ scheme: 'vscode-tests' }), URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    async updateCurrentProfile() { }
}
export class TestWebExtensionsScannerService {
    constructor() {
        this.onDidChangeProfile = Event.None;
    }
    async scanSystemExtensions() {
        return [];
    }
    async scanUserExtensions() {
        return [];
    }
    async scanExtensionsUnderDevelopment() {
        return [];
    }
    async copyExtensions() {
        throw new Error('Method not implemented.');
    }
    scanExistingExtension(extensionLocation, extensionType) {
        throw new Error('Method not implemented.');
    }
    addExtension(location, metadata) {
        throw new Error('Method not implemented.');
    }
    addExtensionFromGallery(galleryExtension, metadata) {
        throw new Error('Method not implemented.');
    }
    removeExtension() {
        throw new Error('Method not implemented.');
    }
    updateMetadata(extension, metaData, profileLocation) {
        throw new Error('Method not implemented.');
    }
    scanExtensionManifest(extensionLocation) {
        throw new Error('Method not implemented.');
    }
}
export async function workbenchTeardown(instantiationService) {
    return instantiationService.invokeFunction(async (accessor) => {
        const workingCopyService = accessor.get(IWorkingCopyService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        for (const workingCopy of workingCopyService.workingCopies) {
            await workingCopy.revert();
        }
        for (const group of editorGroupService.groups) {
            await group.closeAllEditors();
        }
        for (const group of editorGroupService.groups) {
            editorGroupService.removeGroup(group);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDbEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRSxPQUFPLEVBY04sZ0JBQWdCLEVBTWhCLGdCQUFnQixJQUFJLFVBQVUsR0FTOUIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBS04sMkJBQTJCLEdBQzNCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUNOLHFCQUFxQixHQUdyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTix1QkFBdUIsR0FJdkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUM5RyxP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