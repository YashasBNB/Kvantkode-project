var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bannerController.css';
import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const BANNER_ELEMENT_HEIGHT = 26;
let BannerController = class BannerController extends Disposable {
    constructor(_editor, instantiationService) {
        super();
        this._editor = _editor;
        this.instantiationService = instantiationService;
        this.banner = this._register(this.instantiationService.createInstance(Banner));
    }
    hide() {
        this._editor.setBanner(null, 0);
        this.banner.clear();
    }
    show(item) {
        this.banner.show({
            ...item,
            onClose: () => {
                this.hide();
                item.onClose?.();
            },
        });
        this._editor.setBanner(this.banner.element, BANNER_ELEMENT_HEIGHT);
    }
};
BannerController = __decorate([
    __param(1, IInstantiationService)
], BannerController);
export { BannerController };
// TODO@hediet: Investigate if this can be reused by the workspace banner (bannerPart.ts).
let Banner = class Banner extends Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        this.element = $('div.editor-banner');
        this.element.tabIndex = 0;
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
    clear() {
        clearNode(this.element);
    }
    show(item) {
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
        if (item.icon) {
            iconContainer.appendChild($(`div${ThemeIcon.asCSSSelector(item.icon)}`));
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
        this.actionBar.push(this._register(new Action('banner.close', 'Close Banner', ThemeIcon.asClassName(widgetClose), true, () => {
            if (typeof item.onClose === 'function') {
                item.onClose();
            }
        })), { icon: true, label: false });
        this.actionBar.setFocusable(false);
    }
};
Banner = __decorate([
    __param(0, IInstantiationService)
], Banner);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFubmVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3VuaWNvZGVIaWdobGlnaHRlci9icm93c2VyL2Jhbm5lckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUV2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQW1CLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUE7QUFFekIsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBRy9DLFlBQ2tCLE9BQW9CLEVBQ0csb0JBQTJDO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBSFUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUks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