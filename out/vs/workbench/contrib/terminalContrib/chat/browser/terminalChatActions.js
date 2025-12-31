/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/chatContextKeys.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { AbstractInline1ChatAction } from '../../../inlineChat/browser/inlineChatActions.js';
import { isDetachedTerminalInstance } from '../../../terminal/browser/terminal.js';
import { registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys, } from './terminalChat.js';
import { TerminalChatController } from './terminalChatController.js';
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */,
    title: localize2('startChat', 'Terminal Inline Chat'),
    category: AbstractInline1ChatAction.category,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny),
        // HACK: Force weight to be higher than the extension contributed keybinding to override it until it gets replaced
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 1, // KeybindingWeight.WorkbenchContrib,
    },
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.hasChatAgent),
    run: (_xterm, _accessor, activeInstance, opts) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        if (opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            if (typeof opts === 'object' &&
                opts !== null &&
                'query' in opts &&
                typeof opts.query === 'string') {
                contr?.updateInput(opts.query, false);
                if (!('isPartialQuery' in opts && opts.isPartialQuery)) {
                    contr?.terminalChatWidget?.acceptInput();
                }
            }
        }
        contr?.terminalChatWidget?.reveal();
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.close" /* TerminalChatCommandId.Close */,
    title: localize2('closeChat', 'Close'),
    category: AbstractInline1ChatAction.category,
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        when: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.focus, TerminalChatContextKeys.focused), TerminalChatContextKeys.visible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    menu: [
        {
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: '0_main',
            order: 2,
        },
    ],
    icon: Codicon.close,
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, TerminalChatContextKeys.visible),
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.clear();
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */,
    title: localize2('runCommand', 'Run Chat Command'),
    shortTitle: localize2('run', 'Run'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate()),
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */,
    title: localize2('runFirstCommand', 'Run First Chat Command'),
    shortTitle: localize2('runFirst', 'Run First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate()),
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */,
    title: localize2('insertCommand', 'Insert Chat Command'),
    shortTitle: localize2('insert', 'Insert'),
    category: AbstractInline1ChatAction.category,
    icon: Codicon.insert,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */],
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate()),
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertFirstCommand" /* TerminalChatCommandId.InsertFirstCommand */,
    title: localize2('insertFirstCommand', 'Insert First Chat Command'),
    shortTitle: localize2('insertFirst', 'Insert First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */],
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate()),
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
    title: localize2('chat.rerun.label', 'Rerun Request'),
    f1: false,
    icon: Codicon.refresh,
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
        when: TerminalChatContextKeys.focused,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 5,
        when: ContextKeyExpr.and(TerminalChatContextKeys.inputHasText.toNegated(), TerminalChatContextKeys.requestActive.negate()),
    },
    run: async (_xterm, _accessor, activeInstance) => {
        const chatService = _accessor.get(IChatService);
        const chatWidgetService = _accessor.get(IChatWidgetService);
        const contr = TerminalChatController.activeChatController;
        const model = contr?.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionId(model.sessionId);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ChatAgentLocation.Terminal,
                userSelectedModelId: widget?.input.currentLanguageModel,
            });
        }
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.viewInChat" /* TerminalChatCommandId.ViewInChat */,
    title: localize2('viewInChat', 'View in Chat'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    icon: Codicon.commentDiscussion,
    menu: [
        {
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: 'zzz',
            order: 1,
            isHiddenByDefault: true,
            when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.requestActive.negate()),
        },
    ],
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.viewInChat();
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTixnQ0FBZ0MsRUFFaEMsdUJBQXVCLEdBQ3ZCLE1BQU0sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFcEUseUJBQXlCLENBQUM7SUFDekIsRUFBRSwwRUFBNkI7SUFDL0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsc0JBQXNCLENB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