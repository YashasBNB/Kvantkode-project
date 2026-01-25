/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { isResponseVM } from '../common/chatViewModel.js';
import { IChatWidgetService } from './chat.js';
export class ChatResponseAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'panelChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatSession;
    }
    getProvider(accessor) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatInputFocused = widget.hasInputFocus();
        if (chatInputFocused) {
            widget.focusLastMessage();
        }
        const verifiedWidget = widget;
        const focusedItem = verifiedWidget.getFocus();
        if (!focusedItem) {
            return;
        }
        return new ChatResponseAccessibleProvider(verifiedWidget, focusedItem, chatInputFocused);
    }
}
class ChatResponseAccessibleProvider extends Disposable {
    constructor(_widget, item, _chatInputFocused) {
        super();
        this._widget = _widget;
        this._chatInputFocused = _chatInputFocused;
        this.id = "panelChat" /* AccessibleViewProviderId.PanelChat */;
        this.verbositySettingKey = "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._focusedItem = item;
    }
    provideContent() {
        return this._getContent(this._focusedItem);
    }
    _getContent(item) {
        let responseContent = isResponseVM(item) ? item.response.toString() : '';
        if (!responseContent && 'errorDetails' in item && item.errorDetails) {
            responseContent = item.errorDetails.message;
        }
        return renderMarkdownAsPlaintext(new MarkdownString(responseContent), true);
    }
    onClose() {
        this._widget.reveal(this._focusedItem);
        if (this._chatInputFocused) {
            this._widget.focusInput();
        }
        else {
            this._widget.focus(this._focusedItem);
        }
    }
    provideNextContent() {
        const next = this._widget.getSibling(this._focusedItem, 'next');
        if (next) {
            this._focusedItem = next;
            return this._getContent(next);
        }
        return;
    }
    providePreviousContent() {
        const previous = this._widget.getSibling(this._focusedItem, 'previous');
        if (previous) {
            this._focusedItem = previous;
            return this._getContent(previous);
        }
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3BvbnNlQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UmVzcG9uc2VBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBU2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUE2QixrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUV6RSxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxXQUFXLENBQUE7UUFDbEIsU0FBSSx3Q0FBMEI7UUFDOUIsU0FBSSxHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUE7SUFxQjlDLENBQUM7SUFwQkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUE7UUFDOUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxD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