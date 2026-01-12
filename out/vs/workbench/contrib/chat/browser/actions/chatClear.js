/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatEditorInput } from '../chatEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export async function clearChatEditor(accessor, chatEditorInput) {
    const editorService = accessor.get(IEditorService);
    if (!chatEditorInput) {
        const editorInput = editorService.activeEditor;
        chatEditorInput = editorInput instanceof ChatEditorInput ? editorInput : undefined;
    }
    if (chatEditorInput instanceof ChatEditorInput) {
        // A chat editor can only be open in one group
        const identifier = editorService.findEditors(chatEditorInput.resource)[0];
        await editorService.replaceEditors([
            {
                editor: chatEditorInput,
                replacement: {
                    resource: ChatEditorInput.getNewEditorUri(),
                    options: { pinned: true },
                },
            },
        ], identifier.groupId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q2xlYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixNQUFNLENBQUMsS0FBSyxVQUFVLGVBQWUsQ0FDcEMsUUFBMEIsRUFDMUIsZUFBaUM7SUFFakMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUVsRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdEIsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQTtRQUM5QyxlQUFlLEdBQUcsV0FBVyxZQUFZLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDbkYsQ0FBQztJQUVELElBQUksZUFBZSxZQUFZLGVBQWUsRUFBRSxDQUFDO1FBQ2hELDhDQUE4QztRQUM5QyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RSxNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQ2pDO1lBQ0M7Z0JBQ0MsTUFBTSxFQUFFLGVBQWU7Z0JBQ3ZCLFdBQVcsRUFBRTtvQkFDWixRQUFRLEVBQUUsZUFBZSxDQUFDLGVBQWUsRUFBRTtvQkFDM0MsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBK0I7aUJBQ3REO2FBQ0Q7U0FDRCxFQUNELFVBQVUsQ0FBQyxPQUFPLENBQ2xCLENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQyJ9