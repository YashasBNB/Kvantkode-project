/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as strings from '../../../base/common/strings.js';
import { StringBuilder } from '../core/stringBuilder.js';
import { LineDecoration, LineDecorationsNormalizer } from './lineDecorations.js';
import { LinePart } from './linePart.js';
export var RenderWhitespace;
(function (RenderWhitespace) {
    RenderWhitespace[RenderWhitespace["None"] = 0] = "None";
    RenderWhitespace[RenderWhitespace["Boundary"] = 1] = "Boundary";
    RenderWhitespace[RenderWhitespace["Selection"] = 2] = "Selection";
    RenderWhitespace[RenderWhitespace["Trailing"] = 3] = "Trailing";
    RenderWhitespace[RenderWhitespace["All"] = 4] = "All";
})(RenderWhitespace || (RenderWhitespace = {}));
export class LineRange {
    constructor(startIndex, endIndex) {
        this.startOffset = startIndex;
        this.endOffset = endIndex;
    }
    equals(otherLineRange) {
        return (this.startOffset === otherLineRange.startOffset && this.endOffset === otherLineRange.endOffset);
    }
}
export class RenderLineInput {
    constructor(useMonospaceOptimizations, canUseHalfwidthRightwardsArrow, lineContent, continuesWithWrappedLine, isBasicASCII, containsRTL, fauxIndentLength, lineTokens, lineDecorations, tabSize, startVisibleColumn, spaceWidth, middotWidth, wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, selectionsOnLine) {
        this.useMonospaceOptimizations = useMonospaceOptimizations;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = isBasicASCII;
        this.containsRTL = containsRTL;
        this.fauxIndentLength = fauxIndentLength;
        this.lineTokens = lineTokens;
        this.lineDecorations = lineDecorations.sort(LineDecoration.compare);
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.spaceWidth = spaceWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace =
            renderWhitespace === 'all'
                ? 4 /* RenderWhitespace.All */
                : renderWhitespace === 'boundary'
                    ? 1 /* RenderWhitespace.Boundary */
                    : renderWhitespace === 'selection'
                        ? 2 /* RenderWhitespace.Selection */
                        : renderWhitespace === 'trailing'
                            ? 3 /* RenderWhitespace.Trailing */
                            : 0 /* RenderWhitespace.None */;
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.selectionsOnLine =
            selectionsOnLine && selectionsOnLine.sort((a, b) => (a.startOffset < b.startOffset ? -1 : 1));
        const wsmiddotDiff = Math.abs(wsmiddotWidth - spaceWidth);
        const middotDiff = Math.abs(middotWidth - spaceWidth);
        if (wsmiddotDiff < middotDiff) {
            this.renderSpaceWidth = wsmiddotWidth;
            this.renderSpaceCharCode = 0x2e31; // U+2E31 - WORD SEPARATOR MIDDLE DOT
        }
        else {
            this.renderSpaceWidth = middotWidth;
            this.renderSpaceCharCode = 0xb7; // U+00B7 - MIDDLE DOT
        }
    }
    sameSelection(otherSelections) {
        if (this.selectionsOnLine === null) {
            return otherSelections === null;
        }
        if (otherSelections === null) {
            return false;
        }
        if (otherSelections.length !== this.selectionsOnLine.length) {
            return false;
        }
        for (let i = 0; i < this.selectionsOnLine.length; i++) {
            if (!this.selectionsOnLine[i].equals(otherSelections[i])) {
                return false;
            }
        }
        return true;
    }
    equals(other) {
        return (this.useMonospaceOptimizations === other.useMonospaceOptimizations &&
            this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow &&
            this.lineContent === other.lineContent &&
            this.continuesWithWrappedLine === other.continuesWithWrappedLine &&
            this.isBasicASCII === other.isBasicASCII &&
            this.containsRTL === other.containsRTL &&
            this.fauxIndentLength === other.fauxIndentLength &&
            this.tabSize === other.tabSize &&
            this.startVisibleColumn === other.startVisibleColumn &&
            this.spaceWidth === other.spaceWidth &&
            this.renderSpaceWidth === other.renderSpaceWidth &&
            this.renderSpaceCharCode === other.renderSpaceCharCode &&
            this.stopRenderingLineAfter === other.stopRenderingLineAfter &&
            this.renderWhitespace === other.renderWhitespace &&
            this.renderControlCharacters === other.renderControlCharacters &&
            this.fontLigatures === other.fontLigatures &&
            LineDecoration.equalsArr(this.lineDecorations, other.lineDecorations) &&
            this.lineTokens.equals(other.lineTokens) &&
            this.sameSelection(other.selectionsOnLine));
    }
}
var CharacterMappingConstants;
(function (CharacterMappingConstants) {
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_MASK"] = 4294901760] = "PART_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_MASK"] = 65535] = "CHAR_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_OFFSET"] = 0] = "CHAR_INDEX_OFFSET";
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_OFFSET"] = 16] = "PART_INDEX_OFFSET";
})(CharacterMappingConstants || (CharacterMappingConstants = {}));
export class DomPosition {
    constructor(partIndex, charIndex) {
        this.partIndex = partIndex;
        this.charIndex = charIndex;
    }
}
/**
 * Provides a both direction mapping between a line's character and its rendered position.
 */
