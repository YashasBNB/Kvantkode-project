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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdSdWxlckZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9mZWF0dXJlcy9vdmVydmlld1J1bGVyRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsNkJBQTZCLEVBQzdCLENBQUMsR0FDRCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUzRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUVOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLG1CQUFtQixFQUNuQix5QkFBeUIsR0FDekIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUlqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLFlBQVksRUFDWix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLFdBQVcsR0FDWCxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7O2FBQzNCLHVCQUFrQixHQUFHLEVBQUUsQUFBTCxDQUFLO2FB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