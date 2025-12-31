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
var NotebookChatController_1;
import { Dimension, WindowIntervalTimer, getWindow, scheduleAtNextAnimationFrame, trackFocus, } from '../../../../../../base/browser/dom.js';
import { DeferredPromise, Queue, createCancelablePromise, disposableTimeout, } from '../../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { MovingAverage } from '../../../../../../base/common/numbers.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { StopWatch } from '../../../../../../base/common/stopwatch.js';
import { assertType } from '../../../../../../base/common/types.js';
import { URI } from '../../../../../../base/common/uri.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { TextEdit } from '../../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../../platform/storage/common/storage.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { countWords } from '../../../../chat/common/chatWordCounter.js';
import { InlineChatWidget } from '../../../../inlineChat/browser/inlineChatWidget.js';
import { asProgressiveEdit, performAsyncTextEdit } from '../../../../inlineChat/browser/utils.js';
import { insertCell, runDeleteAction } from '../cellOperations.js';
import { CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST, CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, MENU_CELL_CHAT_WIDGET_STATUS, } from './notebookChatContext.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
class NotebookChatWidget extends Disposable {
    set afterModelPosition(afterModelPosition) {
        this.notebookViewZone.afterModelPosition = afterModelPosition;
    }
    get afterModelPosition() {
        return this.notebookViewZone.afterModelPosition;
    }
    set heightInPx(heightInPx) {
        this.notebookViewZone.heightInPx = heightInPx;
    }
    get heightInPx() {
        return this.notebookViewZone.heightInPx;
    }
    get editingCell() {
        return this._editingCell;
    }
    constructor(_notebookEditor, id, notebookViewZone, domNode, widgetContainer, inlineChatWidget, parentEditor, _languageService) {
        super();
        this._notebookEditor = _notebookEditor;
        this.id = id;
        this.notebookViewZone = notebookViewZone;
        this.domNode = domNode;
        this.widgetContainer = widgetContainer;
        this.inlineChatWidget = inlineChatWidget;
        this.parentEditor = parentEditor;
        this._languageService = _languageService;
        this._editingCell = null;
        const updateHeight = () => {
            if (this.heightInPx === inlineChatWidget.contentHeight) {
                return;
            }
            this.heightInPx = inlineChatWidget.contentHeight;
            this._notebookEditor.changeViewZones((accessor) => {
                accessor.layoutZone(id);
            });
            this._layoutWidget(inlineChatWidget, widgetContainer);
        };
        this._register(inlineChatWidget.onDidChangeHeight(() => {
            updateHeight();
        }));
        this._register(inlineChatWidget.chatWidget.onDidChangeHeight(() => {
            updateHeight();
        }));
        this.heightInPx = inlineChatWidget.contentHeight;
        this._layoutWidget(inlineChatWidget, widgetContainer);
    }
    layout() {
        this._layoutWidget(this.inlineChatWidget, this.widgetContainer);
    }
    restoreEditingCell(initEditingCell) {
        this._editingCell = initEditingCell;
        const decorationIds = this._notebookEditor.deltaCellDecorations([], [
            {
                handle: this._editingCell.handle,
                options: {
                    className: 'nb-chatGenerationHighlight',
                    outputClassName: 'nb-chatGenerationHighlight',
                },
            },
        ]);
        this._register(toDisposable(() => {
            this._notebookEditor.deltaCellDecorations(decorationIds, []);
        }));
    }
    hasFocus() {
        return this.inlineChatWidget.hasFocus();
    }
    focus() {
        this.updateNotebookEditorFocusNSelections();
        this.inlineChatWidget.focus();
    }
    updateNotebookEditorFocusNSelections() {
        this._notebookEditor.focusContainer(true);
        this._notebookEditor.setFocus({ start: this.afterModelPosition, end: this.afterModelPosition });
        this._notebookEditor.setSelections([
            {
                start: this.afterModelPosition,
                end: this.afterModelPosition,
            },
        ]);
    }
    getEditingCell() {
        return this._editingCell;
    }
    async getOrCreateEditingCell() {
        if (this._editingCell) {
            const codeEditor = this._notebookEditor.codeEditors.find((ce) => ce[0] === this._editingCell)?.[1];
            if (codeEditor?.hasModel()) {
                return {
                    cell: this._editingCell,
                    editor: codeEditor,
                };
            }
            else {
                return undefined;
            }
        }
        if (!this._notebookEditor.hasModel()) {
            return undefined;
        }
        const widgetHasFocus = this.inlineChatWidget.hasFocus();
        this._editingCell = insertCell(this._languageService, this._notebookEditor, this.afterModelPosition, CellKind.Code, 'above');
        if (!this._editingCell) {
            return undefined;
        }
        await this._notebookEditor.revealFirstLineIfOutsideViewport(this._editingCell);
        // update decoration
        const decorationIds = this._notebookEditor.deltaCellDecorations([], [
            {
                handle: this._editingCell.handle,
                options: {
                    className: 'nb-chatGenerationHighlight',
                    outputClassName: 'nb-chatGenerationHighlight',
                },
            },
        ]);
        this._register(toDisposable(() => {
            this._notebookEditor.deltaCellDecorations(decorationIds, []);
        }));
        if (widgetHasFocus) {
            this.focus();
        }
        const codeEditor = this._notebookEditor.codeEditors.find((ce) => ce[0] === this._editingCell)?.[1];
        if (codeEditor?.hasModel()) {
            return {
                cell: this._editingCell,
                editor: codeEditor,
            };
        }
        return undefined;
    }
    async discardChange() {
        if (this._notebookEditor.hasModel() && this._editingCell) {
            // remove the cell from the notebook
            runDeleteAction(this._notebookEditor, this._editingCell);
        }
    }
    _layoutWidget(inlineChatWidget, widgetContainer) {
        const layoutConfiguration = this._notebookEditor.notebookOptions.getLayoutConfiguration();
        const rightMargin = layoutConfiguration.cellRightMargin;
        const leftMargin = this._notebookEditor.notebookOptions.getCellEditorContainerLeftMargin();
        const maxWidth = 640;
        const width = Math.min(maxWidth, this._notebookEditor.getLayoutInfo().width - leftMargin - rightMargin);
        inlineChatWidget.layout(new Dimension(width, this.heightInPx));
        inlineChatWidget.domNode.style.width = `${width}px`;
        widgetContainer.style.left = `${leftMargin}px`;
    }
    dispose() {
        this._notebookEditor.changeViewZones((accessor) => {
            accessor.removeZone(this.id);
        });
        this.domNode.remove();
        super.dispose();
    }
}
class NotebookCellTextModelLikeId {
    static str(k) {
        return `${k.viewType}/${k.uri.toString()}`;
    }
    static obj(s) {
        const idx = s.indexOf('/');
        return {
            viewType: s.substring(0, idx),
            uri: URI.parse(s.substring(idx + 1)),
        };
    }
}
let NotebookChatController = class NotebookChatController extends Disposable {
    static { NotebookChatController_1 = this; }
    static { this.id = 'workbench.notebook.chatController'; }
    static { this.counter = 0; }
    static get(editor) {
        return editor.getContribution(NotebookChatController_1.id);
    }
    // History
    static { this._storageKey = 'inline-chat-history'; }
    static { this._promptHistory = []; }
    constructor(_notebookEditor, _instantiationService, _contextKeyService, _editorWorkerService, _modelService, _languageService, _executionStateService, _storageService, _chatService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._editorWorkerService = _editorWorkerService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._executionStateService = _executionStateService;
        this._storageService = _storageService;
        this._chatService = _chatService;
        this._historyOffset = -1;
        this._historyCandidate = '';
        this._promptCache = new LRUCache(1000, 0.7);
        this._onDidChangePromptCache = this._register(new Emitter());
        this.onDidChangePromptCache = this._onDidChangePromptCache.event;
        this._userEditingDisposables = this._register(new DisposableStore());
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._model = this._register(new MutableDisposable());
        this._ctxHasActiveRequest = CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST.bindTo(this._contextKeyService);
        this._ctxCellWidgetFocused = CTX_NOTEBOOK_CELL_CHAT_FOCUSED.bindTo(this._contextKeyService);
        this._ctxUserDidEdit = CTX_NOTEBOOK_CHAT_USER_DID_EDIT.bindTo(this._contextKeyService);
        this._ctxOuterFocusPosition = CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.bindTo(this._contextKeyService);
        this._registerFocusTracker();
        NotebookChatController_1._promptHistory = JSON.parse(this._storageService.get(NotebookChatController_1._storageKey, 0 /* StorageScope.PROFILE */, '[]'));
        this._historyUpdate = (prompt) => {
            const idx = NotebookChatController_1._promptHistory.indexOf(prompt);
            if (idx >= 0) {
                NotebookChatController_1._promptHistory.splice(idx, 1);
            }
            NotebookChatController_1._promptHistory.unshift(prompt);
            this._historyOffset = -1;
            this._historyCandidate = '';
            this._storageService.store(NotebookChatController_1._storageKey, JSON.stringify(NotebookChatController_1._promptHistory), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        };
    }
    _registerFocusTracker() {
        this._register(this._notebookEditor.onDidChangeFocus(() => {
            if (!this._widget) {
                this._ctxOuterFocusPosition.set('');
                return;
            }
            const widgetIndex = this._widget.afterModelPosition;
            const focus = this._notebookEditor.getFocus().start;
            if (focus + 1 === widgetIndex) {
                this._ctxOuterFocusPosition.set('above');
            }
            else if (focus === widgetIndex) {
                this._ctxOuterFocusPosition.set('below');
            }
            else {
                this._ctxOuterFocusPosition.set('');
            }
        }));
    }
    run(index, input, autoSend) {
        if (this._widget) {
            if (this._widget.afterModelPosition !== index) {
                const window = getWindow(this._widget.domNode);
                this._disposeWidget();
                scheduleAtNextAnimationFrame(window, () => {
                    this._createWidget(index, input, autoSend, undefined);
                });
            }
            return;
        }
        this._createWidget(index, input, autoSend, undefined);
        // TODO: reveal widget to the center if it's out of the viewport
    }
    restore(editingCell, input) {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const index = this._notebookEditor.textModel.cells.indexOf(editingCell.model);
        if (index < 0) {
            return;
        }
        if (this._widget) {
            if (this._widget.afterModelPosition !== index) {
                this._disposeWidget();
                const window = getWindow(this._widget.domNode);
                scheduleAtNextAnimationFrame(window, () => {
                    this._createWidget(index, input, false, editingCell);
                });
            }
            return;
        }
        this._createWidget(index, input, false, editingCell);
    }
    _disposeWidget() {
        this._widget?.dispose();
        this._widget = undefined;
        this._widgetDisposableStore.clear();
        this._historyOffset = -1;
        this._historyCandidate = '';
    }
    _createWidget(index, input, autoSend, initEditingCell) {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        // Clear the widget if it's already there
        this._widgetDisposableStore.clear();
        const viewZoneContainer = document.createElement('div');
        viewZoneContainer.classList.add('monaco-editor');
        const widgetContainer = document.createElement('div');
        widgetContainer.style.position = 'absolute';
        viewZoneContainer.appendChild(widgetContainer);
        this._focusTracker = this._widgetDisposableStore.add(trackFocus(viewZoneContainer));
        this._widgetDisposableStore.add(this._focusTracker.onDidFocus(() => {
            this._updateNotebookEditorFocusNSelections();
        }));
        const fakeParentEditorElement = document.createElement('div');
        const fakeParentEditor = this._widgetDisposableStore.add(this._instantiationService.createInstance(CodeEditorWidget, fakeParentEditorElement, {}, { isSimpleWidget: true }));
        const inputBoxFragment = `notebook-chat-input-${NotebookChatController_1.counter++}`;
        const notebookUri = this._notebookEditor.textModel.uri;
        const inputUri = notebookUri.with({ scheme: Schemas.untitled, fragment: inputBoxFragment });
        const result = this._modelService.createModel('', null, inputUri, false);
        fakeParentEditor.setModel(result);
        const inlineChatWidget = this._widgetDisposableStore.add(this._instantiationService.createInstance(InlineChatWidget, {
            location: ChatAgentLocation.Notebook,
            resolveData: () => {
                const sessionInputUri = this.getSessionInputUri();
                if (!sessionInputUri) {
                    return undefined;
                }
                return {
                    type: ChatAgentLocation.Notebook,
                    sessionInputUri,
                };
            },
        }, {
            statusMenuId: MENU_CELL_CHAT_WIDGET_STATUS,
            chatWidgetViewOptions: {
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        return (isEqual(uri, this._widget?.parentEditor.getModel()?.uri) ||
                            isEqual(uri, this._notebookEditor.textModel?.uri));
                    },
                },
                menus: {
                    telemetrySource: 'notebook-generate-cell',
                },
            },
        }));
        inlineChatWidget.placeholder = localize('default.placeholder', 'Ask a question');
        inlineChatWidget.updateInfo(localize('welcome.1', 'AI-generated code may be incorrect'));
        widgetContainer.appendChild(inlineChatWidget.domNode);
        this._notebookEditor.changeViewZones((accessor) => {
            const notebookViewZone = {
                afterModelPosition: index,
                heightInPx: 80,
                domNode: viewZoneContainer,
            };
            const id = accessor.addZone(notebookViewZone);
            this._scrollWidgetIntoView(index);
            this._widget = new NotebookChatWidget(this._notebookEditor, id, notebookViewZone, viewZoneContainer, widgetContainer, inlineChatWidget, fakeParentEditor, this._languageService);
            if (initEditingCell) {
                this._widget.restoreEditingCell(initEditingCell);
                this._updateUserEditingState();
            }
            this._ctxCellWidgetFocused.set(true);
            disposableTimeout(() => {
                this._focusWidget();
            }, 0, this._store);
            this._sessionCtor = createCancelablePromise(async (token) => {
                await this._startSession(token);
                assertType(this._model.value);
                const model = this._model.value;
                this._widget?.inlineChatWidget.setChatModel(model);
                if (fakeParentEditor.hasModel()) {
                    if (this._widget) {
                        this._focusWidget();
                    }
                    if (this._widget && input) {
                        this._widget.inlineChatWidget.value = input;
                        if (autoSend) {
                            this.acceptInput();
                        }
                    }
                }
            });
        });
    }
    async _startSession(token) {
        if (!this._model.value) {
            this._model.value = this._chatService.startSession(ChatAgentLocation.Editor, token);
            if (!this._model.value) {
                throw new Error('Failed to start chat session');
            }
        }
        this._strategy = new EditStrategy();
    }
    _scrollWidgetIntoView(index) {
        if (index === 0 || this._notebookEditor.getLength() === 0) {
            // the cell is at the beginning of the notebook
            this._notebookEditor.revealOffsetInCenterIfOutsideViewport(0);
        }
        else {
            // the cell is at the end of the notebook
            const previousCell = this._notebookEditor.cellAt(Math.min(index - 1, this._notebookEditor.getLength() - 1));
            if (previousCell) {
                const cellTop = this._notebookEditor.getAbsoluteTopOfElement(previousCell);
                const cellHeight = this._notebookEditor.getHeightOfElement(previousCell);
                this._notebookEditor.revealOffsetInCenterIfOutsideViewport(cellTop + cellHeight + 48 /** center of the dialog */);
            }
        }
    }
    _focusWidget() {
        if (!this._widget) {
            return;
        }
        this._updateNotebookEditorFocusNSelections();
        this._widget.focus();
    }
    _updateNotebookEditorFocusNSelections() {
        if (!this._widget) {
            return;
        }
        this._widget.updateNotebookEditorFocusNSelections();
    }
    hasSession(chatModel) {
        return this._model.value === chatModel;
    }
    getSessionInputUri() {
        return this._widget?.parentEditor.getModel()?.uri;
    }
    async acceptInput() {
        assertType(this._widget);
        await this._sessionCtor;
        assertType(this._model.value);
        assertType(this._strategy);
        const lastInput = this._widget.inlineChatWidget.value;
        this._historyUpdate(lastInput);
        const editor = this._widget.parentEditor;
        const textModel = editor.getModel();
        if (!editor.hasModel() || !textModel) {
            return;
        }
        if (this._widget.editingCell && this._widget.editingCell.textBuffer.getLength() > 0) {
            // it already contains some text, clear it
            const ref = await this._widget.editingCell.resolveTextModel();
            ref.setValue('');
        }
        const editingCellIndex = this._widget.editingCell
            ? this._notebookEditor.getCellIndex(this._widget.editingCell)
            : undefined;
        if (editingCellIndex !== undefined) {
            this._notebookEditor.setSelections([
                {
                    start: editingCellIndex,
                    end: editingCellIndex + 1,
                },
            ]);
        }
        else {
            // Update selection to the widget index
            this._notebookEditor.setSelections([
                {
                    start: this._widget.afterModelPosition,
                    end: this._widget.afterModelPosition,
                },
            ]);
        }
        this._ctxHasActiveRequest.set(true);
        this._activeRequestCts?.cancel();
        this._activeRequestCts = new CancellationTokenSource();
        const store = new DisposableStore();
        try {
            this._ctxHasActiveRequest.set(true);
            const progressiveEditsQueue = new Queue();
            const progressiveEditsClock = StopWatch.create();
            const progressiveEditsAvgDuration = new MovingAverage();
            const progressiveEditsCts = new CancellationTokenSource(this._activeRequestCts.token);
            const responsePromise = new DeferredPromise();
            const response = await this._widget.inlineChatWidget.chatWidget.acceptInput();
            if (response) {
                let lastLength = 0;
                store.add(response.onDidChange((e) => {
                    if (response.isCanceled) {
                        progressiveEditsCts.cancel();
                        responsePromise.complete();
                        return;
                    }
                    if (response.isComplete) {
                        responsePromise.complete();
                        return;
                    }
                    const edits = response.response.value
                        .map((part) => {
                        if (part.kind === 'textEditGroup'
                        // && isEqual(part.uri, this._session?.textModelN.uri)
                        ) {
                            return part.edits;
                        }
                        else {
                            return [];
                        }
                    })
                        .flat();
                    const newEdits = edits.slice(lastLength);
                    // console.log('NEW edits', newEdits, edits);
                    if (newEdits.length === 0) {
                        return; // NO change
                    }
                    lastLength = edits.length;
                    progressiveEditsAvgDuration.update(progressiveEditsClock.elapsed());
                    progressiveEditsClock.reset();
                    progressiveEditsQueue.queue(async () => {
                        for (const edits of newEdits) {
                            await this._makeChanges(edits, {
                                duration: progressiveEditsAvgDuration.value,
                                token: progressiveEditsCts.token,
                            });
                        }
                    });
                }));
            }
            await responsePromise.p;
            await progressiveEditsQueue.whenIdle();
            this._userEditingDisposables.clear();
            // monitor user edits
            const editingCell = this._widget.getEditingCell();
            if (editingCell) {
                this._userEditingDisposables.add(editingCell.model.onDidChangeContent(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeLanguage(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeMetadata(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeInternalMetadata(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeOutputs(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(this._executionStateService.onDidChangeExecution((e) => {
                    if (e.type === NotebookExecutionType.cell && e.affectsCell(editingCell.uri)) {
                        this._updateUserEditingState();
                    }
                }));
            }
        }
        catch (e) {
        }
        finally {
            store.dispose();
            this._ctxHasActiveRequest.set(false);
            this._widget.inlineChatWidget.updateInfo('');
            this._widget.inlineChatWidget.updateToolbar(true);
        }
    }
    async _makeChanges(edits, opts) {
        assertType(this._strategy);
        assertType(this._widget);
        const editingCell = await this._widget.getOrCreateEditingCell();
        if (!editingCell) {
            return;
        }
        const editor = editingCell.editor;
        const moreMinimalEdits = await this._editorWorkerService.computeMoreMinimalEdits(editor.getModel().uri, edits);
        // this._log('edits from PROVIDER and after making them MORE MINIMAL', this._activeSession.provider.debugName, edits, moreMinimalEdits);
        if (moreMinimalEdits?.length === 0) {
            // nothing left to do
            return;
        }
        const actualEdits = !opts && moreMinimalEdits ? moreMinimalEdits : edits;
        const editOperations = actualEdits.map(TextEdit.asEditOperation);
        try {
            if (opts) {
                await this._strategy.makeProgressiveChanges(editor, editOperations, opts);
            }
            else {
                await this._strategy.makeChanges(editor, editOperations);
            }
        }
        finally {
        }
    }
    _updateUserEditingState() {
        this._ctxUserDidEdit.set(true);
    }
    async acceptSession() {
        assertType(this._model);
        assertType(this._strategy);
        const editor = this._widget?.parentEditor;
        if (!editor?.hasModel()) {
            return;
        }
        const editingCell = this._widget?.getEditingCell();
        if (editingCell && this._notebookEditor.hasModel()) {
            const cellId = NotebookCellTextModelLikeId.str({
                uri: editingCell.uri,
                viewType: this._notebookEditor.textModel.viewType,
            });
            if (this._widget?.inlineChatWidget.value) {
                this._promptCache.set(cellId, this._widget.inlineChatWidget.value);
            }
            this._onDidChangePromptCache.fire({ cell: editingCell.uri });
        }
        try {
            this._model.clear();
        }
        catch (_err) { }
        this.dismiss(false);
    }
    async focusAbove() {
        if (!this._widget) {
            return;
        }
        const index = this._widget.afterModelPosition;
        const prev = index - 1;
        if (prev < 0) {
            return;
        }
        const cell = this._notebookEditor.cellAt(prev);
        if (!cell) {
            return;
        }
        await this._notebookEditor.focusNotebookCell(cell, 'editor');
    }
    async focusNext() {
        if (!this._widget) {
            return;
        }
        const index = this._widget.afterModelPosition;
        const cell = this._notebookEditor.cellAt(index);
        if (!cell) {
            return;
        }
        await this._notebookEditor.focusNotebookCell(cell, 'editor');
    }
    hasFocus() {
        return this._widget?.hasFocus() ?? false;
    }
    focus() {
        this._focusWidget();
    }
    focusNearestWidget(index, direction) {
        switch (direction) {
            case 'above':
                if (this._widget?.afterModelPosition === index) {
                    this._focusWidget();
                }
                break;
            case 'below':
                if (this._widget?.afterModelPosition === index + 1) {
                    this._focusWidget();
                }
                break;
            default:
                break;
        }
    }
    populateHistory(up) {
        if (!this._widget) {
            return;
        }
        const len = NotebookChatController_1._promptHistory.length;
        if (len === 0) {
            return;
        }
        if (this._historyOffset === -1) {
            // remember the current value
            this._historyCandidate = this._widget.inlineChatWidget.value;
        }
        const newIdx = this._historyOffset + (up ? 1 : -1);
        if (newIdx >= len) {
            // reached the end
            return;
        }
        let entry;
        if (newIdx < 0) {
            entry = this._historyCandidate;
            this._historyOffset = -1;
        }
        else {
            entry = NotebookChatController_1._promptHistory[newIdx];
            this._historyOffset = newIdx;
        }
        this._widget.inlineChatWidget.value = entry;
        this._widget.inlineChatWidget.selectAll();
    }
    async cancelCurrentRequest(discard) {
        this._activeRequestCts?.cancel();
    }
    getEditingCell() {
        return this._widget?.getEditingCell();
    }
    discard() {
        this._activeRequestCts?.cancel();
        this._widget?.discardChange();
        this.dismiss(true);
    }
    dismiss(discard) {
        const widget = this._widget;
        const widgetIndex = widget?.afterModelPosition;
        const currentFocus = this._notebookEditor.getFocus();
        const isWidgetFocused = currentFocus.start === widgetIndex && currentFocus.end === widgetIndex;
        if (widget && isWidgetFocused) {
            // change focus only when the widget is focused
            const editingCell = widget.getEditingCell();
            const shouldFocusEditingCell = editingCell && !discard;
            const shouldFocusTopCell = widgetIndex === 0 && this._notebookEditor.getLength() > 0;
            const shouldFocusAboveCell = widgetIndex !== 0 && this._notebookEditor.cellAt(widgetIndex - 1);
            if (shouldFocusEditingCell) {
                this._notebookEditor.focusNotebookCell(editingCell, 'container');
            }
            else if (shouldFocusTopCell) {
                this._notebookEditor.focusNotebookCell(this._notebookEditor.cellAt(0), 'container');
            }
            else if (shouldFocusAboveCell) {
                this._notebookEditor.focusNotebookCell(this._notebookEditor.cellAt(widgetIndex - 1), 'container');
            }
        }
        this._ctxCellWidgetFocused.set(false);
        this._ctxUserDidEdit.set(false);
        this._sessionCtor?.cancel();
        this._sessionCtor = undefined;
        this._model.clear();
        this._widget?.dispose();
        this._widget = undefined;
        this._widgetDisposableStore.clear();
    }
    // check if a cell is generated by prompt by checking prompt cache
    isCellGeneratedByChat(cell) {
        if (!this._notebookEditor.hasModel()) {
            // no model attached yet
            return false;
        }
        const cellId = NotebookCellTextModelLikeId.str({
            uri: cell.uri,
            viewType: this._notebookEditor.textModel.viewType,
        });
        return this._promptCache.has(cellId);
    }
    // get prompt from cache
    getPromptFromCache(cell) {
        if (!this._notebookEditor.hasModel()) {
            // no model attached yet
            return undefined;
        }
        const cellId = NotebookCellTextModelLikeId.str({
            uri: cell.uri,
            viewType: this._notebookEditor.textModel.viewType,
        });
        return this._promptCache.get(cellId);
    }
    dispose() {
        this.dismiss(false);
        super.dispose();
    }
};
NotebookChatController = NotebookChatController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IEditorWorkerService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, INotebookExecutionStateService),
    __param(7, IStorageService),
    __param(8, IChatService)
], NotebookChatController);
export { NotebookChatController };
export class EditStrategy {
    constructor() {
        this._editCount = 0;
    }
    async makeProgressiveChanges(editor, edits, opts) {
        // push undo stop before first edit
        if (++this._editCount === 1) {
            editor.pushUndoStop();
        }
        const durationInSec = opts.duration / 1000;
        for (const edit of edits) {
            const wordCount = countWords(edit.text ?? '');
            const speed = wordCount / durationInSec;
            // console.log({ durationInSec, wordCount, speed: wordCount / durationInSec });
            await performAsyncTextEdit(editor.getModel(), asProgressiveEdit(new WindowIntervalTimer(), edit, speed, opts.token));
        }
    }
    async makeChanges(editor, edits) {
        const cursorStateComputerAndInlineDiffCollection = (undoEdits) => {
            let last = null;
            for (const edit of undoEdits) {
                last =
                    !last || last.isBefore(edit.range.getEndPosition()) ? edit.range.getEndPosition() : last;
                // this._inlineDiffDecorations.collectEditOperation(edit);
            }
            return last && [Selection.fromPositions(last)];
        };
        // push undo stop before first edit
        if (++this._editCount === 1) {
            editor.pushUndoStop();
        }
        editor.executeEdits('inline-chat-live', edits, cursorStateComputerAndInlineDiffCollection);
    }
}
registerNotebookContribution(NotebookChatController.id, NotebookChatController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jaGF0L25vdGVib29rQ2hhdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixTQUFTLEVBRVQsbUJBQW1CLEVBQ25CLFNBQVMsRUFDVCw0QkFBNEIsRUFDNUIsVUFBVSxHQUNWLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUVOLGVBQWUsRUFDZixLQUFLLEVBQ0wsdUJBQXVCLEVBQ3ZCLGlCQUFpQixHQUNqQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUs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