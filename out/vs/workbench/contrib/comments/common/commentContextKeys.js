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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9jb21tb24vY29tbWVudENvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE1BQU0sS0FBVyxrQkFBa0IsQ0EwSGxDO0FBMUhELFdBQWlCLGtCQUFrQjtJQUNsQzs7T0FFRztJQUNVLGlEQUE4QixHQUFHLElBQUksYUFBYSxDQUM5RCxnQ0FBZ0MsRUFDaEMsS0FBSyxFQUNMO1FBQ0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG9CQUFvQixFQUNwQixrRUFBa0UsQ0FDbEU7UUFDRCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQ0QsQ0FBQTtJQUVEOztPQUVHO0lBQ1UseUNBQXNCLEdBQUcsSUFBSSxhQUFhLENBQ3RELHdCQUF3QixFQUN4QixLQUFLLEVBQ0w7UUFDQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsWUFBWSxFQUNaLHlEQUF5RCxDQUN6RDtRQUNELElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FDRCxDQUFBO0lBRUQ7O09BRUc7SUFDVSxpREFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsZ0NBQWdDLEVBQ2hDLEtBQUssRUFDTDtRQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwwQkFBMEIsRUFDMUIsa0RBQWtELENBQ2xEO1FBQ0QsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUNELENBQUE7SUFFRDs7T0FFRztJQUNVLHlDQUFzQixHQUFHLElBQUksYUFBYSxDQUN0RCx3QkFBd0IsRUFDeEIsS0FBSyxFQUNMO1FBQ0MsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHVCQUF1QixFQUN2QixzRUFBc0UsQ0FDdEU7UUFDRCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQ0QsQ0FBQTtJQUVEOztPQUVHO0lBQ1UsdUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFO1FBQzdGLElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHNCQUFzQixFQUN0Qiw2Q0FBNkMsQ0FDN0M7S0FDRCxDQUFDLENBQUE7SUFDRjs7T0FFRztJQUNVLGlDQUFjLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFO1FBQ2pGLElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsbUNBQW1DLENBQUM7S0FDaEYsQ0FBQyxDQUFBO0lBQ0Y7O09BRUc7SUFDVSxpQ0FBYyxHQUFHLElBQUksYUFBYSxDQUFTLFNBQVMsRUFBRSxTQUFTLEVBQUU7UUFDN0UsSUFBSSxFQUFFLFFBQVE7UUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsa0NBQWtDLENBQUM7S0FDeEUsQ0FBQyxDQUFBO0lBQ0Y7O09BRUc7SUFDVSx1Q0FBb0IsR0FBRyxJQUFJLGFBQWEsQ0FBUyxlQUFlLEVBQUUsU0FBUyxFQUFFO1FBQ3pGLElBQUksRUFBRSxRQUFRO1FBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHlDQUF5QyxDQUFDO0tBQ3JGLENBQUMsQ0FBQTtJQUNGOztPQUVHO0lBQ1UsMkNBQXdCLEdBQUcsSUFBSSxhQUFhLENBQ3hELG1CQUFtQixFQUNuQixTQUFTLEVBQ1Q7UUFDQyxJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixtQkFBbUIsRUFDbkIsNERBQTRELENBQzVEO0tBQ0QsQ0FDRCxDQUFBO0lBRUQ7O09BRUc7SUFDVSxpQ0FBYyxHQUFHLElBQUksYUFBYSxDQUFVLGdCQUFnQixFQUFFLEtBQUssRUFBRTtRQUNqRixJQUFJLEVBQUUsU0FBUztRQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlDQUFpQyxDQUFDO0tBQzlFLENBQUMsQ0FBQTtJQUVGOztPQUVHO0lBQ1Usb0NBQWlCLEdBQUcsSUFBSSxhQUFhLENBQVUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFO1FBQ3RGLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDZDQUE2QyxDQUFDO1FBQzdGLElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxFQTFIZ0Isa0JBQWtCLEtBQWxCLGtCQUFrQixRQTBIbEMifQ==