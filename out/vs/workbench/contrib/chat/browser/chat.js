/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
export const IChatWidgetService = createDecorator('chatWidgetService');
export async function showChatView(viewsService) {
    return (await viewsService.openView(ChatViewId))?.widget;
}
export async function showEditsView(viewsService) {
    return (await viewsService.openView(EditsViewId))?.widget;
}
export function preferCopilotEditsView(viewsService) {
    if (viewsService.getFocusedView()?.id === ChatViewId ||
        !!viewsService.getActiveViewWithId(ChatViewId)) {
        return false;
    }
    return !!viewsService.getActiveViewWithId(EditsViewId);
}
export function showCopilotView(viewsService, layoutService) {
    // Ensure main window is in front
    if (layoutService.activeContainer !== layoutService.mainContainer) {
        layoutService.mainContainer.focus();
    }
    // Bring up the correct view
    if (preferCopilotEditsView(viewsService)) {
        return showEditsView(viewsService);
    }
    else {
        return showChatView(viewsService);
    }
}
export function ensureSideBarChatViewSize(viewDescriptorService, layoutService, viewsService) {
    const viewId = preferCopilotEditsView(viewsService) ? EditsViewId : ChatViewId;
    const location = viewDescriptorService.getViewLocationById(viewId);
    if (location === 1 /* ViewContainerLocation.Panel */) {
        return; // panel is typically very wide
    }
    const viewPart = location === 0 /* ViewContainerLocation.Sidebar */ ? "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
    const partSize = layoutService.getSize(viewPart);
    let adjustedChatWidth;
    if (partSize.width < 400 && layoutService.mainContainerDimension.width > 1200) {
        adjustedChatWidth = 400; // up to 400px if window bounds permit
    }
    else if (partSize.width < 300) {
        adjustedChatWidth = 300; // at minimum 300px
    }
    if (typeof adjustedChatWidth === 'number') {
        layoutService.setSize(viewPart, { width: adjustedChatWidth, height: partSize.height });
    }
}
export const IQuickChatService = createDecorator('quickChatService');
export const IChatAccessibilityService = createDecorator('chatAccessibilityService');
export const IChatCodeBlockContextProviderService = createDecorator('chatCodeBlockContextProviderService');
export const ChatViewId = `workbench.panel.chat.view.${CHAT_PROVIDER_ID}`;
export const EditsViewId = 'workbench.panel.chat.view.edits';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU81RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQWEzRSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUE7QUFrQjFGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsWUFBWSxDQUFDLFlBQTJCO0lBQzdELE9BQU8sQ0FBQyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQWUsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUE7QUFDdkUsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsYUFBYSxDQUFDLFlBQTJCO0lBQzlELE9BQU8sQ0FBQyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQWUsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUE7QUFDeEUsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxZQUEyQjtJQUNqRSxJQUNDLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLEtBQUssVUFBVTtRQUNoRCxDQUFDLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUM3QyxDQUFDO1FBQ0YsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUM5QixZQUEyQixFQUMzQixhQUFzQztJQUV0QyxpQ0FBaUM7SUFDakMsSUFBSSxhQUFhLENBQUMsZUFBZSxLQUFLLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuRSxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFRCw0QkFBNEI7SUFDNUIsSUFBSSxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ25DLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbEMsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLHFCQUE2QyxFQUM3QyxhQUFzQyxFQUN0QyxZQUEyQjtJQUUzQixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7SUFFOUUsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEUsSUFBSSxRQUFRLHdDQUFnQyxFQUFFLENBQUM7UUFDOUMsT0FBTSxDQUFDLCtCQUErQjtJQUN2QyxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQ2IsUUFBUSwwQ0FBa0MsQ0FBQyxDQUFDLG9EQUFvQixDQUFDLDZEQUF3QixDQUFBO0lBQzFGLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFaEQsSUFBSSxpQkFBcUMsQ0FBQTtJQUN6QyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDL0UsaUJBQWlCLEdBQUcsR0FBRyxDQUFBLENBQUMsc0NBQXNDO0lBQy9ELENBQUM7U0FBTSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDakMsaUJBQWlCLEdBQUcsR0FBRyxDQUFBLENBQUMsbUJBQW1CO0lBQzVDLENBQUM7SUFFRCxJQUFJLE9BQU8saUJBQWlCLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDM0MsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBNEJ2RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDBCQUEwQixDQUMxQixDQUFBO0FBMElELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUNoRCxlQUFlLENBQXVDLHFDQUFxQyxDQUFDLENBQUE7QUFPN0YsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDZCQUE2QixnQkFBZ0IsRUFBRSxDQUFBO0FBRXpFLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQSJ9