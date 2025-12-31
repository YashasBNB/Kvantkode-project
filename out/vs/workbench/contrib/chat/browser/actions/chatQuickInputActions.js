/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { IQuickChatService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
export const ASK_QUICK_QUESTION_ACTION_ID = 'workbench.action.quickchat.toggle';
export function registerQuickChatActions() {
    registerAction2(QuickChatGlobalAction);
    registerAction2(AskQuickChatAction);
    registerAction2(class OpenInChatViewAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.quickchat.openInChatView',
                title: localize2('chat.openInChatView.label', 'Open in Chat View'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.commentDiscussion,
                menu: {
                    id: MenuId.ChatInputSide,
                    group: 'navigation',
                    order: 10,
                },
            });
        }
        run(accessor) {
            const quickChatService = accessor.get(IQuickChatService);
            quickChatService.openInChatView();
        }
    });
    registerAction2(class CloseQuickChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.quickchat.close',
                title: localize2('chat.closeQuickChat.label', 'Close Quick Chat'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.close,
                menu: {
                    id: MenuId.ChatInputSide,
                    group: 'navigation',
                    order: 20,
                },
            });
        }
        run(accessor) {
            const quickChatService = accessor.get(IQuickChatService);
            quickChatService.close();
        }
    });
}
class QuickChatGlobalAction extends Action2 {
    constructor() {
        super({
            id: ASK_QUICK_QUESTION_ACTION_ID,
            title: localize2('quickChat', 'Quick Chat'),
            precondition: ChatContextKeys.enabled,
            icon: Codicon.commentDiscussion,
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */,
            },
            menu: {
                id: MenuId.ChatTitleBarMenu,
                group: 'a_open',
                order: 4,
            },
            metadata: {
                description: localize('toggle.desc', 'Toggle the quick chat'),
                args: [
                    {
                        name: 'args',
                        schema: {
                            anyOf: [
                                {
                                    type: 'object',
                                    required: ['query'],
                                    properties: {
                                        query: {
                                            description: localize('toggle.query', 'The query to open the quick chat with'),
                                            type: 'string',
                                        },
                                        isPartialQuery: {
                                            description: localize('toggle.isPartialQuery', 'Whether the query is partial; it will wait for more user input'),
                                            type: 'boolean',
                                        },
                                    },
                                },
                                {
                                    type: 'string',
                                    description: localize('toggle.query', 'The query to open the quick chat with'),
                                },
                            ],
                        },
                    },
                ],
            },
        });
    }
    run(accessor, query) {
        const quickChatService = accessor.get(IQuickChatService);
        let options;
        switch (typeof query) {
            case 'string':
                options = { query };
                break;
            case 'object':
                options = query;
                break;
        }
        if (options?.query) {
            options.selection = new Selection(1, options.query.length + 1, 1, options.query.length + 1);
        }
        quickChatService.toggle(options);
    }
}
class AskQuickChatAction extends Action2 {
    constructor() {
        super({
            id: `workbench.action.openQuickChat`,
            category: CHAT_CATEGORY,
            title: localize2('interactiveSession.open', 'Open Quick Chat'),
            precondition: ChatContextKeys.enabled,
            f1: true,
        });
    }
    run(accessor, query) {
        const quickChatService = accessor.get(IQuickChatService);
        quickChatService.toggle(query
            ? {
                query,
                selection: new Selection(1, query.length + 1, 1, query.length + 1),
            }
            : undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrSW5wdXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFF1aWNrSW5wdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEQsT0FBTyxFQUF5QixpQkFBaUIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFakUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsbUNBQW1DLENBQUE7QUFDL0UsTUFBTSxVQUFVLHdCQUF3QjtJQUN2QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUN0QyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUVuQyxlQUFlLENBQ2QsTUFBTSxvQkFBcUIsU0FBUSxPQUFPO1FBQ3pDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSwyQ0FBMkM7Z0JBQy9DLEtBQUssRUFBRSxTQUFTLENBQUMsMkJBQTJCLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ2xFLEVBQUUsRUFBRSxLQUFLO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUUsT0FBTyxDQUFDLGlCQUFp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