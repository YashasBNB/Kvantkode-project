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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDb25maXJtYXRpb25XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFDTixNQUFNLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1GQUFtRixDQUFBO0FBQ3BILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7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