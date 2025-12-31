/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLowerAsciiLetter, isUpperAsciiLetter } from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
export class WordSelectionRangeProvider {
    constructor(selectSubwords = true) {
        this.selectSubwords = selectSubwords;
    }
    provideSelectionRanges(model, positions) {
        const result = [];
        for (const position of positions) {
            const bucket = [];
            result.push(bucket);
            if (this.selectSubwords) {
                this._addInWordRanges(bucket, model, position);
            }
            this._addWordRanges(bucket, model, position);
            this._addWhitespaceLine(bucket, model, position);
            bucket.push({ range: model.getFullModelRange() });
        }
        return result;
    }
    _addInWordRanges(bucket, model, pos) {
        const obj = model.getWordAtPosition(pos);
        if (!obj) {
            return;
        }
        const { word, startColumn } = obj;
        const offset = pos.column - startColumn;
        let start = offset;
        let end = offset;
        let lastCh = 0;
        // LEFT anchor (start)
        for (; start >= 0; start--) {
            const ch = word.charCodeAt(start);
            if (start !== offset && (ch === 95 /* CharCode.Underline */ || ch === 45 /* CharCode.Dash */)) {
                // foo-bar OR foo_bar
                break;
            }
            else if (isLowerAsciiLetter(ch) && isUpperAsciiLetter(lastCh)) {
                // fooBar
                break;
            }
            lastCh = ch;
        }
        start += 1;
        // RIGHT anchor (end)
        for (; end < word.length; end++) {
            const ch = word.charCodeAt(end);
            if (isUpperAsciiLetter(ch) && isLowerAsciiLetter(lastCh)) {
                // fooBar
                break;
            }
            else if (ch === 95 /* CharCode.Underline */ || ch === 45 /* CharCode.Dash */) {
                // foo-bar OR foo_bar
                break;
            }
            lastCh = ch;
        }
        if (start < end) {
            bucket.push({
                range: new Range(pos.lineNumber, startColumn + start, pos.lineNumber, startColumn + end),
            });
        }
    }
    _addWordRanges(bucket, model, pos) {
        const word = model.getWordAtPosition(pos);
        if (word) {
            bucket.push({
                range: new Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn),
            });
        }
    }
    _addWhitespaceLine(bucket, model, pos) {
        if (model.getLineLength(pos.lineNumber) > 0 &&
            model.getLineFirstNonWhitespaceColumn(pos.lineNumber) === 0 &&
            model.getLineLastNonWhitespaceColumn(pos.lineNumber) === 0) {
            bucket.push({
                range: new Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber)),
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFNlbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbWFydFNlbGVjdC9icm93c2VyL3dvcmRTZWxlY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUlyRCxNQUFNLE9BQU8sMEJBQTBCO0lBQ3RDLFlBQTZCLGlCQUFpQixJQUFJO1FBQXJCLG1CQUFjLEdBQWQsY0FBYyxDQUFPO0lBQUcsQ0FBQztJQUV0RCxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLFNBQXFCO1FBQzlELE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUE7UUFDckMsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkIsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDNUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDaEQsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNE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