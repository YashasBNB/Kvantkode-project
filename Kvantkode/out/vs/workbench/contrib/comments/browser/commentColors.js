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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50Q29sb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDakcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLG9EQUFvRCxDQUFBO0FBRzNELE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUM1QywyQkFBMkIsRUFDM0I7SUFDQyxJQUFJLEVBQUUsa0JBQWtCO0lBQ3hCLEtBQUssRUFBRSxrQkFBa0I7SUFDekIsTUFBTSxFQUFFLGNBQWM7SUFDdEIsT0FBTyxFQUFFLGNBQWM7Q0FDdkIsRUFDRCxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG1DQUFtQyxDQUFDLENBQ3hFLENBQUE7QUFDRCxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDOUMsNkJBQTZCLEVBQzdCO0lBQ0MsSUFBSSxFQUFFLGdCQUFnQjtJQUN0QixLQUFLLEVBQUUsZ0JBQWdCO0lBQ3ZCLE1BQU0sRUFBRSxjQUFjO0lBQ3RCLE9BQU8sRUFBRSxjQUFjO0NBQ3ZCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxxQ0FBcUMsQ0FBQyxDQUM1RSxDQUFBO0FBRUQsYUFBYSxDQUNaLDJDQUEyQyxFQUMzQyx1QkFBdUIsRUFDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwrQ0FBK0Ms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