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
import './media/bannerpart.css';
import { localize2 } from '../../../../nls.js';
import { $, addDisposableListener, append, clearNode, EventType, isHTMLElement, } from '../../../../base/browser/dom.js';
import { asCSSUrl } from '../../../../base/browser/cssValue.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Part } from '../../part.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Action } from '../../../../base/common/actions.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { Emitter } from '../../../../base/common/event.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { BannerFocused } from '../../../common/contextkeys.js';
// Banner Part
let BannerPart = class BannerPart extends Part {
    get minimumHeight() {
        return this.visible ? this.height : 0;
    }
    get maximumHeight() {
        return this.visible ? this.height : 0;
    }
    get onDidChange() {
        return this._onDidChangeSize.event;
    }
    constructor(themeService, layoutService, storageService, contextKeyService, instantiationService) {
        super("workbench.parts.banner" /* Parts.BANNER_PART */, { hasTitle: false }, themeService, storageService, layoutService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        // #region IView
        this.height = 26;
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this._onDidChangeSize = this._register(new Emitter());
        this.visible = false;
        this.focusedActionIndex = -1;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
    }
    createContentArea(parent) {
        this.element = parent;
        this.element.tabIndex = 0;
        // Restore focused action if needed
        this._register(addDisposableListener(this.element, EventType.FOCUS, () => {
            if (this.focusedActionIndex !== -1) {
                this.focusActionLink();
            }
        }));
        // Track focus
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
        BannerFocused.bindTo(scopedContextKeyService).set(true);
        return this.element;
    }
    close(item) {
        // Hide banner
        this.setVisibility(false);
        // Remove from document
        clearNode(this.element);
        // Remember choice
        if (typeof item.onClose === 'function') {
            item.onClose();
        }
        this.item = undefined;
    }
    focusActionLink() {
        const length = this.item?.actions?.length ?? 0;
        if (this.focusedActionIndex < length) {
            const actionLink = this.messageActionsContainer?.children[this.focusedActionIndex];
            if (isHTMLElement(actionLink)) {
                this.actionBar?.setFocusable(false);
                actionLink.focus();
            }
        }
        else {
            this.actionBar?.focus(0);
        }
    }
    getAriaLabel(item) {
        if (item.ariaLabel) {
            return item.ariaLabel;
        }
        if (typeof item.message === 'string') {
            return item.message;
        }
        return undefined;
    }
    getBannerMessage(message) {
        if (typeof message === 'string') {
            const element = $('span');
            element.innerText = message;
            return element;
        }
        return this.markdownRenderer.render(message).element;
    }
    setVisibility(visible) {
        if (visible !== this.visible) {
            this.visible = visible;
            this.focusedActionIndex = -1;
            this.layoutService.setPartHidden(!visible, "workbench.parts.banner" /* Parts.BANNER_PART */);
            this._onDidChangeSize.fire(undefined);
        }
    }
    focus() {
        this.focusedActionIndex = -1;
        this.element.focus();
    }
    focusNextAction() {
        const length = this.item?.actions?.length ?? 0;
        this.focusedActionIndex = this.focusedActionIndex < length ? this.focusedActionIndex + 1 : 0;
        this.focusActionLink();
    }
    focusPreviousAction() {
        const length = this.item?.actions?.length ?? 0;
        this.focusedActionIndex = this.focusedActionIndex > 0 ? this.focusedActionIndex - 1 : length;
        this.focusActionLink();
    }
    hide(id) {
        if (this.item?.id !== id) {
            return;
        }
        this.setVisibility(false);
    }
    show(item) {
        if (item.id === this.item?.id) {
            this.setVisibility(true);
            return;
        }
        // Clear previous item
        clearNode(this.element);
        // Banner aria label
        const ariaLabel = this.getAriaLabel(item);
        if (ariaLabel) {
            this.element.setAttribute('aria-label', ariaLabel);
        }
        // Icon
        const iconContainer = append(this.element, $('div.icon-container'));
        iconContainer.setAttribute('aria-hidden', 'true');
        if (ThemeIcon.isThemeIcon(item.icon)) {
            iconContainer.appendChild($(`div${ThemeIcon.asCSSSelector(item.icon)}`));
        }
        else {
            iconContainer.classList.add('custom-icon');
            if (URI.isUri(item.icon)) {
                iconContainer.style.backgroundImage = asCSSUrl(item.icon);
            }
        }
        // Message
        const messageContainer = append(this.element, $('div.message-container'));
        messageContainer.setAttribute('aria-hidden', 'true');
        messageContainer.appendChild(this.getBannerMessage(item.message));
        // Message Actions
        this.messageActionsContainer = append(this.element, $('div.message-actions-container'));
        if (item.actions) {
            for (const action of item.actions) {
                this._register(this.instantiationService.createInstance(Link, this.messageActionsContainer, { ...action, tabIndex: -1 }, {}));
            }
        }
        // Action
        const actionBarContainer = append(this.element, $('div.action-container'));
        this.actionBar = this._register(new ActionBar(actionBarContainer));
        const label = item.closeLabel ?? 'Close Banner';
        const closeAction = this._register(new Action('banner.close', label, ThemeIcon.asClassName(widgetClose), true, () => this.close(item)));
        this.actionBar.push(closeAction, { icon: true, label: false });
        this.actionBar.setFocusable(false);
        this.setVisibility(true);
        this.item = item;
    }
    toJSON() {
        return {
            type: "workbench.parts.banner" /* Parts.BANNER_PART */,
        };
    }
};
BannerPart = __decorate([
    __param(0, IThemeService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], BannerPart);
export { BannerPart };
registerSingleton(IBannerService, BannerPart, 0 /* InstantiationType.Eager */);
// Keybindings
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusBanner',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 9 /* KeyCode.Escape */,
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focus();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusNextAction',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focusNextAction();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusPreviousAction',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [16 /* KeyCode.UpArrow */],
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focusPreviousAction();
    },
});
// Actions
class FocusBannerAction extends Action2 {
    static { this.ID = 'workbench.action.focusBanner'; }
    static { this.LABEL = localize2('focusBanner', 'Focus Banner'); }
    constructor() {
        super({
            id: FocusBannerAction.ID,
            title: FocusBannerAction.LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.banner" /* Parts.BANNER_PART */);
    }
}
registerAction2(FocusBannerAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFubmVyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2Jhbm5lci9iYW5uZXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxFQUNULGFBQWEsR0FDYixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8s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