/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var CommentContextKeys;
(function (CommentContextKeys) {
    /**
     * A context key that is set when the active cursor is in a commenting range.
     */
    CommentContextKeys.activeCursorHasCommentingRange = new RawContextKey('activeCursorHasCommentingRange', false, {
        description: nls.localize('hasCommentingRange', 'Whether the position at the active cursor has a commenting range'),
        type: 'boolean',
    });
    /**
     * A context key that is set when the active cursor is in the range of an existing comment.
     */
    CommentContextKeys.activeCursorHasComment = new RawContextKey('activeCursorHasComment', false, {
        description: nls.localize('hasComment', 'Whether the position at the active cursor has a comment'),
        type: 'boolean',
    });
    /**
     * A context key that is set when the active editor has commenting ranges.
     */
    CommentContextKeys.activeEditorHasCommentingRange = new RawContextKey('activeEditorHasCommentingRange', false, {
        description: nls.localize('editorHasCommentingRange', 'Whether the active editor has a commenting range'),
        type: 'boolean',
    });
    /**
     * A context key that is set when the workspace has either comments or commenting ranges.
     */
    CommentContextKeys.WorkspaceHasCommenting = new RawContextKey('workspaceHasCommenting', false, {
        description: nls.localize('hasCommentingProvider', 'Whether the open workspace has either comments or commenting ranges.'),
        type: 'boolean',
    });
    /**
     * A context key that is set when the comment thread has no comments.
     */
    CommentContextKeys.commentThreadIsEmpty = new RawContextKey('commentThreadIsEmpty', false, {
        type: 'boolean',
        description: nls.localize('commentThreadIsEmpty', 'Set when the comment thread has no comments'),
    });
    /**
     * A context key that is set when the comment has no input.
     */
    CommentContextKeys.commentIsEmpty = new RawContextKey('commentIsEmpty', false, {
        type: 'boolean',
        description: nls.localize('commentIsEmpty', 'Set when the comment has no input'),
    });
    /**
     * The context value of the comment.
     */
    CommentContextKeys.commentContext = new RawContextKey('comment', undefined, {
        type: 'string',
        description: nls.localize('comment', 'The context value of the comment'),
    });
    /**
     * The context value of the comment thread.
     */
    CommentContextKeys.commentThreadContext = new RawContextKey('commentThread', undefined, {
        type: 'string',
        description: nls.localize('commentThread', 'The context value of the comment thread'),
    });
    /**
     * The comment controller id associated with a comment thread.
     */
    CommentContextKeys.commentControllerContext = new RawContextKey('commentController', undefined, {
        type: 'string',
        description: nls.localize('commentController', 'The comment controller id associated with a comment thread'),
    });
    /**
     * The comment widget is focused.
     */
    CommentContextKeys.commentFocused = new RawContextKey('commentFocused', false, {
        type: 'boolean',
        description: nls.localize('commentFocused', 'Set when the comment is focused'),
    });
    /**
     * A context key that is set when commenting is enabled.
     */
    CommentContextKeys.commentingEnabled = new RawContextKey('commentingEnabled', true, {
        description: nls.localize('commentingEnabled', 'Whether commenting functionality is enabled'),
        type: 'boolean',
    });
})(CommentContextKeys || (CommentContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvY29tbW9uL2NvbW1lbnRDb250ZXh0S2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVwRixNQUFNLEtBQVcsa0JBQWtCLENBMEhsQztBQTFIRCxXQUFpQixrQkFBa0I7SUFDbEM7O09BRUc7SUFDVSxpREFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsZ0NBQWdDLEVBQ2hDLEtBQUssRUFDTDtRQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixvQkFBb0IsRUFDcEIsa0VBQWtFLENBQ2xFO1FBQ0QsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUNELENBQUE7SUFFRDs7T0FFRztJQUNVLHlDQUFzQixHQUFHLElBQUksYUFBYSxDQUN0RCx3QkFBd0IsRUFDeEIsS0FBSyxFQUNMO1FBQ0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLFlBQVksRUFDWix5REFBeUQsQ0FDekQ7UUFDRCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQ0QsQ0FBQTtJQUVEOztPQUVHO0lBQ1UsaURBQThCLEdBQUcsSUFBSSxhQUFhLENBQzlELGdDQUFnQyxFQUNoQyxLQUFLLEVBQ0w7UUFDQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMEJBQTBCLEVBQzFCLGtEQUFrRCxDQUNsRDtRQUNELElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FDRCxDQUFBO0lBRUQ7O09BRUc7SUFDVSx5Q0FBc0IsR0FBRyxJQUFJLGFBQWEsQ0FDdEQsd0JBQXdCLEVBQ3hCLEtBQUssRUFDTDtRQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1QkFBdUIsRUFDdkIsc0VBQXNFLENBQ3RFO1FBQ0QsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUNELENBQUE7SUFFRDs7T0FFRztJQUNVLHVDQUFvQixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLEtBQUssRUFBRTtRQUM3RixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixzQkFBc0IsRUFDdEIsNkNBQTZDLENBQzdDO0tBQ0QsQ0FBQyxDQUFBO0lBQ0Y7O09BRUc7SUFDVSxpQ0FBYyxHQUFHLElBQUksYUFBYSxDQUFVLGdCQUFnQixFQUFFLEtBQUssRUFBRTtRQUNqRixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLG1DQUFtQyxDQUFDO0tBQ2hGLENBQUMsQ0FBQTtJQUNGOztPQUVHO0lBQ1UsaUNBQWMsR0FBRyxJQUFJLGFBQWEsQ0FBUyxTQUFTLEVBQUUsU0FBUyxFQUFFO1FBQzdFLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGtDQUFrQyxDQUFDO0tBQ3hFLENBQUMsQ0FBQTtJQUNGOztPQUVHO0lBQ1UsdUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVMsZUFBZSxFQUFFLFNBQVMsRUFBRTtRQUN6RixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSx5Q0FBeUMsQ0FBQztLQUNyRixDQUFDLENBQUE7SUFDRjs7T0FFRztJQUNVLDJDQUF3QixHQUFHLElBQUksYUFBYSxDQUN4RCxtQkFBbUIsRUFDbkIsU0FBUyxFQUNUO1FBQ0MsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsbUJBQW1CLEVBQ25CLDREQUE0RCxDQUM1RDtLQUNELENBQ0QsQ0FBQTtJQUVEOztPQUVHO0lBQ1UsaUNBQWMsR0FBRyxJQUFJLGFBQWEsQ0FBVSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUU7UUFDakYsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxpQ0FBaUMsQ0FBQztLQUM5RSxDQUFDLENBQUE7SUFFRjs7T0FFRztJQUNVLG9DQUFpQixHQUFHLElBQUksYUFBYSxDQUFVLG1CQUFtQixFQUFFLElBQUksRUFBRTtRQUN0RixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw2Q0FBNkMsQ0FBQztRQUM3RixJQUFJLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQTtBQUNILENBQUMsRUExSGdCLGtCQUFrQixLQUFsQixrQkFBa0IsUUEwSGxDIn0=