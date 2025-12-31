/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../base/browser/dom.js';
import * as nls from '../../../../nls.js';
import { VIEW_ID } from '../../../services/search/common/search.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, } from './searchTreeModel/searchTreeCommon.js';
import { searchComparer } from './searchCompare.js';
export const category = nls.localize2('search', 'Search');
export function isSearchViewFocused(viewsService) {
    const searchView = getSearchView(viewsService);
    return !!(searchView && DOM.isAncestorOfActiveElement(searchView.getContainer()));
}
export function appendKeyBindingLabel(label, inputKeyBinding) {
    return doAppendKeyBindingLabel(label, inputKeyBinding);
}
export function getSearchView(viewsService) {
    return viewsService.getActiveViewWithId(VIEW_ID);
}
export function getElementsToOperateOn(viewer, currElement, sortConfig) {
    let elements = viewer
        .getSelection()
        .filter((x) => x !== null)
        .sort((a, b) => searchComparer(a, b, sortConfig.sortOrder));
    // if selection doesn't include multiple elements, just return current focus element.
    if (currElement && !(elements.length > 1 && elements.includes(currElement))) {
        elements = [currElement];
    }
    return elements;
}
/**
 * @param elements elements that are going to be removed
 * @param focusElement element that is focused
 * @returns whether we need to re-focus on a remove
 */
export function shouldRefocus(elements, focusElement) {
    if (!focusElement) {
        return false;
    }
    return (!focusElement || elements.includes(focusElement) || hasDownstreamMatch(elements, focusElement));
}
function hasDownstreamMatch(elements, focusElement) {
    for (const elem of elements) {
        if ((isSearchTreeFileMatch(elem) &&
            isSearchTreeMatch(focusElement) &&
            elem.matches().includes(focusElement)) ||
            (isSearchTreeFolderMatch(elem) &&
                ((isSearchTreeFileMatch(focusElement) &&
                    elem.getDownstreamFileMatch(focusElement.resource)) ||
                    (isSearchTreeMatch(focusElement) &&
                        elem.getDownstreamFileMatch(focusElement.parent().resource))))) {
            return true;
        }
    }
    return false;
}
export function openSearchView(viewsService, focus) {
    return viewsService.openView(VIEW_ID, focus).then((view) => view ?? undefined);
}
function doAppendKeyBindingLabel(label, keyBinding) {
    return keyBinding ? label + ' (' + keyBinding.getLabel() + ')' : label;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0Jhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFJekMsT0FBTyxFQUFrQyxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRyxPQUFPLEVBQ04saUJBQWlCLEVBR2pCLHFCQUFxQixFQUNyQix1QkFBdUIsR0FDdkIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFbkQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBRXpELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxZQUEyQjtJQUM5RCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDOUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbEYsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsS0FBYSxFQUNiLGVBQStDO0lBRS9DLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFlBQTJCO0lBQ3hELE9BQU8sWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBZSxDQUFBO0FBQy9ELENBQUM7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