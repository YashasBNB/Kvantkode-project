/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LinkedList } from '../../../../base/common/linkedList.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
export class BracketSelectionRangeProvider {
    async provideSelectionRanges(model, positions) {
        const result = [];
        for (const position of positions) {
            const bucket = [];
            result.push(bucket);
            const ranges = new Map();
            await new Promise((resolve) => BracketSelectionRangeProvider._bracketsRightYield(resolve, 0, model, position, ranges));
            await new Promise((resolve) => BracketSelectionRangeProvider._bracketsLeftYield(resolve, 0, model, position, ranges, bucket));
        }
        return result;
    }
    static { this._maxDuration = 30; }
    static { this._maxRounds = 2; }
    static _bracketsRightYield(resolve, round, model, pos, ranges) {
        const counts = new Map();
        const t1 = Date.now();
        while (true) {
            if (round >= BracketSelectionRangeProvider._maxRounds) {
                resolve();
                break;
            }
            if (!pos) {
                resolve();
                break;
            }
            const bracket = model.bracketPairs.findNextBracket(pos);
            if (!bracket) {
                resolve();
                break;
            }
            const d = Date.now() - t1;
            if (d > BracketSelectionRangeProvider._maxDuration) {
                setTimeout(() => BracketSelectionRangeProvider._bracketsRightYield(resolve, round + 1, model, pos, ranges));
                break;
            }
            if (bracket.bracketInfo.isOpeningBracket) {
                const key = bracket.bracketInfo.bracketText;
                // wait for closing
                const val = counts.has(key) ? counts.get(key) : 0;
                counts.set(key, val + 1);
            }
            else {
                const key = bracket.bracketInfo.getOpeningBrackets()[0].bracketText;
                // process closing
                let val = counts.has(key) ? counts.get(key) : 0;
                val -= 1;
                counts.set(key, Math.max(0, val));
                if (val < 0) {
                    let list = ranges.get(key);
                    if (!list) {
                        list = new LinkedList();
                        ranges.set(key, list);
                    }
                    list.push(bracket.range);
                }
            }
            pos = bracket.range.getEndPosition();
        }
    }
    static _bracketsLeftYield(resolve, round, model, pos, ranges, bucket) {
        const counts = new Map();
        const t1 = Date.now();
        while (true) {
            if (round >= BracketSelectionRangeProvider._maxRounds && ranges.size === 0) {
                resolve();
                break;
            }
            if (!pos) {
                resolve();
                break;
            }
            const bracket = model.bracketPairs.findPrevBracket(pos);
            if (!bracket) {
                resolve();
                break;
            }
            const d = Date.now() - t1;
            if (d > BracketSelectionRangeProvider._maxDuration) {
                setTimeout(() => BracketSelectionRangeProvider._bracketsLeftYield(resolve, round + 1, model, pos, ranges, bucket));
                break;
            }
            if (!bracket.bracketInfo.isOpeningBracket) {
                const key = bracket.bracketInfo.getOpeningBrackets()[0].bracketText;
                // wait for opening
                const val = counts.has(key) ? counts.get(key) : 0;
                counts.set(key, val + 1);
            }
            else {
                const key = bracket.bracketInfo.bracketText;
                // opening
                let val = counts.has(key) ? counts.get(key) : 0;
                val -= 1;
                counts.set(key, Math.max(0, val));
                if (val < 0) {
                    const list = ranges.get(key);
                    if (list) {
                        const closing = list.shift();
                        if (list.size === 0) {
                            ranges.delete(key);
                        }
                        const innerBracket = Range.fromPositions(bracket.range.getEndPosition(), closing.getStartPosition());
                        const outerBracket = Range.fromPositions(bracket.range.getStartPosition(), closing.getEndPosition());
                        bucket.push({ range: innerBracket });
                        bucket.push({ range: outerBracket });
                        BracketSelectionRangeProvider._addBracketLeading(model, outerBracket, bucket);
                    }
                }
            }
            pos = bracket.range.getStartPosition();
        }
    }
    static _addBracketLeading(model, bracket, bucket) {
        if (bracket.startLineNumber === bracket.endLineNumber) {
            return;
        }
        // xxxxxxxx {
        //
        // }
        const startLine = bracket.startLineNumber;
        const column = model.getLineFirstNonWhitespaceColumn(startLine);
        if (column !== 0 && column !== bracket.startColumn) {
            bucket.push({
                range: Range.fromPositions(new Position(startLine, column), bracket.getEndPosition()),
            });
            bucket.push({
                range: Range.fromPositions(new Position(startLine, 1), bracket.getEndPosition()),
            });
        }
        // xxxxxxxx
        // {
        //
        // }
        const aboveLine = startLine - 1;
        if (aboveLine > 0) {
            const column = model.getLineFirstNonWhitespaceColumn(aboveLine);
            if (column === bracket.startColumn &&
                column !== model.getLineLastNonWhitespaceColumn(aboveLine)) {
                bucket.push({
                    range: Range.fromPositions(new Position(aboveLine, column), bracket.getEndPosition()),
                });
                bucket.push({
                    range: Range.fromPositions(new Position(aboveLine, 1), bracket.getEndPosition()),
                });
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFNlbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbWFydFNlbGVjdC9icm93c2VyL2JyYWNrZXRTZWxlY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXJELE1BQU0sT0FBTyw2QkFBNkI7SUFDekMsS0FBSyxDQUFDLHNCQUFzQixDQUMzQixLQUFpQixFQUNqQixTQUFxQjtRQUVyQixNQUFNLE1BQU0sR0FBdUIsRUFBRSxDQUFBO1FBRXJDLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQTtZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRW5CLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO1lBQ25ELE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNuQyw2QkFBNkIsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQ3RGLENBQUE7WUFDRCxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDbkMsNkJBQTZCLENBQUMsa0JBQWtCLENBQy9DLE9BQU8sRUFDUCxDQUFDLEVBQ0QsS0FBSyxFQUNMLFFBQVEsRUFDUixNQUFNLEVBQ04sTUFBTSxDQUNOLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxP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