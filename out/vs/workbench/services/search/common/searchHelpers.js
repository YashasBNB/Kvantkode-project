/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../editor/common/core/range.js';
import { TextSearchMatch, } from './search.js';
function editorMatchToTextSearchResult(matches, model, previewOptions) {
    const firstLine = matches[0].range.startLineNumber;
    const lastLine = matches[matches.length - 1].range.endLineNumber;
    const lineTexts = [];
    for (let i = firstLine; i <= lastLine; i++) {
        lineTexts.push(model.getLineContent(i));
    }
    return new TextSearchMatch(lineTexts.join('\n') + '\n', matches.map((m) => new Range(m.range.startLineNumber - 1, m.range.startColumn - 1, m.range.endLineNumber - 1, m.range.endColumn - 1)), previewOptions);
}
/**
 * Combine a set of FindMatches into a set of TextSearchResults. They should be grouped by matches that start on the same line that the previous match ends on.
 */
export function editorMatchesToTextSearchResults(matches, model, previewOptions) {
    let previousEndLine = -1;
    const groupedMatches = [];
    let currentMatches = [];
    matches.forEach((match) => {
        if (match.range.startLineNumber !== previousEndLine) {
            currentMatches = [];
            groupedMatches.push(currentMatches);
        }
        currentMatches.push(match);
        previousEndLine = match.range.endLineNumber;
    });
    return groupedMatches.map((sameLineMatches) => {
        return editorMatchToTextSearchResult(sameLineMatches, model, previewOptions);
    });
}
export function getTextSearchMatchWithModelContext(matches, model, query) {
    const results = [];
    let prevLine = -1;
    for (let i = 0; i < matches.length; i++) {
        const { start: matchStartLine, end: matchEndLine } = getMatchStartEnd(matches[i]);
        if (typeof query.surroundingContext === 'number' && query.surroundingContext > 0) {
            const beforeContextStartLine = Math.max(prevLine + 1, matchStartLine - query.surroundingContext);
            for (let b = beforeContextStartLine; b < matchStartLine; b++) {
                results.push({
                    text: model.getLineContent(b + 1),
                    lineNumber: b + 1,
                });
            }
        }
        results.push(matches[i]);
        const nextMatch = matches[i + 1];
        const nextMatchStartLine = nextMatch ? getMatchStartEnd(nextMatch).start : Number.MAX_VALUE;
        if (typeof query.surroundingContext === 'number' && query.surroundingContext > 0) {
            const afterContextToLine = Math.min(nextMatchStartLine - 1, matchEndLine + query.surroundingContext, model.getLineCount() - 1);
            for (let a = matchEndLine + 1; a <= afterContextToLine; a++) {
                results.push({
                    text: model.getLineContent(a + 1),
                    lineNumber: a + 1,
                });
            }
        }
        prevLine = matchEndLine;
    }
    return results;
}
function getMatchStartEnd(match) {
    const matchRanges = match.rangeLocations.map((e) => e.source);
    const matchStartLine = matchRanges[0].startLineNumber;
    const matchEndLine = matchRanges[matchRanges.length - 1].endLineNumber;
    return {
        start: matchStartLine,
        end: matchEndLine,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3NlYXJjaEhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFFTixlQUFlLEdBSWYsTUFBTSxhQUFhLENBQUE7QUFFcEIsU0FBUyw2QkFBNkIsQ0FDckMsT0FBb0IsRUFDcEIsS0FBaUIsRUFDakIsY0FBMEM7SUFFMUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7SUFDbEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQTtJQUVoRSxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUE7SUFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxPQUFPLElBQUksZUFBZSxDQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FDVixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsSUFBSSxLQUFLLENBQ1IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQ3ZCLENBQUMsQ0FB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