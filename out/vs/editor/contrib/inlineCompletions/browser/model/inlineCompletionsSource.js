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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTb3VyY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2lubGluZUNvbXBsZXRpb25zU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdEUsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFLTixPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUN6QixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsVUFBVSxHQUNWLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxx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