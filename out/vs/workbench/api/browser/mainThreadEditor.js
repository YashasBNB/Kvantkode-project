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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFbkUsT0FBTyxFQUVOLHFCQUFxQixFQUNyQixtQkFBbUIsR0FFbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEUsT0FBTyxFQUFjLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBS2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2xHLE9BQU8sRUFNTixvQkFBb0IsR0FDcEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkQsT0FBTyxFQUVOLFdBQVcsR0FDWCxNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQVN4RixNQUFNLE9BQU8sOEJBQThCO0lBQ25DLE1BQU0sQ0FBQyxjQUFjLENBQzNCLGtCQUF5RCxFQUN6RCxLQUFpQixFQUNqQixVQUE4QjtRQUU5QixNQUFNLFVBQVUsR0FBRyw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FDOUUsa0JBQWtCLEVBQ2xCLFVBQVUsQ0FDVixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsOEJBQThCLENBQUMsMEJBQTBCLENBQ3hFLGtCQUFrQixFQUNsQixLQUFLLEVBQ0wsVUFBVSxDQUNWLENBQUE7UUFDRCxNQUFNLGFB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