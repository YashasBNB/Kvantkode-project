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
import { CompareResult, equals } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { autorunHandleChanges, derived, keepObserved, observableValue, transaction, waitForState, } from '../../../../../base/common/observable.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { IUndoRedoService, UndoRedoGroup, } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { LineRange } from './lineRange.js';
import { DocumentLineRangeMap, DocumentRangeMap, LineRangeMapping, } from './mapping.js';
import { TextModelDiffs } from './textModelDiffs.js';
import { leftJoin } from '../utils.js';
import { ModifiedBaseRange, ModifiedBaseRangeState, ModifiedBaseRangeStateKind, } from './modifiedBaseRange.js';
let MergeEditorModel = class MergeEditorModel extends EditorModel {
    constructor(base, input1, input2, resultTextModel, diffComputer, options, telemetry, languageService, undoRedoService) {
        super();
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.resultTextModel = resultTextModel;
        this.diffComputer = diffComputer;
        this.options = options;
        this.telemetry = telemetry;
        this.languageService = languageService;
        this.undoRedoService = undoRedoService;
        this.input1TextModelDiffs = this._register(new TextModelDiffs(this.base, this.input1.textModel, this.diffComputer));
        this.input2TextModelDiffs = this._register(new TextModelDiffs(this.base, this.input2.textModel, this.diffComputer));
        this.resultTextModelDiffs = this._register(new TextModelDiffs(this.base, this.resultTextModel, this.diffComputer));
        this.modifiedBaseRanges = derived(this, (reader) => {
            const input1Diffs = this.input1TextModelDiffs.diffs.read(reader);
            const input2Diffs = this.input2TextModelDiffs.diffs.read(reader);
            return ModifiedBaseRange.fromDiffs(input1Diffs, input2Diffs, this.base, this.input1.textModel, this.input2.textModel);
        });
        this.modifiedBaseRangeResultStates = derived(this, (reader) => {
            const map = new Map(this.modifiedBaseRanges
                .read(reader)
                .map((s) => [s, new ModifiedBaseRangeData(s)]));
            return map;
        });
        this.resultSnapshot = this.resultTextModel.createSnapshot();
        this.baseInput1Diffs = this.input1TextModelDiffs.diffs;
        this.baseInput2Diffs = this.input2TextModelDiffs.diffs;
        this.baseResultDiffs = this.resultTextModelDiffs.diffs;
        this.input1ResultMapping = derived(this, (reader) => {
            return this.getInputResultMapping(this.baseInput1Diffs.read(reader), this.baseResultDiffs.read(reader), this.input1.textModel.getLineCount());
        });
        this.resultInput1Mapping = derived(this, (reader) => this.input1ResultMapping.read(reader).reverse());
        this.input2ResultMapping = derived(this, (reader) => {
            return this.getInputResultMapping(this.baseInput2Diffs.read(reader), this.baseResultDiffs.read(reader), this.input2.textModel.getLineCount());
        });
        this.resultInput2Mapping = derived(this, (reader) => this.input2ResultMapping.read(reader).reverse());
        this.baseResultMapping = derived(this, (reader) => {
            const map = new DocumentLineRangeMap(this.baseResultDiffs.read(reader), -1);
            return new DocumentLineRangeMap(map.lineRangeMappings.map((m) => m.inputRange.isEmpty || m.outputRange.isEmpty
                ? new LineRangeMapping(
                // We can do this because two adjacent diffs have one line in between.
                m.inputRange.deltaStart(-1), m.outputRange.deltaStart(-1))
                : m), map.inputLineCount);
        });
        this.resultBaseMapping = derived(this, (reader) => this.baseResultMapping.read(reader).reverse());
        this.diffComputingState = derived(this, (reader) => {
            const states = [
                this.input1TextModelDiffs,
                this.input2TextModelDiffs,
                this.resultTextModelDiffs,
            ].map((s) => s.state.read(reader));
            if (states.some((s) => s === 1 /* TextModelDiffState.initializing */)) {
                return 1 /* MergeEditorModelState.initializing */;
            }
            if (states.some((s) => s === 3 /* TextModelDiffState.updating */)) {
                return 3 /* MergeEditorModelState.updating */;
            }
            return 2 /* MergeEditorModelState.upToDate */;
        });
        this.inputDiffComputingState = derived(this, (reader) => {
            const states = [this.input1TextModelDiffs, this.input2TextModelDiffs].map((s) => s.state.read(reader));
            if (states.some((s) => s === 1 /* TextModelDiffState.initializing */)) {
                return 1 /* MergeEditorModelState.initializing */;
            }
            if (states.some((s) => s === 3 /* TextModelDiffState.updating */)) {
                return 3 /* MergeEditorModelState.updating */;
            }
            return 2 /* MergeEditorModelState.upToDate */;
        });
        this.isUpToDate = derived(this, (reader) => this.diffComputingState.read(reader) === 2 /* MergeEditorModelState.upToDate */);
        this.onInitialized = waitForState(this.diffComputingState, (state) => state === 2 /* MergeEditorModelState.upToDate */).then(() => { });
        this.firstRun = true;
        this.unhandledConflictsCount = derived(this, (reader) => {
            const map = this.modifiedBaseRangeResultStates.read(reader);
            let unhandledCount = 0;
            for (const [_key, value] of map) {
                if (!value.handled.read(reader)) {
                    unhandledCount++;
                }
            }
            return unhandledCount;
        });
        this.hasUnhandledConflicts = this.unhandledConflictsCount.map((value) => /** @description hasUnhandledConflicts */ value > 0);
        this._register(keepObserved(this.modifiedBaseRangeResultStates));
        this._register(keepObserved(this.input1ResultMapping));
        this._register(keepObserved(this.input2ResultMapping));
        const initializePromise = this.initialize();
        this.onInitialized = this.onInitialized.then(async () => {
            await initializePromise;
        });
        initializePromise.then(() => {
            let shouldRecomputeHandledFromAccepted = true;
            this._register(autorunHandleChanges({
                handleChange: (ctx) => {
                    if (ctx.didChange(this.modifiedBaseRangeResultStates)) {
                        shouldRecomputeHandledFromAccepted = true;
                    }
                    return ctx.didChange(this.resultTextModelDiffs.diffs)
                        ? // Ignore non-text changes as we update the state directly
                            ctx.change === 1 /* TextModelDiffChangeReason.textChange */
                        : true;
                },
            }, (reader) => {
                /** @description Merge Editor Model: Recompute State From Result */
                const states = this.modifiedBaseRangeResultStates.read(reader);
                if (!this.isUpToDate.read(reader)) {
                    return;
                }
                const resultDiffs = this.resultTextModelDiffs.diffs.read(reader);
                transaction((tx) => {
                    /** @description Merge Editor Model: Recompute State */
                    this.updateBaseRangeAcceptedState(resultDiffs, states, tx);
                    if (shouldRecomputeHandledFromAccepted) {
                        shouldRecomputeHandledFromAccepted = false;
                        for (const [_range, observableState] of states) {
                            const state = observableState.accepted.get();
                            const handled = !(state.kind === ModifiedBaseRangeStateKind.base ||
                                state.kind === ModifiedBaseRangeStateKind.unrecognized);
                            observableState.handledInput1.set(handled, tx);
                            observableState.handledInput2.set(handled, tx);
                        }
                    }
                });
            }));
        });
    }
    async initialize() {
        if (this.options.resetResult) {
            await this.reset();
        }
    }
    async reset() {
        await waitForState(this.inputDiffComputingState, (state) => state === 2 /* MergeEditorModelState.upToDate */);
        const states = this.modifiedBaseRangeResultStates.get();
        transaction((tx) => {
            /** @description Set initial state */
            for (const [range, state] of states) {
                let newState;
                let handled = false;
                if (range.input1Diffs.length === 0) {
                    newState = ModifiedBaseRangeState.base.withInputValue(2, true);
                    handled = true;
                }
                else if (range.input2Diffs.length === 0) {
                    newState = ModifiedBaseRangeState.base.withInputValue(1, true);
                    handled = true;
                }
                else if (range.isEqualChange) {
                    newState = ModifiedBaseRangeState.base.withInputValue(1, true);
                    handled = true;
                }
                else {
                    newState = ModifiedBaseRangeState.base;
                    handled = false;
                }
                state.accepted.set(newState, tx);
                state.computedFromDiffing = false;
                state.previousNonDiffingState = undefined;
                state.handledInput1.set(handled, tx);
                state.handledInput2.set(handled, tx);
            }
            this.resultTextModel.pushEditOperations(null, [
                {
                    range: new Range(1, 1, Number.MAX_SAFE_INTEGER, 1),
                    text: this.computeAutoMergedResult(),
                },
            ], () => null);
        });
    }
    computeAutoMergedResult() {
        const baseRanges = this.modifiedBaseRanges.get();
        const baseLines = this.base.getLinesContent();
        const input1Lines = this.input1.textModel.getLinesContent();
        const input2Lines = this.input2.textModel.getLinesContent();
        const resultLines = [];
        function appendLinesToResult(source, lineRange) {
            for (let i = lineRange.startLineNumber; i < lineRange.endLineNumberExclusive; i++) {
                resultLines.push(source[i - 1]);
            }
        }
        let baseStartLineNumber = 1;
        for (const baseRange of baseRanges) {
            appendLinesToResult(baseLines, LineRange.fromLineNumbers(baseStartLineNumber, baseRange.baseRange.startLineNumber));
            baseStartLineNumber = baseRange.baseRange.endLineNumberExclusive;
            if (baseRange.input1Diffs.length === 0) {
                appendLinesToResult(input2Lines, baseRange.input2Range);
            }
            else if (baseRange.input2Diffs.length === 0) {
                appendLinesToResult(input1Lines, baseRange.input1Range);
            }
            else if (baseRange.isEqualChange) {
                appendLinesToResult(input1Lines, baseRange.input1Range);
            }
            else {
                appendLinesToResult(baseLines, baseRange.baseRange);
            }
        }
        appendLinesToResult(baseLines, LineRange.fromLineNumbers(baseStartLineNumber, baseLines.length + 1));
        return resultLines.join(this.resultTextModel.getEOL());
    }
    hasBaseRange(baseRange) {
        return this.modifiedBaseRangeResultStates.get().has(baseRange);
    }
    get isApplyingEditInResult() {
        return this.resultTextModelDiffs.isApplyingChange;
    }
    getInputResultMapping(inputLinesDiffs, resultDiffs, inputLineCount) {
        const map = DocumentLineRangeMap.betweenOutputs(inputLinesDiffs, resultDiffs, inputLineCount);
        return new DocumentLineRangeMap(map.lineRangeMappings.map((m) => m.inputRange.isEmpty || m.outputRange.isEmpty
            ? new LineRangeMapping(
            // We can do this because two adjacent diffs have one line in between.
            m.inputRange.deltaStart(-1), m.outputRange.deltaStart(-1))
            : m), map.inputLineCount);
    }
    translateInputRangeToBase(input, range) {
        const baseInputDiffs = input === 1 ? this.baseInput1Diffs.get() : this.baseInput2Diffs.get();
        const map = new DocumentRangeMap(baseInputDiffs.flatMap((d) => d.rangeMappings), 0).reverse();
        return map.projectRange(range).outputRange;
    }
    translateBaseRangeToInput(input, range) {
        const baseInputDiffs = input === 1 ? this.baseInput1Diffs.get() : this.baseInput2Diffs.get();
        const map = new DocumentRangeMap(baseInputDiffs.flatMap((d) => d.rangeMappings), 0);
        return map.projectRange(range).outputRange;
    }
    getLineRangeInResult(baseRange, reader) {
        return this.resultTextModelDiffs.getResultLineRange(baseRange, reader);
    }
    translateResultRangeToBase(range) {
        const map = new DocumentRangeMap(this.baseResultDiffs.get().flatMap((d) => d.rangeMappings), 0).reverse();
        return map.projectRange(range).outputRange;
    }
    translateBaseRangeToResult(range) {
        const map = new DocumentRangeMap(this.baseResultDiffs.get().flatMap((d) => d.rangeMappings), 0);
        return map.projectRange(range).outputRange;
    }
    findModifiedBaseRangesInRange(rangeInBase) {
        // TODO use binary search
        return this.modifiedBaseRanges.get().filter((r) => r.baseRange.intersects(rangeInBase));
    }
    updateBaseRangeAcceptedState(resultDiffs, states, tx) {
        const baseRangeWithStoreAndTouchingDiffs = leftJoin(states, resultDiffs, (baseRange, diff) => baseRange[0].baseRange.touches(diff.inputRange)
            ? CompareResult.neitherLessOrGreaterThan
            : LineRange.compareByStart(baseRange[0].baseRange, diff.inputRange));
        for (const row of baseRangeWithStoreAndTouchingDiffs) {
            const newState = this.computeState(row.left[0], row.rights);
            const data = row.left[1];
            const oldState = data.accepted.get();
            if (!oldState.equals(newState)) {
                if (!this.firstRun && !data.computedFromDiffing) {
                    // Don't set this on the first run - the first run might be used to restore state.
                    data.computedFromDiffing = true;
                    data.previousNonDiffingState = oldState;
                }
                data.accepted.set(newState, tx);
            }
        }
        if (this.firstRun) {
            this.firstRun = false;
        }
    }
    computeState(baseRange, conflictingDiffs) {
        if (conflictingDiffs.length === 0) {
            return ModifiedBaseRangeState.base;
        }
        const conflictingEdits = conflictingDiffs.map((d) => d.getLineEdit());
        function editsAgreeWithDiffs(diffs) {
            return equals(conflictingEdits, diffs.map((d) => d.getLineEdit()), (a, b) => a.equals(b));
        }
        if (editsAgreeWithDiffs(baseRange.input1Diffs)) {
            return ModifiedBaseRangeState.base.withInputValue(1, true);
        }
        if (editsAgreeWithDiffs(baseRange.input2Diffs)) {
            return ModifiedBaseRangeState.base.withInputValue(2, true);
        }
        const states = [
            ModifiedBaseRangeState.base.withInputValue(1, true).withInputValue(2, true, true),
            ModifiedBaseRangeState.base.withInputValue(2, true).withInputValue(1, true, true),
            ModifiedBaseRangeState.base.withInputValue(1, true).withInputValue(2, true, false),
            ModifiedBaseRangeState.base.withInputValue(2, true).withInputValue(1, true, false),
        ];
        for (const s of states) {
            const { edit } = baseRange.getEditForBase(s);
            if (edit) {
                const resultRange = this.resultTextModelDiffs.getResultLineRange(baseRange.baseRange);
                const existingLines = resultRange.getLines(this.resultTextModel);
                if (equals(edit.newLines, existingLines, (a, b) => a === b)) {
                    return s;
                }
            }
        }
        return ModifiedBaseRangeState.unrecognized;
    }
    getState(baseRange) {
        const existingState = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (!existingState) {
            throw new BugIndicatingError('object must be from this instance');
        }
        return existingState.accepted;
    }
    setState(baseRange, state, _markInputAsHandled, tx, _pushStackElement = false) {
        if (!this.isUpToDate.get()) {
            throw new BugIndicatingError('Cannot set state while updating');
        }
        const existingState = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (!existingState) {
            throw new BugIndicatingError('object must be from this instance');
        }
        const conflictingDiffs = this.resultTextModelDiffs.findTouchingDiffs(baseRange.baseRange);
        const group = new UndoRedoGroup();
        if (conflictingDiffs) {
            this.resultTextModelDiffs.removeDiffs(conflictingDiffs, tx, group);
        }
        const { edit, effectiveState } = baseRange.getEditForBase(state);
        existingState.accepted.set(effectiveState, tx);
        existingState.previousNonDiffingState = undefined;
        existingState.computedFromDiffing = false;
        const input1Handled = existingState.handledInput1.get();
        const input2Handled = existingState.handledInput2.get();
        if (!input1Handled || !input2Handled) {
            this.undoRedoService.pushElement(new MarkAsHandledUndoRedoElement(this.resultTextModel.uri, new WeakRef(this), new WeakRef(existingState), input1Handled, input2Handled), group);
        }
        if (edit) {
            this.resultTextModel.pushStackElement();
            this.resultTextModelDiffs.applyEditRelativeToOriginal(edit, tx, group);
            this.resultTextModel.pushStackElement();
        }
        // always set conflict as handled
        existingState.handledInput1.set(true, tx);
        existingState.handledInput2.set(true, tx);
    }
    resetDirtyConflictsToBase() {
        transaction((tx) => {
            /** @description Reset Unknown Base Range States */
            this.resultTextModel.pushStackElement();
            for (const range of this.modifiedBaseRanges.get()) {
                if (this.getState(range).get().kind === ModifiedBaseRangeStateKind.unrecognized) {
                    this.setState(range, ModifiedBaseRangeState.base, false, tx, false);
                }
            }
            this.resultTextModel.pushStackElement();
        });
    }
    isHandled(baseRange) {
        return this.modifiedBaseRangeResultStates.get().get(baseRange).handled;
    }
    isInputHandled(baseRange, inputNumber) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        return inputNumber === 1 ? state.handledInput1 : state.handledInput2;
    }
    setInputHandled(baseRange, inputNumber, handled, tx) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (state.handled.get() === handled) {
            return;
        }
        const dataRef = new WeakRef(ModifiedBaseRangeData);
        const modelRef = new WeakRef(this);
        this.undoRedoService.pushElement({
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.resultTextModel.uri,
            code: 'setInputHandled',
            label: localize('setInputHandled', 'Set Input Handled'),
            redo() {
                const model = modelRef.deref();
                const data = dataRef.deref();
                if (model && !model.isDisposed() && data) {
                    transaction((tx) => {
                        if (inputNumber === 1) {
                            state.handledInput1.set(handled, tx);
                        }
                        else {
                            state.handledInput2.set(handled, tx);
                        }
                    });
                }
            },
            undo() {
                const model = modelRef.deref();
                const data = dataRef.deref();
                if (model && !model.isDisposed() && data) {
                    transaction((tx) => {
                        if (inputNumber === 1) {
                            state.handledInput1.set(!handled, tx);
                        }
                        else {
                            state.handledInput2.set(!handled, tx);
                        }
                    });
                }
            },
        });
        if (inputNumber === 1) {
            state.handledInput1.set(handled, tx);
        }
        else {
            state.handledInput2.set(handled, tx);
        }
    }
    setHandled(baseRange, handled, tx) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (state.handled.get() === handled) {
            return;
        }
        state.handledInput1.set(handled, tx);
        state.handledInput2.set(handled, tx);
    }
    setLanguageId(languageId, source) {
        const language = this.languageService.createById(languageId);
        this.base.setLanguage(language, source);
        this.input1.textModel.setLanguage(language, source);
        this.input2.textModel.setLanguage(language, source);
        this.resultTextModel.setLanguage(language, source);
    }
    getInitialResultValue() {
        const chunks = [];
        while (true) {
            const chunk = this.resultSnapshot.read();
            if (chunk === null) {
                break;
            }
            chunks.push(chunk);
        }
        return chunks.join();
    }
    async getResultValueWithConflictMarkers() {
        await waitForState(this.diffComputingState, (state) => state === 2 /* MergeEditorModelState.upToDate */);
        if (this.unhandledConflictsCount.get() === 0) {
            return this.resultTextModel.getValue();
        }
        const resultLines = this.resultTextModel.getLinesContent();
        const input1Lines = this.input1.textModel.getLinesContent();
        const input2Lines = this.input2.textModel.getLinesContent();
        const states = this.modifiedBaseRangeResultStates.get();
        const outputLines = [];
        function appendLinesToResult(source, lineRange) {
            for (let i = lineRange.startLineNumber; i < lineRange.endLineNumberExclusive; i++) {
                outputLines.push(source[i - 1]);
            }
        }
        let resultStartLineNumber = 1;
        for (const [range, state] of states) {
            if (state.handled.get()) {
                continue;
            }
            const resultRange = this.resultTextModelDiffs.getResultLineRange(range.baseRange);
            appendLinesToResult(resultLines, LineRange.fromLineNumbers(resultStartLineNumber, Math.max(resultStartLineNumber, resultRange.startLineNumber)));
            resultStartLineNumber = resultRange.endLineNumberExclusive;
            outputLines.push('<<<<<<<');
            if (state.accepted.get().kind === ModifiedBaseRangeStateKind.unrecognized) {
                // to prevent loss of data, use modified result as "ours"
                appendLinesToResult(resultLines, resultRange);
            }
            else {
                appendLinesToResult(input1Lines, range.input1Range);
            }
            outputLines.push('=======');
            appendLinesToResult(input2Lines, range.input2Range);
            outputLines.push('>>>>>>>');
        }
        appendLinesToResult(resultLines, LineRange.fromLineNumbers(resultStartLineNumber, resultLines.length + 1));
        return outputLines.join('\n');
    }
    get conflictCount() {
        return arrayCount(this.modifiedBaseRanges.get(), (r) => r.isConflicting);
    }
    get combinableConflictCount() {
        return arrayCount(this.modifiedBaseRanges.get(), (r) => r.isConflicting && r.canBeCombined);
    }
    get conflictsResolvedWithBase() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting && s.accepted.get().kind === ModifiedBaseRangeStateKind.base);
    }
    get conflictsResolvedWithInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting && s.accepted.get().kind === ModifiedBaseRangeStateKind.input1);
    }
    get conflictsResolvedWithInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting && s.accepted.get().kind === ModifiedBaseRangeStateKind.input2);
    }
    get conflictsResolvedWithSmartCombination() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.both &&
                state.smartCombination);
        });
    }
    get manuallySolvedConflictCountThatEqualNone() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting && s.accepted.get().kind === ModifiedBaseRangeStateKind.unrecognized);
    }
    get manuallySolvedConflictCountThatEqualSmartCombine() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                s.computedFromDiffing &&
                state.kind === ModifiedBaseRangeStateKind.both &&
                state.smartCombination);
        });
    }
    get manuallySolvedConflictCountThatEqualInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                s.computedFromDiffing &&
                state.kind === ModifiedBaseRangeStateKind.input1);
        });
    }
    get manuallySolvedConflictCountThatEqualInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                s.computedFromDiffing &&
                state.kind === ModifiedBaseRangeStateKind.input2);
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBase() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.unrecognized &&
                s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.base);
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.unrecognized &&
                s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.input1);
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.unrecognized &&
                s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.input2);
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.unrecognized &&
                s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.both &&
                !s.previousNonDiffingState?.smartCombination);
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return (r.isConflicting &&
                state.kind === ModifiedBaseRangeStateKind.unrecognized &&
                s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.both &&
                s.previousNonDiffingState?.smartCombination);
        });
    }
};
MergeEditorModel = __decorate([
    __param(7, ILanguageService),
    __param(8, IUndoRedoService)
], MergeEditorModel);
export { MergeEditorModel };
function arrayCount(array, predicate) {
    let count = 0;
    for (const value of array) {
        if (predicate(value)) {
            count++;
        }
    }
    return count;
}
class ModifiedBaseRangeData {
    constructor(baseRange) {
        this.baseRange = baseRange;
        this.accepted = observableValue(`BaseRangeState${this.baseRange.baseRange}`, ModifiedBaseRangeState.base);
        this.handledInput1 = observableValue(`BaseRangeHandledState${this.baseRange.baseRange}.Input1`, false);
        this.handledInput2 = observableValue(`BaseRangeHandledState${this.baseRange.baseRange}.Input2`, false);
        this.computedFromDiffing = false;
        this.previousNonDiffingState = undefined;
        this.handled = derived(this, (reader) => this.handledInput1.read(reader) && this.handledInput2.read(reader));
    }
}
export var MergeEditorModelState;
(function (MergeEditorModelState) {
    MergeEditorModelState[MergeEditorModelState["initializing"] = 1] = "initializing";
    MergeEditorModelState[MergeEditorModelState["upToDate"] = 2] = "upToDate";
    MergeEditorModelState[MergeEditorModelState["updating"] = 3] = "updating";
})(MergeEditorModelState || (MergeEditorModelState = {}));
class MarkAsHandledUndoRedoElement {
    constructor(resource, mergeEditorModelRef, stateRef, input1Handled, input2Handled) {
        this.resource = resource;
        this.mergeEditorModelRef = mergeEditorModelRef;
        this.stateRef = stateRef;
        this.input1Handled = input1Handled;
        this.input2Handled = input2Handled;
        this.code = 'undoMarkAsHandled';
        this.label = localize('undoMarkAsHandled', 'Undo Mark As Handled');
        this.type = 0 /* UndoRedoElementType.Resource */;
    }
    redo() {
        const mergeEditorModel = this.mergeEditorModelRef.deref();
        if (!mergeEditorModel || mergeEditorModel.isDisposed()) {
            return;
        }
        const state = this.stateRef.deref();
        if (!state) {
            return;
        }
        transaction((tx) => {
            state.handledInput1.set(true, tx);
            state.handledInput2.set(true, tx);
        });
    }
    undo() {
        const mergeEditorModel = this.mergeEditorModelRef.deref();
        if (!mergeEditorModel || mergeEditorModel.isDisposed()) {
            return;
        }
        const state = this.stateRef.deref();
        if (!state) {
            return;
        }
        transaction((tx) => {
            state.handledInput1.set(this.input1Handled, tx);
            state.handledInput2.set(this.input2Handled, tx);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvbWVyZ2VFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsT0FBTyxFQUtQLFlBQVksRUFDWixlQUFlLEVBQ2YsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLDBDQUEwQyxDQUFBO0FBRWpELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUVOLGdCQUFnQixFQUVoQixhQUFhLEdBQ2IsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzFDLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQTZCLGNBQWMsRUFBc0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3RDLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsc0JBQXNCLEVBQ3RCLDBCQUEw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