export class CharacterMapping {
    static getPartIndex(partData) {
        return ((partData & 4294901760 /* CharacterMappingConstants.PART_INDEX_MASK */) >>>
            16 /* CharacterMappingConstants.PART_INDEX_OFFSET */);
    }
    static getCharIndex(partData) {
        return ((partData & 65535 /* CharacterMappingConstants.CHAR_INDEX_MASK */) >>>
            0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */);
    }
    constructor(length, partCount) {
        this.length = length;
        this._data = new Uint32Array(this.length);
        this._horizontalOffset = new Uint32Array(this.length);
    }
    setColumnInfo(column, partIndex, charIndex, horizontalOffset) {
        const partData = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */) |
            (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>>
            0;
        this._data[column - 1] = partData;
        this._horizontalOffset[column - 1] = horizontalOffset;
    }
    getHorizontalOffset(column) {
        if (this._horizontalOffset.length === 0) {
            // No characters on this line
            return 0;
        }
        return this._horizontalOffset[column - 1];
    }
    charOffsetToPartData(charOffset) {
        if (this.length === 0) {
            return 0;
        }
        if (charOffset < 0) {
            return this._data[0];
        }
        if (charOffset >= this.length) {
            return this._data[this.length - 1];
        }
        return this._data[charOffset];
    }
    getDomPosition(column) {
        const partData = this.charOffsetToPartData(column - 1);
        const partIndex = CharacterMapping.getPartIndex(partData);
        const charIndex = CharacterMapping.getCharIndex(partData);
        return new DomPosition(partIndex, charIndex);
    }
    getColumn(domPosition, partLength) {
        const charOffset = this.partDataToCharOffset(domPosition.partIndex, partLength, domPosition.charIndex);
        return charOffset + 1;
    }
    partDataToCharOffset(partIndex, partLength, charIndex) {
        if (this.length === 0) {
            return 0;
        }
        const searchEntry = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */) |
            (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>>
            0;
        let min = 0;
        let max = this.length - 1;
        while (min + 1 < max) {
            const mid = (min + max) >>> 1;
            const midEntry = this._data[mid];
            if (midEntry === searchEntry) {
                return mid;
            }
            else if (midEntry > searchEntry) {
                max = mid;
            }
            else {
                min = mid;
            }
        }
        if (min === max) {
            return min;
        }
        const minEntry = this._data[min];
        const maxEntry = this._data[max];
        if (minEntry === searchEntry) {
            return min;
        }
        if (maxEntry === searchEntry) {
            return max;
        }
        const minPartIndex = CharacterMapping.getPartIndex(minEntry);
        const minCharIndex = CharacterMapping.getCharIndex(minEntry);
        const maxPartIndex = CharacterMapping.getPartIndex(maxEntry);
        let maxCharIndex;
        if (minPartIndex !== maxPartIndex) {
            // sitting between parts
            maxCharIndex = partLength;
        }
        else {
            maxCharIndex = CharacterMapping.getCharIndex(maxEntry);
        }
        const minEntryDistance = charIndex - minCharIndex;
        const maxEntryDistance = maxCharIndex - charIndex;
        if (minEntryDistance <= maxEntryDistance) {
            return min;
        }
        return max;
    }
    inflate() {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            const partData = this._data[i];
            const partIndex = CharacterMapping.getPartIndex(partData);
            const charIndex = CharacterMapping.getCharIndex(partData);
            const visibleColumn = this._horizontalOffset[i];
            result.push([partIndex, charIndex, visibleColumn]);
        }
        return result;
    }
}
export var ForeignElementType;
(function (ForeignElementType) {
    ForeignElementType[ForeignElementType["None"] = 0] = "None";
    ForeignElementType[ForeignElementType["Before"] = 1] = "Before";
    ForeignElementType[ForeignElementType["After"] = 2] = "After";
})(ForeignElementType || (ForeignElementType = {}));
export class RenderLineOutput {
    constructor(characterMapping, containsRTL, containsForeignElements) {
        this._renderLineOutputBrand = undefined;
        this.characterMapping = characterMapping;
        this.containsRTL = containsRTL;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine(input, sb) {
    if (input.lineContent.length === 0) {
        if (input.lineDecorations.length > 0) {
            // This line is empty, but it contains inline decorations
            sb.appendString(`<span>`);
            let beforeCount = 0;
            let afterCount = 0;
            let containsForeignElements = 0 /* ForeignElementType.None */;
            for (const lineDecoration of input.lineDecorations) {
                if (lineDecoration.type === 1 /* InlineDecorationType.Before */ ||
                    lineDecoration.type === 2 /* InlineDecorationType.After */) {
                    sb.appendString(`<span class="`);
                    sb.appendString(lineDecoration.className);
                    sb.appendString(`"></span>`);
                    if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                        containsForeignElements |= 1 /* ForeignElementType.Before */;
                        beforeCount++;
                    }
                    if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                        containsForeignElements |= 2 /* ForeignElementType.After */;
                        afterCount++;
                    }
                }
            }
            sb.appendString(`</span>`);
            const characterMapping = new CharacterMapping(1, beforeCount + afterCount);
            characterMapping.setColumnInfo(1, beforeCount, 0, 0);
            return new RenderLineOutput(characterMapping, false, containsForeignElements);
        }
        // completely empty line
        sb.appendString('<span><span></span></span>');
        return new RenderLineOutput(new CharacterMapping(0, 0), false, 0 /* ForeignElementType.None */);
    }
    return _renderLine(resolveRenderLineInput(input), sb);
}
export class RenderLineOutput2 {
    constructor(characterMapping, html, containsRTL, containsForeignElements) {
        this.characterMapping = characterMapping;
        this.html = html;
        this.containsRTL = containsRTL;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine2(input) {
    const sb = new StringBuilder(10000);
    const out = renderViewLine(input, sb);
    return new RenderLineOutput2(out.characterMapping, sb.build(), out.containsRTL, out.containsForeignElements);
}
class ResolvedRenderLineInput {
    constructor(fontIsMonospace, canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, parts, containsForeignElements, fauxIndentLength, tabSize, startVisibleColumn, containsRTL, spaceWidth, renderSpaceCharCode, renderWhitespace, renderControlCharacters) {
        this.fontIsMonospace = fontIsMonospace;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.len = len;
        this.isOverflowing = isOverflowing;
        this.overflowingCharCount = overflowingCharCount;
        this.parts = parts;
        this.containsForeignElements = containsForeignElements;
        this.fauxIndentLength = fauxIndentLength;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.containsRTL = containsRTL;
        this.spaceWidth = spaceWidth;
        this.renderSpaceCharCode = renderSpaceCharCode;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        //
    }
}
function resolveRenderLineInput(input) {
    const lineContent = input.lineContent;
    let isOverflowing;
    let overflowingCharCount;
    let len;
    if (input.stopRenderingLineAfter !== -1 && input.stopRenderingLineAfter < lineContent.length) {
        isOverflowing = true;
        overflowingCharCount = lineContent.length - input.stopRenderingLineAfter;
        len = input.stopRenderingLineAfter;
    }
    else {
        isOverflowing = false;
        overflowingCharCount = 0;
        len = lineContent.length;
    }
    let tokens = transformAndRemoveOverflowing(lineContent, input.containsRTL, input.lineTokens, input.fauxIndentLength, len);
    if (input.renderControlCharacters && !input.isBasicASCII) {
        // Calling `extractControlCharacters` before adding (possibly empty) line parts
        // for inline decorations. `extractControlCharacters` removes empty line parts.
        tokens = extractControlCharacters(lineContent, tokens);
    }
    if (input.renderWhitespace === 4 /* RenderWhitespace.All */ ||
        input.renderWhitespace === 1 /* RenderWhitespace.Boundary */ ||
        (input.renderWhitespace === 2 /* RenderWhitespace.Selection */ && !!input.selectionsOnLine) ||
        (input.renderWhitespace === 3 /* RenderWhitespace.Trailing */ && !input.continuesWithWrappedLine)) {
        tokens = _applyRenderWhitespace(input, lineContent, len, tokens);
    }
    let containsForeignElements = 0 /* ForeignElementType.None */;
    if (input.lineDecorations.length > 0) {
        for (let i = 0, len = input.lineDecorations.length; i < len; i++) {
            const lineDecoration = input.lineDecorations[i];
            if (lineDecoration.type === 3 /* InlineDecorationType.RegularAffectingLetterSpacing */) {
                // Pretend there are foreign elements... although not 100% accurate.
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                containsForeignElements |= 2 /* ForeignElementType.After */;
            }
        }
        tokens = _applyInlineDecorations(lineContent, len, tokens, input.lineDecorations);
    }
    if (!input.containsRTL) {
        // We can never split RTL text, as it ruins the rendering
        tokens = splitLargeTokens(lineContent, tokens, !input.isBasicASCII || input.fontLigatures);
    }
    return new ResolvedRenderLineInput(input.useMonospaceOptimizations, input.canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, tokens, containsForeignElements, input.fauxIndentLength, input.tabSize, input.startVisibleColumn, input.containsRTL, input.spaceWidth, input.renderSpaceCharCode, input.renderWhitespace, input.renderControlCharacters);
}
/**
 * In the rendering phase, characters are always looped until token.endIndex.
 * Ensure that all tokens end before `len` and the last one ends precisely at `len`.
 */
function transformAndRemoveOverflowing(lineContent, lineContainsRTL, tokens, fauxIndentLength, len) {
    const result = [];
    let resultLen = 0;
    // The faux indent part of the line should have no token type
    if (fauxIndentLength > 0) {
        result[resultLen++] = new LinePart(fauxIndentLength, '', 0, false);
    }
    let startOffset = fauxIndentLength;
    for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
        const endIndex = tokens.getEndOffset(tokenIndex);
        if (endIndex <= fauxIndentLength) {
            // The faux indent part of the line should have no token type
            continue;
        }
        const type = tokens.getClassName(tokenIndex);
        if (endIndex >= len) {
            const tokenContainsRTL = lineContainsRTL
                ? strings.containsRTL(lineContent.substring(startOffset, len))
                : false;
            result[resultLen++] = new LinePart(len, type, 0, tokenContainsRTL);
            break;
        }
        const tokenContainsRTL = lineContainsRTL
            ? strings.containsRTL(lineContent.substring(startOffset, endIndex))
            : false;
        result[resultLen++] = new LinePart(endIndex, type, 0, tokenContainsRTL);
        startOffset = endIndex;
    }
    return result;
}
/**
 * written as a const enum to get value inlining.
 */
var Constants;
(function (Constants) {
    Constants[Constants["LongToken"] = 50] = "LongToken";
})(Constants || (Constants = {}));
/**
 * See https://github.com/microsoft/vscode/issues/6885.
 * It appears that having very large spans causes very slow reading of character positions.
 * So here we try to avoid that.
 */
function splitLargeTokens(lineContent, tokens, onlyAtSpaces) {
    let lastTokenEndIndex = 0;
    const result = [];
    let resultLen = 0;
    if (onlyAtSpaces) {
        // Split only at spaces => we need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            if (lastTokenEndIndex + 50 /* Constants.LongToken */ < tokenEndIndex) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                let lastSpaceOffset = -1;
                let currTokenStart = lastTokenEndIndex;
                for (let j = lastTokenEndIndex; j < tokenEndIndex; j++) {
                    if (lineContent.charCodeAt(j) === 32 /* CharCode.Space */) {
                        lastSpaceOffset = j;
                    }
                    if (lastSpaceOffset !== -1 && j - currTokenStart >= 50 /* Constants.LongToken */) {
                        // Split at `lastSpaceOffset` + 1
                        result[resultLen++] = new LinePart(lastSpaceOffset + 1, tokenType, tokenMetadata, tokenContainsRTL);
                        currTokenStart = lastSpaceOffset + 1;
                        lastSpaceOffset = -1;
                    }
                }
                if (currTokenStart !== tokenEndIndex) {
                    result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    else {
        // Split anywhere => we don't need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            const diff = tokenEndIndex - lastTokenEndIndex;
            if (diff > 50 /* Constants.LongToken */) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                const piecesCount = Math.ceil(diff / 50 /* Constants.LongToken */);
                for (let j = 1; j < piecesCount; j++) {
                    const pieceEndIndex = lastTokenEndIndex + j * 50 /* Constants.LongToken */;
                    result[resultLen++] = new LinePart(pieceEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
                result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    return result;
}
function isControlCharacter(charCode) {
    if (charCode < 32) {
        return charCode !== 9 /* CharCode.Tab */;
    }
    if (charCode === 127) {
        // DEL
        return true;
    }
    if ((charCode >= 0x202a && charCode <= 0x202e) ||
        (charCode >= 0x2066 && charCode <= 0x2069) ||
        (charCode >= 0x200e && charCode <= 0x200f) ||
        charCode === 0x061c) {
        // Unicode Directional Formatting Characters
        // LRE	U+202A	LEFT-TO-RIGHT EMBEDDING
        // RLE	U+202B	RIGHT-TO-LEFT EMBEDDING
        // PDF	U+202C	POP DIRECTIONAL FORMATTING
        // LRO	U+202D	LEFT-TO-RIGHT OVERRIDE
        // RLO	U+202E	RIGHT-TO-LEFT OVERRIDE
        // LRI	U+2066	LEFT-TO-RIGHT ISOLATE
        // RLI	U+2067	RIGHT-TO-LEFT ISOLATE
        // FSI	U+2068	FIRST STRONG ISOLATE
        // PDI	U+2069	POP DIRECTIONAL ISOLATE
        // LRM	U+200E	LEFT-TO-RIGHT MARK
        // RLM	U+200F	RIGHT-TO-LEFT MARK
        // ALM	U+061C	ARABIC LETTER MARK
        return true;
    }
    return false;
}
function extractControlCharacters(lineContent, tokens) {
    const result = [];
    let lastLinePart = new LinePart(0, '', 0, false);
    let charOffset = 0;
    for (const token of tokens) {
        const tokenEndIndex = token.endIndex;
        for (; charOffset < tokenEndIndex; charOffset++) {
            const charCode = lineContent.charCodeAt(charOffset);
            if (isControlCharacter(charCode)) {
                if (charOffset > lastLinePart.endIndex) {
                    // emit previous part if it has text
                    lastLinePart = new LinePart(charOffset, token.type, token.metadata, token.containsRTL);
                    result.push(lastLinePart);
                }
                lastLinePart = new LinePart(charOffset + 1, 'mtkcontrol', token.metadata, false);
                result.push(lastLinePart);
            }
        }
        if (charOffset > lastLinePart.endIndex) {
            // emit previous part if it has text
            lastLinePart = new LinePart(tokenEndIndex, token.type, token.metadata, token.containsRTL);
            result.push(lastLinePart);
        }
    }
    return result;
}
/**
 * Whitespace is rendered by "replacing" tokens with a special-purpose `mtkw` type that is later recognized in the rendering phase.
 * Moreover, a token is created for every visual indent because on some fonts the glyphs used for rendering whitespace (&rarr; or &middot;) do not have the same width as &nbsp;.
 * The rendering phase will generate `style="width:..."` for these tokens.
 */
function _applyRenderWhitespace(input, lineContent, len, tokens) {
    const continuesWithWrappedLine = input.continuesWithWrappedLine;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const useMonospaceOptimizations = input.useMonospaceOptimizations;
    const selections = input.selectionsOnLine;
    const onlyBoundary = input.renderWhitespace === 1 /* RenderWhitespace.Boundary */;
    const onlyTrailing = input.renderWhitespace === 3 /* RenderWhitespace.Trailing */;
    const generateLinePartForEachWhitespace = input.renderSpaceWidth !== input.spaceWidth;
    const result = [];
    let resultLen = 0;
    let tokenIndex = 0;
    let tokenType = tokens[tokenIndex].type;
    let tokenContainsRTL = tokens[tokenIndex].containsRTL;
    let tokenEndIndex = tokens[tokenIndex].endIndex;
    const tokensLength = tokens.length;
    let lineIsEmptyOrWhitespace = false;
    let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
    let lastNonWhitespaceIndex;
    if (firstNonWhitespaceIndex === -1) {
        lineIsEmptyOrWhitespace = true;
        firstNonWhitespaceIndex = len;
        lastNonWhitespaceIndex = len;
    }
    else {
        lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
    }
    let wasInWhitespace = false;
    let currentSelectionIndex = 0;
    let currentSelection = selections && selections[currentSelectionIndex];
    let tmpIndent = startVisibleColumn % tabSize;
    for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
        const chCode = lineContent.charCodeAt(charIndex);
        if (currentSelection && charIndex >= currentSelection.endOffset) {
            currentSelectionIndex++;
            currentSelection = selections && selections[currentSelectionIndex];
        }
        let isInWhitespace;
        if (charIndex < firstNonWhitespaceIndex || charIndex > lastNonWhitespaceIndex) {
            // in leading or trailing whitespace
            isInWhitespace = true;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            // a tab character is rendered both in all and boundary cases
            isInWhitespace = true;
        }
        else if (chCode === 32 /* CharCode.Space */) {
            // hit a space character
            if (onlyBoundary) {
                // rendering only boundary whitespace
                if (wasInWhitespace) {
                    isInWhitespace = true;
                }
                else {
                    const nextChCode = charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */;
                    isInWhitespace = nextChCode === 32 /* CharCode.Space */ || nextChCode === 9 /* CharCode.Tab */;
                }
            }
            else {
                isInWhitespace = true;
            }
        }
        else {
            isInWhitespace = false;
        }
        // If rendering whitespace on selection, check that the charIndex falls within a selection
        if (isInWhitespace && selections) {
            isInWhitespace =
                !!currentSelection &&
                    currentSelection.startOffset <= charIndex &&
                    currentSelection.endOffset > charIndex;
        }
        // If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
        if (isInWhitespace && onlyTrailing) {
            isInWhitespace = lineIsEmptyOrWhitespace || charIndex > lastNonWhitespaceIndex;
        }
        if (isInWhitespace && tokenContainsRTL) {
            // If the token contains RTL text, breaking it up into multiple line parts
            // to render whitespace might affect the browser's bidi layout.
            //
            // We render whitespace in such tokens only if the whitespace
            // is the leading or the trailing whitespace of the line,
            // which doesn't affect the browser's bidi layout.
            if (charIndex >= firstNonWhitespaceIndex && charIndex <= lastNonWhitespaceIndex) {
                isInWhitespace = false;
            }
        }
        if (wasInWhitespace) {
            // was in whitespace token
            if (!isInWhitespace || (!useMonospaceOptimizations && tmpIndent >= tabSize)) {
                // leaving whitespace token or entering a new indent
                if (generateLinePartForEachWhitespace) {
                    const lastEndIndex = resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength;
                    for (let i = lastEndIndex + 1; i <= charIndex; i++) {
                        result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                    }
                }
                else {
                    result[resultLen++] = new LinePart(charIndex, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                }
                tmpIndent = tmpIndent % tabSize;
            }
        }
        else {
            // was in regular token
            if (charIndex === tokenEndIndex || (isInWhitespace && charIndex > fauxIndentLength)) {
                result[resultLen++] = new LinePart(charIndex, tokenType, 0, tokenContainsRTL);
                tmpIndent = tmpIndent % tabSize;
            }
        }
        if (chCode === 9 /* CharCode.Tab */) {
            tmpIndent = tabSize;
        }
        else if (strings.isFullWidthCharacter(chCode)) {
            tmpIndent += 2;
        }
        else {
            tmpIndent++;
        }
        wasInWhitespace = isInWhitespace;
        while (charIndex === tokenEndIndex) {
            tokenIndex++;
            if (tokenIndex < tokensLength) {
                tokenType = tokens[tokenIndex].type;
                tokenContainsRTL = tokens[tokenIndex].containsRTL;
                tokenEndIndex = tokens[tokenIndex].endIndex;
            }
            else {
                break;
            }
        }
    }
    let generateWhitespace = false;
    if (wasInWhitespace) {
        // was in whitespace token
        if (continuesWithWrappedLine && onlyBoundary) {
            const lastCharCode = len > 0 ? lineContent.charCodeAt(len - 1) : 0 /* CharCode.Null */;
            const prevCharCode = len > 1 ? lineContent.charCodeAt(len - 2) : 0 /* CharCode.Null */;
            const isSingleTrailingSpace = lastCharCode === 32 /* CharCode.Space */ &&
                prevCharCode !== 32 /* CharCode.Space */ &&
                prevCharCode !== 9 /* CharCode.Tab */;
            if (!isSingleTrailingSpace) {
                generateWhitespace = true;
            }
        }
        else {
            generateWhitespace = true;
        }
    }
    if (generateWhitespace) {
        if (generateLinePartForEachWhitespace) {
            const lastEndIndex = resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength;
            for (let i = lastEndIndex + 1; i <= len; i++) {
                result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
            }
        }
        else {
            result[resultLen++] = new LinePart(len, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
        }
    }
    else {
        result[resultLen++] = new LinePart(len, tokenType, 0, tokenContainsRTL);
    }
    return result;
}
/**
 * Inline decorations are "merged" on top of tokens.
 * Special care must be taken when multiple inline decorations are at play and they overlap.
 */
function _applyInlineDecorations(lineContent, len, tokens, _lineDecorations) {
    _lineDecorations.sort(LineDecoration.compare);
    const lineDecorations = LineDecorationsNormalizer.normalize(lineContent, _lineDecorations);
    const lineDecorationsLen = lineDecorations.length;
    let lineDecorationIndex = 0;
    const result = [];
    let resultLen = 0;
    let lastResultEndIndex = 0;
    for (let tokenIndex = 0, len = tokens.length; tokenIndex < len; tokenIndex++) {
        const token = tokens[tokenIndex];
        const tokenEndIndex = token.endIndex;
        const tokenType = token.type;
        const tokenMetadata = token.metadata;
        const tokenContainsRTL = token.containsRTL;
        while (lineDecorationIndex < lineDecorationsLen &&
            lineDecorations[lineDecorationIndex].startOffset < tokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            if (lineDecoration.startOffset > lastResultEndIndex) {
                lastResultEndIndex = lineDecoration.startOffset;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            if (lineDecoration.endOffset + 1 <= tokenEndIndex) {
                // This line decoration ends before this token ends
                lastResultEndIndex = lineDecoration.endOffset + 1;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                lineDecorationIndex++;
            }
            else {
                // This line decoration continues on to the next token
                lastResultEndIndex = tokenEndIndex;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                break;
            }
        }
        if (tokenEndIndex > lastResultEndIndex) {
            lastResultEndIndex = tokenEndIndex;
            result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
        }
    }
    const lastTokenEndIndex = tokens[tokens.length - 1].endIndex;
    if (lineDecorationIndex < lineDecorationsLen &&
        lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
        while (lineDecorationIndex < lineDecorationsLen &&
            lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            result[resultLen++] = new LinePart(lastResultEndIndex, lineDecoration.className, lineDecoration.metadata, false);
            lineDecorationIndex++;
        }
    }
    return result;
}
/**
 * This function is on purpose not split up into multiple functions to allow runtime type inference (i.e. performance reasons).
 * Notice how all the needed data is fully resolved and passed in (i.e. no other calls).
 */
function _renderLine(input, sb) {
    const fontIsMonospace = input.fontIsMonospace;
    const canUseHalfwidthRightwardsArrow = input.canUseHalfwidthRightwardsArrow;
    const containsForeignElements = input.containsForeignElements;
    const lineContent = input.lineContent;
    const len = input.len;
    const isOverflowing = input.isOverflowing;
    const overflowingCharCount = input.overflowingCharCount;
    const parts = input.parts;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const containsRTL = input.containsRTL;
    const spaceWidth = input.spaceWidth;
    const renderSpaceCharCode = input.renderSpaceCharCode;
    const renderWhitespace = input.renderWhitespace;
    const renderControlCharacters = input.renderControlCharacters;
    const characterMapping = new CharacterMapping(len + 1, parts.length);
    let lastCharacterMappingDefined = false;
    let charIndex = 0;
    let visibleColumn = startVisibleColumn;
    let charOffsetInPart = 0; // the character offset in the current part
    let charHorizontalOffset = 0; // the character horizontal position in terms of chars relative to line start
    let partDisplacement = 0;
    if (containsRTL) {
        sb.appendString('<span dir="ltr">');
    }
    else {
        sb.appendString('<span>');
    }
    for (let partIndex = 0, tokensLen = parts.length; partIndex < tokensLen; partIndex++) {
        const part = parts[partIndex];
        const partEndIndex = part.endIndex;
        const partType = part.type;
        const partContainsRTL = part.containsRTL;
        const partRendersWhitespace = renderWhitespace !== 0 /* RenderWhitespace.None */ && part.isWhitespace();
        const partRendersWhitespaceWithWidth = partRendersWhitespace &&
            !fontIsMonospace &&
            (partType === 'mtkw' /*only whitespace*/ || !containsForeignElements);
        const partIsEmptyAndHasPseudoAfter = charIndex === partEndIndex && part.isPseudoAfter();
        charOffsetInPart = 0;
        sb.appendString('<span ');
        if (partContainsRTL) {
            sb.appendString('style="unicode-bidi:isolate" ');
        }
        sb.appendString('class="');
        sb.appendString(partRendersWhitespaceWithWidth ? 'mtkz' : partType);
        sb.appendASCIICharCode(34 /* CharCode.DoubleQuote */);
        if (partRendersWhitespace) {
            let partWidth = 0;
            {
                let _charIndex = charIndex;
                let _visibleColumn = visibleColumn;
                for (; _charIndex < partEndIndex; _charIndex++) {
                    const charCode = lineContent.charCodeAt(_charIndex);
                    const charWidth = (charCode === 9 /* CharCode.Tab */ ? tabSize - (_visibleColumn % tabSize) : 1) | 0;
                    partWidth += charWidth;
                    if (_charIndex >= fauxIndentLength) {
                        _visibleColumn += charWidth;
                    }
                }
            }
            if (partRendersWhitespaceWithWidth) {
                sb.appendString(' style="width:');
                sb.appendString(String(spaceWidth * partWidth));
                sb.appendString('px"');
            }
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters;
                let charWidth;
                if (charCode === 9 /* CharCode.Tab */) {
                    producedCharacters = (tabSize - (visibleColumn % tabSize)) | 0;
                    charWidth = producedCharacters;
                    if (!canUseHalfwidthRightwardsArrow || charWidth > 1) {
                        sb.appendCharCode(0x2192); // RIGHTWARDS ARROW
                    }
                    else {
                        sb.appendCharCode(0xffeb); // HALFWIDTH RIGHTWARDS ARROW
                    }
                    for (let space = 2; space <= charWidth; space++) {
                        sb.appendCharCode(0xa0); // &nbsp;
                    }
                }
                else {
                    // must be CharCode.Space
                    producedCharacters = 2;
                    charWidth = 1;
                    sb.appendCharCode(renderSpaceCharCode); // &middot; or word separator middle dot
                    sb.appendCharCode(0x200c); // ZERO WIDTH NON-JOINER
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        else {
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters = 1;
                let charWidth = 1;
                switch (charCode) {
                    case 9 /* CharCode.Tab */:
                        producedCharacters = tabSize - (visibleColumn % tabSize);
                        charWidth = producedCharacters;
                        for (let space = 1; space <= producedCharacters; space++) {
                            sb.appendCharCode(0xa0); // &nbsp;
                        }
                        break;
                    case 32 /* CharCode.Space */:
                        sb.appendCharCode(0xa0); // &nbsp;
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
                        if (renderControlCharacters) {
                            // See https://unicode-table.com/en/blocks/control-pictures/
                            sb.appendCharCode(9216);
                        }
                        else {
                            sb.appendString('&#00;');
                        }
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
                        // See https://unicode-table.com/en/blocks/control-pictures/
                        if (renderControlCharacters && charCode < 32) {
                            sb.appendCharCode(9216 + charCode);
                        }
                        else if (renderControlCharacters && charCode === 127) {
                            // DEL
                            sb.appendCharCode(9249);
                        }
                        else if (renderControlCharacters && isControlCharacter(charCode)) {
                            sb.appendString('[U+');
                            sb.appendString(to4CharHex(charCode));
                            sb.appendString(']');
                            producedCharacters = 8;
                            charWidth = producedCharacters;
                        }
                        else {
                            sb.appendCharCode(charCode);
                        }
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        if (partIsEmptyAndHasPseudoAfter) {
            partDisplacement++;
        }
        else {
            partDisplacement = 0;
        }
        if (charIndex >= len && !lastCharacterMappingDefined && part.isPseudoAfter()) {
            lastCharacterMappingDefined = true;
            characterMapping.setColumnInfo(charIndex + 1, partIndex, charOffsetInPart, charHorizontalOffset);
        }
        sb.appendString('</span>');
    }
    if (!lastCharacterMappingDefined) {
        // When getting client rects for the last character, we will position the
        // text range at the end of the span, insteaf of at the beginning of next span
        characterMapping.setColumnInfo(len + 1, parts.length - 1, charOffsetInPart, charHorizontalOffset);
    }
    if (isOverflowing) {
        sb.appendString('<span class="mtkoverflow">');
        sb.appendString(nls.localize('showMore', 'Show more ({0})', renderOverflowingCharCount(overflowingCharCount)));
        sb.appendString('</span>');
    }
    sb.appendString('</span>');
    return new RenderLineOutput(characterMapping, containsRTL, containsForeignElements);
}
function to4CharHex(n) {
    return n.toString(16).toUpperCase().padStart(4, '0');
}
function renderOverflowingCharCount(n) {
    if (n < 1024) {
        return nls.localize('overflow.chars', '{0} chars', n);
    }
    if (n < 1024 * 1024) {
        return `${(n / 1024).toFixed(1)} KB`;
    }
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L3ZpZXdMaW5lUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUV0QyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFaEYsT0FBTyxFQUFFLFFBQVEsRUFBb0IsTUFBTSxlQUFlLENBQUE7QUFFMUQsTUFBTSxDQUFOLElBQWtCLGdCQU1qQjtBQU5ELFdBQWtCLGdCQUFnQjtJQUNqQyx1REFBUSxDQUFBO0lBQ1IsK0RBQVksQ0FBQTtJQUNaLGlFQUFhLENBQUE7SUFDYiwrREFBWSxDQUFBO0lBQ1oscURBQU8sQ0FBQTtBQUNSLENBQUMsRUFOaUIsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQU1qQztBQUVELE1BQU0sT0FBTyxTQUFTO0lBV3JCLFlBQVksVUFBa0IsRUFBRSxRQUFnQjtRQUMvQyxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRU0sTUFBTSxDQUFDLGNBQXlCO1FBQ3RDLE9BQU8sQ0FDTixJQUFJLENBQUMsV0FBVyxLQUFLLGNBQWMsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxjQUFjLENBQUMsU0FBUyxDQUM5RixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGVBQWU7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