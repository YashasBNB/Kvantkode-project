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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vc2VhcmNoSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUVOLGVBQWUsR0FJZixNQUFNLGFBQWEsQ0FBQTtBQUVwQixTQUFTLDZCQUE2QixDQUNyQyxPQUFvQixFQUNwQixLQUFpQixFQUNqQixjQUEwQztJQUUxQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQTtJQUNsRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFBO0lBRWhFLE1BQU0sU0FBUyxHQUFhLEVBQUUsQ0FBQTtJQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVELE9BQU8sSUFBSSxlQUFlLENBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUMzQixPQUFPLENBQUMsR0FBRyxDQUNWLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLEtBQUssQ0FDUixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxH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