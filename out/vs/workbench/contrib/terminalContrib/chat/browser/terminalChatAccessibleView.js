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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdEFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRzdGLE1BQU0sT0FBTyxnQ0FBZ0M7SUFBN0M7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLG9CQUFvQixDQUFBO1FBQzNCLFNBQUksd0NBQTBCO1FBQzlCLFNBQUksR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLENBQUE7SUF5Q2hELENBQUM7SUF2Q0EsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtRQUM3QixNQUFNLGlCQUFpQixHQUFHLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixDQUFBO1FBQzlGLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUM3QyxnQ0FBZ0MsRUFDaEMsaUJBQWlCLENBQ2pCLENBQUE7WUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNsQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMzQixJQUFJLENBQUMsWUFBWSxjQUFjLEVBQUUsQ0FBQzt3QkFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDaEIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FDZixlQUFlLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUE7UUFDeEYsSUFBSSxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixDQUFBO1FBQ3RELE9BQU8sSUFBSSx5QkFBeUIsOERBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUU7WUFDSixPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDLEVBQ0QsR0FBRyxFQUFFO1lBQ0osVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ25CLENBQUMseUZBRUQsU0FBUyxFQUNULE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=