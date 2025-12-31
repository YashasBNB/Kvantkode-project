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
var HideUnchangedRegionsFeature_1;
import { $, addDisposableListener, getWindow, h, reset } from '../../../../../base/browser/dom.js';
import { renderIcon, renderLabelWithIcons, } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedDisposable, derivedWithStore, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isDefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SymbolKinds } from '../../../../common/languages.js';
import { observableCodeEditor } from '../../../observableCodeEditor.js';
import { PlaceholderViewZone, ViewZoneOverlayWidget, applyObservableDecorations, applyStyle, } from '../utils.js';
/**
 * Make sure to add the view zones to the editor!
 */
let HideUnchangedRegionsFeature = class HideUnchangedRegionsFeature extends Disposable {
    static { HideUnchangedRegionsFeature_1 = this; }
    static { this._breadcrumbsSourceFactory = observableValue(HideUnchangedRegionsFeature_1, () => ({
        dispose() { },
        getBreadcrumbItems(startRange, reader) {
            return [];
        },
    })); }
    static setBreadcrumbsSourceFactory(factory) {
        this._breadcrumbsSourceFactory.set(factory, undefined);
    }
    get isUpdatingHiddenAreas() {
        return this._isUpdatingHiddenAreas;
    }
    constructor(_editors, _diffModel, _options, _instantiationService) {
        super();
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._modifiedOutlineSource = derivedDisposable(this, (reader) => {
            const m = this._editors.modifiedModel.read(reader);
            const factory = HideUnchangedRegionsFeature_1._breadcrumbsSourceFactory.read(reader);
            return !m || !factory ? undefined : factory(m, this._instantiationService);
        });
        this._isUpdatingHiddenAreas = false;
        this._register(this._editors.original.onDidChangeCursorPosition((e) => {
            if (e.reason === 1 /* CursorChangeReason.ContentFlush */) {
                return;
            }
            const m = this._diffModel.get();
            transaction((tx) => {
                for (const s of this._editors.original.getSelections() || []) {
                    m?.ensureOriginalLineIsVisible(s.getStartPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                    m?.ensureOriginalLineIsVisible(s.getEndPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                }
            });
        }));
        this._register(this._editors.modified.onDidChangeCursorPosition((e) => {
            if (e.reason === 1 /* CursorChangeReason.ContentFlush */) {
                return;
            }
            const m = this._diffModel.get();
            transaction((tx) => {
                for (const s of this._editors.modified.getSelections() || []) {
                    m?.ensureModifiedLineIsVisible(s.getStartPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                    m?.ensureModifiedLineIsVisible(s.getEndPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                }
            });
        }));
        const unchangedRegions = this._diffModel.map((m, reader) => {
            const regions = m?.unchangedRegions.read(reader) ?? [];
            if (regions.length === 1 &&
                regions[0].modifiedLineNumber === 1 &&
                regions[0].lineCount === this._editors.modifiedModel.read(reader)?.getLineCount()) {
                return [];
            }
            return regions;
        });
        this.viewZones = derivedWithStore(this, (reader, store) => {
            /** @description view Zones */
            const modifiedOutlineSource = this._modifiedOutlineSource.read(reader);
            if (!modifiedOutlineSource) {
                return { origViewZones: [], modViewZones: [] };
            }
            const origViewZones = [];
            const modViewZones = [];
            const sideBySide = this._options.renderSideBySide.read(reader);
            const compactMode = this._options.compactMode.read(reader);
            const curUnchangedRegions = unchangedRegions.read(reader);
            for (let i = 0; i < curUnchangedRegions.length; i++) {
                const r = curUnchangedRegions[i];
                if (r.shouldHideControls(reader)) {
                    continue;
                }
                if (compactMode && (i === 0 || i === curUnchangedRegions.length - 1)) {
                    continue;
                }
                if (compactMode) {
                    {
                        const d = derived(this, (reader) => 
                        /** @description hiddenOriginalRangeStart */ r.getHiddenOriginalRange(reader)
                            .startLineNumber - 1);
                        const origVz = new PlaceholderViewZone(d, 12);
                        origViewZones.push(origVz);
                        store.add(new CompactCollapsedCodeOverlayWidget(this._editors.original, origVz, r, !sideBySide));
                    }
                    {
                        const d = derived(this, (reader) => 
                        /** @description hiddenModifiedRangeStart */ r.getHiddenModifiedRange(reader)
                            .startLineNumber - 1);
                        const modViewZone = new PlaceholderViewZone(d, 12);
                        modViewZones.push(modViewZone);
                        store.add(new CompactCollapsedCodeOverlayWidget(this._editors.modified, modViewZone, r));
                    }
                }
                else {
                    {
                        const d = derived(this, (reader) => 
                        /** @description hiddenOriginalRangeStart */ r.getHiddenOriginalRange(reader)
                            .startLineNumber - 1);
                        const origVz = new PlaceholderViewZone(d, 24);
                        origViewZones.push(origVz);
                        store.add(new CollapsedCodeOverlayWidget(this._editors.original, origVz, r, r.originalUnchangedRange, !sideBySide, modifiedOutlineSource, (l) => this._diffModel
                            .get()
                            .ensureModifiedLineIsVisible(l, 2 /* RevealPreference.FromBottom */, undefined), this._options));
                    }
                    {
                        const d = derived(this, (reader) => 
                        /** @description hiddenModifiedRangeStart */ r.getHiddenModifiedRange(reader)
                            .startLineNumber - 1);
                        const modViewZone = new PlaceholderViewZone(d, 24);
                        modViewZones.push(modViewZone);
                        store.add(new CollapsedCodeOverlayWidget(this._editors.modified, modViewZone, r, r.modifiedUnchangedRange, false, modifiedOutlineSource, (l) => this._diffModel
                            .get()
                            .ensureModifiedLineIsVisible(l, 2 /* RevealPreference.FromBottom */, undefined), this._options));
                    }
                }
            }
            return { origViewZones, modViewZones };
        });
        const unchangedLinesDecoration = {
            description: 'unchanged lines',
            className: 'diff-unchanged-lines',
            isWholeLine: true,
        };
        const unchangedLinesDecorationShow = {
            description: 'Fold Unchanged',
            glyphMarginHoverMessage: new MarkdownString(undefined, {
                isTrusted: true,
                supportThemeIcons: true,
            }).appendMarkdown(localize('foldUnchanged', 'Fold Unchanged Region')),
            glyphMarginClassName: 'fold-unchanged ' + ThemeIcon.asClassName(Codicon.fold),
            zIndex: 10001,
        };
        this._register(applyObservableDecorations(this._editors.original, derived(this, (reader) => {
            /** @description decorations */
            const curUnchangedRegions = unchangedRegions.read(reader);
            const result = curUnchangedRegions.map((r) => ({
                range: r.originalUnchangedRange.toInclusiveRange(),
                options: unchangedLinesDecoration,
            }));
            for (const r of curUnchangedRegions) {
                if (r.shouldHideControls(reader)) {
                    result.push({
                        range: Range.fromPositions(new Position(r.originalLineNumber, 1)),
                        options: unchangedLinesDecorationShow,
                    });
                }
            }
            return result;
        })));
        this._register(applyObservableDecorations(this._editors.modified, derived(this, (reader) => {
            /** @description decorations */
            const curUnchangedRegions = unchangedRegions.read(reader);
            const result = curUnchangedRegions.map((r) => ({
                range: r.modifiedUnchangedRange.toInclusiveRange(),
                options: unchangedLinesDecoration,
            }));
            for (const r of curUnchangedRegions) {
                if (r.shouldHideControls(reader)) {
                    result.push({
                        range: LineRange.ofLength(r.modifiedLineNumber, 1).toInclusiveRange(),
                        options: unchangedLinesDecorationShow,
                    });
                }
            }
            return result;
        })));
        this._register(autorun((reader) => {
            /** @description update folded unchanged regions */
            const curUnchangedRegions = unchangedRegions.read(reader);
            this._isUpdatingHiddenAreas = true;
            try {
                this._editors.original.setHiddenAreas(curUnchangedRegions
                    .map((r) => r.getHiddenOriginalRange(reader).toInclusiveRange())
                    .filter(isDefined));
                this._editors.modified.setHiddenAreas(curUnchangedRegions
                    .map((r) => r.getHiddenModifiedRange(reader).toInclusiveRange())
                    .filter(isDefined));
            }
            finally {
                this._isUpdatingHiddenAreas = false;
            }
        }));
        this._register(this._editors.modified.onMouseUp((event) => {
            if (!event.event.rightButton &&
                event.target.position &&
                event.target.element?.className.includes('fold-unchanged')) {
                const lineNumber = event.target.position.lineNumber;
                const model = this._diffModel.get();
                if (!model) {
                    return;
                }
                const region = model.unchangedRegions
                    .get()
                    .find((r) => r.modifiedUnchangedRange.includes(lineNumber));
                if (!region) {
                    return;
                }
                region.collapseAll(undefined);
                event.event.stopPropagation();
                event.event.preventDefault();
            }
        }));
        this._register(this._editors.original.onMouseUp((event) => {
            if (!event.event.rightButton &&
                event.target.position &&
                event.target.element?.className.includes('fold-unchanged')) {
                const lineNumber = event.target.position.lineNumber;
                const model = this._diffModel.get();
                if (!model) {
                    return;
                }
                const region = model.unchangedRegions
                    .get()
                    .find((r) => r.originalUnchangedRange.includes(lineNumber));
                if (!region) {
                    return;
                }
                region.collapseAll(undefined);
                event.event.stopPropagation();
                event.event.preventDefault();
            }
        }));
    }
};
HideUnchangedRegionsFeature = HideUnchangedRegionsFeature_1 = __decorate([
    __param(3, IInstantiationService)
], HideUnchangedRegionsFeature);
export { HideUnchangedRegionsFeature };
class CompactCollapsedCodeOverlayWidget extends ViewZoneOverlayWidget {
    constructor(editor, _viewZone, _unchangedRegion, _hide = false) {
        const root = h('div.diff-hidden-lines-widget');
        super(editor, _viewZone, root.root);
        this._unchangedRegion = _unchangedRegion;
        this._hide = _hide;
        this._nodes = h('div.diff-hidden-lines-compact', [
            h('div.line-left', []),
            h('div.text@text', []),
            h('div.line-right', []),
        ]);
        root.root.appendChild(this._nodes.root);
        if (this._hide) {
            this._nodes.root.replaceChildren();
        }
        this._register(autorun((reader) => {
            /** @description update labels */
            if (!this._hide) {
                const lineCount = this._unchangedRegion.getHiddenModifiedRange(reader).length;
                const linesHiddenText = localize('hiddenLines', '{0} hidden lines', lineCount);
                this._nodes.text.innerText = linesHiddenText;
            }
        }));
    }
}
class CollapsedCodeOverlayWidget extends ViewZoneOverlayWidget {
    constructor(_editor, _viewZone, _unchangedRegion, _unchangedRegionRange, _hide, _modifiedOutlineSource, _revealModifiedHiddenLine, _options) {
        const root = h('div.diff-hidden-lines-widget');
        super(_editor, _viewZone, root.root);
        this._editor = _editor;
        this._unchangedRegion = _unchangedRegion;
        this._unchangedRegionRange = _unchangedRegionRange;
        this._hide = _hide;
        this._modifiedOutlineSource = _modifiedOutlineSource;
        this._revealModifiedHiddenLine = _revealModifiedHiddenLine;
        this._options = _options;
        this._nodes = h('div.diff-hidden-lines', [
            h('div.top@top', {
                title: localize('diff.hiddenLines.top', 'Click or drag to show more above'),
            }),
            h('div.center@content', { style: { display: 'flex' } }, [
                h('div@first', {
                    style: {
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: '0',
                    },
                }, [
                    $('a', {
                        title: localize('showUnchangedRegion', 'Show Unchanged Region'),
                        role: 'button',
                        onclick: () => {
                            this._unchangedRegion.showAll(undefined);
                        },
                    }, ...renderLabelWithIcons('$(unfold)')),
                ]),
                h('div@others', {
                    style: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
                }),
            ]),
            h('div.bottom@bottom', {
                title: localize('diff.bottom', 'Click or drag to show more below'),
                role: 'button',
            }),
        ]);
        root.root.appendChild(this._nodes.root);
        if (!this._hide) {
            this._register(applyStyle(this._nodes.first, {
                width: observableCodeEditor(this._editor).layoutInfoContentLeft,
            }));
        }
        else {
            reset(this._nodes.first);
        }
        this._register(autorun((reader) => {
            /** @description Update CollapsedCodeOverlayWidget canMove* css classes */
            const isFullyRevealed = this._unchangedRegion.visibleLineCountTop.read(reader) +
                this._unchangedRegion.visibleLineCountBottom.read(reader) ===
                this._unchangedRegion.lineCount;
            this._nodes.bottom.classList.toggle('canMoveTop', !isFullyRevealed);
            this._nodes.bottom.classList.toggle('canMoveBottom', this._unchangedRegion.visibleLineCountBottom.read(reader) > 0);
            this._nodes.top.classList.toggle('canMoveTop', this._unchangedRegion.visibleLineCountTop.read(reader) > 0);
            this._nodes.top.classList.toggle('canMoveBottom', !isFullyRevealed);
            const isDragged = this._unchangedRegion.isDragged.read(reader);
            const domNode = this._editor.getDomNode();
            if (domNode) {
                domNode.classList.toggle('draggingUnchangedRegion', !!isDragged);
                if (isDragged === 'top') {
                    domNode.classList.toggle('canMoveTop', this._unchangedRegion.visibleLineCountTop.read(reader) > 0);
                    domNode.classList.toggle('canMoveBottom', !isFullyRevealed);
                }
                else if (isDragged === 'bottom') {
                    domNode.classList.toggle('canMoveTop', !isFullyRevealed);
                    domNode.classList.toggle('canMoveBottom', this._unchangedRegion.visibleLineCountBottom.read(reader) > 0);
                }
                else {
                    domNode.classList.toggle('canMoveTop', false);
                    domNode.classList.toggle('canMoveBottom', false);
                }
            }
        }));
        const editor = this._editor;
        this._register(addDisposableListener(this._nodes.top, 'mousedown', (e) => {
            if (e.button !== 0) {
                return;
            }
            this._nodes.top.classList.toggle('dragging', true);
            this._nodes.root.classList.toggle('dragging', true);
            e.preventDefault();
            const startTop = e.clientY;
            let didMove = false;
            const cur = this._unchangedRegion.visibleLineCountTop.get();
            this._unchangedRegion.isDragged.set('top', undefined);
            const window = getWindow(this._nodes.top);
            const mouseMoveListener = addDisposableListener(window, 'mousemove', (e) => {
                const currentTop = e.clientY;
                const delta = currentTop - startTop;
                didMove = didMove || Math.abs(delta) > 2;
                const lineDelta = Math.round(delta / editor.getOption(68 /* EditorOption.lineHeight */));
                const newVal = Math.max(0, Math.min(cur + lineDelta, this._unchangedRegion.getMaxVisibleLineCountTop()));
                this._unchangedRegion.visibleLineCountTop.set(newVal, undefined);
            });
            const mouseUpListener = addDisposableListener(window, 'mouseup', (e) => {
                if (!didMove) {
                    this._unchangedRegion.showMoreAbove(this._options.hideUnchangedRegionsRevealLineCount.get(), undefined);
                }
                this._nodes.top.classList.toggle('dragging', false);
                this._nodes.root.classList.toggle('dragging', false);
                this._unchangedRegion.isDragged.set(undefined, undefined);
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(addDisposableListener(this._nodes.bottom, 'mousedown', (e) => {
            if (e.button !== 0) {
                return;
            }
            this._nodes.bottom.classList.toggle('dragging', true);
            this._nodes.root.classList.toggle('dragging', true);
            e.preventDefault();
            const startTop = e.clientY;
            let didMove = false;
            const cur = this._unchangedRegion.visibleLineCountBottom.get();
            this._unchangedRegion.isDragged.set('bottom', undefined);
            const window = getWindow(this._nodes.bottom);
            const mouseMoveListener = addDisposableListener(window, 'mousemove', (e) => {
                const currentTop = e.clientY;
                const delta = currentTop - startTop;
                didMove = didMove || Math.abs(delta) > 2;
                const lineDelta = Math.round(delta / editor.getOption(68 /* EditorOption.lineHeight */));
                const newVal = Math.max(0, Math.min(cur - lineDelta, this._unchangedRegion.getMaxVisibleLineCountBottom()));
                const top = this._unchangedRegionRange.endLineNumberExclusive > editor.getModel().getLineCount()
                    ? editor.getContentHeight()
                    : editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                this._unchangedRegion.visibleLineCountBottom.set(newVal, undefined);
                const top2 = this._unchangedRegionRange.endLineNumberExclusive > editor.getModel().getLineCount()
                    ? editor.getContentHeight()
                    : editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                editor.setScrollTop(editor.getScrollTop() + (top2 - top));
            });
            const mouseUpListener = addDisposableListener(window, 'mouseup', (e) => {
                this._unchangedRegion.isDragged.set(undefined, undefined);
                if (!didMove) {
                    const top = editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                    this._unchangedRegion.showMoreBelow(this._options.hideUnchangedRegionsRevealLineCount.get(), undefined);
                    const top2 = editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                    editor.setScrollTop(editor.getScrollTop() + (top2 - top));
                }
                this._nodes.bottom.classList.toggle('dragging', false);
                this._nodes.root.classList.toggle('dragging', false);
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(autorun((reader) => {
            /** @description update labels */
            const children = [];
            if (!this._hide) {
                const lineCount = _unchangedRegion.getHiddenModifiedRange(reader).length;
                const linesHiddenText = localize('hiddenLines', '{0} hidden lines', lineCount);
                const span = $('span', { title: localize('diff.hiddenLines.expandAll', 'Double click to unfold') }, linesHiddenText);
                span.addEventListener('dblclick', (e) => {
                    if (e.button !== 0) {
                        return;
                    }
                    e.preventDefault();
                    this._unchangedRegion.showAll(undefined);
                });
                children.push(span);
                const range = this._unchangedRegion.getHiddenModifiedRange(reader);
                const items = this._modifiedOutlineSource.getBreadcrumbItems(range, reader);
                if (items.length > 0) {
                    children.push($('span', undefined, '\u00a0\u00a0|\u00a0\u00a0'));
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const icon = SymbolKinds.toIcon(item.kind);
                        const divItem = h('div.breadcrumb-item', {
                            style: { display: 'flex', alignItems: 'center' },
                        }, [
                            renderIcon(icon),
                            '\u00a0',
                            item.name,
                            ...(i === items.length - 1 ? [] : [renderIcon(Codicon.chevronRight)]),
                        ]).root;
                        children.push(divItem);
                        divItem.onclick = () => {
                            this._revealModifiedHiddenLine(item.startLineNumber);
                        };
                    }
                }
            }
            reset(this._nodes.others, ...children);
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZVVuY2hhbmdlZFJlZ2lvbnNGZWF0dXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZmVhdHVyZXMvaGlkZVVuY2hhbmdlZFJlZ2lvbnNGZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEcsT0FBTyxFQUNOLFVBQVUsRUFDVixvQkFBb0IsR0FDcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBR04sT0FBTyxFQUNQLE9BQU8sRUFDUCxpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFL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