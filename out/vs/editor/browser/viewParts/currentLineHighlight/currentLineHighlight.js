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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VycmVudExpbmVIaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvY3VycmVudExpbmVIaWdobGlnaHQvY3VycmVudExpbmVIaWdobGlnaHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHlCQUF5QixHQUN6QixNQUFNLDZDQUE2QyxDQUFBO0FBSXBELE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFM0QsTUFBTSxPQUFnQiw0QkFBNkIsU0FBUSxrQkFBa0I7SUFnQjVFLFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUV2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUE7UUFDdkQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDRDQUFrQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxPQUFPLENBQUMsR0FBRyx5REFFbkQsQ0FBQTtR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