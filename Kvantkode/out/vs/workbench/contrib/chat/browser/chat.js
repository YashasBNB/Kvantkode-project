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
