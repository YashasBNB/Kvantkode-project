/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CHAT_CATEGORY } from '../chatActions.js';
import { localize2 } from '../../../../../../nls.js';
import { IChatService } from '../../../common/chatService.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { Action2 } from '../../../../../../platform/actions/common/actions.js';
import { IPromptsService } from '../../../common/promptSyntax/service/types.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IViewsService } from '../../../../../services/views/common/viewsService.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { askToSelectPrompt, } from './dialogs/askToSelectPrompt/askToSelectPrompt.js';
/**
 * Action ID for the `Attach Prompt` action.
 */
export const ATTACH_PROMPT_ACTION_ID = 'workbench.action.chat.attach.prompt';
/**
 * Action to attach a prompt to a chat widget input.
 */
export class AttachPromptAction extends Action2 {
    constructor() {
        super({
            id: ATTACH_PROMPT_ACTION_ID,
            title: localize2('workbench.action.chat.attach.prompt.label', 'Use Prompt'),
            f1: false,
            precondition: ChatContextKeys.enabled,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, options) {
        const fileService = accessor.get(IFileService);
        const chatService = accessor.get(IChatService);
        const labelService = accessor.get(ILabelService);
        const viewsService = accessor.get(IViewsService);
        const openerService = accessor.get(IOpenerService);
        const dialogService = accessor.get(IDialogService);
        const promptsService = accessor.get(IPromptsService);
        const commandService = accessor.get(ICommandService);
        const quickInputService = accessor.get(IQuickInputService);
        // find all prompt files in the user workspace
        const promptFiles = await promptsService.listPromptFiles();
        await askToSelectPrompt({
            ...options,
            promptFiles,
            chatService,
            fileService,
            viewsService,
            labelService,
            dialogService,
            openerService,
            commandService,
            quickInputService,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaFByb21wdEFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vY2hhdEF0dGFjaFByb21wdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sa0RBQWtELENBQUE7QUFFekQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxxQ0FBcUMsQ0FBQTtBQVE1RTs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxPQUFPO0lBQzlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QjtZQUMzQixLQUFLLEVBQUUsU0FBUyxDQUFDLDJDQUEyQyxFQUFFLFlBQVksQ0FBQztZQUMzRSxFQUFFLEVBQUUsS0FBSztZQUNULFlBQVksRUFBRSxlQUFlLENBQUMsT0FBTztZQUNyQyxRQUFRLEVBQUUsYUFBYTtTQUN2QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRWUsS0FBSyxDQUFDLEdBQUcsQ0FDeEIsUUFBMEIsRUFDMUIsT0FBdUM7UUFFdkMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFELDhDQUE4QztRQUM5QyxNQUFNLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUUxRCxNQUFNLGlCQUFpQixDQUFDO1lBQ3ZCLEdBQUcsT0FBTztZQUNWLFdBQVc7WUFDWCxXQUFXO1lBQ1gsV0FBVztZQUNYLFlBQVk7WUFDWixZQUFZO1lBQ1osYUFBYTtZQUNiLGFBQWE7WUFDYixjQUFjO1lBQ2QsaUJBQWlCO1NBQ2pCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9