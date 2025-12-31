/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './lineNumbers.css';
import * as platform from '../../../../base/common/platform.js';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { editorDimmedLineNumber, editorLineNumbers, } from '../../../common/core/editorColorRegistry.js';
/**
 * Renders line numbers to the left of the main view lines content.
 */
export class LineNumbersOverlay extends DynamicViewOverlay {
    static { this.CLASS_NAME = 'line-numbers'; }
    constructor(context) {
        super();
        this._context = context;
        this._readConfig();
        this._lastCursorModelPosition = new Position(1, 1);
        this._renderResult = null;
        this._activeLineNumber = 1;
        this._context.addEventHandler(this);
    }
    _readConfig() {
        const options = this._context.configuration.options;
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const lineNumbers = options.get(69 /* EditorOption.lineNumbers */);
        this._renderLineNumbers = lineNumbers.renderType;
        this._renderCustomLineNumbers = lineNumbers.renderFn;
        this._renderFinalNewline = options.get(100 /* EditorOption.renderFinalNewline */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineNumbersLeft = layoutInfo.lineNumbersLeft;
        this._lineNumbersWidth = layoutInfo.lineNumbersWidth;
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        this._readConfig();
        return true;
    }
    onCursorStateChanged(e) {
        const primaryViewPosition = e.selections[0].getPosition();
        this._lastCursorModelPosition =
            this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(primaryViewPosition);
        let shouldRender = false;
        if (this._activeLineNumber !== primaryViewPosition.lineNumber) {
            this._activeLineNumber = primaryViewPosition.lineNumber;
            shouldRender = true;
        }
        if (this._renderLineNumbers === 2 /* RenderLineNumbersType.Relative */ ||
            this._renderLineNumbers === 3 /* RenderLineNumbersType.Interval */) {
            shouldRender = true;
        }
        return shouldRender;
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
    onDecorationsChanged(e) {
        return e.affectsLineNumber;
    }
    // --- end event handlers
    _getLineRenderLineNumber(viewLineNumber) {
        const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(viewLineNumber, 1));
        if (modelPosition.column !== 1) {
            return '';
        }
        const modelLineNumber = modelPosition.lineNumber;
        if (this._renderCustomLineNumbers) {
            return this._renderCustomLineNumbers(modelLineNumber);
        }
        if (this._renderLineNumbers === 2 /* RenderLineNumbersType.Relative */) {
            const diff = Math.abs(this._lastCursorModelPosition.lineNumber - modelLineNumber);
            if (diff === 0) {
                return '<span class="relative-current-line-number">' + modelLineNumber + '</span>';
            }
            return String(diff);
        }
        if (this._renderLineNumbers === 3 /* RenderLineNumbersType.Interval */) {
            if (this._lastCursorModelPosition.lineNumber === modelLineNumber) {
                return String(modelLineNumber);
            }
            if (modelLineNumber % 10 === 0) {
                return String(modelLineNumber);
            }
            const finalLineNumber = this._context.viewModel.getLineCount();
            if (modelLineNumber === finalLineNumber) {
                return String(modelLineNumber);
            }
            return '';
        }
        return String(modelLineNumber);
    }
    prepareRender(ctx) {
        if (this._renderLineNumbers === 0 /* RenderLineNumbersType.Off */) {
            this._renderResult = null;
            return;
        }
        const lineHeightClassName = platform.isLinux
            ? this._lineHeight % 2 === 0
                ? ' lh-even'
                : ' lh-odd'
            : '';
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const lineNoDecorations = this._context.viewModel
            .getDecorationsInViewport(ctx.visibleRange)
            .filter((d) => !!d.options.lineNumberClassName);
        lineNoDecorations.sort((a, b) => Range.compareRangesUsingEnds(a.range, b.range));
        let decorationStartIndex = 0;
        const lineCount = this._context.viewModel.getLineCount();
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            let renderLineNumber = this._getLineRenderLineNumber(lineNumber);
            let extraClassNames = '';
            // skip decorations whose end positions we've already passed
            while (decorationStartIndex < lineNoDecorations.length &&
                lineNoDecorations[decorationStartIndex].range.endLineNumber < lineNumber) {
                decorationStartIndex++;
            }
            for (let i = decorationStartIndex; i < lineNoDecorations.length; i++) {
                const { range, options } = lineNoDecorations[i];
                if (range.startLineNumber <= lineNumber) {
                    extraClassNames += ' ' + options.lineNumberClassName;
                }
            }
            if (!renderLineNumber && !extraClassNames) {
                output[lineIndex] = '';
                continue;
            }
            if (lineNumber === lineCount && this._context.viewModel.getLineLength(lineNumber) === 0) {
                // this is the last line
                if (this._renderFinalNewline === 'off') {
                    renderLineNumber = '';
                }
                if (this._renderFinalNewline === 'dimmed') {
                    extraClassNames += ' dimmed-line-number';
                }
            }
            if (lineNumber === this._activeLineNumber) {
                extraClassNames += ' active-line-number';
            }
            output[lineIndex] =
                `<div class="${LineNumbersOverlay.CLASS_NAME}${lineHeightClassName}${extraClassNames}" style="left:${this._lineNumbersLeft}px;width:${this._lineNumbersWidth}px;">${renderLineNumber}</div>`;
        }
        this._renderResult = output;
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
registerThemingParticipant((theme, collector) => {
    const editorLineNumbersColor = theme.getColor(editorLineNumbers);
    const editorDimmedLineNumberColor = theme.getColor(editorDimmedLineNumber);
    if (editorDimmedLineNumberColor) {
        collector.addRule(`.monaco-editor .line-numbers.dimmed-line-number { color: ${editorDimmedLineNumberColor}; }`);
    }
    else if (editorLineNumbersColor) {
        collector.addRule(`.monaco-editor .line-numbers.dimmed-line-number { color: ${editorLineNumbersColor.transparent(0.4)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZU51bWJlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbGluZU51bWJlcnMvbGluZU51bWJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJckQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixpQkFBaUIsR0FDakIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxrQkFBa0I7YUFDbEMsZUFBVSxHQUFHLGNBQWMsQ0FBQTtJQWNsRCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFFdkIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBRWxCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sV0FBVztRQUNsQixNQUFN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