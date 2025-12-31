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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUNOLFFBQVEsRUFHUixZQUFZLEVBQ1osMEJBQTBCLEdBQzFCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxt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