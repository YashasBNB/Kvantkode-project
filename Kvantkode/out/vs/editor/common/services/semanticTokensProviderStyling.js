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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvc2VtYW50aWNUb2tlbnNQcm92aWRlclN0eWxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUE2QixhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUUzRCxJQUFXLHNDQUVWO0FBRkQsV0FBVyxzQ0FBc0M7SUFDaEQsd0hBQStDLENBQUE7QUFDaEQsQ0FBQyxFQUZVLHNDQUFzQyxLQUF0QyxzQ0FBc0MsUUFFaEQ7QUFFRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUE7QUFFbkIsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7SUFNekMsWUFDa0IsT0FBNkIsRUFDL0IsYUFBNkMsRUFDMUMsZ0JBQW1ELEVBQ3hELFdBQXlDO1FBSHJDLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBQ2Qsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUN2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQVIvQyxnQ0FBMkIsR0FBRyxLQUFLLENBQUE7UUFDbkMsa0NBQTZCLEdBQUcsS0FBSyxDQUFBO1FBQ3JDLCtCQUEwQixHQUFHLEtBQUssQ0FBQTtR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