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
var OverviewRulerFeature_1;
import { EventType, addDisposableListener, addStandardDisposableListener, h, } from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { ScrollbarState } from '../../../../../base/browser/ui/scrollbar/scrollbarState.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableSignalFromEvent, } from '../../../../../base/common/observable.js';
import { appendRemoveOnDispose } from '../utils.js';
import { Position } from '../../../../common/core/position.js';
import { OverviewRulerZone } from '../../../../common/viewModel/overviewZoneManager.js';
import { defaultInsertColor, defaultRemoveColor, diffInserted, diffOverviewRulerInserted, diffOverviewRulerRemoved, diffRemoved, } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
let OverviewRulerFeature = class OverviewRulerFeature extends Disposable {
    static { OverviewRulerFeature_1 = this; }
    static { this.ONE_OVERVIEW_WIDTH = 15; }
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = this.ONE_OVERVIEW_WIDTH * 2; }
    constructor(_editors, _rootElement, _diffModel, _rootWidth, _rootHeight, _modifiedEditorLayoutInfo, _themeService) {
        super();
        this._editors = _editors;
        this._rootElement = _rootElement;
        this._diffModel = _diffModel;
        this._rootWidth = _rootWidth;
        this._rootHeight = _rootHeight;
        this._modifiedEditorLayoutInfo = _modifiedEditorLayoutInfo;
        this._themeService = _themeService;
        this.width = OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH;
        const currentColorTheme = observableFromEvent(this._themeService.onDidColorThemeChange, () => this._themeService.getColorTheme());
        const currentColors = derived((reader) => {
            /** @description colors */
            const theme = currentColorTheme.read(reader);
            const insertColor = theme.getColor(diffOverviewRulerInserted) ||
                (theme.getColor(diffInserted) || defaultInsertColor).transparent(2);
            const removeColor = theme.getColor(diffOverviewRulerRemoved) ||
                (theme.getColor(diffRemoved) || defaultRemoveColor).transparent(2);
            return { insertColor, removeColor };
        });
        const viewportDomElement = createFastDomNode(document.createElement('div'));
        viewportDomElement.setClassName('diffViewport');
        viewportDomElement.setPosition('absolute');
        const diffOverviewRoot = h('div.diffOverview', {
            style: {
                position: 'absolute',
                top: '0px',
                width: OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH + 'px',
            },
        }).root;
        this._register(appendRemoveOnDispose(diffOverviewRoot, viewportDomElement.domNode));
        this._register(addStandardDisposableListener(diffOverviewRoot, EventType.POINTER_DOWN, (e) => {
            this._editors.modified.delegateVerticalScrollbarPointerDown(e);
        }));
        this._register(addDisposableListener(diffOverviewRoot, EventType.MOUSE_WHEEL, (e) => {
            this._editors.modified.delegateScrollFromMouseWheelEvent(e);
        }, { passive: false }));
        this._register(appendRemoveOnDispose(this._rootElement, diffOverviewRoot));
        this._register(autorunWithStore((reader, store) => {
            /** @description recreate overview rules when model changes */
            const m = this._diffModel.read(reader);
            const originalOverviewRuler = this._editors.original.createOverviewRuler('original diffOverviewRuler');
            if (originalOverviewRuler) {
                store.add(originalOverviewRuler);
                store.add(appendRemoveOnDispose(diffOverviewRoot, originalOverviewRuler.getDomNode()));
            }
            const modifiedOverviewRuler = this._editors.modified.createOverviewRuler('modified diffOverviewRuler');
            if (modifiedOverviewRuler) {
                store.add(modifiedOverviewRuler);
                store.add(appendRemoveOnDispose(diffOverviewRoot, modifiedOverviewRuler.getDomNode()));
            }
            if (!originalOverviewRuler || !modifiedOverviewRuler) {
                // probably no model
                return;
            }
            const origViewZonesChanged = observableSignalFromEvent('viewZoneChanged', this._editors.original.onDidChangeViewZones);
            const modViewZonesChanged = observableSignalFromEvent('viewZoneChanged', this._editors.modified.onDidChangeViewZones);
            const origHiddenRangesChanged = observableSignalFromEvent('hiddenRangesChanged', this._editors.original.onDidChangeHiddenAreas);
            const modHiddenRangesChanged = observableSignalFromEvent('hiddenRangesChanged', this._editors.modified.onDidChangeHiddenAreas);
            store.add(autorun((reader) => {
                /** @description set overview ruler zones */
                origViewZonesChanged.read(reader);
                modViewZonesChanged.read(reader);
                origHiddenRangesChanged.read(reader);
                modHiddenRangesChanged.read(reader);
                const colors = currentColors.read(reader);
                const diff = m?.diff.read(reader)?.mappings;
                function createZones(ranges, color, editor) {
                    const vm = editor._getViewModel();
                    if (!vm) {
                        return [];
                    }
                    return ranges
                        .filter((d) => d.length > 0)
                        .map((r) => {
                        const start = vm.coordinatesConverter.convertModelPositionToViewPosition(new Position(r.startLineNumber, 1));
                        const end = vm.coordinatesConverter.convertModelPositionToViewPosition(new Position(r.endLineNumberExclusive, 1));
                        // By computing the lineCount, we won't ask the view model later for the bottom vertical position.
                        // (The view model will take into account the alignment viewzones, which will give
                        // modifications and deletetions always the same height.)
                        const lineCount = end.lineNumber - start.lineNumber;
                        return new OverviewRulerZone(start.lineNumber, end.lineNumber, lineCount, color.toString());
                    });
                }
                const originalZones = createZones((diff || []).map((d) => d.lineRangeMapping.original), colors.removeColor, this._editors.original);
                const modifiedZones = createZones((diff || []).map((d) => d.lineRangeMapping.modified), colors.insertColor, this._editors.modified);
                originalOverviewRuler?.setZones(originalZones);
                modifiedOverviewRuler?.setZones(modifiedZones);
            }));
            store.add(autorun((reader) => {
                /** @description layout overview ruler */
                const height = this._rootHeight.read(reader);
                const width = this._rootWidth.read(reader);
                const layoutInfo = this._modifiedEditorLayoutInfo.read(reader);
                if (layoutInfo) {
                    const freeSpace = OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH -
                        2 * OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH;
                    originalOverviewRuler.setLayout({
                        top: 0,
                        height: height,
                        right: freeSpace + OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                        width: OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                    });
                    modifiedOverviewRuler.setLayout({
                        top: 0,
                        height: height,
                        right: 0,
                        width: OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                    });
                    const scrollTop = this._editors.modifiedScrollTop.read(reader);
                    const scrollHeight = this._editors.modifiedScrollHeight.read(reader);
                    const scrollBarOptions = this._editors.modified.getOption(108 /* EditorOption.scrollbar */);
                    const state = new ScrollbarState(scrollBarOptions.verticalHasArrows ? scrollBarOptions.arrowSize : 0, scrollBarOptions.verticalScrollbarSize, 0, layoutInfo.height, scrollHeight, scrollTop);
                    viewportDomElement.setTop(state.getSliderPosition());
                    viewportDomElement.setHeight(state.getSliderSize());
                }
                else {
                    viewportDomElement.setTop(0);
                    viewportDomElement.setHeight(0);
                }
                diffOverviewRoot.style.height = height + 'px';
                diffOverviewRoot.style.left =
                    width - OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH + 'px';
                viewportDomElement.setWidth(OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH);
            }));
        }));
    }
};
OverviewRulerFeature = OverviewRulerFeature_1 = __decorate([
    __param(6, IThemeService)
], OverviewRulerFeature);
export { OverviewRulerFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdSdWxlckZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2ZlYXR1cmVzL292ZXJ2aWV3UnVsZXJGZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sU0FBUyxFQUNULHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IsQ0FBQyxHQUNELE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AsbUJBQW1CLEVBQ25CLHlCQUF5QixHQUN6QixNQUFNLDBDQUEwQyxDQUFBO0FBSWpELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUduRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdkYsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIsV0FBVyxHQUNYLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRTdFLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFDM0IsdUJBQWtCLEdBQUcsRUFBRSxBQUFMLENB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