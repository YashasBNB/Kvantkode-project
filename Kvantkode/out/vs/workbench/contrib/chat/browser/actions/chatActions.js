/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { toAction, } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNowByDay, safeIntl } from '../../../../../base/common/date.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, markAsSingleton, } from '../../../../../base/common/lifecycle.js';
import { language } from '../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { SuggestController } from '../../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, registerAction2, SubmenuItemAction, } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsLinuxContext, IsWindowsContext, } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../../browser/parts/titlebar/titlebarActions.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService, } from '../../../../services/layout/browser/layoutService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { EXTENSIONS_CATEGORY, IExtensionsWorkbenchService, } from '../../../extensions/common/extensions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatEntitlement, ChatSentiment, IChatEntitlementService, } from '../../common/chatEntitlementService.js';
import { extractAgentAndCommand } from '../../common/chatParserTypes.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, } from '../../common/chatViewModel.js';
import { IChatWidgetHistoryService } from '../../common/chatWidgetHistoryService.js';
import { ChatMode, validateChatMode } from '../../common/constants.js';
import { CopilotUsageExtensionFeatureId } from '../../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatViewId, EditsViewId, IChatWidgetService, showChatView, showCopilotView, } from '../chat.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { clearChatEditor } from './chatClear.js';
export const CHAT_CATEGORY = localize2('chat.category', 'Chat');
export const CHAT_OPEN_ACTION_ID = 'workbench.action.chat.open';
export const CHAT_SETUP_ACTION_ID = 'workbench.action.chat.triggerSetup';
const TOGGLE_CHAT_ACTION_ID = 'workbench.action.chat.toggle';
export const OPEN_CHAT_QUOTA_EXCEEDED_DIALOG = 'workbench.action.chat.openQuotaExceededDialog';
export function registerChatActions() {
    registerAction2(class OpenChatGlobalAction extends Action2 {
        constructor() {
            super({
                id: CHAT_OPEN_ACTION_ID,
                title: localize2('openChat', 'Open Chat'),
                icon: Codicon.copilot,
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.Setup.hidden.toNegated(),
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */,
                    },
                },
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 1,
                },
            });
        }
        async run(accessor, opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            const chatService = accessor.get(IChatService);
            const toolsService = accessor.get(ILanguageModelToolsService);
            const viewsService = accessor.get(IViewsService);
            const hostService = accessor.get(IHostService);
            const chatWidget = await showChatView(viewsService);
            if (!chatWidget) {
                return;
            }
            if (opts?.mode && validateChatMode(opts.mode)) {
                chatWidget.input.setChatMode(opts.mode);
            }
            if (opts?.previousRequests?.length && chatWidget.viewModel) {
                for (const { request, response } of opts.previousRequests) {
                    chatService.addCompleteRequest(chatWidget.viewModel.sessionId, request, undefined, 0, {
                        message: response,
                    });
                }
            }
            if (opts?.attachScreenshot) {
                const screenshot = await hostService.getScreenshot();
                if (screenshot) {
                    chatWidget.attachmentModel.addContext(convertBufferToScreenshotVariable(screenshot));
                }
            }
            if (opts?.query) {
                if (opts.isPartialQuery) {
                    chatWidget.setInput(opts.query);
                }
                else {
                    chatWidget.acceptInput(opts.query);
                }
            }
            if (opts?.toolIds && opts.toolIds.length > 0) {
                for (const toolId of opts.toolIds) {
                    const tool = toolsService.getTool(toolId);
                    if (tool) {
                        chatWidget.attachmentModel.addContext({
                            id: tool.id,
                            name: tool.displayName,
                            fullName: tool.displayName,
                            value: undefined,
                            icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined,
                            isTool: true,
                        });
                    }
                }
            }
            chatWidget.focusInput();
        }
    });
    registerAction2(class ToggleChatAction extends Action2 {
        constructor() {
            super({
                id: TOGGLE_CHAT_ACTION_ID,
                title: localize2('toggleChat', 'Toggle Chat'),
                category: CHAT_CATEGORY,
            });
        }
        async run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            const viewsService = accessor.get(IViewsService);
            const viewDescriptorService = accessor.get(IViewDescriptorService);
            const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
            const editsLocation = viewDescriptorService.getViewLocationById(EditsViewId);
            if (viewsService.isViewVisible(ChatViewId) ||
                (chatLocation === editsLocation && viewsService.isViewVisible(EditsViewId))) {
                this.updatePartVisibility(layoutService, chatLocation, false);
            }
            else {
                this.updatePartVisibility(layoutService, chatLocation, true);
                (await showCopilotView(viewsService, layoutService))?.focusInput();
            }
        }
        updatePartVisibility(layoutService, location, visible) {
            let part;
            switch (location) {
                case 1 /* ViewContainerLocation.Panel */:
                    part = "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case 0 /* ViewContainerLocation.Sidebar */:
                    part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
            }
            if (part) {
                layoutService.setPartHidden(!visible, part);
            }
        }
    });
    registerAction2(class ChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.history`,
                title: localize2('chat.history.label', 'Show Chats...'),
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    group: 'navigation',
                    order: 2,
                },
                category: CHAT_CATEGORY,
                icon: Codicon.history,
                f1: true,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const chatService = accessor.get(IChatService);
            const quickInputService = accessor.get(IQuickInputService);
            const viewsService = accessor.get(IViewsService);
            const editorService = accessor.get(IEditorService);
            const dialogService = accessor.get(IDialogService);
            const view = await viewsService.openView(ChatViewId);
            if (!view) {
                return;
            }
            const chatSessionId = view.widget.viewModel?.model.sessionId;
            if (!chatSessionId) {
                return;
            }
            const editingSession = view.widget.viewModel?.model.editingSession;
            if (editingSession) {
                const phrase = localize('switchChat.confirmPhrase', 'Switching chats will end your current edit session.');
                if (!(await handleCurrentEditingSession(editingSession, phrase, dialogService))) {
                    return;
                }
            }
            const showPicker = async () => {
                const openInEditorButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.file),
                    tooltip: localize('interactiveSession.history.editor', 'Open in Editor'),
                };
                const deleteButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.x),
                    tooltip: localize('interactiveSession.history.delete', 'Delete'),
                };
                const renameButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.pencil),
                    tooltip: localize('chat.history.rename', 'Rename'),
                };
                const getPicks = async () => {
                    const items = await chatService.getHistory();
                    items.sort((a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0));
                    let lastDate = undefined;
                    const picks = items.flatMap((i) => {
                        const timeAgoStr = fromNowByDay(i.lastMessageDate, true, true);
                        const separator = timeAgoStr !== lastDate
                            ? {
                                type: 'separator',
                                label: timeAgoStr,
                            }
                            : undefined;
                        lastDate = timeAgoStr;
                        return [
                            separator,
                            {
                                label: i.title,
                                description: i.isActive ? `(${localize('currentChatLabel', 'current')})` : '',
                                chat: i,
                                buttons: i.isActive
                                    ? [renameButton]
                                    : [renameButton, openInEditorButton, deleteButton],
                            },
                        ];
                    });
                    return coalesce(picks);
                };
                const store = new DisposableStore();
                const picker = store.add(quickInputService.createQuickPick({ useSeparators: true }));
                picker.placeholder = localize('interactiveSession.history.pick', 'Switch to chat');
                const picks = await getPicks();
                picker.items = picks;
                store.add(picker.onDidTriggerItemButton(async (context) => {
                    if (context.button === openInEditorButton) {
                        const options = {
                            target: { sessionId: context.item.chat.sessionId },
                            pinned: true,
                        };
                        editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options }, ACTIVE_GROUP);
                        picker.hide();
                    }
                    else if (context.button === deleteButton) {
                        chatService.removeHistoryEntry(context.item.chat.sessionId);
                        picker.items = await getPicks();
                    }
                    else if (context.button === renameButton) {
                        const title = await quickInputService.input({
                            title: localize('newChatTitle', 'New chat title'),
                            value: context.item.chat.title,
                        });
                        if (title) {
                            chatService.setChatSessionTitle(context.item.chat.sessionId, title);
                        }
                        // The quick input hides the picker, it gets disposed, so we kick it off from scratch
                        await showPicker();
                    }
                }));
                store.add(picker.onDidAccept(async () => {
                    try {
                        const item = picker.selectedItems[0];
                        const sessionId = item.chat.sessionId;
                        await view.loadSession(sessionId);
                    }
                    finally {
                        picker.hide();
                    }
                }));
                store.add(picker.onDidHide(() => store.dispose()));
                picker.show();
            };
            await showPicker();
        }
    });
    registerAction2(class OpenChatEditorAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.openChat`,
                title: localize2('interactiveSession.open', 'Open Editor'),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            await editorService.openEditor({
                resource: ChatEditorInput.getNewEditorUri(),
                options: { pinned: true },
            });
        }
    });
    registerAction2(class ChatAddAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.addParticipant',
                title: localize2('chatWith', 'Chat with Extension'),
                icon: Codicon.mention,
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatInput,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask),
                    group: 'navigation',
                    order: 1,
                },
            });
        }
        async run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            const context = args[0];
            const widget = context?.widget ?? widgetService.lastFocusedWidget;
            if (!widget) {
                return;
            }
            const hasAgentOrCommand = extractAgentAndCommand(widget.parsedInput);
            if (hasAgentOrCommand?.agentPart || hasAgentOrCommand?.commandPart) {
                return;
            }
            const suggestCtrl = SuggestController.get(widget.inputEditor);
            if (suggestCtrl) {
                const curText = widget.inputEditor.getValue();
                const newValue = curText ? `@ ${curText}` : '@';
                if (!curText.startsWith('@')) {
                    widget.inputEditor.setValue(newValue);
                }
                widget.inputEditor.setPosition(new Position(1, 2));
                suggestCtrl.triggerSuggest(undefined, true);
            }
        }
    });
    registerAction2(class ClearChatInputHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearInputHistory',
                title: localize2('interactiveSession.clearHistory.label', 'Clear Input History'),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const historyService = accessor.get(IChatWidgetHistoryService);
            historyService.clearHistory();
        }
    });
    registerAction2(class ClearChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearHistory',
                title: localize2('chat.clear.label', 'Clear All Workspace Chats'),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const chatService = accessor.get(IChatService);
            const instantiationService = accessor.get(IInstantiationService);
            const widgetService = accessor.get(IChatWidgetService);
            await chatService.clearAllHistoryEntries();
            widgetService.getAllWidgets().forEach((widget) => {
                widget.clear();
            });
            // Clear all chat editors. Have to go this route because the chat editor may be in the background and
            // not have a ChatEditorInput.
            editorGroupsService.groups.forEach((group) => {
                group.editors.forEach((editor) => {
                    if (editor instanceof ChatEditorInput) {
                        instantiationService.invokeFunction(clearChatEditor, editor);
                    }
                });
            });
        }
    });
    registerAction2(class FocusChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'chat.action.focus',
                title: localize2('actions.interactiveSession.focus', 'Focus Chat List'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    },
                ],
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusLastMessage();
            }
        }
    });
    registerAction2(class FocusChatInputAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.focusInput',
                title: localize2('interactiveSession.focusInput.label', 'Focus Chat Input'),
                f1: false,
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat.negate()),
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    },
                ],
            });
        }
        run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.focusInput();
        }
    });
    const nonEnterpriseCopilotUsers = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.notEquals(`config.${defaultChat.completionsAdvancedSetting}.authProvider`, defaultChat.enterpriseProviderId));
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.manageSettings',
                title: localize2('manageCopilot', 'Manage Copilot'),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.limited, ChatContextKeys.Entitlement.pro), nonEnterpriseCopilotUsers),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'y_manage',
                    order: 1,
                    when: nonEnterpriseCopilotUsers,
                },
            });
        }
        async run(accessor) {
            const openerService = accessor.get(IOpenerService);
            openerService.open(URI.parse(defaultChat.manageSettingsUrl));
        }
    });
    registerAction2(class ShowExtensionsUsingCopilot extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showExtensionsUsingCopilot',
                title: localize2('showCopilotUsageExtensions', 'Show Extensions using Copilot'),
                f1: true,
                category: EXTENSIONS_CATEGORY,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor) {
            const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
            extensionsWorkbenchService.openSearch(`@feature:${CopilotUsageExtensionFeatureId}`);
        }
    });
    registerAction2(class ConfigureCopilotCompletions extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.configureCodeCompletions',
                title: localize2('configureCompletions', 'Configure Code Completions...'),
                precondition: ChatContextKeys.Setup.installed,
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'f_completions',
                    order: 10,
                },
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(defaultChat.completionsMenuCommand);
        }
    });
    registerAction2(class ShowLimitReachedDialogAction extends Action2 {
        constructor() {
            super({
                id: OPEN_CHAT_QUOTA_EXCEEDED_DIALOG,
                title: localize('upgradeChat', 'Upgrade to Copilot Pro'),
            });
        }
        async run(accessor) {
            const chatEntitlementService = accessor.get(IChatEntitlementService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const telemetryService = accessor.get(ITelemetryService);
            const dateFormatter = safeIntl.DateTimeFormat(language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            let message;
            const { chatQuotaExceeded, completionsQuotaExceeded } = chatEntitlementService.quotas;
            if (chatQuotaExceeded && !completionsQuotaExceeded) {
                message = localize('chatQuotaExceeded', "You've run out of free chat messages. You still have free code completions available in the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                message = localize('completionsQuotaExceeded', "You've run out of free code completions. You still have free chat messages available in the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            else {
                message = localize('chatAndCompletionsQuotaExceeded', "You've reached the limit of the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            const upgradeToPro = localize('upgradeToPro', 'Upgrade to Copilot Pro (your first 30 days are free) for:\n- Unlimited code completions\n- Unlimited chat messages\n- Access to additional models');
            await dialogService.prompt({
                type: 'none',
                message: localize('copilotFree', 'Copilot Limit Reached'),
                cancelButton: {
                    label: localize('dismiss', 'Dismiss'),
                    run: () => {
                        /* noop */
                    },
                },
                buttons: [
                    {
                        label: localize('upgradePro', 'Upgrade to Copilot Pro'),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-dialog' });
                            commandService.executeCommand(commandId);
                        },
                    },
                ],
                custom: {
                    icon: Codicon.copilotWarningLarge,
                    markdownDetails: [
                        { markdown: new MarkdownString(message, true) },
                        { markdown: new MarkdownString(upgradeToPro, true) },
                    ],
                },
            });
        }
    });
}
export function stringifyItem(item, includeName = true) {
    if (isRequestVM(item)) {
        return (includeName ? `${item.username}: ` : '') + item.messageText;
    }
    else {
        return (includeName ? `${item.username}: ` : '') + item.response.toString();
    }
}
// --- Title Bar Copilot Controls
const defaultChat = {
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    managePlanUrl: product.defaultChatAgent?.managePlanUrl ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsMenuCommand: product.defaultChatAgent?.completionsMenuCommand ?? '',
};
// // Add next to the command center if command center is disabled
// Void commented this out with /* */ - copilot head
/* MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Copilot"),
    icon: Codicon.copilot,
    when: ContextKeyExpr.and(
        ChatContextKeys.supported,
        ContextKeyExpr.has('config.chat.commandCenter.enabled')
    ),
    order: 10001 // to the right of command center
});

// Add to the global title bar if command center is disabled
MenuRegistry.appendMenuItem(MenuId.TitleBar, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Copilot"),
    group: 'navigation',
    icon: Codicon.copilot,
    when: ContextKeyExpr.and(
        ChatContextKeys.supported,
        ContextKeyExpr.has('config.chat.commandCenter.enabled'),
        ContextKeyExpr.has('config.window.commandCenter').negate(),
    ),
    order: 1
}); */
registerAction2(class ToggleCopilotControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('chat.commandCenter.enabled', localize('toggle.chatControl', 'Copilot Controls'), localize('toggle.chatControlsDescription', 'Toggle visibility of the Copilot Controls in title bar'), 5, false, ChatContextKeys.supported);
    }
});
registerAction2(class ResetTrustedToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.resetTrustedTools',
            title: localize2('resetTrustedTools', 'Reset Tool Confirmations'),
            category: CHAT_CATEGORY,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(ILanguageModelToolsService).resetToolAutoConfirmation();
        accessor
            .get(INotificationService)
            .info(localize('resetTrustedToolsSuccess', 'Tool confirmation preferences have been reset.'));
    }
});
let CopilotTitleBarMenuRendering = class CopilotTitleBarMenuRendering extends Disposable {
    static { this.ID = 'workbench.contrib.copilotTitleBarMenuRendering'; }
    constructor(actionViewItemService, instantiationService, chatEntitlementService, configurationService) {
        super();
        const disposable = actionViewItemService.register(MenuId.CommandCenter, MenuId.ChatTitleBarMenu, (action, options) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            const dropdownAction = toAction({
                id: 'copilot.titleBarMenuRendering.more',
                label: localize('more', 'More...'),
                run() { },
            });
            const chatExtensionInstalled = chatEntitlementService.sentiment === ChatSentiment.Installed;
            const chatHidden = chatEntitlementService.sentiment === ChatSentiment.Disabled;
            const { chatQuotaExceeded, completionsQuotaExceeded } = chatEntitlementService.quotas;
            const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            const setupFromDialog = configurationService.getValue('chat.setupFromDialog');
            let primaryActionId = TOGGLE_CHAT_ACTION_ID;
            let primaryActionTitle = localize('toggleChat', 'Toggle Chat');
            let primaryActionIcon = Codicon.copilot;
            if (!chatExtensionInstalled && (!setupFromDialog || chatHidden)) {
                primaryActionId = CHAT_SETUP_ACTION_ID;
                primaryActionTitle = localize('triggerChatSetup', 'Use AI Features with Copilot for free...');
            }
            else if (chatExtensionInstalled && signedOut) {
                primaryActionId = setupFromDialog ? CHAT_SETUP_ACTION_ID : TOGGLE_CHAT_ACTION_ID;
                primaryActionTitle = localize('signInToChatSetup', 'Sign in to use Copilot...');
                primaryActionIcon = Codicon.copilotNotConnected;
            }
            else if (chatExtensionInstalled && (chatQuotaExceeded || completionsQuotaExceeded)) {
                primaryActionId = OPEN_CHAT_QUOTA_EXCEEDED_DIALOG;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    primaryActionTitle = localize('chatQuotaExceededButton', 'Monthly chat messages limit reached. Click for details.');
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    primaryActionTitle = localize('completionsQuotaExceededButton', 'Monthly code completions limit reached. Click for details.');
                }
                else {
                    primaryActionTitle = localize('chatAndCompletionsQuotaExceededButton', 'Copilot Free plan limit reached. Click for details.');
                }
                primaryActionIcon = Codicon.copilotWarning;
            }
            return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, instantiationService.createInstance(MenuItemAction, {
                id: primaryActionId,
                title: primaryActionTitle,
                icon: primaryActionIcon,
            }, undefined, undefined, undefined, undefined), dropdownAction, action.actions, '', { ...options, skipTelemetry: true });
        }, Event.any(chatEntitlementService.onDidChangeSentiment, chatEntitlementService.onDidChangeQuotaExceeded, chatEntitlementService.onDidChangeEntitlement, Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('chat.setupFromDialog'))));
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CopilotTitleBarMenuRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService),
    __param(2, IChatEntitlementService),
    __param(3, IConfigurationService)
], CopilotTitleBarMenuRendering);
export { CopilotTitleBarMenuRendering };
export function getEditsViewId(accessor) {
    const chatService = accessor.get(IChatService);
    return chatService.unifiedViewEnabled ? ChatViewId : EditsViewId;
}
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export async function handleCurrentEditingSession(currentEditingSession, phrase, dialogService) {
    if (shouldShowClearEditingSessionConfirmation(currentEditingSession)) {
        return showClearEditingSessionConfirmation(currentEditingSession, dialogService, {
            messageOverride: phrase,
        });
    }
    return true;
}
export async function showClearEditingSessionConfirmation(editingSession, dialogService, options) {
    const defaultPhrase = localize('chat.startEditing.confirmation.pending.message.default', 'Starting a new chat will end your current edit session.');
    const defaultTitle = localize('chat.startEditing.confirmation.title', 'Start new chat?');
    const phrase = options?.messageOverride ?? defaultPhrase;
    const title = options?.titleOverride ?? defaultTitle;
    const currentEdits = editingSession.entries.get();
    const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
    const { result } = await dialogService.prompt({
        title,
        message: phrase +
            ' ' +
            localize('chat.startEditing.confirmation.pending.message.2', 'Do you want to keep pending edits to {0} files?', undecidedEdits.length),
        type: 'info',
        cancelButton: true,
        buttons: [
            {
                label: localize('chat.startEditing.confirmation.acceptEdits', 'Keep & Continue'),
                run: async () => {
                    await editingSession.accept();
                    return true;
                },
            },
            {
                label: localize('chat.startEditing.confirmation.discardEdits', 'Undo & Continue'),
                run: async () => {
                    await editingSession.reject();
                    return true;
                },
            },
        ],
    });
    return Boolean(result);
}
export function shouldShowClearEditingSessionConfirmation(editingSession) {
    const currentEdits = editingSession.entries.get();
    const currentEditCount = currentEdits.length;
    if (currentEditCount) {
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
        return !!undecidedEdits.length;
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixRQUFRLEdBR1IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixlQUFlLEdBQ2YsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VB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