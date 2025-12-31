/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { Sash, } from '../../../../base/browser/ui/sash/sash.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { IdGenerator } from '../../../../base/common/idGenerator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import * as objects from '../../../../base/common/objects.js';
import './zoneWidget.css';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
const defaultColor = new Color(new RGBA(0, 122, 204));
const defaultOptions = {
    showArrow: true,
    showFrame: true,
    className: '',
    frameColor: defaultColor,
    arrowColor: defaultColor,
    keepEditorSelection: false,
};
const WIDGET_ID = 'vs.editor.contrib.zoneWidget';
class ViewZoneDelegate {
    constructor(domNode, afterLineNumber, afterColumn, heightInLines, onDomNodeTop, onComputedHeight, showInHiddenAreas, ordinal) {
        this.id = ''; // A valid zone id should be greater than 0
        this.domNode = domNode;
        this.afterLineNumber = afterLineNumber;
        this.afterColumn = afterColumn;
        this.heightInLines = heightInLines;
        this.showInHiddenAreas = showInHiddenAreas;
        this.ordinal = ordinal;
        this._onDomNodeTop = onDomNodeTop;
        this._onComputedHeight = onComputedHeight;
    }
    onDomNodeTop(top) {
        this._onDomNodeTop(top);
    }
    onComputedHeight(height) {
        this._onComputedHeight(height);
    }
}
export class OverlayWidgetDelegate {
    constructor(id, domNode) {
        this._id = id;
        this._domNode = domNode;
    }
    getId() {
        return this._id;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return null;
    }
}
class Arrow {
    static { this._IdGenerator = new IdGenerator('.arrow-decoration-'); }
    constructor(_editor) {
        this._editor = _editor;
        this._ruleName = Arrow._IdGenerator.nextId();
        this._color = null;
        this._height = -1;
        this._decorations = this._editor.createDecorationsCollection();
    }
    dispose() {
        this.hide();
        domStylesheetsJs.removeCSSRulesContainingSelector(this._ruleName);
    }
    set color(value) {
        if (this._color !== value) {
            this._color = value;
            this._updateStyle();
        }
    }
    set height(value) {
        if (this._height !== value) {
            this._height = value;
            this._updateStyle();
        }
    }
    _updateStyle() {
        domStylesheetsJs.removeCSSRulesContainingSelector(this._ruleName);
        domStylesheetsJs.createCSSRule(`.monaco-editor ${this._ruleName}`, `border-style: solid; border-color: transparent; border-bottom-color: ${this._color}; border-width: ${this._height}px; bottom: -${this._height}px !important; margin-left: -${this._height}px; `);
    }
    show(where) {
        if (where.column === 1) {
            // the arrow isn't pretty at column 1 and we need to push it out a little
            where = { lineNumber: where.lineNumber, column: 2 };
        }
        this._decorations.set([
            {
                range: Range.fromPositions(where),
                options: {
                    description: 'zone-widget-arrow',
                    className: this._ruleName,
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                },
            },
        ]);
    }
    hide() {
        this._decorations.clear();
    }
}
export class ZoneWidget {
    constructor(editor, options = {}) {
        this._arrow = null;
        this._overlayWidget = null;
        this._resizeSash = null;
        this._isSashResizeHeight = false;
        this._viewZone = null;
        this._disposables = new DisposableStore();
        this.container = null;
        this._isShowing = false;
        this.editor = editor;
        this._positionMarkerId = this.editor.createDecorationsCollection();
        this.options = objects.deepClone(options);
        objects.mixin(this.options, defaultOptions, false);
        this.domNode = document.createElement('div');
        if (!this.options.isAccessible) {
            this.domNode.setAttribute('aria-hidden', 'true');
            this.domNode.setAttribute('role', 'presentation');
        }
        this._disposables.add(this.editor.onDidLayoutChange((info) => {
            const width = this._getWidth(info);
            this.domNode.style.width = width + 'px';
            this.domNode.style.left = this._getLeft(info) + 'px';
            this._onWidth(width);
        }));
    }
    dispose() {
        if (this._overlayWidget) {
            this.editor.removeOverlayWidget(this._overlayWidget);
            this._overlayWidget = null;
        }
        if (this._viewZone) {
            this.editor.changeViewZones((accessor) => {
                if (this._viewZone) {
                    accessor.removeZone(this._viewZone.id);
                }
                this._viewZone = null;
            });
        }
        this._positionMarkerId.clear();
        this._disposables.dispose();
    }
    create() {
        this.domNode.classList.add('zone-widget');
        if (this.options.className) {
            this.domNode.classList.add(this.options.className);
        }
        this.container = document.createElement('div');
        this.container.classList.add('zone-widget-container');
        this.domNode.appendChild(this.container);
        if (this.options.showArrow) {
            this._arrow = new Arrow(this.editor);
            this._disposables.add(this._arrow);
        }
        this._fillContainer(this.container);
        this._initSash();
        this._applyStyles();
    }
    style(styles) {
        if (styles.frameColor) {
            this.options.frameColor = styles.frameColor;
        }
        if (styles.arrowColor) {
            this.options.arrowColor = styles.arrowColor;
        }
        this._applyStyles();
    }
    _applyStyles() {
        if (this.container && this.options.frameColor) {
            const frameColor = this.options.frameColor.toString();
            this.container.style.borderTopColor = frameColor;
            this.container.style.borderBottomColor = frameColor;
        }
        if (this._arrow && this.options.arrowColor) {
            const arrowColor = this.options.arrowColor.toString();
            this._arrow.color = arrowColor;
        }
    }
    _getWidth(info) {
        return info.width - info.minimap.minimapWidth - info.verticalScrollbarWidth;
    }
    _getLeft(info) {
        // If minimap is to the left, we move beyond it
        if (info.minimap.minimapWidth > 0 && info.minimap.minimapLeft === 0) {
            return info.minimap.minimapWidth;
        }
        return 0;
    }
    _onViewZoneTop(top) {
        this.domNode.style.top = top + 'px';
    }
    _onViewZoneHeight(height) {
        this.domNode.style.height = `${height}px`;
        if (this.container) {
            const containerHeight = height - this._decoratingElementsHeight();
            this.container.style.height = `${containerHeight}px`;
            const layoutInfo = this.editor.getLayoutInfo();
            this._doLayout(containerHeight, this._getWidth(layoutInfo));
        }
        this._resizeSash?.layout();
    }
    get position() {
        const range = this._positionMarkerId.getRange(0);
        if (!range) {
            return undefined;
        }
        return range.getStartPosition();
    }
    hasFocus() {
        return this.domNode.contains(dom.getActiveElement());
    }
    show(rangeOrPos, heightInLines) {
        const range = Range.isIRange(rangeOrPos)
            ? Range.lift(rangeOrPos)
            : Range.fromPositions(rangeOrPos);
        this._isShowing = true;
        this._showImpl(range, heightInLines);
        this._isShowing = false;
        this._positionMarkerId.set([{ range, options: ModelDecorationOptions.EMPTY }]);
    }
    updatePositionAndHeight(rangeOrPos, heightInLines) {
        if (this._viewZone) {
            rangeOrPos = Range.isIRange(rangeOrPos) ? Range.getStartPosition(rangeOrPos) : rangeOrPos;
            this._viewZone.afterLineNumber = rangeOrPos.lineNumber;
            this._viewZone.afterColumn = rangeOrPos.column;
            this._viewZone.heightInLines = heightInLines ?? this._viewZone.heightInLines;
            this.editor.changeViewZones((accessor) => {
                accessor.layoutZone(this._viewZone.id);
            });
            this._positionMarkerId.set([
                {
                    range: Range.isIRange(rangeOrPos) ? rangeOrPos : Range.fromPositions(rangeOrPos),
                    options: ModelDecorationOptions.EMPTY,
                },
            ]);
            this._updateSashEnablement();
        }
    }
    hide() {
        if (this._viewZone) {
            this.editor.changeViewZones((accessor) => {
                if (this._viewZone) {
                    accessor.removeZone(this._viewZone.id);
                }
            });
            this._viewZone = null;
        }
        if (this._overlayWidget) {
            this.editor.removeOverlayWidget(this._overlayWidget);
            this._overlayWidget = null;
        }
        this._arrow?.hide();
        this._positionMarkerId.clear();
        this._isSashResizeHeight = false;
    }
    _decoratingElementsHeight() {
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        let result = 0;
        if (this.options.showArrow) {
            const arrowHeight = Math.round(lineHeight / 3);
            result += 2 * arrowHeight;
        }
        if (this.options.showFrame) {
            const frameThickness = Math.round(lineHeight / 9);
            result += 2 * frameThickness;
        }
        return result;
    }
    /** Gets the maximum widget height in lines. */
    _getMaximumHeightInLines() {
        return Math.max(12, (this.editor.getLayoutInfo().height / this.editor.getOption(68 /* EditorOption.lineHeight */)) * 0.8);
    }
    _showImpl(where, heightInLines) {
        const position = where.getStartPosition();
        const layoutInfo = this.editor.getLayoutInfo();
        const width = this._getWidth(layoutInfo);
        this.domNode.style.width = `${width}px`;
        this.domNode.style.left = this._getLeft(layoutInfo) + 'px';
        // Render the widget as zone (rendering) and widget (lifecycle)
        const viewZoneDomNode = document.createElement('div');
        viewZoneDomNode.style.overflow = 'hidden';
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        // adjust heightInLines to viewport
        const maxHeightInLines = this._getMaximumHeightInLines();
        if (maxHeightInLines !== undefined) {
            heightInLines = Math.min(heightInLines, maxHeightInLines);
        }
        let arrowHeight = 0;
        let frameThickness = 0;
        // Render the arrow one 1/3 of an editor line height
        if (this._arrow && this.options.showArrow) {
            arrowHeight = Math.round(lineHeight / 3);
            this._arrow.height = arrowHeight;
            this._arrow.show(position);
        }
        // Render the frame as 1/9 of an editor line height
        if (this.options.showFrame) {
            frameThickness = Math.round(lineHeight / 9);
        }
        // insert zone widget
        this.editor.changeViewZones((accessor) => {
            if (this._viewZone) {
                accessor.removeZone(this._viewZone.id);
            }
            if (this._overlayWidget) {
                this.editor.removeOverlayWidget(this._overlayWidget);
                this._overlayWidget = null;
            }
            this.domNode.style.top = '-1000px';
            this._viewZone = new ViewZoneDelegate(viewZoneDomNode, position.lineNumber, position.column, heightInLines, (top) => this._onViewZoneTop(top), (height) => this._onViewZoneHeight(height), this.options.showInHiddenAreas, this.options.ordinal);
            this._viewZone.id = accessor.addZone(this._viewZone);
            this._overlayWidget = new OverlayWidgetDelegate(WIDGET_ID + this._viewZone.id, this.domNode);
            this.editor.addOverlayWidget(this._overlayWidget);
        });
        this._updateSashEnablement();
        if (this.container && this.options.showFrame) {
            const width = this.options.frameWidth ? this.options.frameWidth : frameThickness;
            this.container.style.borderTopWidth = width + 'px';
            this.container.style.borderBottomWidth = width + 'px';
        }
        const containerHeight = heightInLines * lineHeight - this._decoratingElementsHeight();
        if (this.container) {
            this.container.style.top = arrowHeight + 'px';
            this.container.style.height = containerHeight + 'px';
            this.container.style.overflow = 'hidden';
        }
        this._doLayout(containerHeight, width);
        if (!this.options.keepEditorSelection) {
            this.editor.setSelection(where);
        }
        const model = this.editor.getModel();
        if (model) {
            const range = model.validateRange(new Range(where.startLineNumber, 1, where.endLineNumber + 1, 1));
            this.revealRange(range, range.startLineNumber === model.getLineCount());
        }
    }
    revealRange(range, isLastLine) {
        if (isLastLine) {
            this.editor.revealLineNearTop(range.endLineNumber, 0 /* ScrollType.Smooth */);
        }
        else {
            this.editor.revealRange(range, 0 /* ScrollType.Smooth */);
        }
    }
    setCssClass(className, classToReplace) {
        if (!this.container) {
            return;
        }
        if (classToReplace) {
            this.container.classList.remove(classToReplace);
        }
        this.container.classList.add(className);
    }
    _onWidth(widthInPixel) {
        // implement in subclass
    }
    _doLayout(heightInPixel, widthInPixel) {
        // implement in subclass
    }
    _relayout(_newHeightInLines, useMax) {
        const maxHeightInLines = this._getMaximumHeightInLines();
        const newHeightInLines = useMax && maxHeightInLines !== undefined
            ? Math.min(maxHeightInLines, _newHeightInLines)
            : _newHeightInLines;
        if (this._viewZone && this._viewZone.heightInLines !== newHeightInLines) {
            this.editor.changeViewZones((accessor) => {
                if (this._viewZone) {
                    this._viewZone.heightInLines = newHeightInLines;
                    accessor.layoutZone(this._viewZone.id);
                }
            });
            this._updateSashEnablement();
        }
    }
    // --- sash
    _initSash() {
        if (this._resizeSash) {
            return;
        }
        this._resizeSash = this._disposables.add(new Sash(this.domNode, this, { orientation: 1 /* Orientation.HORIZONTAL */ }));
        if (!this.options.isResizeable) {
            this._resizeSash.state = 0 /* SashState.Disabled */;
        }
        let data;
        this._disposables.add(this._resizeSash.onDidStart((e) => {
            if (this._viewZone) {
                data = {
                    startY: e.startY,
                    heightInLines: this._viewZone.heightInLines,
                    ...this._getResizeBounds(),
                };
            }
        }));
        this._disposables.add(this._resizeSash.onDidEnd(() => {
            data = undefined;
        }));
        this._disposables.add(this._resizeSash.onDidChange((evt) => {
            if (data) {
                const lineDelta = (evt.currentY - data.startY) / this.editor.getOption(68 /* EditorOption.lineHeight */);
                const roundedLineDelta = lineDelta < 0 ? Math.ceil(lineDelta) : Math.floor(lineDelta);
                const newHeightInLines = data.heightInLines + roundedLineDelta;
                if (newHeightInLines > data.minLines && newHeightInLines < data.maxLines) {
                    this._isSashResizeHeight = true;
                    this._relayout(newHeightInLines);
                }
            }
        }));
    }
    _updateSashEnablement() {
        if (this._resizeSash) {
            const { minLines, maxLines } = this._getResizeBounds();
            this._resizeSash.state = minLines === maxLines ? 0 /* SashState.Disabled */ : 3 /* SashState.Enabled */;
        }
    }
    get _usesResizeHeight() {
        return this._isSashResizeHeight;
    }
    _getResizeBounds() {
        return { minLines: 5, maxLines: 35 };
    }
    getHorizontalSashLeft() {
        return 0;
    }
    getHorizontalSashTop() {
        return ((this.domNode.style.height === null ? 0 : parseInt(this.domNode.style.height)) -
            this._decoratingElementsHeight() / 2);
    }
    getHorizontalSashWidth() {
        const layoutInfo = this.editor.getLayoutInfo();
        return layoutInfo.width - layoutInfo.minimap.minimapWidth;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9uZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3pvbmVXaWRnZXQvYnJvd3Nlci96b25lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFJTixJQUFJLEdBRUosTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLGtCQUFrQixDQUFBO0FBVXpCLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQXFCM0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRXJELE1BQU0sY0FBYyxHQUFhO0lBQ2hDLFNBQVMsRUFBRSxJQUFJO0lBQ2YsU0FBUyxFQUFFLElBQUk7SUFDZixTQUFTLEVBQUUsRUFBRTtJQUNiLFVBQVUsRUFBRSxZQUFZO0lBQ3hCLFVBQVUsRUFBRSxZQUFZO0lBQ3hCLG1CQUFtQixFQUFFLEtBQUs7Q0FDMUIsQ0FBQTtBQUVELE1BQU0sU0FBUyxHQUFHLDhCQUE4QixDQUFBO0FBRWhELE1BQU0s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