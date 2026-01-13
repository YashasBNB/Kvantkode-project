/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './currentLineHighlight.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorLineHighlight, editorLineHighlightBorder, } from '../../../common/core/editorColorRegistry.js';
import * as arrays from '../../../../base/common/arrays.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Selection } from '../../../common/core/selection.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { Position } from '../../../common/core/position.js';
export class AbstractLineHighlightOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._renderLineHighlight = options.get(101 /* EditorOption.renderLineHighlight */);
        this._renderLineHighlightOnlyWhenFocus = options.get(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */);
        this._wordWrap = layoutInfo.isViewportWrapping;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._selectionIsEmpty = true;
        this._focused = false;
        this._cursorLineNumbers = [1];
        this._selections = [new Selection(1, 1, 1, 1)];
        this._renderData = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
    _readFromSelections() {
        let hasChanged = false;
        const lineNumbers = new Set();
        for (const selection of this._selections) {
            lineNumbers.add(selection.positionLineNumber);
        }
        const cursorsLineNumbers = Array.from(lineNumbers);
        cursorsLineNumbers.sort((a, b) => a - b);
        if (!arrays.equals(this._cursorLineNumbers, cursorsLineNumbers)) {
            this._cursorLineNumbers = cursorsLineNumbers;
            hasChanged = true;
        }
        const selectionIsEmpty = this._selections.every((s) => s.isEmpty());
        if (this._selectionIsEmpty !== selectionIsEmpty) {
            this._selectionIsEmpty = selectionIsEmpty;
            hasChanged = true;
        }
        return hasChanged;
    }
    // --- begin event handlers
    onThemeChanged(e) {
        return this._readFromSelections();
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._renderLineHighlight = options.get(101 /* EditorOption.renderLineHighlight */);
        this._renderLineHighlightOnlyWhenFocus = options.get(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */);
        this._wordWrap = layoutInfo.isViewportWrapping;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        return true;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        return this._readFromSelections();
    }
    onFlushed(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollWidthChanged || e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onFocusChanged(e) {
        if (!this._renderLineHighlightOnlyWhenFocus) {
            return false;
        }
        this._focused = e.isFocused;
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (!this._shouldRenderThis()) {
            this._renderData = null;
            return;
        }
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        // initialize renderData
        const renderData = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            renderData[lineIndex] = '';
        }
        if (this._wordWrap) {
            // do a first pass to render wrapped lines
            const renderedLineWrapped = this._renderOne(ctx, false);
            for (const cursorLineNumber of this._cursorLineNumbers) {
                const coordinatesConverter = this._context.viewModel.coordinatesConverter;
                const modelLineNumber = coordinatesConverter.convertViewPositionToModelPosition(new Position(cursorLineNumber, 1)).lineNumber;
                const firstViewLineNumber = coordinatesConverter.convertModelPositionToViewPosition(new Position(modelLineNumber, 1)).lineNumber;
                const lastViewLineNumber = coordinatesConverter.convertModelPositionToViewPosition(new Position(modelLineNumber, this._context.viewModel.model.getLineMaxColumn(modelLineNumber))).lineNumber;
                const firstLine = Math.max(firstViewLineNumber, visibleStartLineNumber);
                const lastLine = Math.min(lastViewLineNumber, visibleEndLineNumber);
                for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
                    const lineIndex = lineNumber - visibleStartLineNumber;
                    renderData[lineIndex] = renderedLineWrapped;
                }
            }
        }
        // do a second pass to render exact lines
        const renderedLineExact = this._renderOne(ctx, true);
        for (const cursorLineNumber of this._cursorLineNumbers) {
            if (cursorLineNumber < visibleStartLineNumber || cursorLineNumber > visibleEndLineNumber) {
                continue;
            }
            const lineIndex = cursorLineNumber - visibleStartLineNumber;
            renderData[lineIndex] = renderedLineExact;
        }
        this._renderData = renderData;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderData) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex >= this._renderData.length) {
            return '';
        }
        return this._renderData[lineIndex];
    }
    _shouldRenderInMargin() {
        return ((this._renderLineHighlight === 'gutter' || this._renderLineHighlight === 'all') &&
            (!this._renderLineHighlightOnlyWhenFocus || this._focused));
    }
    _shouldRenderInContent() {
        return ((this._renderLineHighlight === 'line' || this._renderLineHighlight === 'all') &&
            this._selectionIsEmpty &&
            (!this._renderLineHighlightOnlyWhenFocus || this._focused));
    }
}
/**
 * Emphasizes the current line by drawing a border around it.
 */
export class CurrentLineHighlightOverlay extends AbstractLineHighlightOverlay {
    _renderOne(ctx, exact) {
        const className = 'current-line' +
            (this._shouldRenderInMargin() ? ' current-line-both' : '') +
            (exact ? ' current-line-exact' : '');
        return `<div class="${className}" style="width:${Math.max(ctx.scrollWidth, this._contentWidth)}px;"></div>`;
    }
    _shouldRenderThis() {
        return this._shouldRenderInContent();
    }
    _shouldRenderOther() {
        return this._shouldRenderInMargin();
    }
}
/**
 * Emphasizes the current line margin/gutter by drawing a border around it.
 */
export class CurrentLineMarginHighlightOverlay extends AbstractLineHighlightOverlay {
    _renderOne(ctx, exact) {
        const className = 'current-line' +
            (this._shouldRenderInMargin() ? ' current-line-margin' : '') +
            (this._shouldRenderOther() ? ' current-line-margin-both' : '') +
            (this._shouldRenderInMargin() && exact ? ' current-line-exact-margin' : '');
        return `<div class="${className}" style="width:${this._contentLeft}px"></div>`;
    }
    _shouldRenderThis() {
        return true;
    }
    _shouldRenderOther() {
        return this._shouldRenderInContent();
    }
}
registerThemingParticipant((theme, collector) => {
    const lineHighlight = theme.getColor(editorLineHighlight);
    if (lineHighlight) {
        collector.addRule(`.monaco-editor .view-overlays .current-line { background-color: ${lineHighlight}; }`);
        collector.addRule(`.monaco-editor .margin-view-overlays .current-line-margin { background-color: ${lineHighlight}; border: none; }`);
    }
    if (!lineHighlight || lineHighlight.isTransparent() || theme.defines(editorLineHighlightBorder)) {
        const lineHighlightBorder = theme.getColor(editorLineHighlightBorder);
        if (lineHighlightBorder) {
            collector.addRule(`.monaco-editor .view-overlays .current-line-exact { border: 2px solid ${lineHighlightBorder}; }`);
            collector.addRule(`.monaco-editor .margin-view-overlays .current-line-exact-margin { border: 2px solid ${lineHighlightBorder}; }`);
            if (isHighContrast(theme.type)) {
                collector.addRule(`.monaco-editor .view-overlays .current-line-exact { border-width: 1px; }`);
                collector.addRule(`.monaco-editor .margin-view-overlays .current-line-exact-margin { border-width: 1px; }`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VycmVudExpbmVIaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9jdXJyZW50TGluZUhpZ2hsaWdodC9jdXJyZW50TGluZUhpZ2hsaWdodC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIseUJBQXlCLEdBQ3pCLE1BQU0sNkNBQTZDLENBQUE7QUFJcEQsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxNQUFNLE9BQWdCLDRCQUE2QixTQUFRLGtCQUFrQjtJQWdCNUUsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBRXZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQTtRQUN2RCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsNENBQWtDLENBQUE7UUFDekUsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLE9BQU8s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