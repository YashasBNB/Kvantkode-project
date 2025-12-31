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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2RpZmZFZGl0b3JWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBS04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixlQUFlLEVBQ2YsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMvQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRixPQUFPLEVBQXdCLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUdwSCxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEZBQThGLENBQUE7QUFDM0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEZBQTBGLENBQUE7QUFFL0gsT0FBTyxFQUFFLHFCQUFx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