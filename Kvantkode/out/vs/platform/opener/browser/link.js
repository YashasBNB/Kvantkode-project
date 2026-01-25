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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vb3BlbmVyL2Jyb3dzZXIvbGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQWEsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQWVyRCxJQUFNLElBQUksR0FBVixNQUFNLElBQUssU0FBUSxVQUFVO0lBT25DLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsT0FBZ0I7UUFDM0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7WUFDcEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtZQUNwQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFBO1lBQzNCLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtZQUNwQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQzdCLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFDckIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLElBQUksQ0FBQyxJQUFxQjtRQUM3QixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUVELElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7UUFFeEIsSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7SUFDbEIsQ0FBQztJQUVELFlBQ0MsU0FBc0IsRUFDZCxLQUFzQixFQUM5QixVQUF3QixFQUFFLEVBQ1gsYUFBNkMsRUFDNUMsYUFBNkI7UUFFN0MsS0FBSyxFQUFFLENBQUE7UUFMQyxVQUFLLEdBQUwsS0FBSyxDQUFpQjtRQUVFLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBakRyRCxhQUFRLEdBQVksSUFBSSxDQUFBO1FBc0QvQixJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FDZixTQUFTLEVBQ1QsQ0FBQyxDQUNBLGVBQWUsRUFDZjtZQUNDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxJQUFJLENBQUM7WUFDN0IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1NBQ2hCLEVBQ0QsS0FBSyxDQUFDLEtBQUssQ0FDWCxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3hELENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLDBCQUFrQixDQUFDLENBQ3JGLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQy9FLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFZLGNBQWMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTlFLElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQixPQUFNO1lBQ1AsQ0FBQztZQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRXpCLElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUNyQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM3RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO0lBQ3BCLENBQUM7SUFFTyxVQUFVLENBQUMsS0FBeUI7UUFDM0MsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUE7UUFDNUIsQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQ3hFLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBbkhZLElBQUk7SUFzRGQsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGNBQWMsQ0FBQTtHQXZESixJQUFJLENBbUhoQiJ9