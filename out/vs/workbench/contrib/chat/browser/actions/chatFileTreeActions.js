/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
export function registerChatFileTreeActions() {
    registerAction2(class NextFileTreeAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.nextFileTree',
                title: localize2('interactive.nextFileTree.label', 'Next File Tree'),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 67 /* KeyCode.F9 */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateTrees(accessor, false);
        }
    });
    registerAction2(class PreviousFileTreeAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.previousFileTree',
                title: localize2('interactive.previousFileTree.label', 'Previous File Tree'),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 67 /* KeyCode.F9 */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateTrees(accessor, true);
        }
    });
}
function navigateTrees(accessor, reverse) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const widget = chatWidgetService.lastFocusedWidget;
    if (!widget) {
        return;
    }
    const focused = !widget.inputEditor.hasWidgetFocus() && widget.getFocus();
    const focusedResponse = isResponseVM(focused) ? focused : undefined;
    const currentResponse = focusedResponse ??
        widget.viewModel
            ?.getItems()
            .reverse()
            .find((item) => isResponseVM(item));
    if (!currentResponse) {
        return;
    }
    widget.reveal(currentResponse);
    const responseFileTrees = widget.getFileTreeInfosForResponse(currentResponse);
    const lastFocusedFileTree = widget.getLastFocusedFileTreeForResponse(currentResponse);
    const focusIdx = lastFocusedFileTree
        ? (lastFocusedFileTree.treeIndex + (reverse ? -1 : 1) + responseFileTrees.length) %
            responseFileTrees.length
        : reverse
            ? responseFileTrees.length - 1
            : 0;
    responseFileTrees[focusIdx]?.focus();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZpbGVUcmVlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRGaWxlVHJlZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUEwQixZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVwRixNQUFNLFVBQVUsMkJBQTJCO0lBQzFDLGVBQWUsQ0FDZCxNQUFNLGtCQUFtQixTQUFRLE9BQU87UUFDdkM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLG9DQUFvQztnQkFDeEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDcEUsVUFBVSxFQUFFO29CQUNYLE9BQU8sRUFBRSwrQ0FBMkI7b0JBQ3BDLE1BQU0sNkNBQW1DO29CQUN6QyxJQUFJLEVBQUUsZUFBZSxDQUFDLGFBQWE7aUJBQ25DO2dCQUNELFlBQVksRUFBRSxlQUFlLENBQUMsT0FBTztnQkFDckMsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsUUFBUSxFQUFFLGFBQWE7YUFDdkIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztZQUM3QyxhQUFhLENBQUMsUUFB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