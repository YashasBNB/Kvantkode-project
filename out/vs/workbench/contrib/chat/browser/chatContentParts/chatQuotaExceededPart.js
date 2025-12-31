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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1b3RhRXhjZWVkZWRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFF1b3RhRXhjZWVkZWRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBS3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsR0FDbEIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFHL0MsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtB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