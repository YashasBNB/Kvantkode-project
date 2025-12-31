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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sUUFBUSxHQUdSLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFMUUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsZUFBZSxHQUNmLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQ2hJLE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLGNBQWMsRUFDZCxlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04sY0FBYyxFQUNkLGdCQUFnQixHQUNoQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFFdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hGLE9BQU8sT0FBTyxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZFLE9BQU8sRUFFTixrQkFBa0IsR0FHbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sNkJBQTZCLENBQUE7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDeEUsT0FBTyxFQUNOLHVCQUF1QixHQUV2QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGFBQWEsRUFDYix1QkFBdUIsR0FDdkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdkUsT0FBTyxFQUdOLFdBQVcsR0FDWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN0RixPQUFPLEVBQ04sVUFBVSxFQUNWLFdBQVcsRUFFWCxrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLFlBQVksQ0FBQTtBQUVuQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFdkQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRWhELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLDRCQUE0QixDQUFBO0FBQy9ELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLG9DQUFvQyxDQUFBO0FBQ3hFLE1BQU0scUJBQXFCLEdBQUcsOEJBQThCLENBQUE7QUFrQzVELE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLCtDQUErQyxDQUFBO0FBRTlGLE1BQU0sVUFBVSxtQkFBbUI7SUFDbEMsZUFBZSxDQUNkLE1BQU0sb0JBQXFCLFNBQVEsT0FBTztRQUN6QztZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUM7Z0JBQ3pDLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDckIsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLFlBQVksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3RELFVBQVUsRUFBRTtvQkFDWCxNQUFNLDZDQUFtQztvQkFDekMsT0FBTyxFQUFFLGdEQUEyQix3QkFBZTtvQkFDbkQsR0FBRyxFQUFFO3dCQUNKLE9BQU8sRUFBRSxvREFBK0Isd0JBQWU7cUJBQ3ZEO2lCQUNEO2dCQUNELElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDM0IsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRVEsS0FBSyxDQUFDLEdBQUcsQ0FDakIsUUFBMEIsRUFDMUIsSUFBb0M7WUFFcEMsSUFBSSxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUV4RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUM3RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7WUFFOUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksSUFBSSxFQUFFLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0MsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxJQUFJLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLElBQUksVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM1RCxLQUFLLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQzNELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRTt3QkFDckYsT0FBTyxFQUFFLFFBQVE7cUJBQ2pCLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksSUFBSSxFQUFFLGdCQUFnQixFQUFFLENBQUM7Z0JBQzVCLE1BQU0sVUFBVSxHQUFHLE1BQU0sV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFBO2dCQUNwRCxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixVQUFVLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxpQ0FBaUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO2dCQUNyRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUNqQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDekIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDbkMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLElBQUksRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNuQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUN6QyxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLFVBQVUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDOzRCQUNyQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7NEJBQ1gsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXOzRCQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVc7NEJBQzFCLEtBQUssRUFBRSxTQUFTOzRCQUNoQixJQUFJLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQzlELE1BQU0sRUFBRSxJQUFJO3lCQUNaLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3hCLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxnQkFBaUIsU0FBUSxPQUFPO1FBQ3JDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQztnQkFDN0MsUUFBUSxFQUFFLGFBQWE7YUFDdkIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7WUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQzNELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDaEQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7WUFFbEUsTUFBTSxZQUFZLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDMUUsTUFBTSxhQUFhLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7WUFFNUUsSUFDQyxZQUFZLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztnQkFDdEMsQ0FBQyxZQUFZLEtBQUssYUFBYSxJQUFJLFlBQVksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsRUFDMUUsQ0FBQztnQkFDRixJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM5RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQzNEO2dCQUFBLENBQUMsTUFBTSxlQUFlLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUE7WUFDcEUsQ0FBQztRQUNGLENBQUM7UUFFTyxvQkFBb0IsQ0FDM0IsYUFBc0MsRUFDdEMsUUFBc0MsRUFDdEMsT0FBZ0I7WUFFaEIsSUFBSSxJQUFpRixDQUFBO1lBQ3JGLFFBQVEsUUFBUSxFQUFFLENBQUM7Z0JBQ2xCO29CQUNDLElBQUksaURBQW1CLENBQUE7b0JBQ3ZCLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxxREFBcUIsQ0FBQTtvQkFDekIsTUFBSztnQkFDTjtvQkFDQyxJQUFJLCtEQUEwQixDQUFBO29CQUM5QixNQUFLO1lBQ1AsQ0FBQztZQUVELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLGlCQUFrQixTQUFRLE9BQU87UUFDdEM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLCtCQUErQjtnQkFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLENBQUM7Z0JBQ3ZELElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7b0JBQy9DLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsQ0FBQztpQkFDUjtnQkFDRCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO2dCQUNyQixFQUFFLEVBQUUsSUFBSTtnQkFDUixZQUFZLEVBQUUsZUFBZSxDQUFDLE9BQU87YUFDckMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7WUFDbkMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM5QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMxRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUVsRCxNQUFNLElBQUksR0FBRyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQWUsVUFBVSxDQUFDLENBQUE7WUFDbEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQTtZQUM1RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQTtZQUNsRSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLE1BQU0sR0FBRyxRQUFRLENBQ3RCLDBCQUEwQixFQUMxQixxREFBcUQsQ0FDckQsQ0FBQTtnQkFDRCxJQUFJLENBQUMsQ0FBQyxNQUFNLDJCQUEyQixDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNqRixPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxJQUFJLEVBQUU7Z0JBQzdCLE1BQU0sa0JBQWtCLEdBQXNCO29CQUM3QyxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUM5QyxPQUFPLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGdCQUFnQixDQUFDO2lCQUN4RSxDQUFBO2dCQUNELE1BQU0sWUFBWSxHQUFzQjtvQkFDdkMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDM0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxRQUFRLENBQUM7aUJBQ2hFLENBQUE7Z0JBQ0QsTUFBTSxZQUFZLEdBQXNCO29CQUN2QyxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO29CQUNoRCxPQUFPLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQztpQkFDbEQsQ0FBQTtnQkFNRCxNQUFNLFFBQVEsR0FBRyxLQUFLLElBQUksRUFBRTtvQkFDM0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUE7b0JBQzVDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBRXpFLElBQUksUUFBUSxHQUF1QixTQUFTLENBQUE7b0JBQzVDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQXNELEVBQUU7d0JBQ3JGLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDOUQsTUFBTSxTQUFTLEdBQ2QsVUFBVSxLQUFLLFFBQVE7NEJBQ3RCLENBQUMsQ0FBQztnQ0FDQSxJQUFJLEVBQUUsV0FBVztnQ0FDakIsS0FBSyxFQUFFLFVBQVU7NkJBQ2pCOzRCQUNGLENBQUMsQ0FBQyxTQUFTLENBQUE7d0JBQ2IsUUFBUSxHQUFHLFVBQVUsQ0FBQTt3QkFDckIsT0FBTzs0QkFDTixTQUFTOzRCQUNUO2dDQUNDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztnQ0FDZCxXQUFXLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQ0FDN0UsSUFBSSxFQUFFLENBQUM7Z0NBQ1AsT0FBTyxFQUFFLENBQUMsQ0FBQyxRQUFRO29DQUNsQixDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7b0NBQ2hCLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxZQUFZLENBQUM7NkJBQ25EO3lCQUNELENBQUE7b0JBQ0YsQ0FBQyxDQUFDLENBQUE7b0JBRUYsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUMsQ0FBQTtnQkFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO2dCQUNuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUN2QixpQkFBaUIsQ0FBQyxlQUFlLENBQWtCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQzNFLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDbEYsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLEVBQUUsQ0FBQTtnQkFDOUIsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7Z0JBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQ1IsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDL0MsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLGtCQUFrQixFQUFFLENBQUM7d0JBQzNDLE1BQU0sT0FBTyxHQUF1Qjs0QkFDbkMsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTs0QkFDbEQsTUFBTSxFQUFFLElBQUk7eUJBQ1osQ0FBQTt3QkFDRCxhQUFhLENBQUMsVUFBVSxDQUN2QixFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQ3hELFlBQVksQ0FDWixDQUFBO3dCQUNELE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDZCxDQUFDO3lCQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxZQUFZLEVBQUUsQ0FBQzt3QkFDNUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO3dCQUMzRCxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sUUFBUSxFQUFFLENBQUE7b0JBQ2hDLENBQUM7eUJBQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLFlBQVksRUFBRSxDQUFDO3dCQUM1QyxNQUFNLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FBQzs0QkFDM0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZ0JBQWdCLENBQUM7NEJBQ2pELEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO3lCQUM5QixDQUFDLENBQUE7d0JBQ0YsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDWCxXQUFXLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUNwRSxDQUFDO3dCQUVELHFGQUFxRjt3QkFDckYsTUFBTSxVQUFVLEVBQUUsQ0FBQTtvQkFDbkIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNELEtBQUssQ0FBQyxHQUFHLENBQ1IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDN0IsSUFBSSxDQUFDO3dCQUNKLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7d0JBQ3BDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFBO3dCQUNyQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ2xDLENBQUM7NEJBQVMsQ0FBQzt3QkFDVixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ2QsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUVsRCxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDZCxDQUFDLENBQUE7WUFDRCxNQUFNLFVBQVUsRUFBRSxDQUFBO1FBQ25CLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxvQkFBcUIsU0FBUSxPQUFPO1FBQ3pDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLEtBQUssRUFBRSxTQUFTLENBQUMseUJBQXlCLEVBQUUsYUFBYSxDQUFDO2dCQUMxRCxFQUFFLEVBQUUsSUFBSTtnQkFDUixRQUFRLEVBQUUsYUFBYTtnQkFDdkIsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO2FBQ3JDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQ25DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO2dCQUM5QixRQUFRLEVBQUUsZUFBZSxDQUFDLGVBQWUsRUFBRTtnQkFDM0MsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBK0I7YUFDdEQsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLGFBQWMsU0FBUSxPQUFPO1FBQ2xDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxzQ0FBc0M7Z0JBQzFDLEtBQUssRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDO2dCQUNuRCxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87Z0JBQ3JCLEVBQUUsRUFBRSxLQUFLO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUNwQixJQUFJLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztvQkFDdEQsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDNUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RELE1BQU0sT0FBTyxHQUF5QyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLE1BQU0sSUFBSSxhQUFhLENBQUMsaUJBQWlCLENBQUE7WUFDakUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEUsSUFBSSxpQkFBaUIsRUFBRSxTQUFTLElBQUksaUJBQWlCLEVBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ3BFLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM3RCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUM3QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtnQkFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7Z0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2xELFdBQVcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLE1BQU0sMkJBQTRCLFNBQVEsT0FBTztRQUNoRDtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUseUNBQXlDO2dCQUM3QyxLQUFLLEVBQUUsU0FBUyxDQUFDLHVDQUF1QyxFQUFFLHFCQUFxQixDQUFDO2dCQUNoRixZQUFZLEVBQUUsZUFBZSxDQUFDLE9BQU87Z0JBQ3JDLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1lBQ25ELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtZQUM5RCxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDOUIsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLHNCQUF1QixTQUFRLE9BQU87UUFDM0M7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLG9DQUFvQztnQkFDeEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSwyQkFBMkIsQ0FBQztnQkFDakUsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO2dCQUNyQyxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsRUFBRSxFQUFFLElBQUk7YUFDUixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztZQUNuRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM5RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUV0RCxNQUFNLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1lBRTFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDaEQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQUE7WUFFRixxR0FBcUc7WUFDckcsOEJBQThCO1lBQzlCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDaEMsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7b0JBQzdELENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxlQUFnQixTQUFRLGFBQWE7UUFDMUM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxpQkFBaUIsQ0FBQztnQkFDdkUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQztnQkFDN0QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLFVBQVUsRUFBRTtvQkFDWCxxSEFBcUg7b0JBQ3JIO3dCQUNDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixlQUFlLENBQUMsZ0JBQWdCLEVBQ2hDLGVBQWUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQ3BDO3dCQUNELE9BQU8sRUFBRSxvREFBZ0M7d0JBQ3pDLE1BQU0sMENBQWdDO3FCQUN0QztvQkFDRCx1REFBdUQ7b0JBQ3ZEO3dCQUNDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxFQUNuRCxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUNwQzt3QkFDRCxPQUFPLEVBQUUsb0RBQWdDO3dCQUN6QyxNQUFNLDBDQUFnQztxQkFDdEM7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsV0FBVyxDQUFDO3dCQUNwRixPQUFPLEVBQUUsc0RBQWtDO3dCQUMzQyxNQUFNLDZDQUFtQztxQkFDekM7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsZ0JBQWdCLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtZQUMvRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFBO1lBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUN0RCxhQUFhLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNqRSxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLG9CQUFxQixTQUFRLE9BQU87UUFDekM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGtDQUFrQztnQkFDdEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQ0FBcUMsRUFBRSxrQkFBa0IsQ0FBQztnQkFDM0UsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsVUFBVSxFQUFFO29CQUNYO3dCQUNDLE9BQU8sRUFBRSxzREFBa0M7d0JBQzNDLE1BQU0sNkNBQW1DO3dCQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsZUFBZSxDQUFDLGFBQWEsRUFDN0IsZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFDcEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FDcEM7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGVBQWUsQ0FBQyxhQUFhLEVBQzdCLGVBQWUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQ3BDLGVBQWUsQ0FBQyxXQUFXLENBQzNCO3dCQUNELE9BQU8sRUFBRSxvREFBZ0M7d0JBQ3pDLE1BQU0sNkNBQW1DO3FCQUN6QztpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDN0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RELGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsQ0FBQTtRQUM5QyxDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsTUFBTSx5QkFBeUIsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUNuRCxlQUFlLENBQUMsT0FBTyxFQUN2QixjQUFjLENBQUMsU0FBUyxDQUN2QixVQUFVLFdBQVcsQ0FBQywwQkFBMEIsZUFBZSxFQUMvRCxXQUFXLENBQUMsb0JBQW9CLENBQ2hDLENBQ0QsQ0FBQTtJQUNELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztRQUNwQjtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsc0NBQXNDO2dCQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDbkQsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLEVBQUUsRUFBRSxJQUFJO2dCQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixjQUFjLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQ3ZGLHlCQUF5QixDQUN6QjtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLEtBQUssRUFBRSxVQUFVO29CQUNqQixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUseUJBQXlCO2lCQUMvQjthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQzVDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDN0QsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLDBCQUEyQixTQUFRLE9BQU87UUFDL0M7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGtEQUFrRDtnQkFDdEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSwrQkFBK0IsQ0FBQztnQkFDL0UsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsUUFBUSxFQUFFLG1CQUFtQjtnQkFDN0IsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO2FBQ3JDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQzVDLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQzVFLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxZQUFZLDhCQUE4QixFQUFFLENBQUMsQ0FBQTtRQUNwRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLE1BQU0sMkJBQTRCLFNBQVEsT0FBTztRQUNoRDtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsZ0RBQWdEO2dCQUNwRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLCtCQUErQixDQUFDO2dCQUN6RSxZQUFZLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM3QyxJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsRUFBRTtpQkFDVDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQzVDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDcEQsY0FBYyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNsRSxDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLE1BQU0sNEJBQTZCLFNBQVEsT0FBTztRQUNqRDtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsK0JBQStCO2dCQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSx3QkFBd0IsQ0FBQzthQUN4RCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtZQUM1QyxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtZQUNwRSxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFeEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3ZELElBQUksRUFBRSxTQUFTO2dCQUNmLEtBQUssRUFBRSxNQUFNO2dCQUNiLEdBQUcsRUFBRSxTQUFTO2FBQ2QsQ0FBQyxDQUFBO1lBRUYsSUFBSSxPQUFlLENBQUE7WUFDbkIsTUFBTSxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFBO1lBQ3JGLElBQUksaUJBQWlCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUNwRCxPQUFPLEdBQUcsUUFBUSxDQUNqQixtQkFBbUIsRUFDbkIsZ0pBQWdKLEVBQ2hKLGFBQWEsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUNsRSxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLHdCQUF3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDM0QsT0FBTyxHQUFHLFFBQVEsQ0FDakIsMEJBQTBCLEVBQzFCLGdKQUFnSixFQUNoSixhQUFhLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FDbEUsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsUUFBUSxDQUNqQixpQ0FBaUMsRUFDakMsb0ZBQW9GLEVBQ3BGLGFBQWEsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUNsRSxDQUFBO1lBQ0YsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FDNUIsY0FBYyxFQUNkLG1KQUFtSixDQUNuSixDQUFBO1lBRUQsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDO2dCQUMxQixJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQztnQkFDekQsWUFBWSxFQUFFO29CQUNiLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztvQkFDckMsR0FBRyxFQUFFLEdBQUcsRUFBRTt3QkFDVCxVQUFVO29CQUNYLENBQUM7aUJBQ0Q7Z0JBQ0QsT0FBTyxFQUFFO29CQUNSO3dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLHdCQUF3QixDQUFDO3dCQUN2RCxHQUFHLEVBQUUsR0FBRyxFQUFFOzRCQUNULE1BQU0sU0FBUyxHQUFHLG1DQUFtQyxDQUFBOzRCQUNyRCxnQkFBZ0IsQ0FBQyxVQUFVLENBR3pCLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTs0QkFDcEUsY0FBYyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTt3QkFDekMsQ0FBQztxQkFDRDtpQkFDRDtnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE9BQU8sQ0FBQyxtQkFBbUI7b0JBQ2pDLGVBQWUsRUFBRTt3QkFDaEIsRUFBRSxRQUFRLEVBQUUsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFO3dCQUMvQyxFQUFFLFFBQVEsRUFBRSxJQUFJLGNBQWMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUU7cUJBQ3BEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztLQUNELENBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUM1QixJQUFvRCxFQUNwRCxXQUFXLEdBQUcsSUFBSTtJQUVsQixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3BFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDNUUsQ0FBQztBQUNGLENBQUM7QUFFRCxpQ0FBaUM7QUFFakMsTUFBTSxXQUFXLEdBQUc7SUFDbkIsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixJQUFJLEVBQUU7SUFDbEUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixJQUFJLEVBQUU7SUFDcEUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLElBQUksRUFBRTtJQUM1RCxvQkFBb0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLElBQUksRUFBRTtJQUMxRSwwQkFBMEIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsMEJBQTBCLElBQUksRUFBRTtJQUN0RixzQkFBc0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLElBQUksRUFBRTtDQUM5RSxDQUFBO0FBRUQsa0VBQWtFO0FBQ2xFLG9EQUFvRDtBQUNwRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7TUF1Qk07QUFFTixlQUFlLENBQ2QsTUFBTSxvQkFBcUIsU0FBUSwwQkFBMEI7SUFDNUQ7UUFDQyxLQUFLLENBQ0osNEJBQTRCLEVBQzVCLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxFQUNsRCxRQUFRLENBQ1AsZ0NBQWdDLEVBQ2hDLHdEQUF3RCxDQUN4RCxFQUNELENBQUMsRUFDRCxLQUFLLEVBQ0wsZUFBZSxDQUFDLFNBQVMsQ0FDekIsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSx1QkFBd0IsU0FBUSxPQUFPO0lBQzVDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlDQUF5QztZQUM3QyxLQUFLLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLDBCQUEwQixDQUFDO1lBQ2pFLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNRLEdBQUcsQ0FBQyxRQUEwQjtRQUN0QyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtRQUNwRSxRQUFRO2FBQ04sR0FBRyxDQUFDLG9CQUFvQixDQUFDO2FBQ3pCLElBQUksQ0FDSixRQUFRLENBQUMsMEJBQTBCLEVBQUUsZ0RBQWdELENBQUMsQ0FDdEYsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUNELENBQUE7QUFFTSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDM0MsT0FBRSxHQUFHLGdEQUFnRCxBQUFuRCxDQUFtRDtJQUVyRSxZQUN5QixxQkFBNkMsRUFDOUMsb0JBQTJDLEVBQ3pDLHNCQUErQyxFQUNqRCxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQ2hELE1BQU0sQ0FBQyxhQUFhLEVBQ3BCLE1BQU0sQ0FBQyxnQkFBZ0IsRUFDdkIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDbkIsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUVELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQztnQkFDL0IsRUFBRSxFQUFFLG9DQUFvQztnQkFDeEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2dCQUNsQyxHQUFHLEtBQUksQ0FBQzthQUNSLENBQUMsQ0FBQTtZQUVGLE1BQU0sc0JBQXNCLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxLQUFLLGFBQWEsQ0FBQyxTQUFTLENBQUE7WUFDM0YsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxLQUFLLGFBQWEsQ0FBQyxRQUFRLENBQUE7WUFDOUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFBO1lBQ3JGLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxDQUFBO1lBQ2hGLE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBRTdFLElBQUksZUFBZSxHQUFHLHFCQUFxQixDQUFBO1lBQzNDLElBQUksa0JBQWtCLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUM5RCxJQUFJLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7WUFDdkMsSUFBSSxDQUFDLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxlQUFlLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDakUsZUFBZSxHQUFHLG9CQUFvQixDQUFBO2dCQUN0QyxrQkFBa0IsR0FBRyxRQUFRLENBQzVCLGtCQUFrQixFQUNsQiwwQ0FBMEMsQ0FDMUMsQ0FBQTtZQUNGLENBQUM7aUJBQU0sSUFBSSxzQkFBc0IsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDaEQsZUFBZSxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFBO2dCQUNoRixrQkFBa0IsR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtnQkFDL0UsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFBO1lBQ2hELENBQUM7aUJBQU0sSUFBSSxzQkFBc0IsSUFBSSxDQUFDLGlCQUFpQixJQUFJLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDdEYsZUFBZSxHQUFHLCtCQUErQixDQUFBO2dCQUNqRCxJQUFJLGlCQUFpQixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztvQkFDcEQsa0JBQWtCLEdBQUcsUUFBUSxDQUM1Qix5QkFBeUIsRUFDekIseURBQXlELENBQ3pELENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLHdCQUF3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDM0Qsa0JBQWtCLEdBQUcsUUFBUSxDQUM1QixnQ0FBZ0MsRUFDaEMsNERBQTRELENBQzVELENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtCQUFrQixHQUFHLFFBQVEsQ0FDNUIsdUNBQXVDLEVBQ3ZDLHFEQUFxRCxDQUNyRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQTtZQUMzQyxDQUFDO1lBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLGlDQUFpQyxFQUNqQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLGNBQWMsRUFDZDtnQkFDQyxFQUFFLEVBQUUsZUFBZTtnQkFDbkIsS0FBSyxFQUFFLGtCQUFrQjtnQkFDekIsSUFBSSxFQUFFLGlCQUFpQjthQUN2QixFQUNELFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsQ0FDVCxFQUNELGNBQWMsRUFDZCxNQUFNLENBQUMsT0FBTyxFQUNkLEVBQUUsRUFDRixFQUFFLEdBQUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FDbkMsQ0FBQTtRQUNGLENBQUMsRUFDRCxLQUFLLENBQUMsR0FBRyxDQUNSLHNCQUFzQixDQUFDLG9CQUFvQixFQUMzQyxzQkFBc0IsQ0FBQyx3QkFBd0IsRUFDL0Msc0JBQXNCLENBQUMsc0JBQXNCLEVBQzdDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNqRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsQ0FDOUMsQ0FDRCxDQUNELENBQUE7UUFFRCwwQ0FBMEM7UUFDMUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzVCLENBQUM7O0FBaEdXLDRCQUE0QjtJQUl0QyxXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHFCQUFxQixDQUFBO0dBUFgsNEJBQTRCLENBaUd4Qzs7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLFFBQTBCO0lBQ3hELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDOUMsT0FBTyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO0FBQ2pFLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsMkJBQTJCLENBQ2hELHFCQUEwQyxFQUMxQyxNQUEwQixFQUMxQixhQUE2QjtJQUU3QixJQUFJLHlDQUF5QyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztRQUN0RSxPQUFPLG1DQUFtQyxDQUFDLHFCQUFxQixFQUFFLGFBQWEsRUFBRTtZQUNoRixlQUFlLEVBQUUsTUFBTTtTQUN2QixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBT0QsTUFBTSxDQUFDLEtBQUssVUFBVSxtQ0FBbUMsQ0FDeEQsY0FBbUMsRUFDbkMsYUFBNkIsRUFDN0IsT0FBaUQ7SUFFakQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUM3Qix3REFBd0QsRUFDeEQseURBQXlELENBQ3pELENBQUE7SUFDRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUN4RixNQUFNLE1BQU0sR0FBRyxPQUFPLEVBQUUsZUFBZSxJQUFJLGFBQWEsQ0FBQTtJQUN4RCxNQUFNLEtBQUssR0FBRyxPQUFPLEVBQUUsYUFBYSxJQUFJLFlBQVksQ0FBQTtJQUVwRCxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2pELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQ3pDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSwwQ0FBa0MsQ0FDNUQsQ0FBQTtJQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFDN0MsS0FBSztRQUNMLE9BQU8sRUFDTixNQUFNO1lBQ04sR0FBRztZQUNILFFBQVEsQ0FDUCxrREFBa0QsRUFDbEQsaURBQWlELEVBQ2pELGNBQWMsQ0FBQyxNQUFNLENBQ3JCO1FBQ0YsSUFBSSxFQUFFLE1BQU07UUFDWixZQUFZLEVBQUUsSUFBSTtRQUNsQixPQUFPLEVBQUU7WUFDUjtnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLGlCQUFpQixDQUFDO2dCQUNoRixHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2YsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBQzdCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7YUFDRDtZQUNEO2dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsNkNBQTZDLEVBQUUsaUJBQWlCLENBQUM7Z0JBQ2pGLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDZixNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtvQkFDN0IsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQzthQUNEO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLHlDQUF5QyxDQUN4RCxjQUFtQztJQUVuQyxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtJQUU1QyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDdEIsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FDekMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLDBDQUFrQyxDQUM1RCxDQUFBO1FBQ0QsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQTtJQUMvQixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDIn0=