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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBYTNFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQTtBQWtCMUYsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQUMsWUFBMkI7SUFDN0QsT0FBTyxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtBQUN2RSxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQUMsWUFBMkI7SUFDOUQsT0FBTyxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtBQUN4RSxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFlBQTJCO0lBQ2pFLElBQ0MsWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsS0FBSyxVQUFVO1FBQ2hELENBQUMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQzdDLENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDdkQsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQzlCLFlBQTJCLEVBQzNCLGFBQXNDO0lBRXRDLGlDQUFpQztJQUNqQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEtBQUssYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25FLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixJQUFJLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDMUMsT0FBTyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbkMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMscUJBQTZDLEVBQzdDLGFBQXNDLEVBQ3RDLFlBQTJCO0lBRTNCLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQTtJQUU5RSxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsRSxJQUFJLFFBQVEsd0NBQWdDLEVBQUUsQ0FBQztRQUM5QyxPQUFNLENBQUMsK0JBQStCO0lBQ3ZDLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FDYixRQUFRLDBDQUFrQyxDQUFDLENBQUMsb0RBQW9CLENBQUMsNkRBQXdCLENBQUE7SUFDMUYsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUVoRCxJQUFJLGlCQUFxQyxDQUFBO0lBQ3pDLElBQUksUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDLHNCQUFzQixDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUMvRSxpQkFBaUIsR0FBRyxHQUFHLENBQUEsQ0FBQyxzQ0FBc0M7SUFDL0QsQ0FBQztTQUFNLElBQUksUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxpQkFBaUIsR0FBRyxHQUFHLENBQUEsQ0FBQyxtQkFBbUI7SUFDNUMsQ0FBQztJQUVELElBQUksT0FBTyxpQkFBaUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDdkYsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUE7QUE0QnZGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FDdkQsMEJBQTBCLENBQzFCLENBQUE7QUEwSUQsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQ2hELGVBQWUsQ0FBdUMscUNBQXFDLENBQUMsQ0FBQTtBQU83RixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsNkJBQTZCLGdCQUFnQixFQUFFLENBQUE7QUFFekUsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGlDQUFpQyxDQUFBIn0=