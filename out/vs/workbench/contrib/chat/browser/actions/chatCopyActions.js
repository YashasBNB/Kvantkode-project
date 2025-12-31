/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { CHAT_CATEGORY, stringifyItem } from './chatActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isRequestVM, isResponseVM, } from '../../common/chatViewModel.js';
export function registerChatCopyActions() {
    registerAction2(class CopyAllAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyAll',
                title: localize2('interactive.copyAll.label', 'Copy All'),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.toNegated(),
                    group: 'copy',
                },
            });
        }
        run(accessor, ...args) {
            const clipboardService = accessor.get(IClipboardService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const widget = chatWidgetService.lastFocusedWidget;
            if (widget) {
                const viewModel = widget.viewModel;
                const sessionAsText = viewModel
                    ?.getItems()
                    .filter((item) => isRequestVM(item) || (isResponseVM(item) && !item.errorDetails?.responseIsFiltered))
                    .map((item) => stringifyItem(item))
                    .join('\n\n');
                if (sessionAsText) {
                    clipboardService.writeText(sessionAsText);
                }
            }
        }
    });
    registerAction2(class CopyItemAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyItem',
                title: localize2('interactive.copyItem.label', 'Copy'),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.toNegated(),
                    group: 'copy',
                },
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isRequestVM(item) && !isResponseVM(item)) {
                return;
            }
            const clipboardService = accessor.get(IClipboardService);
            const text = stringifyItem(item, false);
            clipboardService.writeText(text);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvcHlBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvcHlBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUdOLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxNQUFNLFVBQVUsdUJBQXVCO0lBQ3RDLGVBQWUsQ0FDZCxNQUFNLGFBQWMsU0FBUSxPQUFPO1FBQ2xDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSwrQkFBK0I7Z0JBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsMkJBQTJCLEVBQUUsVUFBVSxDQUFDO2dCQUN6RCxFQUFFLEVBQUUsS0FBSztnQkFDVCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsSUFBSSxFQUFFLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUU7b0JBQ3BELEtBQUssRUFBRSxNQUFNO2lCQUNiO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztZQUM3QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUN4RCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMxRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQTtZQUNsRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUE7Z0JBQ2xDLE1BQU0sYUFBYSxHQUFHLFNBQVM7b0JBQzlCLEVBQUUsUUFBUSxFQUFFO3FCQUNYLE1BQU0sQ0FDTixDQUFDLElBQUksRUFBMEQsRUFBRSxDQUNoRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLENBQ3BGO3FCQUNBLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ2QsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDbkIsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxjQUFlLFNBQVEsT0FBTztRQUNuQztZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsZ0NBQWdDO2dCQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDRCQUE0QixFQUFFLE1BQU0sQ0FBQztnQkFDdEQsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLElBQUksRUFBRSxlQUFlLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFO29CQUNwRCxLQUFLLEVBQUUsTUFBTTtpQkFDYjthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0MsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUN4RCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxDQUFDO0tBQ0QsQ0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9