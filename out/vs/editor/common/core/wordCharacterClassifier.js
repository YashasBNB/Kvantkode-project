/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
import { LRUCache } from '../../../base/common/map.js';
import { CharacterClassifier } from './characterClassifier.js';
export var WordCharacterClass;
(function (WordCharacterClass) {
    WordCharacterClass[WordCharacterClass["Regular"] = 0] = "Regular";
    WordCharacterClass[WordCharacterClass["Whitespace"] = 1] = "Whitespace";
    WordCharacterClass[WordCharacterClass["WordSeparator"] = 2] = "WordSeparator";
})(WordCharacterClass || (WordCharacterClass = {}));
export class WordCharacterClassifier extends CharacterClassifier {
    constructor(wordSeparators, intlSegmenterLocales) {
        super(0 /* WordCharacterClass.Regular */);
        this._segmenter = null;
        this._cachedLine = null;
        this._cachedSegments = [];
        this.intlSegmenterLocales = intlSegmenterLocales;
        if (this.intlSegmenterLocales.length > 0) {
            this._segmenter = safeIntl.Segmenter(this.intlSegmenterLocales, { granularity: 'word' });
        }
        else {
            this._segmenter = null;
        }
        for (let i = 0, len = wordSeparators.length; i < len; i++) {
            this.set(wordSeparators.charCodeAt(i), 2 /* WordCharacterClass.WordSeparator */);
        }
        this.set(32 /* CharCode.Space */, 1 /* WordCharacterClass.Whitespace */);
        this.set(9 /* CharCode.Tab */, 1 /* WordCharacterClass.Whitespace */);
    }
    findPrevIntlWordBeforeOrAtOffset(line, offset) {
        let candidate = null;
        for (const segment of this._getIntlSegmenterWordsOnLine(line)) {
            if (segment.index > offset) {
                break;
            }
            candidate = segment;
        }
        return candidate;
    }
    findNextIntlWordAtOrAfterOffset(lineContent, offset) {
        for (const segment of this._getIntlSegmenterWordsOnLine(lineContent)) {
            if (segment.index < offset) {
                continue;
            }
            return segment;
        }
        return null;
    }
    _getIntlSegmenterWordsOnLine(line) {
        if (!this._segmenter) {
            return [];
        }
        // Check if the line has changed from the previous call
        if (this._cachedLine === line) {
            return this._cachedSegments;
        }
        // Update the cache with the new line
        this._cachedLine = line;
        this._cachedSegments = this._filterWordSegments(this._segmenter.segment(line));
        return this._cachedSegments;
    }
    _filterWordSegments(segments) {
        const result = [];
        for (const segment of segments) {
            if (this._isWordLike(segment)) {
                result.push(segment);
            }
        }
        return result;
    }
    _isWordLike(segment) {
        if (segment.isWordLike) {
            return true;
        }
        return false;
    }
}
const wordClassifierCache = new LRUCache(10);
export function getMapForWordSeparators(wordSeparators, intlSegmenterLocales) {
    const key = `${wordSeparators}/${intlSegmenterLocales.join(',')}`;
    let result = wordClassifierCache.get(key);
    if (!result) {
        result = new WordCharacterClassifier(wordSeparators, intlSegmenterLocales);
        wordClassifierCache.set(key, result);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZENoYXJhY3RlckNsYXNzaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvd29yZENoYXJhY3RlckNsYXNzaWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU5RCxNQUFNLENBQU4sSUFBa0Isa0JBSWpCO0FBSkQsV0FBa0Isa0JBQWtCO0lBQ25DLGlFQUFXLENBQUE7SUFDWCx1RUFBYyxDQUFBO0lBQ2QsNkVBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUppQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBSW5DO0FBRUQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLG1CQUF1QztJQU1uRixZQUFZLGNBQXNCLEVBQUUsb0JBQXlEO1FBQzVGLEtBQUssb0NBQTRCLENBQUE7UUFMakIsZUFBVSxHQUEwQixJQUFJLENBQUE7UUFDakQsZ0JBQVcsR0FBa0IsSUFBSSxDQUFBO1FBQ2pDLG9CQUFlLEdBQTBCLEVBQUUsQ0FBQTtRQUlsRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUE7UUFDaEQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN6RixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFB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