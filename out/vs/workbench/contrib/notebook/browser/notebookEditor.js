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
var NotebookEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { toAction } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ByteSize, IFileService, TooLargeFileOperationError, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, createEditorOpenError, createTooLargeFileError, isEditorOpenError, } from '../../../common/editor.js';
import { SELECT_KERNEL_ID } from './controller/coreActions.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { NotebooKernelActionViewItem } from './viewParts/notebookKernelView.js';
import { CellKind, NOTEBOOK_EDITOR_ID, NotebookWorkingCopyTypeIdentifier, } from '../common/notebookCommon.js';
import { NotebookEditorInput } from '../common/notebookEditorInput.js';
import { NotebookPerfMarks } from '../common/notebookPerformance.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { InstallRecommendedExtensionAction } from '../../extensions/browser/extensionsActions.js';
import { INotebookService } from '../common/notebookService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
const NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'NotebookEditorViewState';
let NotebookEditor = class NotebookEditor extends EditorPane {
    static { NotebookEditor_1 = this; }
    static { this.ID = NOTEBOOK_EDITOR_ID; }
    get onDidFocus() {
        return this._onDidFocusWidget.event;
    }
    get onDidBlur() {
        return this._onDidBlurWidget.event;
    }
    constructor(group, telemetryService, themeService, _instantiationService, storageService, _editorService, _editorGroupService, _notebookWidgetService, _contextKeyService, _fileService, configurationService, _editorProgressService, _notebookService, _extensionsWorkbenchService, _workingCopyBackupService, logService, _preferencesService) {
        super(NotebookEditor_1.ID, group, telemetryService, themeService, storageService);
        this._instantiationService = _instantiationService;
        this._editorService = _editorService;
        this._editorGroupService = _editorGroupService;
        this._notebookWidgetService = _notebookWidgetService;
        this._contextKeyService = _contextKeyService;
        this._fileService = _fileService;
        this._editorProgressService = _editorProgressService;
        this._notebookService = _notebookService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._workingCopyBackupService = _workingCopyBackupService;
        this.logService = logService;
        this._preferencesService = _preferencesService;
        this._groupListener = this._register(new DisposableStore());
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._widget = { value: undefined };
        this._inputListener = this._register(new MutableDisposable());
        // override onDidFocus and onDidBlur to be based on the NotebookEditorWidget element
        this._onDidFocusWidget = this._register(new Emitter());
        this._onDidBlurWidget = this._register(new Emitter());
        this._onDidChangeModel = this._register(new Emitter());
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this._editorMemento = this.getEditorMemento(_editorGroupService, configurationService, NOTEBOOK_EDITOR_VIEW_STATE_PREFERENCE_KEY);
        this._register(this._fileService.onDidChangeFileSystemProviderCapabilities((e) => this._onDidChangeFileSystemProvider(e.scheme)));
        this._register(this._fileService.onDidChangeFileSystemProviderRegistrations((e) => this._onDidChangeFileSystemProvider(e.scheme)));
    }
    _onDidChangeFileSystemProvider(scheme) {
        if (this.input instanceof NotebookEditorInput && this.input.resource?.scheme === scheme) {
            this._updateReadonly(this.input);
        }
    }
    _onDidChangeInputCapabilities(input) {
        if (this.input === input) {
            this._updateReadonly(input);
        }
    }
    _updateReadonly(input) {
        this._widget.value?.setOptions({ isReadOnly: !!input.isReadonly() });
    }
    get textModel() {
        return this._widget.value?.textModel;
    }
    get minimumWidth() {
        return 220;
    }
    get maximumWidth() {
        return Number.POSITIVE_INFINITY;
    }
    // these setters need to exist because this extends from EditorPane
    set minimumWidth(value) {
        /*noop*/
    }
    set maximumWidth(value) {
        /*noop*/
    }
    //#region Editor Core
    get scopedContextKeyService() {
        return this._widget.value?.scopedContextKeyService;
    }
    createEditor(parent) {
        this._rootElement = DOM.append(parent, DOM.$('.notebook-editor'));
        this._rootElement.id = `notebook-editor-element-${generateUuid()}`;
    }
    getActionViewItem(action, options) {
        if (action.id === SELECT_KERNEL_ID) {
            // this is being disposed by the consumer
            return this._register(this._instantiationService.createInstance(NotebooKernelActionViewItem, action, this, options));
        }
        return undefined;
    }
    getControl() {
        return this._widget.value;
    }
    setVisible(visible) {
        super.setVisible(visible);
        if (!visible) {
            this._widget.value?.onWillHide();
        }
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this._groupListener.clear();
        this._groupListener.add(this.group.onWillCloseEditor((e) => this._saveEditorViewState(e.editor)));
        this._groupListener.add(this.group.onDidModelChange(() => {
            if (this._editorGroupService.activeGroup !== this.group) {
                this._widget?.value?.updateEditorFocus();
            }
        }));
        if (!visible) {
            this._saveEditorViewState(this.input);
            if (this.input && this._widget.value) {
                // the widget is not transfered to other editor inputs
                this._widget.value.onWillHide();
            }
        }
    }
    focus() {
        super.focus();
        this._widget.value?.focus();
    }
    hasFocus() {
        const value = this._widget.value;
        if (!value) {
            return false;
        }
        return (!!value &&
            DOM.isAncestorOfActiveElement(value.getDomNode() || DOM.isAncestorOfActiveElement(value.getOverflowContainerDomNode())));
    }
    async setInput(input, options, context, token, noRetry) {
        try {
            let perfMarksCaptured = false;
            const fileOpenMonitor = timeout(10000);
            fileOpenMonitor.then(() => {
                perfMarksCaptured = true;
                this._handlePerfMark(perf, input);
            });
            const perf = new NotebookPerfMarks();
            perf.mark('startTime');
            this._inputListener.value = input.onDidChangeCapabilities(() => this._onDidChangeInputCapabilities(input));
            this._widgetDisposableStore.clear();
            // there currently is a widget which we still own so
            // we need to hide it before getting a new widget
            this._widget.value?.onWillHide();
            this._widget = (this._instantiationService.invokeFunction(this._notebookWidgetService.retrieveWidget, this.group.id, input, undefined, this._pagePosition?.dimension, this.window));
            if (this._rootElement && this._widget.value.getDomNode()) {
                this._rootElement.setAttribute('aria-flowto', this._widget.value.getDomNode().id || '');
                DOM.setParentFlowTo(this._widget.value.getDomNode(), this._rootElement);
            }
            this._widgetDisposableStore.add(this._widget.value.onDidChangeModel(() => this._onDidChangeModel.fire()));
            this._widgetDisposableStore.add(this._widget.value.onDidChangeActiveCell(() => this._onDidChangeSelection.fire({ reason: 2 /* EditorPaneSelectionChangeReason.USER */ })));
            if (this._pagePosition) {
                this._widget.value.layout(this._pagePosition.dimension, this._rootElement, this._pagePosition.position);
            }
            // only now `setInput` and yield/await. this is AFTER the actual widget is ready. This is very important
            // so that others synchronously receive a notebook editor with the correct widget being set
            await super.setInput(input, options, context, token);
            const model = await input.resolve(options, perf);
            perf.mark('inputLoaded');
            // Check for cancellation
            if (token.isCancellationRequested) {
                return undefined;
            }
            // The widget has been taken away again. This can happen when the tab has been closed while
            // loading was in progress, in particular when open the same resource as different view type.
            // When this happen, retry once
            if (!this._widget.value) {
                if (noRetry) {
                    return undefined;
                }
                return this.setInput(input, options, context, token, true);
            }
            if (model === null) {
                const knownProvider = this._notebookService.getViewTypeProvider(input.viewType);
                if (!knownProvider) {
                    throw new Error(localize('fail.noEditor', "Cannot open resource with notebook editor type '{0}', please check if you have the right extension installed and enabled.", input.viewType));
                }
                await this._extensionsWorkbenchService.whenInitialized;
                const extensionInfo = this._extensionsWorkbenchService.local.find((e) => e.identifier.id === knownProvider);
                throw createEditorOpenError(new Error(localize('fail.noEditor.extensionMissing', "Cannot open resource with notebook editor type '{0}', please check if you have the right extension installed and enabled.", input.viewType)), [
                    toAction({
                        id: 'workbench.notebook.action.installOrEnableMissing',
                        label: extensionInfo
                            ? localize('notebookOpenEnableMissingViewType', "Enable extension for '{0}'", input.viewType)
                            : localize('notebookOpenInstallMissingViewType', "Install extension for '{0}'", input.viewType),
                        run: async () => {
                            const d = this._notebookService.onAddViewType((viewType) => {
                                if (viewType === input.viewType) {
                                    // serializer is registered, try to open again
                                    this._editorService.openEditor({ resource: input.resource });
                                    d.dispose();
                                }
                            });
                            const extensionInfo = this._extensionsWorkbenchService.local.find((e) => e.identifier.id === knownProvider);
                            try {
                                if (extensionInfo) {
                                    await this._extensionsWorkbenchService.setEnablement(extensionInfo, extensionInfo.enablementState === 10 /* EnablementState.DisabledWorkspace */
                                        ? 12 /* EnablementState.EnabledWorkspace */
                                        : 11 /* EnablementState.EnabledGlobally */);
                                }
                                else {
                                    await this._instantiationService
                                        .createInstance(InstallRecommendedExtensionAction, knownProvider)
                                        .run();
                                }
                            }
                            catch (ex) {
                                this.logService.error(`Failed to install or enable extension ${knownProvider}`, ex);
                                d.dispose();
                            }
                        },
                    }),
                    toAction({
                        id: 'workbench.notebook.action.openAsText',
                        label: localize('notebookOpenAsText', 'Open As Text'),
                        run: async () => {
                            const backup = await this._workingCopyBackupService.resolve({
                                resource: input.resource,
                                typeId: NotebookWorkingCopyTypeIdentifier.create(input.viewType),
                            });
                            if (backup) {
                                // with a backup present, we must resort to opening the backup contents
                                // as untitled text file to not show the wrong data to the user
                                const contents = await streamToBuffer(backup.value);
                                this._editorService.openEditor({
                                    resource: undefined,
                                    contents: contents.toString(),
                                });
                            }
                            else {
                                // without a backup present, we can open the original resource
                                this._editorService.openEditor({
                                    resource: input.resource,
                                    options: { override: DEFAULT_EDITOR_ASSOCIATION.id, pinned: true },
                                });
                            }
                        },
                    }),
                ], { allowDialog: true });
            }
            this._widgetDisposableStore.add(model.notebook.onDidChangeContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
            const viewState = options?.viewState ?? this._loadNotebookEditorViewState(input);
            // We might be moving the notebook widget between groups, and these services are tied to the group
            this._widget.value.setParentContextKeyService(this._contextKeyService);
            this._widget.value.setEditorProgressService(this._editorProgressService);
            await this._widget.value.setModel(model.notebook, viewState, perf);
            const isReadOnly = !!input.isReadonly();
            await this._widget.value.setOptions({ ...options, isReadOnly });
            this._widgetDisposableStore.add(this._widget.value.onDidFocusWidget(() => this._onDidFocusWidget.fire()));
            this._widgetDisposableStore.add(this._widget.value.onDidBlurWidget(() => this._onDidBlurWidget.fire()));
            this._widgetDisposableStore.add(this._editorGroupService.createEditorDropTarget(this._widget.value.getDomNode(), {
                containsGroup: (group) => this.group.id === group.id,
            }));
            this._widgetDisposableStore.add(this._widget.value.onDidScroll(() => {
                this._onDidChangeScroll.fire();
            }));
            perf.mark('editorLoaded');
            fileOpenMonitor.cancel();
            if (perfMarksCaptured) {
                return;
            }
            this._handlePerfMark(perf, input, model.notebook);
            this._onDidChangeControl.fire();
        }
        catch (e) {
            this.logService.warn('NotebookEditorWidget#setInput failed', e);
            if (isEditorOpenError(e)) {
                throw e;
            }
            // Handle case where a file is too large to open without confirmation
            if (e.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
                let message;
                if (e instanceof TooLargeFileOperationError) {
                    message = localize('notebookTooLargeForHeapErrorWithSize', 'The notebook is not displayed in the notebook editor because it is very large ({0}).', ByteSize.formatSize(e.size));
                }
                else {
                    message = localize('notebookTooLargeForHeapErrorWithoutSize', 'The notebook is not displayed in the notebook editor because it is very large.');
                }
                throw createTooLargeFileError(this.group, input, options, message, this._preferencesService);
            }
            const error = createEditorOpenError(e instanceof Error ? e : new Error(e ? e.message : ''), [
                toAction({
                    id: 'workbench.notebook.action.openInTextEditor',
                    label: localize('notebookOpenInTextEditor', 'Open in Text Editor'),
                    run: async () => {
                        const activeEditorPane = this._editorService.activeEditorPane;
                        if (!activeEditorPane) {
                            return;
                        }
                        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
                        if (!activeEditorResource) {
                            return;
                        }
                        if (activeEditorResource.toString() === input.resource?.toString()) {
                            // Replace the current editor with the text editor
                            return this._editorService.openEditor({
                                resource: activeEditorResource,
                                options: {
                                    override: DEFAULT_EDITOR_ASSOCIATION.id,
                                    pinned: true, // new file gets pinned by default
                                },
                            });
                        }
                        return;
                    },
                }),
            ], { allowDialog: true });
            throw error;
        }
    }
    _handlePerfMark(perf, input, notebook) {
        const perfMarks = perf.value;
        const startTime = perfMarks['startTime'];
        const extensionActivated = perfMarks['extensionActivated'];
        const inputLoaded = perfMarks['inputLoaded'];
        const webviewCommLoaded = perfMarks['webviewCommLoaded'];
        const customMarkdownLoaded = perfMarks['customMarkdownLoaded'];
        const editorLoaded = perfMarks['editorLoaded'];
        let extensionActivationTimespan = -1;
        let inputLoadingTimespan = -1;
        let webviewCommLoadingTimespan = -1;
        let customMarkdownLoadingTimespan = -1;
        let editorLoadingTimespan = -1;
        if (startTime !== undefined && extensionActivated !== undefined) {
            extensionActivationTimespan = extensionActivated - startTime;
            if (inputLoaded !== undefined) {
                inputLoadingTimespan = inputLoaded - extensionActivated;
            }
            if (webviewCommLoaded !== undefined) {
                webviewCommLoadingTimespan = webviewCommLoaded - extensionActivated;
            }
            if (customMarkdownLoaded !== undefined) {
                customMarkdownLoadingTimespan = customMarkdownLoaded - startTime;
            }
            if (editorLoaded !== undefined) {
                editorLoadingTimespan = editorLoaded - startTime;
            }
        }
        // Notebook information
        let codeCellCount = undefined;
        let mdCellCount = undefined;
        let outputCount = undefined;
        let outputBytes = undefined;
        let codeLength = undefined;
        let markdownLength = undefined;
        let notebookStatsLoaded = undefined;
        if (notebook) {
            const stopWatch = new StopWatch();
            for (const cell of notebook.cells) {
                if (cell.cellKind === CellKind.Code) {
                    codeCellCount = (codeCellCount || 0) + 1;
                    codeLength = (codeLength || 0) + cell.getTextLength();
                    outputCount = (outputCount || 0) + cell.outputs.length;
                    outputBytes =
                        (outputBytes || 0) +
                            cell.outputs.reduce((prev, cur) => prev + cur.outputs.reduce((size, item) => size + item.data.byteLength, 0), 0);
                }
                else {
                    mdCellCount = (mdCellCount || 0) + 1;
                    markdownLength = (codeLength || 0) + cell.getTextLength();
                }
            }
            notebookStatsLoaded = stopWatch.elapsed();
        }
        this.logService.trace(`[NotebookEditor] open notebook perf ${notebook?.uri.toString() ?? ''} - extensionActivation: ${extensionActivationTimespan}, inputLoad: ${inputLoadingTimespan}, webviewComm: ${webviewCommLoadingTimespan}, customMarkdown: ${customMarkdownLoadingTimespan}, editorLoad: ${editorLoadingTimespan}`);
        this.telemetryService.publicLog2('notebook/editorOpenPerf', {
            scheme: input.resource.scheme,
            ext: extname(input.resource),
            viewType: input.viewType,
            extensionActivated: extensionActivationTimespan,
            inputLoaded: inputLoadingTimespan,
            webviewCommLoaded: webviewCommLoadingTimespan,
            customMarkdownLoaded: customMarkdownLoadingTimespan,
            editorLoaded: editorLoadingTimespan,
            codeCellCount,
            mdCellCount,
            outputCount,
            outputBytes,
            codeLength,
            markdownLength,
            notebookStatsLoaded,
        });
    }
    clearInput() {
        this._inputListener.clear();
        if (this._widget.value) {
            this._saveEditorViewState(this.input);
            this._widget.value.onWillHide();
        }
        super.clearInput();
    }
    setOptions(options) {
        this._widget.value?.setOptions(options);
        super.setOptions(options);
    }
    saveState() {
        this._saveEditorViewState(this.input);
        super.saveState();
    }
    getViewState() {
        const input = this.input;
        if (!(input instanceof NotebookEditorInput)) {
            return undefined;
        }
        this._saveEditorViewState(input);
        return this._loadNotebookEditorViewState(input);
    }
    getSelection() {
        if (this._widget.value) {
            const activeCell = this._widget.value.getActiveCell();
            if (activeCell) {
                const cellUri = activeCell.uri;
                return new NotebookEditorSelection(cellUri, activeCell.getSelections());
            }
        }
        return undefined;
    }
    getScrollPosition() {
        const widget = this.getControl();
        if (!widget) {
            throw new Error('Notebook widget has not yet been initialized');
        }
        return {
            scrollTop: widget.scrollTop,
            scrollLeft: 0,
        };
    }
    setScrollPosition(scrollPosition) {
        const editor = this.getControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        editor.setScrollTop(scrollPosition.scrollTop);
    }
    _saveEditorViewState(input) {
        if (this._widget.value && input instanceof NotebookEditorInput) {
            if (this._widget.value.isDisposed) {
                return;
            }
            const state = this._widget.value.getEditorViewState();
            this._editorMemento.saveEditorState(this.group, input.resource, state);
        }
    }
    _loadNotebookEditorViewState(input) {
        const result = this._editorMemento.loadEditorState(this.group, input.resource);
        if (result) {
            return result;
        }
        // when we don't have a view state for the group/input-tuple then we try to use an existing
        // editor for the same resource.
        for (const group of this._editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group.activeEditorPane !== this &&
                group.activeEditorPane instanceof NotebookEditor_1 &&
                group.activeEditor?.matches(input)) {
                return group.activeEditorPane._widget.value?.getEditorViewState();
            }
        }
        return;
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        this._pagePosition = { dimension, position };
        if (!this._widget.value || !(this.input instanceof NotebookEditorInput)) {
            return;
        }
        if (this.input.resource.toString() !== this.textModel?.uri.toString() &&
            this._widget.value?.hasModel()) {
            // input and widget mismatch
            // this happens when
            // 1. open document A, pin the document
            // 2. open document B
            // 3. close document B
            // 4. a layout is triggered
            return;
        }
        if (this.isVisible()) {
            this._widget.value.layout(dimension, this._rootElement, position);
        }
    }
};
NotebookEditor = NotebookEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IEditorGroupsService),
    __param(7, INotebookEditorService),
    __param(8, IContextKeyService),
    __param(9, IFileService),
    __param(10, ITextResourceConfigurationService),
    __param(11, IEditorProgressService),
    __param(12, INotebookService),
    __param(13, IExtensionsWorkbenchService),
    __param(14, IWorkingCopyBackupService),
    __param(15, ILogService),
    __param(16, IPreferencesService)
], NotebookEditor);
export { NotebookEditor };
class NotebookEditorSelection {
    constructor(cellUri, selections) {
        this.cellUri = cellUri;
        this.selections = selections;
    }
    compare(other) {
        if (!(other instanceof NotebookEditorSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (isEqual(this.cellUri, other.cellUri)) {
            return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
        }
        return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
    restore(options) {
        const notebookOptions = {
            cellOptions: {
                resource: this.cellUri,
                options: {
                    selection: this.selections[0],
                },
            },
        };
        Object.assign(notebookOptions, options);
        return notebookOptions;
    }
    log() {
        return this.cellUri.fragment;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQ04sUUFBUSxFQUdSLFlBQVksRUFDWiwwQkFBMEIsR0FDMUIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FB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