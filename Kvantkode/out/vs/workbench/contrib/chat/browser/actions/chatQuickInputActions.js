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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrSW5wdXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0UXVpY2tJbnB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRCxPQUFPLEVBQXlCLGlCQUFpQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVqRSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxtQ0FBbUMsQ0FBQTtBQUMvRSxNQUFNLFVBQVUsd0JBQXdCO0lBQ3ZDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ3RDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBRW5DLGVBQWUsQ0FDZCxNQUFNLG9CQUFxQixTQUFRLE9BQU87UUFDekM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLDJDQUEyQztnQkFDL0MsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDbEUsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElB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