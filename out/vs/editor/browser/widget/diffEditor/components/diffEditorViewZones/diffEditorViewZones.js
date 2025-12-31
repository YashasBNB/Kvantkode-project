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
import { $, addDisposableListener } from '../../../../../../base/browser/dom.js';
import { ArrayQueue } from '../../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedWithStore, observableFromEvent, observableValue, } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { assertIsDefined } from '../../../../../../base/common/types.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { diffDeleteDecoration, diffRemoveIcon } from '../../registrations.contribution.js';
import { DiffMapping } from '../../diffEditorViewModel.js';
import { InlineDiffDeletedCodeMargin } from './inlineDiffDeletedCodeMargin.js';
import { LineSource, RenderOptions, renderLines } from './renderLines.js';
import { animatedObservable, joinCombine } from '../../utils.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Position } from '../../../../../common/core/position.js';
import { InlineDecoration } from '../../../../../common/viewModel.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Range } from '../../../../../common/core/range.js';
/**
 * Ensures both editors have the same height by aligning unchanged lines.
 * In inline view mode, inserts viewzones to show deleted code from the original text model in the modified code editor.
 * Synchronizes scrolling.
 *
 * Make sure to add the view zones!
 */
let DiffEditorViewZones = class DiffEditorViewZones extends Disposable {
    constructor(_targetWindow, _editors, _diffModel, _options, _diffEditorWidget, _canIgnoreViewZoneUpdateEvent, _origViewZonesToIgnore, _modViewZonesToIgnore, _clipboardService, _contextMenuService) {
        super();
        this._targetWindow = _targetWindow;
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._diffEditorWidget = _diffEditorWidget;
        this._canIgnoreViewZoneUpdateEvent = _canIgnoreViewZoneUpdateEvent;
        this._origViewZonesToIgnore = _origViewZonesToIgnore;
        this._modViewZonesToIgnore = _modViewZonesToIgnore;
        this._clipboardService = _clipboardService;
        this._contextMenuService = _contextMenuService;
        this._originalTopPadding = observableValue(this, 0);
        this._originalScrollOffset = observableValue(this, 0);
        this._originalScrollOffsetAnimated = animatedObservable(this._targetWindow, this._originalScrollOffset, this._store);
        this._modifiedTopPadding = observableValue(this, 0);
        this._modifiedScrollOffset = observableValue(this, 0);
        this._modifiedScrollOffsetAnimated = animatedObservable(this._targetWindow, this._modifiedScrollOffset, this._store);
        const state = observableValue('invalidateAlignmentsState', 0);
        const updateImmediately = this._register(new RunOnceScheduler(() => {
            state.set(state.get() + 1, undefined);
        }, 0));
        this._register(this._editors.original.onDidChangeViewZones((_args) => {
            if (!this._canIgnoreViewZoneUpdateEvent()) {
                updateImmediately.schedule();
            }
        }));
        this._register(this._editors.modified.onDidChangeViewZones((_args) => {
            if (!this._canIgnoreViewZoneUpdateEvent()) {
                updateImmediately.schedule();
            }
        }));
        this._register(this._editors.original.onDidChangeConfiguration((args) => {
            if (args.hasChanged(152 /* EditorOption.wrappingInfo */) ||
                args.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        this._register(this._editors.modified.onDidChangeConfiguration((args) => {
            if (args.hasChanged(152 /* EditorOption.wrappingInfo */) ||
                args.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        const originalModelTokenizationCompleted = this._diffModel
            .map((m) => m
            ? observableFromEvent(this, m.model.original.onDidChangeTokens, () => m.model.original.tokenization.backgroundTokenizationState ===
                2 /* BackgroundTokenizationState.Completed */)
            : undefined)
            .map((m, reader) => m?.read(reader));
        const alignments = derived((reader) => {
            /** @description alignments */
            const diffModel = this._diffModel.read(reader);
            const diff = diffModel?.diff.read(reader);
            if (!diffModel || !diff) {
                return null;
            }
            state.read(reader);
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const innerHunkAlignment = renderSideBySide;
            return computeRangeAlignment(this._editors.original, this._editors.modified, diff.mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, innerHunkAlignment);
        });
        const alignmentsSyncedMovedText = derived((reader) => {
            /** @description alignmentsSyncedMovedText */
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            if (!syncedMovedText) {
                return null;
            }
            state.read(reader);
            const mappings = syncedMovedText.changes.map((c) => new DiffMapping(c));
            // TODO dont include alignments outside syncedMovedText
            return computeRangeAlignment(this._editors.original, this._editors.modified, mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, true);
        });
        function createFakeLinesDiv() {
            const r = document.createElement('div');
            r.className = 'diagonal-fill';
            return r;
        }
        const alignmentViewZonesDisposables = this._register(new DisposableStore());
        this.viewZones = derivedWithStore(this, (reader, store) => {
            alignmentViewZonesDisposables.clear();
            const alignmentsVal = alignments.read(reader) || [];
            const origViewZones = [];
            const modViewZones = [];
            const modifiedTopPaddingVal = this._modifiedTopPadding.read(reader);
            if (modifiedTopPaddingVal > 0) {
                modViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: modifiedTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const originalTopPaddingVal = this._originalTopPadding.read(reader);
            if (originalTopPaddingVal > 0) {
                origViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: originalTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const deletedCodeLineBreaksComputer = !renderSideBySide
                ? this._editors.modified._getViewModel()?.createLineBreaksComputer()
                : undefined;
            if (deletedCodeLineBreaksComputer) {
                const originalModel = this._editors.original.getModel();
                for (const a of alignmentsVal) {
                    if (a.diff) {
                        for (let i = a.originalRange.startLineNumber; i < a.originalRange.endLineNumberExclusive; i++) {
                            // `i` can be out of bound when the diff has not been updated yet.
                            // In this case, we do an early return.
                            // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                            if (i > originalModel.getLineCount()) {
                                return { orig: origViewZones, mod: modViewZones };
                            }
                            deletedCodeLineBreaksComputer?.addRequest(originalModel.getLineContent(i), null, null);
                        }
                    }
                }
            }
            const lineBreakData = deletedCodeLineBreaksComputer?.finalize() ?? [];
            let lineBreakDataIdx = 0;
            const modLineHeight = this._editors.modified.getOption(68 /* EditorOption.lineHeight */);
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            const mightContainNonBasicASCII = this._editors.original.getModel()?.mightContainNonBasicASCII() ?? false;
            const mightContainRTL = this._editors.original.getModel()?.mightContainRTL() ?? false;
            const renderOptions = RenderOptions.fromEditor(this._editors.modified);
            for (const a of alignmentsVal) {
                if (a.diff &&
                    !renderSideBySide &&
                    (!this._options.useTrueInlineDiffRendering.read(reader) ||
                        !allowsTrueInlineDiffRendering(a.diff))) {
                    if (!a.originalRange.isEmpty) {
                        originalModelTokenizationCompleted.read(reader); // Update view-zones once tokenization completes
                        const deletedCodeDomNode = document.createElement('div');
                        deletedCodeDomNode.classList.add('view-lines', 'line-delete', 'monaco-mouse-cursor-text');
                        const originalModel = this._editors.original.getModel();
                        // `a.originalRange` can be out of bound when the diff has not been updated yet.
                        // In this case, we do an early return.
                        // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                        if (a.originalRange.endLineNumberExclusive - 1 > originalModel.getLineCount()) {
                            return { orig: origViewZones, mod: modViewZones };
                        }
                        const source = new LineSource(a.originalRange.mapToLineArray((l) => originalModel.tokenization.getLineTokens(l)), a.originalRange.mapToLineArray((_) => lineBreakData[lineBreakDataIdx++]), mightContainNonBasicASCII, mightContainRTL);
                        const decorations = [];
                        for (const i of a.diff.innerChanges || []) {
                            decorations.push(new InlineDecoration(i.originalRange.delta(-(a.diff.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        }
                        const result = renderLines(source, renderOptions, decorations, deletedCodeDomNode);
                        const marginDomNode = document.createElement('div');
                        marginDomNode.className = 'inline-deleted-margin-view-zone';
                        applyFontInfo(marginDomNode, renderOptions.fontInfo);
                        if (this._options.renderIndicators.read(reader)) {
                            for (let i = 0; i < result.heightInLines; i++) {
                                const marginElement = document.createElement('div');
                                marginElement.className = `delete-sign ${ThemeIcon.asClassName(diffRemoveIcon)}`;
                                marginElement.setAttribute('style', `position:absolute;top:${i * modLineHeight}px;width:${renderOptions.lineDecorationsWidth}px;height:${modLineHeight}px;right:0;`);
                                marginDomNode.appendChild(marginElement);
                            }
                        }
                        let zoneId = undefined;
                        alignmentViewZonesDisposables.add(new InlineDiffDeletedCodeMargin(() => assertIsDefined(zoneId), marginDomNode, this._editors.modified, a.diff, this._diffEditorWidget, result.viewLineCounts, this._editors.original.getModel(), this._contextMenuService, this._clipboardService));
                        for (let i = 0; i < result.viewLineCounts.length; i++) {
                            const count = result.viewLineCounts[i];
                            // Account for wrapped lines in the (collapsed) original editor (which doesn't wrap lines).
                            if (count > 1) {
                                origViewZones.push({
                                    afterLineNumber: a.originalRange.startLineNumber + i,
                                    domNode: createFakeLinesDiv(),
                                    heightInPx: (count - 1) * modLineHeight,
                                    showInHiddenAreas: true,
                                    suppressMouseDown: true,
                                });
                            }
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.startLineNumber - 1,
                            domNode: deletedCodeDomNode,
                            heightInPx: result.heightInLines * modLineHeight,
                            minWidthInPx: result.minWidthInPx,
                            marginDomNode,
                            setZoneId(id) {
                                zoneId = id;
                            },
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    const marginDomNode = document.createElement('div');
                    marginDomNode.className = 'gutter-delete';
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: a.modifiedHeightInPx,
                        marginDomNode,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                    if (delta > 0) {
                        if (syncedMovedText?.lineRangeMapping.original
                            .delta(-1)
                            .deltaLength(2)
                            .contains(a.originalRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        origViewZones.push({
                            afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: delta,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    else {
                        if (syncedMovedText?.lineRangeMapping.modified
                            .delta(-1)
                            .deltaLength(2)
                            .contains(a.modifiedRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        function createViewZoneMarginArrow() {
                            const arrow = document.createElement('div');
                            arrow.className = 'arrow-revert-change ' + ThemeIcon.asClassName(Codicon.arrowRight);
                            store.add(addDisposableListener(arrow, 'mousedown', (e) => e.stopPropagation()));
                            store.add(addDisposableListener(arrow, 'click', (e) => {
                                e.stopPropagation();
                                _diffEditorWidget.revert(a.diff);
                            }));
                            return $('div', {}, arrow);
                        }
                        let marginDomNode = undefined;
                        if (a.diff &&
                            a.diff.modified.isEmpty &&
                            this._options.shouldRenderOldRevertArrows.read(reader)) {
                            marginDomNode = createViewZoneMarginArrow();
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: -delta,
                            marginDomNode,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                }
            }
            for (const a of alignmentsSyncedMovedText.read(reader) ?? []) {
                if (!syncedMovedText?.lineRangeMapping.original.intersect(a.originalRange) ||
                    !syncedMovedText?.lineRangeMapping.modified.intersect(a.modifiedRange)) {
                    // ignore unrelated alignments outside the synced moved text
                    continue;
                }
                const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                if (delta > 0) {
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    modViewZones.push({
                        afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: -delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
            }
            return { orig: origViewZones, mod: modViewZones };
        });
        let ignoreChange = false;
        this._register(this._editors.original.onDidScrollChange((e) => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.modified.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._register(this._editors.modified.onDidScrollChange((e) => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.original.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._originalScrollTop = observableFromEvent(this._editors.original.onDidScrollChange, () => 
        /** @description original.getScrollTop */ this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this._editors.modified.onDidScrollChange, () => 
        /** @description modified.getScrollTop */ this._editors.modified.getScrollTop());
        // origExtraHeight + origOffset - origScrollTop = modExtraHeight + modOffset - modScrollTop
        // origScrollTop = origExtraHeight + origOffset - modExtraHeight - modOffset + modScrollTop
        // modScrollTop = modExtraHeight + modOffset - origExtraHeight - origOffset + origScrollTop
        // origOffset - modOffset = heightOfLines(1..Y) - heightOfLines(1..X)
        // origScrollTop >= 0, modScrollTop >= 0
        this._register(autorun((reader) => {
            /** @description update scroll modified */
            const newScrollTopModified = this._originalScrollTop.read(reader) -
                (this._originalScrollOffsetAnimated.get() -
                    this._modifiedScrollOffsetAnimated.read(reader)) -
                (this._originalTopPadding.get() - this._modifiedTopPadding.read(reader));
            if (newScrollTopModified !== this._editors.modified.getScrollTop()) {
                this._editors.modified.setScrollTop(newScrollTopModified, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun((reader) => {
            /** @description update scroll original */
            const newScrollTopOriginal = this._modifiedScrollTop.read(reader) -
                (this._modifiedScrollOffsetAnimated.get() -
                    this._originalScrollOffsetAnimated.read(reader)) -
                (this._modifiedTopPadding.get() - this._originalTopPadding.read(reader));
            if (newScrollTopOriginal !== this._editors.original.getScrollTop()) {
                this._editors.original.setScrollTop(newScrollTopOriginal, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun((reader) => {
            /** @description update editor top offsets */
            const m = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            let deltaOrigToMod = 0;
            if (m) {
                const trueTopOriginal = this._editors.original.getTopForLineNumber(m.lineRangeMapping.original.startLineNumber, true) - this._originalTopPadding.get();
                const trueTopModified = this._editors.modified.getTopForLineNumber(m.lineRangeMapping.modified.startLineNumber, true) - this._modifiedTopPadding.get();
                deltaOrigToMod = trueTopModified - trueTopOriginal;
            }
            if (deltaOrigToMod > 0) {
                this._modifiedTopPadding.set(0, undefined);
                this._originalTopPadding.set(deltaOrigToMod, undefined);
            }
            else if (deltaOrigToMod < 0) {
                this._modifiedTopPadding.set(-deltaOrigToMod, undefined);
                this._originalTopPadding.set(0, undefined);
            }
            else {
                setTimeout(() => {
                    this._modifiedTopPadding.set(0, undefined);
                    this._originalTopPadding.set(0, undefined);
                }, 400);
            }
            if (this._editors.modified.hasTextFocus()) {
                this._originalScrollOffset.set(this._modifiedScrollOffset.get() - deltaOrigToMod, undefined, true);
            }
            else {
                this._modifiedScrollOffset.set(this._originalScrollOffset.get() + deltaOrigToMod, undefined, true);
            }
        }));
    }
};
DiffEditorViewZones = __decorate([
    __param(8, IClipboardService),
    __param(9, IContextMenuService)
], DiffEditorViewZones);
export { DiffEditorViewZones };
function computeRangeAlignment(originalEditor, modifiedEditor, diffs, originalEditorAlignmentViewZones, modifiedEditorAlignmentViewZones, innerHunkAlignment) {
    const originalLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(originalEditor, originalEditorAlignmentViewZones));
    const modifiedLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(modifiedEditor, modifiedEditorAlignmentViewZones));
    const origLineHeight = originalEditor.getOption(68 /* EditorOption.lineHeight */);
    const modLineHeight = modifiedEditor.getOption(68 /* EditorOption.lineHeight */);
    const result = [];
    let lastOriginalLineNumber = 0;
    let lastModifiedLineNumber = 0;
    function handleAlignmentsOutsideOfDiffs(untilOriginalLineNumberExclusive, untilModifiedLineNumberExclusive) {
        while (true) {
            let origNext = originalLineHeightOverrides.peek();
            let modNext = modifiedLineHeightOverrides.peek();
            if (origNext && origNext.lineNumber >= untilOriginalLineNumberExclusive) {
                origNext = undefined;
            }
            if (modNext && modNext.lineNumber >= untilModifiedLineNumberExclusive) {
                modNext = undefined;
            }
            if (!origNext && !modNext) {
                break;
            }
            const distOrig = origNext ? origNext.lineNumber - lastOriginalLineNumber : Number.MAX_VALUE;
            const distNext = modNext ? modNext.lineNumber - lastModifiedLineNumber : Number.MAX_VALUE;
            if (distOrig < distNext) {
                originalLineHeightOverrides.dequeue();
                modNext = {
                    lineNumber: origNext.lineNumber - lastOriginalLineNumber + lastModifiedLineNumber,
                    heightInPx: 0,
                };
            }
            else if (distOrig > distNext) {
                modifiedLineHeightOverrides.dequeue();
                origNext = {
                    lineNumber: modNext.lineNumber - lastModifiedLineNumber + lastOriginalLineNumber,
                    heightInPx: 0,
                };
            }
            else {
                originalLineHeightOverrides.dequeue();
                modifiedLineHeightOverrides.dequeue();
            }
            result.push({
                originalRange: LineRange.ofLength(origNext.lineNumber, 1),
                modifiedRange: LineRange.ofLength(modNext.lineNumber, 1),
                originalHeightInPx: origLineHeight + origNext.heightInPx,
                modifiedHeightInPx: modLineHeight + modNext.heightInPx,
                diff: undefined,
            });
        }
    }
    for (const m of diffs) {
        const c = m.lineRangeMapping;
        handleAlignmentsOutsideOfDiffs(c.original.startLineNumber, c.modified.startLineNumber);
        let first = true;
        let lastModLineNumber = c.modified.startLineNumber;
        let lastOrigLineNumber = c.original.startLineNumber;
        function emitAlignment(origLineNumberExclusive, modLineNumberExclusive, forceAlignment = false) {
            if (origLineNumberExclusive < lastOrigLineNumber ||
                modLineNumberExclusive < lastModLineNumber) {
                return;
            }
            if (first) {
                first = false;
            }
            else if (!forceAlignment &&
                (origLineNumberExclusive === lastOrigLineNumber ||
                    modLineNumberExclusive === lastModLineNumber)) {
                // This causes a re-alignment of an already aligned line.
                // However, we don't care for the final alignment.
                return;
            }
            const originalRange = new LineRange(lastOrigLineNumber, origLineNumberExclusive);
            const modifiedRange = new LineRange(lastModLineNumber, modLineNumberExclusive);
            if (originalRange.isEmpty && modifiedRange.isEmpty) {
                return;
            }
            const originalAdditionalHeight = originalLineHeightOverrides
                .takeWhile((v) => v.lineNumber < origLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            const modifiedAdditionalHeight = modifiedLineHeightOverrides
                .takeWhile((v) => v.lineNumber < modLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            result.push({
                originalRange,
                modifiedRange,
                originalHeightInPx: originalRange.length * origLineHeight + originalAdditionalHeight,
                modifiedHeightInPx: modifiedRange.length * modLineHeight + modifiedAdditionalHeight,
                diff: m.lineRangeMapping,
            });
            lastOrigLineNumber = origLineNumberExclusive;
            lastModLineNumber = modLineNumberExclusive;
        }
        if (innerHunkAlignment) {
            for (const i of c.innerChanges || []) {
                if (i.originalRange.startColumn > 1 && i.modifiedRange.startColumn > 1) {
                    // There is some unmodified text on this line before the diff
                    emitAlignment(i.originalRange.startLineNumber, i.modifiedRange.startLineNumber);
                }
                const originalModel = originalEditor.getModel();
                // When the diff is invalid, the ranges might be out of bounds (this should be fixed in the diff model by applying edits directly).
                const maxColumn = i.originalRange.endLineNumber <= originalModel.getLineCount()
                    ? originalModel.getLineMaxColumn(i.originalRange.endLineNumber)
                    : Number.MAX_SAFE_INTEGER;
                if (i.originalRange.endColumn < maxColumn) {
                    // // There is some unmodified text on this line after the diff
                    emitAlignment(i.originalRange.endLineNumber, i.modifiedRange.endLineNumber);
                }
            }
        }
        emitAlignment(c.original.endLineNumberExclusive, c.modified.endLineNumberExclusive, true);
        lastOriginalLineNumber = c.original.endLineNumberExclusive;
        lastModifiedLineNumber = c.modified.endLineNumberExclusive;
    }
    handleAlignmentsOutsideOfDiffs(Number.MAX_VALUE, Number.MAX_VALUE);
    return result;
}
function getAdditionalLineHeights(editor, viewZonesToIgnore) {
    const viewZoneHeights = [];
    const wrappingZoneHeights = [];
    const hasWrapping = editor.getOption(152 /* EditorOption.wrappingInfo */).wrappingColumn !== -1;
    const coordinatesConverter = editor._getViewModel().coordinatesConverter;
    const editorLineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
    if (hasWrapping) {
        for (let i = 1; i <= editor.getModel().getLineCount(); i++) {
            const lineCount = coordinatesConverter.getModelLineViewLineCount(i);
            if (lineCount > 1) {
                wrappingZoneHeights.push({ lineNumber: i, heightInPx: editorLineHeight * (lineCount - 1) });
            }
        }
    }
    for (const w of editor.getWhitespaces()) {
        if (viewZonesToIgnore.has(w.id)) {
            continue;
        }
        const modelLineNumber = w.afterLineNumber === 0
            ? 0
            : coordinatesConverter.convertViewPositionToModelPosition(new Position(w.afterLineNumber, 1)).lineNumber;
        viewZoneHeights.push({ lineNumber: modelLineNumber, heightInPx: w.height });
    }
    const result = joinCombine(viewZoneHeights, wrappingZoneHeights, (v) => v.lineNumber, (v1, v2) => ({ lineNumber: v1.lineNumber, heightInPx: v1.heightInPx + v2.heightInPx }));
    return result;
}
export function allowsTrueInlineDiffRendering(mapping) {
    if (!mapping.innerChanges) {
        return false;
    }
    return mapping.innerChanges.every((c) => (rangeIsSingleLine(c.modifiedRange) && rangeIsSingleLine(c.originalRange)) ||
        c.originalRange.equalsRange(new Range(1, 1, 1, 1)));
}
export function rangeIsSingleLine(range) {
    return range.startLineNumber === range.endLineNumber;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdab25lcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvclZpZXdab25lcy9kaWZmRWRpdG9yVmlld1pvbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDeEYsT0FBTyxFQUVOLE9BQU8sRUFDUCxPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFMUYsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVB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