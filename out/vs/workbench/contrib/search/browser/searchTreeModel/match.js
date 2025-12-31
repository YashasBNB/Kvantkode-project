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
import { memoize } from '../../../../../base/common/decorators.js';
import { lcut } from '../../../../../base/common/strings.js';
import { OneLineRange, } from '../../../../services/search/common/search.js';
import { MATCH_PREFIX } from './searchTreeCommon.js';
import { Range } from '../../../../../editor/common/core/range.js';
export function textSearchResultToMatches(rawMatch, fileMatch, isAiContributed) {
    const previewLines = rawMatch.previewText.split('\n');
    return rawMatch.rangeLocations.map((rangeLocation) => {
        const previewRange = rangeLocation.preview;
        return new MatchImpl(fileMatch, previewLines, previewRange, rangeLocation.source, isAiContributed);
    });
}
export class MatchImpl {
    static { this.MAX_PREVIEW_CHARS = 250; }
    constructor(_parent, _fullPreviewLines, _fullPreviewRange, _documentRange, _isReadonly = false) {
        this._parent = _parent;
        this._fullPreviewLines = _fullPreviewLines;
        this._isReadonly = _isReadonly;
        this._oneLinePreviewText = _fullPreviewLines[_fullPreviewRange.startLineNumber];
        const adjustedEndCol = _fullPreviewRange.startLineNumber === _fullPreviewRange.endLineNumber
            ? _fullPreviewRange.endColumn
            : this._oneLinePreviewText.length;
        this._rangeInPreviewText = new OneLineRange(1, _fullPreviewRange.startColumn + 1, adjustedEndCol + 1);
        this._range = new Range(_documentRange.startLineNumber + 1, _documentRange.startColumn + 1, _documentRange.endLineNumber + 1, _documentRange.endColumn + 1);
        this._fullPreviewRange = _fullPreviewRange;
        this._id =
            MATCH_PREFIX + this._parent.resource.toString() + '>' + this._range + this.getMatchString();
    }
    id() {
        return this._id;
    }
    parent() {
        return this._parent;
    }
    text() {
        return this._oneLinePreviewText;
    }
    range() {
        return this._range;
    }
    preview() {
        const fullBefore = this._oneLinePreviewText.substring(0, this._rangeInPreviewText.startColumn - 1), before = lcut(fullBefore, 26, '…');
        let inside = this.getMatchString(), after = this._oneLinePreviewText.substring(this._rangeInPreviewText.endColumn - 1);
        let charsRemaining = MatchImpl.MAX_PREVIEW_CHARS - before.length;
        inside = inside.substr(0, charsRemaining);
        charsRemaining -= inside.length;
        after = after.substr(0, charsRemaining);
        return {
            before,
            fullBefore,
            inside,
            after,
        };
    }
    get replaceString() {
        const searchModel = this.parent().parent().searchModel;
        if (!searchModel.replacePattern) {
            throw new Error('searchModel.replacePattern must be set before accessing replaceString');
        }
        const fullMatchText = this.fullMatchText();
        let replaceString = searchModel.replacePattern.getReplaceString(fullMatchText, searchModel.preserveCase);
        if (replaceString !== null) {
            return replaceString;
        }
        // Search/find normalize line endings - check whether \r prevents regex from matching
        const fullMatchTextWithoutCR = fullMatchText.replace(/\r\n/g, '\n');
        if (fullMatchTextWithoutCR !== fullMatchText) {
            replaceString = searchModel.replacePattern.getReplaceString(fullMatchTextWithoutCR, searchModel.preserveCase);
            if (replaceString !== null) {
                return replaceString;
            }
        }
        // If match string is not matching then regex pattern has a lookahead expression
        const contextMatchTextWithSurroundingContent = this.fullMatchText(true);
        replaceString = searchModel.replacePattern.getReplaceString(contextMatchTextWithSurroundingContent, searchModel.preserveCase);
        if (replaceString !== null) {
            return replaceString;
        }
        // Search/find normalize line endings, this time in full context
        const contextMatchTextWithoutCR = contextMatchTextWithSurroundingContent.replace(/\r\n/g, '\n');
        if (contextMatchTextWithoutCR !== contextMatchTextWithSurroundingContent) {
            replaceString = searchModel.replacePattern.getReplaceString(contextMatchTextWithoutCR, searchModel.preserveCase);
            if (replaceString !== null) {
                return replaceString;
            }
        }
        // Match string is still not matching. Could be unsupported matches (multi-line).
        return searchModel.replacePattern.pattern;
    }
    fullMatchText(includeSurrounding = false) {
        let thisMatchPreviewLines;
        if (includeSurrounding) {
            thisMatchPreviewLines = this._fullPreviewLines;
        }
        else {
            thisMatchPreviewLines = this._fullPreviewLines.slice(this._fullPreviewRange.startLineNumber, this._fullPreviewRange.endLineNumber + 1);
            thisMatchPreviewLines[thisMatchPreviewLines.length - 1] = thisMatchPreviewLines[thisMatchPreviewLines.length - 1].slice(0, this._fullPreviewRange.endColumn);
            thisMatchPreviewLines[0] = thisMatchPreviewLines[0].slice(this._fullPreviewRange.startColumn);
        }
        return thisMatchPreviewLines.join('\n');
    }
    rangeInPreview() {
        // convert to editor's base 1 positions.
        return {
            ...this._fullPreviewRange,
            startColumn: this._fullPreviewRange.startColumn + 1,
            endColumn: this._fullPreviewRange.endColumn + 1,
        };
    }
    fullPreviewLines() {
        return this._fullPreviewLines.slice(this._fullPreviewRange.startLineNumber, this._fullPreviewRange.endLineNumber + 1);
    }
    getMatchString() {
        return this._oneLinePreviewText.substring(this._rangeInPreviewText.startColumn - 1, this._rangeInPreviewText.endColumn - 1);
    }
    get isReadonly() {
        return this._isReadonly;
    }
}
__decorate([
    memoize
], MatchImpl.prototype, "preview", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hUcmVlTW9kZWwvbWF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBR04sWUFBWSxHQUNaLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUEwQyxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxRQUEwQixFQUMxQixTQUErQixFQUMvQixlQUF3QjtJQUV4QixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyRCxPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7UUFDcEQsTUFBTSxZQUFZLEdBQWlCLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDeEQsT0FBTyxJQUFJLFNBQVMsQ0FDbkIsU0FBUyxFQUNULFlBQVksRUFDWixZQUFZLEVBQ1osYUFBYSxDQUFDLE1BQU0sRUFDcEIsZUFBZSxDQUNmLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxNQUFNLE9BQU8sU0FBUzthQUNHLHNCQUFpQixHQUFHLEdBQUcsQ0FBQTtJQVEvQyxZQUNXLE9BQTZCLEVBQy9CLGlCQUEyQixFQUNuQyxpQkFBK0IsRUFDL0IsY0FBNEIsRUFDWCxjQUF1QixLQUFLO1FBSm5D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