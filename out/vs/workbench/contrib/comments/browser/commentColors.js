/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as languages from '../../../../editor/common/languages.js';
import { peekViewTitleBackground } from '../../../../editor/contrib/peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { contrastBorder, disabledForeground, listFocusOutline, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
const resolvedCommentViewIcon = registerColor('commentsView.resolvedIcon', {
    dark: disabledForeground,
    light: disabledForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('resolvedCommentIcon', 'Icon color for resolved comments.'));
const unresolvedCommentViewIcon = registerColor('commentsView.unresolvedIcon', {
    dark: listFocusOutline,
    light: listFocusOutline,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('unresolvedCommentIcon', 'Icon color for unresolved comments.'));
registerColor('editorCommentsWidget.replyInputBackground', peekViewTitleBackground, nls.localize('commentReplyInputBackground', 'Background color for comment reply input box.'));
const resolvedCommentBorder = registerColor('editorCommentsWidget.resolvedBorder', {
    dark: resolvedCommentViewIcon,
    light: resolvedCommentViewIcon,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('resolvedCommentBorder', 'Color of borders and arrow for resolved comments.'));
const unresolvedCommentBorder = registerColor('editorCommentsWidget.unresolvedBorder', {
    dark: unresolvedCommentViewIcon,
    light: unresolvedCommentViewIcon,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('unresolvedCommentBorder', 'Color of borders and arrow for unresolved comments.'));
export const commentThreadRangeBackground = registerColor('editorCommentsWidget.rangeBackground', transparent(unresolvedCommentBorder, 0.1), nls.localize('commentThreadRangeBackground', 'Color of background for comment ranges.'));
export const commentThreadRangeActiveBackground = registerColor('editorCommentsWidget.rangeActiveBackground', transparent(unresolvedCommentBorder, 0.1), nls.localize('commentThreadActiveRangeBackground', 'Color of background for currently selected or hovered comment range.'));
const commentThreadStateBorderColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentBorder],
    [languages.CommentThreadState.Resolved, resolvedCommentBorder],
]);
const commentThreadStateIconColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentViewIcon],
    [languages.CommentThreadState.Resolved, resolvedCommentViewIcon],
]);
export const commentThreadStateColorVar = '--comment-thread-state-color';
export const commentViewThreadStateColorVar = '--comment-view-thread-state-color';
export const commentThreadStateBackgroundColorVar = '--comment-thread-state-background-color';
function getCommentThreadStateColor(state, theme, map) {
    const colorId = state !== undefined ? map.get(state) : undefined;
    return colorId !== undefined ? theme.getColor(colorId) : undefined;
}
export function getCommentThreadStateBorderColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateBorderColors);
}
export function getCommentThreadStateIconColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateIconColors);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudENvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ2pHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxvREFBb0QsQ0FBQTtBQUczRCxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FDNUMsMkJBQTJCLEVBQzNCO0lBQ0MsSUFBSSxFQUFFLGtCQUFrQjtJQUN4QixLQUFLLEVBQUUsa0JBQWtCO0lBQ3pCLE1BQU0sRUFBRSxjQUFjO0lBQ3RCLE9BQU8sRUFBRSxjQUFjO0NBQ3ZCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQ0FBbUMsQ0FBQyxDQUN4RSxDQUFBO0FBQ0QsTUFBTSx5QkFBeUIsR0FBRyxhQUFhLENBQzlDLDZCQUE2QixFQUM3QjtJQUNDLElBQUksRUFBRSxnQkFBZ0I7SUFDdEIsS0FBSyxFQUFFLGdCQUFnQjtJQUN2QixNQUFNLEVBQUUsY0FBYztJQUN0QixPQUFPLEVBQUUsY0FBYztDQUN2QixFQUNELEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUscUNBQXFDLENBQUMsQ0FDNUUsQ0FBQTtBQUVELGFBQWEsQ0FDWiwyQ0FBMkMsRUFDM0MsdUJBQXVCLEVBQ3ZCLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsK0NBQStDLENBQUMs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