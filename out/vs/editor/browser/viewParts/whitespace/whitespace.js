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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy93aGl0ZXNwYWNlL3doaXRlc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVFyRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFL0U7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGtCQUFrQjtJQU14RCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7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QUFHLENBQUMsQ0FBQTtRQUN6QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFFZixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUM5QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDekQsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3pELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUMzRCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNoQyxNQUFNLEVBQUUsR0FB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