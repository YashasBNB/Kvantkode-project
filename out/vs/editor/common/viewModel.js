/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../base/common/arrays.js';
import * as strings from '../../base/common/strings.js';
import { Range } from './core/range.js';
export class Viewport {
    constructor(top, left, width, height) {
        this._viewportBrand = undefined;
        this.top = top | 0;
        this.left = left | 0;
        this.width = width | 0;
        this.height = height | 0;
    }
}
export class MinimapLinesRenderingData {
    constructor(tabSize, data) {
        this.tabSize = tabSize;
        this.data = data;
    }
}
export class ViewLineData {
    constructor(content, continuesWithWrappedLine, minColumn, maxColumn, startVisibleColumn, tokens, inlineDecorations) {
        this._viewLineDataBrand = undefined;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.startVisibleColumn = startVisibleColumn;
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
    }
}
export class ViewLineRenderingData {
    constructor(minColumn, maxColumn, content, continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, tokens, inlineDecorations, tabSize, startVisibleColumn) {
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = ViewLineRenderingData.isBasicASCII(content, mightContainNonBasicASCII);
        this.containsRTL = ViewLineRenderingData.containsRTL(content, this.isBasicASCII, mightContainRTL);
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
    }
    static isBasicASCII(lineContent, mightContainNonBasicASCII) {
        if (mightContainNonBasicASCII) {
            return strings.isBasicASCII(lineContent);
        }
        return true;
    }
    static containsRTL(lineContent, isBasicASCII, mightContainRTL) {
        if (!isBasicASCII && mightContainRTL) {
            return strings.containsRTL(lineContent);
        }
        return false;
    }
}
export var InlineDecorationType;
(function (InlineDecorationType) {
    InlineDecorationType[InlineDecorationType["Regular"] = 0] = "Regular";
    InlineDecorationType[InlineDecorationType["Before"] = 1] = "Before";
    InlineDecorationType[InlineDecorationType["After"] = 2] = "After";
    InlineDecorationType[InlineDecorationType["RegularAffectingLetterSpacing"] = 3] = "RegularAffectingLetterSpacing";
})(InlineDecorationType || (InlineDecorationType = {}));
export class InlineDecoration {
    constructor(range, inlineClassName, type) {
        this.range = range;
        this.inlineClassName = inlineClassName;
        this.type = type;
    }
}
export class SingleLineInlineDecoration {
    constructor(startOffset, endOffset, inlineClassName, inlineClassNameAffectsLetterSpacing) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.inlineClassName = inlineClassName;
        this.inlineClassNameAffectsLetterSpacing = inlineClassNameAffectsLetterSpacing;
    }
    toInlineDecoration(lineNumber) {
        return new InlineDecoration(new Range(lineNumber, this.startOffset + 1, lineNumber, this.endOffset + 1), this.inlineClassName, this.inlineClassNameAffectsLetterSpacing
            ? 3 /* InlineDecorationType.RegularAffectingLetterSpacing */
            : 0 /* InlineDecorationType.Regular */);
    }
}
export class ViewModelDecoration {
    constructor(range, options) {
        this._viewModelDecorationBrand = undefined;
        this.range = range;
        this.options = options;
    }
}
export class OverviewRulerDecorationsGroup {
    constructor(color, zIndex, 
    /**
     * Decorations are encoded in a number array using the following scheme:
     *  - 3*i = lane
     *  - 3*i+1 = startLineNumber
     *  - 3*i+2 = endLineNumber
     */
    data) {
        this.color = color;
        this.zIndex = zIndex;
        this.data = data;
    }
    static compareByRenderingProps(a, b) {
        if (a.zIndex === b.zIndex) {
            if (a.color < b.color) {
                return -1;
            }
            if (a.color > b.color) {
                return 1;
            }
            return 0;
        }
        return a.zIndex - b.zIndex;
    }
    static equals(a, b) {
        return a.color === b.color && a.zIndex === b.zIndex && arrays.equals(a.data, b.data);
    }
    static equalsArr(a, b) {
        return arrays.equals(a, b, OverviewRulerDecorationsGroup.equals);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSw2QkFBNkIsQ0FBQTtBQUVyRCxPQUFPLEtBQUssT0FBTyxNQUFNLDhCQUE4QixDQUFBO0FBRXZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQTBQdkMsTUFBTSxPQUFPLFFBQVE7SUFRcEIsWUFBWSxHQUFXLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxNQUFjO1FBUDNELG1CQUFjLEdBQVMsU0FBUyxDQUFBO1FBUXhDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUN6QixDQUFDO0NBQ0Q7QUE2QkQsTUFBTSxPQUFPLHlCQUF5QjtJQUlyQyxZQUFZLE9BQWUsRUFBRSxJQUFnQztRQUM1RCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQWlDeEIsWUFDQyxPQUFlLEVBQ2Ysd0JBQWlDLEVBQ2pDLFNBQWlCLEVBQ2pCLFNBQWlCLEVBQ2pCLGtCQUEwQixFQUMxQixNQUF1QixFQUN2QixpQkFBK0Q7UUF2Q2hFLHVCQUFrQixHQUFTLFNBQVMsQ0FBQTtRQXlDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFP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