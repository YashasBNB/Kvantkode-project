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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERldmVsb3BlckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0RGV2ZWxvcGVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRS9DLE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDMUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDcEMsQ0FBQztBQUVELE1BQU0seUJBQTBCLFNBQVEsT0FBTzthQUM5QixPQUFFLEdBQUcsdUNBQXVDLENBQUE7SUFFNUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCLENBQUMsRUFBRTtZQUNoQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDZDQUE2QyxFQUFFLHdCQUF3QixDQUFDO1lBQ3pGLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtZQUNwQixRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsZUFBZSxDQUFDLE9BQU87U0FDckMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLENBQUE7SUFDdkQsQ0FBQzs7QUFHRixNQUFNLGtCQUFtQixTQUFRLE9BQU87YUFDdkIsT0FBRSxHQUFHLG9DQUFvQyxDQUFBO0lBRXpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7WUFDekIsS0FBSyxFQUFFLFNBQVMsQ0FBQywwQ0FBMEMsRUFBRSxnQkFBZ0IsQ0FBQztZQUM5RSxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDM0IsQ0FBQyJ9