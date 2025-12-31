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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tTGluZUJyZWFrc0NvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlldy9kb21MaW5lQnJlYWtzQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFaEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBR3hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVsRSxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbEUsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFFcEcsTUFBTSxPQUFPLDRCQUE0QjtJQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQW9CO1FBQ3hDLE9BQU8sSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxZQUFvQixZQUE2QjtRQUE3QixpQkFBWSxHQUFaLFlBQVksQ0FBaUI7SUFBRyxDQUFDO0lBRTlDLHdCQUF3QixDQUM5QixRQUFrQixFQUNsQixPQUFlLEVBQ2YsY0FBc0IsRUFDdEIsY0FBOEIsRUFDOUIsU0FBK0I7UUFFL0IsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFB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