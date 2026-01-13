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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableSignal, observableSignalFromEvent, observableValue, transaction, waitForState, } from '../../../../base/common/observable.js';
import { IDiffProviderFactoryService } from './diffProviderFactoryService.js';
import { filterWithPrevious } from './utils.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { LineRange, LineRangeSet } from '../../../common/core/lineRange.js';
import { DefaultLinesDiffComputer } from '../../../common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { DetailedLineRangeMapping, LineRangeMapping, RangeMapping, } from '../../../common/diff/rangeMapping.js';
import { TextEditInfo } from '../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { combineTextEditInfos } from '../../../common/model/bracketPairsTextModelPart/bracketPairsTree/combineTextEditInfos.js';
import { optimizeSequenceDiffs } from '../../../common/diff/defaultLinesDiffComputer/heuristicSequenceOptimizations.js';
import { isDefined } from '../../../../base/common/types.js';
import { groupAdjacentBy } from '../../../../base/common/arrays.js';
import { softAssert } from '../../../../base/common/assert.js';
let DiffEditorViewModel = class DiffEditorViewModel extends Disposable {
    setActiveMovedText(movedText) {
        this._activeMovedText.set(movedText, undefined);
    }
    setHoveredMovedText(movedText) {
        this._hoveredMovedText.set(movedText, undefined);
    }
    constructor(model, _options, _diffProviderFactoryService) {
        super();
        this.model = model;
        this._options = _options;
        this._diffProviderFactoryService = _diffProviderFactoryService;
        this._isDiffUpToDate = observableValue(this, false);
        this.isDiffUpToDate = this._isDiffUpToDate;
        this._diff = observableValue(this, undefined);
        this.diff = this._diff;
        this._unchangedRegions = observableValue(this, undefined);
        this.unchangedRegions = derived(this, (r) => {
            if (this._options.hideUnchangedRegions.read(r)) {
                return this._unchangedRegions.read(r)?.regions ?? [];
            }
            else {
                // Reset state
                transaction((tx) => {
                    for (const r of this._unchangedRegions.get()?.regions || []) {
                        r.collapseAll(tx);
                    }
                });
                return [];
            }
        });
        this.movedTextToCompare = observableValue(this, undefined);
        this._activeMovedText = observableValue(this, undefined);
        this._hoveredMovedText = observableValue(this, undefined);
        this.activeMovedText = derived(this, (r) => this.movedTextToCompare.read(r) ??
            this._hoveredMovedText.read(r) ??
            this._activeMovedText.read(r));
        this._cancellationTokenSource = new CancellationTokenSource();
        this._diffProvider = derived(this, (reader) => {
            const diffProvider = this._diffProviderFactoryService.createDiffProvider({
                diffAlgorithm: this._options.diffAlgorithm.read(reader),
            });
            const onChangeSignal = observableSignalFromEvent('onDidChange', diffProvider.onDidChange);
            return {
                diffProvider,
                onChangeSignal,
            };
        });
        this._register(toDisposable(() => this._cancellationTokenSource.cancel()));
        const contentChangedSignal = observableSignal('contentChangedSignal');
        const debouncer = this._register(new RunOnceScheduler(() => contentChangedSignal.trigger(undefined), 200));
        this._register(autorun((reader) => {
            /** @description collapse touching unchanged ranges */
            const lastUnchangedRegions = this._unchangedRegions.read(reader);
            if (!lastUnchangedRegions ||
                lastUnchangedRegions.regions.some((r) => r.isDragged.read(reader))) {
                return;
            }
            const lastUnchangedRegionsOrigRanges = lastUnchangedRegions.originalDecorationIds
                .map((id) => model.original.getDecorationRange(id))
                .map((r) => (r ? LineRange.fromRangeInclusive(r) : undefined));
            const lastUnchangedRegionsModRanges = lastUnchangedRegions.modifiedDecorationIds
                .map((id) => model.modified.getDecorationRange(id))
                .map((r) => (r ? LineRange.fromRangeInclusive(r) : undefined));
            const updatedLastUnchangedRegions = lastUnchangedRegions.regions
                .map((r, idx) => !lastUnchangedRegionsOrigRanges[idx] || !lastUnchangedRegionsModRanges[idx]
                ? undefined
                : new UnchangedRegion(lastUnchangedRegionsOrigRanges[idx].startLineNumber, lastUnchangedRegionsModRanges[idx].startLineNumber, lastUnchangedRegionsOrigRanges[idx].length, r.visibleLineCountTop.read(reader), r.visibleLineCountBottom.read(reader)))
                .filter(isDefined);
            const newRanges = [];
            let didChange = false;
            for (const touching of groupAdjacentBy(updatedLastUnchangedRegions, (a, b) => a.getHiddenModifiedRange(reader).endLineNumberExclusive ===
                b.getHiddenModifiedRange(reader).startLineNumber)) {
                if (touching.length > 1) {
                    didChange = true;
                    const sumLineCount = touching.reduce((sum, r) => sum + r.lineCount, 0);
                    const r = new UnchangedRegion(touching[0].originalLineNumber, touching[0].modifiedLineNumber, sumLineCount, touching[0].visibleLineCountTop.get(), touching[touching.length - 1].visibleLineCountBottom.get());
                    newRanges.push(r);
                }
                else {
                    newRanges.push(touching[0]);
                }
            }
            if (didChange) {
                const originalDecorationIds = model.original.deltaDecorations(lastUnchangedRegions.originalDecorationIds, newRanges.map((r) => ({
                    range: r.originalUnchangedRange.toInclusiveRange(),
                    options: { description: 'unchanged' },
                })));
                const modifiedDecorationIds = model.modified.deltaDecorations(lastUnchangedRegions.modifiedDecorationIds, newRanges.map((r) => ({
                    range: r.modifiedUnchangedRange.toInclusiveRange(),
                    options: { description: 'unchanged' },
                })));
                transaction((tx) => {
                    this._unchangedRegions.set({
                        regions: newRanges,
                        originalDecorationIds,
                        modifiedDecorationIds,
                    }, tx);
                });
            }
        }));
        const updateUnchangedRegions = (result, tx, reader) => {
            const newUnchangedRegions = UnchangedRegion.fromDiffs(result.changes, model.original.getLineCount(), model.modified.getLineCount(), this._options.hideUnchangedRegionsMinimumLineCount.read(reader), this._options.hideUnchangedRegionsContextLineCount.read(reader));
            // Transfer state from cur state
            let visibleRegions = undefined;
            const lastUnchangedRegions = this._unchangedRegions.get();
            if (lastUnchangedRegions) {
                const lastUnchangedRegionsOrigRanges = lastUnchangedRegions.originalDecorationIds
                    .map((id) => model.original.getDecorationRange(id))
                    .map((r) => (r ? LineRange.fromRangeInclusive(r) : undefined));
                const lastUnchangedRegionsModRanges = lastUnchangedRegions.modifiedDecorationIds
                    .map((id) => model.modified.getDecorationRange(id))
                    .map((r) => (r ? LineRange.fromRangeInclusive(r) : undefined));
                const updatedLastUnchangedRegions = filterWithPrevious(lastUnchangedRegions.regions
                    .map((r, idx) => {
                    if (!lastUnchangedRegionsOrigRanges[idx] || !lastUnchangedRegionsModRanges[idx]) {
                        return undefined;
                    }
                    const length = lastUnchangedRegionsOrigRanges[idx].length;
                    return new UnchangedRegion(lastUnchangedRegionsOrigRanges[idx].startLineNumber, lastUnchangedRegionsModRanges[idx].startLineNumber, length, 
                    // The visible area can shrink by edits -> we have to account for this
                    Math.min(r.visibleLineCountTop.get(), length), Math.min(r.visibleLineCountBottom.get(), length - r.visibleLineCountTop.get()));
                })
                    .filter(isDefined), (cur, prev) => !prev ||
                    (cur.modifiedLineNumber >= prev.modifiedLineNumber + prev.lineCount &&
                        cur.originalLineNumber >= prev.originalLineNumber + prev.lineCount));
                let hiddenRegions = updatedLastUnchangedRegions.map((r) => new LineRangeMapping(r.getHiddenOriginalRange(reader), r.getHiddenModifiedRange(reader)));
                hiddenRegions = LineRangeMapping.clip(hiddenRegions, LineRange.ofLength(1, model.original.getLineCount()), LineRange.ofLength(1, model.modified.getLineCount()));
                visibleRegions = LineRangeMapping.inverse(hiddenRegions, model.original.getLineCount(), model.modified.getLineCount());
            }
            const newUnchangedRegions2 = [];
            if (visibleRegions) {
                for (const r of newUnchangedRegions) {
                    const intersecting = visibleRegions.filter((f) => f.original.intersectsStrict(r.originalUnchangedRange) &&
                        f.modified.intersectsStrict(r.modifiedUnchangedRange));
                    newUnchangedRegions2.push(...r.setVisibleRanges(intersecting, tx));
                }
            }
            else {
                newUnchangedRegions2.push(...newUnchangedRegions);
            }
            const originalDecorationIds = model.original.deltaDecorations(lastUnchangedRegions?.originalDecorationIds || [], newUnchangedRegions2.map((r) => ({
                range: r.originalUnchangedRange.toInclusiveRange(),
                options: { description: 'unchanged' },
            })));
            const modifiedDecorationIds = model.modified.deltaDecorations(lastUnchangedRegions?.modifiedDecorationIds || [], newUnchangedRegions2.map((r) => ({
                range: r.modifiedUnchangedRange.toInclusiveRange(),
                options: { description: 'unchanged' },
            })));
            this._unchangedRegions.set({
                regions: newUnchangedRegions2,
                originalDecorationIds,
                modifiedDecorationIds,
            }, tx);
        };
        this._register(model.modified.onDidChangeContent((e) => {
            const diff = this._diff.get();
            if (diff) {
                const textEdits = TextEditInfo.fromModelContentChanges(e.changes);
                const result = applyModifiedEdits(this._lastDiff, textEdits, model.original, model.modified);
                if (result) {
                    this._lastDiff = result;
                    transaction((tx) => {
                        this._diff.set(DiffState.fromDiffResult(this._lastDiff), tx);
                        updateUnchangedRegions(result, tx);
                        const currentSyncedMovedText = this.movedTextToCompare.get();
                        this.movedTextToCompare.set(currentSyncedMovedText
                            ? this._lastDiff.moves.find((m) => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified))
                            : undefined, tx);
                    });
                }
            }
            this._isDiffUpToDate.set(false, undefined);
            debouncer.schedule();
        }));
        this._register(model.original.onDidChangeContent((e) => {
            const diff = this._diff.get();
            if (diff) {
                const textEdits = TextEditInfo.fromModelContentChanges(e.changes);
                const result = applyOriginalEdits(this._lastDiff, textEdits, model.original, model.modified);
                if (result) {
                    this._lastDiff = result;
                    transaction((tx) => {
                        this._diff.set(DiffState.fromDiffResult(this._lastDiff), tx);
                        updateUnchangedRegions(result, tx);
                        const currentSyncedMovedText = this.movedTextToCompare.get();
                        this.movedTextToCompare.set(currentSyncedMovedText
                            ? this._lastDiff.moves.find((m) => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified))
                            : undefined, tx);
                    });
                }
            }
            this._isDiffUpToDate.set(false, undefined);
            debouncer.schedule();
        }));
        this._register(autorunWithStore(async (reader, store) => {
            /** @description compute diff */
            // So that they get recomputed when these settings change
            this._options.hideUnchangedRegionsMinimumLineCount.read(reader);
            this._options.hideUnchangedRegionsContextLineCount.read(reader);
            debouncer.cancel();
            contentChangedSignal.read(reader);
            const documentDiffProvider = this._diffProvider.read(reader);
            documentDiffProvider.onChangeSignal.read(reader);
            readHotReloadableExport(DefaultLinesDiffComputer, reader);
            readHotReloadableExport(optimizeSequenceDiffs, reader);
            this._isDiffUpToDate.set(false, undefined);
            let originalTextEditInfos = [];
            store.add(model.original.onDidChangeContent((e) => {
                const edits = TextEditInfo.fromModelContentChanges(e.changes);
                originalTextEditInfos = combineTextEditInfos(originalTextEditInfos, edits);
            }));
            let modifiedTextEditInfos = [];
            store.add(model.modified.onDidChangeContent((e) => {
                const edits = TextEditInfo.fromModelContentChanges(e.changes);
                modifiedTextEditInfos = combineTextEditInfos(modifiedTextEditInfos, edits);
            }));
            let result = await documentDiffProvider.diffProvider.computeDiff(model.original, model.modified, {
                ignoreTrimWhitespace: this._options.ignoreTrimWhitespace.read(reader),
                maxComputationTimeMs: this._options.maxComputationTimeMs.read(reader),
                computeMoves: this._options.showMoves.read(reader),
            }, this._cancellationTokenSource.token);
            if (this._cancellationTokenSource.token.isCancellationRequested) {
                return;
            }
            if (model.original.isDisposed() || model.modified.isDisposed()) {
                // TODO@hediet fishy?
                return;
            }
            result = normalizeDocumentDiff(result, model.original, model.modified);
            result =
                applyOriginalEdits(result, originalTextEditInfos, model.original, model.modified) ??
                    result;
            result =
                applyModifiedEdits(result, modifiedTextEditInfos, model.original, model.modified) ??
                    result;
            transaction((tx) => {
                /** @description write diff result */
                updateUnchangedRegions(result, tx);
                this._lastDiff = result;
                const state = DiffState.fromDiffResult(result);
                this._diff.set(state, tx);
                this._isDiffUpToDate.set(true, tx);
                const currentSyncedMovedText = this.movedTextToCompare.get();
                this.movedTextToCompare.set(currentSyncedMovedText
                    ? this._lastDiff.moves.find((m) => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified))
                    : undefined, tx);
            });
        }));
    }
    ensureModifiedLineIsVisible(lineNumber, preference, tx) {
        if (this.diff.get()?.mappings.length === 0) {
            return;
        }
        const unchangedRegions = this._unchangedRegions.get()?.regions || [];
        for (const r of unchangedRegions) {
            if (r.getHiddenModifiedRange(undefined).contains(lineNumber)) {
                r.showModifiedLine(lineNumber, preference, tx);
                return;
            }
        }
    }
    ensureOriginalLineIsVisible(lineNumber, preference, tx) {
        if (this.diff.get()?.mappings.length === 0) {
            return;
        }
        const unchangedRegions = this._unchangedRegions.get()?.regions || [];
        for (const r of unchangedRegions) {
            if (r.getHiddenOriginalRange(undefined).contains(lineNumber)) {
                r.showOriginalLine(lineNumber, preference, tx);
                return;
            }
        }
    }
    async waitForDiff() {
        await waitForState(this.isDiffUpToDate, (s) => s);
    }
    serializeState() {
        const regions = this._unchangedRegions.get();
        return {
            collapsedRegions: regions?.regions.map((r) => ({
                range: r.getHiddenModifiedRange(undefined).serialize(),
            })),
        };
    }
    restoreSerializedState(state) {
        const ranges = state.collapsedRegions?.map((r) => LineRange.deserialize(r.range));
        const regions = this._unchangedRegions.get();
        if (!regions || !ranges) {
            return;
        }
        transaction((tx) => {
            for (const r of regions.regions) {
                for (const range of ranges) {
                    if (r.modifiedUnchangedRange.intersect(range)) {
                        r.setHiddenModifiedRange(range, tx);
                        break;
                    }
                }
            }
        });
    }
};
DiffEditorViewModel = __decorate([
    __param(2, IDiffProviderFactoryService)
], DiffEditorViewModel);
export { DiffEditorViewModel };
function normalizeDocumentDiff(diff, original, modified) {
    return {
        changes: diff.changes.map((c) => new DetailedLineRangeMapping(c.original, c.modified, c.innerChanges
            ? c.innerChanges.map((i) => normalizeRangeMapping(i, original, modified))
            : undefined)),
        moves: diff.moves,
        identical: diff.identical,
        quitEarly: diff.quitEarly,
    };
}
function normalizeRangeMapping(rangeMapping, original, modified) {
    let originalRange = rangeMapping.originalRange;
    let modifiedRange = rangeMapping.modifiedRange;
    if (originalRange.startColumn === 1 &&
        modifiedRange.startColumn === 1 &&
        (originalRange.endColumn !== 1 || modifiedRange.endColumn !== 1) &&
        originalRange.endColumn === original.getLineMaxColumn(originalRange.endLineNumber) &&
        modifiedRange.endColumn === modified.getLineMaxColumn(modifiedRange.endLineNumber) &&
        originalRange.endLineNumber < original.getLineCount() &&
        modifiedRange.endLineNumber < modified.getLineCount()) {
        originalRange = originalRange.setEndPosition(originalRange.endLineNumber + 1, 1);
        modifiedRange = modifiedRange.setEndPosition(modifiedRange.endLineNumber + 1, 1);
    }
    return new RangeMapping(originalRange, modifiedRange);
}
export class DiffState {
    static fromDiffResult(result) {
        return new DiffState(result.changes.map((c) => new DiffMapping(c)), result.moves || [], result.identical, result.quitEarly);
    }
    constructor(mappings, movedTexts, identical, quitEarly) {
        this.mappings = mappings;
        this.movedTexts = movedTexts;
        this.identical = identical;
        this.quitEarly = quitEarly;
    }
}
export class DiffMapping {
    constructor(lineRangeMapping) {
        this.lineRangeMapping = lineRangeMapping;
        /*
        readonly movedTo: MovedText | undefined,
        readonly movedFrom: MovedText | undefined,

        if (movedTo) {
            assertFn(() =>
                movedTo.lineRangeMapping.modifiedRange.equals(lineRangeMapping.modifiedRange)
                && lineRangeMapping.originalRange.isEmpty
                && !movedFrom
            );
        } else if (movedFrom) {
            assertFn(() =>
                movedFrom.lineRangeMapping.originalRange.equals(lineRangeMapping.originalRange)
                && lineRangeMapping.modifiedRange.isEmpty
                && !movedTo
            );
        }
        */
    }
}
export class UnchangedRegion {
    static fromDiffs(changes, originalLineCount, modifiedLineCount, minHiddenLineCount, minContext) {
        const inversedMappings = DetailedLineRangeMapping.inverse(changes, originalLineCount, modifiedLineCount);
        const result = [];
        for (const mapping of inversedMappings) {
            let origStart = mapping.original.startLineNumber;
            let modStart = mapping.modified.startLineNumber;
            let length = mapping.original.length;
            const atStart = origStart === 1 && modStart === 1;
            const atEnd = origStart + length === originalLineCount + 1 && modStart + length === modifiedLineCount + 1;
            if ((atStart || atEnd) && length >= minContext + minHiddenLineCount) {
                if (atStart && !atEnd) {
                    length -= minContext;
                }
                if (atEnd && !atStart) {
                    origStart += minContext;
                    modStart += minContext;
                    length -= minContext;
                }
                result.push(new UnchangedRegion(origStart, modStart, length, 0, 0));
            }
            else if (length >= minContext * 2 + minHiddenLineCount) {
                origStart += minContext;
                modStart += minContext;
                length -= minContext * 2;
                result.push(new UnchangedRegion(origStart, modStart, length, 0, 0));
            }
        }
        return result;
    }
    get originalUnchangedRange() {
        return LineRange.ofLength(this.originalLineNumber, this.lineCount);
    }
    get modifiedUnchangedRange() {
        return LineRange.ofLength(this.modifiedLineNumber, this.lineCount);
    }
    constructor(originalLineNumber, modifiedLineNumber, lineCount, visibleLineCountTop, visibleLineCountBottom) {
        this.originalLineNumber = originalLineNumber;
        this.modifiedLineNumber = modifiedLineNumber;
        this.lineCount = lineCount;
        this._visibleLineCountTop = observableValue(this, 0);
        this.visibleLineCountTop = this._visibleLineCountTop;
        this._visibleLineCountBottom = observableValue(this, 0);
        this.visibleLineCountBottom = this._visibleLineCountBottom;
        this._shouldHideControls = derived(this, (reader /** @description isVisible */) => this.visibleLineCountTop.read(reader) + this.visibleLineCountBottom.read(reader) ===
            this.lineCount && !this.isDragged.read(reader));
        this.isDragged = observableValue(this, undefined);
        const visibleLineCountTop2 = Math.max(Math.min(visibleLineCountTop, this.lineCount), 0);
        const visibleLineCountBottom2 = Math.max(Math.min(visibleLineCountBottom, this.lineCount - visibleLineCountTop), 0);
        softAssert(visibleLineCountTop === visibleLineCountTop2);
        softAssert(visibleLineCountBottom === visibleLineCountBottom2);
        this._visibleLineCountTop.set(visibleLineCountTop2, undefined);
        this._visibleLineCountBottom.set(visibleLineCountBottom2, undefined);
    }
    setVisibleRanges(visibleRanges, tx) {
        const result = [];
        const hiddenModified = new LineRangeSet(visibleRanges.map((r) => r.modified)).subtractFrom(this.modifiedUnchangedRange);
        let originalStartLineNumber = this.originalLineNumber;
        let modifiedStartLineNumber = this.modifiedLineNumber;
        const modifiedEndLineNumberEx = this.modifiedLineNumber + this.lineCount;
        if (hiddenModified.ranges.length === 0) {
            this.showAll(tx);
            result.push(this);
        }
        else {
            let i = 0;
            for (const r of hiddenModified.ranges) {
                const isLast = i === hiddenModified.ranges.length - 1;
                i++;
                const length = (isLast ? modifiedEndLineNumberEx : r.endLineNumberExclusive) - modifiedStartLineNumber;
                const newR = new UnchangedRegion(originalStartLineNumber, modifiedStartLineNumber, length, 0, 0);
                newR.setHiddenModifiedRange(r, tx);
                result.push(newR);
                originalStartLineNumber = newR.originalUnchangedRange.endLineNumberExclusive;
                modifiedStartLineNumber = newR.modifiedUnchangedRange.endLineNumberExclusive;
            }
        }
        return result;
    }
    shouldHideControls(reader) {
        return this._shouldHideControls.read(reader);
    }
    getHiddenOriginalRange(reader) {
        return LineRange.ofLength(this.originalLineNumber + this._visibleLineCountTop.read(reader), this.lineCount -
            this._visibleLineCountTop.read(reader) -
            this._visibleLineCountBottom.read(reader));
    }
    getHiddenModifiedRange(reader) {
        return LineRange.ofLength(this.modifiedLineNumber + this._visibleLineCountTop.read(reader), this.lineCount -
            this._visibleLineCountTop.read(reader) -
            this._visibleLineCountBottom.read(reader));
    }
    setHiddenModifiedRange(range, tx) {
        const visibleLineCountTop = range.startLineNumber - this.modifiedLineNumber;
        const visibleLineCountBottom = this.modifiedLineNumber + this.lineCount - range.endLineNumberExclusive;
        this.setState(visibleLineCountTop, visibleLineCountBottom, tx);
    }
    getMaxVisibleLineCountTop() {
        return this.lineCount - this._visibleLineCountBottom.get();
    }
    getMaxVisibleLineCountBottom() {
        return this.lineCount - this._visibleLineCountTop.get();
    }
    showMoreAbove(count = 10, tx) {
        const maxVisibleLineCountTop = this.getMaxVisibleLineCountTop();
        this._visibleLineCountTop.set(Math.min(this._visibleLineCountTop.get() + count, maxVisibleLineCountTop), tx);
    }
    showMoreBelow(count = 10, tx) {
        const maxVisibleLineCountBottom = this.lineCount - this._visibleLineCountTop.get();
        this._visibleLineCountBottom.set(Math.min(this._visibleLineCountBottom.get() + count, maxVisibleLineCountBottom), tx);
    }
    showAll(tx) {
        this._visibleLineCountBottom.set(this.lineCount - this._visibleLineCountTop.get(), tx);
    }
    showModifiedLine(lineNumber, preference, tx) {
        const top = lineNumber + 1 - (this.modifiedLineNumber + this._visibleLineCountTop.get());
        const bottom = this.modifiedLineNumber - this._visibleLineCountBottom.get() + this.lineCount - lineNumber;
        if ((preference === 0 /* RevealPreference.FromCloserSide */ && top < bottom) ||
            preference === 1 /* RevealPreference.FromTop */) {
            this._visibleLineCountTop.set(this._visibleLineCountTop.get() + top, tx);
        }
        else {
            this._visibleLineCountBottom.set(this._visibleLineCountBottom.get() + bottom, tx);
        }
    }
    showOriginalLine(lineNumber, preference, tx) {
        const top = lineNumber - this.originalLineNumber;
        const bottom = this.originalLineNumber + this.lineCount - lineNumber;
        if ((preference === 0 /* RevealPreference.FromCloserSide */ && top < bottom) ||
            preference === 1 /* RevealPreference.FromTop */) {
            this._visibleLineCountTop.set(Math.min(this._visibleLineCountTop.get() + bottom - top, this.getMaxVisibleLineCountTop()), tx);
        }
        else {
            this._visibleLineCountBottom.set(Math.min(this._visibleLineCountBottom.get() + top - bottom, this.getMaxVisibleLineCountBottom()), tx);
        }
    }
    collapseAll(tx) {
        this._visibleLineCountTop.set(0, tx);
        this._visibleLineCountBottom.set(0, tx);
    }
    setState(visibleLineCountTop, visibleLineCountBottom, tx) {
        visibleLineCountTop = Math.max(Math.min(visibleLineCountTop, this.lineCount), 0);
        visibleLineCountBottom = Math.max(Math.min(visibleLineCountBottom, this.lineCount - visibleLineCountTop), 0);
        this._visibleLineCountTop.set(visibleLineCountTop, tx);
        this._visibleLineCountBottom.set(visibleLineCountBottom, tx);
    }
}
export var RevealPreference;
(function (RevealPreference) {
    RevealPreference[RevealPreference["FromCloserSide"] = 0] = "FromCloserSide";
    RevealPreference[RevealPreference["FromTop"] = 1] = "FromTop";
    RevealPreference[RevealPreference["FromBottom"] = 2] = "FromBottom";
})(RevealPreference || (RevealPreference = {}));
function applyOriginalEdits(diff, textEdits, originalTextModel, modifiedTextModel) {
    return undefined;
    /*
    TODO@hediet
    if (textEdits.length === 0) {
        return diff;
    }

    const diff2 = flip(diff);
    const diff3 = applyModifiedEdits(diff2, textEdits, modifiedTextModel, originalTextModel);
    if (!diff3) {
        return undefined;
    }
    return flip(diff3);*/
}
/*
function flip(diff: IDocumentDiff): IDocumentDiff {
    return {
        changes: diff.changes.map(c => c.flip()),
        moves: diff.moves.map(m => m.flip()),
        identical: diff.identical,
        quitEarly: diff.quitEarly,
    };
}
*/
function applyModifiedEdits(diff, textEdits, originalTextModel, modifiedTextModel) {
    return undefined;
    /*
    TODO@hediet
    if (textEdits.length === 0) {
        return diff;
    }
    if (diff.changes.some(c => !c.innerChanges) || diff.moves.length > 0) {
        // TODO support these cases
        return undefined;
    }

    const changes = applyModifiedEditsToLineRangeMappings(diff.changes, textEdits, originalTextModel, modifiedTextModel);

    const moves = diff.moves.map(m => {
        const newModifiedRange = applyEditToLineRange(m.lineRangeMapping.modified, textEdits);
        return newModifiedRange ? new MovedText(
            new SimpleLineRangeMapping(m.lineRangeMapping.original, newModifiedRange),
            applyModifiedEditsToLineRangeMappings(m.changes, textEdits, originalTextModel, modifiedTextModel),
        ) : undefined;
    }).filter(isDefined);

    return {
        identical: false,
        quitEarly: false,
        changes,
        moves,
    };*/
}
/*
function applyEditToLineRange(range: LineRange, textEdits: TextEditInfo[]): LineRange | undefined {
    let rangeStartLineNumber = range.startLineNumber;
    let rangeEndLineNumberEx = range.endLineNumberExclusive;

    for (let i = textEdits.length - 1; i >= 0; i--) {
        const textEdit = textEdits[i];
        const textEditStartLineNumber = lengthGetLineCount(textEdit.startOffset) + 1;
        const textEditEndLineNumber = lengthGetLineCount(textEdit.endOffset) + 1;
        const newLengthLineCount = lengthGetLineCount(textEdit.newLength);
        const delta = newLengthLineCount - (textEditEndLineNumber - textEditStartLineNumber);

        if (textEditEndLineNumber < rangeStartLineNumber) {
            // the text edit is before us
            rangeStartLineNumber += delta;
            rangeEndLineNumberEx += delta;
        } else if (textEditStartLineNumber > rangeEndLineNumberEx) {
            // the text edit is after us
            // NOOP
        } else if (textEditStartLineNumber < rangeStartLineNumber && rangeEndLineNumberEx < textEditEndLineNumber) {
            // the range is fully contained in the text edit
            return undefined;
        } else if (textEditStartLineNumber < rangeStartLineNumber && textEditEndLineNumber <= rangeEndLineNumberEx) {
            // the text edit ends inside our range
            rangeStartLineNumber = textEditEndLineNumber + 1;
            rangeStartLineNumber += delta;
            rangeEndLineNumberEx += delta;
        } else if (rangeStartLineNumber <= textEditStartLineNumber && textEditEndLineNumber < rangeStartLineNumber) {
            // the text edit starts inside our range
            rangeEndLineNumberEx = textEditStartLineNumber;
        } else {
            rangeEndLineNumberEx += delta;
        }
    }

    return new LineRange(rangeStartLineNumber, rangeEndLineNumberEx);
}

function applyModifiedEditsToLineRangeMappings(changes: readonly LineRangeMapping[], textEdits: TextEditInfo[], originalTextModel: ITextModel, modifiedTextModel: ITextModel): LineRangeMapping[] {
    const diffTextEdits = changes.flatMap(c => c.innerChanges!.map(c => new TextEditInfo(
        positionToLength(c.originalRange.getStartPosition()),
        positionToLength(c.originalRange.getEndPosition()),
        lengthOfRange(c.modifiedRange).toLength(),
    )));

    const combined = combineTextEditInfos(diffTextEdits, textEdits);

    let lastOriginalEndOffset = lengthZero;
    let lastModifiedEndOffset = lengthZero;
    const rangeMappings = combined.map(c => {
        const modifiedStartOffset = lengthAdd(lastModifiedEndOffset, lengthDiffNonNegative(lastOriginalEndOffset, c.startOffset));
        lastOriginalEndOffset = c.endOffset;
        lastModifiedEndOffset = lengthAdd(modifiedStartOffset, c.newLength);

        return new RangeMapping(
            Range.fromPositions(lengthToPosition(c.startOffset), lengthToPosition(c.endOffset)),
            Range.fromPositions(lengthToPosition(modifiedStartOffset), lengthToPosition(lastModifiedEndOffset)),
        );
    });

    const newChanges = lineRangeMappingFromRangeMappings(
        rangeMappings,
        originalTextModel.getLinesContent(),
        modifiedTextModel.getLinesContent(),
    );
    return newChanges;
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZGlmZkVkaXRvclZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFLTixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIseUJBQXlCLEVBQ3pCLGVBQWUsRUFDZixXQUFXLEVBQ1gsWUFBWSxHQUNaLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQy9DLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JGLE9BQU8sRUFBd0IsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBR3BILE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4RkFBOEYsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwRkFBMEYsQ0FB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