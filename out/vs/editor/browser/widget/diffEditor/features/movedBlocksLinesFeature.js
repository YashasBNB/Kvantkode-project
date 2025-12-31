/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../../base/common/actions.js';
import { booleanComparator, compareBy, numberComparator, tieBreakComparators, } from '../../../../../base/common/arrays.js';
import { findMaxIdx } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunWithStore, constObservable, derived, derivedWithStore, observableFromEvent, observableSignalFromEvent, observableValue, recomputeInitiallyAndOnChange, } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { PlaceholderViewZone, ViewZoneOverlayWidget, applyStyle, applyViewZones } from '../utils.js';
import { OffsetRange, OffsetRangeSet } from '../../../../common/core/offsetRange.js';
import { localize } from '../../../../../nls.js';
export class MovedBlocksLinesFeature extends Disposable {
    static { this.movedCodeBlockPadding = 4; }
    constructor(_rootElement, _diffModel, _originalEditorLayoutInfo, _modifiedEditorLayoutInfo, _editors) {
        super();
        this._rootElement = _rootElement;
        this._diffModel = _diffModel;
        this._originalEditorLayoutInfo = _originalEditorLayoutInfo;
        this._modifiedEditorLayoutInfo = _modifiedEditorLayoutInfo;
        this._editors = _editors;
        this._originalScrollTop = observableFromEvent(this, this._editors.original.onDidScrollChange, () => this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this, this._editors.modified.onDidScrollChange, () => this._editors.modified.getScrollTop());
        this._viewZonesChanged = observableSignalFromEvent('onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this.width = observableValue(this, 0);
        this._modifiedViewZonesChangedSignal = observableSignalFromEvent('modified.onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this._originalViewZonesChangedSignal = observableSignalFromEvent('original.onDidChangeViewZones', this._editors.original.onDidChangeViewZones);
        this._state = derivedWithStore(this, (reader, store) => {
            /** @description state */
            this._element.replaceChildren();
            const model = this._diffModel.read(reader);
            const moves = model?.diff.read(reader)?.movedTexts;
            if (!moves || moves.length === 0) {
                this.width.set(0, undefined);
                return;
            }
            this._viewZonesChanged.read(reader);
            const infoOrig = this._originalEditorLayoutInfo.read(reader);
            const infoMod = this._modifiedEditorLayoutInfo.read(reader);
            if (!infoOrig || !infoMod) {
                this.width.set(0, undefined);
                return;
            }
            this._modifiedViewZonesChangedSignal.read(reader);
            this._originalViewZonesChangedSignal.read(reader);
            const lines = moves.map((move) => {
                function computeLineStart(range, editor) {
                    const t1 = editor.getTopForLineNumber(range.startLineNumber, true);
                    const t2 = editor.getTopForLineNumber(range.endLineNumberExclusive, true);
                    return (t1 + t2) / 2;
                }
                const start = computeLineStart(move.lineRangeMapping.original, this._editors.original);
                const startOffset = this._originalScrollTop.read(reader);
                const end = computeLineStart(move.lineRangeMapping.modified, this._editors.modified);
                const endOffset = this._modifiedScrollTop.read(reader);
                const from = start - startOffset;
                const to = end - endOffset;
                const top = Math.min(start, end);
                const bottom = Math.max(start, end);
                return {
                    range: new OffsetRange(top, bottom),
                    from,
                    to,
                    fromWithoutScroll: start,
                    toWithoutScroll: end,
                    move,
                };
            });
            lines.sort(tieBreakComparators(compareBy((l) => l.fromWithoutScroll > l.toWithoutScroll, booleanComparator), compareBy((l) => l.fromWithoutScroll > l.toWithoutScroll ? l.fromWithoutScroll : -l.toWithoutScroll, numberComparator)));
            const layout = LinesLayout.compute(lines.map((l) => l.range));
            const padding = 10;
            const lineAreaLeft = infoOrig.verticalScrollbarWidth;
            const lineAreaWidth = (layout.getTrackCount() - 1) * 10 + padding * 2;
            const width = lineAreaLeft +
                lineAreaWidth +
                (infoMod.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding);
            let idx = 0;
            for (const line of lines) {
                const track = layout.getTrack(idx);
                const verticalY = lineAreaLeft + padding + track * 10;
                const arrowHeight = 15;
                const arrowWidth = 15;
                const right = width;
                const rectWidth = infoMod.glyphMarginWidth + infoMod.lineNumbersWidth;
                const rectHeight = 18;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.classList.add('arrow-rectangle');
                rect.setAttribute('x', `${right - rectWidth}`);
                rect.setAttribute('y', `${line.to - rectHeight / 2}`);
                rect.setAttribute('width', `${rectWidth}`);
                rect.setAttribute('height', `${rectHeight}`);
                this._element.appendChild(rect);
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${0} ${line.from} L ${verticalY} ${line.from} L ${verticalY} ${line.to} L ${right - arrowWidth} ${line.to}`);
                path.setAttribute('fill', 'none');
                g.appendChild(path);
                const arrowRight = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrowRight.classList.add('arrow');
                store.add(autorun((reader) => {
                    path.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                    arrowRight.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                }));
                arrowRight.setAttribute('points', `${right - arrowWidth},${line.to - arrowHeight / 2} ${right},${line.to} ${right - arrowWidth},${line.to + arrowHeight / 2}`);
                g.appendChild(arrowRight);
                this._element.appendChild(g);
                /*
                TODO@hediet
                path.addEventListener('mouseenter', () => {
                    model.setHoveredMovedText(line.move);
                });
                path.addEventListener('mouseleave', () => {
                    model.setHoveredMovedText(undefined);
                });*/
                idx++;
            }
            this.width.set(lineAreaWidth, undefined);
        });
        this._element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._element.setAttribute('class', 'moved-blocks-lines');
        this._rootElement.appendChild(this._element);
        this._register(toDisposable(() => this._element.remove()));
        this._register(autorun((reader) => {
            /** @description update moved blocks lines positioning */
            const info = this._originalEditorLayoutInfo.read(reader);
            const info2 = this._modifiedEditorLayoutInfo.read(reader);
            if (!info || !info2) {
                return;
            }
            this._element.style.left = `${info.width - info.verticalScrollbarWidth}px`;
            this._element.style.height = `${info.height}px`;
            this._element.style.width = `${info.verticalScrollbarWidth + info.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding + this.width.read(reader)}px`;
        }));
        this._register(recomputeInitiallyAndOnChange(this._state));
        const movedBlockViewZones = derived((reader) => {
            const model = this._diffModel.read(reader);
            const d = model?.diff.read(reader);
            if (!d) {
                return [];
            }
            return d.movedTexts.map((move) => ({
                move,
                original: new PlaceholderViewZone(constObservable(move.lineRangeMapping.original.startLineNumber - 1), 18),
                modified: new PlaceholderViewZone(constObservable(move.lineRangeMapping.modified.startLineNumber - 1), 18),
            }));
        });
        this._register(applyViewZones(this._editors.original, movedBlockViewZones.map((zones) => 
        /** @description movedBlockViewZones.original */ zones.map((z) => z.original))));
        this._register(applyViewZones(this._editors.modified, movedBlockViewZones.map((zones) => 
        /** @description movedBlockViewZones.modified */ zones.map((z) => z.modified))));
        this._register(autorunWithStore((reader, store) => {
            const blocks = movedBlockViewZones.read(reader);
            for (const b of blocks) {
                store.add(new MovedBlockOverlayWidget(this._editors.original, b.original, b.move, 'original', this._diffModel.get()));
                store.add(new MovedBlockOverlayWidget(this._editors.modified, b.modified, b.move, 'modified', this._diffModel.get()));
            }
        }));
        const originalHasFocus = observableSignalFromEvent('original.onDidFocusEditorWidget', (e) => this._editors.original.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        const modifiedHasFocus = observableSignalFromEvent('modified.onDidFocusEditorWidget', (e) => this._editors.modified.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        let lastChangedEditor = 'modified';
        this._register(autorunHandleChanges({
            createEmptyChangeSummary: () => undefined,
            handleChange: (ctx, summary) => {
                if (ctx.didChange(originalHasFocus)) {
                    lastChangedEditor = 'original';
                }
                if (ctx.didChange(modifiedHasFocus)) {
                    lastChangedEditor = 'modified';
                }
                return true;
            },
        }, (reader) => {
            /** @description MovedBlocksLines.setActiveMovedTextFromCursor */
            originalHasFocus.read(reader);
            modifiedHasFocus.read(reader);
            const m = this._diffModel.read(reader);
            if (!m) {
                return;
            }
            const diff = m.diff.read(reader);
            let movedText = undefined;
            if (diff && lastChangedEditor === 'original') {
                const originalPos = this._editors.originalCursor.read(reader);
                if (originalPos) {
                    movedText = diff.movedTexts.find((m) => m.lineRangeMapping.original.contains(originalPos.lineNumber));
                }
            }
            if (diff && lastChangedEditor === 'modified') {
                const modifiedPos = this._editors.modifiedCursor.read(reader);
                if (modifiedPos) {
                    movedText = diff.movedTexts.find((m) => m.lineRangeMapping.modified.contains(modifiedPos.lineNumber));
                }
            }
            if (movedText !== m.movedTextToCompare.get()) {
                m.movedTextToCompare.set(undefined, undefined);
            }
            m.setActiveMovedText(movedText);
        }));
    }
}
class LinesLayout {
    static compute(lines) {
        const setsPerTrack = [];
        const trackPerLineIdx = [];
        for (const line of lines) {
            let trackIdx = setsPerTrack.findIndex((set) => !set.intersectsStrict(line));
            if (trackIdx === -1) {
                const maxTrackCount = 6;
                if (setsPerTrack.length >= maxTrackCount) {
                    trackIdx = findMaxIdx(setsPerTrack, compareBy((set) => set.intersectWithRangeLength(line), numberComparator));
                }
                else {
                    trackIdx = setsPerTrack.length;
                    setsPerTrack.push(new OffsetRangeSet());
                }
            }
            setsPerTrack[trackIdx].addRange(line);
            trackPerLineIdx.push(trackIdx);
        }
        return new LinesLayout(setsPerTrack.length, trackPerLineIdx);
    }
    constructor(_trackCount, trackPerLineIdx) {
        this._trackCount = _trackCount;
        this.trackPerLineIdx = trackPerLineIdx;
    }
    getTrack(lineIdx) {
        return this.trackPerLineIdx[lineIdx];
    }
    getTrackCount() {
        return this._trackCount;
    }
}
class MovedBlockOverlayWidget extends ViewZoneOverlayWidget {
    constructor(_editor, _viewZone, _move, _kind, _diffModel) {
        const root = h('div.diff-hidden-lines-widget');
        super(_editor, _viewZone, root.root);
        this._editor = _editor;
        this._move = _move;
        this._kind = _kind;
        this._diffModel = _diffModel;
        this._nodes = h('div.diff-moved-code-block', { style: { marginRight: '4px' } }, [
            h('div.text-content@textContent'),
            h('div.action-bar@actionBar'),
        ]);
        root.root.appendChild(this._nodes.root);
        const editorLayout = observableFromEvent(this._editor.onDidLayoutChange, () => this._editor.getLayoutInfo());
        this._register(applyStyle(this._nodes.root, {
            paddingRight: editorLayout.map((l) => l.verticalScrollbarWidth),
        }));
        let text;
        if (_move.changes.length > 0) {
            text =
                this._kind === 'original'
                    ? localize('codeMovedToWithChanges', 'Code moved with changes to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1)
                    : localize('codeMovedFromWithChanges', 'Code moved with changes from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        else {
            text =
                this._kind === 'original'
                    ? localize('codeMovedTo', 'Code moved to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1)
                    : localize('codeMovedFrom', 'Code moved from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        const actionBar = this._register(new ActionBar(this._nodes.actionBar, {
            highlightToggledItems: true,
        }));
        const caption = new Action('', text, '', false);
        actionBar.push(caption, { icon: false, label: true });
        const actionCompare = new Action('', 'Compare', ThemeIcon.asClassName(Codicon.compareChanges), true, () => {
            this._editor.focus();
            this._diffModel.movedTextToCompare.set(this._diffModel.movedTextToCompare.get() === _move ? undefined : this._move, undefined);
        });
        this._register(autorun((reader) => {
            const isActive = this._diffModel.movedTextToCompare.read(reader) === _move;
            actionCompare.checked = isActive;
        }));
        actionBar.push(actionCompare, { icon: false, label: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZWRCbG9ja3NMaW5lc0ZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9mZWF0dXJlcy9tb3ZlZEJsb2Nrc0xpbmVzRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEdBQ25CLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsT0FBTyxFQUNQLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIseUJBQXlCLEVBQ3pCLGVBQWUsRUFDZiw2QkFBNkIsR0FDN0IsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHcEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0Ms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Q0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQzNFLFNBQVMsQ0FDVCxDQUFBO1FBQ0YsQ0FBQyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQTtZQUMxRSxhQUFhLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQTtRQUNqQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzVELENBQUM7Q0FDRCJ9