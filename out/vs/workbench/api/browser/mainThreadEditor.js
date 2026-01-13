/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TextEditorCursorStyle, cursorStyleToString, } from '../../../editor/common/config/editorOptions.js';
import { Range } from '../../../editor/common/core/range.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { SnippetController2 } from '../../../editor/contrib/snippet/browser/snippetController2.js';
import { TextEditorRevealType, } from '../common/extHost.protocol.js';
import { equals } from '../../../base/common/arrays.js';
import { EditorState, } from '../../../editor/contrib/editorState/browser/editorState.js';
import { SnippetParser } from '../../../editor/contrib/snippet/browser/snippetParser.js';
export class MainThreadTextEditorProperties {
    static readFromEditor(previousProperties, model, codeEditor) {
        const selections = MainThreadTextEditorProperties._readSelectionsFromCodeEditor(previousProperties, codeEditor);
        const options = MainThreadTextEditorProperties._readOptionsFromCodeEditor(previousProperties, model, codeEditor);
        const visibleRanges = MainThreadTextEditorProperties._readVisibleRangesFromCodeEditor(previousProperties, codeEditor);
        return new MainThreadTextEditorProperties(selections, options, visibleRanges);
    }
    static _readSelectionsFromCodeEditor(previousProperties, codeEditor) {
        let result = null;
        if (codeEditor) {
            result = codeEditor.getSelections();
        }
        if (!result && previousProperties) {
            result = previousProperties.selections;
        }
        if (!result) {
            result = [new Selection(1, 1, 1, 1)];
        }
        return result;
    }
    static _readOptionsFromCodeEditor(previousProperties, model, codeEditor) {
        if (model.isDisposed()) {
            if (previousProperties) {
                // shutdown time
                return previousProperties.options;
            }
            else {
                throw new Error('No valid properties');
            }
        }
        let cursorStyle;
        let lineNumbers;
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbersOpts = options.get(69 /* EditorOption.lineNumbers */);
            cursorStyle = options.get(28 /* EditorOption.cursorStyle */);
            lineNumbers = lineNumbersOpts.renderType;
        }
        else if (previousProperties) {
            cursorStyle = previousProperties.options.cursorStyle;
            lineNumbers = previousProperties.options.lineNumbers;
        }
        else {
            cursorStyle = TextEditorCursorStyle.Line;
            lineNumbers = 1 /* RenderLineNumbersType.On */;
        }
        const modelOptions = model.getOptions();
        return {
            insertSpaces: modelOptions.insertSpaces,
            tabSize: modelOptions.tabSize,
            indentSize: modelOptions.indentSize,
            originalIndentSize: modelOptions.originalIndentSize,
            cursorStyle: cursorStyle,
            lineNumbers: lineNumbers,
        };
    }
    static _readVisibleRangesFromCodeEditor(previousProperties, codeEditor) {
        if (codeEditor) {
            return codeEditor.getVisibleRanges();
        }
        return [];
    }
    constructor(selections, options, visibleRanges) {
        this.selections = selections;
        this.options = options;
        this.visibleRanges = visibleRanges;
    }
    generateDelta(oldProps, selectionChangeSource) {
        const delta = {
            options: null,
            selections: null,
            visibleRanges: null,
        };
        if (!oldProps ||
            !MainThreadTextEditorProperties._selectionsEqual(oldProps.selections, this.selections)) {
            delta.selections = {
                selections: this.selections,
                source: selectionChangeSource ?? undefined,
            };
        }
        if (!oldProps ||
            !MainThreadTextEditorProperties._optionsEqual(oldProps.options, this.options)) {
            delta.options = this.options;
        }
        if (!oldProps ||
            !MainThreadTextEditorProperties._rangesEqual(oldProps.visibleRanges, this.visibleRanges)) {
            delta.visibleRanges = this.visibleRanges;
        }
        if (delta.selections || delta.options || delta.visibleRanges) {
            // something changed
            return delta;
        }
        // nothing changed
        return null;
    }
    static _selectionsEqual(a, b) {
        return equals(a, b, (aValue, bValue) => aValue.equalsSelection(bValue));
    }
    static _rangesEqual(a, b) {
        return equals(a, b, (aValue, bValue) => aValue.equalsRange(bValue));
    }
    static _optionsEqual(a, b) {
        if ((a && !b) || (!a && b)) {
            return false;
        }
        if (!a && !b) {
            return true;
        }
        return (a.tabSize === b.tabSize &&
            a.indentSize === b.indentSize &&
            a.insertSpaces === b.insertSpaces &&
            a.cursorStyle === b.cursorStyle &&
            a.lineNumbers === b.lineNumbers);
    }
}
/**
 * Text Editor that is permanently bound to the same model.
 * It can be bound or not to a CodeEditor.
 */
