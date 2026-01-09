/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { LineTokens } from '../tokens/lineTokens.js';
import { TokenizationRegistry, } from '../languages.js';
import { NullState, nullTokenizeEncoded } from './nullTokenize.js';
const fallback = {
    getInitialState: () => NullState,
    tokenizeEncoded: (buffer, hasEOL, state) => nullTokenizeEncoded(0 /* LanguageId.Null */, state),
};
export function tokenizeToStringSync(languageService, text, languageId) {
    return _tokenizeToString(text, languageService.languageIdCodec, TokenizationRegistry.get(languageId) || fallback);
}
export async function tokenizeToString(languageService, text, languageId) {
    if (!languageId) {
        return _tokenizeToString(text, languageService.languageIdCodec, fallback);
    }
    const tokenizationSupport = await TokenizationRegistry.getOrCreate(languageId);
    return _tokenizeToString(text, languageService.languageIdCodec, tokenizationSupport || fallback);
}
export function tokenizeLineToHTML(text, viewLineTokens, colorMap, startOffset, endOffset, tabSize, useNbsp) {
    let result = `<div>`;
    let charIndex = startOffset;
    let tabsCharDelta = 0;
    let prevIsSpace = true;
    for (let tokenIndex = 0, tokenCount = viewLineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
        const tokenEndIndex = viewLineTokens.getEndOffset(tokenIndex);
        if (tokenEndIndex <= startOffset) {
            continue;
        }
        let partContent = '';
        for (; charIndex < tokenEndIndex && charIndex < endOffset; charIndex++) {
            const charCode = text.charCodeAt(charIndex);
            switch (charCode) {
                case 9 /* CharCode.Tab */: {
                    let insertSpacesCount = tabSize - ((charIndex + tabsCharDelta) % tabSize);
                    tabsCharDelta += insertSpacesCount - 1;
                    while (insertSpacesCount > 0) {
                        if (useNbsp && prevIsSpace) {
                            partContent += '&#160;';
                            prevIsSpace = false;
                        }
                        else {
                            partContent += ' ';
                            prevIsSpace = true;
                        }
                        insertSpacesCount--;
                    }
                    break;
                }
                case 60 /* CharCode.LessThan */:
                    partContent += '&lt;';
                    prevIsSpace = false;
                    break;
                case 62 /* CharCode.GreaterThan */:
                    partContent += '&gt;';
                    prevIsSpace = false;
                    break;
                case 38 /* CharCode.Ampersand */:
                    partContent += '&amp;';
                    prevIsSpace = false;
                    break;
                case 0 /* CharCode.Null */:
                    partContent += '&#00;';
                    prevIsSpace = false;
                    break;
                case 65279 /* CharCode.UTF8_BOM */:
                case 8232 /* CharCode.LINE_SEPARATOR */:
                case 8233 /* CharCode.PARAGRAPH_SEPARATOR */:
                case 133 /* CharCode.NEXT_LINE */:
                    partContent += '\ufffd';
                    prevIsSpace = false;
                    break;
                case 13 /* CharCode.CarriageReturn */:
                    // zero width space, because carriage return would introduce a line break
                    partContent += '&#8203';
                    prevIsSpace = false;
                    break;
                case 32 /* CharCode.Space */:
                    if (useNbsp && prevIsSpace) {
                        partContent += '&#160;';
                        prevIsSpace = false;
                    }
                    else {
                        partContent += ' ';
                        prevIsSpace = true;
                    }
                    break;
                default:
                    partContent += String.fromCharCode(charCode);
                    prevIsSpace = false;
            }
        }
        result += `<span style="${viewLineTokens.getInlineStyle(tokenIndex, colorMap)}">${partContent}</span>`;
        if (tokenEndIndex > endOffset || charIndex >= endOffset) {
            break;
        }
    }
    result += `</div>`;
    return result;
}
export function _tokenizeToString(text, languageIdCodec, tokenizationSupport) {
    let result = `<div class="monaco-tokenized-source">`;
    const lines = strings.splitLines(text);
    let currentState = tokenizationSupport.getInitialState();
    for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i];
        if (i > 0) {
            result += `<br/>`;
        }
        const tokenizationResult = tokenizationSupport.tokenizeEncoded(line, true, currentState);
        LineTokens.convertToEndOffset(tokenizationResult.tokens, line.length);
        const lineTokens = new LineTokens(tokenizationResult.tokens, line, languageIdCodec);
        const viewLineTokens = lineTokens.inflate();
        let startOffset = 0;
        for (let j = 0, lenJ = viewLineTokens.getCount(); j < lenJ; j++) {
            const type = viewLineTokens.getClassName(j);
            const endIndex = viewLineTokens.getEndOffset(j);
            result += `<span class="${type}">${strings.escape(line.substring(startOffset, endIndex))}</span>`;
            startOffset = endIndex;
        }
        currentState = tokenizationResult.endState;
    }
    result += `</div>`;
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvdGV4dFRvSHRtbFRva2VuaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckUsT0FBTyxFQUlOLG9CQUFvQixHQUNwQixNQUFNLGlCQUFpQixDQUFBO0FBRXhCLE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUtsRSxNQUFNLFFBQVEsR0FBZ0M7SUFDN0MsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7SUFDaEMsZUFBZSxFQUFFLENBQUMsTUFBYyxFQUFFLE1BQWUsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUNuRSxtQkFBbUIsMEJBQWtCLEtBQUssQ0FBQztDQUM1QyxDQUFBO0FBRUQsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxlQUFpQyxFQUNqQyxJQUFZLEVBQ1osVUFBa0I7SUFFbEIsT0FBTyxpQkFBaUIsQ0FDdkIsSUFBSSxFQUNKLGVBQWUsQ0FBQyxlQUFlLEVBQy9CLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxRQUFRLENBQ2hELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsZUFBaUMsRUFDakMsSUFBWSxFQUNaLFVBQXlCO0lBRXpCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLGlCQUFpQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FB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