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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQ29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQ29tcGFyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLHVCQUF1QixFQUN2QixpQkFBaUIsR0FFakIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RSxJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQTtBQUMzQixJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQTtBQUUzQjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLFFBQXlCLEVBQ3pCLFFBQXlCLEVBQ3pCLG1EQUFvRDtJQUVwRCxJQUFJLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDMUUsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRUQsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDVixDQUFDO0lBRUQsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVFLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDN0IsVUFBVSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM3QixJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM1RSxPQUFPLFFBQVEsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtRQUNyQyxDQUFDO1FBQ0QsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQjtnQkFDQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDM0M7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzNDO2dCQUNDLE9BQU8scUJBQXFCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQy9EO2dCQUNDLE9BQU8sZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzFELHlCQUF5QjtZQUN6QjtnQkFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDOUMsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztnQkFDRCxPQUFPLENBQ04sWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO29CQUNoRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQ2xELENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUN4RSxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CO2dCQUNDLE9BQU8sUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQztnQkFDQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDM0M7Z0JBQ0MsT0FBTyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDL0Q7Z0JBQ0MsT0FBTyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDMUQsOENBQTZCLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFBO2dCQUNuQyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFBO2dCQUNuQyxJQUFJLFNBQVMsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxTQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUE7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1lBQ0QseUJBQXlCO1lBQ3pCO2dCQUNDLE9BQU8sQ0FDTixZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ2hFLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FDbEQsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ2xFLE9BQU8sa0JBQWtCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDaEUsT0FBTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLE1BQXdCLEVBQUUsTUFBd0I7SUFDN0UsSUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMzQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUUsT0FBTyxNQUFNLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7UUFDakQsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuRixPQUFPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDdEUsQ0FBQzthQUFNLENBQUM7WUFDUCx5REFBeUQ7WUFDekQsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ1YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO1NBQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoRCxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ1YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FDN0IsUUFBeUIsRUFDekIsUUFBeUIsRUFDekIsbURBQW9EO0lBRXBELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQy9DLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRS9DLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQy9CLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDekIsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsT0FBTyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFDRCxDQUFDLEVBQUUsQ0FBQTtRQUNILENBQUMsRUFBRSxDQUFBO0lBQ0osQ0FBQztJQUNELE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDMUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUUxQixJQUFJLFVBQVUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztTQUFNLElBQUksQ0FBQyxVQUFVLElBQUksVUFBVSxFQUFFLENBQUM7UUFDdEMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNWLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQTtBQUNULENBQUMifQ==