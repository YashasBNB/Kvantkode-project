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
import { $, append, EventHelper, clearNode } from '../../../base/browser/dom.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { EventType as TouchEventType, Gesture } from '../../../base/browser/touch.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IOpenerService } from '../common/opener.js';
import './link.css';
import { getDefaultHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../hover/browser/hover.js';
let Link = class Link extends Disposable {
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        if (enabled) {
            this.el.setAttribute('aria-disabled', 'false');
            this.el.tabIndex = 0;
            this.el.style.pointerEvents = 'auto';
            this.el.style.opacity = '1';
            this.el.style.cursor = 'pointer';
            this._enabled = false;
        }
        else {
            this.el.setAttribute('aria-disabled', 'true');
            this.el.tabIndex = -1;
            this.el.style.pointerEvents = 'none';
            this.el.style.opacity = '0.4';
            this.el.style.cursor = 'default';
            this._enabled = true;
        }
        this._enabled = enabled;
    }
    set link(link) {
        if (typeof link.label === 'string') {
            this.el.textContent = link.label;
        }
        else {
            clearNode(this.el);
            this.el.appendChild(link.label);
        }
        this.el.href = link.href;
        if (typeof link.tabIndex !== 'undefined') {
            this.el.tabIndex = link.tabIndex;
        }
        this.setTooltip(link.title);
        this._link = link;
    }
    constructor(container, _link, options = {}, _hoverService, openerService) {
        super();
        this._link = _link;
        this._hoverService = _hoverService;
        this._enabled = true;
        this.el = append(container, $('a.monaco-link', {
            tabIndex: _link.tabIndex ?? 0,
            href: _link.href,
        }, _link.label));
        this.hoverDelegate = options.hoverDelegate ?? getDefaultHoverDelegate('mouse');
        this.setTooltip(_link.title);
        this.el.setAttribute('role', 'button');
        const onClickEmitter = this._register(new DomEmitter(this.el, 'click'));
        const onKeyPress = this._register(new DomEmitter(this.el, 'keypress'));
        const onEnterPress = Event.chain(onKeyPress.event, ($) => $.map((e) => new StandardKeyboardEvent(e)).filter((e) => e.keyCode === 3 /* KeyCode.Enter */));
        const onTap = this._register(new DomEmitter(this.el, TouchEventType.Tap)).event;
        this._register(Gesture.addTarget(this.el));
        const onOpen = Event.any(onClickEmitter.event, onEnterPress, onTap);
        this._register(onOpen((e) => {
            if (!this.enabled) {
                return;
            }
            EventHelper.stop(e, true);
            if (options?.opener) {
                options.opener(this._link.href);
            }
            else {
                openerService.open(this._link.href, { allowCommands: true });
            }
        }));
        this.enabled = true;
    }
    setTooltip(title) {
        if (this.hoverDelegate.showNativeHover) {
            this.el.title = title ?? '';
        }
        else if (!this.hover && title) {
            this.hover = this._register(this._hoverService.setupManagedHover(this.hoverDelegate, this.el, title));
        }
        else if (this.hover) {
            this.hover.update(title);
        }
    }
};
Link = __decorate([
    __param(3, IHoverService),
    __param(4, IOpenerService)
], Link);
export { Link };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL29wZW5lci9icm93c2VyL2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFhLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLFlBQVksQ0FBQTtBQUNuQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFlckQsSUFBTSxJQUFJLEdBQVYsTUFBTSxJQUFLLFNBQVEsVUFBVTtJQU9uQyxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLE9BQWdCO1FBQzNCLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxD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