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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0Jhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUl6QyxPQUFPLEVBQWtDLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25HLE9BQU8sRUFDTixpQkFBaUIsRUFHakIscUJBQXFCLEVBQ3JCLHVCQUF1QixHQUN2QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUVuRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFFekQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFlBQTJCO0lBQzlELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM5QyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNsRixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUNwQyxLQUFhLEVBQ2IsZUFBK0M7SUFFL0MsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUE7QUFDdkQsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsWUFBMkI7SUFDeEQsT0FBTyxZQUFZLENBQUMsbUJBQW1CLENBQUMsT0FB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