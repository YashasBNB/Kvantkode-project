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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZpbGVUcmVlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEZpbGVUcmVlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQTBCLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXBGLE1BQU0sVUFBVSwyQkFBMkI7SUFDMUMsZUFBZSxDQUNkLE1BQU0sa0JBQW1CLFNBQVEsT0FBTztRQUN2QztZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsb0NBQW9DO2dCQUN4QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLGdCQUFnQixDQUFDO2dCQUNwRSxVQUFVLEVBQUU7b0JBQ1gsT0FBTyxFQUFFLCtDQUEyQjtvQkFDcEMsTUFBTSw2Q0FBbUM7b0JBQ3pDLElBQUksRUFBRSxlQUFlLENBQUMsYUFBYTtpQkFDbkM7Z0JBQ0QsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO2dCQUNyQyxFQUFFLEVBQUUsSUFBSTtnQkFDUixRQUFRLEVBQUUsYUFBYTthQUN2QixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1lBQzdDLGFBQWEsQ0FB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