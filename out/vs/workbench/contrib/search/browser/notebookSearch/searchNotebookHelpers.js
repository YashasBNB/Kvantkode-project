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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9ub3RlYm9va1NlYXJjaC9zZWFyY2hOb3RlYm9va0hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUdOLGVBQWUsR0FDZixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBR04scUNBQXFDLEVBQ3JDLGFBQWEsR0FDYixNQUFNLHVDQUF1QyxDQUFBO0FBTzlDLE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxLQUF5QjtJQUNwRSxJQUFJLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQTtJQUNyQixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sR0FBRyxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3hDLENBQUM7QUFDRixDQUFDO0FBU0QsTUFBTSxVQUFVLDZCQUE2QixDQUFDLE1BQVc7SUFDeEQsT0FBTyxDQUNOLGFBQWEsSUFBSSxNQUFNO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLFlBQVksS0FBSztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUN2RCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxNQUFXO0lBQ3hELE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQTtBQUN4QixDQUFDO0FBRUQsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCxjQUEyQixFQUMzQixJQUFvQjtJQUVwQixPQUFPLHFDQUFxQyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDOUUsQ0FBQztBQUVELE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsY0FBc0M7SUFFdEMsT0FBTyxjQUFjO1NBQ25CLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2pCLFFBQVEsQ0FBQyxpQkFBaUI7UUFDekIsQ0FBQyxDQUFDLElBQUksZUFBZSxDQUNuQixRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUMvQixJQUFJLEtBQUssQ0FDUixDQUFDLEVBQ0QsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQ3RDLENBQUMsRUFDRCxRQUFRLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsRUFDRCxTQUFTLEVBQ1QsUUFBUSxDQUFDLEtBQUssQ0FDZDtRQUNGLENBQUMsQ0FBQyxTQUFTLENBQ1o7U0FDQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDM0MsQ0FBQyJ9