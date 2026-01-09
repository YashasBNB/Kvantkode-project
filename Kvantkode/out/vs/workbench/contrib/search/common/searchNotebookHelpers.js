/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextSearchMatch, } from '../../../services/search/common/search.js';
import { Range } from '../../../../editor/common/core/range.js';
export function isINotebookFileMatchNoModel(object) {
    return 'cellResults' in object;
}
export const rawCellPrefix = 'rawCell#';
export function genericCellMatchesToTextSearchMatches(contentMatches, buffer) {
    let previousEndLine = -1;
    const contextGroupings = [];
    let currentContextGrouping = [];
    contentMatches.forEach((match) => {
        if (match.range.startLineNumber !== previousEndLine) {
            if (currentContextGrouping.length > 0) {
                contextGroupings.push([...currentContextGrouping]);
                currentContextGrouping = [];
            }
        }
        currentContextGrouping.push(match);
        previousEndLine = match.range.endLineNumber;
    });
    if (currentContextGrouping.length > 0) {
        contextGroupings.push([...currentContextGrouping]);
    }
    const textSearchResults = contextGroupings.map((grouping) => {
        const lineTexts = [];
        const firstLine = grouping[0].range.startLineNumber;
        const lastLine = grouping[grouping.length - 1].range.endLineNumber;
        for (let i = firstLine; i <= lastLine; i++) {
            lineTexts.push(buffer.getLineContent(i));
        }
        return new TextSearchMatch(lineTexts.join('\n') + '\n', grouping.map((m) => new Range(m.range.startLineNumber - 1, m.range.startColumn - 1, m.range.endLineNumber - 1, m.range.endColumn - 1)));
    });
    return textSearchResults;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvY29tbW9uL3NlYXJjaE5vdGVib29rSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBZS9ELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsTUFBa0I7SUFFbEIsT0FBTyxhQUFhLElBQUksTUFBTSxDQUFBO0FBQy9CLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFBO0FBRXZDLE1BQU0sVUFBVSxxQ0FBcUMsQ0FDcEQsY0FBMkIsRUFDM0IsTUFBMkI7SUFFM0IsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDeEIsTUFBTSxnQkFBZ0IsR0FBa0IsRUFBRSxDQUFBO0lBQzFDLElBQUksc0JBQXNCLEdBQWdCLEVBQUUsQ0FBQTtJQUU1QyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDaEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztZQUNyRCxJQUFJLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELHNCQUFzQixHQUFHLEVBQUUsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQztRQUVELHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxlQUFlLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUMzRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUE7UUFDOUIsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7UUFDbkQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQTtRQUNsRSxLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUNELE9BQU8sSUFBSSxlQUFlLENBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUMzQixRQUFRLENBQUMsR0FBRyxDQUNYLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLEtBQUssQ0FDUixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQ3JCLENBQ0YsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLGlCQUFpQixDQUFBO0FBQ3pCLENBQUMifQ==