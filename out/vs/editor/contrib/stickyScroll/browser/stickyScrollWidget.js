/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../base/browser/trustedTypes.js';
import { equals } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './stickyScroll.css';
import { getColumnOfNodeOffset } from '../../../browser/viewParts/viewLines/viewLine.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../common/core/position.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, } from '../../../common/viewLayout/viewLineRenderer.js';
import { foldingCollapsedIcon, foldingExpandedIcon, } from '../../folding/browser/foldingDecorations.js';
import { Emitter } from '../../../../base/common/event.js';
export class StickyScrollWidgetState {
    constructor(startLineNumbers, endLineNumbers, lastLineRelativePosition, showEndForLine = null) {
        this.startLineNumbers = startLineNumbers;
        this.endLineNumbers = endLineNumbers;
        this.lastLineRelativePosition = lastLineRelativePosition;
        this.showEndForLine = showEndForLine;
    }
    equals(other) {
        return (!!other &&
            this.lastLineRelativePosition === other.lastLineRelativePosition &&
            this.showEndForLine === other.showEndForLine &&
            equals(this.startLineNumbers, other.startLineNumbers) &&
            equals(this.endLineNumbers, other.endLineNumbers));
    }
    static get Empty() {
        return new StickyScrollWidgetState([], [], 0);
    }
}
const _ttPolicy = createTrustedTypesPolicy('stickyScrollViewLayer', {
    createHTML: (value) => value,
});
const STICKY_INDEX_ATTR = 'data-sticky-line-index';
const STICKY_IS_LINE_ATTR = 'data-sticky-is-line';
const STICKY_IS_LINE_NUMBER_ATTR = 'data-sticky-is-line-number';
const STICKY_IS_FOLDING_ICON_ATTR = 'data-sticky-is-folding-icon';
export class StickyScrollWidget extends Disposable {
    get height() {
        return this._height;
    }
    constructor(editor) {
        super();
        this._foldingIconStore = new DisposableStore();
        this._rootDomNode = document.createElement('div');
        this._lineNumbersDomNode = document.createElement('div');
        this._linesDomNodeScrollable = document.createElement('div');
        this._linesDomNode = document.createElement('div');
        this._renderedStickyLines = [];
        this._lineNumbers = [];
        this._lastLineRelativePosition = 0;
        this._minContentWidthInPx = 0;
        this._isOnGlyphMargin = false;
        this._height = -1;
        this._onDidChangeStickyScrollHeight = this._register(new Emitter());
        this.onDidChangeStickyScrollHeight = this._onDidChangeStickyScrollHeight.event;
        this._editor = editor;
        this._lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
        this._lineNumbersDomNode.className = 'sticky-widget-line-numbers';
        this._lineNumbersDomNode.setAttribute('role', 'none');
        this._linesDomNode.className = 'sticky-widget-lines';
        this._linesDomNode.setAttribute('role', 'list');
        this._linesDomNodeScrollable.className = 'sticky-widget-lines-scrollable';
        this._linesDomNodeScrollable.appendChild(this._linesDomNode);
        this._rootDomNode.className = 'sticky-widget';
        this._rootDomNode.classList.toggle('peek', editor instanceof EmbeddedCodeEditorWidget);
        this._rootDomNode.appendChild(this._lineNumbersDomNode);
        this._rootDomNode.appendChild(this._linesDomNodeScrollable);
        this._setHeight(0);
        const updateScrollLeftPosition = () => {
            this._linesDomNode.style.left = this._editor.getOption(120 /* EditorOption.stickyScroll */)
                .scrollWithEditor
                ? `-${this._editor.getScrollLeft()}px`
                : '0px';
        };
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(120 /* EditorOption.stickyScroll */)) {
                updateScrollLeftPosition();
            }
            if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
                this._lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            }
        }));
        this._register(this._editor.onDidScrollChange((e) => {
            if (e.scrollLeftChanged) {
                updateScrollLeftPosition();
            }
            if (e.scrollWidthChanged) {
                this._updateWidgetWidth();
            }
        }));
        this._register(this._editor.onDidChangeModel(() => {
            updateScrollLeftPosition();
            this._updateWidgetWidth();
        }));
        this._register(this._foldingIconStore);
        updateScrollLeftPosition();
        this._register(this._editor.onDidLayoutChange((e) => {
            this._updateWidgetWidth();
        }));
        this._updateWidgetWidth();
    }
    get lineNumbers() {
        return this._lineNumbers;
    }
    get lineNumberCount() {
        return this._lineNumbers.length;
    }
    getRenderedStickyLine(lineNumber) {
        return this._renderedStickyLines.find((stickyLine) => stickyLine.lineNumber === lineNumber);
    }
    getCurrentLines() {
        return this._lineNumbers;
    }
    setState(_state, foldingModel, _rebuildFromLine) {
        if (_rebuildFromLine === undefined &&
            ((!this._previousState && !_state) ||
                (this._previousState && this._previousState.equals(_state)))) {
            return;
        }
        const isWidgetHeightZero = this._isWidgetHeightZero(_state);
        const state = isWidgetHeightZero ? undefined : _state;
        const rebuildFromLine = isWidgetHeightZero
            ? 0
            : this._findLineToRebuildWidgetFrom(_state, _rebuildFromLine);
        this._renderRootNode(state, foldingModel, rebuildFromLine);
        this._previousState = _state;
    }
    _isWidgetHeightZero(state) {
        if (!state) {
            return true;
        }
        const futureWidgetHeight = state.startLineNumbers.length * this._lineHeight + state.lastLineRelativePosition;
        if (futureWidgetHeight > 0) {
            this._lastLineRelativePosition = state.lastLineRelativePosition;
            const lineNumbers = [...state.startLineNumbers];
            if (state.showEndForLine !== null) {
                lineNumbers[state.showEndForLine] = state.endLineNumbers[state.showEndForLine];
            }
            this._lineNumbers = lineNumbers;
        }
        else {
            this._lastLineRelativePosition = 0;
            this._lineNumbers = [];
        }
        return futureWidgetHeight === 0;
    }
    _findLineToRebuildWidgetFrom(state, _rebuildFromLine) {
        if (!state || !this._previousState) {
            return 0;
        }
        if (_rebuildFromLine !== undefined) {
            return _rebuildFromLine;
        }
        const previousState = this._previousState;
        const indexOfLinesAlreadyRendered = state.startLineNumbers.findIndex((startLineNumber) => !previousState.startLineNumbers.includes(startLineNumber));
        return indexOfLinesAlreadyRendered === -1 ? 0 : indexOfLinesAlreadyRendered;
    }
    _updateWidgetWidth() {
        const layoutInfo = this._editor.getLayoutInfo();
        const lineNumbersWidth = layoutInfo.contentLeft;
        this._lineNumbersDomNode.style.width = `${lineNumbersWidth}px`;
        this._linesDomNodeScrollable.style.setProperty('--vscode-editorStickyScroll-scrollableWidth', `${this._editor.getScrollWidth() - layoutInfo.verticalScrollbarWidth}px`);
        this._rootDomNode.style.width = `${layoutInfo.width - layoutInfo.verticalScrollbarWidth}px`;
    }
    _clearStickyLinesFromLine(clearFromLine) {
        this._foldingIconStore.clear();
        // Removing only the lines that need to be rerendered
        for (let i = clearFromLine; i < this._renderedStickyLines.length; i++) {
            const stickyLine = this._renderedStickyLines[i];
            stickyLine.lineNumberDomNode.remove();
            stickyLine.lineDomNode.remove();
        }
        // Keep the lines that need to be updated
        this._renderedStickyLines = this._renderedStickyLines.slice(0, clearFromLine);
    }
    _useFoldingOpacityTransition(requireTransitions) {
        this._lineNumbersDomNode.style.setProperty('--vscode-editorStickyScroll-foldingOpacityTransition', `opacity ${requireTransitions ? 0.5 : 0}s`);
    }
    _setFoldingIconsVisibility(allVisible) {
        for (const line of this._renderedStickyLines) {
            const foldingIcon = line.foldingIcon;
            if (!foldingIcon) {
                continue;
            }
            foldingIcon.setVisible(allVisible ? true : foldingIcon.isCollapsed);
        }
    }
    async _renderRootNode(state, foldingModel, rebuildFromLine) {
        this._clearStickyLinesFromLine(rebuildFromLine);
        if (!state) {
            // make sure the dom is 0 height and display:none
            this._setHeight(0);
            return;
        }
        // For existing sticky lines update the top and z-index
        for (const stickyLine of this._renderedStickyLines) {
            this._updatePosition(stickyLine);
        }
        // For new sticky lines
        const layoutInfo = this._editor.getLayoutInfo();
        const linesToRender = this._lineNumbers.slice(rebuildFromLine);
        for (const [index, line] of linesToRender.entries()) {
            const stickyLine = this._renderChildNode(index + rebuildFromLine, line, foldingModel, layoutInfo);
            if (!stickyLine) {
                continue;
            }
            this._linesDomNode.appendChild(stickyLine.lineDomNode);
            this._lineNumbersDomNode.appendChild(stickyLine.lineNumberDomNode);
            this._renderedStickyLines.push(stickyLine);
        }
        if (foldingModel) {
            this._setFoldingHoverListeners();
            this._useFoldingOpacityTransition(!this._isOnGlyphMargin);
        }
        const widgetHeight = this._lineNumbers.length * this._lineHeight + this._lastLineRelativePosition;
        this._setHeight(widgetHeight);
        this._rootDomNode.style.marginLeft = '0px';
        this._minContentWidthInPx =
            Math.max(...this._renderedStickyLines.map((l) => l.scrollWidth)) +
                layoutInfo.verticalScrollbarWidth;
        this._editor.layoutOverlayWidget(this);
    }
    _setHeight(height) {
        if (this._height === height) {
            return;
        }
        this._height = height;
        if (this._height === 0) {
            this._rootDomNode.style.display = 'none';
        }
        else {
            this._rootDomNode.style.display = 'block';
            this._lineNumbersDomNode.style.height = `${this._height}px`;
            this._linesDomNodeScrollable.style.height = `${this._height}px`;
            this._rootDomNode.style.height = `${this._height}px`;
        }
        this._onDidChangeStickyScrollHeight.fire({ height: this._height });
    }
    _setFoldingHoverListeners() {
        const showFoldingControls = this._editor.getOption(115 /* EditorOption.showFoldingControls */);
        if (showFoldingControls !== 'mouseover') {
            return;
        }
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_ENTER, () => {
            this._isOnGlyphMargin = true;
            this._setFoldingIconsVisibility(true);
        }));
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_LEAVE, () => {
            this._isOnGlyphMargin = false;
            this._useFoldingOpacityTransition(true);
            this._setFoldingIconsVisibility(false);
        }));
    }
    _renderChildNode(index, line, foldingModel, layoutInfo) {
        const viewModel = this._editor._getViewModel();
        if (!viewModel) {
            return;
        }
        const viewLineNumber = viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(line, 1)).lineNumber;
        const lineRenderingData = viewModel.getViewLineRenderingData(viewLineNumber);
        const lineNumberOption = this._editor.getOption(69 /* EditorOption.lineNumbers */);
        let actualInlineDecorations;
        try {
            actualInlineDecorations = LineDecoration.filter(lineRenderingData.inlineDecorations, viewLineNumber, lineRenderingData.minColumn, lineRenderingData.maxColumn);
        }
        catch (err) {
            actualInlineDecorations = [];
        }
        const lineHeight = this._lineHeight;
        const renderLineInput = new RenderLineInput(true, true, lineRenderingData.content, lineRenderingData.continuesWithWrappedLine, lineRenderingData.isBasicASCII, lineRenderingData.containsRTL, 0, lineRenderingData.tokens, actualInlineDecorations, lineRenderingData.tabSize, lineRenderingData.startVisibleColumn, 1, 1, 1, 500, 'none', true, true, null);
        const sb = new StringBuilder(2000);
        const renderOutput = renderViewLine(renderLineInput, sb);
        let newLine;
        if (_ttPolicy) {
            newLine = _ttPolicy.createHTML(sb.build());
        }
        else {
            newLine = sb.build();
        }
        const lineHTMLNode = document.createElement('span');
        lineHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineHTMLNode.setAttribute(STICKY_IS_LINE_ATTR, '');
        lineHTMLNode.setAttribute('role', 'listitem');
        lineHTMLNode.tabIndex = 0;
        lineHTMLNode.className = 'sticky-line-content';
        lineHTMLNode.classList.add(`stickyLine${line}`);
        lineHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineHTMLNode.innerHTML = newLine;
        const lineNumberHTMLNode = document.createElement('span');
        lineNumberHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineNumberHTMLNode.setAttribute(STICKY_IS_LINE_NUMBER_ATTR, '');
        lineNumberHTMLNode.className = 'sticky-line-number';
        lineNumberHTMLNode.style.lineHeight = `${lineHeight}px`;
        const lineNumbersWidth = layoutInfo.contentLeft;
        lineNumberHTMLNode.style.width = `${lineNumbersWidth}px`;
        const innerLineNumberHTML = document.createElement('span');
        if (lineNumberOption.renderType === 1 /* RenderLineNumbersType.On */ ||
            (lineNumberOption.renderType === 3 /* RenderLineNumbersType.Interval */ && line % 10 === 0)) {
            innerLineNumberHTML.innerText = line.toString();
        }
        else if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            innerLineNumberHTML.innerText = Math.abs(line - this._editor.getPosition().lineNumber).toString();
        }
        innerLineNumberHTML.className = 'sticky-line-number-inner';
        innerLineNumberHTML.style.width = `${layoutInfo.lineNumbersWidth}px`;
        innerLineNumberHTML.style.paddingLeft = `${layoutInfo.lineNumbersLeft}px`;
        lineNumberHTMLNode.appendChild(innerLineNumberHTML);
        const foldingIcon = this._renderFoldingIconForLine(foldingModel, line);
        if (foldingIcon) {
            lineNumberHTMLNode.appendChild(foldingIcon.domNode);
            foldingIcon.domNode.style.left = `${layoutInfo.lineNumbersWidth + layoutInfo.lineNumbersLeft}px`;
        }
        this._editor.applyFontInfo(lineHTMLNode);
        this._editor.applyFontInfo(lineNumberHTMLNode);
        lineNumberHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineNumberHTMLNode.style.height = `${lineHeight}px`;
        lineHTMLNode.style.height = `${lineHeight}px`;
        const renderedLine = new RenderedStickyLine(index, line, lineHTMLNode, lineNumberHTMLNode, foldingIcon, renderOutput.characterMapping, lineHTMLNode.scrollWidth, lineHeight);
        return this._updatePosition(renderedLine);
    }
    _updatePosition(stickyLine) {
        const index = stickyLine.index;
        const lineHTMLNode = stickyLine.lineDomNode;
        const lineNumberHTMLNode = stickyLine.lineNumberDomNode;
        const isLastLine = index === this._lineNumbers.length - 1;
        if (isLastLine) {
            const zIndex = '0';
            lineHTMLNode.style.zIndex = zIndex;
            lineNumberHTMLNode.style.zIndex = zIndex;
            const top = `${index * this._lineHeight + this._lastLineRelativePosition + (stickyLine.foldingIcon?.isCollapsed ? 1 : 0)}px`;
            lineHTMLNode.style.top = top;
            lineNumberHTMLNode.style.top = top;
        }
        else {
            const zIndex = '1';
            lineHTMLNode.style.zIndex = zIndex;
            lineNumberHTMLNode.style.zIndex = zIndex;
            const top = `${index * this._lineHeight}px`;
            lineHTMLNode.style.top = top;
            lineNumberHTMLNode.style.top = top;
        }
        return stickyLine;
    }
    _renderFoldingIconForLine(foldingModel, line) {
        const showFoldingControls = this._editor.getOption(115 /* EditorOption.showFoldingControls */);
        if (!foldingModel || showFoldingControls === 'never') {
            return;
        }
        const foldingRegions = foldingModel.regions;
        const indexOfFoldingRegion = foldingRegions.findRange(line);
        const startLineNumber = foldingRegions.getStartLineNumber(indexOfFoldingRegion);
        const isFoldingScope = line === startLineNumber;
        if (!isFoldingScope) {
            return;
        }
        const isCollapsed = foldingRegions.isCollapsed(indexOfFoldingRegion);
        const foldingIcon = new StickyFoldingIcon(isCollapsed, startLineNumber, foldingRegions.getEndLineNumber(indexOfFoldingRegion), this._lineHeight);
        foldingIcon.setVisible(this._isOnGlyphMargin ? true : isCollapsed || showFoldingControls === 'always');
        foldingIcon.domNode.setAttribute(STICKY_IS_FOLDING_ICON_ATTR, '');
        return foldingIcon;
    }
    getId() {
        return 'editor.contrib.stickyScrollWidget';
    }
    getDomNode() {
        return this._rootDomNode;
    }
    getPosition() {
        return {
            preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */,
            stackOridinal: 10,
        };
    }
    getMinContentWidthInPx() {
        return this._minContentWidthInPx;
    }
    focusLineWithIndex(index) {
        if (0 <= index && index < this._renderedStickyLines.length) {
            this._renderedStickyLines[index].lineDomNode.focus();
        }
    }
    /**
     * Given a leaf dom node, tries to find the editor position.
     */
    getEditorPositionFromNode(spanDomNode) {
        if (!spanDomNode || spanDomNode.children.length > 0) {
            // This is not a leaf node
            return null;
        }
        const renderedStickyLine = this._getRenderedStickyLineFromChildDomNode(spanDomNode);
        if (!renderedStickyLine) {
            return null;
        }
        const column = getColumnOfNodeOffset(renderedStickyLine.characterMapping, spanDomNode, 0);
        return new Position(renderedStickyLine.lineNumber, column);
    }
    getLineNumberFromChildDomNode(domNode) {
        return this._getRenderedStickyLineFromChildDomNode(domNode)?.lineNumber ?? null;
    }
    _getRenderedStickyLineFromChildDomNode(domNode) {
        const index = this.getLineIndexFromChildDomNode(domNode);
        if (index === null || index < 0 || index >= this._renderedStickyLines.length) {
            return null;
        }
        return this._renderedStickyLines[index];
    }
    /**
     * Given a child dom node, tries to find the line number attribute that was stored in the node.
     * @returns the attribute value or null if none is found.
     */
    getLineIndexFromChildDomNode(domNode) {
        const lineIndex = this._getAttributeValue(domNode, STICKY_INDEX_ATTR);
        return lineIndex ? parseInt(lineIndex, 10) : null;
    }
    /**
     * Given a child dom node, tries to find if it is (contained in) a sticky line.
     * @returns a boolean.
     */
    isInStickyLine(domNode) {
        const isInLine = this._getAttributeValue(domNode, STICKY_IS_LINE_ATTR);
        return isInLine !== undefined;
    }
    /**
     * Given a child dom node, tries to find if this dom node is (contained in) a sticky folding icon.
     * @returns a boolean.
     */
    isInFoldingIconDomNode(domNode) {
        const isInFoldingIcon = this._getAttributeValue(domNode, STICKY_IS_FOLDING_ICON_ATTR);
        return isInFoldingIcon !== undefined;
    }
    /**
     * Given the dom node, finds if it or its parent sequence contains the given attribute.
     * @returns the attribute value or undefined.
     */
    _getAttributeValue(domNode, attribute) {
        while (domNode && domNode !== this._rootDomNode) {
            const line = domNode.getAttribute(attribute);
            if (line !== null) {
                return line;
            }
            domNode = domNode.parentElement;
        }
        return;
    }
}
class RenderedStickyLine {
    constructor(index, lineNumber, lineDomNode, lineNumberDomNode, foldingIcon, characterMapping, scrollWidth, height) {
        this.index = index;
        this.lineNumber = lineNumber;
        this.lineDomNode = lineDomNode;
        this.lineNumberDomNode = lineNumberDomNode;
        this.foldingIcon = foldingIcon;
        this.characterMapping = characterMapping;
        this.scrollWidth = scrollWidth;
        this.height = height;
    }
}
class StickyFoldingIcon {
    constructor(isCollapsed, foldingStartLine, foldingEndLine, dimension) {
        this.isCollapsed = isCollapsed;
        this.foldingStartLine = foldingStartLine;
        this.foldingEndLine = foldingEndLine;
        this.dimension = dimension;
        this.domNode = document.createElement('div');
        this.domNode.style.width = `26px`;
        this.domNode.style.height = `${dimension}px`;
        this.domNode.style.lineHeight = `${dimension}px`;
        this.domNode.className = ThemeIcon.asClassName(isCollapsed ? foldingCollapsedIcon : foldingExpandedIcon);
    }
    setVisible(visible) {
        this.domNode.style.cursor = visible ? 'pointer' : 'default';
        this.domNode.style.opacity = visible ? '1' : '0';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sb0JBQW9CLENBQUE7QUFPM0IsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFNekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDOUUsT0FBTyxFQUVOLGVBQWUsRUFDZixjQUFjLEdBQ2QsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLDZDQUE2QyxDQUFBO0FBRXBELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLFlBQ1UsZ0JBQTBCLEVBQzFCLGNBQXdCLEVBQ3hCLHdCQUFn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