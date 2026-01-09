/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider, } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatController } from './terminalChatController.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
export class TerminalInlineChatAccessibleView {
    constructor() {
        this.priority = 105;
        this.name = 'terminalInlineChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = TerminalChatContextKeys.focused;
    }
    getProvider(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const menuService = accessor.get(IMenuService);
        const actions = [];
        const contextKeyService = TerminalChatController.activeChatController?.scopedContextKeyService;
        if (contextKeyService) {
            const menuActions = menuService.getMenuActions(MENU_TERMINAL_CHAT_WIDGET_STATUS, contextKeyService);
            for (const action of menuActions) {
                for (const a of action[1]) {
                    if (a instanceof MenuItemAction) {
                        actions.push(a);
                    }
                }
            }
        }
        const controller = terminalService.activeInstance?.getContribution(TerminalChatController.ID) ?? undefined;
        if (!controller?.lastResponseContent) {
            return;
        }
        const responseContent = controller.lastResponseContent;
        return new AccessibleContentProvider("terminal-chat" /* AccessibleViewProviderId.TerminalChat */, { type: "view" /* AccessibleViewType.View */ }, () => {
            return responseContent;
        }, () => {
            controller.focus();
        }, "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */, undefined, actions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0QWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLHlCQUF5QixHQUN6QixNQUFNLGlFQUFpRSxDQUFBO0FBRXhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFHN0YsTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsb0JBQW9CLENBQUE7UUFDM0IsU0FBSSx3Q0FBMEI7UUFDOUIsU0FBSSxHQUFHLHVCQUF1QixDQUFDLE9BQU8sQ0FBQTtJQXlDaEQsQ0FBQztJQXZDQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFBO1FBQzdCLE1BQU0saUJBQWlCLEdBQUcsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUE7UUFDOUYsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQzdDLGdDQUFnQyxFQUNoQyxpQkFBaUIsQ0FDakIsQ0FBQTtZQUNELEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzNCLElBQUksQ0FBQyxZQUFZLGNBQWMsRUFBRSxDQUFDO3dCQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNoQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUNmLGVBQWUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQTtRQUN4RixJQUFJLENBQUMsVUFBVSxFQUFFLG1CQUFtQixFQUFFLENBQUM7WUFDdEMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsbUJBQW1CLENBQUE7UUFDdEQsT0FBTyxJQUFJLHlCQUF5Qiw4REFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRTtZQUNKLE9BQU8sZUFBZSxDQUFBO1FBQ3ZCLENBQUMsRUFDRCxHQUFHLEVBQUU7WUFDSixVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsQ0FBQyx5RkFFRCxTQUFTLEVBQ1QsT0FBTyxDQUNQLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==