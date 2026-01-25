/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
import { IChatWidgetService } from '../chat.js';
export function registerChatDeveloperActions() {
    registerAction2(LogChatInputHistoryAction);
    registerAction2(LogChatIndexAction);
}
class LogChatInputHistoryAction extends Action2 {
    static { this.ID = 'workbench.action.chat.logInputHistory'; }
    constructor() {
        super({
            id: LogChatInputHistoryAction.ID,
            title: localize2('workbench.action.chat.logInputHistory.label', 'Log Chat Input History'),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true,
            precondition: ChatContextKeys.enabled,
        });
    }
    async run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        chatWidgetService.lastFocusedWidget?.logInputHistory();
    }
}
class LogChatIndexAction extends Action2 {
    static { this.ID = 'workbench.action.chat.logChatIndex'; }
    constructor() {
        super({
            id: LogChatIndexAction.ID,
            title: localize2('workbench.action.chat.logChatIndex.label', 'Log Chat Index'),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        chatService.logChatIndex();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERldmVsb3BlckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXREZXZlbG9wZXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFL0MsTUFBTSxVQUFVLDRCQUE0QjtJQUMzQyxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMxQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUNwQyxDQUFDO0FBRUQsTUFBTSx5QkFBMEIsU0FBUSxPQUFPO2FBQzlCLE9BQUUsR0FBRyx1Q0FBdUMsQ0FBQTtJQUU1RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFO1lBQ2hDLEtBQUssRUFBRSxTQUFTLENBQUMsNkNBQTZDLEVBQUUsd0JBQXdCLENBQUM7WUFDekYsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3BCLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxlQUFlLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUM1RCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUN2RCxDQUFDOztBQUdGLE1BQU0sa0JBQW1CLFNBQVEsT0FBTzthQUN2QixPQUFFLEdBQUcsb0NBQW9DLENBQUE7SUFFekQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0JBQWtCLENBQUMsRUFBRTtZQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLDBDQUEwQyxFQUFFLGdCQUFnQixDQUFDO1lBQzlFLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtZQUNwQixRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUM1RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUMzQixDQUFDIn0=