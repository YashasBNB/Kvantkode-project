/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { IChatService } from '../../common/chatService.js';
export function registerChatDeveloperActions() {
    registerAction2(OpenChatStorageFolderAction);
}
class OpenChatStorageFolderAction extends Action2 {
    static { this.ID = 'workbench.action.chat.openStorageFolder'; }
    constructor() {
        super({
            id: OpenChatStorageFolderAction.ID,
            title: localize2('workbench.action.chat.openStorageFolder.label', 'Open Chat Storage Folder'),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const nativeHostService = accessor.get(INativeHostService);
        const storagePath = chatService.getChatStorageFolder();
        nativeHostService.showItemInFolder(storagePath.fsPath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERldmVsb3BlckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2VsZWN0cm9uLXNhbmRib3gvYWN0aW9ucy9jaGF0RGV2ZWxvcGVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUUxRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0FBQzdDLENBQUM7QUFFRCxNQUFNLDJCQUE0QixTQUFRLE9BQU87YUFDaEMsT0FBRSxHQUFHLHlDQUF5QyxDQUFBO0lBRTlEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQixDQUFDLEVBQUU7WUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQywrQ0FBK0MsRUFBRSwwQkFBMEIsQ0FBQztZQUM3RixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUN0RCxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkQsQ0FBQyJ9