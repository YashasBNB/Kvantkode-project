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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFNlbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NtYXJ0U2VsZWN0L2Jyb3dzZXIvYnJhY2tldFNlbGVjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJckQsTUFBTSxPQUFPLDZCQUE2QjtJQUN6QyxLQUFLLENBQUMsc0JBQXNCLENBQzNCLEtBQWlCLEVBQ2pCLFNBQXFCO1FBRXJCLE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUE7UUFFckMsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFbkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7WUFDbkQsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ25DLDZCQUE2QixDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FDdEYsQ0FBQTtZQUNELE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNuQyw2QkFBNkIsQ0FBQyxrQkFBa0IsQ0FDL0MsT0FBTyxFQUNQLENBQUMsRUFDRCxLQUFLLEVBQ0wsUUFBUSxFQUNSLE1BQU0sRUFDTixNQUFNLENBQ04sQ0FDRCxDQUFBO1FBQ0YsQ0FBQztR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