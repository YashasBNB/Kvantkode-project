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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLDZCQUE2QixDQUFBO0FBRXJELE9BQU8sS0FBSyxPQUFPLE1BQU0sOEJBQThCLENBQUE7QUFFdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBMFB2QyxNQUFNLE9BQU8sUUFBUTtJQVFwQixZQUFZLEdBQVcsRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLE1BQWM7UUFQM0QsbUJBQWMsR0FBUyxTQUFTLENBQUE7UUFReEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7Q0FDRDtBQTZCRCxNQUFNLE9BQU8seUJBQXlCO0lBSXJDLFlBQVksT0FBZSxFQUFFLElBQWdDO1FBQzVELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxZQUFZO0lBaUN4QixZQUNDLE9BQWUsRUFDZix3QkFBaUMsRUFDakMsU0FBaUIsRUFDakIsU0FBaUIsRUFDakIsa0JBQTBCLEVBQzFCLE1BQXVCLEVBQ3ZCLGlCQUErRDtRQXZDaEUsdUJBQWtCLEdBQVMsU0FBUyxDQUFBO1FBeUNuQyxJQUFJLENBQUMsT0FBTyxHQUFH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