export class MainThreadTextEditor {
    constructor(id, model, codeEditor, focusTracker, mainThreadDocuments, modelService, clipboardService) {
        this._modelListeners = new DisposableStore();
        this._codeEditorListeners = new DisposableStore();
        this._id = id;
        this._model = model;
        this._codeEditor = null;
        this._properties = null;
        this._focusTracker = focusTracker;
        this._mainThreadDocuments = mainThreadDocuments;
        this._modelService = modelService;
        this._clipboardService = clipboardService;
        this._onPropertiesChanged = new Emitter();
        this._modelListeners.add(this._model.onDidChangeOptions((e) => {
            this._updatePropertiesNow(null);
        }));
        this.setCodeEditor(codeEditor);
        this._updatePropertiesNow(null);
    }
    dispose() {
        this._modelListeners.dispose();
        this._codeEditor = null;
        this._codeEditorListeners.dispose();
    }
    _updatePropertiesNow(selectionChangeSource) {
        this._setProperties(MainThreadTextEditorProperties.readFromEditor(this._properties, this._model, this._codeEditor), selectionChangeSource);
    }
    _setProperties(newProperties, selectionChangeSource) {
        const delta = newProperties.generateDelta(this._properties, selectionChangeSource);
        this._properties = newProperties;
        if (delta) {
            this._onPropertiesChanged.fire(delta);
        }
    }
    getId() {
        return this._id;
    }
    getModel() {
        return this._model;
    }
    getCodeEditor() {
        return this._codeEditor;
    }
    hasCodeEditor(codeEditor) {
        return this._codeEditor === codeEditor;
    }
    setCodeEditor(codeEditor) {
        if (this.hasCodeEditor(codeEditor)) {
            // Nothing to do...
            return;
        }
        this._codeEditorListeners.clear();
        this._codeEditor = codeEditor;
        if (this._codeEditor) {
            // Catch early the case that this code editor gets a different model set and disassociate from this model
            this._codeEditorListeners.add(this._codeEditor.onDidChangeModel(() => {
                this.setCodeEditor(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidFocusEditorWidget(() => {
                this._focusTracker.onGainedFocus();
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidBlurEditorWidget(() => {
                this._focusTracker.onLostFocus();
            }));
            let nextSelectionChangeSource = null;
            this._codeEditorListeners.add(this._mainThreadDocuments.onIsCaughtUpWithContentChanges((uri) => {
                if (uri.toString() === this._model.uri.toString()) {
                    const selectionChangeSource = nextSelectionChangeSource;
                    nextSelectionChangeSource = null;
                    this._updatePropertiesNow(selectionChangeSource);
                }
            }));
            const isValidCodeEditor = () => {
                // Due to event timings, it is possible that there is a model change event not yet delivered to us.
                // > e.g. a model change event is emitted to a listener which then decides to update editor options
                // > In this case the editor configuration change event reaches us first.
                // So simply check that the model is still attached to this code editor
                return this._codeEditor && this._codeEditor.getModel() === this._model;
            };
            const updateProperties = (selectionChangeSource) => {
                // Some editor events get delivered faster than model content changes. This is
                // problematic, as this leads to editor properties reaching the extension host
                // too soon, before the model content change that was the root cause.
                //
                // If this case is identified, then let's update editor properties on the next model
                // content change instead.
                if (this._mainThreadDocuments.isCaughtUpWithContentChanges(this._model.uri)) {
                    nextSelectionChangeSource = null;
                    this._updatePropertiesNow(selectionChangeSource);
                }
                else {
                    // update editor properties on the next model content change
                    nextSelectionChangeSource = selectionChangeSource;
                }
            };
            this._codeEditorListeners.add(this._codeEditor.onDidChangeCursorSelection((e) => {
                // selection
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(e.source);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidChangeConfiguration((e) => {
                // options
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidLayoutChange(() => {
                // visibleRanges
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidScrollChange(() => {
                // visibleRanges
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._updatePropertiesNow(null);
        }
    }
    isVisible() {
        return !!this._codeEditor;
    }
    getProperties() {
        return this._properties;
    }
    get onPropertiesChanged() {
        return this._onPropertiesChanged.event;
    }
    setSelections(selections) {
        if (this._codeEditor) {
            this._codeEditor.setSelections(selections);
            return;
        }
        const newSelections = selections.map(Selection.liftSelection);
        this._setProperties(new MainThreadTextEditorProperties(newSelections, this._properties.options, this._properties.visibleRanges), null);
    }
    _setIndentConfiguration(newConfiguration) {
        const creationOpts = this._modelService.getCreationOptions(this._model.getLanguageId(), this._model.uri, this._model.isForSimpleWidget);
        if (newConfiguration.tabSize === 'auto' || newConfiguration.insertSpaces === 'auto') {
            // one of the options was set to 'auto' => detect indentation
            let insertSpaces = creationOpts.insertSpaces;
            let tabSize = creationOpts.tabSize;
            if (newConfiguration.insertSpaces !== 'auto' &&
                typeof newConfiguration.insertSpaces !== 'undefined') {
                insertSpaces = newConfiguration.insertSpaces;
            }
            if (newConfiguration.tabSize !== 'auto' && typeof newConfiguration.tabSize !== 'undefined') {
                tabSize = newConfiguration.tabSize;
            }
            this._model.detectIndentation(insertSpaces, tabSize);
            return;
        }
        const newOpts = {};
        if (typeof newConfiguration.insertSpaces !== 'undefined') {
            newOpts.insertSpaces = newConfiguration.insertSpaces;
        }
        if (typeof newConfiguration.tabSize !== 'undefined') {
            newOpts.tabSize = newConfiguration.tabSize;
        }
        if (typeof newConfiguration.indentSize !== 'undefined') {
            newOpts.indentSize = newConfiguration.indentSize;
        }
        this._model.updateOptions(newOpts);
    }
    setConfiguration(newConfiguration) {
        this._setIndentConfiguration(newConfiguration);
        if (!this._codeEditor) {
            return;
        }
        if (newConfiguration.cursorStyle) {
            const newCursorStyle = cursorStyleToString(newConfiguration.cursorStyle);
            this._codeEditor.updateOptions({
                cursorStyle: newCursorStyle,
            });
        }
        if (typeof newConfiguration.lineNumbers !== 'undefined') {
            let lineNumbers;
            switch (newConfiguration.lineNumbers) {
                case 1 /* RenderLineNumbersType.On */:
                    lineNumbers = 'on';
                    break;
                case 2 /* RenderLineNumbersType.Relative */:
                    lineNumbers = 'relative';
                    break;
                case 3 /* RenderLineNumbersType.Interval */:
                    lineNumbers = 'interval';
                    break;
                default:
                    lineNumbers = 'off';
            }
            this._codeEditor.updateOptions({
                lineNumbers: lineNumbers,
            });
        }
    }
    setDecorations(key, ranges) {
        if (!this._codeEditor) {
            return;
        }
        this._codeEditor.setDecorationsByType('exthost-api', key, ranges);
    }
    setDecorationsFast(key, _ranges) {
        if (!this._codeEditor) {
            return;
        }
        const ranges = [];
        for (let i = 0, len = Math.floor(_ranges.length / 4); i < len; i++) {
            ranges[i] = new Range(_ranges[4 * i], _ranges[4 * i + 1], _ranges[4 * i + 2], _ranges[4 * i + 3]);
        }
        this._codeEditor.setDecorationsByTypeFast(key, ranges);
    }
    revealRange(range, revealType) {
        if (!this._codeEditor) {
            return;
        }
        switch (revealType) {
            case TextEditorRevealType.Default:
                this._codeEditor.revealRange(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.InCenter:
                this._codeEditor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.InCenterIfOutsideViewport:
                this._codeEditor.revealRangeInCenterIfOutsideViewport(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.AtTop:
                this._codeEditor.revealRangeAtTop(range, 0 /* ScrollType.Smooth */);
                break;
            default:
                console.warn(`Unknown revealType: ${revealType}`);
                break;
        }
    }
    isFocused() {
        if (this._codeEditor) {
            return this._codeEditor.hasTextFocus();
        }
        return false;
    }
    matches(editor) {
        if (!editor) {
            return false;
        }
        return editor.getControl() === this._codeEditor;
    }
    applyEdits(versionIdCheck, edits, opts) {
        if (this._model.getVersionId() !== versionIdCheck) {
            // throw new Error('Model has changed in the meantime!');
            // model changed in the meantime
            return false;
        }
        if (!this._codeEditor) {
            // console.warn('applyEdits on invisible editor');
            return false;
        }
        if (typeof opts.setEndOfLine !== 'undefined') {
            this._model.pushEOL(opts.setEndOfLine);
        }
        const transformedEdits = edits.map((edit) => {
            return {
                range: Range.lift(edit.range),
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers,
            };
        });
        if (opts.undoStopBefore) {
            this._codeEditor.pushUndoStop();
        }
        this._codeEditor.executeEdits('MainThreadTextEditor', transformedEdits);
        if (opts.undoStopAfter) {
            this._codeEditor.pushUndoStop();
        }
        return true;
    }
    async insertSnippet(modelVersionId, template, ranges, opts) {
        if (!this._codeEditor || !this._codeEditor.hasModel()) {
            return false;
        }
        // check if clipboard is required and only iff read it (async)
        let clipboardText;
        const needsTemplate = SnippetParser.guessNeedsClipboard(template);
        if (needsTemplate) {
            const state = new EditorState(this._codeEditor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
            clipboardText = await this._clipboardService.readText();
            if (!state.validate(this._codeEditor)) {
                return false;
            }
        }
        if (this._codeEditor.getModel().getVersionId() !== modelVersionId) {
            return false;
        }
        const snippetController = SnippetController2.get(this._codeEditor);
        if (!snippetController) {
            return false;
        }
        this._codeEditor.focus();
        // make modifications as snippet edit
        const edits = ranges.map((range) => ({ range: Range.lift(range), template }));
        snippetController.apply(edits, {
            overwriteBefore: 0,
            overwriteAfter: 0,
            undoStopBefore: opts.undoStopBefore,
            undoStopAfter: opts.undoStopAfter,
            adjustWhitespace: !opts.keepWhitespace,
            clipboardText,
        });
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLG1CQUFtQixHQUVuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRSxPQUFPLEVBQWMsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFLaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbEcsT0FBTyxFQU1OLG9CQUFvQixHQUNwQixNQUFNLCtCQUErQixDQUFBO0FBRXRDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RCxPQUFPLEVBRU4sV0FBVyxHQUNYLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBU3hGLE1BQU0sT0FBTyw4QkFBOEI7SUFDbkMsTUFBTSxDQUFDLGNBQWMsQ0FDM0Isa0JBQXlELEVBQ3pELEtBQWlCLEVBQ2pCLFVBQThCO1FBRTlCLE1BQU0sVUFBVSxHQUFHLDhCQUE4QixDQUFDLDZCQUE2QixDQUM5RSxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQywwQkFBMEIsQ0FDeEUsa0JBQWtCLEVBQ2xCLEtBQUssRUFDTCxVQUFVLENBQ1YsQ0FBQTtRQUNELE1BQU0sYUFBYSxHQUFHLDhCQUE4QixDQUFDLGdDQUFnQyxDQUNwRixrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQUE7UUFDRCxPQUFPLElBQUksOEJBQThCLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRU8sTUFBTSxDQUFDLDZCQUE2QixDQUMzQyxrQkFBeUQsRUFDekQsVUFBOEI7UUFFOUIsSUFBSSxNQUFNLEdBQXVCLElBQUksQ0FBQTtRQUNyQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUNuQyxNQUFNLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNLENBQUMsMEJBQTBCLENBQ3hDLGtCQUF5RCxFQUN6RCxLQUFpQixFQUNqQixVQUE4QjtRQUU5QixJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsZ0JBQWdCO2dCQUNoQixPQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQTtZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFrQyxDQUFBO1FBQ3RDLElBQUksV0FBa0MsQ0FBQTtRQUN0QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQTtZQUM3RCxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQTBCLENBQUE7WUFDbkQsV0FBVyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUE7UUFDekMsQ0FBQzthQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMvQixXQUFXLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQTtZQUNwRCxXQUFXLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUNyRCxDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUE7WUFDeEMsV0FBVyxtQ0FBMkIsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE9BQU87WUFDTixZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1lBQzdCLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtZQUNuQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFdBQVcsRUFBRSxXQUFXO1NBQ3hCLENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLGdDQUFnQyxDQUM5QyxrQkFBeUQsRUFDekQsVUFBOEI7UUFFOUIsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxZQUNpQixVQUF1QixFQUN2QixPQUF5QyxFQUN6QyxhQUFzQjtRQUZ0QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLFlBQU8sR0FBUCxPQUFPLENBQWtDO1FBQ3pDLGtCQUFhLEdBQWIsYUFBYSxDQUFTO0lBQ3BDLENBQUM7SUFFRyxhQUFhLENBQ25CLFFBQStDLEVBQy9DLHFCQUFvQztRQUVwQyxNQUFNLEtBQUssR0FBZ0M7WUFDMUMsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsSUFBSTtZQUNoQixhQUFhLEVBQUUsSUFBSTtTQUNuQixDQUFBO1FBRUQsSUFDQyxDQUFDLFFBQVE7WUFDVCxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUNyRixDQUFDO1lBQ0YsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDbEIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixNQUFNLEVBQUUscUJBQXFCLElBQUksU0FBUzthQUMxQyxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQ0MsQ0FBQyxRQUFRO1lBQ1QsQ0FBQyw4QkFBOEIsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQzVFLENBQUM7WUFDRixLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQ0MsQ0FBQyxRQUFRO1lBQ1QsQ0FBQyw4QkFBOEIsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQ3ZGLENBQUM7WUFDRixLQUFLLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7UUFDekMsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM5RCxvQkFBb0I7WUFDcEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0Qsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUF1QixFQUFFLENBQXVCO1FBQy9FLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBbUIsRUFBRSxDQUFtQjtRQUNuRSxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFTyxNQUFNLENBQUMsYUFBYSxDQUMzQixDQUFtQyxFQUNuQyxDQUFtQztRQUVuQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sQ0FDTixDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxPQUFPO1lBQ3ZCLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLFVBQVU7WUFDN0IsQ0FBQyxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsWUFBWTtZQUNqQyxDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxXQUFXO1lBQy9CLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxvQkFBb0I7SUFjaEMsWUFDQyxFQUFVLEVBQ1YsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsWUFBMkIsRUFDM0IsbUJBQXdDLEVBQ3hDLFlBQTJCLEVBQzNCLGdCQUFtQztRQWZuQixvQkFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFHdkMseUJBQW9CLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQWM1RCxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQTtRQUMvQyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQTtRQUNqQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUE7UUFFekMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksT0FBTyxFQUErQixDQUFBO1FBRXRFLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxxQkFBb0M7UUFDaEUsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsOEJBQThCLENBQUMsY0FBYyxDQUM1QyxJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxXQUFXLENBQ2hCLEVBQ0QscUJBQXFCLENBQ3JCLENBQUE7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUNyQixhQUE2QyxFQUM3QyxxQkFBb0M7UUFFcEMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUE7UUFDaEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLO1FBQ1gsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFBO0lBQ2hCLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRU0sYUFBYSxDQUFDLFVBQThCO1FBQ2xELE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxVQUFVLENBQUE7SUFDdkMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUE4QjtRQUNsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxtQkFBbUI7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIseUdBQXlHO1lBQ3pHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUN0QyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3pCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDakMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUkseUJBQXlCLEdBQWtCLElBQUksQ0FBQTtZQUNuRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUM1QixJQUFJLENBQUMsb0JBQW9CLENBQUMsOEJBQThCLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDaEUsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztvQkFDbkQsTUFBTSxxQkFBcUIsR0FBRyx5QkFBeUIsQ0FBQTtvQkFDdkQseUJBQXlCLEdBQUcsSUFBSSxDQUFBO29CQUNoQyxJQUFJLENBQUMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtnQkFDOUIsbUdBQW1HO2dCQUNuRyxtR0FBbUc7Z0JBQ25HLHlFQUF5RTtnQkFDekUsdUVBQXVFO2dCQUN2RSxPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFBO1lBQ3ZFLENBQUMsQ0FBQTtZQUVELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxxQkFBb0MsRUFBRSxFQUFFO2dCQUNqRSw4RUFBOEU7Z0JBQzlFLDhFQUE4RTtnQkFDOUUscUVBQXFFO2dCQUNyRSxFQUFFO2dCQUNGLG9GQUFvRjtnQkFDcEYsMEJBQTBCO2dCQUMxQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzdFLHlCQUF5QixHQUFHLElBQUksQ0FBQTtvQkFDaEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2pELENBQUM7cUJBQU0sQ0FBQztvQkFDUCw0REFBNEQ7b0JBQzVELHlCQUF5QixHQUFHLHFCQUFxQixDQUFBO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQyxDQUFBO1lBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNqRCxZQUFZO2dCQUNaLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7b0JBQzFCLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsVUFBVTtnQkFDVixJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO29CQUMxQixPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO2dCQUN2QyxnQkFBZ0I7Z0JBQ2hCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7b0JBQzFCLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3ZDLGdCQUFnQjtnQkFDaEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztvQkFDMUIsT0FBTTtnQkFDUCxDQUFDO2dCQUNELGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUMxQixDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxXQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQVcsbUJBQW1CO1FBQzdCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtJQUN2QyxDQUFDO0lBRU0sYUFBYSxDQUFDLFVBQXdCO1FBQzVDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzFDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsSUFBSSw4QkFBOEIsQ0FDakMsYUFBYSxFQUNiLElBQUksQ0FBQyxXQUFZLENBQUMsT0FBTyxFQUN6QixJQUFJLENBQUMsV0FBWSxDQUFDLGFBQWEsQ0FDL0IsRUFDRCxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxnQkFBZ0Q7UUFDL0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDN0IsQ0FBQTtRQUVELElBQUksZ0JBQWdCLENBQUMsT0FBTyxLQUFLLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxZQUFZLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDckYsNkRBQTZEO1lBQzdELElBQUksWUFBWSxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUE7WUFDNUMsSUFBSSxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtZQUVsQyxJQUNDLGdCQUFnQixDQUFDLFlBQVksS0FBSyxNQUFNO2dCQUN4QyxPQUFPLGdCQUFnQixDQUFDLFlBQVksS0FBSyxXQUFXLEVBQ25ELENBQUM7Z0JBQ0YsWUFBWSxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQTtZQUM3QyxDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLEtBQUssTUFBTSxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUM1RixPQUFPLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFBO1lBQ25DLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE0QixFQUFFLENBQUE7UUFDM0MsSUFBSSxPQUFPLGdCQUFnQixDQUFDLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMxRCxPQUFPLENBQUMsWUFBWSxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsSUFBSSxPQUFPLGdCQUFnQixDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNyRCxPQUFPLENBQUMsT0FBTyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQTtRQUMzQyxDQUFDO1FBQ0QsSUFBSSxPQUFPLGdCQUFnQixDQUFDLFVBQVUsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN4RCxPQUFPLENBQUMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQTtRQUNqRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVNLGdCQUFnQixDQUFDLGdCQUFnRDtRQUN2RSxJQUFJLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxNQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQztnQkFDOUIsV0FBVyxFQUFFLGNBQWM7YUFDM0IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELElBQUksT0FBTyxnQkFBZ0IsQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDekQsSUFBSSxXQUFtRCxDQUFBO1lBQ3ZELFFBQVEsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RDO29CQUNDLFdBQVcsR0FBRyxJQUFJLENBQUE7b0JBQ2xCLE1BQUs7Z0JBQ047b0JBQ0MsV0FBVyxHQUFHLFVBQVUsQ0FBQTtvQkFDeEIsTUFBSztnQkFDTjtvQkFDQyxXQUFXLEdBQUcsVUFBVSxDQUFBO29CQUN4QixNQUFLO2dCQUNOO29CQUNDLFdBQVcsR0FBRyxLQUFLLENBQUE7WUFDckIsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO2dCQUM5QixXQUFXLEVBQUUsV0FBVzthQUN4QixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVNLGNBQWMsQ0FBQyxHQUFXLEVBQUUsTUFBNEI7UUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRU0sa0JBQWtCLENBQUMsR0FBVyxFQUFFLE9BQWlCO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBWSxFQUFFLENBQUE7UUFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUNwQixPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNkLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNsQixPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDbEIsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ2xCLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVNLFdBQVcsQ0FBQyxLQUFhLEVBQUUsVUFBZ0M7UUFDakUsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUNELFFBQVEsVUFBVSxFQUFFLENBQUM7WUFDcEIsS0FBSyxvQkFBb0IsQ0FBQyxPQUFPO2dCQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLDRCQUFvQixDQUFBO2dCQUN0RCxNQUFLO1lBQ04sS0FBSyxvQkFBb0IsQ0FBQyxRQUFRO2dCQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEtBQUssNEJBQW9CLENBQUE7Z0JBQzlELE1BQUs7WUFDTixLQUFLLG9CQUFvQixDQUFDLHlCQUF5QjtnQkFDbEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLDRCQUFvQixDQUFBO2dCQUMvRSxNQUFLO1lBQ04sS0FBSyxvQkFBb0IsQ0FBQyxLQUFLO2dCQUM5QixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLEtBQUssNEJBQW9CLENBQUE7Z0JBQzNELE1BQUs7WUFDTjtnQkFDQyxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixVQUFVLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFLO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFTSxTQUFTO1FBQ2YsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSxPQUFPLENBQUMsTUFBbUI7UUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sVUFBVSxDQUNoQixjQUFzQixFQUN0QixLQUE2QixFQUM3QixJQUF3QjtRQUV4QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDbkQseURBQXlEO1lBQ3pELGdDQUFnQztZQUNoQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLGtEQUFrRDtZQUNsRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBd0IsRUFBRTtZQUNqRSxPQUFPO2dCQUNOLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQzdCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2FBQ3ZDLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDdkUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FDbEIsY0FBc0IsRUFDdEIsUUFBZ0IsRUFDaEIsTUFBeUIsRUFDekIsSUFBcUI7UUFFckIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDdkQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsOERBQThEO1FBQzlELElBQUksYUFBaUMsQ0FBQTtRQUNyQyxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FDNUIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsd0VBQXdELENBQ3hELENBQUE7WUFDRCxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsWUFBWSxFQUFFLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDbkUsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2xFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFeEIscUNBQXFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFtQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdGLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDOUIsZUFBZSxFQUFFLENBQUM7WUFDbEIsY0FBYyxFQUFFLENBQUM7WUFDakIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjO1lBQ3RDLGFBQWE7U0FDYixDQUFDLENBQUE7UUFFRixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCJ9