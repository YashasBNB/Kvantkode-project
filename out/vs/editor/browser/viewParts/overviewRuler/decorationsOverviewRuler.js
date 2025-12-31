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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL292ZXJ2aWV3UnVsZXIvZGVjb3JhdGlvbnNPdmVydmlld1J1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIseUJBQXlCLEVBQ3pCLDZCQUE2QixFQUM3QixvQ0FBb0MsRUFDcEMsa0NBQWtDLEdBQ2xDLE1BQU0sNkNBQTZDLENBQUE7QUFNcEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTFELE1BQU0sUUFBUTtJQTBCYixZQUFZLE1BQTRCLEVBQUUsS0FBa0I7UUFDM0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQTtRQUM5QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFBO1FBQ3RELElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUE7UUFDdEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDBDQUFpQyxDQUFBO1FBRXRFLElBQUksQ0FBQyxZ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