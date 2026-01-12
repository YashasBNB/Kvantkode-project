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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, textLinkForeground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { IChatWidgetService } from '../chat.js';
const $ = dom.$;
/**
 * Once the sign up button is clicked, and the retry button has been shown, it should be shown every time.
 */
let shouldShowRetryButton = false;
/**
 * Once the 'retry' button is clicked, the wait warning should be shown every time.
 */
let shouldShowWaitWarning = false;
let ChatQuotaExceededPart = class ChatQuotaExceededPart extends Disposable {
    constructor(element, renderer, chatWidgetService, commandService, telemetryService) {
        super();
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const errorDetails = element.errorDetails;
        assertType(!!errorDetails, 'errorDetails');
        this.domNode = $('.chat-quota-error-widget');
        const icon = dom.append(this.domNode, $('span'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
        const messageContainer = dom.append(this.domNode, $('.chat-quota-error-message'));
        const markdownContent = renderer.render(new MarkdownString(errorDetails.message));
        dom.append(messageContainer, markdownContent.element);
        const button1 = this._register(new Button(messageContainer, { ...defaultButtonStyles, supportIcons: true }));
        button1.label = localize('upgradeToCopilotPro', 'Upgrade to Copilot Pro');
        button1.element.classList.add('chat-quota-error-button');
        let hasAddedWaitWarning = false;
        const addWaitWarningIfNeeded = () => {
            if (!shouldShowWaitWarning || hasAddedWaitWarning) {
                return;
            }
            hasAddedWaitWarning = true;
            dom.append(messageContainer, $('.chat-quota-wait-warning', undefined, localize('waitWarning', 'Signing up may take a few minutes to take effect.')));
        };
        let hasAddedRetryButton = false;
        const addRetryButtonIfNeeded = () => {
            if (!shouldShowRetryButton || hasAddedRetryButton) {
                return;
            }
            hasAddedRetryButton = true;
            const button2 = this._register(new Button(messageContainer, {
                buttonBackground: undefined,
                buttonForeground: asCssVariable(textLinkForeground),
            }));
            button2.element.classList.add('chat-quota-error-secondary-button');
            button2.label = localize('signedUpClickToContinue', 'Signed up? Click to retry.');
            this._onDidChangeHeight.fire();
            this._register(button2.onDidClick(() => {
                const widget = chatWidgetService.getWidgetBySessionId(element.sessionId);
                if (!widget) {
                    return;
                }
                widget.rerunLastRequest();
                shouldShowWaitWarning = true;
                addWaitWarningIfNeeded();
            }));
        };
        this._register(button1.onDidClick(async () => {
            const commandId = 'workbench.action.chat.upgradePlan';
            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-response' });
            await commandService.executeCommand(commandId);
            shouldShowRetryButton = true;
            addRetryButtonIfNeeded();
        }));
        addRetryButtonIfNeeded();
        addWaitWarningIfNeeded();
    }
    hasSameContent(other) {
        // Not currently used
        return true;
    }
};
ChatQuotaExceededPart = __decorate([
    __param(2, IChatWidgetService),
    __param(3, ICommandService),
    __param(4, ITelemetryService)
], ChatQuotaExceededPart);
export { ChatQuotaExceededPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1b3RhRXhjZWVkZWRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0UXVvdGFFeGNlZWRlZFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFLeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04sYUFBYSxFQUNiLGtCQUFrQixHQUNsQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUcvQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxD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