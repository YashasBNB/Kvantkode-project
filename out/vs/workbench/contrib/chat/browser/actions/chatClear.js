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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENsZWFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFcEYsTUFBTSxDQUFDLEtBQUssVUFBVSxlQUFlLENBQ3BDLFFBQTBCLEVBQzFCLGVBQWlDO0lBRWpDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFFbEQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUE7UUFDOUMsZUFBZSxHQUFHLFdBQVcsWUFBWSxlQUFlLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ25GLENBQUM7SUFFRCxJQUFJLGVBQWUsWUFBWSxlQUFlLEVBQUUsQ0FBQztRQUNoRCw4Q0FBOEM7UUFDOUMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekUsTUFBTSxhQUFhLENBQUMsY0FBYyxDQUNqQztZQUNDO2dCQUNDLE1BQU0sRUFBRSxlQUFlO2dCQUN2QixXQUFXLEVBQUU7b0JBQ1osUUFBUSxFQUFFLGVBQWUsQ0FBQyxlQUFlLEVBQUU7b0JBQzNDLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQStCO2lCQUN0RDthQUNEO1NBQ0QsRUFDRCxVQUFVLENBQUMsT0FBTyxDQUNsQixDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUMifQ==