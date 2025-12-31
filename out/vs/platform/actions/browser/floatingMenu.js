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
import { $, append, clearNode } from '../../../base/browser/dom.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { getFlatActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { asCssVariable, asCssVariableWithDefault, buttonBackground, buttonForeground, contrastBorder, editorBackground, editorForeground, } from '../../theme/common/colorRegistry.js';
export class FloatingClickWidget extends Widget {
    constructor(label) {
        super();
        this.label = label;
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._domNode = $('.floating-click-widget');
        this._domNode.style.padding = '6px 11px';
        this._domNode.style.borderRadius = '2px';
        this._domNode.style.cursor = 'pointer';
        this._domNode.style.zIndex = '1';
    }
    getDomNode() {
        return this._domNode;
    }
    render() {
        clearNode(this._domNode);
        this._domNode.style.backgroundColor = asCssVariableWithDefault(buttonBackground, asCssVariable(editorBackground));
        this._domNode.style.color = asCssVariableWithDefault(buttonForeground, asCssVariable(editorForeground));
        this._domNode.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        append(this._domNode, $('')).textContent = this.label;
        this.onclick(this._domNode, () => this._onClick.fire());
    }
}
let AbstractFloatingClickMenu = class AbstractFloatingClickMenu extends Disposable {
    constructor(menuId, menuService, contextKeyService) {
        super();
        this.renderEmitter = new Emitter();
        this.onDidRender = this.renderEmitter.event;
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService));
    }
    /** Should be called in implementation constructors after they initialized */
    render() {
        const menuDisposables = this._register(new DisposableStore());
        const renderMenuAsFloatingClickBtn = () => {
            menuDisposables.clear();
            if (!this.isVisible()) {
                return;
            }
            const actions = getFlatActionBarActions(this.menu.getActions({ renderShortTitle: true, shouldForwardArgs: true }));
            if (actions.length === 0) {
                return;
            }
            // todo@jrieken find a way to handle N actions, like showing a context menu
            const [first] = actions;
            const widget = this.createWidget(first, menuDisposables);
            menuDisposables.add(widget);
            menuDisposables.add(widget.onClick(() => first.run(this.getActionArg())));
            widget.render();
        };
        this._register(this.menu.onDidChange(renderMenuAsFloatingClickBtn));
        renderMenuAsFloatingClickBtn();
    }
    getActionArg() {
        return undefined;
    }
    isVisible() {
        return true;
    }
};
AbstractFloatingClickMenu = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService)
], AbstractFloatingClickMenu);
export { AbstractFloatingClickMenu };
let FloatingClickMenu = class FloatingClickMenu extends AbstractFloatingClickMenu {
    constructor(options, instantiationService, menuService, contextKeyService) {
        super(options.menuId, menuService, contextKeyService);
        this.options = options;
        this.instantiationService = instantiationService;
        this.render();
    }
    createWidget(action, disposable) {
        const w = this.instantiationService.createInstance(FloatingClickWidget, action.label);
        const node = w.getDomNode();
        this.options.container.appendChild(node);
        disposable.add(toDisposable(() => node.remove()));
        return w;
    }
    getActionArg() {
        return this.options.getActionArg();
    }
};
FloatingClickMenu = __decorate([
    __param(1, IInstantiationService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], FloatingClickMenu);
export { FloatingClickMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxvYXRpbmdNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2Zsb2F0aW5nTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBUyxZQUFZLEVBQVUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sYUFBYSxFQUNiLHdCQUF3QixFQUN4QixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsTUFBTSxPQUFPLG1CQUFvQixTQUFRLE1BQU07SUFNOUMsWUFBb0IsS0FBYTtRQUNoQyxLQUFLLEVBQUUsQ0FBQTtRQURZLFVBQUssR0FBTCxLQUFLLENBQVE7UUFMaEIsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3RELFlBQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxD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