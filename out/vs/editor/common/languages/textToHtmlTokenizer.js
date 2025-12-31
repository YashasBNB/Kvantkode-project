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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3RleHRUb0h0bWxUb2tlbml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JFLE9BQU8sRUFJTixvQkFBb0IsR0FDcEIsTUFBTSxpQkFBaUIsQ0FBQTtBQUV4QixPQUFPLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFLbEUsTUFBTSxRQUFRLEdBQWdDO0lBQzdDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQ2hDLGVBQWUsRUFBRSxDQUFDLE1BQWMsRUFBRSxNQUFlLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FDbkUsbUJBQW1CLDBCQUFrQixLQUFLLENBQUM7Q0FDNUMsQ0FBQTtBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsZUFBaUMsRUFDakMsSUFBWSxFQUNaLFVBQWtCO0lBRWxCLE9BQU8saUJBQWlCLENBQ3ZCLElBQUksRUFDSixlQUFlLENBQUMsZUFBZSxFQUMvQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksUUFBUSxDQUNoRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLGVBQWlDLEVBQ2pDLElBQVksRUFDWixVQUF5QjtJQUV6QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBQ0Qs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