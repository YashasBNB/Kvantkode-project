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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZVVuY2hhbmdlZFJlZ2lvbnNGZWF0dXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9mZWF0dXJlcy9oaWRlVW5jaGFuZ2VkUmVnaW9uc0ZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sVUFBVSxFQUNWLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFHTixPQUFPLEVBQ1AsT0FBTyxFQUNQLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFF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