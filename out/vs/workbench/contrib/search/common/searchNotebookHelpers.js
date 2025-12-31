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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9zZWFyY2hOb3RlYm9va0hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQWUvRCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLE1BQWtCO0lBRWxCLE9BQU8sYUFBYSxJQUFJLE1BQU0sQ0FBQTtBQUMvQixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQTtBQUV2QyxNQUFNLFVBQVUscUNBQXFDLENBQ3BELGNBQTJCLEVBQzNCLE1BQTJCO0lBRTNCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3hCLE1BQU0sZ0JBQWdCLEdBQWtCLEVBQUUsQ0FBQTtJQUMxQyxJQUFJLHNCQUFzQixHQUFnQixFQUFFLENBQUE7SUFFNUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ2hDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDckQsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxzQkFBc0IsR0FBRyxFQUFFLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFFRCxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsZUFBZSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFBO0lBQzVDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdkMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDM0QsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFBO1FBQzlCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFBO1FBQ25ELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7UUFDbEUsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFDRCxPQUFPLElBQUksZUFBZSxDQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFDM0IsUUFBUSxDQUFDLEdBQUcsQ0FDWCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsSUFBSSxLQUFLLENBQ1IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUNyQixDQUNGLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxpQkFBaUIsQ0FBQTtBQUN6QixDQUFDIn0=