/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { Color } from '../../../../../../base/common/color.js';
import * as platform from '../../../../../../base/common/platform.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import * as languages from '../../../../../../editor/common/languages.js';
import { tokenizeLineToHTML } from '../../../../../../editor/common/languages/textToHtmlTokenizer.js';
class EditorTextRenderer {
    static { this._ttPolicy = createTrustedTypesPolicy('cellRendererEditorText', {
        createHTML(input) {
            return input;
        },
    }); }
    getRichText(editor, modelRange) {
        const model = editor.getModel();
        if (!model) {
            return null;
        }
        const colorMap = this.getDefaultColorMap();
        const fontInfo = editor.getOptions().get(52 /* EditorOption.fontInfo */);
        const fontFamilyVar = '--notebook-editor-font-family';
        const fontSizeVar = '--notebook-editor-font-size';
        const fontWeightVar = '--notebook-editor-font-weight';
        const style = `` +
            `color: ${colorMap[1 /* ColorId.DefaultForeground */]};` +
            `background-color: ${colorMap[2 /* ColorId.DefaultBackground */]};` +
            `font-family: var(${fontFamilyVar});` +
            `font-weight: var(${fontWeightVar});` +
            `font-size: var(${fontSizeVar});` +
            `line-height: ${fontInfo.lineHeight}px;` +
            `white-space: pre;`;
        const element = DOM.$('div', { style });
        const fontSize = fontInfo.fontSize;
        const fontWeight = fontInfo.fontWeight;
        element.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        element.style.setProperty(fontSizeVar, `${fontSize}px`);
        element.style.setProperty(fontWeightVar, fontWeight);
        const linesHtml = this.getRichTextLinesAsHtml(model, modelRange, colorMap);
        element.innerHTML = linesHtml;
        return element;
    }
    getRichTextLinesAsHtml(model, modelRange, colorMap) {
        const startLineNumber = modelRange.startLineNumber;
        const startColumn = modelRange.startColumn;
        const endLineNumber = modelRange.endLineNumber;
        const endColumn = modelRange.endColumn;
        const tabSize = model.getOptions().tabSize;
        let result = '';
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const lineContent = lineTokens.getLineContent();
            const startOffset = lineNumber === startLineNumber ? startColumn - 1 : 0;
            const endOffset = lineNumber === endLineNumber ? endColumn - 1 : lineContent.length;
            if (lineContent === '') {
                result += '<br>';
            }
            else {
                result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, tabSize, platform.isWindows);
            }
        }
        return EditorTextRenderer._ttPolicy?.createHTML(result) ?? result;
    }
    getDefaultColorMap() {
        const colorMap = languages.TokenizationRegistry.getColorMap();
        const result = ['#000000'];
        if (colorMap) {
            for (let i = 1, len = colorMap.length; i < len; i++) {
                result[i] = Color.Format.CSS.formatHex(colorMap[i]);
            }
        }
        return result;
    }
}
export class CodeCellDragImageRenderer {
    getDragImage(templateData, editor, type) {
        let dragImage = this.getDragImageImpl(templateData, editor, type);
        if (!dragImage) {
            // TODO@roblourens I don't think this can happen
            dragImage = document.createElement('div');
            dragImage.textContent = '1 cell';
        }
        return dragImage;
    }
    getDragImageImpl(templateData, editor, type) {
        const dragImageContainer = templateData.container.cloneNode(true);
        dragImageContainer.classList.forEach((c) => dragImageContainer.classList.remove(c));
        dragImageContainer.classList.add('cell-drag-image', 'monaco-list-row', 'focused', `${type}-cell-row`);
        const editorContainer = dragImageContainer.querySelector('.cell-editor-container');
        if (!editorContainer) {
            return null;
        }
        const richEditorText = new EditorTextRenderer().getRichText(editor, new Range(1, 1, 1, 1000));
        if (!richEditorText) {
            return null;
        }
        DOM.reset(editorContainer, richEditorText);
        return dragImageContainer;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERyYWdSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbERyYWdSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEtBQUssUUFBUSxNQUFNLDJDQUEyQyxDQUFBO0FBR3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVyRSxPQUFPLEtBQUssU0FBUyxNQUFNLDhDQUE4QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBSXJHLE1BQU0sa0JBQWtCO2FBQ1IsY0FBUyxHQUFHLHdCQUF3QixDQUFDLHdCQUF3QixFQUFFO1FBQzdFLFVBQVUsQ0FBQyxLQUFLO1lBQ2YsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsV0FBVyxDQUFDLE1BQW1CLEVBQUUsVUFBaUI7UUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQzFDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLGdDQUF1QixDQUFBO1FBQy9ELE1BQU0sYUFBYSxHQUFHLCtCQUErQixDQUFBO1FBQ3JELE1BQU0sV0FBVyxHQUFHLDZCQUE2QixDQUFBO1FBQ2pELE1BQU0sYUFBYSxHQUFHLCtCQUErQixDQUFBO1FBRXJELE1BQU0sS0FBSyxHQUNWLEVBQUU7WUFDRixVQUFVLFFBQVEsbUNBQTJCLEdBQUc7WUFDaEQscUJBQXFCLFFBQVEsbUNBQTJCLEdBQUc7WUFDM0Qsb0JBQW9CLGFBQWEsSUFBSTtZQUNyQyxvQkFBb0IsYUFBYSxJQUFJO1lBQ3JDLGtCQUFrQixXQUFXLElBQUk7WUFDakMsZ0JBQWdCLFFBQVEsQ0FBQyxVQUFVLEtBQUs7WUFDeEMsbUJBQW1CLENBQUE7UUFFcEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXZDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUE7UUFDbEMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdELE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLFFBQVEsSUFBSSxDQUFDLENBQUE7UUFDdkQsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzFFLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBbUIsQ0FBQTtRQUN2QyxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxzQkFBc0IsQ0FDN0IsS0FBaUIsRUFDakIsVUFBaUIsRUFDakIsUUFBa0I7UUFFbEIsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBQzFDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUE7UUFDOUMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQTtRQUV0QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFBO1FBRTFDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUVmLEtBQUssSUFBSSxVQUFVLEdBQUcsZUFBZSxFQUFFLFVBQVUsSUFBSSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMvRCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDL0MsTUFBTSxXQUFXLEdBQUcsVUFBVSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hFLE1BQU0sU0FBUyxHQUFHLFVBQVUsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUE7WUFFbkYsSUFBSSxXQUFXLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sSUFBSSxNQUFNLENBQUE7WUFDakIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsV0FBVyxFQUNYLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFDcEIsUUFBUSxFQUNSLFdBQVcsRUFDWCxTQUFTLEVBQ1QsT0FBTyxFQUNQLFFBQVEsQ0FBQyxTQUFTLENBQ2xCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sa0JBQWtCLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUE7SUFDbEUsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDN0QsTUFBTSxNQUFNLEdBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNyRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDOztBQUdGLE1BQU0sT0FBTyx5QkFBeUI7SUFDckMsWUFBWSxDQUNYLFlBQW9DLEVBQ3BDLE1BQW1CLEVBQ25CLElBQXlCO1FBRXpCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixnREFBZ0Q7WUFDaEQsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekMsU0FBUyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUE7UUFDakMsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsWUFBb0MsRUFDcEMsTUFBbUIsRUFDbkIsSUFBeUI7UUFFekIsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQWdCLENBQUE7UUFDaEYsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25GLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQy9CLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsU0FBUyxFQUNULEdBQUcsSUFBSSxXQUFXLENBQ2xCLENBQUE7UUFFRCxNQUFNLGVBQWUsR0FDcEIsa0JBQWtCLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDN0YsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRTFDLE9BQU8sa0JBQWtCLENBQUE7SUFDMUIsQ0FBQztDQUNEIn0=