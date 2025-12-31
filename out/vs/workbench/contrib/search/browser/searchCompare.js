/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
import { compareFileExtensions, compareFileNames, comparePaths, } from '../../../../base/common/comparers.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createParentList, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeMatch, } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
let elemAIndex = -1;
let elemBIndex = -1;
/**
 * Compares instances of the same match type. Different match types should not be siblings
 * and their sort order is undefined.
 */
export function searchMatchComparer(elementA, elementB, sortOrder = "default" /* SearchSortOrder.Default */) {
    if (isSearchTreeFileMatch(elementA) && isSearchTreeFolderMatch(elementB)) {
        return 1;
    }
    if (isSearchTreeFileMatch(elementB) && isSearchTreeFolderMatch(elementA)) {
        return -1;
    }
    if (isSearchTreeFolderMatch(elementA) && isSearchTreeFolderMatch(elementB)) {
        elemAIndex = elementA.index();
        elemBIndex = elementB.index();
        if (elemAIndex !== -1 && elemBIndex !== -1) {
            return elemAIndex - elemBIndex;
        }
        if (isSearchTreeAIFileMatch(elementA) && isSearchTreeAIFileMatch(elementB)) {
            return elementA.rank - elementB.rank;
        }
        switch (sortOrder) {
            case "countDescending" /* SearchSortOrder.CountDescending */:
                return elementB.count() - elementA.count();
            case "countAscending" /* SearchSortOrder.CountAscending */:
                return elementA.count() - elementB.count();
            case "type" /* SearchSortOrder.Type */:
                return compareFileExtensions(elementA.name(), elementB.name());
            case "fileNames" /* SearchSortOrder.FileNames */:
                return compareFileNames(elementA.name(), elementB.name());
            // Fall through otherwise
            default:
                if (!elementA.resource || !elementB.resource) {
                    return 0;
                }
                return (comparePaths(elementA.resource.fsPath, elementB.resource.fsPath) ||
                    compareFileNames(elementA.name(), elementB.name()));
        }
    }
    if (isSearchTreeFileMatch(elementA) && isSearchTreeFileMatch(elementB)) {
        switch (sortOrder) {
            case "countDescending" /* SearchSortOrder.CountDescending */:
                return elementB.count() - elementA.count();
            case "countAscending" /* SearchSortOrder.CountAscending */:
                return elementA.count() - elementB.count();
            case "type" /* SearchSortOrder.Type */:
                return compareFileExtensions(elementA.name(), elementB.name());
            case "fileNames" /* SearchSortOrder.FileNames */:
                return compareFileNames(elementA.name(), elementB.name());
            case "modified" /* SearchSortOrder.Modified */: {
                const fileStatA = elementA.fileStat;
                const fileStatB = elementB.fileStat;
                if (fileStatA && fileStatB) {
                    return fileStatB.mtime - fileStatA.mtime;
                }
            }
            // Fall through otherwise
            default:
                return (comparePaths(elementA.resource.fsPath, elementB.resource.fsPath) ||
                    compareFileNames(elementA.name(), elementB.name()));
        }
    }
    if (isIMatchInNotebook(elementA) && isIMatchInNotebook(elementB)) {
        return compareNotebookPos(elementA, elementB);
    }
    if (isSearchTreeMatch(elementA) && isSearchTreeMatch(elementB)) {
        return Range.compareRangesUsingStarts(elementA.range(), elementB.range());
    }
    return 0;
}
function compareNotebookPos(match1, match2) {
    if (match1.cellIndex === match2.cellIndex) {
        if (match1.webviewIndex !== undefined && match2.webviewIndex !== undefined) {
            return match1.webviewIndex - match2.webviewIndex;
        }
        else if (match1.webviewIndex === undefined && match2.webviewIndex === undefined) {
            return Range.compareRangesUsingStarts(match1.range(), match2.range());
        }
        else {
            // webview matches should always be after content matches
            if (match1.webviewIndex !== undefined) {
                return 1;
            }
            else {
                return -1;
            }
        }
    }
    else if (match1.cellIndex < match2.cellIndex) {
        return -1;
    }
    else {
        return 1;
    }
}
export function searchComparer(elementA, elementB, sortOrder = "default" /* SearchSortOrder.Default */) {
    const elemAParents = createParentList(elementA);
    const elemBParents = createParentList(elementB);
    let i = elemAParents.length - 1;
    let j = elemBParents.length - 1;
    while (i >= 0 && j >= 0) {
        if (elemAParents[i].id() !== elemBParents[j].id()) {
            return searchMatchComparer(elemAParents[i], elemBParents[j], sortOrder);
        }
        i--;
        j--;
    }
    const elemAAtEnd = i === 0;
    const elemBAtEnd = j === 0;
    if (elemAAtEnd && !elemBAtEnd) {
        return 1;
    }
    else if (!elemAAtEnd && elemBAtEnd) {
        return -1;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQ29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaENvbXBhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFvQixrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIsaUJBQWlCLEdBRWpCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekUsSUFBSSxVQUFVLEdBQVcsQ0FBQyxDQUFDLENBQUE7QUFDM0IsSUFBSSxVQUFVLEdBQVcsQ0FBQyxDQUFDLENBQUE7QUFFM0I7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxRQUF5QixFQUN6QixRQUF5QixFQUN6QixtREFBb0Q7SUFFcEQsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVELElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUMxRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztJQUVELElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFD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