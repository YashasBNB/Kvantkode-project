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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3dvcmREaXN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSWhGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RixNQUFNLE9BQWdCLFlBQVk7YUFDakIsU0FBSSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsWUFBWTtRQUNyRCxRQUFRO1lBQ1AsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO0tBQ0QsQ0FBQyxFQUFFLENBQUE7SUFFSixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUE2QixFQUFFLE1BQW1CO1FBQ3JFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxnQ0FBc0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMzRCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUE7UUFDekIsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUE7UUFDekIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFFckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUE7UUFDekIs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