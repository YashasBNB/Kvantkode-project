/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { TokenMetadata } from '../encodedTokenAttributes.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ILogService, LogLevel } from '../../../platform/log/common/log.js';
import { SparseMultilineTokens } from '../tokens/sparseMultilineTokens.js';
import { ILanguageService } from '../languages/language.js';
var SemanticTokensProviderStylingConstants;
(function (SemanticTokensProviderStylingConstants) {
    SemanticTokensProviderStylingConstants[SemanticTokensProviderStylingConstants["NO_STYLING"] = 2147483647] = "NO_STYLING";
})(SemanticTokensProviderStylingConstants || (SemanticTokensProviderStylingConstants = {}));
const ENABLE_TRACE = false;
let SemanticTokensProviderStyling = class SemanticTokensProviderStyling {
    constructor(_legend, _themeService, _languageService, _logService) {
        this._legend = _legend;
        this._themeService = _themeService;
        this._languageService = _languageService;
        this._logService = _logService;
        this._hasWarnedOverlappingTokens = false;
        this._hasWarnedInvalidLengthTokens = false;
        this._hasWarnedInvalidEditStart = false;
        this._hashTable = new HashTable();
    }
    getMetadata(tokenTypeIndex, tokenModifierSet, languageId) {
        const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
        const entry = this._hashTable.get(tokenTypeIndex, tokenModifierSet, encodedLanguageId);
        let metadata;
        if (entry) {
            metadata = entry.metadata;
            if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                this._logService.trace(`SemanticTokensProviderStyling [CACHED] ${tokenTypeIndex} / ${tokenModifierSet}: foreground ${TokenMetadata.getForeground(metadata)}, fontStyle ${TokenMetadata.getFontStyle(metadata).toString(2)}`);
            }
        }
        else {
            let tokenType = this._legend.tokenTypes[tokenTypeIndex];
            const tokenModifiers = [];
            if (tokenType) {
                let modifierSet = tokenModifierSet;
                for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < this._legend.tokenModifiers.length; modifierIndex++) {
                    if (modifierSet & 1) {
                        tokenModifiers.push(this._legend.tokenModifiers[modifierIndex]);
                    }
                    modifierSet = modifierSet >> 1;
                }
                if (ENABLE_TRACE && modifierSet > 0 && this._logService.getLevel() === LogLevel.Trace) {
                    this._logService.trace(`SemanticTokensProviderStyling: unknown token modifier index: ${tokenModifierSet.toString(2)} for legend: ${JSON.stringify(this._legend.tokenModifiers)}`);
                    tokenModifiers.push('not-in-legend');
                }
                const tokenStyle = this._themeService
                    .getColorTheme()
                    .getTokenStyleMetadata(tokenType, tokenModifiers, languageId);
                if (typeof tokenStyle === 'undefined') {
                    metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                }
                else {
                    metadata = 0;
                    if (typeof tokenStyle.italic !== 'undefined') {
                        const italicBit = (tokenStyle.italic ? 1 /* FontStyle.Italic */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= italicBit | 1 /* MetadataConsts.SEMANTIC_USE_ITALIC */;
                    }
                    if (typeof tokenStyle.bold !== 'undefined') {
                        const boldBit = (tokenStyle.bold ? 2 /* FontStyle.Bold */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= boldBit | 2 /* MetadataConsts.SEMANTIC_USE_BOLD */;
                    }
                    if (typeof tokenStyle.underline !== 'undefined') {
                        const underlineBit = (tokenStyle.underline ? 4 /* FontStyle.Underline */ : 0) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= underlineBit | 4 /* MetadataConsts.SEMANTIC_USE_UNDERLINE */;
                    }
                    if (typeof tokenStyle.strikethrough !== 'undefined') {
                        const strikethroughBit = (tokenStyle.strikethrough ? 8 /* FontStyle.Strikethrough */ : 0) <<
                            11 /* MetadataConsts.FONT_STYLE_OFFSET */;
                        metadata |= strikethroughBit | 8 /* MetadataConsts.SEMANTIC_USE_STRIKETHROUGH */;
                    }
                    if (tokenStyle.foreground) {
                        const foregroundBits = tokenStyle.foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */;
                        metadata |= foregroundBits | 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */;
                    }
                    if (metadata === 0) {
                        // Nothing!
                        metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                    }
                }
            }
            else {
                if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                    this._logService.trace(`SemanticTokensProviderStyling: unknown token type index: ${tokenTypeIndex} for legend: ${JSON.stringify(this._legend.tokenTypes)}`);
                }
                metadata = 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */;
                tokenType = 'not-in-legend';
            }
            this._hashTable.add(tokenTypeIndex, tokenModifierSet, encodedLanguageId, metadata);
            if (ENABLE_TRACE && this._logService.getLevel() === LogLevel.Trace) {
                this._logService.trace(`SemanticTokensProviderStyling ${tokenTypeIndex} (${tokenType}) / ${tokenModifierSet} (${tokenModifiers.join(' ')}): foreground ${TokenMetadata.getForeground(metadata)}, fontStyle ${TokenMetadata.getFontStyle(metadata).toString(2)}`);
            }
        }
        return metadata;
    }
    warnOverlappingSemanticTokens(lineNumber, startColumn) {
        if (!this._hasWarnedOverlappingTokens) {
            this._hasWarnedOverlappingTokens = true;
            this._logService.warn(`Overlapping semantic tokens detected at lineNumber ${lineNumber}, column ${startColumn}`);
        }
    }
    warnInvalidLengthSemanticTokens(lineNumber, startColumn) {
        if (!this._hasWarnedInvalidLengthTokens) {
            this._hasWarnedInvalidLengthTokens = true;
            this._logService.warn(`Semantic token with invalid length detected at lineNumber ${lineNumber}, column ${startColumn}`);
        }
    }
    warnInvalidEditStart(previousResultId, resultId, editIndex, editStart, maxExpectedStart) {
        if (!this._hasWarnedInvalidEditStart) {
            this._hasWarnedInvalidEditStart = true;
            this._logService.warn(`Invalid semantic tokens edit detected (previousResultId: ${previousResultId}, resultId: ${resultId}) at edit #${editIndex}: The provided start offset ${editStart} is outside the previous data (length ${maxExpectedStart}).`);
        }
    }
};
SemanticTokensProviderStyling = __decorate([
    __param(1, IThemeService),
    __param(2, ILanguageService),
    __param(3, ILogService)
], SemanticTokensProviderStyling);
export { SemanticTokensProviderStyling };
var SemanticColoringConstants;
(function (SemanticColoringConstants) {
    /**
     * Let's aim at having 8KB buffers if possible...
     * So that would be 8192 / (5 * 4) = 409.6 tokens per area
     */
    SemanticColoringConstants[SemanticColoringConstants["DesiredTokensPerArea"] = 400] = "DesiredTokensPerArea";
    /**
     * Try to keep the total number of areas under 1024 if possible,
     * simply compensate by having more tokens per area...
     */
    SemanticColoringConstants[SemanticColoringConstants["DesiredMaxAreas"] = 1024] = "DesiredMaxAreas";
})(SemanticColoringConstants || (SemanticColoringConstants = {}));
export function toMultilineTokens2(tokens, styling, languageId) {
    const srcData = tokens.data;
    const tokenCount = (tokens.data.length / 5) | 0;
    const tokensPerArea = Math.max(Math.ceil(tokenCount / 1024 /* SemanticColoringConstants.DesiredMaxAreas */), 400 /* SemanticColoringConstants.DesiredTokensPerArea */);
    const result = [];
    let tokenIndex = 0;
    let lastLineNumber = 1;
    let lastStartCharacter = 0;
    while (tokenIndex < tokenCount) {
        const tokenStartIndex = tokenIndex;
        let tokenEndIndex = Math.min(tokenStartIndex + tokensPerArea, tokenCount);
        // Keep tokens on the same line in the same area...
        if (tokenEndIndex < tokenCount) {
            let smallTokenEndIndex = tokenEndIndex;
            while (smallTokenEndIndex - 1 > tokenStartIndex && srcData[5 * smallTokenEndIndex] === 0) {
                smallTokenEndIndex--;
            }
            if (smallTokenEndIndex - 1 === tokenStartIndex) {
                // there are so many tokens on this line that our area would be empty, we must now go right
                let bigTokenEndIndex = tokenEndIndex;
                while (bigTokenEndIndex + 1 < tokenCount && srcData[5 * bigTokenEndIndex] === 0) {
                    bigTokenEndIndex++;
                }
                tokenEndIndex = bigTokenEndIndex;
            }
            else {
                tokenEndIndex = smallTokenEndIndex;
            }
        }
        let destData = new Uint32Array((tokenEndIndex - tokenStartIndex) * 4);
        let destOffset = 0;
        let areaLine = 0;
        let prevLineNumber = 0;
        let prevEndCharacter = 0;
        while (tokenIndex < tokenEndIndex) {
            const srcOffset = 5 * tokenIndex;
            const deltaLine = srcData[srcOffset];
            const deltaCharacter = srcData[srcOffset + 1];
            // Casting both `lineNumber`, `startCharacter` and `endCharacter` here to uint32 using `|0`
            // to validate below with the actual values that will be inserted in the Uint32Array result
            const lineNumber = (lastLineNumber + deltaLine) | 0;
            const startCharacter = deltaLine === 0 ? (lastStartCharacter + deltaCharacter) | 0 : deltaCharacter;
            const length = srcData[srcOffset + 2];
            const endCharacter = (startCharacter + length) | 0;
            const tokenTypeIndex = srcData[srcOffset + 3];
            const tokenModifierSet = srcData[srcOffset + 4];
            if (endCharacter <= startCharacter) {
                // this token is invalid (most likely a negative length casted to uint32)
                styling.warnInvalidLengthSemanticTokens(lineNumber, startCharacter + 1);
            }
            else if (prevLineNumber === lineNumber && prevEndCharacter > startCharacter) {
                // this token overlaps with the previous token
                styling.warnOverlappingSemanticTokens(lineNumber, startCharacter + 1);
            }
            else {
                const metadata = styling.getMetadata(tokenTypeIndex, tokenModifierSet, languageId);
                if (metadata !== 2147483647 /* SemanticTokensProviderStylingConstants.NO_STYLING */) {
                    if (areaLine === 0) {
                        areaLine = lineNumber;
                    }
                    destData[destOffset] = lineNumber - areaLine;
                    destData[destOffset + 1] = startCharacter;
                    destData[destOffset + 2] = endCharacter;
                    destData[destOffset + 3] = metadata;
                    destOffset += 4;
                    prevLineNumber = lineNumber;
                    prevEndCharacter = endCharacter;
                }
            }
            lastLineNumber = lineNumber;
            lastStartCharacter = startCharacter;
            tokenIndex++;
        }
        if (destOffset !== destData.length) {
            destData = destData.subarray(0, destOffset);
        }
        const tokens = SparseMultilineTokens.create(areaLine, destData);
        result.push(tokens);
    }
    return result;
}
class HashTableEntry {
    constructor(tokenTypeIndex, tokenModifierSet, languageId, metadata) {
        this.tokenTypeIndex = tokenTypeIndex;
        this.tokenModifierSet = tokenModifierSet;
        this.languageId = languageId;
        this.metadata = metadata;
        this.next = null;
    }
}
class HashTable {
    static { this._SIZES = [
        3, 7, 13, 31, 61, 127, 251, 509, 1021, 2039, 4093, 8191, 16381, 32749, 65521, 131071, 262139,
        524287, 1048573, 2097143,
    ]; }
    constructor() {
        this._elementsCount = 0;
        this._currentLengthIndex = 0;
        this._currentLength = HashTable._SIZES[this._currentLengthIndex];
        this._growCount = Math.round(this._currentLengthIndex + 1 < HashTable._SIZES.length ? (2 / 3) * this._currentLength : 0);
        this._elements = [];
        HashTable._nullOutEntries(this._elements, this._currentLength);
    }
    static _nullOutEntries(entries, length) {
        for (let i = 0; i < length; i++) {
            entries[i] = null;
        }
    }
    _hash2(n1, n2) {
        return ((n1 << 5) - n1 + n2) | 0; // n1 * 31 + n2, keep as int32
    }
    _hashFunc(tokenTypeIndex, tokenModifierSet, languageId) {
        return (this._hash2(this._hash2(tokenTypeIndex, tokenModifierSet), languageId) % this._currentLength);
    }
    get(tokenTypeIndex, tokenModifierSet, languageId) {
        const hash = this._hashFunc(tokenTypeIndex, tokenModifierSet, languageId);
        let p = this._elements[hash];
        while (p) {
            if (p.tokenTypeIndex === tokenTypeIndex &&
                p.tokenModifierSet === tokenModifierSet &&
                p.languageId === languageId) {
                return p;
            }
            p = p.next;
        }
        return null;
    }
    add(tokenTypeIndex, tokenModifierSet, languageId, metadata) {
        this._elementsCount++;
        if (this._growCount !== 0 && this._elementsCount >= this._growCount) {
            // expand!
            const oldElements = this._elements;
            this._currentLengthIndex++;
            this._currentLength = HashTable._SIZES[this._currentLengthIndex];
            this._growCount = Math.round(this._currentLengthIndex + 1 < HashTable._SIZES.length ? (2 / 3) * this._currentLength : 0);
            this._elements = [];
            HashTable._nullOutEntries(this._elements, this._currentLength);
            for (const first of oldElements) {
                let p = first;
                while (p) {
                    const oldNext = p.next;
                    p.next = null;
                    this._add(p);
                    p = oldNext;
                }
            }
        }
        this._add(new HashTableEntry(tokenTypeIndex, tokenModifierSet, languageId, metadata));
    }
    _add(element) {
        const hash = this._hashFunc(element.tokenTypeIndex, element.tokenModifierSet, element.languageId);
        element.next = this._elements[hash];
        this._elements[hash] = element;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3NlbWFudGljVG9rZW5zUHJvdmlkZXJTdHlsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBNkIsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFM0QsSUFBVyxzQ0FFVjtBQUZELFdBQVcsc0NBQXNDO0lBQ2hELHdIQUErQyxDQUFBO0FBQ2hELENBQUMsRUFGVSxzQ0FBc0MsS0FBdEMsc0NBQXNDLFFBRWhEO0FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFBO0FBRW5CLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO0lBTXpDLFlBQ2tCLE9BQTZCLEVBQy9CLGFBQTZDLEVBQzFDLGdCQUFtRCxFQUN4RCxXQUF5QztRQUhyQyxZQUFPLEdBQVAsT0FBTyxDQUFzQjtRQUNkLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDdkMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFSL0MsZ0NBQTJCLEdBQUcsS0FBSyxDQUFBO1FBQ25DLGtDQUE2QixHQUFHLEtBQUssQ0FBQTtRQUNyQywrQkFBMEIsR0FBRyxLQUFLLENBQUE7UUFRekMsSUFBSSxDQUFDLFVBQVUsR0FB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