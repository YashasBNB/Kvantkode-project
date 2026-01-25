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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERyYWdSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRHJhZ1JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sS0FBSyxRQUFRLE1BQU0sMkNBQTJDLENBQUE7QUFHckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXJFLE9BQU8sS0FBSyxTQUFTLE1BQU0sOENBQThDLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFJckcsTUFBTSxrQkFBa0I7YUFDUixjQUFTLEdBQUcsd0JBQXdCLENBQUMsd0JBQXdCLEVBQUU7UUFDN0UsVUFBVSxDQUFDLEtBQUs7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixXQUFXLENBQUMsTUFBbUIsRUFBRSxVQUFpQjtRQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDMUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsZ0NBQXVCLENBQUE7UUFDL0Qs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