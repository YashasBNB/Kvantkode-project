/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch, isFalsyOrEmpty } from '../../../../base/common/arrays.js';
import { Range } from '../../../common/core/range.js';
import { BracketSelectionRangeProvider } from '../../smartSelect/browser/bracketSelections.js';
export class WordDistance {
    static { this.None = new (class extends WordDistance {
        distance() {
            return 0;
        }
    })(); }
    static async create(service, editor) {
        if (!editor.getOption(123 /* EditorOption.suggest */).localityBonus) {
            return WordDistance.None;
        }
        if (!editor.hasModel()) {
            return WordDistance.None;
        }
        const model = editor.getModel();
        const position = editor.getPosition();
        if (!service.canComputeWordRanges(model.uri)) {
            return WordDistance.None;
        }
        const [ranges] = await new BracketSelectionRangeProvider().provideSelectionRanges(model, [
            position,
        ]);
        if (ranges.length === 0) {
            return WordDistance.None;
        }
        const wordRanges = await service.computeWordRanges(model.uri, ranges[0].range);
        if (!wordRanges) {
            return WordDistance.None;
        }
        // remove current word
        const wordUntilPos = model.getWordUntilPosition(position);
        delete wordRanges[wordUntilPos.word];
        return new (class extends WordDistance {
            distance(anchor, item) {
                if (!position.equals(editor.getPosition())) {
                    return 0;
                }
                if (item.kind === 17 /* CompletionItemKind.Keyword */) {
                    return 2 << 20;
                }
                const word = typeof item.label === 'string' ? item.label : item.label.label;
                const wordLines = wordRanges[word];
                if (isFalsyOrEmpty(wordLines)) {
                    return 2 << 20;
                }
                const idx = binarySearch(wordLines, Range.fromPositions(anchor), Range.compareRangesUsingStarts);
                const bestWordRange = idx >= 0 ? wordLines[idx] : wordLines[Math.max(0, ~idx - 1)];
                let blockDistance = ranges.length;
                for (const range of ranges) {
                    if (!Range.containsRange(range.range, bestWordRange)) {
                        break;
                    }
                    blockDistance -= 1;
                }
                return blockDistance;
            }
        })();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvd29yZERpc3RhbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3JELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlGLE1BQU0sT0FBZ0IsWUFBWTthQUNqQixTQUFJLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxZQUFZO1FBQ3JELFFBQVE7WUFDUCxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQTZCLEVBQUUsTUFBbUI7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLGdDQUFzQixDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzNELE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQTtRQUN6QixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQTtRQUN6QixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUVyQyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQTtR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