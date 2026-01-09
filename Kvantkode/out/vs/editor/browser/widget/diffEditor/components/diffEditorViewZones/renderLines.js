/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { EditorFontLigatures, } from '../../../../../common/config/editorOptions.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../../../../common/viewModel.js';
const ttPolicy = createTrustedTypesPolicy('diffEditorWidget', { createHTML: (value) => value });
export function renderLines(source, options, decorations, domNode, noExtra = false) {
    applyFontInfo(domNode, options.fontInfo);
    const hasCharChanges = decorations.length > 0;
    const sb = new StringBuilder(10000);
    let maxCharsPerLine = 0;
    let renderedLineCount = 0;
    const viewLineCounts = [];
    for (let lineIndex = 0; lineIndex < source.lineTokens.length; lineIndex++) {
        const lineNumber = lineIndex + 1;
        const lineTokens = source.lineTokens[lineIndex];
        const lineBreakData = source.lineBreakData[lineIndex];
        const actualDecorations = LineDecoration.filter(decorations, lineNumber, 1, Number.MAX_SAFE_INTEGER);
        if (lineBreakData) {
            let lastBreakOffset = 0;
            for (const breakOffset of lineBreakData.breakOffsets) {
                const viewLineTokens = lineTokens.sliceAndInflate(lastBreakOffset, breakOffset, 0);
                maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, viewLineTokens, LineDecoration.extractWrapped(actualDecorations, lastBreakOffset, breakOffset), hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
                renderedLineCount++;
                lastBreakOffset = breakOffset;
            }
            viewLineCounts.push(lineBreakData.breakOffsets.length);
        }
        else {
            viewLineCounts.push(1);
            maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, lineTokens, actualDecorations, hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
            renderedLineCount++;
        }
    }
    maxCharsPerLine += options.scrollBeyondLastColumn;
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
    const minWidthInPx = maxCharsPerLine * options.typicalHalfwidthCharacterWidth;
    return {
        heightInLines: renderedLineCount,
        minWidthInPx,
        viewLineCounts,
    };
}
export class LineSource {
    constructor(lineTokens, lineBreakData = lineTokens.map((t) => null), mightContainNonBasicASCII = true, mightContainRTL = true) {
        this.lineTokens = lineTokens;
        this.lineBreakData = lineBreakData;
        this.mightContainNonBasicASCII = mightContainNonBasicASCII;
        this.mightContainRTL = mightContainRTL;
    }
}
export class RenderOptions {
    static fromEditor(editor) {
        const modifiedEditorOptions = editor.getOptions();
        const fontInfo = modifiedEditorOptions.get(52 /* EditorOption.fontInfo */);
        const layoutInfo = modifiedEditorOptions.get(151 /* EditorOption.layoutInfo */);
        return new RenderOptions(editor.getModel()?.getOptions().tabSize || 0, fontInfo, modifiedEditorOptions.get(33 /* EditorOption.disableMonospaceOptimizations */), fontInfo.typicalHalfwidthCharacterWidth, modifiedEditorOptions.get(109 /* EditorOption.scrollBeyondLastColumn */), modifiedEditorOptions.get(68 /* EditorOption.lineHeight */), layoutInfo.decorationsWidth, modifiedEditorOptions.get(122 /* EditorOption.stopRenderingLineAfter */), modifiedEditorOptions.get(104 /* EditorOption.renderWhitespace */), modifiedEditorOptions.get(99 /* EditorOption.renderControlCharacters */), modifiedEditorOptions.get(53 /* EditorOption.fontLigatures */));
    }
    constructor(tabSize, fontInfo, disableMonospaceOptimizations, typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, lineHeight, lineDecorationsWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, setWidth = true) {
        this.tabSize = tabSize;
        this.fontInfo = fontInfo;
        this.disableMonospaceOptimizations = disableMonospaceOptimizations;
        this.typicalHalfwidthCharacterWidth = typicalHalfwidthCharacterWidth;
        this.scrollBeyondLastColumn = scrollBeyondLastColumn;
        this.lineHeight = lineHeight;
        this.lineDecorationsWidth = lineDecorationsWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.setWidth = setWidth;
    }
    withSetWidth(setWidth) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, this.scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, setWidth);
    }
    withScrollBeyondLastColumn(scrollBeyondLastColumn) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, this.setWidth);
    }
}
function renderOriginalLine(viewLineIdx, lineTokens, decorations, hasCharChanges, mightContainNonBasicASCII, mightContainRTL, options, sb, noExtra) {
    sb.appendString('<div class="view-line');
    if (!noExtra && !hasCharChanges) {
        // No char changes
        sb.appendString(' char-delete');
    }
    sb.appendString('" style="top:');
    sb.appendString(String(viewLineIdx * options.lineHeight));
    if (options.setWidth) {
        sb.appendString('px;width:1000000px;">');
    }
    else {
        sb.appendString('px;">');
    }
    const lineContent = lineTokens.getLineContent();
    const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, mightContainNonBasicASCII);
    const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, mightContainRTL);
    const output = renderViewLine(new RenderLineInput(options.fontInfo.isMonospace && !options.disableMonospaceOptimizations, options.fontInfo.canUseHalfwidthRightwardsArrow, lineContent, false, isBasicASCII, containsRTL, 0, lineTokens, decorations, options.tabSize, 0, options.fontInfo.spaceWidth, options.fontInfo.middotWidth, options.fontInfo.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, null), sb);
    sb.appendString('</div>');
    return output.characterMapping.getHorizontalOffset(output.characterMapping.length);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvclZpZXdab25lcy9yZW5kZXJMaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFakUsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUczRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUNOLGVBQWUsRUFDZixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQW9CLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUYsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFFL0YsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsTUFBa0IsRUFDbEIsT0FBc0IsRUFDdEIsV0FBK0IsRUFDL0IsT0FBb0IsRUFDcEIsT0FBTyxHQUFHLEtBQUs7SUFFZixhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUV4QyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUU3QyxNQUFNLEVBQUUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7SUFDdkIsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7SUFDekIsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFBO0lBQ25DLEtBQUssSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO1FBQzNFLE1BQU0sVUFBVSxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDOUMsV0FBVyxFQUNYLFVBQVUsRUFDVixDQUFDLEVBQ0QsTUFBTSxDQUFDLGdCQUFnQixDQUN2QixDQUFBO1FBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFDdkIsS0FBSyxNQUFNLFdBQVcsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3RELE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbEYsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3pCLGVBQWUsRUFDZixrQkFBa0IsQ0FDakIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxjQUFjLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxXQUFXLENBQUMsRUFDOUUsY0FBYyxFQUNkLE1BQU0sQ0FBQyx5QkFBeUIsRUFDaEMsTUFBTSxDQUFDLGVBQWUsRUFDdEIsT0FBTyxFQUNQLEVBQUUsRUFDRixPQUFPLENBQ1AsQ0FDRCxDQUFBO2dCQUNELGlCQUFpQixFQUFFLENBQUE7Z0JBQ25CLGVBQWUsR0FBRyxXQUFXLENBQUE7WUFDOUIsQ0FBQztZQUNELGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2RCxDQUFDO2FBQU0sQ0FBQztZQUNQLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEIsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3pCLGVBQWUsRUFDZixrQkFBa0IsQ0FDakIsaUJBQWlCLEVBQ2pCLFVBQVUsRUFDVixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLE1BQU0sQ0FBQyx5QkFBeUIsRUFDaEMsTUFBTSxDQUFDLGVBQWUsRUFDdEIsT0FBTyxFQUNQLEVBQUUsRUFDRixPQUFPLENBQ1AsQ0FDRCxDQUFBO1lBQ0QsaUJBQWlCLEVBQUUsQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUNELGVBQWUsSUFBSSxPQUFPLENBQUMsc0JBQXNCLENBQUE7SUFFakQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQy9ELE9BQU8sQ0FBQyxTQUFTLEdBQUcsV0FBcUIsQ0FBQTtJQUN6QyxNQUFNLFlBQVksR0FBRyxlQUFlLEdBQUcsT0FBTyxDQUFDLDhCQUE4QixDQUFBO0lBRTdFLE9BQU87UUFDTixhQUFhLEVBQUUsaUJBQWlCO1FBQ2hDLFlBQVk7UUFDWixjQUFjO0tBQ2QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUN0QixZQUNpQixVQUF3QixFQUN4QixnQkFBb0QsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQy9FLDRCQUFxQyxJQUFJLEVBQ3pDLGtCQUEyQixJQUFJO1FBSC9CLGVBQVUsR0FBVixVQUFVLENBQWM7UUFDeEIsa0JBQWEsR0FBYixhQUFhLENBQWtFO1FBQy9FLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBZ0I7UUFDekMsb0JBQWUsR0FBZixlQUFlLENBQWdCO0lBQzdDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxhQUFhO0lBQ2xCLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBbUI7UUFDM0MsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDakQsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQTtRQUNqRSxNQUFNLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyxHQUFHLG1DQUF5QixDQUFBO1FBRXJFLE9BQU8sSUFBSSxhQUFhLENBQ3ZCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxPQUFPLElBQUksQ0FBQyxFQUM1QyxRQUFRLEVBQ1IscUJBQXFCLENBQUMsR0FBRyxxREFBNEMsRUFDckUsUUFBUSxDQUFDLDhCQUE4QixFQUN2QyxxQkFBcUIsQ0FBQyxHQUFHLCtDQUFxQyxFQUU5RCxxQkFBcUIsQ0FBQyxHQUFHLGtDQUF5QixFQUVsRCxVQUFVLENBQUMsZ0JBQWdCLEVBQzNCLHFCQUFxQixDQUFDLEdBQUcsK0NBQXFDLEVBQzlELHFCQUFxQixDQUFDLEdBQUcseUNBQStCLEVBQ3hELHFCQUFxQixDQUFDLEdBQUcsK0NBQXNDLEVBQy9ELHFCQUFxQixDQUFDLEdBQUcscUNBQTRCLENBQ3JELENBQUE7SUFDRixDQUFDO0lBRUQsWUFDaUIsT0FBZSxFQUNmLFFBQWtCLEVBQ2xCLDZCQUFzQyxFQUN0Qyw4QkFBc0MsRUFDdEMsc0JBQThCLEVBQzlCLFVBQWtCLEVBQ2xCLG9CQUE0QixFQUM1QixzQkFBOEIsRUFDOUIsZ0JBQWtGLEVBQ2xGLHVCQUFnQyxFQUNoQyxhQUE0RSxFQUM1RSxXQUFXLElBQUk7UUFYZixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQVM7UUFDdEMsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFRO1FBQ3RDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUTtRQUM5QixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtRQUM1QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVE7UUFDOUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrRTtRQUNsRiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQVM7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQStEO1FBQzVFLGFBQVEsR0FBUixRQUFRLENBQU87SUFDN0IsQ0FBQztJQUVHLFlBQVksQ0FBQyxRQUFpQjtRQUNwQyxPQUFPLElBQUksYUFBYSxDQUN2QixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLDZCQUE2QixFQUNsQyxJQUFJLENBQUMsOEJBQThCLEVBQ25DLElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsdUJBQXVCLEVBQzVCLElBQUksQ0FBQyxhQUFhLEVBQ2xCLFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztJQUVNLDBCQUEwQixDQUFDLHNCQUE4QjtRQUMvRCxPQUFPLElBQUksYUFBYSxDQUN2QixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLDZCQUE2QixFQUNsQyxJQUFJLENBQUMsOEJBQThCLEVBQ25DLHNCQUFzQixFQUN0QixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLHNCQUFzQixFQUMzQixJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLFFBQVEsQ0FDYixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBUUQsU0FBUyxrQkFBa0IsQ0FDMUIsV0FBbUIsRUFDbkIsVUFBMkIsRUFDM0IsV0FBNkIsRUFDN0IsY0FBdUIsRUFDdkIseUJBQWtDLEVBQ2xDLGVBQXdCLEVBQ3hCLE9BQXNCLEVBQ3RCLEVBQWlCLEVBQ2pCLE9BQWdCO0lBRWhCLEVBQUUsQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUN4QyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDakMsa0JBQWtCO1FBQ2xCLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUNELEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDaEMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQ3pELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLEVBQUUsQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUN6QyxDQUFDO1NBQU0sQ0FBQztRQUNQLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUMvQyxNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLHlCQUF5QixDQUFDLENBQUE7SUFDL0YsTUFBTSxXQUFXLEdBQUcscUJBQXFCLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDakcsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUM1QixJQUFJLGVBQWUsQ0FDbEIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQ3RFLE9BQU8sQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQy9DLFdBQVcsRUFDWCxLQUFLLEVBQ0wsWUFBWSxFQUNaLFdBQVcsRUFDWCxDQUFDLEVBQ0QsVUFBVSxFQUNWLFdBQVcsRUFDWCxPQUFPLENBQUMsT0FBTyxFQUNmLENBQUMsRUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFDM0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUM5QixPQUFPLENBQUMsc0JBQXNCLEVBQzlCLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDeEIsT0FBTyxDQUFDLHVCQUF1QixFQUMvQixPQUFPLENBQUMsYUFBYSxLQUFLLG1CQUFtQixDQUFDLEdBQUcsRUFDakQsSUFBSSxDQUNKLEVBQ0QsRUFBRSxDQUNGLENBQUE7SUFFRCxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRXpCLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNuRixDQUFDIn0=