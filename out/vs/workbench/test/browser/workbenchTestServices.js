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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci93b3JrYmVuY2hUZXN0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEUsT0FBTyxFQWNOLGdCQUFnQixFQU1oQixnQkFBZ0IsSUFBSSxVQUFVLEdBUzlCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUtOLDJCQUEyQixHQUMzQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFDTixxQkFBcUIsR0FHckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sdUJBQXVCLEdBSXZCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDOUcsT0FBTyxF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