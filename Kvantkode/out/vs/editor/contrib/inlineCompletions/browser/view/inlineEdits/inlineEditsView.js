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
var InlineEditsView_1;
import { equalsIfDefined, itemEquals } from '../../../../../../base/common/equals.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, derivedOpts, derivedWithStore, mapObservableArrayCached, observableValue, } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor, } from '../../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Range } from '../../../../../common/core/range.js';
import { SingleTextEdit, StringText } from '../../../../../common/core/textEdit.js';
import { TextLength } from '../../../../../common/core/textLength.js';
import { lineRangeMappingFromRangeMappings, RangeMapping, } from '../../../../../common/diff/rangeMapping.js';
import { TextModel } from '../../../../../common/model/textModel.js';
import { InlineEditsGutterIndicator } from './components/gutterIndicatorView.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditsCollapsedView } from './inlineEditsViews/inlineEditsCollapsedView.js';
import { InlineEditsDeletionView } from './inlineEditsViews/inlineEditsDeletionView.js';
import { InlineEditsInsertionView } from './inlineEditsViews/inlineEditsInsertionView.js';
import { InlineEditsLineReplacementView } from './inlineEditsViews/inlineEditsLineReplacementView.js';
import { InlineEditsSideBySideView } from './inlineEditsViews/inlineEditsSideBySideView.js';
import { InlineEditsWordReplacementView } from './inlineEditsViews/inlineEditsWordReplacementView.js';
import { OriginalEditorInlineDiffView, } from './inlineEditsViews/originalEditorInlineDiffView.js';
import { applyEditToModifiedRangeMappings, createReindentEdit } from './utils/utils.js';
import './view.css';
let InlineEditsView = InlineEditsView_1 = class InlineEditsView extends Disposable {
    constructor(_editor, _host, _model, _ghostTextIndicator, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._host = _host;
        this._model = _model;
        this._ghostTextIndicator = _ghostTextIndicator;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._editorObs = observableCodeEditor(this._editor);
        this._tabAction = derived((reader) => this._model.read(reader)?.tabAction.read(reader) ?? InlineEditTabAction.Inactive);
        this._constructorDone = observableValue(this, false);
        this._uiState = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model || !this._constructorDone.read(reader)) {
                return undefined;
            }
            model.handleInlineEditShown();
            const inlineEdit = model.inlineEdit;
            let mappings = RangeMapping.fromEdit(inlineEdit.edit);
            let newText = inlineEdit.edit.apply(inlineEdit.originalText);
            let diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            const originalDisplayRange = inlineEdit.originalText.lineRange.intersect(inlineEdit.originalLineRange.join(LineRange.ofLength(inlineEdit.originalLineRange.startLineNumber, inlineEdit.lineEdit.newLines.length)));
            let state = this.determineRenderState(model, reader, diff, new StringText(newText), originalDisplayRange);
            if (!state) {
                model.abort(`unable to determine view: tried to render ${this._previousView?.view}`);
                return undefined;
            }
            if (state.kind === 'sideBySide') {
                const indentationAdjustmentEdit = createReindentEdit(newText, inlineEdit.modifiedLineRange);
                newText = indentationAdjustmentEdit.applyToString(newText);
                mappings = applyEditToModifiedRangeMappings(mappings, indentationAdjustmentEdit);
                diff = lineRangeMappingFromRangeMappings(mappings, inlineEdit.originalText, new StringText(newText));
            }
            this._previewTextModel.setLanguage(this._editor.getModel().getLanguageId());
            const previousNewText = this._previewTextModel.getValue();
            if (previousNewText !== newText) {
                // Only update the model if the text has changed to avoid flickering
                this._previewTextModel.setValue(newText);
            }
            if (model.showCollapsed.read(reader) &&
                !this._indicator.read(reader)?.isHoverVisible.read(reader)) {
                state = { kind: 'collapsed' };
            }
            return {
                state,
                diff,
                edit: inlineEdit,
                newText,
                newTextLineCount: inlineEdit.modifiedLineRange.length,
                originalDisplayRange: originalDisplayRange,
            };
        });
        this._previewTextModel = this._register(this._instantiationService.createInstance(TextModel, '', this._editor.getModel().getLanguageId(), {
            ...TextModel.DEFAULT_CREATION_OPTIONS,
            bracketPairColorizationOptions: {
                enabled: true,
                independentColorPoolPerBracketType: false,
            },
        }, null));
        this._indicatorCyclicDependencyCircuitBreaker = observableValue(this, false);
        this._indicator = derivedWithStore(this, (reader, store) => {
            if (!this._indicatorCyclicDependencyCircuitBreaker.read(reader)) {
                return undefined;
            }
            const indicatorDisplayRange = derivedOpts({ owner: this, equalsFn: equalsIfDefined(itemEquals()) }, (reader) => {
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.lineRange;
                }
                const state = this._uiState.read(reader);
                if (state?.state?.kind === 'insertionMultiLine') {
                    return this._insertion.originalLines.read(reader);
                }
                return state?.originalDisplayRange;
            });
            const modelWithGhostTextSupport = derived(this, (reader) => {
                const model = this._model.read(reader);
                if (model) {
                    return model;
                }
                const ghostTextIndicator = this._ghostTextIndicator.read(reader);
                if (ghostTextIndicator) {
                    return ghostTextIndicator.model;
                }
                return model;
            });
            return store.add(this._instantiationService.createInstance(InlineEditsGutterIndicator, this._editorObs, indicatorDisplayRange, this._gutterIndicatorOffset, this._host, modelWithGhostTextSupport, this._inlineEditsIsHovered, this._focusIsInMenu));
        });
        this._inlineEditsIsHovered = derived(this, (reader) => {
            return (this._sideBySide.isHovered.read(reader) ||
                this._wordReplacementViews.read(reader).some((v) => v.isHovered.read(reader)) ||
                this._deletion.isHovered.read(reader) ||
                this._inlineDiffView.isHovered.read(reader) ||
                this._lineReplacementView.isHovered.read(reader) ||
                this._insertion.isHovered.read(reader));
        });
        this._gutterIndicatorOffset = derived(this, (reader) => {
            // TODO: have a better way to tell the gutter indicator view where the edit is inside a viewzone
            if (this._uiState.read(reader)?.state?.kind === 'insertionMultiLine') {
                return this._insertion.startLineOffset.read(reader);
            }
            return 0;
        });
        this._sideBySide = this._register(this._instantiationService.createInstance(InlineEditsSideBySideView, this._editor, this._model.map((m) => m?.inlineEdit), this._previewTextModel, this._uiState.map((s) => s && s.state?.kind === 'sideBySide'
            ? {
                newTextLineCount: s.newTextLineCount,
                originalDisplayRange: s.originalDisplayRange,
            }
            : undefined), this._tabAction));
        this._deletion = this._register(this._instantiationService.createInstance(InlineEditsDeletionView, this._editor, this._model.map((m) => m?.inlineEdit), this._uiState.map((s) => s && s.state?.kind === 'deletion'
            ? {
                originalRange: s.state.originalRange,
                deletions: s.state.deletions,
            }
            : undefined), this._tabAction));
        this._insertion = this._register(this._instantiationService.createInstance(InlineEditsInsertionView, this._editor, this._uiState.map((s) => s && s.state?.kind === 'insertionMultiLine'
            ? {
                lineNumber: s.state.lineNumber,
                startColumn: s.state.column,
                text: s.state.text,
            }
            : undefined), this._tabAction));
        this._inlineDiffViewState = derived(this, (reader) => {
            const e = this._uiState.read(reader);
            if (!e || !e.state) {
                return undefined;
            }
            if (e.state.kind === 'wordReplacements' ||
                e.state.kind === 'lineReplacement' ||
                e.state.kind === 'insertionMultiLine' ||
                e.state.kind === 'collapsed') {
                return undefined;
            }
            return {
                modifiedText: new StringText(e.newText),
                diff: e.diff,
                mode: e.state.kind,
                modifiedCodeEditor: this._sideBySide.previewEditor,
            };
        });
        this._inlineCollapsedView = this._register(this._instantiationService.createInstance(InlineEditsCollapsedView, this._editor, this._model.map((m, reader) => this._uiState.read(reader)?.state?.kind === 'collapsed' ? m?.inlineEdit : undefined)));
        this._inlineDiffView = this._register(new OriginalEditorInlineDiffView(this._editor, this._inlineDiffViewState, this._previewTextModel));
        this._wordReplacementViews = mapObservableArrayCached(this, this._uiState.map((s) => (s?.state?.kind === 'wordReplacements' ? s.state.replacements : [])), (e, store) => {
            return store.add(this._instantiationService.createInstance(InlineEditsWordReplacementView, this._editorObs, e, this._tabAction));
        });
        this._lineReplacementView = this._register(this._instantiationService.createInstance(InlineEditsLineReplacementView, this._editorObs, this._uiState.map((s) => s?.state?.kind === 'lineReplacement'
            ? {
                originalRange: s.state.originalRange,
                modifiedRange: s.state.modifiedRange,
                modifiedLines: s.state.modifiedLines,
                replacements: s.state.replacements,
            }
            : undefined), this._tabAction));
        this._useCodeShifting = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((s) => s.edits.allowCodeShifting);
        this._renderSideBySide = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((s) => s.edits.renderSideBySide);
        this._useMultiLineGhostText = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((s) => s.edits.useMultiLineGhostText);
        this._register(autorunWithStore((reader, store) => {
            const model = this._model.read(reader);
            if (!model) {
                return;
            }
            store.add(Event.any(this._sideBySide.onDidClick, this._deletion.onDidClick, this._lineReplacementView.onDidClick, this._insertion.onDidClick, ...this._wordReplacementViews.read(reader).map((w) => w.onDidClick), this._inlineDiffView.onDidClick)((e) => {
                if (this._viewHasBeenShownLongerThan(350)) {
                    e.preventDefault();
                    model.accept();
                }
            }));
        }));
        this._indicator.recomputeInitiallyAndOnChange(this._store);
        this._wordReplacementViews.recomputeInitiallyAndOnChange(this._store);
        this._indicatorCyclicDependencyCircuitBreaker.set(true, undefined);
        this._constructorDone.set(true, undefined); // TODO: remove and use correct initialization order
    }
    getCacheId(model) {
        const inlineEdit = model.inlineEdit;
        if (this._host.get()?.inPartialAcceptFlow.get()) {
            return `${inlineEdit.inlineCompletion.id}_${inlineEdit.edit.edits.map((innerEdit) => innerEdit.range.toString() + innerEdit.text).join(',')}`;
        }
        return inlineEdit.inlineCompletion.id;
    }
    determineView(model, reader, diff, newText, originalDisplayRange) {
        // Check if we can use the previous view if it is the same InlineCompletion as previously shown
        const inlineEdit = model.inlineEdit;
        const canUseCache = this._previousView?.id === this.getCacheId(model);
        const reconsiderViewEditorWidthChange = this._previousView?.editorWidth !== this._editorObs.layoutInfoWidth.read(reader) &&
            (this._previousView?.view === 'sideBySide' || this._previousView?.view === 'lineReplacement');
        if (canUseCache && !reconsiderViewEditorWidthChange) {
            return this._previousView.view;
        }
        // Determine the view based on the edit / diff
        const inner = diff.flatMap((d) => d.innerChanges ?? []);
        const isSingleInnerEdit = inner.length === 1;
        if (isSingleInnerEdit &&
            this._useCodeShifting.read(reader) !== 'never' &&
            isSingleLineInsertionAfterPosition(diff, inlineEdit.cursorPosition)) {
            return 'insertionInline';
        }
        const innerValues = inner.map((m) => ({
            original: inlineEdit.originalText.getValueOfRange(m.originalRange),
            modified: newText.getValueOfRange(m.modifiedRange),
        }));
        if (innerValues.every(({ original, modified }) => modified.trim() === '' &&
            original.length > 0 &&
            (original.length > modified.length || original.trim() !== ''))) {
            return 'deletion';
        }
        if (isSingleMultiLineInsertion(diff) &&
            this._useMultiLineGhostText.read(reader) &&
            this._useCodeShifting.read(reader) === 'always') {
            return 'insertionMultiLine';
        }
        const numOriginalLines = inlineEdit.originalLineRange.length;
        const numModifiedLines = inlineEdit.modifiedLineRange.length;
        const allInnerChangesNotTooLong = inner.every((m) => TextLength.ofRange(m.originalRange).columnCount <
            InlineEditsWordReplacementView.MAX_LENGTH &&
            TextLength.ofRange(m.modifiedRange).columnCount < InlineEditsWordReplacementView.MAX_LENGTH);
        if (allInnerChangesNotTooLong &&
            isSingleInnerEdit &&
            numOriginalLines === 1 &&
            numModifiedLines === 1) {
            // Make sure there is no insertion, even if we grow them
            if (!inner.some((m) => m.originalRange.isEmpty()) ||
                !growEditsUntilWhitespace(inner.map((m) => new SingleTextEdit(m.originalRange, '')), inlineEdit.originalText).some((e) => e.range.isEmpty() &&
                    TextLength.ofRange(e.range).columnCount < InlineEditsWordReplacementView.MAX_LENGTH)) {
                return 'wordReplacements';
            }
        }
        if (numOriginalLines > 0 && numModifiedLines > 0) {
            if (this._renderSideBySide.read(reader) !== 'never' &&
                InlineEditsSideBySideView.fitsInsideViewport(this._editor, this._previewTextModel, inlineEdit, originalDisplayRange, reader)) {
                return 'sideBySide';
            }
            return 'lineReplacement';
        }
        return 'sideBySide';
    }
    determineRenderState(model, reader, diff, newText, originalDisplayRange) {
        const inlineEdit = model.inlineEdit;
        const view = this.determineView(model, reader, diff, newText, originalDisplayRange);
        this._previousView = {
            id: this.getCacheId(model),
            view,
            editorWidth: this._editor.getLayoutInfo().width,
            timestamp: Date.now(),
        };
        switch (view) {
            case 'insertionInline':
                return { kind: 'insertionInline' };
            case 'sideBySide':
                return { kind: 'sideBySide' };
            case 'collapsed':
                return { kind: 'collapsed' };
        }
        const inner = diff.flatMap((d) => d.innerChanges ?? []);
        if (view === 'deletion') {
            return {
                kind: 'deletion',
                originalRange: inlineEdit.originalLineRange,
                deletions: inner.map((m) => m.originalRange),
            };
        }
        if (view === 'insertionMultiLine') {
            const change = inner[0];
            return {
                kind: 'insertionMultiLine',
                lineNumber: change.originalRange.startLineNumber,
                column: change.originalRange.startColumn,
                text: newText.getValueOfRange(change.modifiedRange),
            };
        }
        const replacements = inner.map((m) => new SingleTextEdit(m.originalRange, newText.getValueOfRange(m.modifiedRange)));
        if (replacements.length === 0) {
            return undefined;
        }
        if (view === 'wordReplacements') {
            let grownEdits = growEditsToEntireWord(replacements, inlineEdit.originalText);
            if (grownEdits.some((e) => e.range.isEmpty())) {
                grownEdits = growEditsUntilWhitespace(replacements, inlineEdit.originalText);
            }
            return {
                kind: 'wordReplacements',
                replacements: grownEdits,
            };
        }
        if (view === 'lineReplacement') {
            return {
                kind: 'lineReplacement',
                originalRange: inlineEdit.originalLineRange,
                modifiedRange: inlineEdit.modifiedLineRange,
                modifiedLines: inlineEdit.modifiedLineRange.mapToLineArray((line) => newText.getLineAt(line)),
                replacements: inner.map((m) => ({
                    originalRange: m.originalRange,
                    modifiedRange: m.modifiedRange,
                })),
            };
        }
        return undefined;
    }
    _viewHasBeenShownLongerThan(durationMs) {
        const viewCreationTime = this._previousView?.timestamp;
        if (!viewCreationTime) {
            throw new BugIndicatingError('viewHasBeenShownLongThan called before a view has been shown');
        }
        const currentTime = Date.now();
        return currentTime - viewCreationTime >= durationMs;
    }
};
InlineEditsView = InlineEditsView_1 = __decorate([
    __param(5, IInstantiationService)
], InlineEditsView);
export { InlineEditsView };
function isSingleLineInsertionAfterPosition(diff, position) {
    if (!position) {
        return false;
    }
    const pos = position;
    return diff.every((m) => m.innerChanges.every((r) => isStableWordInsertion(r)));
    function isStableWordInsertion(r) {
        if (!r.originalRange.isEmpty()) {
            return false;
        }
        const isInsertionWithinLine = r.modifiedRange.startLineNumber === r.modifiedRange.endLineNumber;
        if (!isInsertionWithinLine) {
            return false;
        }
        const insertPosition = r.originalRange.getStartPosition();
        if (pos.isBeforeOrEqual(insertPosition)) {
            return true;
        }
        if (insertPosition.lineNumber < pos.lineNumber) {
            return true;
        }
        return false;
    }
}
function isSingleMultiLineInsertion(diff) {
    const inner = diff.flatMap((d) => d.innerChanges ?? []);
    if (inner.length !== 1) {
        return false;
    }
    const change = inner[0];
    if (!change.originalRange.isEmpty()) {
        return false;
    }
    if (change.modifiedRange.startLineNumber === change.modifiedRange.endLineNumber) {
        return false;
    }
    return true;
}
function growEditsToEntireWord(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => /^[a-zA-Z]$/.test(char));
}
function growEditsUntilWhitespace(replacements, originalText) {
    return _growEdits(replacements, originalText, (char) => !/^\s$/.test(char));
}
function _growEdits(replacements, originalText, fn) {
    const result = [];
    replacements.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
    for (const edit of replacements) {
        let startIndex = edit.range.startColumn - 1;
        let endIndex = edit.range.endColumn - 2;
        let prefix = '';
        let suffix = '';
        const startLineContent = originalText.getLineAt(edit.range.startLineNumber);
        const endLineContent = originalText.getLineAt(edit.range.endLineNumber);
        if (isIncluded(startLineContent[startIndex])) {
            // grow to the left
            while (isIncluded(startLineContent[startIndex - 1])) {
                prefix = startLineContent[startIndex - 1] + prefix;
                startIndex--;
            }
        }
        if (isIncluded(endLineContent[endIndex]) || endIndex < startIndex) {
            // grow to the right
            while (isIncluded(endLineContent[endIndex + 1])) {
                suffix += endLineContent[endIndex + 1];
                endIndex++;
            }
        }
        // create new edit and merge together if they are touching
        let newEdit = new SingleTextEdit(new Range(edit.range.startLineNumber, startIndex + 1, edit.range.endLineNumber, endIndex + 2), prefix + edit.text + suffix);
        if (result.length > 0 &&
            Range.areIntersectingOrTouching(result[result.length - 1].range, newEdit.range)) {
            newEdit = SingleTextEdit.joinEdits([result.pop(), newEdit], originalText);
        }
        result.push(newEdit);
    }
    function isIncluded(c) {
        if (c === undefined) {
            return false;
        }
        return fn(c);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsV0FBVyxFQUNYLGdCQUFnQixFQUloQix3QkFBd0IsRUFDeEIsZUFBZSxHQUNmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFnQixjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JFLE9BQU8sRUFFTixpQ0FBaUMsRUFDakMsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNB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