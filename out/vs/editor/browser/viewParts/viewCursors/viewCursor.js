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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0N1cnNvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdDdXJzb3JzL3ZpZXdDdXJzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQWdCLE1BQU0seUNBQXlDLENBQUE7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUlyRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQVV6RyxNQUFNLG9CQUFvQjtJQUN6QixZQUNpQixHQUFXLEVBQ1gsSUFBWSxFQUNaLFdBQW1CLEVBQ25CLEtBQWEsRUFDYixNQUFjLEVBQ2QsV0FBbUIsRUFDbkIsb0JBQTRCO1FBTjVCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7SUFDMUMsQ0FBQztDQUNKO0FBRUQsTUFBTSxDQUFOLElBQVksZUFJWDtBQUpELFdBQVksZUFBZTtJQUMxQix5REFB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