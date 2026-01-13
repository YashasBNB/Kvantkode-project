/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { Color } from '../../../../base/common/color.js';
import { ViewPart } from '../../view/viewPart.js';
import { Position } from '../../../common/core/position.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { editorCursorForeground, editorOverviewRulerBorder, editorOverviewRulerBackground, editorMultiCursorSecondaryForeground, editorMultiCursorPrimaryForeground, } from '../../../common/core/editorColorRegistry.js';
import { OverviewRulerDecorationsGroup } from '../../../common/viewModel.js';
import { equals } from '../../../../base/common/arrays.js';
class Settings {
    constructor(config, theme) {
        const options = config.options;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.pixelRatio = options.get(149 /* EditorOption.pixelRatio */);
        this.overviewRulerLanes = options.get(87 /* EditorOption.overviewRulerLanes */);
        this.renderBorder = options.get(86 /* EditorOption.overviewRulerBorder */);
        const borderColor = theme.getColor(editorOverviewRulerBorder);
        this.borderColor = borderColor ? borderColor.toString() : null;
        this.hideCursor = options.get(61 /* EditorOption.hideCursorInOverviewRuler */);
        const cursorColorSingle = theme.getColor(editorCursorForeground);
        this.cursorColorSingle = cursorColorSingle
            ? cursorColorSingle.transparent(0.7).toString()
            : null;
        const cursorColorPrimary = theme.getColor(editorMultiCursorPrimaryForeground);
        this.cursorColorPrimary = cursorColorPrimary
            ? cursorColorPrimary.transparent(0.7).toString()
            : null;
        const cursorColorSecondary = theme.getColor(editorMultiCursorSecondaryForeground);
        this.cursorColorSecondary = cursorColorSecondary
            ? cursorColorSecondary.transparent(0.7).toString()
            : null;
        this.themeType = theme.type;
        const minimapOpts = options.get(74 /* EditorOption.minimap */);
        const minimapEnabled = minimapOpts.enabled;
        const minimapSide = minimapOpts.side;
        const themeColor = theme.getColor(editorOverviewRulerBackground);
        const defaultBackground = TokenizationRegistry.getDefaultBackground();
        if (themeColor) {
            this.backgroundColor = themeColor;
        }
        else if (minimapEnabled && minimapSide === 'right') {
            this.backgroundColor = defaultBackground;
        }
        else {
            this.backgroundColor = null;
        }
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const position = layoutInfo.overviewRuler;
        this.top = position.top;
        this.right = position.right;
        this.domWidth = position.width;
        this.domHeight = position.height;
        if (this.overviewRulerLanes === 0) {
            // overview ruler is off
            this.canvasWidth = 0;
            this.canvasHeight = 0;
        }
        else {
            this.canvasWidth = (this.domWidth * this.pixelRatio) | 0;
            this.canvasHeight = (this.domHeight * this.pixelRatio) | 0;
        }
        const [x, w] = this._initLanes(1, this.canvasWidth, this.overviewRulerLanes);
        this.x = x;
        this.w = w;
    }
    _initLanes(canvasLeftOffset, canvasWidth, laneCount) {
        const remainingWidth = canvasWidth - canvasLeftOffset;
        if (laneCount >= 3) {
            const leftWidth = Math.floor(remainingWidth / 3);
            const rightWidth = Math.floor(remainingWidth / 3);
            const centerWidth = remainingWidth - leftWidth - rightWidth;
            const leftOffset = canvasLeftOffset;
            const centerOffset = leftOffset + leftWidth;
            const rightOffset = leftOffset + leftWidth + centerWidth;
            return [
                [
                    0,
                    leftOffset, // Left
                    centerOffset, // Center
                    leftOffset, // Left | Center
                    rightOffset, // Right
                    leftOffset, // Left | Right
                    centerOffset, // Center | Right
                    leftOffset, // Left | Center | Right
                ],
                [
                    0,
                    leftWidth, // Left
                    centerWidth, // Center
                    leftWidth + centerWidth, // Left | Center
                    rightWidth, // Right
                    leftWidth + centerWidth + rightWidth, // Left | Right
                    centerWidth + rightWidth, // Center | Right
                    leftWidth + centerWidth + rightWidth, // Left | Center | Right
                ],
            ];
        }
        else if (laneCount === 2) {
            const leftWidth = Math.floor(remainingWidth / 2);
            const rightWidth = remainingWidth - leftWidth;
            const leftOffset = canvasLeftOffset;
            const rightOffset = leftOffset + leftWidth;
            return [
                [
                    0,
                    leftOffset, // Left
                    leftOffset, // Center
                    leftOffset, // Left | Center
                    rightOffset, // Right
                    leftOffset, // Left | Right
                    leftOffset, // Center | Right
                    leftOffset, // Left | Center | Right
                ],
                [
                    0,
                    leftWidth, // Left
                    leftWidth, // Center
                    leftWidth, // Left | Center
                    rightWidth, // Right
                    leftWidth + rightWidth, // Left | Right
                    leftWidth + rightWidth, // Center | Right
                    leftWidth + rightWidth, // Left | Center | Right
                ],
            ];
        }
        else {
            const offset = canvasLeftOffset;
            const width = remainingWidth;
            return [
                [
                    0,
                    offset, // Left
                    offset, // Center
                    offset, // Left | Center
                    offset, // Right
                    offset, // Left | Right
                    offset, // Center | Right
                    offset, // Left | Center | Right
                ],
                [
                    0,
                    width, // Left
                    width, // Center
                    width, // Left | Center
                    width, // Right
                    width, // Left | Right
                    width, // Center | Right
                    width, // Left | Center | Right
                ],
            ];
        }
    }
    equals(other) {
        return (this.lineHeight === other.lineHeight &&
            this.pixelRatio === other.pixelRatio &&
            this.overviewRulerLanes === other.overviewRulerLanes &&
            this.renderBorder === other.renderBorder &&
            this.borderColor === other.borderColor &&
            this.hideCursor === other.hideCursor &&
            this.cursorColorSingle === other.cursorColorSingle &&
            this.cursorColorPrimary === other.cursorColorPrimary &&
            this.cursorColorSecondary === other.cursorColorSecondary &&
            this.themeType === other.themeType &&
            Color.equals(this.backgroundColor, other.backgroundColor) &&
            this.top === other.top &&
            this.right === other.right &&
            this.domWidth === other.domWidth &&
            this.domHeight === other.domHeight &&
            this.canvasWidth === other.canvasWidth &&
            this.canvasHeight === other.canvasHeight);
    }
}
var Constants;
(function (Constants) {
    Constants[Constants["MIN_DECORATION_HEIGHT"] = 6] = "MIN_DECORATION_HEIGHT";
})(Constants || (Constants = {}));
var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
var ShouldRenderValue;
(function (ShouldRenderValue) {
    ShouldRenderValue[ShouldRenderValue["NotNeeded"] = 0] = "NotNeeded";
    ShouldRenderValue[ShouldRenderValue["Maybe"] = 1] = "Maybe";
    ShouldRenderValue[ShouldRenderValue["Needed"] = 2] = "Needed";
})(ShouldRenderValue || (ShouldRenderValue = {}));
export class DecorationsOverviewRuler extends ViewPart {
    constructor(context) {
        super(context);
        this._actualShouldRender = 0 /* ShouldRenderValue.NotNeeded */;
        this._renderedDecorations = [];
        this._renderedCursorPositions = [];
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setClassName('decorationsOverviewRuler');
        this._domNode.setPosition('absolute');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._updateSettings(false);
        this._tokensColorTrackerListener = TokenizationRegistry.onDidChange((e) => {
            if (e.changedColorMap) {
                this._updateSettings(true);
            }
        });
        this._cursorPositions = [
            { position: new Position(1, 1), color: this._settings.cursorColorSingle },
        ];
    }
    dispose() {
        super.dispose();
        this._tokensColorTrackerListener.dispose();
    }
    _updateSettings(renderNow) {
        const newSettings = new Settings(this._context.configuration, this._context.theme);
        if (this._settings && this._settings.equals(newSettings)) {
            // nothing to do
            return false;
        }
        this._settings = newSettings;
        this._domNode.setTop(this._settings.top);
        this._domNode.setRight(this._settings.right);
        this._domNode.setWidth(this._settings.domWidth);
        this._domNode.setHeight(this._settings.domHeight);
        this._domNode.domNode.width = this._settings.canvasWidth;
        this._domNode.domNode.height = this._settings.canvasHeight;
        if (renderNow) {
            this._render();
        }
        return true;
    }
    // ---- begin view event handlers
    _markRenderingIsNeeded() {
        this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        return true;
    }
    _markRenderingIsMaybeNeeded() {
        this._actualShouldRender = 1 /* ShouldRenderValue.Maybe */;
        return true;
    }
    onConfigurationChanged(e) {
        return this._updateSettings(false) ? this._markRenderingIsNeeded() : false;
    }
    onCursorStateChanged(e) {
        this._cursorPositions = [];
        for (let i = 0, len = e.selections.length; i < len; i++) {
            let color = this._settings.cursorColorSingle;
            if (len > 1) {
                color = i === 0 ? this._settings.cursorColorPrimary : this._settings.cursorColorSecondary;
            }
            this._cursorPositions.push({ position: e.selections[i].getPosition(), color });
        }
        this._cursorPositions.sort((a, b) => Position.compare(a.position, b.position));
        return this._markRenderingIsMaybeNeeded();
    }
    onDecorationsChanged(e) {
        if (e.affectsOverviewRuler) {
            return this._markRenderingIsMaybeNeeded();
        }
        return false;
    }
    onFlushed(e) {
        return this._markRenderingIsNeeded();
    }
    onScrollChanged(e) {
        return e.scrollHeightChanged ? this._markRenderingIsNeeded() : false;
    }
    onZonesChanged(e) {
        return this._markRenderingIsNeeded();
    }
    onThemeChanged(e) {
        return this._updateSettings(false) ? this._markRenderingIsNeeded() : false;
    }
    // ---- end view event handlers
    getDomNode() {
        return this._domNode.domNode;
    }
    prepareRender(ctx) {
        // Nothing to read
    }
    render(editorCtx) {
        this._render();
        this._actualShouldRender = 0 /* ShouldRenderValue.NotNeeded */;
    }
    _render() {
        const backgroundColor = this._settings.backgroundColor;
        if (this._settings.overviewRulerLanes === 0) {
            // overview ruler is off
            this._domNode.setBackgroundColor(backgroundColor ? Color.Format.CSS.formatHexA(backgroundColor) : '');
            this._domNode.setDisplay('none');
            return;
        }
        const decorations = this._context.viewModel.getAllOverviewRulerDecorations(this._context.theme);
        decorations.sort(OverviewRulerDecorationsGroup.compareByRenderingProps);
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */ &&
            !OverviewRulerDecorationsGroup.equalsArr(this._renderedDecorations, decorations)) {
            this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        }
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */ &&
            !equals(this._renderedCursorPositions, this._cursorPositions, (a, b) => a.position.lineNumber === b.position.lineNumber && a.color === b.color)) {
            this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        }
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */) {
            // both decorations and cursor positions are unchanged, nothing to do
            return;
        }
        this._renderedDecorations = decorations;
        this._renderedCursorPositions = this._cursorPositions;
        this._domNode.setDisplay('block');
        const canvasWidth = this._settings.canvasWidth;
        const canvasHeight = this._settings.canvasHeight;
        const lineHeight = this._settings.lineHeight;
        const viewLayout = this._context.viewLayout;
        const outerHeight = this._context.viewLayout.getScrollHeight();
        const heightRatio = canvasHeight / outerHeight;
        const minDecorationHeight = (6 /* Constants.MIN_DECORATION_HEIGHT */ * this._settings.pixelRatio) | 0;
        const halfMinDecorationHeight = (minDecorationHeight / 2) | 0;
        const canvasCtx = this._domNode.domNode.getContext('2d');
        if (backgroundColor) {
            if (backgroundColor.isOpaque()) {
                // We have a background color which is opaque, we can just paint the entire surface with it
                canvasCtx.fillStyle = Color.Format.CSS.formatHexA(backgroundColor);
                canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            else {
                // We have a background color which is transparent, we need to first clear the surface and
                // then fill it
                canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                canvasCtx.fillStyle = Color.Format.CSS.formatHexA(backgroundColor);
                canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        }
        else {
            // We don't have a background color
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        const x = this._settings.x;
        const w = this._settings.w;
        for (const decorationGroup of decorations) {
            const color = decorationGroup.color;
            const decorationGroupData = decorationGroup.data;
            canvasCtx.fillStyle = color;
            let prevLane = 0;
            let prevY1 = 0;
            let prevY2 = 0;
            for (let i = 0, len = decorationGroupData.length / 3; i < len; i++) {
                const lane = decorationGroupData[3 * i];
                const startLineNumber = decorationGroupData[3 * i + 1];
                const endLineNumber = decorationGroupData[3 * i + 2];
                let y1 = (viewLayout.getVerticalOffsetForLineNumber(startLineNumber) * heightRatio) | 0;
                let y2 = ((viewLayout.getVerticalOffsetForLineNumber(endLineNumber) + lineHeight) * heightRatio) |
                    0;
                const height = y2 - y1;
                if (height < minDecorationHeight) {
                    let yCenter = ((y1 + y2) / 2) | 0;
                    if (yCenter < halfMinDecorationHeight) {
                        yCenter = halfMinDecorationHeight;
                    }
                    else if (yCenter + halfMinDecorationHeight > canvasHeight) {
                        yCenter = canvasHeight - halfMinDecorationHeight;
                    }
                    y1 = yCenter - halfMinDecorationHeight;
                    y2 = yCenter + halfMinDecorationHeight;
                }
                if (y1 > prevY2 + 1 || lane !== prevLane) {
                    // flush prev
                    if (i !== 0) {
                        canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
                    }
                    prevLane = lane;
                    prevY1 = y1;
                    prevY2 = y2;
                }
                else {
                    // merge into prev
                    if (y2 > prevY2) {
                        prevY2 = y2;
                    }
                }
            }
            canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
        }
        // Draw cursors
        if (!this._settings.hideCursor) {
            const cursorHeight = (2 * this._settings.pixelRatio) | 0;
            const halfCursorHeight = (cursorHeight / 2) | 0;
            const cursorX = this._settings.x[7 /* OverviewRulerLane.Full */];
            const cursorW = this._settings.w[7 /* OverviewRulerLane.Full */];
            let prevY1 = -100;
            let prevY2 = -100;
            let prevColor = null;
            for (let i = 0, len = this._cursorPositions.length; i < len; i++) {
                const color = this._cursorPositions[i].color;
                if (!color) {
                    continue;
                }
                const cursor = this._cursorPositions[i].position;
                let yCenter = (viewLayout.getVerticalOffsetForLineNumber(cursor.lineNumber) * heightRatio) | 0;
                if (yCenter < halfCursorHeight) {
                    yCenter = halfCursorHeight;
                }
                else if (yCenter + halfCursorHeight > canvasHeight) {
                    yCenter = canvasHeight - halfCursorHeight;
                }
                const y1 = yCenter - halfCursorHeight;
                const y2 = y1 + cursorHeight;
                if (y1 > prevY2 + 1 || color !== prevColor) {
                    // flush prev
                    if (i !== 0 && prevColor) {
                        canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
                    }
                    prevY1 = y1;
                    prevY2 = y2;
                }
                else {
                    // merge into prev
                    if (y2 > prevY2) {
                        prevY2 = y2;
                    }
                }
                prevColor = color;
                canvasCtx.fillStyle = color;
            }
            if (prevColor) {
                canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
            }
        }
        if (this._settings.renderBorder &&
            this._settings.borderColor &&
            this._settings.overviewRulerLanes > 0) {
            canvasCtx.beginPath();
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = this._settings.borderColor;
            canvasCtx.moveTo(0, 0);
            canvasCtx.lineTo(0, canvasHeight);
            canvasCtx.moveTo(1, 0);
            canvasCtx.lineTo(canvasWidth, 0);
            canvasCtx.stroke();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvb3ZlcnZpZXdSdWxlci9kZWNvcmF0aW9uc092ZXJ2aWV3UnVsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkUsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsNkJBQTZCLEVBQzdCLG9DQUFvQyxFQUNwQyxrQ0FBa0MsR0FDbEMsTUFBTSw2Q0FBNkMsQ0FBQTtBQU1wRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFMUQsTUFBTSxRQUFRO0lBMEJiLFlBQVksTUFBNEIsRUFBRSxLQUFrQjtRQUMzRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFBO1FBQzlCLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDdEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQTtRQUN0RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsMENBQWlD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