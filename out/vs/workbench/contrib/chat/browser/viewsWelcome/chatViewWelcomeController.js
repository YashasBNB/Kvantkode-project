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
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { chatViewsWelcomeRegistry } from './chatViewsWelcome.js';
const $ = dom.$;
let ChatViewWelcomeController = class ChatViewWelcomeController extends Disposable {
    constructor(container, delegate, location, contextKeyService, instantiationService) {
        super();
        this.container = container;
        this.delegate = delegate;
        this.location = location;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.enabled = false;
        this.enabledDisposables = this._register(new DisposableStore());
        this.renderDisposables = this._register(new DisposableStore());
        this.element = dom.append(this.container, dom.$('.chat-view-welcome'));
        this._register(Event.runAndSubscribe(delegate.onDidChangeViewWelcomeState, () => this.update()));
        this._register(chatViewsWelcomeRegistry.onDidChange(() => this.update(true)));
    }
    update(force) {
        const enabled = this.delegate.shouldShowWelcome();
        if (this.enabled === enabled && !force) {
            return;
        }
        this.enabled = enabled;
        this.enabledDisposables.clear();
        if (!enabled) {
            this.container.classList.toggle('chat-view-welcome-visible', false);
            this.renderDisposables.clear();
            return;
        }
        const descriptors = chatViewsWelcomeRegistry.get();
        if (descriptors.length) {
            this.render(descriptors);
            const descriptorKeys = new Set(descriptors.flatMap((d) => d.when.keys()));
            this.enabledDisposables.add(this.contextKeyService.onDidChangeContext((e) => {
                if (e.affectsSome(descriptorKeys)) {
                    this.render(descriptors);
                }
            }));
        }
    }
    render(descriptors) {
        this.renderDisposables.clear();
        dom.clearNode(this.element);
        const matchingDescriptors = descriptors.filter((descriptor) => this.contextKeyService.contextMatchesRules(descriptor.when));
        let enabledDescriptor;
        for (const descriptor of matchingDescriptors) {
            if (typeof descriptor.content === 'function') {
                enabledDescriptor = descriptor; // when multiple descriptors match, prefer a "core" one over a "descriptive" one
                break;
            }
        }
        enabledDescriptor = enabledDescriptor ?? matchingDescriptors.at(0);
        if (enabledDescriptor) {
            const content = {
                icon: enabledDescriptor.icon,
                title: enabledDescriptor.title,
                message: enabledDescriptor.content,
            };
            const welcomeView = this.renderDisposables.add(this.instantiationService.createInstance(ChatViewWelcomePart, content, {
                firstLinkToButton: true,
                location: this.location,
            }));
            this.element.appendChild(welcomeView.element);
            this.container.classList.toggle('chat-view-welcome-visible', true);
        }
        else {
            this.container.classList.toggle('chat-view-welcome-visible', false);
        }
    }
};
ChatViewWelcomeController = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], ChatViewWelcomeController);
export { ChatViewWelcomeController };
let ChatViewWelcomePart = class ChatViewWelcomePart extends Disposable {
    constructor(content, options, openerService, instantiationService, logService, chatAgentService) {
        super();
        this.content = content;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.element = dom.$('.chat-welcome-view');
        try {
            const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
            // Icon
            const icon = dom.append(this.element, $('.chat-welcome-view-icon'));
            if (content.icon) {
                icon.appendChild(renderIcon(content.icon));
            }
            // Title
            const title = dom.append(this.element, $('.chat-welcome-view-title'));
            title.textContent = content.title;
            // Preview indicator
            if (typeof content.message !== 'function' && options?.isWidgetAgentWelcomeViewContent) {
                const container = dom.append(this.element, $('.chat-welcome-view-indicator-container'));
                dom.append(container, $('.chat-welcome-view-subtitle', undefined, localize('agentModeSubtitle', 'Agent Mode')));
            }
            // Message
            const message = dom.append(this.element, $('.chat-welcome-view-message'));
            if (typeof content.message === 'function') {
                dom.append(message, content.message(this._register(new DisposableStore())));
            }
            else {
                const messageResult = this._register(renderer.render(content.message));
                const firstLink = options?.firstLinkToButton
                    ? messageResult.element.querySelector('a')
                    : undefined;
                if (firstLink) {
                    const target = firstLink.getAttribute('data-href');
                    const button = this._register(new Button(firstLink.parentElement, defaultButtonStyles));
                    button.label = firstLink.textContent ?? '';
                    if (target) {
                        this._register(button.onDidClick(() => {
                            this.openerService.open(target, { allowCommands: true });
                        }));
                    }
                    firstLink.replaceWith(button.element);
                }
                dom.append(message, messageResult.element);
            }
            // Tips
            if (content.tips) {
                const tips = dom.append(this.element, $('.chat-welcome-view-tips'));
                const tipsResult = this._register(renderer.render(content.tips));
                tips.appendChild(tipsResult.element);
            }
        }
        catch (err) {
            this.logService.error('Failed to render chat view welcome content', err);
        }
    }
};
ChatViewWelcomePart = __decorate([
    __param(2, IOpenerService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IChatAgentService)
], ChatViewWelcomePart);
export { ChatViewWelcomePart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdXZWxjb21lQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci92aWV3c1dlbGNvbWUvY2hhdFZpZXdXZWxjb21lQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFOUQsT0FBTyxFQUFFLHdCQUF3QixFQUErQixNQUFNLHVCQUF1QixDQUFBO0FBRTdGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxD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