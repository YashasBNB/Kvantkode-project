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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNlbGxWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9iYXNlQ2VsbFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFHVixpQkFBaUIsRUFDakIsT0FBTyxHQUNQLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBSzFELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBT3BGLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsbUJBQW1CLEdBQ25CLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLGFBQWEsRUFDYixhQUFhLEVBRWIsZ0JBQWdCLEVBQ2hCLG9CQUFvQixHQUdwQixNQUFNLHVCQUF1QixDQUFBO0FBWTlCLE1BQU0sT0FBZ0IsaUJBQWtCLFNBQVEsVUFBVTtJQVV6RCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFBO0lBQ3RCLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFDRCxJQUFJ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