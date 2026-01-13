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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NoYXQvbm90ZWJvb2tDaGF0Q29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFNBQVMsRUFFVCxtQkFBbUIsRUFDbkIsU0FBUyxFQUNULDRCQUE0QixFQUM1QixVQUFVLEdBQ1YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBRU4sZUFBZSxFQUNmLEtBQUssRUFDTCx1QkFBdUIsRUFDdkIsaUJBQWlCLEdBQ2pCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFz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