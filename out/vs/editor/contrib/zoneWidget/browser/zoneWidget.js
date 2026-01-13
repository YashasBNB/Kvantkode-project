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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiem9uZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvem9uZVdpZGdldC9icm93c2VyL3pvbmVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUlOLElBQUksR0FFSixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sa0JBQWtCLENBQUE7QUFVekIsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRzdELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBcUIzRSxNQUFNLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFckQsTUFBTSxjQUFjLEdBQWE7SUFDaEMsU0FBUyxFQUFFLElBQUk7SUFDZixTQUFTLEVBQUUsSUFBSTtJQUNmLFNBQVMsRUFBRSxFQUFFO0lBQ2IsVUFBVSxFQUFFLFlBQVk7SUFDeEIsVUFBVSxFQUFFLFlBQVk7SUFDeEIsbUJBQW1CLEVBQUUsS0FBSztDQUMxQixDQUFBO0FBRUQsTUFBTSxTQUFTLEdBQUcs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