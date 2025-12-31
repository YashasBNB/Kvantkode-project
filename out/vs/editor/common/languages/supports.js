/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function createScopedLineTokens(context, offset) {
    const tokenCount = context.getCount();
    const tokenIndex = context.findTokenIndexAtOffset(offset);
    const desiredLanguageId = context.getLanguageId(tokenIndex);
    let lastTokenIndex = tokenIndex;
    while (lastTokenIndex + 1 < tokenCount &&
        context.getLanguageId(lastTokenIndex + 1) === desiredLanguageId) {
        lastTokenIndex++;
    }
    let firstTokenIndex = tokenIndex;
    while (firstTokenIndex > 0 && context.getLanguageId(firstTokenIndex - 1) === desiredLanguageId) {
        firstTokenIndex--;
    }
    return new ScopedLineTokens(context, desiredLanguageId, firstTokenIndex, lastTokenIndex + 1, context.getStartOffset(firstTokenIndex), context.getEndOffset(lastTokenIndex));
}
export class ScopedLineTokens {
    constructor(actual, languageId, firstTokenIndex, lastTokenIndex, firstCharOffset, lastCharOffset) {
        this._scopedLineTokensBrand = undefined;
        this._actual = actual;
        this.languageId = languageId;
        this._firstTokenIndex = firstTokenIndex;
        this._lastTokenIndex = lastTokenIndex;
        this.firstCharOffset = firstCharOffset;
        this._lastCharOffset = lastCharOffset;
        this.languageIdCodec = actual.languageIdCodec;
    }
    getLineContent() {
        const actualLineContent = this._actual.getLineContent();
        return actualLineContent.substring(this.firstCharOffset, this._lastCharOffset);
    }
    getLineLength() {
        return this._lastCharOffset - this.firstCharOffset;
    }
    getActualLineContentBefore(offset) {
        const actualLineContent = this._actual.getLineContent();
        return actualLineContent.substring(0, this.firstCharOffset + offset);
    }
    getTokenCount() {
        return this._lastTokenIndex - this._firstTokenIndex;
    }
    findTokenIndexAtOffset(offset) {
        return (this._actual.findTokenIndexAtOffset(offset + this.firstCharOffset) - this._firstTokenIndex);
    }
    getStandardTokenType(tokenIndex) {
        return this._actual.getStandardTokenType(tokenIndex + this._firstTokenIndex);
    }
    toIViewLineTokens() {
        return this._actual.sliceAndInflate(this.firstCharOffset, this._lastCharOffset, 0);
    }
}
var IgnoreBracketsInTokens;
(function (IgnoreBracketsInTokens) {
    IgnoreBracketsInTokens[IgnoreBracketsInTokens["value"] = 3] = "value";
})(IgnoreBracketsInTokens || (IgnoreBracketsInTokens = {}));
export function ignoreBracketsInToken(standardTokenType) {
    return (standardTokenType & 3 /* IgnoreBracketsInTokens.value */) !== 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwcG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLFVBQVUsc0JBQXNCLENBQUMsT0FBbUIsRUFBRSxNQUFjO0lBQ3pFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDekQsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBRTNELElBQUksY0FBYyxHQUFHLFVBQVUsQ0FBQTtJQUMvQixPQUNDLGNBQWMsR0FBRyxDQUFDLEdBQUcsVUFBVTtRQUMvQixPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsS0FBSyxpQkFBaUIsRUFDOUQsQ0FBQztRQUNGLGNBQWMsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLGVBQWUsR0FBRyxVQUFVLENBQUE7SUFDaEMsT0FBTyxlQUFlLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxLQUFLLGlCQUFpQixFQUFFLENBQUM7UUFDaEcsZUFBZSxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVELE9BQU8sSUFBSSxnQkFBZ0IsQ0FDMUIsT0FBTyxFQUNQLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsY0FBYyxHQUFHLENBQUMsRUFDbEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsRUFDdkMsT0FBTyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FDcEMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sZ0JBQWdCO0lBVzVCLFlBQ0MsTUFBa0IsRUFDbEIsVUFBa0IsRUFDbEIsZUFBdUIsRUFDdkIsY0FBc0IsRUFDdEIsZUFBdUIsRUFDdkIsY0FBc0I7UUFoQnZCLDJCQUFzQixHQUFTLFNBQVMsQ0FBQTtRQWtCdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUE7SUFDOUMsQ0FBQztJQUVNLGNBQWM7UUFDcEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3ZELE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQ25ELENBQUM7SUFFTSwwQkFBMEIsQ0FBQyxNQUFjO1FBQy9DLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN2RCxPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQ3BELENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxNQUFjO1FBQzNDLE9BQU8sQ0FDTixJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUMxRixDQUFBO0lBQ0YsQ0FBQztJQUVNLG9CQUFvQixDQUFDLFVBQWtCO1FBQzdDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuRixDQUFDO0NBQ0Q7QUFFRCxJQUFXLHNCQUVWO0FBRkQsV0FBVyxzQkFBc0I7SUFDaEMscUVBQXNGLENBQUE7QUFDdkYsQ0FBQyxFQUZVLHNCQUFzQixLQUF0QixzQkFBc0IsUUFFaEM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsaUJBQW9DO0lBQ3pFLE9BQU8sQ0FBQyxpQkFBaUIsdUNBQStCLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDaEUsQ0FBQyJ9