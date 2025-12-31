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
import { $, append } from '../../../../../base/browser/dom.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isResponseVM, } from '../../common/chatViewModel.js';
import { InlineAnchorWidget } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
let ChatProgressContentPart = class ChatProgressContentPart extends Disposable {
    constructor(progress, renderer, context, forceShowSpinner, forceShowMessage, icon, instantiationService, chatMarkdownAnchorService) {
        super();
        this.instantiationService = instantiationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        const followingContent = context.content.slice(context.contentIndex + 1);
        this.showSpinner = forceShowSpinner ?? shouldShowSpinner(followingContent, context.element);
        this.isHidden =
            forceShowMessage !== true && followingContent.some((part) => part.kind !== 'progressMessage');
        if (this.isHidden) {
            // Placeholder, don't show the progress message
            this.domNode = $('');
            return;
        }
        if (this.showSpinner) {
            // TODO@roblourens is this the right place for this?
            // this step is in progress, communicate it to SR users
            alert(progress.content.value);
        }
        const codicon = icon
            ? icon
            : this.showSpinner
                ? ThemeIcon.modify(Codicon.loading, 'spin')
                : Codicon.check;
        const result = this._register(renderer.render(progress.content));
        result.element.classList.add('progress-step');
        this.renderFileWidgets(result.element);
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(codicon));
        append(this.domNode, iconElement);
        append(this.domNode, result.element);
    }
    renderFileWidgets(element) {
        const links = element.querySelectorAll('a');
        links.forEach((a) => {
            // Empty link text -> render file widget
            if (!a.textContent?.trim()) {
                const href = a.getAttribute('data-href');
                const uri = href ? URI.parse(href) : undefined;
                if (uri?.scheme) {
                    const widget = this._register(this.instantiationService.createInstance(InlineAnchorWidget, a, {
                        kind: 'inlineReference',
                        inlineReference: uri,
                    }));
                    this._register(this.chatMarkdownAnchorService.register(widget));
                }
            }
        });
    }
    hasSameContent(other, followingContent, element) {
        // Progress parts render render until some other content shows up, then they hide.
        // When some other content shows up, need to signal to be rerendered as hidden.
        if (followingContent.some((part) => part.kind !== 'progressMessage') && !this.isHidden) {
            return false;
        }
        // Needs rerender when spinner state changes
        const showSpinner = shouldShowSpinner(followingContent, element);
        return other.kind === 'progressMessage' && this.showSpinner === showSpinner;
    }
};
ChatProgressContentPart = __decorate([
    __param(6, IInstantiationService),
    __param(7, IChatMarkdownAnchorService)
], ChatProgressContentPart);
export { ChatProgressContentPart };
function shouldShowSpinner(followingContent, element) {
    return isResponseVM(element) && !element.isComplete && followingContent.length === 0;
}
let ChatWorkingProgressContentPart = class ChatWorkingProgressContentPart extends ChatProgressContentPart {
    constructor(workingProgress, renderer, context, instantiationService, chatMarkdownAnchorService) {
        const progressMessage = {
            kind: 'progressMessage',
            content: workingProgress.isPaused
                ? new MarkdownString().appendText(localize('pausedMessage', 'Paused'))
                : new MarkdownString().appendText(localize('workingMessage', 'Working...')),
        };
        super(progressMessage, renderer, context, undefined, undefined, workingProgress.isPaused ? Codicon.debugPause : undefined, instantiationService, chatMarkdownAnchorService);
        this.workingProgress = workingProgress;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'working' && this.workingProgress.isPaused === other.isPaused;
    }
};
ChatWorkingProgressContentPart = __decorate([
    __param(3, IInstantiationService),
    __param(4, IChatMarkdownAnchorService)
], ChatWorkingProgressContentPart);
export { ChatWorkingProgressContentPart };
export class ChatCustomProgressPart {
    constructor(messageElement, icon) {
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        append(this.domNode, iconElement);
        messageElement.classList.add('progress-step');
        append(this.domNode, messageElement);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb2dyZXNzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0UHJvZ3Jlc3NDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBR04sWUFBWSxHQUNaLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTXRELFlBQ0MsUUFBMEMsRUFDMUMsUUFBMEIsRUFDMUIsT0FBc0MsRUFDdEMsZ0JBQXFDLEVBQ3JDLGdCQUFxQyxFQUNyQyxJ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