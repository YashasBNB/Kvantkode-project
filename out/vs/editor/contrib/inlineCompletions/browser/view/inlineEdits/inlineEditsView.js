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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLFdBQVcsRUFDWCxnQkFBZ0IsRUFJaEIsd0JBQXdCLEVBQ3hCLGVBQWUsR0FDZixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXhHLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBZ0IsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRSxPQUFPLEVBRU4saUNBQWlDLEVBQ2pDLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQ0FBMEMsQ0FB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