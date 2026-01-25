/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable, dispose, } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { readTransientState, writeTransientState, } from '../../../codeEditor/browser/toggleWordWrap.js';
import { CellEditState, CellFocusMode, CursorAtBoundary, CursorAtLineBoundary, } from '../notebookBrowser.js';
export class BaseCellViewModel extends Disposable {
    get handle() {
        return this.model.handle;
    }
    get uri() {
        return this.model.uri;
    }
    get lineCount() {
        return this.model.textBuffer.getLineCount();
    }
    get metadata() {
        return this.model.metadata;
    }
    get internalMetadata() {
        return this.model.internalMetadata;
    }
    get language() {
        return this.model.language;
    }
    get mime() {
        if (typeof this.model.mime === 'string') {
            return this.model.mime;
        }
        switch (this.language) {
            case 'markdown':
                return Mimes.markdown;
            default:
                return Mimes.text;
        }
    }
    get lineNumbers() {
        return this._lineNumbers;
    }
    set lineNumbers(lineNumbers) {
        if (lineNumbers === this._lineNumbers) {
            return;
        }
        this._lineNumbers = lineNumbers;
        this._onDidChangeState.fire({ cellLineNumberChanged: true });
    }
    get commentOptions() {
        return this._commentOptions;
    }
    set commentOptions(newOptions) {
        this._commentOptions = newOptions;
    }
    get focusMode() {
        return this._focusMode;
    }
    set focusMode(newMode) {
        if (this._focusMode !== newMode) {
            this._focusMode = newMode;
            this._onDidChangeState.fire({ focusModeChanged: true });
        }
    }
    get editorAttached() {
        return !!this._textEditor;
    }
    get textModel() {
        return this.model.textModel;
    }
    hasModel() {
        return !!this.textModel;
    }
    get dragging() {
        return this._dragging;
    }
    set dragging(v) {
        this._dragging = v;
        this._onDidChangeState.fire({ dragStateChanged: true });
    }
    get isInputCollapsed() {
        return this._inputCollapsed;
    }
    set isInputCollapsed(v) {
        this._inputCollapsed = v;
        this._onDidChangeState.fire({ inputCollapsedChanged: true });
    }
    get isOutputCollapsed() {
        return this._outputCollapsed;
    }
    set isOutputCollapsed(v) {
        this._outputCollapsed = v;
        this._onDidChangeState.fire({ outputCollapsedChanged: true });
    }
    set commentHeight(height) {
        if (this._commentHeight === height) {
            return;
        }
        this._commentHeight = height;
        this.layoutChange({ commentHeight: true }, 'BaseCellViewModel#commentHeight');
    }
    constructor(viewType, model, id, _viewContext, _configurationService, _modelService, _undoRedoService, _codeEditorService, _inlineChatSessionService) {
        super();
        this.viewType = viewType;
        this.model = model;
        this.id = id;
        this._viewContext = _viewContext;
        this._configurationService = _configurationService;
        this._modelService = _modelService;
        this._undoRedoService = _undoRedoService;
        this._codeEditorService = _codeEditorService;
        this._inlineChatSessionService = _inlineChatSessionService;
        this._onDidChangeEditorAttachState = this._register(new Emitter());
        // Do not merge this event with `onDidChangeState` as we are using `Event.once(onDidChangeEditorAttachState)` elsewhere.
        this.onDidChangeEditorAttachState = this._onDidChangeEditorAttachState.event;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this._editState = CellEditState.Preview;
        this._lineNumbers = 'inherit';
        this._focusMode = CellFocusMode.Container;
        this._editorListeners = [];
        this._editorViewStates = null;
        this._editorTransientState = null;
        this._resolvedCellDecorations = new Map();
        this._textModelRefChangeDisposable = this._register(new MutableDisposable());
        this._cellDecorationsChanged = this._register(new Emitter());
        this.onCellDecorationsChanged = this._cellDecorationsChanged.event;
        this._resolvedDecorations = new Map();
        this._lastDecorationId = 0;
        this._cellStatusBarItems = new Map();
        this._onDidChangeCellStatusBarItems = this._register(new Emitter());
        this.onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event;
        this._lastStatusBarId = 0;
        this._dragging = false;
        this._inputCollapsed = false;
        this._outputCollapsed = false;
        this._commentHeight = 0;
        this._isDisposed = false;
        this._isReadonly = false;
        this._editStateSource = '';
        this._register(model.onDidChangeMetadata(() => {
            this._onDidChangeState.fire({ metadataChanged: true });
        }));
        this._register(model.onDidChangeInternalMetadata((e) => {
            this._onDidChangeState.fire({ internalMetadataChanged: true });
            if (e.lastRunSuccessChanged) {
                // Statusbar visibility may change
                this.layoutChange({});
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('notebook.lineNumbers')) {
                this.lineNumbers = 'inherit';
            }
        }));
        if (this.model.collapseState?.inputCollapsed) {
            this._inputCollapsed = true;
        }
        if (this.model.collapseState?.outputCollapsed) {
            this._outputCollapsed = true;
        }
        this._commentOptions = this._configurationService.getValue('editor.comments', { overrideIdentifier: this.language });
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.comments')) {
                this._commentOptions = this._configurationService.getValue('editor.comments', { overrideIdentifier: this.language });
            }
        }));
    }
    updateOptions(e) {
        if (this._textEditor && typeof e.readonly === 'boolean') {
            this._textEditor.updateOptions({ readOnly: e.readonly });
        }
        if (typeof e.readonly === 'boolean') {
            this._isReadonly = e.readonly;
        }
    }
    assertTextModelAttached() {
        if (this.textModel && this._textEditor && this._textEditor.getModel() === this.textModel) {
            return true;
        }
        return false;
    }
    // private handleKeyDown(e: IKeyboardEvent) {
    // 	if (this.viewType === IPYNB_VIEW_TYPE && isWindows && e.ctrlKey && e.keyCode === KeyCode.Enter) {
    // 		this._keymapService.promptKeymapRecommendation();
    // 	}
    // }
    attachTextEditor(editor, estimatedHasHorizontalScrolling) {
        if (!editor.hasModel()) {
            throw new Error('Invalid editor: model is missing');
        }
        if (this._textEditor === editor) {
            if (this._editorListeners.length === 0) {
                this._editorListeners.push(this._textEditor.onDidChangeCursorSelection(() => {
                    this._onDidChangeState.fire({ selectionChanged: true });
                }));
                // this._editorListeners.push(this._textEditor.onKeyDown(e => this.handleKeyDown(e)));
                this._onDidChangeState.fire({ selectionChanged: true });
            }
            return;
        }
        this._textEditor = editor;
        if (this._isReadonly) {
            editor.updateOptions({ readOnly: this._isReadonly });
        }
        if (this._editorViewStates) {
            this._restoreViewState(this._editorViewStates);
        }
        else {
            // If no real editor view state was persisted, restore a default state.
            // This forces the editor to measure its content width immediately.
            if (estimatedHasHorizontalScrolling) {
                this._restoreViewState({
                    contributionsState: {},
                    cursorState: [],
                    viewState: {
                        scrollLeft: 0,
                        firstPosition: { lineNumber: 1, column: 1 },
                        firstPositionDeltaTop: this._viewContext.notebookOptions.getLayoutConfiguration().editorTopPadding,
                    },
                });
            }
        }
        if (this._editorTransientState) {
            writeTransientState(editor.getModel(), this._editorTransientState, this._codeEditorService);
        }
        if (this._isDisposed) {
            // Restore View State could adjust the editor layout and trigger a list view update. The list view update might then dispose this view model.
            return;
        }
        editor.changeDecorations((accessor) => {
            this._resolvedDecorations.forEach((value, key) => {
                if (key.startsWith('_lazy_')) {
                    // lazy ones
                    const ret = accessor.addDecoration(value.options.range, value.options.options);
                    this._resolvedDecorations.get(key).id = ret;
                }
                else {
                    const ret = accessor.addDecoration(value.options.range, value.options.options);
                    this._resolvedDecorations.get(key).id = ret;
                }
            });
        });
        this._editorListeners.push(editor.onDidChangeCursorSelection(() => {
            this._onDidChangeState.fire({ selectionChanged: true });
        }));
        this._editorListeners.push(this._inlineChatSessionService.onWillStartSession((e) => {
            if (e === this._textEditor && this.textBuffer.getLength() === 0) {
                this.enableAutoLanguageDetection();
            }
        }));
        this._onDidChangeState.fire({ selectionChanged: true });
        this._onDidChangeEditorAttachState.fire();
    }
    detachTextEditor() {
        this.saveViewState();
        this.saveTransientState();
        // decorations need to be cleared first as editors can be resued.
        this._textEditor?.changeDecorations((accessor) => {
            this._resolvedDecorations.forEach((value) => {
                const resolvedid = value.id;
                if (resolvedid) {
                    accessor.removeDecoration(resolvedid);
                }
            });
        });
        this._textEditor = undefined;
        dispose(this._editorListeners);
        this._editorListeners = [];
        this._onDidChangeEditorAttachState.fire();
        if (this._textModelRef) {
            this._textModelRef.dispose();
            this._textModelRef = undefined;
        }
        this._textModelRefChangeDisposable.clear();
    }
    getText() {
        return this.model.getValue();
    }
    getAlternativeId() {
        return this.model.alternativeId;
    }
    getTextLength() {
        return this.model.getTextLength();
    }
    enableAutoLanguageDetection() {
        this.model.enableAutoLanguageDetection();
    }
    saveViewState() {
        if (!this._textEditor) {
            return;
        }
        this._editorViewStates = this._textEditor.saveViewState();
    }
    saveTransientState() {
        if (!this._textEditor || !this._textEditor.hasModel()) {
            return;
        }
        this._editorTransientState = readTransientState(this._textEditor.getModel(), this._codeEditorService);
    }
    saveEditorViewState() {
        if (this._textEditor) {
            this._editorViewStates = this._textEditor.saveViewState();
        }
        return this._editorViewStates;
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        this._editorViewStates = editorViewStates;
    }
    _restoreViewState(state) {
        if (state) {
            this._textEditor?.restoreViewState(state);
        }
    }
    addModelDecoration(decoration) {
        if (!this._textEditor) {
            const id = ++this._lastDecorationId;
            const decorationId = `_lazy_${this.id};${id}`;
            this._resolvedDecorations.set(decorationId, { options: decoration });
            return decorationId;
        }
        let id;
        this._textEditor.changeDecorations((accessor) => {
            id = accessor.addDecoration(decoration.range, decoration.options);
            this._resolvedDecorations.set(id, { id, options: decoration });
        });
        return id;
    }
    removeModelDecoration(decorationId) {
        const realDecorationId = this._resolvedDecorations.get(decorationId);
        if (this._textEditor && realDecorationId && realDecorationId.id !== undefined) {
            this._textEditor.changeDecorations((accessor) => {
                accessor.removeDecoration(realDecorationId.id);
            });
        }
        // lastly, remove all the cache
        this._resolvedDecorations.delete(decorationId);
    }
    deltaModelDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach((id) => {
            this.removeModelDecoration(id);
        });
        const ret = newDecorations.map((option) => {
            return this.addModelDecoration(option);
        });
        return ret;
    }
    _removeCellDecoration(decorationId) {
        const options = this._resolvedCellDecorations.get(decorationId);
        this._resolvedCellDecorations.delete(decorationId);
        if (options) {
            for (const existingOptions of this._resolvedCellDecorations.values()) {
                // don't remove decorations that are applied from other entries
                if (options.className === existingOptions.className) {
                    options.className = undefined;
                }
                if (options.outputClassName === existingOptions.outputClassName) {
                    options.outputClassName = undefined;
                }
                if (options.gutterClassName === existingOptions.gutterClassName) {
                    options.gutterClassName = undefined;
                }
                if (options.topClassName === existingOptions.topClassName) {
                    options.topClassName = undefined;
                }
            }
            this._cellDecorationsChanged.fire({ added: [], removed: [options] });
        }
    }
    _addCellDecoration(options) {
        const id = ++this._lastDecorationId;
        const decorationId = `_cell_${this.id};${id}`;
        this._resolvedCellDecorations.set(decorationId, options);
        this._cellDecorationsChanged.fire({ added: [options], removed: [] });
        return decorationId;
    }
    getCellDecorations() {
        return [...this._resolvedCellDecorations.values()];
    }
    getCellDecorationRange(decorationId) {
        if (this._textEditor) {
            // (this._textEditor as CodeEditorWidget).decora
            return this._textEditor.getModel()?.getDecorationRange(decorationId) ?? null;
        }
        return null;
    }
    deltaCellDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach((id) => {
            this._removeCellDecoration(id);
        });
        const ret = newDecorations.map((option) => {
            return this._addCellDecoration(option);
        });
        return ret;
    }
    deltaCellStatusBarItems(oldItems, newItems) {
        oldItems.forEach((id) => {
            const item = this._cellStatusBarItems.get(id);
            if (item) {
                this._cellStatusBarItems.delete(id);
            }
        });
        const newIds = newItems.map((item) => {
            const id = ++this._lastStatusBarId;
            const itemId = `_cell_${this.id};${id}`;
            this._cellStatusBarItems.set(itemId, item);
            return itemId;
        });
        this._onDidChangeCellStatusBarItems.fire();
        return newIds;
    }
    getCellStatusBarItems() {
        return Array.from(this._cellStatusBarItems.values());
    }
    revealRangeInCenter(range) {
        this._textEditor?.revealRangeInCenter(range, 1 /* editorCommon.ScrollType.Immediate */);
    }
    setSelection(range) {
        this._textEditor?.setSelection(range);
    }
    setSelections(selections) {
        if (selections.length) {
            if (this._textEditor) {
                this._textEditor?.setSelections(selections);
            }
            else if (this._editorViewStates) {
                this._editorViewStates.cursorState = selections.map((selection) => {
                    return {
                        inSelectionMode: !selection.isEmpty(),
                        selectionStart: selection.getStartPosition(),
                        position: selection.getEndPosition(),
                    };
                });
            }
        }
    }
    getSelections() {
        return (this._textEditor?.getSelections() ??
            this._editorViewStates?.cursorState.map((state) => new Selection(state.selectionStart.lineNumber, state.selectionStart.column, state.position.lineNumber, state.position.column)) ??
            []);
    }
    getSelectionsStartPosition() {
        if (this._textEditor) {
            const selections = this._textEditor.getSelections();
            return selections?.map((s) => s.getStartPosition());
        }
        else {
            const selections = this._editorViewStates?.cursorState;
            return selections?.map((s) => s.selectionStart);
        }
    }
    getLineScrollTopOffset(line) {
        if (!this._textEditor) {
            return 0;
        }
        const editorPadding = this._viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        return this._textEditor.getTopForLineNumber(line) + editorPadding.top;
    }
    getPositionScrollTopOffset(range) {
        if (!this._textEditor) {
            return 0;
        }
        const position = range instanceof Selection ? range.getPosition() : range.getStartPosition();
        const editorPadding = this._viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        return (this._textEditor.getTopForPosition(position.lineNumber, position.column) + editorPadding.top);
    }
    cursorAtLineBoundary() {
        if (!this._textEditor || !this.textModel || !this._textEditor.hasTextFocus()) {
            return CursorAtLineBoundary.None;
        }
        const selection = this._textEditor.getSelection();
        if (!selection || !selection.isEmpty()) {
            return CursorAtLineBoundary.None;
        }
        const currentLineLength = this.textModel.getLineLength(selection.startLineNumber);
        if (currentLineLength === 0) {
            return CursorAtLineBoundary.Both;
        }
        switch (selection.startColumn) {
            case 1:
                return CursorAtLineBoundary.Start;
            case currentLineLength + 1:
                return CursorAtLineBoundary.End;
            default:
                return CursorAtLineBoundary.None;
        }
    }
    cursorAtBoundary() {
        if (!this._textEditor) {
            return CursorAtBoundary.None;
        }
        if (!this.textModel) {
            return CursorAtBoundary.None;
        }
        // only validate primary cursor
        const selection = this._textEditor.getSelection();
        // only validate empty cursor
        if (!selection || !selection.isEmpty()) {
            return CursorAtBoundary.None;
        }
        const firstViewLineTop = this._textEditor.getTopForPosition(1, 1);
        const lastViewLineTop = this._textEditor.getTopForPosition(this.textModel.getLineCount(), this.textModel.getLineLength(this.textModel.getLineCount()));
        const selectionTop = this._textEditor.getTopForPosition(selection.startLineNumber, selection.startColumn);
        if (selectionTop === lastViewLineTop) {
            if (selectionTop === firstViewLineTop) {
                return CursorAtBoundary.Both;
            }
            else {
                return CursorAtBoundary.Bottom;
            }
        }
        else {
            if (selectionTop === firstViewLineTop) {
                return CursorAtBoundary.Top;
            }
            else {
                return CursorAtBoundary.None;
            }
        }
    }
    get editStateSource() {
        return this._editStateSource;
    }
    updateEditState(newState, source) {
        this._editStateSource = source;
        if (newState === this._editState) {
            return;
        }
        this._editState = newState;
        this._onDidChangeState.fire({ editStateChanged: true });
        if (this._editState === CellEditState.Preview) {
            this.focusMode = CellFocusMode.Container;
        }
    }
    getEditState() {
        return this._editState;
    }
    get textBuffer() {
        return this.model.textBuffer;
    }
    /**
     * Text model is used for editing.
     */
    async resolveTextModel() {
        if (!this._textModelRef || !this.textModel) {
            this._textModelRef = await this._modelService.createModelReference(this.uri);
            if (this._isDisposed) {
                return this.textModel;
            }
            if (!this._textModelRef) {
                throw new Error(`Cannot resolve text model for ${this.uri}`);
            }
            this._textModelRefChangeDisposable.value = this.textModel.onDidChangeContent(() => this.onDidChangeTextModelContent());
        }
        return this.textModel;
    }
    cellStartFind(value, options) {
        let cellMatches = [];
        const lineCount = this.textBuffer.getLineCount();
        const findRange = options.findScope?.selectedTextRanges ?? [
            new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1),
        ];
        if (this.assertTextModelAttached()) {
            cellMatches = this.textModel.findMatches(value, findRange, options.regex || false, options.caseSensitive || false, options.wholeWord ? options.wordSeparators || null : null, options.regex || false);
        }
        else {
            const searchParams = new SearchParams(value, options.regex || false, options.caseSensitive || false, options.wholeWord ? options.wordSeparators || null : null);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return null;
            }
            findRange.forEach((range) => {
                cellMatches.push(...this.textBuffer.findMatchesLineByLine(new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn), searchData, options.regex || false, 1000));
            });
        }
        return cellMatches;
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
        dispose(this._editorListeners);
        // Only remove the undo redo stack if we map this cell uri to itself
        // If we are not in perCell mode, it will map to the full NotebookDocument and
        // we don't want to remove that entire document undo / redo stack when a cell is deleted
        if (this._undoRedoService.getUriComparisonKey(this.uri) === this.uri.toString()) {
            this._undoRedoService.removeElements(this.uri);
        }
        this._textModelRef?.dispose();
    }
    toJSON() {
        return {
            handle: this.handle,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNlbGxWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2Jhc2VDZWxsVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUdWLGlCQUFpQixFQUNqQixPQUFPLEdBQ1AsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFLMUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUcxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFPcEYsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixtQkFBbUIsR0FDbkIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sYUFBYSxFQUNiLGFBQWEsRUFFYixnQkFBZ0IsRUFDaEIsb0JBQW9CLEdBR3BCLE1BQU0sdUJBQXVCLENBQUE7QUFZOUIsTUFBTSxPQUFnQixpQkFBa0IsU0FBUSxVQUFVO0lBVXpELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7SUFDdEIsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDNUMsQ0FBQztJQUNE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