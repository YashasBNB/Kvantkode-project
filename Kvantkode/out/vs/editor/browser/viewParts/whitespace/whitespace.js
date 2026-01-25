/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './whitespace.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import * as strings from '../../../../base/common/strings.js';
import { LineRange } from '../../../common/viewLayout/viewLineRenderer.js';
import { Position } from '../../../common/core/position.js';
import { editorWhitespaces } from '../../../common/core/editorColorRegistry.js';
/**
 * The whitespace overlay will visual certain whitespace depending on the
 * current editor configuration (boundary, selection, etc.).
 */
export class WhitespaceOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        this._options = new WhitespaceOptions(this._context.configuration);
        this._selection = [];
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const newOptions = new WhitespaceOptions(this._context.configuration);
        if (this._options.equals(newOptions)) {
            return e.hasChanged(151 /* EditorOption.layoutInfo */);
        }
        this._options = newOptions;
        return true;
    }
    onCursorStateChanged(e) {
        this._selection = e.selections;
        if (this._options.renderWhitespace === 'selection') {
            return true;
        }
        return false;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (this._options.renderWhitespace === 'none') {
            this._renderResult = null;
            return;
        }
        const startLineNumber = ctx.visibleRange.startLineNumber;
        const endLineNumber = ctx.visibleRange.endLineNumber;
        const lineCount = endLineNumber - startLineNumber + 1;
        const needed = new Array(lineCount);
        for (let i = 0; i < lineCount; i++) {
            needed[i] = true;
        }
        const viewportData = this._context.viewModel.getMinimapLinesRenderingData(ctx.viewportData.startLineNumber, ctx.viewportData.endLineNumber, needed);
        this._renderResult = [];
        for (let lineNumber = ctx.viewportData.startLineNumber; lineNumber <= ctx.viewportData.endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - ctx.viewportData.startLineNumber;
            const lineData = viewportData.data[lineIndex];
            let selectionsOnLine = null;
            if (this._options.renderWhitespace === 'selection') {
                const selections = this._selection;
                for (const selection of selections) {
                    if (selection.endLineNumber < lineNumber || selection.startLineNumber > lineNumber) {
                        // Selection does not intersect line
                        continue;
                    }
                    const startColumn = selection.startLineNumber === lineNumber ? selection.startColumn : lineData.minColumn;
                    const endColumn = selection.endLineNumber === lineNumber ? selection.endColumn : lineData.maxColumn;
                    if (startColumn < endColumn) {
                        if (!selectionsOnLine) {
                            selectionsOnLine = [];
                        }
                        selectionsOnLine.push(new LineRange(startColumn - 1, endColumn - 1));
                    }
                }
            }
            this._renderResult[lineIndex] = this._applyRenderWhitespace(ctx, lineNumber, selectionsOnLine, lineData);
        }
    }
    _applyRenderWhitespace(ctx, lineNumber, selections, lineData) {
        if (this._options.renderWhitespace === 'selection' && !selections) {
            return '';
        }
        if (this._options.renderWhitespace === 'trailing' && lineData.continuesWithWrappedLine) {
            return '';
        }
        const color = this._context.theme.getColor(editorWhitespaces);
        const USE_SVG = this._options.renderWithSVG;
        const lineContent = lineData.content;
        const len = this._options.stopRenderingLineAfter === -1
            ? lineContent.length
            : Math.min(this._options.stopRenderingLineAfter, lineContent.length);
        const continuesWithWrappedLine = lineData.continuesWithWrappedLine;
        const fauxIndentLength = lineData.minColumn - 1;
        const onlyBoundary = this._options.renderWhitespace === 'boundary';
        const onlyTrailing = this._options.renderWhitespace === 'trailing';
        const lineHeight = this._options.lineHeight;
        const middotWidth = this._options.middotWidth;
        const wsmiddotWidth = this._options.wsmiddotWidth;
        const spaceWidth = this._options.spaceWidth;
        const wsmiddotDiff = Math.abs(wsmiddotWidth - spaceWidth);
        const middotDiff = Math.abs(middotWidth - spaceWidth);
        // U+2E31 - WORD SEPARATOR MIDDLE DOT
        // U+00B7 - MIDDLE DOT
        const renderSpaceCharCode = wsmiddotDiff < middotDiff ? 0x2e31 : 0xb7;
        const canUseHalfwidthRightwardsArrow = this._options.canUseHalfwidthRightwardsArrow;
        let result = '';
        let lineIsEmptyOrWhitespace = false;
        let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
        let lastNonWhitespaceIndex;
        if (firstNonWhitespaceIndex === -1) {
            lineIsEmptyOrWhitespace = true;
            firstNonWhitespaceIndex = len;
            lastNonWhitespaceIndex = len;
        }
        else {
            lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
        }
        let currentSelectionIndex = 0;
        let currentSelection = selections && selections[currentSelectionIndex];
        let maxLeft = 0;
        for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
            const chCode = lineContent.charCodeAt(charIndex);
            if (currentSelection && charIndex >= currentSelection.endOffset) {
                currentSelectionIndex++;
                currentSelection = selections && selections[currentSelectionIndex];
            }
            if (chCode !== 9 /* CharCode.Tab */ && chCode !== 32 /* CharCode.Space */) {
                continue;
            }
            if (onlyTrailing && !lineIsEmptyOrWhitespace && charIndex <= lastNonWhitespaceIndex) {
                // If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
                continue;
            }
            if (onlyBoundary &&
                charIndex >= firstNonWhitespaceIndex &&
                charIndex <= lastNonWhitespaceIndex &&
                chCode === 32 /* CharCode.Space */) {
                // rendering only boundary whitespace
                const prevChCode = charIndex - 1 >= 0 ? lineContent.charCodeAt(charIndex - 1) : 0 /* CharCode.Null */;
                const nextChCode = charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */;
                if (prevChCode !== 32 /* CharCode.Space */ && nextChCode !== 32 /* CharCode.Space */) {
                    continue;
                }
            }
            if (onlyBoundary && continuesWithWrappedLine && charIndex === len - 1) {
                const prevCharCode = charIndex - 1 >= 0 ? lineContent.charCodeAt(charIndex - 1) : 0 /* CharCode.Null */;
                const isSingleTrailingSpace = chCode === 32 /* CharCode.Space */ &&
                    prevCharCode !== 32 /* CharCode.Space */ &&
                    prevCharCode !== 9 /* CharCode.Tab */;
                if (isSingleTrailingSpace) {
                    continue;
                }
            }
            if (selections &&
                (!currentSelection ||
                    currentSelection.startOffset > charIndex ||
                    currentSelection.endOffset <= charIndex)) {
                // If rendering whitespace on selection, check that the charIndex falls within a selection
                continue;
            }
            const visibleRange = ctx.visibleRangeForPosition(new Position(lineNumber, charIndex + 1));
            if (!visibleRange) {
                continue;
            }
            if (USE_SVG) {
                maxLeft = Math.max(maxLeft, visibleRange.left);
                if (chCode === 9 /* CharCode.Tab */) {
                    result += this._renderArrow(lineHeight, spaceWidth, visibleRange.left);
                }
                else {
                    result += `<circle cx="${(visibleRange.left + spaceWidth / 2).toFixed(2)}" cy="${(lineHeight / 2).toFixed(2)}" r="${(spaceWidth / 7).toFixed(2)}" />`;
                }
            }
            else {
                if (chCode === 9 /* CharCode.Tab */) {
                    result += `<div class="mwh" style="left:${visibleRange.left}px;height:${lineHeight}px;">${canUseHalfwidthRightwardsArrow ? String.fromCharCode(0xffeb) : String.fromCharCode(0x2192)}</div>`;
                }
                else {
                    result += `<div class="mwh" style="left:${visibleRange.left}px;height:${lineHeight}px;">${String.fromCharCode(renderSpaceCharCode)}</div>`;
                }
            }
        }
        if (USE_SVG) {
            maxLeft = Math.round(maxLeft + spaceWidth);
            return (`<svg style="bottom:0;position:absolute;width:${maxLeft}px;height:${lineHeight}px" viewBox="0 0 ${maxLeft} ${lineHeight}" xmlns="http://www.w3.org/2000/svg" fill="${color}">` +
                result +
                `</svg>`);
        }
        return result;
    }
    _renderArrow(lineHeight, spaceWidth, left) {
        const strokeWidth = spaceWidth / 7;
        const width = spaceWidth;
        const dy = lineHeight / 2;
        const dx = left;
        const p1 = { x: 0, y: strokeWidth / 2 };
        const p2 = { x: (100 / 125) * width, y: p1.y };
        const p3 = { x: p2.x - 0.2 * p2.x, y: p2.y + 0.2 * p2.x };
        const p4 = { x: p3.x + 0.1 * p2.x, y: p3.y + 0.1 * p2.x };
        const p5 = { x: p4.x + 0.35 * p2.x, y: p4.y - 0.35 * p2.x };
        const p6 = { x: p5.x, y: -p5.y };
        const p7 = { x: p4.x, y: -p4.y };
        const p8 = { x: p3.x, y: -p3.y };
        const p9 = { x: p2.x, y: -p2.y };
        const p10 = { x: p1.x, y: -p1.y };
        const p = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];
        const parts = p.map((p) => `${(dx + p.x).toFixed(2)} ${(dy + p.y).toFixed(2)}`).join(' L ');
        return `<path d="M ${parts}" />`;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
