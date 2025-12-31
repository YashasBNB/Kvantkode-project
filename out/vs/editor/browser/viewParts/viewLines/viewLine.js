/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import * as platform from '../../../../base/common/platform.js';
import { RangeUtil } from './rangeUtil.js';
import { FloatHorizontalRange, VisibleRanges } from '../../view/renderingContext.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, LineRange, DomPosition, } from '../../../common/viewLayout/viewLineRenderer.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { EditorFontLigatures } from '../../../common/config/editorOptions.js';
const canUseFastRenderedViewLine = (function () {
    if (platform.isNative) {
        // In VSCode we know very well when the zoom level changes
        return true;
    }
    if (platform.isLinux || browser.isFirefox || browser.isSafari) {
        // On Linux, it appears that zooming affects char widths (in pixels), which is unexpected.
        // --
        // Even though we read character widths correctly, having read them at a specific zoom level
        // does not mean they are the same at the current zoom level.
        // --
        // This could be improved if we ever figure out how to get an event when browsers zoom,
        // but until then we have to stick with reading client rects.
        // --
        // The same has been observed with Firefox on Windows7
        // --
        // The same has been oversved with Safari
        return false;
    }
    return true;
})();
let monospaceAssumptionsAreValid = true;
export class ViewLine {
    static { this.CLASS_NAME = 'view-line'; }
    constructor(_viewGpuContext, options) {
        this._viewGpuContext = _viewGpuContext;
        this._options = options;
        this._isMaybeInvalid = true;
        this._renderedViewLine = null;
    }
    // --- begin IVisibleLineData
    getDomNode() {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            return this._renderedViewLine.domNode.domNode;
        }
        return null;
    }
    setDomNode(domNode) {
        if (this._renderedViewLine) {
            this._renderedViewLine.domNode = createFastDomNode(domNode);
        }
        else {
            throw new Error('I have no rendered view line to set the dom node to...');
        }
    }
    onContentChanged() {
        this._isMaybeInvalid = true;
    }
    onTokensChanged() {
        this._isMaybeInvalid = true;
    }
    onDecorationsChanged() {
        this._isMaybeInvalid = true;
    }
    onOptionsChanged(newOptions) {
        this._isMaybeInvalid = true;
        this._options = newOptions;
    }
    onSelectionChanged() {
        if (isHighContrast(this._options.themeType) || this._options.renderWhitespace === 'selection') {
            this._isMaybeInvalid = true;
            return true;
        }
        return false;
    }
    renderLine(lineNumber, deltaTop, lineHeight, viewportData, sb) {
        if (this._options.useGpu &&
            this._viewGpuContext?.canRender(this._options, viewportData, lineNumber)) {
            this._renderedViewLine?.domNode?.domNode.remove();
            this._renderedViewLine = null;
            return false;
        }
        if (this._isMaybeInvalid === false) {
            // it appears that nothing relevant has changed
            return false;
        }
        this._isMaybeInvalid = false;
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const options = this._options;
        const actualInlineDecorations = LineDecoration.filter(lineData.inlineDecorations, lineNumber, lineData.minColumn, lineData.maxColumn);
        // Only send selection information when needed for rendering whitespace
        let selectionsOnLine = null;
        if (isHighContrast(options.themeType) || this._options.renderWhitespace === 'selection') {
            const selections = viewportData.selections;
            for (const selection of selections) {
                if (selection.endLineNumber < lineNumber || selection.startLineNumber > lineNumber) {
                    // Selection does not intersect line
                    continue;
                }
                const startColumn = selection.startLineNumber === lineNumber ? selection.startColumn : lineData.minColumn;
                const endColumn = selection.endLineNumber === lineNumber ? selection.endColumn : lineData.maxColumn;
                if (startColumn < endColumn) {
                    if (isHighContrast(options.themeType)) {
                        actualInlineDecorations.push(new LineDecoration(startColumn, endColumn, 'inline-selected-text', 0 /* InlineDecorationType.Regular */));
                    }
                    if (this._options.renderWhitespace === 'selection') {
                        if (!selectionsOnLine) {
                            selectionsOnLine = [];
                        }
                        selectionsOnLine.push(new LineRange(startColumn - 1, endColumn - 1));
                    }
                }
            }
        }
        const renderLineInput = new RenderLineInput(options.useMonospaceOptimizations, options.canUseHalfwidthRightwardsArrow, lineData.content, lineData.continuesWithWrappedLine, lineData.isBasicASCII, lineData.containsRTL, lineData.minColumn - 1, lineData.tokens, actualInlineDecorations, lineData.tabSize, lineData.startVisibleColumn, options.spaceWidth, options.middotWidth, options.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, selectionsOnLine);
        if (this._renderedViewLine && this._renderedViewLine.input.equals(renderLineInput)) {
            // no need to do anything, we have the same render input
            return false;
        }
        sb.appendString('<div style="top:');
        sb.appendString(String(deltaTop));
        sb.appendString('px;height:');
        sb.appendString(String(lineHeight));
        sb.appendString('px;" class="');
        sb.appendString(ViewLine.CLASS_NAME);
        sb.appendString('">');
        const output = renderViewLine(renderLineInput, sb);
        sb.appendString('</div>');
        let renderedViewLine = null;
        if (monospaceAssumptionsAreValid &&
            canUseFastRenderedViewLine &&
            lineData.isBasicASCII &&
            options.useMonospaceOptimizations &&
            output.containsForeignElements === 0 /* ForeignElementType.None */) {
            renderedViewLine = new FastRenderedViewLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping);
        }
        if (!renderedViewLine) {
            renderedViewLine = createRenderedLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping, output.containsRTL, output.containsForeignElements);
        }
        this._renderedViewLine = renderedViewLine;
        return true;
    }
    layoutLine(lineNumber, deltaTop, lineHeight) {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            this._renderedViewLine.domNode.setTop(deltaTop);
            this._renderedViewLine.domNode.setHeight(lineHeight);
        }
    }
    // --- end IVisibleLineData
    getWidth(context) {
        if (!this._renderedViewLine) {
            return 0;
        }
        return this._renderedViewLine.getWidth(context);
    }
    getWidthIsFast() {
        if (!this._renderedViewLine) {
            return true;
        }
        return this._renderedViewLine.getWidthIsFast();
    }
    needsMonospaceFontCheck() {
        if (!this._renderedViewLine) {
            return false;
        }
        return this._renderedViewLine instanceof FastRenderedViewLine;
    }
    monospaceAssumptionsAreValid() {
        if (!this._renderedViewLine) {
            return monospaceAssumptionsAreValid;
        }
        if (this._renderedViewLine instanceof FastRenderedViewLine) {
            return this._renderedViewLine.monospaceAssumptionsAreValid();
        }
        return monospaceAssumptionsAreValid;
    }
    onMonospaceAssumptionsInvalidated() {
        if (this._renderedViewLine && this._renderedViewLine instanceof FastRenderedViewLine) {
            this._renderedViewLine = this._renderedViewLine.toSlowRenderedLine();
        }
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this._renderedViewLine) {
            return null;
        }
        startColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, startColumn));
        endColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, endColumn));
        const stopRenderingLineAfter = this._renderedViewLine.input.stopRenderingLineAfter;
        if (stopRenderingLineAfter !== -1 &&
            startColumn > stopRenderingLineAfter + 1 &&
            endColumn > stopRenderingLineAfter + 1) {
            // This range is obviously not visible
            return new VisibleRanges(true, [new FloatHorizontalRange(this.getWidth(context), 0)]);
        }
        if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1) {
            startColumn = stopRenderingLineAfter + 1;
        }
        if (stopRenderingLineAfter !== -1 && endColumn > stopRenderingLineAfter + 1) {
            endColumn = stopRenderingLineAfter + 1;
        }
        const horizontalRanges = this._renderedViewLine.getVisibleRangesForRange(lineNumber, startColumn, endColumn, context);
        if (horizontalRanges && horizontalRanges.length > 0) {
            return new VisibleRanges(false, horizontalRanges);
        }
        return null;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        if (!this._renderedViewLine) {
            return 1;
        }
        return this._renderedViewLine.getColumnOfNodeOffset(spanNode, offset);
    }
}
var Constants;
(function (Constants) {
    /**
     * It seems that rounding errors occur with long lines, so the purely multiplication based
     * method is only viable for short lines. For longer lines, we look up the real position of
     * every 300th character and use multiplication based on that.
     *
     * See https://github.com/microsoft/vscode/issues/33178
     */
    Constants[Constants["MaxMonospaceDistance"] = 300] = "MaxMonospaceDistance";
})(Constants || (Constants = {}));
/**
 * A rendered line which is guaranteed to contain only regular ASCII and is rendered with a monospace font.
 */
class FastRenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping) {
        this._cachedWidth = -1;
        this.domNode = domNode;
        this.input = renderLineInput;
        const keyColumnCount = Math.floor(renderLineInput.lineContent.length / 300 /* Constants.MaxMonospaceDistance */);
        if (keyColumnCount > 0) {
            this._keyColumnPixelOffsetCache = new Float32Array(keyColumnCount);
            for (let i = 0; i < keyColumnCount; i++) {
                this._keyColumnPixelOffsetCache[i] = -1;
            }
        }
        else {
            this._keyColumnPixelOffsetCache = null;
        }
        this._characterMapping = characterMapping;
        this._charWidth = renderLineInput.spaceWidth;
    }
    getWidth(context) {
        if (!this.domNode || this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(this._characterMapping.length);
            return Math.round(this._charWidth * horizontalOffset);
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        return (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */ || this._cachedWidth !== -1);
    }
    monospaceAssumptionsAreValid() {
        if (!this.domNode) {
            return monospaceAssumptionsAreValid;
        }
        if (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const expectedWidth = this.getWidth(null);
            const actualWidth = this.domNode.domNode.firstChild.offsetWidth;
            if (Math.abs(expectedWidth - actualWidth) >= 2) {
                // more than 2px off
                console.warn(`monospace assumptions have been violated, therefore disabling monospace optimizations!`);
                monospaceAssumptionsAreValid = false;
            }
        }
        return monospaceAssumptionsAreValid;
    }
    toSlowRenderedLine() {
        return createRenderedLine(this.domNode, this.input, this._characterMapping, false, 0 /* ForeignElementType.None */);
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        const startPosition = this._getColumnPixelOffset(lineNumber, startColumn, context);
        const endPosition = this._getColumnPixelOffset(lineNumber, endColumn, context);
        return [new FloatHorizontalRange(startPosition, endPosition - startPosition)];
    }
    _getColumnPixelOffset(lineNumber, column, context) {
        if (column <= 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnOrdinal = Math.floor((column - 1) / 300 /* Constants.MaxMonospaceDistance */) - 1;
        const keyColumn = (keyColumnOrdinal + 1) * 300 /* Constants.MaxMonospaceDistance */ + 1;
        let keyColumnPixelOffset = -1;
        if (this._keyColumnPixelOffsetCache) {
            keyColumnPixelOffset = this._keyColumnPixelOffsetCache[keyColumnOrdinal];
            if (keyColumnPixelOffset === -1) {
                keyColumnPixelOffset = this._actualReadPixelOffset(lineNumber, keyColumn, context);
                this._keyColumnPixelOffsetCache[keyColumnOrdinal] = keyColumnPixelOffset;
            }
        }
        if (keyColumnPixelOffset === -1) {
            // Could not read actual key column pixel offset
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnHorizontalOffset = this._characterMapping.getHorizontalOffset(keyColumn);
        const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
        return keyColumnPixelOffset + this._charWidth * (horizontalOffset - keyColumnHorizontalOffset);
    }
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    _actualReadPixelOffset(lineNumber, column, context) {
        if (!this.domNode) {
            return -1;
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(this.domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        return r[0].left;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
/**
 * Every time we render a line, we save what we have rendered in an instance of this class.
 */
class RenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
        this.domNode = domNode;
        this.input = renderLineInput;
        this._characterMapping = characterMapping;
        this._isWhitespaceOnly = /^\s*$/.test(renderLineInput.lineContent);
        this._containsForeignElements = containsForeignElements;
        this._cachedWidth = -1;
        this._pixelOffsetCache = null;
        if (!containsRTL || this._characterMapping.length === 0 /* the line is empty */) {
            this._pixelOffsetCache = new Float32Array(Math.max(2, this._characterMapping.length + 1));
            for (let column = 0, len = this._characterMapping.length; column <= len; column++) {
                this._pixelOffsetCache[column] = -1;
            }
        }
    }
    // --- Reading from the DOM methods
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    /**
     * Width of the line in pixels
     */
    getWidth(context) {
        if (!this.domNode) {
            return 0;
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        if (this._cachedWidth === -1) {
            return false;
        }
        return true;
    }
    /**
     * Visible ranges for a model range
     */
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this.domNode) {
            return null;
        }
        if (this._pixelOffsetCache !== null) {
            // the text is LTR
            const startOffset = this._readPixelOffset(this.domNode, lineNumber, startColumn, context);
            if (startOffset === -1) {
                return null;
            }
            const endOffset = this._readPixelOffset(this.domNode, lineNumber, endColumn, context);
            if (endOffset === -1) {
                return null;
            }
            return [new FloatHorizontalRange(startOffset, endOffset - startOffset)];
        }
        return this._readVisibleRangesForRange(this.domNode, lineNumber, startColumn, endColumn, context);
    }
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        if (startColumn === endColumn) {
            const pixelOffset = this._readPixelOffset(domNode, lineNumber, startColumn, context);
            if (pixelOffset === -1) {
                return null;
            }
            else {
                return [new FloatHorizontalRange(pixelOffset, 0)];
            }
        }
        else {
            return this._readRawVisibleRangesForRange(domNode, startColumn, endColumn, context);
        }
    }
    _readPixelOffset(domNode, lineNumber, column, context) {
        if (this._characterMapping.length === 0) {
            // This line has no content
            if (this._containsForeignElements === 0 /* ForeignElementType.None */) {
                // We can assume the line is really empty
                return 0;
            }
            if (this._containsForeignElements === 2 /* ForeignElementType.After */) {
                // We have foreign elements after the (empty) line
                return 0;
            }
            if (this._containsForeignElements === 1 /* ForeignElementType.Before */) {
                // We have foreign elements before the (empty) line
                return this.getWidth(context);
            }
            // We have foreign elements before & after the (empty) line
            const readingTarget = this._getReadingTarget(domNode);
            if (readingTarget.firstChild) {
                context.markDidDomLayout();
                return readingTarget.firstChild.offsetWidth;
            }
            else {
                return 0;
            }
        }
        if (this._pixelOffsetCache !== null) {
            // the text is LTR
            const cachedPixelOffset = this._pixelOffsetCache[column];
            if (cachedPixelOffset !== -1) {
                return cachedPixelOffset;
            }
            const result = this._actualReadPixelOffset(domNode, lineNumber, column, context);
            this._pixelOffsetCache[column] = result;
            return result;
        }
        return this._actualReadPixelOffset(domNode, lineNumber, column, context);
    }
    _actualReadPixelOffset(domNode, lineNumber, column, context) {
        if (this._characterMapping.length === 0) {
            // This line has no content
            const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), 0, 0, 0, 0, context);
            if (!r || r.length === 0) {
                return -1;
            }
            return r[0].left;
        }
        if (column === this._characterMapping.length &&
            this._isWhitespaceOnly &&
            this._containsForeignElements === 0 /* ForeignElementType.None */) {
            // This branch helps in the case of whitespace only lines which have a width set
            return this.getWidth(context);
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        const result = r[0].left;
        if (this.input.isBasicASCII) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            const expectedResult = Math.round(this.input.spaceWidth * horizontalOffset);
            if (Math.abs(expectedResult - result) <= 1) {
                return expectedResult;
            }
        }
        return result;
    }
    _readRawVisibleRangesForRange(domNode, startColumn, endColumn, context) {
        if (startColumn === 1 && endColumn === this._characterMapping.length) {
            // This branch helps IE with bidi text & gives a performance boost to other browsers when reading visible ranges for an entire line
            return [new FloatHorizontalRange(0, this.getWidth(context))];
        }
        const startDomPosition = this._characterMapping.getDomPosition(startColumn);
        const endDomPosition = this._characterMapping.getDomPosition(endColumn);
        return RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), startDomPosition.partIndex, startDomPosition.charIndex, endDomPosition.partIndex, endDomPosition.charIndex, context);
    }
    /**
     * Returns the column for the text found at a specific offset inside a rendered dom node
     */
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
class WebKitRenderedViewLine extends RenderedViewLine {
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        const output = super._readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context);
        if (!output ||
            output.length === 0 ||
            startColumn === endColumn ||
            (startColumn === 1 && endColumn === this._characterMapping.length)) {
            return output;
        }
        // WebKit is buggy and returns an expanded range (to contain words in some cases)
        // The last client rect is enlarged (I think)
        if (!this.input.containsRTL) {
            // This is an attempt to patch things up
            // Find position of last column
            const endPixelOffset = this._readPixelOffset(domNode, lineNumber, endColumn, context);
            if (endPixelOffset !== -1) {
                const lastRange = output[output.length - 1];
                if (lastRange.left < endPixelOffset) {
                    // Trim down the width of the last visible range to not go after the last column's position
                    lastRange.width = endPixelOffset - lastRange.left;
                }
            }
        }
        return output;
    }
}
const createRenderedLine = (function () {
    if (browser.isWebKit) {
        return createWebKitRenderedLine;
    }
    return createNormalRenderedLine;
})();
function createWebKitRenderedLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
    return new WebKitRenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}
function createNormalRenderedLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
    return new RenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}
export function getColumnOfNodeOffset(characterMapping, spanNode, offset) {
    const spanNodeTextContentLength = spanNode.textContent.length;
    let spanIndex = -1;
    while (spanNode) {
        spanNode = spanNode.previousSibling;
        spanIndex++;
    }
    return characterMapping.getColumn(new DomPosition(spanIndex, offset), spanNodeTextContentLength);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzL3ZpZXdMaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBR04sZUFBZSxFQUNmLGNBQWMsRUFDZCxTQUFTLEVBQ1QsV0FBVyxHQUNYLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSzdFLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQztJQUNuQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QiwwREFBMEQ7UUFDMUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSSxRQUFRLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQy9ELDBGQUEwRjtRQUMxRixLQUFLO1FBQ0wsNEZBQTRGO1FBQzVGLDZEQUE2RDtRQUM3RCxLQUFLO1FBQ0wsdUZBQXVGO1FBQ3ZGLDZEQUE2RDtRQUM3RCxLQUFLO1FB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