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
var InlineCompletionsSource_1;
import { compareUndefinedSmallest, numberComparator } from '../../../../../base/common/arrays.js';
import { findLastMax } from '../../../../../base/common/arraysFind.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { equalsIfDefined, itemEquals } from '../../../../../base/common/equals.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { matchesSubString } from '../../../../../base/common/filters.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { derived, derivedHandleChanges, disposableObservableValue, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { commonPrefixLength, commonSuffixLength, splitLines, } from '../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { applyEditsToRanges, OffsetEdit, SingleOffsetEdit, } from '../../../../common/core/offsetEdit.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit, StringText } from '../../../../common/core/textEdit.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { linesDiffComputers } from '../../../../common/diff/linesDiffComputers.js';
import { InlineCompletionTriggerKind, } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { OffsetEdits } from '../../../../common/model/textModelOffsetEdit.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { provideInlineCompletions, } from './provideInlineCompletions.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { StructuredLogger, formatRecordableLogEntry, } from '../structuredLogger.js';
let InlineCompletionsSource = class InlineCompletionsSource extends Disposable {
    static { InlineCompletionsSource_1 = this; }
    static { this._requestId = 0; }
    constructor(_textModel, _versionId, _debounceValue, _languageFeaturesService, _languageConfigurationService, _logService, _configurationService, _instantiationService) {
        super();
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._debounceValue = _debounceValue;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._updateOperation = this._register(new MutableDisposable());
        this.inlineCompletions = this._register(disposableObservableValue('inlineCompletions', undefined));
        this.suggestWidgetInlineCompletions = this._register(disposableObservableValue('suggestWidgetInlineCompletions', undefined));
        this._loggingEnabled = observableConfigValue('editor.inlineSuggest.logFetch', false, this._configurationService).recomputeInitiallyAndOnChange(this._store);
        this._structuredFetchLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logFetch.commandId'));
        this.clearOperationOnTextModelChange = derived(this, (reader) => {
            this._versionId.read(reader);
            this._updateOperation.clear();
            return undefined; // always constant
        });
        this._loadingCount = observableValue(this, 0);
        this.loading = this._loadingCount.map(this, (v) => v > 0);
        this.clearOperationOnTextModelChange.recomputeInitiallyAndOnChange(this._store);
    }
    _log(entry) {
        if (this._loggingEnabled.get()) {
            this._logService.info(formatRecordableLogEntry(entry));
        }
        this._structuredFetchLogger.log(entry);
    }
    fetch(position, context, activeInlineCompletion, withDebounce, userJumpedToActiveCompletion) {
        const request = new UpdateRequest(position, context, this._textModel.getVersionId());
        const target = context.selectedSuggestionInfo
            ? this.suggestWidgetInlineCompletions
            : this.inlineCompletions;
        if (this._updateOperation.value?.request.satisfies(request)) {
            return this._updateOperation.value.promise;
        }
        else if (target.get()?.request.satisfies(request)) {
            return Promise.resolve(true);
        }
        const updateOngoing = !!this._updateOperation.value;
        this._updateOperation.clear();
        const source = new CancellationTokenSource();
        const promise = (async () => {
            this._loadingCount.set(this._loadingCount.get() + 1, undefined);
            try {
                const recommendedDebounceValue = this._debounceValue.get(this._textModel);
                const debounceValue = findLastMax(this._languageFeaturesService.inlineCompletionsProvider
                    .all(this._textModel)
                    .map((p) => p.debounceDelayMs), compareUndefinedSmallest(numberComparator)) ?? recommendedDebounceValue;
                // Debounce in any case if update is ongoing
                const shouldDebounce = updateOngoing ||
                    (withDebounce && context.triggerKind === InlineCompletionTriggerKind.Automatic);
                if (shouldDebounce) {
                    // This debounces the operation
                    await wait(debounceValue, source.token);
                }
                if (source.token.isCancellationRequested ||
                    this._store.isDisposed ||
                    this._textModel.getVersionId() !== request.versionId) {
                    return false;
                }
                const requestId = InlineCompletionsSource_1._requestId++;
                if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                    this._log({
                        sourceId: 'InlineCompletions.fetch',
                        kind: 'start',
                        requestId,
                        modelUri: this._textModel.uri.toString(),
                        modelVersion: this._textModel.getVersionId(),
                        context: { triggerKind: context.triggerKind },
                        time: Date.now(),
                    });
                }
                const startTime = new Date();
                let updatedCompletions = undefined;
                let error = undefined;
                try {
                    updatedCompletions = await provideInlineCompletions(this._languageFeaturesService.inlineCompletionsProvider, position, this._textModel, context, source.token, this._languageConfigurationService);
                }
                catch (e) {
                    error = e;
                    throw e;
                }
                finally {
                    if (this._loggingEnabled.get() || this._structuredFetchLogger.isEnabled.get()) {
                        if (source.token.isCancellationRequested ||
                            this._store.isDisposed ||
                            this._textModel.getVersionId() !== request.versionId) {
                            error = 'canceled';
                        }
                        const result = updatedCompletions?.completions.map((c) => ({
                            range: c.range.toString(),
                            text: c.insertText,
                            isInlineEdit: !!c.isInlineEdit,
                            source: c.source.provider.groupId,
                        }));
                        this._log({
                            sourceId: 'InlineCompletions.fetch',
                            kind: 'end',
                            requestId,
                            durationMs: Date.now() - startTime.getTime(),
                            error,
                            result,
                            time: Date.now(),
                        });
                    }
                }
                if (source.token.isCancellationRequested ||
                    this._store.isDisposed ||
                    this._textModel.getVersionId() !== request.versionId ||
                    userJumpedToActiveCompletion.get() /* In the meantime the user showed interest for the active completion so dont hide it */) {
                    updatedCompletions.dispose();
                    return false;
                }
                // Reuse Inline Edit if possible
                if (activeInlineCompletion &&
                    activeInlineCompletion.isInlineEdit &&
                    activeInlineCompletion.updatedEditModelVersion === this._textModel.getVersionId() &&
                    (activeInlineCompletion.canBeReused(this._textModel, position) ||
                        updatedCompletions.has(activeInlineCompletion.inlineCompletion) /* Inline Edit wins over completions if it's already been shown*/ ||
                        updatedCompletions.isEmpty()) /* Incoming completion is empty, keep the current one alive */) {
                    activeInlineCompletion.reuse();
                    updatedCompletions.dispose();
                    return false;
                }
                const endTime = new Date();
                this._debounceValue.update(this._textModel, endTime.getTime() - startTime.getTime());
                // Reuse Inline Completion if possible
                const completions = new UpToDateInlineCompletions(updatedCompletions, request, this._textModel, this._versionId);
                if (activeInlineCompletion &&
                    !activeInlineCompletion.isInlineEdit &&
                    activeInlineCompletion.canBeReused(this._textModel, position)) {
                    const asInlineCompletion = activeInlineCompletion.toInlineCompletion(undefined);
                    if (!updatedCompletions.has(asInlineCompletion)) {
                        completions.prepend(activeInlineCompletion.inlineCompletion, asInlineCompletion.range, true);
                    }
                }
                this._updateOperation.clear();
                transaction((tx) => {
                    /** @description Update completions with provider result */
                    target.set(completions, tx);
                });
            }
            finally {
                this._loadingCount.set(this._loadingCount.get() - 1, undefined);
            }
            return true;
        })();
        const updateOperation = new UpdateOperation(request, source, promise);
        this._updateOperation.value = updateOperation;
        return promise;
    }
    clear(tx) {
        this._updateOperation.clear();
        this.inlineCompletions.set(undefined, tx);
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    clearSuggestWidgetInlineCompletions(tx) {
        if (this._updateOperation.value?.request.context.selectedSuggestionInfo) {
            this._updateOperation.clear();
        }
        this.suggestWidgetInlineCompletions.set(undefined, tx);
    }
    cancelUpdate() {
        this._updateOperation.clear();
    }
};
InlineCompletionsSource = InlineCompletionsSource_1 = __decorate([
    __param(3, ILanguageFeaturesService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILogService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService)
], InlineCompletionsSource);
export { InlineCompletionsSource };
function wait(ms, cancellationToken) {
    return new Promise((resolve) => {
        let d = undefined;
        const handle = setTimeout(() => {
            if (d) {
                d.dispose();
            }
            resolve();
        }, ms);
        if (cancellationToken) {
            d = cancellationToken.onCancellationRequested(() => {
                clearTimeout(handle);
                if (d) {
                    d.dispose();
                }
                resolve();
            });
        }
    });
}
class UpdateRequest {
    constructor(position, context, versionId) {
        this.position = position;
        this.context = context;
        this.versionId = versionId;
    }
    satisfies(other) {
        return (this.position.equals(other.position) &&
            equalsIfDefined(this.context.selectedSuggestionInfo, other.context.selectedSuggestionInfo, itemEquals()) &&
            (other.context.triggerKind === InlineCompletionTriggerKind.Automatic ||
                this.context.triggerKind === InlineCompletionTriggerKind.Explicit) &&
            this.versionId === other.versionId);
    }
    get isExplicitRequest() {
        return this.context.triggerKind === InlineCompletionTriggerKind.Explicit;
    }
}
class UpdateOperation {
    constructor(request, cancellationTokenSource, promise) {
        this.request = request;
        this.cancellationTokenSource = cancellationTokenSource;
        this.promise = promise;
    }
    dispose() {
        this.cancellationTokenSource.cancel();
    }
}
export class UpToDateInlineCompletions {
    get inlineCompletions() {
        return this._inlineCompletions;
    }
    constructor(inlineCompletionProviderResult, request, _textModel, _versionId) {
        this.inlineCompletionProviderResult = inlineCompletionProviderResult;
        this.request = request;
        this._textModel = _textModel;
        this._versionId = _versionId;
        this._refCount = 1;
        this._prependedInlineCompletionItems = [];
        this._inlineCompletions = inlineCompletionProviderResult.completions.map((completion) => new InlineCompletionWithUpdatedRange(completion, undefined, this._textModel, this._versionId, this.request));
    }
    clone() {
        this._refCount++;
        return this;
    }
    dispose() {
        this._refCount--;
        if (this._refCount === 0) {
            this.inlineCompletionProviderResult.dispose();
            for (const i of this._prependedInlineCompletionItems) {
                i.source.removeRef();
            }
            this._inlineCompletions.forEach((i) => i.dispose());
        }
    }
    prepend(inlineCompletion, range, addRefToSource) {
        if (addRefToSource) {
            inlineCompletion.source.addRef();
        }
        this._inlineCompletions.unshift(new InlineCompletionWithUpdatedRange(inlineCompletion, range, this._textModel, this._versionId, this.request));
        this._prependedInlineCompletionItems.push(inlineCompletion);
    }
}
export class InlineCompletionWithUpdatedRange extends Disposable {
    get forwardStable() {
        return this.source.inlineCompletions.enableForwardStability ?? false;
    }
    get updatedEdit() {
        return this._updatedEditObj.offsetEdit;
    }
    get updatedEditModelVersion() {
        return this._updatedEditObj.modelVersion;
    }
    get source() {
        return this.inlineCompletion.source;
    }
    get sourceInlineCompletion() {
        return this.inlineCompletion.sourceInlineCompletion;
    }
    get isInlineEdit() {
        return this.inlineCompletion.isInlineEdit;
    }
    constructor(inlineCompletion, updatedRange, _textModel, _modelVersion, request) {
        super();
        this.inlineCompletion = inlineCompletion;
        this._textModel = _textModel;
        this._modelVersion = _modelVersion;
        this.request = request;
        this.semanticId = JSON.stringify([
            this.inlineCompletion.filterText,
            this.inlineCompletion.insertText,
            this.inlineCompletion.range.getStartPosition().toString(),
        ]);
        this._updatedRange = derived((reader) => {
            const edit = this.updatedEdit.read(reader);
            if (!edit || edit.edits.length === 0) {
                return undefined;
            }
            return Range.fromPositions(this._textModel.getPositionAt(edit.edits[0].replaceRange.start), this._textModel.getPositionAt(edit.edits[edit.edits.length - 1].replaceRange.endExclusive));
        });
        this._updatedEditObj = this._register(this._toUpdatedEdit(updatedRange ?? this.inlineCompletion.range, this.inlineCompletion.insertText));
    }
    toInlineCompletion(reader) {
        const singleTextEdit = this.toSingleTextEdit(reader);
        return this.inlineCompletion.withRangeInsertTextAndFilterText(singleTextEdit.range, singleTextEdit.text, singleTextEdit.text);
    }
    toSingleTextEdit(reader) {
        this._modelVersion.read(reader);
        const offsetEdit = this.updatedEdit.read(reader);
        if (!offsetEdit) {
            return new SingleTextEdit(this._updatedRange.read(reader) ?? emptyRange, this.inlineCompletion.insertText);
        }
        const startOffset = offsetEdit.edits[0].replaceRange.start;
        const endOffset = offsetEdit.edits[offsetEdit.edits.length - 1].replaceRange.endExclusive;
        const overallOffsetRange = new OffsetRange(startOffset, endOffset);
        const overallLnColRange = Range.fromPositions(this._textModel.getPositionAt(overallOffsetRange.start), this._textModel.getPositionAt(overallOffsetRange.endExclusive));
        let text = this._textModel.getValueInRange(overallLnColRange);
        for (let i = offsetEdit.edits.length - 1; i >= 0; i--) {
            const edit = offsetEdit.edits[i];
            const relativeStartOffset = edit.replaceRange.start - startOffset;
            const relativeEndOffset = edit.replaceRange.endExclusive - startOffset;
            text =
                text.substring(0, relativeStartOffset) + edit.newText + text.substring(relativeEndOffset);
        }
        return new SingleTextEdit(overallLnColRange, text);
    }
    isVisible(model, cursorPosition, reader) {
        const minimizedReplacement = singleTextRemoveCommonPrefix(this.toSingleTextEdit(reader), model);
        const updatedRange = this._updatedRange.read(reader);
        if (!updatedRange ||
            !this.inlineCompletion.range.getStartPosition().equals(updatedRange.getStartPosition()) ||
            cursorPosition.lineNumber !== minimizedReplacement.range.startLineNumber ||
            minimizedReplacement.isEmpty // if the completion is empty after removing the common prefix of the completion and the model, the completion item would not be visible
        ) {
            return false;
        }
        // We might consider comparing by .toLowerText, but this requires GhostTextReplacement
        const originalValue = model.getValueInRange(minimizedReplacement.range, 1 /* EndOfLinePreference.LF */);
        const filterText = minimizedReplacement.text;
        const cursorPosIndex = Math.max(0, cursorPosition.column - minimizedReplacement.range.startColumn);
        let filterTextBefore = filterText.substring(0, cursorPosIndex);
        let filterTextAfter = filterText.substring(cursorPosIndex);
        let originalValueBefore = originalValue.substring(0, cursorPosIndex);
        let originalValueAfter = originalValue.substring(cursorPosIndex);
        const originalValueIndent = model.getLineIndentColumn(minimizedReplacement.range.startLineNumber);
        if (minimizedReplacement.range.startColumn <= originalValueIndent) {
            // Remove indentation
            originalValueBefore = originalValueBefore.trimStart();
            if (originalValueBefore.length === 0) {
                originalValueAfter = originalValueAfter.trimStart();
            }
            filterTextBefore = filterTextBefore.trimStart();
            if (filterTextBefore.length === 0) {
                filterTextAfter = filterTextAfter.trimStart();
            }
        }
        return (filterTextBefore.startsWith(originalValueBefore) &&
            !!matchesSubString(originalValueAfter, filterTextAfter));
    }
    reuse() {
        this._updatedEditObj.reuse();
    }
    canBeReused(model, position) {
        if (!this.updatedEdit.get()) {
            return false;
        }
        if (this.sourceInlineCompletion.isInlineEdit) {
            return this._updatedEditObj.lastChangePartOfInlineEdit;
        }
        const updatedRange = this._updatedRange.read(undefined);
        const result = !!updatedRange &&
            updatedRange.containsPosition(position) &&
            this.isVisible(model, position, undefined) &&
            TextLength.ofRange(updatedRange).isGreaterThanOrEqualTo(TextLength.ofRange(this.inlineCompletion.range));
        return result;
    }
    _toUpdatedEdit(editRange, replaceText) {
        return this.isInlineEdit
            ? this._toInlineEditEdit(editRange, replaceText)
            : this._toInlineCompletionEdit(editRange, replaceText);
    }
    _toInlineCompletionEdit(editRange, replaceText) {
        const startOffset = this._textModel.getOffsetAt(editRange.getStartPosition());
        const endOffset = this._textModel.getOffsetAt(editRange.getEndPosition());
        const originalRange = OffsetRange.ofStartAndLength(startOffset, endOffset - startOffset);
        const offsetEdit = new OffsetEdit([new SingleOffsetEdit(originalRange, replaceText)]);
        return new UpdatedEdit(offsetEdit, this._textModel, this._modelVersion, false);
    }
    _toInlineEditEdit(editRange, replaceText) {
        const eol = this._textModel.getEOL();
        const editOriginalText = this._textModel.getValueInRange(editRange);
        const editReplaceText = replaceText.replace(/\r\n|\r|\n/g, eol);
        const diffAlgorithm = linesDiffComputers.getDefault();
        const lineDiffs = diffAlgorithm.computeDiff(splitLines(editOriginalText), splitLines(editReplaceText), {
            ignoreTrimWhitespace: false,
            computeMoves: false,
            extendToSubwords: true,
            maxComputationTimeMs: 500,
        });
        const innerChanges = lineDiffs.changes.flatMap((c) => c.innerChanges ?? []);
        function addRangeToPos(pos, range) {
            const start = TextLength.fromPosition(range.getStartPosition());
            return TextLength.ofRange(range).createRange(start.addToPosition(pos));
        }
        const modifiedText = new StringText(editReplaceText);
        const offsetEdit = new OffsetEdit(innerChanges.map((c) => {
            const range = addRangeToPos(editRange.getStartPosition(), c.originalRange);
            const startOffset = this._textModel.getOffsetAt(range.getStartPosition());
            const endOffset = this._textModel.getOffsetAt(range.getEndPosition());
            const originalRange = OffsetRange.ofStartAndLength(startOffset, endOffset - startOffset);
            const replaceText = modifiedText.getValueOfRange(c.modifiedRange);
            const originalText = this._textModel.getValueInRange(range);
            const edit = new SingleOffsetEdit(originalRange, replaceText);
            return reshapeEdit(edit, originalText, innerChanges.length, this._textModel);
        }));
        return new UpdatedEdit(offsetEdit, this._textModel, this._modelVersion, true);
    }
}
class UpdatedEdit extends Disposable {
    get modelVersion() {
        return this._inlineEditModelVersion;
    }
    get lastChangePartOfInlineEdit() {
        return this._lastChangePartOfInlineEdit;
    }
    get offsetEdit() {
        return this._updatedEdit.map((e) => e ?? undefined);
    }
    constructor(offsetEdit, _textModel, _modelVersion, isInlineEdit) {
        super();
        this._textModel = _textModel;
        this._modelVersion = _modelVersion;
        this._lastChangePartOfInlineEdit = false;
        this._updatedEdit = derivedHandleChanges({
            owner: this,
            equalityComparer: equalsIfDefined((a, b) => a?.equals(b)),
            createEmptyChangeSummary: () => [],
            handleChange: (context, changeSummary) => {
                if (context.didChange(this._modelVersion) && context.change) {
                    changeSummary.push(OffsetEdits.fromContentChanges(context.change.changes));
                }
                return true;
            },
        }, (reader, changeSummary) => {
            this._modelVersion.read(reader);
            for (const change of changeSummary) {
                this._innerEdits = this._applyTextModelChanges(change, this._innerEdits);
            }
            if (this._innerEdits.length === 0) {
                return undefined;
            }
            if (this._innerEdits.some((e) => e.edit === undefined)) {
                throw new BugIndicatingError('UpdatedEdit: Invalid state');
            }
            return new OffsetEdit(this._innerEdits.map((edit) => edit.edit));
        });
        this._inlineEditModelVersion = this._modelVersion.get() ?? -1;
        this._innerEdits = offsetEdit.edits.map((edit) => {
            if (isInlineEdit) {
                const replacedRange = Range.fromPositions(this._textModel.getPositionAt(edit.replaceRange.start), this._textModel.getPositionAt(edit.replaceRange.endExclusive));
                const replacedText = this._textModel.getValueInRange(replacedRange);
                return new SingleUpdatedNextEdit(edit, replacedText);
            }
            return new SingleUpdatedCompletion(edit);
        });
        this._updatedEdit.recomputeInitiallyAndOnChange(this._store); // make sure to call this after setting `_lastEdit`
    }
    _applyTextModelChanges(textModelChanges, edits) {
        for (const innerEdit of edits) {
            innerEdit.applyTextModelChanges(textModelChanges);
        }
        if (edits.some((edit) => edit.edit === undefined)) {
            return []; // change is invalid, so we will have to drop the completion
        }
        const currentModelVersion = this._modelVersion.get();
        this._lastChangePartOfInlineEdit = edits.some((edit) => edit.lastChangeUpdatedEdit);
        if (this._lastChangePartOfInlineEdit) {
            this._inlineEditModelVersion = currentModelVersion ?? -1;
        }
        if (currentModelVersion === null || this._inlineEditModelVersion + 20 < currentModelVersion) {
            return []; // the completion has been ignored for a while, remove it
        }
        edits = edits.filter((innerEdit) => !innerEdit.edit.isEmpty);
        if (edits.length === 0) {
            return []; // the completion has been typed by the user
        }
        return edits;
    }
    reuse() {
        this._inlineEditModelVersion = this._modelVersion.get() ?? -1;
    }
}
class SingleUpdatedEdit {
    get edit() {
        return this._edit;
    }
    get lastChangeUpdatedEdit() {
        return this._lastChangeUpdatedEdit;
    }
    constructor(edit) {
        this._lastChangeUpdatedEdit = false;
        this._edit = edit;
    }
    applyTextModelChanges(textModelChanges) {
        this._lastChangeUpdatedEdit = false;
        if (!this._edit) {
            throw new BugIndicatingError('UpdatedInnerEdits: No edit to apply changes to');
        }
        const result = this.applyChanges(this._edit, textModelChanges);
        if (!result) {
            this._edit = undefined;
            return;
        }
        this._edit = result.edit;
        this._lastChangeUpdatedEdit = result.editHasChanged;
    }
}
class SingleUpdatedCompletion extends SingleUpdatedEdit {
    constructor(edit) {
        super(edit);
    }
    applyChanges(edit, textModelChanges) {
        const newEditRange = applyEditsToRanges([edit.replaceRange], textModelChanges)[0];
        return {
            edit: new SingleOffsetEdit(newEditRange, edit.newText),
            editHasChanged: !newEditRange.equals(edit.replaceRange),
        };
    }
}
class SingleUpdatedNextEdit extends SingleUpdatedEdit {
    constructor(edit, replacedText) {
        super(edit);
        this._prefixLength = commonPrefixLength(edit.newText, replacedText);
        this._suffixLength = commonSuffixLength(edit.newText, replacedText);
        this._trimmedNewText = edit.newText.substring(this._prefixLength, edit.newText.length - this._suffixLength);
    }
    applyChanges(edit, textModelChanges) {
        let editStart = edit.replaceRange.start;
        let editEnd = edit.replaceRange.endExclusive;
        let editReplaceText = edit.newText;
        let editHasChanged = false;
        const shouldPreserveEditShape = this._prefixLength > 0 || this._suffixLength > 0;
        for (let i = textModelChanges.edits.length - 1; i >= 0; i--) {
            const change = textModelChanges.edits[i];
            // INSERTIONS (only support inserting at start of edit)
            const isInsertion = change.newText.length > 0 && change.replaceRange.isEmpty;
            if (isInsertion &&
                !shouldPreserveEditShape &&
                change.replaceRange.start === editStart &&
                editReplaceText.startsWith(change.newText)) {
                editStart += change.newText.length;
                editReplaceText = editReplaceText.substring(change.newText.length);
                editEnd = Math.max(editStart, editEnd);
                editHasChanged = true;
                continue;
            }
            if (isInsertion &&
                shouldPreserveEditShape &&
                change.replaceRange.start === editStart + this._prefixLength &&
                this._trimmedNewText.startsWith(change.newText)) {
                editEnd += change.newText.length;
                editHasChanged = true;
                this._prefixLength += change.newText.length;
                this._trimmedNewText = this._trimmedNewText.substring(change.newText.length);
                continue;
            }
            // DELETIONS
            const isDeletion = change.newText.length === 0 && change.replaceRange.length > 0;
            if (isDeletion &&
                change.replaceRange.start >= editStart + this._prefixLength &&
                change.replaceRange.endExclusive <= editEnd - this._suffixLength) {
                // user deleted text IN-BETWEEN the deletion range
                editEnd -= change.replaceRange.length;
                editHasChanged = true;
                continue;
            }
            // user did exactly the edit
            if (change.equals(edit)) {
                editHasChanged = true;
                editStart = change.replaceRange.endExclusive;
                editReplaceText = '';
                continue;
            }
            // MOVE EDIT
            if (change.replaceRange.start > editEnd) {
                // the change happens after the completion range
                continue;
            }
            if (change.replaceRange.endExclusive < editStart) {
                // the change happens before the completion range
                editStart += change.newText.length - change.replaceRange.length;
                editEnd += change.newText.length - change.replaceRange.length;
                continue;
            }
            // The change intersects the completion, so we will have to drop the completion
            return undefined;
        }
        // the resulting edit is a noop as the original and new text are the same
        if (this._trimmedNewText.length === 0 &&
            editStart + this._prefixLength === editEnd - this._suffixLength) {
            return {
                edit: new SingleOffsetEdit(new OffsetRange(editStart + this._prefixLength, editStart + this._prefixLength), ''),
                editHasChanged: true,
            };
        }
        return {
            edit: new SingleOffsetEdit(new OffsetRange(editStart, editEnd), editReplaceText),
            editHasChanged,
        };
    }
}
const emptyRange = new Range(1, 1, 1, 1);
function reshapeEdit(edit, originalText, totalInnerEdits, textModel) {
    // TODO: EOL are not properly trimmed by the diffAlgorithm #12680
    const eol = textModel.getEOL();
    if (edit.newText.endsWith(eol) && originalText.endsWith(eol)) {
        edit = new SingleOffsetEdit(edit.replaceRange.deltaEnd(-eol.length), edit.newText.slice(0, -eol.length));
    }
    // INSERTION
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (totalInnerEdits === 1 && edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        edit = reshapeMultiLineInsertion(edit, textModel);
    }
    // The diff algorithm extended a simple edit to the entire word
    // shrink it back to a simple edit if it is deletion/insertion only
    if (totalInnerEdits === 1) {
        const prefixLength = commonPrefixLength(originalText, edit.newText);
        const suffixLength = commonSuffixLength(originalText.slice(prefixLength), edit.newText.slice(prefixLength));
        // reshape it back to an insertion
        if (prefixLength + suffixLength === originalText.length) {
            return new SingleOffsetEdit(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), edit.newText.substring(prefixLength, edit.newText.length - suffixLength));
        }
        // reshape it back to a deletion
        if (prefixLength + suffixLength === edit.newText.length) {
            return new SingleOffsetEdit(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), '');
        }
    }
    return edit;
}
function reshapeMultiLineInsertion(edit, textModel) {
    if (!edit.replaceRange.isEmpty) {
        throw new BugIndicatingError('Unexpected original range');
    }
    if (edit.replaceRange.start === 0) {
        return edit;
    }
    const eol = textModel.getEOL();
    const startPosition = textModel.getPositionAt(edit.replaceRange.start);
    const startColumn = startPosition.column;
    const startLineNumber = startPosition.lineNumber;
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (startColumn === 1 &&
        startLineNumber > 1 &&
        textModel.getLineLength(startLineNumber) !== 0 &&
        edit.newText.endsWith(eol) &&
        !edit.newText.startsWith(eol)) {
        return new SingleOffsetEdit(edit.replaceRange.delta(-1), eol + edit.newText.slice(0, -eol.length));
    }
    return edit;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvaW5saW5lQ29tcGxldGlvbnNTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUtOLE9BQU8sRUFDUCxvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixVQUFVLEdBQ1YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJD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