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
import { mapFindFirst } from '../../../../../base/common/arraysFind.js';
import { itemsEquals } from '../../../../../base/common/equals.js';
import { BugIndicatingError, onUnexpectedError, onUnexpectedExternalError, } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedHandleChanges, derivedOpts, observableSignal, observableValue, recomputeInitiallyAndOnChange, subtransaction, transaction, } from '../../../../../base/common/observable.js';
import { commonPrefixLength, firstNonWhitespaceIndex } from '../../../../../base/common/strings.js';
import { isDefined } from '../../../../../base/common/types.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { CursorColumns } from '../../../../common/core/cursorColumns.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { SingleTextEdit, TextEdit } from '../../../../common/core/textEdit.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { InlineCompletionTriggerKind, } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { addPositions, getEndPositionsAfterApplying, getModifiedRangesAfterApplying, substringPos, subtractPositions, } from '../utils.js';
import { AnimatedValue, easeOutCubic, ObservableAnimatedValue } from './animation.js';
import { computeGhostText } from './computeGhostText.js';
import { GhostText, ghostTextOrReplacementEquals, ghostTextsOrReplacementsEqual, } from './ghostText.js';
import { InlineCompletionsSource, } from './inlineCompletionsSource.js';
import { InlineEdit } from './inlineEdit.js';
import { singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
let InlineCompletionsModel = class InlineCompletionsModel extends Disposable {
    get isAcceptingPartially() {
        return this._isAcceptingPartially;
    }
    constructor(textModel, _selectedSuggestItem, _textModelVersionId, _positions, _debounceValue, _enabled, _editor, _instantiationService, _commandService, _languageConfigurationService, _accessibilityService) {
        super();
        this.textModel = textModel;
        this._selectedSuggestItem = _selectedSuggestItem;
        this._textModelVersionId = _textModelVersionId;
        this._positions = _positions;
        this._debounceValue = _debounceValue;
        this._enabled = _enabled;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._languageConfigurationService = _languageConfigurationService;
        this._accessibilityService = _accessibilityService;
        this._source = this._register(this._instantiationService.createInstance(InlineCompletionsSource, this.textModel, this._textModelVersionId, this._debounceValue));
        this._isActive = observableValue(this, false);
        this._onlyRequestInlineEditsSignal = observableSignal(this);
        this._forceUpdateExplicitlySignal = observableSignal(this);
        this._noDelaySignal = observableSignal(this);
        // We use a semantic id to keep the same inline completion selected even if the provider reorders the completions.
        this._selectedInlineCompletionId = observableValue(this, undefined);
        this.primaryPosition = derived(this, (reader) => this._positions.read(reader)[0] ?? new Position(1, 1));
        this._isAcceptingPartially = false;
        this._onDidAccept = new Emitter();
        this.onDidAccept = this._onDidAccept.event;
        this._editorObs = observableCodeEditor(this._editor);
        this._suggestPreviewEnabled = this._editorObs
            .getOption(123 /* EditorOption.suggest */)
            .map((v) => v.preview);
        this._suggestPreviewMode = this._editorObs
            .getOption(123 /* EditorOption.suggest */)
            .map((v) => v.previewMode);
        this._inlineSuggestMode = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((v) => v.mode);
        this._inlineEditsEnabled = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((v) => !!v.edits.enabled);
        this._inlineEditsShowCollapsedEnabled = this._editorObs
            .getOption(64 /* EditorOption.inlineSuggest */)
            .map((s) => s.edits.showCollapsed);
        this._lastShownInlineCompletionInfo = undefined;
        this._lastAcceptedInlineCompletionInfo = undefined;
        this._didUndoInlineEdits = derivedHandleChanges({
            owner: this,
            createEmptyChangeSummary: () => ({ didUndo: false }),
            handleChange: (ctx, changeSummary) => {
                changeSummary.didUndo = ctx.didChange(this._textModelVersionId) && !!ctx.change?.isUndoing;
                return true;
            },
        }, (reader, changeSummary) => {
            const versionId = this._textModelVersionId.read(reader);
            if (versionId !== null &&
                this._lastAcceptedInlineCompletionInfo &&
                this._lastAcceptedInlineCompletionInfo.textModelVersionIdAfter === versionId - 1 &&
                this._lastAcceptedInlineCompletionInfo.inlineCompletion.isInlineEdit &&
                changeSummary.didUndo) {
                this._lastAcceptedInlineCompletionInfo = undefined;
                return true;
            }
            return false;
        });
        this._preserveCurrentCompletionReasons = new Set([
            VersionIdChangeReason.Redo,
            VersionIdChangeReason.Undo,
            VersionIdChangeReason.AcceptWord,
        ]);
        this.dontRefetchSignal = observableSignal(this);
        this._fetchInlineCompletionsPromise = derivedHandleChanges({
            owner: this,
            createEmptyChangeSummary: () => ({
                dontRefetch: false,
                preserveCurrentCompletion: false,
                inlineCompletionTriggerKind: InlineCompletionTriggerKind.Automatic,
                onlyRequestInlineEdits: false,
                shouldDebounce: true,
            }),
            handleChange: (ctx, changeSummary) => {
                /** @description fetch inline completions */
                if (ctx.didChange(this._textModelVersionId) &&
                    this._preserveCurrentCompletionReasons.has(this._getReason(ctx.change))) {
                    changeSummary.preserveCurrentCompletion = true;
                }
                else if (ctx.didChange(this._forceUpdateExplicitlySignal)) {
                    changeSummary.inlineCompletionTriggerKind = InlineCompletionTriggerKind.Explicit;
                }
                else if (ctx.didChange(this.dontRefetchSignal)) {
                    changeSummary.dontRefetch = true;
                }
                else if (ctx.didChange(this._onlyRequestInlineEditsSignal)) {
                    changeSummary.onlyRequestInlineEdits = true;
                }
                else if (ctx.didChange(this._noDelaySignal)) {
                    changeSummary.shouldDebounce = false;
                }
                return true;
            },
        }, (reader, changeSummary) => {
            this._source.clearOperationOnTextModelChange.read(reader); // Make sure the clear operation runs before the fetch operation
            this._noDelaySignal.read(reader);
            this.dontRefetchSignal.read(reader);
            this._onlyRequestInlineEditsSignal.read(reader);
            this._forceUpdateExplicitlySignal.read(reader);
            const shouldUpdate = (this._enabled.read(reader) && this._selectedSuggestItem.read(reader)) ||
                this._isActive.read(reader);
            if (!shouldUpdate) {
                this._source.cancelUpdate();
                return undefined;
            }
            this._textModelVersionId.read(reader); // Refetch on text change
            const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.get();
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestWidgetInlineCompletions && !suggestItem) {
                const inlineCompletions = this._source.inlineCompletions.get();
                transaction((tx) => {
                    /** @description Seed inline completions with (newer) suggest widget inline completions */
                    if (!inlineCompletions ||
                        suggestWidgetInlineCompletions.request.versionId > inlineCompletions.request.versionId) {
                        this._source.inlineCompletions.set(suggestWidgetInlineCompletions.clone(), tx);
                    }
                    this._source.clearSuggestWidgetInlineCompletions(tx);
                });
            }
            const cursorPosition = this.primaryPosition.get();
            if (changeSummary.dontRefetch) {
                return Promise.resolve(true);
            }
            if (this._didUndoInlineEdits.read(reader)) {
                transaction((tx) => {
                    this._source.clear(tx);
                });
                return undefined;
            }
            let context = {
                triggerKind: changeSummary.inlineCompletionTriggerKind,
                selectedSuggestionInfo: suggestItem?.toSelectedSuggestionInfo(),
                includeInlineCompletions: !changeSummary.onlyRequestInlineEdits,
                includeInlineEdits: this._inlineEditsEnabled.read(reader),
            };
            if (context.triggerKind === InlineCompletionTriggerKind.Automatic) {
                if (this.textModel.getAlternativeVersionId() ===
                    this._lastShownInlineCompletionInfo?.alternateTextModelVersionId) {
                    // When undoing back to a version where an inline edit/completion was shown,
                    // we want to show an inline edit (or completion) again if it was originally an inline edit (or completion).
                    context = {
                        ...context,
                        includeInlineCompletions: !this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                        includeInlineEdits: this._lastShownInlineCompletionInfo.inlineCompletion.isInlineEdit,
                    };
                }
            }
            const itemToPreserveCandidate = this.selectedInlineCompletion.get() ?? this._inlineCompletionItems.get()?.inlineEdit;
            const itemToPreserve = changeSummary.preserveCurrentCompletion || itemToPreserveCandidate?.forwardStable
                ? itemToPreserveCandidate
                : undefined;
            const userJumpedToActiveCompletion = this._jumpedToId.map((jumpedTo) => !!jumpedTo && jumpedTo === this._inlineCompletionItems.get()?.inlineEdit?.semanticId);
            return this._source.fetch(cursorPosition, context, itemToPreserve, changeSummary.shouldDebounce, userJumpedToActiveCompletion);
        });
        this._inlineCompletionItems = derivedOpts({ owner: this }, (reader) => {
            const c = this._source.inlineCompletions.read(reader);
            if (!c) {
                return undefined;
            }
            const cursorPosition = this.primaryPosition.read(reader);
            let inlineEdit = undefined;
            const visibleCompletions = [];
            for (const completion of c.inlineCompletions) {
                if (!completion.sourceInlineCompletion.isInlineEdit) {
                    if (completion.isVisible(this.textModel, cursorPosition, reader)) {
                        visibleCompletions.push(completion);
                    }
                }
                else {
                    inlineEdit = completion;
                }
            }
            if (visibleCompletions.length !== 0) {
                // Don't show the inline edit if there is a visible completion
                inlineEdit = undefined;
            }
            return {
                inlineCompletions: visibleCompletions,
                inlineEdit,
            };
        });
        this._filteredInlineCompletionItems = derivedOpts({ owner: this, equalsFn: itemsEquals() }, (reader) => {
            const c = this._inlineCompletionItems.read(reader);
            return c?.inlineCompletions ?? [];
        });
        this.selectedInlineCompletionIndex = derived(this, (reader) => {
            const selectedInlineCompletionId = this._selectedInlineCompletionId.read(reader);
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this._selectedInlineCompletionId === undefined
                ? -1
                : filteredCompletions.findIndex((v) => v.semanticId === selectedInlineCompletionId);
            if (idx === -1) {
                // Reset the selection so that the selection does not jump back when it appears again
                this._selectedInlineCompletionId.set(undefined, undefined);
                return 0;
            }
            return idx;
        });
        this.selectedInlineCompletion = derived(this, (reader) => {
            const filteredCompletions = this._filteredInlineCompletionItems.read(reader);
            const idx = this.selectedInlineCompletionIndex.read(reader);
            return filteredCompletions[idx];
        });
        this.activeCommands = derivedOpts({ owner: this, equalsFn: itemsEquals() }, (r) => this.selectedInlineCompletion.read(r)?.source.inlineCompletions.commands ?? []);
        this.lastTriggerKind = this._source.inlineCompletions.map(this, (v) => v?.request.context.triggerKind);
        this.inlineCompletionsCount = derived(this, (reader) => {
            if (this.lastTriggerKind.read(reader) === InlineCompletionTriggerKind.Explicit) {
                return this._filteredInlineCompletionItems.read(reader).length;
            }
            else {
                return undefined;
            }
        });
        this._hasVisiblePeekWidgets = derived(this, (reader) => this._editorObs.openedPeekWidgets.read(reader) > 0);
        this.state = derivedOpts({
            owner: this,
            equalsFn: (a, b) => {
                if (!a || !b) {
                    return a === b;
                }
                if (a.kind === 'ghostText' && b.kind === 'ghostText') {
                    return (ghostTextsOrReplacementsEqual(a.ghostTexts, b.ghostTexts) &&
                        a.inlineCompletion === b.inlineCompletion &&
                        a.suggestItem === b.suggestItem);
                }
                else if (a.kind === 'inlineEdit' && b.kind === 'inlineEdit') {
                    return a.inlineEdit.equals(b.inlineEdit) && a.cursorAtInlineEdit === b.cursorAtInlineEdit;
                }
                return false;
            },
        }, (reader) => {
            const model = this.textModel;
            const item = this._inlineCompletionItems.read(reader);
            const inlineEditResult = item?.inlineEdit;
            if (inlineEditResult) {
                if (this._hasVisiblePeekWidgets.read(reader)) {
                    return undefined;
                }
                let edit = inlineEditResult.toSingleTextEdit(reader);
                edit = singleTextRemoveCommonPrefix(edit, model);
                const cursorPos = this.primaryPosition.read(reader);
                const cursorAtInlineEdit = LineRange.fromRangeInclusive(edit.range)
                    .addMargin(1, 1)
                    .contains(cursorPos.lineNumber);
                const cursorInsideShowRange = cursorAtInlineEdit ||
                    (inlineEditResult.inlineCompletion.cursorShowRange?.containsPosition(cursorPos) ?? true);
                if (!cursorInsideShowRange && !this._inAcceptFlow.read(reader)) {
                    return undefined;
                }
                const commands = inlineEditResult.inlineCompletion.source.inlineCompletions.commands;
                const inlineEdit = new InlineEdit(edit, commands ?? [], inlineEditResult.inlineCompletion);
                const edits = inlineEditResult.updatedEdit.read(reader);
                const e = edits
                    ? TextEdit.fromOffsetEdit(edits, new TextModelText(this.textModel)).edits
                    : [edit];
                return {
                    kind: 'inlineEdit',
                    inlineEdit,
                    inlineCompletion: inlineEditResult,
                    edits: e,
                    cursorAtInlineEdit,
                };
            }
            const suggestItem = this._selectedSuggestItem.read(reader);
            if (suggestItem) {
                const suggestCompletionEdit = singleTextRemoveCommonPrefix(suggestItem.toSingleTextEdit(), model);
                const augmentation = this._computeAugmentation(suggestCompletionEdit, reader);
                const isSuggestionPreviewEnabled = this._suggestPreviewEnabled.read(reader);
                if (!isSuggestionPreviewEnabled && !augmentation) {
                    return undefined;
                }
                const fullEdit = augmentation?.edit ?? suggestCompletionEdit;
                const fullEditPreviewLength = augmentation
                    ? augmentation.edit.text.length - suggestCompletionEdit.text.length
                    : 0;
                const mode = this._suggestPreviewMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [fullEdit, ...getSecondaryEdits(this.textModel, positions, fullEdit)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], fullEditPreviewLength))
                    .filter(isDefined);
                const primaryGhostText = ghostTexts[0] ?? new GhostText(fullEdit.range.endLineNumber, []);
                return {
                    kind: 'ghostText',
                    edits,
                    primaryGhostText,
                    ghostTexts,
                    inlineCompletion: augmentation?.completion,
                    suggestItem,
                };
            }
            else {
                if (!this._isActive.read(reader)) {
                    return undefined;
                }
                const inlineCompletion = this.selectedInlineCompletion.read(reader);
                if (!inlineCompletion) {
                    return undefined;
                }
                const replacement = inlineCompletion.toSingleTextEdit(reader);
                const mode = this._inlineSuggestMode.read(reader);
                const positions = this._positions.read(reader);
                const edits = [replacement, ...getSecondaryEdits(this.textModel, positions, replacement)];
                const ghostTexts = edits
                    .map((edit, idx) => computeGhostText(edit, model, mode, positions[idx], 0))
                    .filter(isDefined);
                if (!ghostTexts[0]) {
                    return undefined;
                }
                return {
                    kind: 'ghostText',
                    edits,
                    primaryGhostText: ghostTexts[0],
                    ghostTexts,
                    inlineCompletion,
                    suggestItem: undefined,
                };
            }
        });
        this.status = derived(this, (reader) => {
            if (this._source.loading.read(reader)) {
                return 'loading';
            }
            const s = this.state.read(reader);
            if (s?.kind === 'ghostText') {
                return 'ghostText';
            }
            if (s?.kind === 'inlineEdit') {
                return 'inlineEdit';
            }
            return 'noSuggestion';
        });
        this.inlineCompletionState = derived(this, (reader) => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'ghostText') {
                return undefined;
            }
            if (this._editorObs.inComposition.read(reader)) {
                return undefined;
            }
            return s;
        });
        this.inlineEditState = derived(this, (reader) => {
            const s = this.state.read(reader);
            if (!s || s.kind !== 'inlineEdit') {
                return undefined;
            }
            return s;
        });
        this.inlineEditAvailable = derived(this, (reader) => {
            const s = this.inlineEditState.read(reader);
            return !!s;
        });
        this.warning = derived(this, (reader) => {
            return this.inlineCompletionState.read(reader)?.inlineCompletion?.sourceInlineCompletion.warning;
        });
        this.ghostTexts = derivedOpts({ owner: this, equalsFn: ghostTextsOrReplacementsEqual }, (reader) => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v.ghostTexts;
        });
        this.primaryGhostText = derivedOpts({ owner: this, equalsFn: ghostTextOrReplacementEquals }, (reader) => {
            const v = this.inlineCompletionState.read(reader);
            if (!v) {
                return undefined;
            }
            return v?.primaryGhostText;
        });
        this.showCollapsed = derived(this, (reader) => {
            const state = this.state.read(reader);
            if (!state || state.kind !== 'inlineEdit') {
                return false;
            }
            const isCurrentModelVersion = state.inlineCompletion.updatedEditModelVersion === this._textModelVersionId.read(reader);
            return ((this._inlineEditsShowCollapsedEnabled.read(reader) || !isCurrentModelVersion) &&
                this._jumpedToId.read(reader) !== state.inlineCompletion.semanticId &&
                !this._inAcceptFlow.read(reader));
        });
        this._tabShouldIndent = derived(this, (reader) => {
            if (this._inAcceptFlow.read(reader)) {
                return false;
            }
            function isMultiLine(range) {
                return range.startLineNumber !== range.endLineNumber;
            }
            function getNonIndentationRange(model, lineNumber) {
                const columnStart = model.getLineIndentColumn(lineNumber);
                const lastNonWsColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
                const columnEnd = Math.max(lastNonWsColumn, columnStart);
                return new Range(lineNumber, columnStart, lineNumber, columnEnd);
            }
            const selections = this._editorObs.selections.read(reader);
            return selections?.some((s) => {
                if (s.isEmpty()) {
                    return this.textModel.getLineLength(s.startLineNumber) === 0;
                }
                else {
                    return (isMultiLine(s) ||
                        s.containsRange(getNonIndentationRange(this.textModel, s.startLineNumber)));
                }
            });
        });
        this.tabShouldJumpToInlineEdit = derived(this, (reader) => {
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return true;
            }
            return !s.cursorAtInlineEdit;
        });
        this.tabShouldAcceptInlineEdit = derived(this, (reader) => {
            const s = this.inlineEditState.read(reader);
            if (!s) {
                return false;
            }
            if (this.showCollapsed.read(reader)) {
                return false;
            }
            if (s.inlineEdit.range.startLineNumber === this._editorObs.cursorLineNumber.read(reader)) {
                return true;
            }
            if (this._jumpedToId.read(reader) === s.inlineCompletion.semanticId) {
                return true;
            }
            if (this._tabShouldIndent.read(reader)) {
                return false;
            }
            return s.cursorAtInlineEdit;
        });
        // TODO: clean this up if we keep it
        this._inAcceptPartialFlow = observableValue(this, false);
        this.inPartialAcceptFlow = this._inAcceptPartialFlow;
        this._jumpedToId = observableValue(this, undefined);
        this._inAcceptFlow = observableValue(this, false);
        this.inAcceptFlow = this._inAcceptFlow;
        this._register(recomputeInitiallyAndOnChange(this._fetchInlineCompletionsPromise));
        let lastItem = undefined;
        this._register(autorun((reader) => {
            /** @description call handleItemDidShow */
            const item = this.inlineCompletionState.read(reader);
            const completion = item?.inlineCompletion;
            if (completion?.semanticId !== lastItem?.semanticId) {
                lastItem = completion;
                if (completion) {
                    const i = completion.inlineCompletion;
                    const src = i.source;
                    src.provider.handleItemDidShow?.(src.inlineCompletions, i.sourceInlineCompletion, i.insertText);
                }
            }
        }));
        this._register(autorun((reader) => {
            /** @description handle text edits collapsing */
            const inlineCompletions = this._source.inlineCompletions.read(reader);
            if (!inlineCompletions) {
                return;
            }
            for (const inlineCompletion of inlineCompletions.inlineCompletions) {
                if (inlineCompletion.updatedEdit.read(reader) === undefined) {
                    this.stop();
                    break;
                }
            }
        }));
        this._register(autorun((reader) => {
            this._editorObs.versionId.read(reader);
            this._inAcceptFlow.set(false, undefined);
        }));
        this._register(autorun((reader) => {
            const jumpToReset = this.state
                .map((s) => !s || (s.kind === 'inlineEdit' && !s.cursorAtInlineEdit))
                .read(reader);
            if (jumpToReset) {
                this._jumpedToId.set(undefined, undefined);
            }
        }));
        const inlineEditSemanticId = this.inlineEditState.map((s) => s?.inlineCompletion.semanticId);
        this._register(autorun((reader) => {
            const id = inlineEditSemanticId.read(reader);
            if (id) {
                this._editor.pushUndoStop();
                this._lastShownInlineCompletionInfo = {
                    alternateTextModelVersionId: this.textModel.getAlternativeVersionId(),
                    inlineCompletion: this.state.get().inlineCompletion.inlineCompletion,
                };
            }
        }));
        this._didUndoInlineEdits.recomputeInitiallyAndOnChange(this._store);
    }
    debugGetSelectedSuggestItem() {
        return this._selectedSuggestItem;
    }
    getIndentationInfo(reader) {
        let startsWithIndentation = false;
        let startsWithIndentationLessThanTabSize = true;
        const ghostText = this?.primaryGhostText.read(reader);
        if (!!this?._selectedSuggestItem && ghostText && ghostText.parts.length > 0) {
            const { column, lines } = ghostText.parts[0];
            const firstLine = lines[0].line;
            const indentationEndColumn = this.textModel.getLineIndentColumn(ghostText.lineNumber);
            const inIndentation = column <= indentationEndColumn;
            if (inIndentation) {
                let firstNonWsIdx = firstNonWhitespaceIndex(firstLine);
                if (firstNonWsIdx === -1) {
                    firstNonWsIdx = firstLine.length - 1;
                }
                startsWithIndentation = firstNonWsIdx > 0;
                const tabSize = this.textModel.getOptions().tabSize;
                const visibleColumnIndentation = CursorColumns.visibleColumnFromColumn(firstLine, firstNonWsIdx + 1, tabSize);
                startsWithIndentationLessThanTabSize = visibleColumnIndentation < tabSize;
            }
        }
        return {
            startsWithIndentation,
            startsWithIndentationLessThanTabSize,
        };
    }
    _getReason(e) {
        if (e?.isUndoing) {
            return VersionIdChangeReason.Undo;
        }
        if (e?.isRedoing) {
            return VersionIdChangeReason.Redo;
        }
        if (this.isAcceptingPartially) {
            return VersionIdChangeReason.AcceptWord;
        }
        return VersionIdChangeReason.Other;
    }
    async trigger(tx, options) {
        subtransaction(tx, (tx) => {
            if (options?.onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            if (options?.noDelay) {
                this._noDelaySignal.trigger(tx);
            }
            this._isActive.set(true, tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    async triggerExplicitly(tx, onlyFetchInlineEdits = false) {
        subtransaction(tx, (tx) => {
            if (onlyFetchInlineEdits) {
                this._onlyRequestInlineEditsSignal.trigger(tx);
            }
            this._isActive.set(true, tx);
            this._inAcceptFlow.set(true, tx);
            this._forceUpdateExplicitlySignal.trigger(tx);
        });
        await this._fetchInlineCompletionsPromise.get();
    }
    stop(stopReason = 'automatic', tx) {
        subtransaction(tx, (tx) => {
            if (stopReason === 'explicitCancel') {
                const inlineCompletion = this.state.get()?.inlineCompletion;
                const source = inlineCompletion?.source;
                const sourceInlineCompletion = inlineCompletion?.sourceInlineCompletion;
                if (sourceInlineCompletion && source?.provider.handleRejection) {
                    source.provider.handleRejection(source.inlineCompletions, sourceInlineCompletion);
                }
            }
            this._inAcceptPartialFlow.set(false, tx);
            this._isActive.set(false, tx);
            this._source.clear(tx);
        });
    }
    _computeAugmentation(suggestCompletion, reader) {
        const model = this.textModel;
        const suggestWidgetInlineCompletions = this._source.suggestWidgetInlineCompletions.read(reader);
        const candidateInlineCompletions = suggestWidgetInlineCompletions
            ? suggestWidgetInlineCompletions.inlineCompletions
            : [this.selectedInlineCompletion.read(reader)].filter(isDefined);
        const augmentedCompletion = mapFindFirst(candidateInlineCompletions, (completion) => {
            let r = completion.toSingleTextEdit(reader);
            r = singleTextRemoveCommonPrefix(r, model, Range.fromPositions(r.range.getStartPosition(), suggestCompletion.range.getEndPosition()));
            return singleTextEditAugments(r, suggestCompletion) ? { completion, edit: r } : undefined;
        });
        return augmentedCompletion;
    }
    async _deltaSelectedInlineCompletionIndex(delta) {
        await this.triggerExplicitly();
        const completions = this._filteredInlineCompletionItems.get() || [];
        if (completions.length > 0) {
            const newIdx = (this.selectedInlineCompletionIndex.get() + delta + completions.length) % completions.length;
            this._selectedInlineCompletionId.set(completions[newIdx].semanticId, undefined);
        }
        else {
            this._selectedInlineCompletionId.set(undefined, undefined);
        }
    }
    async next() {
        await this._deltaSelectedInlineCompletionIndex(1);
    }
    async previous() {
        await this._deltaSelectedInlineCompletionIndex(-1);
    }
    async accept(editor = this._editor) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        if (this._inAcceptPartialFlow.get()) {
            this._inAcceptPartialFlow.set(false, undefined);
            this.jump();
            return;
        }
        let completionWithUpdatedRange;
        const state = this.state.get();
        if (state?.kind === 'ghostText') {
            if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
                return;
            }
            completionWithUpdatedRange = state.inlineCompletion;
        }
        else if (state?.kind === 'inlineEdit') {
            completionWithUpdatedRange = state.inlineCompletion;
        }
        else {
            return;
        }
        const completion = completionWithUpdatedRange.toInlineCompletion(undefined);
        if (completion.command) {
            // Make sure the completion list will not be disposed.
            completion.source.addRef();
        }
        editor.pushUndoStop();
        if (completion.snippetInfo) {
            editor.executeEdits('inlineSuggestion.accept', [
                EditOperation.replace(completion.range, ''),
                ...completion.additionalTextEdits,
            ]);
            editor.setPosition(completion.snippetInfo.range.getStartPosition(), 'inlineCompletionAccept');
            SnippetController2.get(editor)?.insert(completion.snippetInfo.snippet, {
                undoStopBefore: false,
            });
        }
        else {
            const edits = state.edits;
            const selections = getEndPositionsAfterApplying(edits).map((p) => Selection.fromPositions(p));
            editor.executeEdits('inlineSuggestion.accept', [
                ...edits.map((edit) => EditOperation.replace(edit.range, edit.text)),
                ...completion.additionalTextEdits,
            ]);
            editor.setSelections(state.kind === 'inlineEdit' ? selections.slice(-1) : selections, 'inlineCompletionAccept');
            if (state.kind === 'inlineEdit' && !this._accessibilityService.isMotionReduced()) {
                // we can assume that edits is sorted!
                const editRanges = new TextEdit(edits).getNewRanges();
                const dec = this._store.add(new FadeoutDecoration(editor, editRanges, () => {
                    this._store.delete(dec);
                }));
            }
        }
        this._onDidAccept.fire();
        // Reset before invoking the command, as the command might cause a follow up trigger (which we don't want to reset).
        this.stop();
        if (completion.command) {
            await this._commandService
                .executeCommand(completion.command.id, ...(completion.command.arguments || []))
                .then(undefined, onUnexpectedExternalError);
            completion.source.removeRef();
        }
        this._inAcceptFlow.set(true, undefined);
        this._lastAcceptedInlineCompletionInfo = {
            textModelVersionIdAfter: this.textModel.getVersionId(),
            inlineCompletion: completion,
        };
    }
    async acceptNextWord(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const langId = this.textModel.getLanguageIdAtPosition(pos.lineNumber, pos.column);
            const config = this._languageConfigurationService.getLanguageConfiguration(langId);
            const wordRegExp = new RegExp(config.wordDefinition.source, config.wordDefinition.flags.replace('g', ''));
            const m1 = text.match(wordRegExp);
            let acceptUntilIndexExclusive = 0;
            if (m1 && m1.index !== undefined) {
                if (m1.index === 0) {
                    acceptUntilIndexExclusive = m1[0].length;
                }
                else {
                    acceptUntilIndexExclusive = m1.index;
                }
            }
            else {
                acceptUntilIndexExclusive = text.length;
            }
            const wsRegExp = /\s+/g;
            const m2 = wsRegExp.exec(text);
            if (m2 && m2.index !== undefined) {
                if (m2.index + m2[0].length < acceptUntilIndexExclusive) {
                    acceptUntilIndexExclusive = m2.index + m2[0].length;
                }
            }
            return acceptUntilIndexExclusive;
        }, 0 /* PartialAcceptTriggerKind.Word */);
    }
    async acceptNextLine(editor) {
        await this._acceptNext(editor, (pos, text) => {
            const m = text.match(/\n/);
            if (m && m.index !== undefined) {
                return m.index + 1;
            }
            return text.length;
        }, 1 /* PartialAcceptTriggerKind.Line */);
    }
    async _acceptNext(editor, getAcceptUntilIndex, kind) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.inlineCompletionState.get();
        if (!state || state.primaryGhostText.isEmpty() || !state.inlineCompletion) {
            return;
        }
        const ghostText = state.primaryGhostText;
        const completion = state.inlineCompletion.toInlineCompletion(undefined);
        if (completion.snippetInfo || completion.filterText !== completion.insertText) {
            // not in WYSIWYG mode, partial commit might change completion, thus it is not supported
            await this.accept(editor);
            return;
        }
        const firstPart = ghostText.parts[0];
        const ghostTextPos = new Position(ghostText.lineNumber, firstPart.column);
        const ghostTextVal = firstPart.text;
        const acceptUntilIndexExclusive = getAcceptUntilIndex(ghostTextPos, ghostTextVal);
        if (acceptUntilIndexExclusive === ghostTextVal.length && ghostText.parts.length === 1) {
            this.accept(editor);
            return;
        }
        const partialGhostTextVal = ghostTextVal.substring(0, acceptUntilIndexExclusive);
        const positions = this._positions.get();
        const cursorPosition = positions[0];
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.source.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                const replaceRange = Range.fromPositions(cursorPosition, ghostTextPos);
                const newText = editor.getModel().getValueInRange(replaceRange) + partialGhostTextVal;
                const primaryEdit = new SingleTextEdit(replaceRange, newText);
                const edits = [primaryEdit, ...getSecondaryEdits(this.textModel, positions, primaryEdit)];
                const selections = getEndPositionsAfterApplying(edits).map((p) => Selection.fromPositions(p));
                editor.executeEdits('inlineSuggestion.accept', edits.map((edit) => EditOperation.replace(edit.range, edit.text)));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
                editor.revealPositionInCenterIfOutsideViewport(editor.getPosition(), 1 /* ScrollType.Immediate */);
            }
            finally {
                this._isAcceptingPartially = false;
            }
            if (completion.source.provider.handlePartialAccept) {
                const acceptedRange = Range.fromPositions(completion.range.getStartPosition(), TextLength.ofText(partialGhostTextVal).addToPosition(ghostTextPos));
                // This assumes that the inline completion and the model use the same EOL style.
                const text = editor.getModel().getValueInRange(acceptedRange, 1 /* EndOfLinePreference.LF */);
                const acceptedLength = text.length;
                completion.source.provider.handlePartialAccept(completion.source.inlineCompletions, completion.sourceInlineCompletion, acceptedLength, { kind, acceptedLength: acceptedLength });
            }
        }
        finally {
            completion.source.removeRef();
        }
    }
    async acceptNextInlineEditPart(editor) {
        if (editor.getModel() !== this.textModel) {
            throw new BugIndicatingError();
        }
        const state = this.inlineEditState.get();
        const updatedEdit = state?.inlineCompletion.updatedEdit.get();
        const completion = state?.inlineCompletion.toInlineCompletion(undefined);
        if (!updatedEdit || updatedEdit.isEmpty || !completion) {
            return;
        }
        const nextPart = updatedEdit.edits[0];
        const edit = new SingleTextEdit(Range.fromPositions(this.textModel.getPositionAt(nextPart.replaceRange.start), this.textModel.getPositionAt(nextPart.replaceRange.endExclusive)), nextPart.newText);
        const cursorAtStartPosition = this._editor
            .getSelection()
            ?.getStartPosition()
            .equals(edit.range.getStartPosition());
        if (!cursorAtStartPosition || !this._inAcceptPartialFlow.get()) {
            this._inAcceptPartialFlow.set(true, undefined);
            this.jump();
            return;
        }
        const partToJumpToNext = updatedEdit.edits[1] ?? undefined;
        const editToJumpToNext = partToJumpToNext
            ? new SingleTextEdit(Range.fromPositions(this.textModel.getPositionAt(partToJumpToNext.replaceRange.start), this.textModel.getPositionAt(partToJumpToNext.replaceRange.endExclusive)), partToJumpToNext.newText)
            : undefined;
        // Executing the edit might free the completion, so we have to hold a reference on it.
        completion.source.addRef();
        try {
            this._isAcceptingPartially = true;
            try {
                editor.pushUndoStop();
                let selections;
                if (editToJumpToNext) {
                    const [_, rangeOfEditToJumpTo] = getModifiedRangesAfterApplying([edit, editToJumpToNext]);
                    selections = [Selection.fromPositions(rangeOfEditToJumpTo.getStartPosition())];
                }
                else {
                    selections = getEndPositionsAfterApplying([edit]).map((p) => Selection.fromPositions(p));
                }
                const edits = [edit];
                editor.executeEdits('inlineSuggestion.accept', edits.map((edit) => EditOperation.replace(edit.range, edit.text)));
                editor.setSelections(selections, 'inlineCompletionPartialAccept');
                editor.revealPositionInCenterIfOutsideViewport(editor.getPosition(), 1 /* ScrollType.Immediate */);
            }
            finally {
                this._isAcceptingPartially = false;
            }
        }
        finally {
            completion.source.removeRef();
        }
    }
    handleSuggestAccepted(item) {
        const itemEdit = singleTextRemoveCommonPrefix(item.toSingleTextEdit(), this.textModel);
        const augmentedCompletion = this._computeAugmentation(itemEdit, undefined);
        if (!augmentedCompletion) {
            return;
        }
        const source = augmentedCompletion.completion.source;
        const sourceInlineCompletion = augmentedCompletion.completion.sourceInlineCompletion;
        const completion = augmentedCompletion.completion.toInlineCompletion(undefined);
        // This assumes that the inline completion and the model use the same EOL style.
        const alreadyAcceptedLength = this.textModel.getValueInRange(completion.range, 1 /* EndOfLinePreference.LF */).length;
        const acceptedLength = alreadyAcceptedLength + itemEdit.text.length;
        source.provider.handlePartialAccept?.(source.inlineCompletions, sourceInlineCompletion, itemEdit.text.length, {
            kind: 2 /* PartialAcceptTriggerKind.Suggest */,
            acceptedLength,
        });
    }
    extractReproSample() {
        const value = this.textModel.getValue();
        const item = this.state.get()?.inlineCompletion?.toInlineCompletion(undefined);
        return {
            documentValue: value,
            inlineCompletion: item?.sourceInlineCompletion,
        };
    }
    jump() {
        const s = this.inlineEditState.get();
        if (!s) {
            return;
        }
        transaction((tx) => {
            this._jumpedToId.set(s.inlineCompletion.semanticId, tx);
            this.dontRefetchSignal.trigger(tx);
            const edit = s.inlineCompletion.toSingleTextEdit(undefined);
            this._editor.setPosition(edit.range.getStartPosition(), 'inlineCompletions.jump');
            // TODO: consider using view information to reveal it
            const isSingleLineChange = edit.range.startLineNumber === edit.range.endLineNumber && !edit.text.includes('\n');
            if (isSingleLineChange) {
                this._editor.revealPosition(edit.range.getStartPosition());
            }
            else {
                const revealRange = new Range(edit.range.startLineNumber - 1, 1, edit.range.endLineNumber + 1, 1);
                this._editor.revealRange(revealRange, 1 /* ScrollType.Immediate */);
            }
            this._editor.focus();
        });
    }
    async handleInlineEditShown(inlineCompletion) {
        if (inlineCompletion.didShow) {
            return;
        }
        inlineCompletion.markAsShown();
        inlineCompletion.source.provider.handleItemDidShow?.(inlineCompletion.source.inlineCompletions, inlineCompletion.sourceInlineCompletion, inlineCompletion.insertText);
        if (inlineCompletion.shownCommand) {
            await this._commandService.executeCommand(inlineCompletion.shownCommand.id, ...(inlineCompletion.shownCommand.arguments || []));
        }
    }
};
InlineCompletionsModel = __decorate([
    __param(7, IInstantiationService),
    __param(8, ICommandService),
    __param(9, ILanguageConfigurationService),
    __param(10, IAccessibilityService)
], InlineCompletionsModel);
export { InlineCompletionsModel };
export var VersionIdChangeReason;
(function (VersionIdChangeReason) {
    VersionIdChangeReason[VersionIdChangeReason["Undo"] = 0] = "Undo";
    VersionIdChangeReason[VersionIdChangeReason["Redo"] = 1] = "Redo";
    VersionIdChangeReason[VersionIdChangeReason["AcceptWord"] = 2] = "AcceptWord";
    VersionIdChangeReason[VersionIdChangeReason["Other"] = 3] = "Other";
})(VersionIdChangeReason || (VersionIdChangeReason = {}));
export function getSecondaryEdits(textModel, positions, primaryEdit) {
    if (positions.length === 1) {
        // No secondary cursor positions
        return [];
    }
    const primaryPosition = positions[0];
    const secondaryPositions = positions.slice(1);
    const primaryEditStartPosition = primaryEdit.range.getStartPosition();
    const primaryEditEndPosition = primaryEdit.range.getEndPosition();
    const replacedTextAfterPrimaryCursor = textModel.getValueInRange(Range.fromPositions(primaryPosition, primaryEditEndPosition));
    const positionWithinTextEdit = subtractPositions(primaryPosition, primaryEditStartPosition);
    if (positionWithinTextEdit.lineNumber < 1) {
        onUnexpectedError(new BugIndicatingError(`positionWithinTextEdit line number should be bigger than 0.
			Invalid subtraction between ${primaryPosition.toString()} and ${primaryEditStartPosition.toString()}`));
        return [];
    }
    const secondaryEditText = substringPos(primaryEdit.text, positionWithinTextEdit);
    return secondaryPositions.map((pos) => {
        const posEnd = addPositions(subtractPositions(pos, primaryEditStartPosition), primaryEditEndPosition);
        const textAfterSecondaryCursor = textModel.getValueInRange(Range.fromPositions(pos, posEnd));
        const l = commonPrefixLength(replacedTextAfterPrimaryCursor, textAfterSecondaryCursor);
        const range = Range.fromPositions(pos, pos.delta(0, l));
        return new SingleTextEdit(range, secondaryEditText);
    });
}
class FadeoutDecoration extends Disposable {
    constructor(editor, ranges, onDispose) {
        super();
        if (onDispose) {
            this._register({ dispose: () => onDispose() });
        }
        this._register(observableCodeEditor(editor).setDecorations(constObservable(ranges.map((range) => ({
            range: range,
            options: {
                description: 'animation',
                className: 'edits-fadeout-decoration',
                zIndex: 1,
            },
        })))));
        const animation = new AnimatedValue(1, 0, 1000, easeOutCubic);
        const val = new ObservableAnimatedValue(animation);
        this._register(autorun((reader) => {
            const opacity = val.getValue(reader);
            editor.getContainerDomNode().style.setProperty('--animation-opacity', opacity.toString());
            if (animation.isFinished()) {
                this.dispose();
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVDb21wbGV0aW9uc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixpQkFBaUIsRUFDakIseUJBQXlCLEdBQ3pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBS04sT0FBTyxFQUNQLGVBQWUsRUFDZixPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLDZCQUE2QixFQUM3QixjQUFjLEVBQ2QsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFB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