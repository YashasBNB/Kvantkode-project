/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { getChatAccessibilityHelpProvider } from '../../chat/browser/actions/chatAccessibilityHelp.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { CTX_INLINE_CHAT_RESPONSE_FOCUSED } from '../common/inlineChat.js';
export class InlineChatAccessibilityHelp {
    constructor() {
        this.priority = 106;
        this.name = 'inlineChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.or(CTX_INLINE_CHAT_RESPONSE_FOCUSED, ChatContextKeys.inputHasFocus);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        return getChatAccessibilityHelpProvider(accessor, codeEditor, 'inlineChat');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUc3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTFFLE1BQU0sT0FBTywyQkFBMkI7SUFBeEM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLFlBQVksQ0FBQTtRQUNuQixTQUFJLHdDQUEwQjtRQUM5QixTQUFJLEdBQUcsY0FBYyxDQUFDLEVBQUUsQ0FBQyxnQ0FBZ0MsRUFBRSxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUE7SUFVbkcsQ0FBQztJQVRBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLFVBQVUsR0FDZixRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsbUJBQW1CLEVBQUU7WUFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDeEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxnQ0FBZ0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzVFLENBQUM7Q0FDRCJ9