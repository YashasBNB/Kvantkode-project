/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextSearchMatch, } from '../../../../services/search/common/search.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { genericCellMatchesToTextSearchMatches, rawCellPrefix, } from '../../common/searchNotebookHelpers.js';
export function getIDFromINotebookCellMatch(match) {
    if (isINotebookCellMatchWithModel(match)) {
        return match.cell.id;
    }
    else {
        return `${rawCellPrefix}${match.index}`;
    }
}
export function isINotebookFileMatchWithModel(object) {
    return ('cellResults' in object &&
        object.cellResults instanceof Array &&
        object.cellResults.every(isINotebookCellMatchWithModel));
}
export function isINotebookCellMatchWithModel(object) {
    return 'cell' in object;
}
export function contentMatchesToTextSearchMatches(contentMatches, cell) {
    return genericCellMatchesToTextSearchMatches(contentMatches, cell.textBuffer);
}
export function webviewMatchesToTextSearchMatches(webviewMatches) {
    return webviewMatches
        .map((rawMatch) => rawMatch.searchPreviewInfo
        ? new TextSearchMatch(rawMatch.searchPreviewInfo.line, new Range(0, rawMatch.searchPreviewInfo.range.start, 0, rawMatch.searchPreviewInfo.range.end), undefined, rawMatch.index)
        : undefined)
        .filter((e) => !!e);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvbm90ZWJvb2tTZWFyY2gvc2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFHTixlQUFlLEdBQ2YsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUdOLHFDQUFxQyxFQUNyQyxhQUFhLEdBQ2IsTUFBTSx1Q0FBdUMsQ0FBQTtBQU85QyxNQUFNLFVBQVUsMkJBQTJCLENBQUMsS0FBeUI7SUFDcEUsSUFBSSw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDckIsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEdBQUcsYUFBYSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0FBQ0YsQ0FBQztBQVNELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxNQUFXO0lBQ3hELE9BQU8sQ0FDTixhQUFhLElBQUksTUFBTTtRQUN2QixNQUFNLENBQUMsV0FBVyxZQUFZLEtBQUs7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FDdkQsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsTUFBVztJQUN4RCxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUE7QUFDeEIsQ0FBQztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsY0FBMkIsRUFDM0IsSUFBb0I7SUFFcEIsT0FBTyxxQ0FBcUMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQzlFLENBQUM7QUFFRCxNQUFNLFVBQVUsaUNBQWlDLENBQ2hELGNBQXNDO0lBRXRDLE9BQU8sY0FBYztTQUNuQixHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNqQixRQUFRLENBQUMsaUJBQWlCO1FBQ3pCLENBQUMsQ0FBQyxJQUFJLGVBQWUsQ0FDbkIsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFDL0IsSUFBSSxLQUFLLENBQ1IsQ0FBQyxFQUNELFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUN0QyxDQUFDLEVBQ0QsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQ3BDLEVBQ0QsU0FBUyxFQUNULFFBQVEsQ0FBQyxLQUFLLENBQ2Q7UUFDRixDQUFDLENBQUMsU0FBUyxDQUNaO1NBQ0EsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQzNDLENBQUMifQ==