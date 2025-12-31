/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import * as strings from '../../../../base/common/strings.js';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { TextEditorCursorStyle } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
class ViewCursorRenderData {
    constructor(top, left, paddingLeft, width, height, textContent, textContentClassName) {
        this.top = top;
        this.left = left;
        this.paddingLeft = paddingLeft;
        this.width = width;
        this.height = height;
        this.textContent = textContent;
        this.textContentClassName = textContentClassName;
    }
}
export var CursorPlurality;
(function (CursorPlurality) {
    CursorPlurality[CursorPlurality["Single"] = 0] = "Single";
    CursorPlurality[CursorPlurality["MultiPrimary"] = 1] = "MultiPrimary";
    CursorPlurality[CursorPlurality["MultiSecondary"] = 2] = "MultiSecondary";
})(CursorPlurality || (CursorPlurality = {}));
export class ViewCursor {
    constructor(context, plurality) {
        this._context = context;
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._lineCursorWidth = Math.min(options.get(31 /* EditorOption.cursorWidth */), this._typicalHalfwidthCharacterWidth);
        this._isVisible = true;
        // Create the dom node
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setClassName(`cursor ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
        this._domNode.setHeight(this._lineHeight);
        this._domNode.setTop(0);
        this._domNode.setLeft(0);
        applyFontInfo(this._domNode, fontInfo);
        this._domNode.setDisplay('none');
        this._position = new Position(1, 1);
        this._pluralityClass = '';
        this.setPlurality(plurality);
        this._lastRenderedContent = '';
        this._renderData = null;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position;
    }
    setPlurality(plurality) {
        switch (plurality) {
            default:
            case CursorPlurality.Single:
                this._pluralityClass = '';
                break;
            case CursorPlurality.MultiPrimary:
                this._pluralityClass = 'cursor-primary';
                break;
            case CursorPlurality.MultiSecondary:
                this._pluralityClass = 'cursor-secondary';
                break;
        }
    }
    show() {
        if (!this._isVisible) {
            this._domNode.setVisibility('inherit');
            this._isVisible = true;
        }
    }
    hide() {
        if (this._isVisible) {
            this._domNode.setVisibility('hidden');
            this._isVisible = false;
        }
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._lineCursorWidth = Math.min(options.get(31 /* EditorOption.cursorWidth */), this._typicalHalfwidthCharacterWidth);
        applyFontInfo(this._domNode, fontInfo);
        return true;
    }
    onCursorPositionChanged(position, pauseAnimation) {
        if (pauseAnimation) {
            this._domNode.domNode.style.transitionProperty = 'none';
        }
        else {
            this._domNode.domNode.style.transitionProperty = '';
        }
        this._position = position;
        return true;
    }
    /**
     * If `this._position` is inside a grapheme, returns the position where the grapheme starts.
     * Also returns the next grapheme.
     */
    _getGraphemeAwarePosition() {
        const { lineNumber, column } = this._position;
        const lineContent = this._context.viewModel.getLineContent(lineNumber);
        const [startOffset, endOffset] = strings.getCharContainingOffset(lineContent, column - 1);
        return [
            new Position(lineNumber, startOffset + 1),
            lineContent.substring(startOffset, endOffset),
        ];
    }
    _prepareRender(ctx) {
        let textContent = '';
        let textContentClassName = '';
        const [position, nextGrapheme] = this._getGraphemeAwarePosition();
        if (this._cursorStyle === TextEditorCursorStyle.Line ||
            this._cursorStyle === TextEditorCursorStyle.LineThin) {
            const visibleRange = ctx.visibleRangeForPosition(position);
            if (!visibleRange || visibleRange.outsideRenderedLine) {
                // Outside viewport
                return null;
            }
            const window = dom.getWindow(this._domNode.domNode);
            let width;
            if (this._cursorStyle === TextEditorCursorStyle.Line) {
                width = dom.computeScreenAwareSize(window, this._lineCursorWidth > 0 ? this._lineCursorWidth : 2);
                if (width > 2) {
                    textContent = nextGrapheme;
                    textContentClassName = this._getTokenClassName(position);
                }
            }
            else {
                width = dom.computeScreenAwareSize(window, 1);
            }
            let left = visibleRange.left;
            let paddingLeft = 0;
            if (width >= 2 && left >= 1) {
                // shift the cursor a bit between the characters
                paddingLeft = 1;
                left -= paddingLeft;
            }
            const top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.bigNumbersDelta;
            return new ViewCursorRenderData(top, left, paddingLeft, width, this._lineHeight, textContent, textContentClassName);
        }
        const visibleRangeForCharacter = ctx.linesVisibleRangesForRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column + nextGrapheme.length), false);
        if (!visibleRangeForCharacter || visibleRangeForCharacter.length === 0) {
            // Outside viewport
            return null;
        }
        const firstVisibleRangeForCharacter = visibleRangeForCharacter[0];
        if (firstVisibleRangeForCharacter.outsideRenderedLine ||
            firstVisibleRangeForCharacter.ranges.length === 0) {
            // Outside viewport
            return null;
        }
        const range = firstVisibleRangeForCharacter.ranges[0];
        const width = nextGrapheme === '\t'
            ? this._typicalHalfwidthCharacterWidth
            : range.width < 1
                ? this._typicalHalfwidthCharacterWidth
                : range.width;
        if (this._cursorStyle === TextEditorCursorStyle.Block) {
            textContent = nextGrapheme;
            textContentClassName = this._getTokenClassName(position);
        }
        let top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.bigNumbersDelta;
        let height = this._lineHeight;
        // Underline might interfere with clicking
        if (this._cursorStyle === TextEditorCursorStyle.Underline ||
            this._cursorStyle === TextEditorCursorStyle.UnderlineThin) {
            top += this._lineHeight - 2;
            height = 2;
        }
        return new ViewCursorRenderData(top, range.left, 0, width, height, textContent, textContentClassName);
    }
    _getTokenClassName(position) {
        const lineData = this._context.viewModel.getViewLineData(position.lineNumber);
        const tokenIndex = lineData.tokens.findTokenIndexAtOffset(position.column - 1);
        return lineData.tokens.getClassName(tokenIndex);
    }
    prepareRender(ctx) {
        this._renderData = this._prepareRender(ctx);
    }
    render(ctx) {
        if (!this._renderData) {
            this._domNode.setDisplay('none');
            return null;
        }
        if (this._lastRenderedContent !== this._renderData.textContent) {
            this._lastRenderedContent = this._renderData.textContent;
            this._domNode.domNode.textContent = this._lastRenderedContent;
        }
        this._domNode.setClassName(`cursor ${this._pluralityClass} ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ${this._renderData.textContentClassName}`);
        this._domNode.setDisplay('block');
        this._domNode.setTop(this._renderData.top);
        this._domNode.setLeft(this._renderData.left);
        this._domNode.setPaddingLeft(this._renderData.paddingLeft);
        this._domNode.setWidth(this._renderData.width);
        this._domNode.setLineHeight(this._renderData.height);
        this._domNode.setHeight(this._renderData.height);
        return {
            domNode: this._domNode.domNode,
            position: this._position,
            contentLeft: this._renderData.left,
            height: this._renderData.height,
            width: 2,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0N1cnNvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3Q3Vyc29ycy92aWV3Q3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFnQixNQUFNLHlDQUF5QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJckQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFVekcsTUFBTSxvQkFBb0I7SUFDekIsWUFDaUIsR0FBVyxFQUNYLElBQVksRUFDWixXQUFtQixFQUNuQixLQUFhLEVBQ2IsTUFBYyxFQUNkLFdBQW1CLEVBQ25CLG9CQUE0QjtRQU41QixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFRO0lBQzFDLENBQUM7Q0FDSjtBQUVELE1BQU0sQ0FBTixJQUFZLGVBSVg7QUFKRCxXQUFZLGVBQWU7SUFDMUIseURBQU0sQ0FB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