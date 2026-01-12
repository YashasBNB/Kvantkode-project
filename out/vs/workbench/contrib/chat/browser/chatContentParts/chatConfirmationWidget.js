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
import './media/chatConfirmationWidget.css';
import { Button, ButtonWithDropdown, } from '../../../../../base/browser/ui/button/button.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Action } from '../../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../../services/host/browser/host.js';
let BaseChatConfirmationWidget = class BaseChatConfirmationWidget extends Disposable {
    get onDidClick() {
        return this._onDidClick.event;
    }
    get onDidChangeHeight() {
        return this._onDidChangeHeight.event;
    }
    get domNode() {
        return this._domNode;
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    constructor(title, buttons, expandableMessage, instantiationService, contextMenuService, _configurationService, _hostService) {
        super();
        this.instantiationService = instantiationService;
        this._configurationService = _configurationService;
        this._hostService = _hostService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        const elements = dom.h('.chat-confirmation-widget@root', [
            dom.h('.chat-confirmation-widget-expando@expando'),
            dom.h('.chat-confirmation-widget-title@title'),
            dom.h('.chat-confirmation-widget-message@message'),
            dom.h('.chat-confirmation-buttons-container@buttonsContainer'),
        ]);
        this._domNode = elements.root;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        if (expandableMessage) {
            const expanded = observableValue(this, false);
            const btn = this._register(new Button(elements.expando, {}));
            this._register(autorun((r) => {
                const value = expanded.read(r);
                btn.icon = value ? Codicon.chevronDown : Codicon.chevronRight;
                elements.message.classList.toggle('hidden', !value);
                this._onDidChangeHeight.fire();
            }));
            this._register(btn.onDidClick(() => {
                const value = expanded.get();
                expanded.set(!value, undefined);
            }));
        }
        const renderedTitle = this._register(this.markdownRenderer.render(new MarkdownString(title, { supportThemeIcons: true }), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        }));
        elements.title.append(renderedTitle.element);
        this.messageElement = elements.message;
        buttons.forEach((buttonData) => {
            const buttonOptions = {
                ...defaultButtonStyles,
                secondary: buttonData.isSecondary,
                title: buttonData.tooltip,
            };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(elements.buttonsContainer, {
                    ...buttonOptions,
                    contextMenuProvider: contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map((action) => this._register(new Action(action.label, action.label, undefined, true, () => {
                        this._onDidClick.fire(action);
                        return Promise.resolve();
                    }))),
                });
            }
            else {
                button = new Button(elements.buttonsContainer, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
        });
    }
    renderMessage(element) {
        this.messageElement.append(element);
        if (this._configurationService.getValue('chat.focusWindowOnConfirmation')) {
            const targetWindow = dom.getWindow(element);
            if (!targetWindow.document.hasFocus()) {
                this._hostService.focus(targetWindow, { force: true /* Application may not be active */ });
            }
        }
    }
};
BaseChatConfirmationWidget = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IHostService)
], BaseChatConfirmationWidget);
let ChatConfirmationWidget = class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, message, buttons, instantiationService, contextMenuService, configurationService, hostService) {
        super(title, buttons, false, instantiationService, contextMenuService, configurationService, hostService);
        this.message = message;
        const renderedMessage = this._register(this.markdownRenderer.render(typeof this.message === 'string' ? new MarkdownString(this.message) : this.message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element);
    }
};
ChatConfirmationWidget = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IHostService)
], ChatConfirmationWidget);
export { ChatConfirmationWidget };
let ChatCustomConfirmationWidget = class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, messageElement, messageElementIsExpandable, buttons, instantiationService, contextMenuService, configurationService, hostService) {
        super(title, buttons, messageElementIsExpandable, instantiationService, contextMenuService, configurationService, hostService);
        this.renderMessage(messageElement);
    }
};
ChatCustomConfirmationWidget = __decorate([
    __param(4, IInstantiationService),
    __param(5, IContextMenuService),
    __param(6, IConfigurationService),
    __param(7, IHostService)
], ChatCustomConfirmationWidget);
export { ChatCustomConfirmationWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbmZpcm1hdGlvbldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUNOLE1BQU0sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDcEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMs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