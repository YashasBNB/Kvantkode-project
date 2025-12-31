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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvaW5saW5lQ29tcGxldGlvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsaUJBQWlCLEVBQ2pCLHlCQUF5QixHQUN6QixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUtOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUNQLG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZiw2QkFBNkIsRUFDN0IsY0FBYyxFQUNkLFdBQVcsR0FDWCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNB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