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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwcG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxPQUFtQixFQUFFLE1BQWM7SUFDekUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3JDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6RCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFM0QsSUFBSSxjQUFjLEdBQUcsVUFBVSxDQUFBO0lBQy9CLE9BQ0MsY0FBYyxHQUFHLENBQUMsR0FBRyxVQUFVO1FBQy9CLE9BQU8sQ0FBQyxhQUFhLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxLQUFLLGlCQUFpQixFQUM5RCxDQUFDO1FBQ0YsY0FBYyxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksZUFBZSxHQUFHLFVBQVUsQ0FBQTtJQUNoQyxPQUFPLGVBQWUsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztRQUNoRyxlQUFlLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0lBRUQsT0FBTyxJQUFJLGdCQUFnQixDQUMxQixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixjQUFjLEdBQUcsQ0FBQyxFQUNsQixPQUFPLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxFQUN2QyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUNwQyxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxnQkFBZ0I7SUFXNUIsWUFDQyxNQUFrQixFQUNsQixVQUFrQixFQUNsQixlQUF1QixFQUN2QixjQUFzQixFQUN0QixlQUF1QixFQUN2QixjQUFzQjtRQWhCdkIsMkJBQXNCLEdBQVMsU0FBUyxDQUFBO1FBa0J2QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQTtJQUM5QyxDQUFDO0lBRU0sY0FBYztRQUNwQixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdkQsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDbkQsQ0FBQztJQUVNLDBCQUEwQixDQUFDLE1BQWM7UUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3ZELE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDcEQsQ0FBQztJQUVNLHNCQUFzQixDQUFDLE1BQWM7UUFDM0MsT0FBTyxDQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQzFGLENBQUE7SUFDRixDQUFDO0lBRU0sb0JBQW9CLENBQUMsVUFBa0I7UUFDN0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25GLENBQUM7Q0FDRDtBQUVELElBQVcsc0JBRVY7QUFGRCxXQUFXLHNCQUFzQjtJQUNoQyxxRUFBc0YsQ0FBQTtBQUN2RixDQUFDLEVBRlUsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUVoQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxpQkFBb0M7SUFDekUsT0FBTyxDQUFDLGlCQUFpQix1Q0FBK0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNoRSxDQUFDIn0=