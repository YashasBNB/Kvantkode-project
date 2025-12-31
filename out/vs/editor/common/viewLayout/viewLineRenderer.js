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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC92aWV3TGluZVJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFFdEMsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRWhGLE9BQU8sRUFBRSxRQUFRLEVBQW9CLE1BQU0sZUFBZSxDQUFBO0FBRTFELE1BQU0sQ0FBTixJQUFrQixnQkFNakI7QUFORCxXQUFrQixnQkFBZ0I7SUFDakMsdURBQVEsQ0FBQTtJQUNSLCtEQUFZLENBQUE7SUFDWixpRUFBYSxDQUFBO0lBQ2IsK0RBQVksQ0FBQTtJQUNaLHFEQUFPLENBQUE7QUFDUixDQUFDLEVBTmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFNakM7QUFFRCxNQUFNLE9BQU8sU0FBUztJQVdyQixZQUFZLFVBQWtCLEVBQUUsUUFBZ0I7UUFDL0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7SUFDMUIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxjQUF5QjtRQUN0QyxPQUFPLENBQ04sSUFBSSxDQUFDLFdBQVcsS0FBSyxjQUFjLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssY0FBYyxDQUFDLFNBQVMsQ0FDOUYsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBMEIzQixZQUNDLHlCQUFrQyxFQUNs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