class WhitespaceOptions {
    constructor(config) {
        const options = config.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const experimentalWhitespaceRendering = options.get(40 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            // whitespace is rendered in the view line
            this.renderWhitespace = 'none';
            this.renderWithSVG = false;
        }
        else if (experimentalWhitespaceRendering === 'svg') {
            this.renderWhitespace = options.get(104 /* EditorOption.renderWhitespace */);
            this.renderWithSVG = true;
        }
        else {
            this.renderWhitespace = options.get(104 /* EditorOption.renderWhitespace */);
            this.renderWithSVG = false;
        }
        this.spaceWidth = fontInfo.spaceWidth;
        this.middotWidth = fontInfo.middotWidth;
        this.wsmiddotWidth = fontInfo.wsmiddotWidth;
        this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.stopRenderingLineAfter = options.get(122 /* EditorOption.stopRenderingLineAfter */);
    }
    equals(other) {
        return (this.renderWhitespace === other.renderWhitespace &&
            this.renderWithSVG === other.renderWithSVG &&
            this.spaceWidth === other.spaceWidth &&
            this.middotWidth === other.middotWidth &&
            this.wsmiddotWidth === other.wsmiddotWidth &&
            this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow &&
            this.lineHeight === other.lineHeight &&
            this.stopRenderingLineAfter === other.stopRenderingLineAfter);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3doaXRlc3BhY2Uvd2hpdGVzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBUXJFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUvRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsa0JBQWtCO0lBTXhELFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUNwQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLEtBQUssQ0FBQyxPQUFPLEVBQUUs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QUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQTtRQUVmLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQzlDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUN6RCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDekQsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQzNELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ2hDLE1BQU0sRUFB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