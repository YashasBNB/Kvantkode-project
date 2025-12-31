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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JWaWV3Wm9uZXMvcmVuZGVyTGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTixlQUFlLEVBQ2YsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFvQixxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVGLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0FBRS9GLE1BQU0sVUFBVSxXQUFXLENBQzFCLE1BQWtCLEVBQ2xCLE9BQXNCLEVBQ3RCLFdBQStCLEVBQy9CLE9BQW9CLEVBQ3BCLE9BQU8sR0FBRyxLQUFLO0lBRWYsYUFBYSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFeEMsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFFN0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFD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