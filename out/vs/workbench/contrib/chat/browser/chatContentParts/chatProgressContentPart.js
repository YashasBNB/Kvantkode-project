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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb2dyZXNzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRQcm9ncmVzc0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFHTixZQUFZLEdBQ1osTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFNdEQsWUFDQyxRQUEwQyxFQUMxQyxRQUEwQixFQUMxQixPQUFzQyxFQUN0QyxnQkFBcUMsRUFDckMsZ0JBQXFDLEVB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