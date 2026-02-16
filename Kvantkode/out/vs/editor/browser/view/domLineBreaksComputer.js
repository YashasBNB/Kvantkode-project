/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../base/browser/trustedTypes.js';
import * as strings from '../../../base/common/strings.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { applyFontInfo } from '../config/domFontInfo.js';
import { StringBuilder } from '../../common/core/stringBuilder.js';
import { ModelLineProjectionData, } from '../../common/modelLineProjectionData.js';
import { LineInjectedText } from '../../common/textModelEvents.js';
const ttPolicy = createTrustedTypesPolicy('domLineBreaksComputer', { createHTML: (value) => value });
export class DOMLineBreaksComputerFactory {
    static create(targetWindow) {
        return new DOMLineBreaksComputerFactory(new WeakRef(targetWindow));
    }
    constructor(targetWindow) {
        this.targetWindow = targetWindow;
    }
    createLineBreaksComputer(fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak) {
        const requests = [];
        const injectedTexts = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                requests.push(lineText);
                injectedTexts.push(injectedText);
            },
            finalize: () => {
                return createLineBreaks(assertIsDefined(this.targetWindow.deref()), requests, fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak, injectedTexts);
            },
        };
    }
}
function createLineBreaks(targetWindow, requests, fontInfo, tabSize, firstLineBreakColumn, wrappingIndent, wordBreak, injectedTextsPerLine) {
    function createEmptyLineBreakWithPossiblyInjectedText(requestIdx) {
        const injectedTexts = injectedTextsPerLine[requestIdx];
        if (injectedTexts) {
            const lineText = LineInjectedText.applyInjectedText(requests[requestIdx], injectedTexts);
            const injectionOptions = injectedTexts.map((t) => t.options);
            const injectionOffsets = injectedTexts.map((text) => text.column - 1);
            // creating a `LineBreakData` with an invalid `breakOffsetsVisibleColumn` is OK
            // because `breakOffsetsVisibleColumn` will never be used because it contains injected text
            return new ModelLineProjectionData(injectionOffsets, injectionOptions, [lineText.length], [], 0);
        }
        else {
            return null;
        }
    }
    if (firstLineBreakColumn === -1) {
        const result = [];
        for (let i = 0, len = requests.length; i < len; i++) {
            result[i] = createEmptyLineBreakWithPossiblyInjectedText(i);
        }
        return result;
    }
    const overallWidth = Math.round(firstLineBreakColumn * fontInfo.typicalHalfwidthCharacterWidth);
    const additionalIndent = wrappingIndent === 3 /* WrappingIndent.DeepIndent */
        ? 2
        : wrappingIndent === 2 /* WrappingIndent.Indent */
            ? 1
            : 0;
    const additionalIndentSize = Math.round(tabSize * additionalIndent);
    const additionalIndentLength = Math.ceil(fontInfo.spaceWidth * additionalIndentSize);
    const containerDomNode = document.createElement('div');
    applyFontInfo(containerDomNode, fontInfo);
    const sb = new StringBuilder(10000);
    const firstNonWhitespaceIndices = [];
    const wrappedTextIndentLengths = [];
    const renderLineContents = [];
    const allCharOffsets = [];
    const allVisibleColumns = [];
    for (let i = 0; i < requests.length; i++) {
        const lineContent = LineInjectedText.applyInjectedText(requests[i], injectedTextsPerLine[i]);
        let firstNonWhitespaceIndex = 0;
        let wrappedTextIndentLength = 0;
        let width = overallWidth;
        if (wrappingIndent !== 0 /* WrappingIndent.None */) {
            firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
            if (firstNonWhitespaceIndex === -1) {
                // all whitespace line
                firstNonWhitespaceIndex = 0;
            }
            else {
                // Track existing indent
                for (let i = 0; i < firstNonWhitespaceIndex; i++) {
                    const charWidth = lineContent.charCodeAt(i) === 9 /* CharCode.Tab */
                        ? tabSize - (wrappedTextIndentLength % tabSize)
                        : 1;
                    wrappedTextIndentLength += charWidth;
                }
                const indentWidth = Math.ceil(fontInfo.spaceWidth * wrappedTextIndentLength);
                // Force sticking to beginning of line if no character would fit except for the indentation
                if (indentWidth + fontInfo.typicalFullwidthCharacterWidth > overallWidth) {
                    firstNonWhitespaceIndex = 0;
                    wrappedTextIndentLength = 0;
                }
                else {
                    width = overallWidth - indentWidth;
                }
            }
        }
        const renderLineContent = lineContent.substr(firstNonWhitespaceIndex);
        const tmp = renderLine(renderLineContent, wrappedTextIndentLength, tabSize, width, sb, additionalIndentLength);
        firstNonWhitespaceIndices[i] = firstNonWhitespaceIndex;
        wrappedTextIndentLengths[i] = wrappedTextIndentLength;
        renderLineContents[i] = renderLineContent;
        allCharOffsets[i] = tmp[0];
        allVisibleColumns[i] = tmp[1];
    }
    const html = sb.build();
    const trustedhtml = ttPolicy?.createHTML(html) ?? html;
    containerDomNode.innerHTML = trustedhtml;
    containerDomNode.style.position = 'absolute';
    containerDomNode.style.top = '10000';
    if (wordBreak === 'keepAll') {
        // word-break: keep-all; overflow-wrap: anywhere
        containerDomNode.style.wordBreak = 'keep-all';
        containerDomNode.style.overflowWrap = 'anywhere';
    }
    else {
        // overflow-wrap: break-word
        containerDomNode.style.wordBreak = 'inherit';
        containerDomNode.style.overflowWrap = 'break-word';
    }
    targetWindow.document.body.appendChild(containerDomNode);
    const range = document.createRange();
    const lineDomNodes = Array.prototype.slice.call(containerDomNode.children, 0);
    const result = [];
    for (let i = 0; i < requests.length; i++) {
        const lineDomNode = lineDomNodes[i];
        const breakOffsets = readLineBreaks(range, lineDomNode, renderLineContents[i], allCharOffsets[i]);
        if (breakOffsets === null) {
            result[i] = createEmptyLineBreakWithPossiblyInjectedText(i);
            continue;
        }
        const firstNonWhitespaceIndex = firstNonWhitespaceIndices[i];
        const wrappedTextIndentLength = wrappedTextIndentLengths[i] + additionalIndentSize;
        const visibleColumns = allVisibleColumns[i];
        const breakOffsetsVisibleColumn = [];
        for (let j = 0, len = breakOffsets.length; j < len; j++) {
            breakOffsetsVisibleColumn[j] = visibleColumns[breakOffsets[j]];
        }
        if (firstNonWhitespaceIndex !== 0) {
            // All break offsets are relative to the renderLineContent, make them absolute again
            for (let j = 0, len = breakOffsets.length; j < len; j++) {
                breakOffsets[j] += firstNonWhitespaceIndex;
            }
        }
        let injectionOptions;
        let injectionOffsets;
        const curInjectedTexts = injectedTextsPerLine[i];
        if (curInjectedTexts) {
            injectionOptions = curInjectedTexts.map((t) => t.options);
            injectionOffsets = curInjectedTexts.map((text) => text.column - 1);
        }
        else {
            injectionOptions = null;
            injectionOffsets = null;
        }
        result[i] = new ModelLineProjectionData(injectionOffsets, injectionOptions, breakOffsets, breakOffsetsVisibleColumn, wrappedTextIndentLength);
    }
    containerDomNode.remove();
    return result;
}
var Constants;
(function (Constants) {
    Constants[Constants["SPAN_MODULO_LIMIT"] = 16384] = "SPAN_MODULO_LIMIT";
})(Constants || (Constants = {}));
function renderLine(lineContent, initialVisibleColumn, tabSize, width, sb, wrappingIndentLength) {
    if (wrappingIndentLength !== 0) {
        const hangingOffset = String(wrappingIndentLength);
        sb.appendString('<div style="text-indent: -');
        sb.appendString(hangingOffset);
        sb.appendString('px; padding-left: ');
        sb.appendString(hangingOffset);
        sb.appendString('px; box-sizing: border-box; width:');
    }
    else {
        sb.appendString('<div style="width:');
    }
    sb.appendString(String(width));
    sb.appendString('px;">');
    // if (containsRTL) {
    // 	sb.appendASCIIString('" dir="ltr');
    // }
    const len = lineContent.length;
    let visibleColumn = initialVisibleColumn;
    let charOffset = 0;
    const charOffsets = [];
    const visibleColumns = [];
    let nextCharCode = 0 < len ? lineContent.charCodeAt(0) : 0 /* CharCode.Null */;
    sb.appendString('<span>');
    for (let charIndex = 0; charIndex < len; charIndex++) {
        if (charIndex !== 0 && charIndex % 16384 /* Constants.SPAN_MODULO_LIMIT */ === 0) {
            sb.appendString('</span><span>');
        }
        charOffsets[charIndex] = charOffset;
        visibleColumns[charIndex] = visibleColumn;
        const charCode = nextCharCode;
        nextCharCode = charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */;
        let producedCharacters = 1;
        let charWidth = 1;
        switch (charCode) {
            case 9 /* CharCode.Tab */:
                producedCharacters = tabSize - (visibleColumn % tabSize);
                charWidth = producedCharacters;
                for (let space = 1; space <= producedCharacters; space++) {
                    if (space < producedCharacters) {
                        sb.appendCharCode(0xa0); // &nbsp;
                    }
                    else {
                        sb.appendASCIICharCode(32 /* CharCode.Space */);
                    }
                }
                break;
            case 32 /* CharCode.Space */:
                if (nextCharCode === 32 /* CharCode.Space */) {
                    sb.appendCharCode(0xa0); // &nbsp;
                }
                else {
                    sb.appendASCIICharCode(32 /* CharCode.Space */);
                }
                break;
            case 60 /* CharCode.LessThan */:
                sb.appendString('&lt;');
                break;
            case 62 /* CharCode.GreaterThan */:
                sb.appendString('&gt;');
                break;
            case 38 /* CharCode.Ampersand */:
                sb.appendString('&amp;');
                break;
            case 0 /* CharCode.Null */:
                sb.appendString('&#00;');
                break;
            case 65279 /* CharCode.UTF8_BOM */:
            case 8232 /* CharCode.LINE_SEPARATOR */:
            case 8233 /* CharCode.PARAGRAPH_SEPARATOR */:
            case 133 /* CharCode.NEXT_LINE */:
                sb.appendCharCode(0xfffd);
                break;
            default:
                if (strings.isFullWidthCharacter(charCode)) {
                    charWidth++;
                }
                if (charCode < 32) {
                    sb.appendCharCode(9216 + charCode);
                }
                else {
                    sb.appendCharCode(charCode);
                }
        }
        charOffset += producedCharacters;
        visibleColumn += charWidth;
    }
    sb.appendString('</span>');
    charOffsets[lineContent.length] = charOffset;
    visibleColumns[lineContent.length] = visibleColumn;
    sb.appendString('</div>');
    return [charOffsets, visibleColumns];
}
function readLineBreaks(range, lineDomNode, lineContent, charOffsets) {
    if (lineContent.length <= 1) {
        return null;
    }
    const spans = Array.prototype.slice.call(lineDomNode.children, 0);
    const breakOffsets = [];
    try {
        discoverBreaks(range, spans, charOffsets, 0, null, lineContent.length - 1, null, breakOffsets);
    }
    catch (err) {
        console.log(err);
        return null;
    }
    if (breakOffsets.length === 0) {
        return null;
    }
    breakOffsets.push(lineContent.length);
    return breakOffsets;
}
function discoverBreaks(range, spans, charOffsets, low, lowRects, high, highRects, result) {
    if (low === high) {
        return;
    }
    lowRects = lowRects || readClientRect(range, spans, charOffsets[low], charOffsets[low + 1]);
    highRects = highRects || readClientRect(range, spans, charOffsets[high], charOffsets[high + 1]);
    if (Math.abs(lowRects[0].top - highRects[0].top) <= 0.1) {
        // same line
        return;
    }
    // there is at least one line break between these two offsets
    if (low + 1 === high) {
        // the two characters are adjacent, so the line break must be exactly between them
        result.push(high);
        return;
    }
    const mid = (low + (high - low) / 2) | 0;
    const midRects = readClientRect(range, spans, charOffsets[mid], charOffsets[mid + 1]);
    discoverBreaks(range, spans, charOffsets, low, lowRects, mid, midRects, result);
    discoverBreaks(range, spans, charOffsets, mid, midRects, high, highRects, result);
}
function readClientRect(range, spans, startOffset, endOffset) {
    range.setStart(spans[(startOffset / 16384 /* Constants.SPAN_MODULO_LIMIT */) | 0].firstChild, startOffset % 16384 /* Constants.SPAN_MODULO_LIMIT */);
    range.setEnd(spans[(endOffset / 16384 /* Constants.SPAN_MODULO_LIMIT */) | 0].firstChild, endOffset % 16384 /* Constants.SPAN_MODULO_LIMIT */);
    return range.getClientRects();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3L2RvbUxpbmVCcmVha3NDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVoRixPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWxFLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVsRSxNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUVwRyxNQUFNLE9BQU8sNEJBQTRCO0lBQ2pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBb0I7UUFDeEMsT0FBTyxJQUFJLDRCQUE0QixDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELFlBQW9CLFlBQTZCO1FBQTdCLGlCQUFZLEdBQVosWUFBWSxDQUFpQjtJQUFHLENBQUM7SUFFOUMsd0JBQXdCLENBQzlCLFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixjQUFzQixFQUN0QixjQUE4QixFQUM5QixTQUErQjtRQUUvQixN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